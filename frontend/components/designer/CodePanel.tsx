'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Copy, Download, Zap, Archive, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HdlResult, TestbenchResult } from '@/lib/api';

interface CodePanelProps {
  open: boolean;
  result: HdlResult | null;
  language: 'verilog' | 'vhdl';
  generating: boolean;
  onClose: () => void;
  onLangChange: (lang: 'verilog' | 'vhdl') => void;
  onGetTestbench: () => Promise<TestbenchResult>;
}

// ── Syntax highlight via Shiki (lazy, client-only) ──────────
async function highlight(code: string, lang: 'verilog' | 'vhdl'): Promise<string> {
  const { codeToHtml } = await import('shiki');
  return codeToHtml(code, {
    lang,
    theme: 'one-dark-pro',
  });
}

// ── Extract port map from Verilog / VHDL code ────────────────
function parsePorts(code: string, lang: 'verilog' | 'vhdl') {
  const ports: { name: string; dir: 'input' | 'output' }[] = [];
  if (lang === 'verilog') {
    Array.from(code.matchAll(/^\s*input\s+(?:wire\s+)?(\w+)/gm))
      .forEach((m) => ports.push({ name: m[1], dir: 'input' }));
    Array.from(code.matchAll(/^\s*output\s+(?:wire\s+)?(\w+)/gm))
      .forEach((m) => ports.push({ name: m[1], dir: 'output' }));
  } else {
    Array.from(code.matchAll(/^\s*(\w+)\s*:\s*in\s+std_logic/gm))
      .forEach((m) => ports.push({ name: m[1], dir: 'input' }));
    Array.from(code.matchAll(/^\s*(\w+)\s*:\s*out\s+std_logic/gm))
      .forEach((m) => ports.push({ name: m[1], dir: 'output' }));
  }
  return ports;
}

// ── Makefile + README templates ──────────────────────────────
function makeMakefile(mod: string) {
  return `# Auto-generated Makefile
MOD = ${mod}

sim: $(MOD).v tb_$(MOD).v
\tiverilog -o $(MOD).vvp tb_$(MOD).v $(MOD).v
\tvvp $(MOD).vvp

wave: sim
\tgtkwave $(MOD).vcd &

clean:
\trm -f *.vvp *.vcd

.PHONY: sim wave clean
`;
}

function makeReadme(mod: string) {
  return `# ${mod}

Auto-generated HDL from IC HDL Generator.

## Simulate

\`\`\`bash
make sim    # compile + run
make wave   # open waveform in GTKWave
\`\`\`

## Files

| File | Description |
|------|-------------|
| \`${mod}.v\` | Top-level Verilog module |
| \`tb_${mod}.v\` | Testbench (auto-generated stimulus) |
| \`Makefile\` | Build helper |
`;
}

