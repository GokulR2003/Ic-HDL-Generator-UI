'use client';
import { useState, useEffect, useRef } from 'react';
import { Save, FolderOpen, Download, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { useDesignerStore } from '@/lib/store/designer';
import { CircuitsApi } from '@/lib/api';
import type { SerializedWire } from '@/lib/api';

interface TopBarProps {
  onSave: () => { objects: unknown; wires: SerializedWire[] };
  onLoad: (objects: unknown, wires: SerializedWire[]) => void;
  onExportHDL: () => void;
  exporting?: boolean;
}

export function TopBar({ onSave, onLoad, onExportHDL, exporting = false }: TopBarProps) {
  const { moduleName, setModuleName } = useDesignerStore();
  const [saving, setSaving] = useState(false);
  const [savePulsed, setSavePulsed] = useState(false);
  const [exportPulsed, setExportPulsed] = useState(false);
  const prevExporting = useRef(false);

  useEffect(() => {
    if (prevExporting.current && !exporting) setExportPulsed(true);
    prevExporting.current = exporting;
  }, [exporting]);

  async function handleSave() {
    const name = moduleName || 'my_circuit';
    setSaving(true);
    try {
      const { objects, wires } = onSave();
      await CircuitsApi.create({
        name, description: null,
        design_data: { objects, wires },
      });
      toast.success(`Saved as "${name}"`);
      setSavePulsed(true);
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad() {
    try {
      const circuits = await CircuitsApi.list();
      if (!circuits.length) { toast.warning('No saved circuits found.'); return; }
      // Simple: load the most recent one — a full modal picker is Phase 2
      const latest = circuits[circuits.length - 1];
      const circuit = await CircuitsApi.get(latest.id);
      const dd = circuit.design_data;
      onLoad(dd.objects, dd.wires || []);
    } catch (e: any) {
      toast.error(`Load failed: ${e.message}`);
    }
  }

  return (
    <header style={{
      height: 48,
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <Cpu size={16} style={{ color: 'var(--accent)' }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
          color: 'var(--text-1)', letterSpacing: '0.02em',
        }}>
          IC HDL
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Module name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          module
        </span>
        <input
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-1)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12, fontWeight: 600,
            padding: '3px 8px',
            outline: 'none',
            width: 160,
          }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; }}
          onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Actions */}
      <IconBtn onClick={handleLoad} title="Load circuit" disabled={saving}>
        <FolderOpen size={15} />
        <span>Load</span>
      </IconBtn>

      <IconBtn
        onClick={handleSave}
        title="Save circuit (Ctrl+S)"
        disabled={saving}
        pulsed={savePulsed}
        onPulseEnd={() => setSavePulsed(false)}
      >
        <Save size={15} />
        <span>{saving ? 'Saving…' : 'Save'}</span>
      </IconBtn>

      {/* Primary CTA */}
      <button
        onClick={onExportHDL}
        disabled={exporting}
        aria-label={exporting ? 'Generating HDL…' : 'Export HDL'}
        className={exportPulsed ? 'success-pulse' : ''}
        onAnimationEnd={() => setExportPulsed(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: 'var(--accent)', color: 'var(--text-inv)',
          border: 'none', borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
          cursor: exporting ? 'wait' : 'pointer',
          opacity: exporting ? 0.7 : 1,
          transition: 'opacity 0.12s',
          letterSpacing: '0.02em',
        }}
      >
        <Download size={14} />
        {exporting ? 'Generating…' : 'Export HDL'}
      </button>
    </header>
  );
}

function IconBtn({ children, onClick, title, disabled, pulsed, onPulseEnd }: {
  children: React.ReactNode; onClick: () => void; title: string;
  disabled?: boolean; pulsed?: boolean; onPulseEnd?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={pulsed ? 'success-pulse' : ''}
      onAnimationEnd={onPulseEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-2)',
        fontFamily: 'var(--font-sans)', fontSize: 12,
        cursor: 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hi)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';   (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
    >
      {children}
    </button>
  );
}
