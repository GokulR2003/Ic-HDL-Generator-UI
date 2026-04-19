'use client';
import { useState } from 'react';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { TruthTableResult } from '@/lib/api';

interface TruthTablePanelProps {
  open: boolean;
  result: TruthTableResult | null;
  loading: boolean;
  onClose: () => void;
}

// ── Cell rendering ─────────────────────────────────────────────
function Bit({ value, accent }: { value: boolean; accent: string }) {
  return (
    <td style={{
      textAlign: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
      padding: '4px 0',
      color: value ? accent : 'var(--text-4, #3a4a60)',
      background: value
        ? `${accent}14`
        : 'transparent',
      transition: 'background 0.1s',
    }}>
      {value ? '1' : '0'}
    </td>
  );
}

export function TruthTablePanel({ open, result, loading, onClose }: TruthTablePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  function handleExportCSV() {
    if (!result) return;
    const headers = [...result.inputs, ...result.outputs].join(',');
    const rows = result.rows.map((r) =>
      [...r.inputs, ...r.outputs].map((v) => (v ? '1' : '0')).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'truth_table.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('truth_table.csv downloaded');
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 44,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: open
          ? 'translate(-50%, -50%) scale(1)'
          : 'translate(-50%, -52%) scale(0.96)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        zIndex: 55,
        width: 'min(680px, 90vw)',
        maxHeight: '80vh',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Truth Table
          </span>

          {result && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
              {result.total_rows} rows · {result.inputs.length}→{result.outputs.length}
              {result.capped && ' (capped at 256)'}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {result && (
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <Download size={12} /> CSV
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer', borderRadius: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
              <Loader2 size={18} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                Evaluating circuit…
              </span>
            </div>
          ) : !result ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                No circuit data. Add ICs and I/O ports first.
              </span>
            </div>
          ) : result.inputs.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
              <AlertTriangle size={16} style={{ color: 'var(--pin-output)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                No input ports — add Switch components to your circuit.
              </span>
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-mono)',
            }}>
              {/* Column group for coloring */}
              <colgroup>
                {result.inputs.map((_, i) => (
                  <col key={`in-${i}`} style={{ width: `${80 / (result.inputs.length + result.outputs.length)}%` }} />
                ))}
                {/* Separator column */}
                <col style={{ width: 2 }} />
                {result.outputs.map((_, i) => (
                  <col key={`out-${i}`} style={{ width: `${80 / (result.inputs.length + result.outputs.length)}%` }} />
                ))}
              </colgroup>

              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {result.inputs.map((name) => (
                    <th key={name} style={{
                      padding: '8px 4px',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      color: 'var(--pin-input)',
                      textAlign: 'center',
                      background: 'rgba(79,163,255,0.06)',
                      borderRight: '1px solid var(--border)',
                      letterSpacing: '0.04em',
                    }}>
                      {name}
                    </th>
                  ))}
                  <td style={{ width: 2, background: 'var(--border)' }} />
                  {result.outputs.map((name) => (
                    <th key={name} style={{
                      padding: '8px 4px',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      color: 'var(--pin-output)',
                      textAlign: 'center',
                      background: 'rgba(245,166,35,0.06)',
                      borderLeft: '1px solid var(--border)',
                      letterSpacing: '0.04em',
                    }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    onMouseEnter={() => setHovered(ri)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: hovered === ri ? 'var(--surface-2)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'default',
                    }}
                  >
                    {row.inputs.map((v, i) => (
                      <Bit key={i} value={v} accent="var(--pin-input)" />
                    ))}
                    <td style={{ width: 2, background: 'var(--border)' }} />
                    {row.outputs.map((v, i) => (
                      <Bit key={i} value={v} accent="var(--pin-output)" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {result && result.capped && (
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(245,166,35,0.06)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertTriangle size={12} style={{ color: 'var(--pin-output)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--pin-output)' }}>
              Showing first 256 of {result.total_rows} rows ({result.inputs.length} inputs). Export CSV for full table.
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