export function CodePanel({
  open, result, language, generating,
  onClose, onLangChange, onGetTestbench,
}: CodePanelProps) {
  const [highlighted, setHighlighted] = useState('');
  const [tbResult, setTbResult] = useState<TestbenchResult | null>(null);
  const [tbHighlighted, setTbHighlighted] = useState('');
  const [fetchingTb, setFetchingTb] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'hdl' | 'tb'>('hdl');
  const [pinMapOpen, setPinMapOpen] = useState(true);
  const highlightCache = useRef<Record<string, string>>({});

  // ── Highlight HDL code ───────────────────────────────────
  useEffect(() => {
    if (!result?.hdl_code) { setHighlighted(''); return; }
    const key = `${language}:${result.hdl_code}`;
    if (highlightCache.current[key]) { setHighlighted(highlightCache.current[key]); return; }
    highlight(result.hdl_code, language).then((html) => {
      highlightCache.current[key] = html;
      setHighlighted(html);
    }).catch(() => setHighlighted(`<pre>${result.hdl_code}</pre>`));
  }, [result?.hdl_code, language]);

  // ── Highlight testbench code ─────────────────────────────
  useEffect(() => {
    if (!tbResult?.testbench_code) { setTbHighlighted(''); return; }
    highlight(tbResult.testbench_code, 'verilog').then(setTbHighlighted)
      .catch(() => setTbHighlighted(`<pre>${tbResult.testbench_code}</pre>`));
  }, [tbResult?.testbench_code]);

  // ── Reset TB when HDL changes ────────────────────────────
  useEffect(() => { setTbResult(null); setActiveTab('hdl'); }, [result?.hdl_code]);

  // ── Copy to clipboard ────────────────────────────────────
  async function handleCopy() {
    const code = activeTab === 'hdl' ? result?.hdl_code : tbResult?.testbench_code;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download file ────────────────────────────────────────
  function handleDownload() {
    const code = activeTab === 'hdl' ? result?.hdl_code : tbResult?.testbench_code;
    const name = activeTab === 'hdl' ? result?.filename : tbResult?.filename;
    if (!code || !name) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Generate testbench ───────────────────────────────────
  async function handleTestbench() {
    if (tbResult) { setActiveTab('tb'); return; }
    setFetchingTb(true);
    try {
      const tb = await onGetTestbench();
      setTbResult(tb);
      setActiveTab('tb');
    } catch (e: any) {
      toast.error(`Testbench error: ${e.message}`);
    } finally {
      setFetchingTb(false);
    }
  }

  // ── ZIP export ───────────────────────────────────────────
  async function handleZip() {
    if (!result?.hdl_code) return;
    const mod = result.filename.replace(/\.(v|vhd)$/, '');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file(result.filename, result.hdl_code);
      if (tbResult) zip.file(tbResult.filename, tbResult.testbench_code);
      zip.file('Makefile', makeMakefile(mod));
      zip.file('README.md', makeReadme(mod));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${mod}_hdl.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${mod}_hdl.zip downloaded`);
    } catch (e: any) {
      toast.error(`ZIP error: ${e.message}`);
    }
  }

  const ports = result ? parsePorts(result.hdl_code, language) : [];
  const inputPorts  = ports.filter((p) => p.dir === 'input');
  const outputPorts = ports.filter((p) => p.dir === 'output');
  const activeCode = activeTab === 'hdl' ? highlighted : tbHighlighted;
  const activeRaw  = activeTab === 'hdl' ? result?.hdl_code : tbResult?.testbench_code;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 48, right: 0, bottom: 20,
        width: 540,
        zIndex: 50,
        background: 'var(--surface-1)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.4)' : 'none',
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          {/* Title */}
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-1)', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Generated HDL
          </span>

          {generating && (
            <Loader2 size={13} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          )}

          <div style={{ flex: 1 }} />

          {/* Language toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            {(['verilog', 'vhdl'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => { onLangChange(lang); setActiveTab('hdl'); }}
                style={{
                  padding: '3px 10px',
                  background: language === lang ? 'var(--accent-muted)' : 'transparent',
                  border: 'none',
                  borderRight: lang === 'verilog' ? '1px solid var(--border)' : 'none',
                  color: language === lang ? 'var(--accent)' : 'var(--text-3)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  transition: 'all 0.12s',
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer', borderRadius: 4,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 0, flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}>
          {[
            { id: 'hdl' as const, label: result?.filename || 'output.v' },
            { id: 'tb'  as const, label: tbResult?.filename || 'testbench.v', disabled: !tbResult },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { if (!tab.disabled) setActiveTab(tab.id); }}
              disabled={tab.disabled}
              style={{
                padding: '8px 16px',
                background: 'transparent', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab.disabled ? 'var(--text-4, #3a4050)'
                     : activeTab === tab.id ? 'var(--accent)' : 'var(--text-3)',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                cursor: tab.disabled ? 'default' : 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Code block ── */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {generating ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
              <Loader2 size={18} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                Generating…
              </span>
            </div>
          ) : activeCode ? (
            <div
              dangerouslySetInnerHTML={{ __html: activeCode }}
              style={{ fontSize: 12, lineHeight: 1.6 }}
              className="shiki-block"
            />
          ) : activeTab === 'tb' && fetchingTb ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
              <Loader2 size={18} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                Building testbench…
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                Export HDL to see code here
              </span>
            </div>
          )}
        </div>

        {/* ── Pin map ── */}
        {ports.length > 0 && (
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}>
            <button
              onClick={() => setPinMapOpen((v) => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: 'transparent', border: 'none',
                color: 'var(--text-2)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              {pinMapOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Port Map
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 10 }}>
                {inputPorts.length}in · {outputPorts.length}out
              </span>
            </button>

            {pinMapOpen && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px 16px',
                padding: '0 16px 12px',
                maxHeight: 120, overflowY: 'auto',
              }}>
                {ports.map((p) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: p.dir === 'input' ? 'var(--pin-input)' : 'var(--pin-output)',
                      background: p.dir === 'input'
                        ? 'rgba(79,163,255,0.1)' : 'rgba(245,166,35,0.1)',
                      border: `1px solid ${p.dir === 'input' ? 'rgba(79,163,255,0.3)' : 'rgba(245,166,35,0.3)'}`,
                      borderRadius: 3, padding: '1px 5px',
                    }}>
                      {p.dir === 'input' ? 'IN' : 'OUT'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Action bar ── */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--surface-2)',
        }}>
          {/* Primary: Copy */}
          <button
            onClick={handleCopy}
            disabled={!activeRaw}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px',
              background: 'var(--accent)', color: 'var(--text-inv)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
              cursor: activeRaw ? 'pointer' : 'not-allowed',
              opacity: activeRaw ? 1 : 0.4,
              transition: 'opacity 0.12s',
              letterSpacing: '0.02em',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Download */}
          <ActionBtn icon={<Download size={13} />} label="Download" onClick={handleDownload} disabled={!activeRaw} />

          <div style={{ flex: 1 }} />

          {/* Testbench */}
          <ActionBtn
            icon={fetchingTb ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
            label={tbResult ? 'Testbench ✓' : 'Testbench'}
            onClick={handleTestbench}
            disabled={!result || fetchingTb}
            accent={tbResult ? 'var(--accent)' : undefined}
          />

          {/* ZIP */}
          <ActionBtn icon={<Archive size={13} />} label="ZIP" onClick={handleZip} disabled={!result} />
        </div>
      </div>

      {/* Shiki override styles */}
      <style>{`
        .shiki-block pre {
          margin: 0;
          padding: 16px;
          background: #1e2030 !important;
          min-height: 100%;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.6;
          tab-size: 2;
        }
        .shiki-block code { font-family: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, accent,
}: {
  icon: React.ReactNode; label: string;
  onClick: () => void; disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 12px',
        background: 'transparent',
        border: `1px solid ${accent || 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        color: accent || 'var(--text-2)',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.12s',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.borderColor = accent || 'var(--border-hi)';
          (e.currentTarget as HTMLElement).style.color = accent || 'var(--text-1)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accent || 'var(--border)';
        (e.currentTarget as HTMLElement).style.color = accent || 'var(--text-2)';
      }}
    >
      {icon} {label}
    </button>
  );
}
