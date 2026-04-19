'use client';
import { useDesignerStore } from '@/lib/store/designer';
import { IC_DB } from '@/lib/constants/icPins';

export function Inspector() {
  const { selectedId, components, wires, updateComponent } = useDesignerStore();
  const comp = selectedId ? components[selectedId] : null;
  const netCount = wires.length;

  return (
    <aside style={{
      width: 240,
      background: 'var(--surface-1)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10, fontWeight: 600,
        color: 'var(--text-3)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {comp ? 'Properties' : 'Inspector'}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {comp ? (
          <CompProperties comp={comp} onLabelChange={(label) => updateComponent(comp.id, { label })} />
        ) : (
          <NoSelection netCount={netCount} compCount={Object.keys(components).length} />
        )}
      </div>
    </aside>
  );
}

function CompProperties({ comp, onLabelChange }: {
  comp: ReturnType<typeof useDesignerStore.getState>['components'][string];
  onLabelChange: (l: string) => void;
}) {
  const icDef = comp.partNumber ? IC_DB[comp.partNumber] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 6px',
          background: comp.type === 'ic' ? 'var(--accent-muted)' : comp.type === 'input' ? 'rgba(79,163,255,0.12)' : 'rgba(245,166,35,0.12)',
          border: `1px solid ${comp.type === 'ic' ? 'var(--accent)' : comp.type === 'input' ? 'var(--pin-input)' : 'var(--pin-output)'}`,
          color: comp.type === 'ic' ? 'var(--accent)' : comp.type === 'input' ? 'var(--pin-input)' : 'var(--pin-output)',
          borderRadius: 'var(--radius-sm)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {comp.type === 'ic' ? comp.partNumber : comp.type}
        </span>
      </div>

      {/* Label field */}
      <Field label="Label">
        <input
          value={comp.label}
          onChange={(e) => onLabelChange(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; }}
          onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; }}
        />
      </Field>

      {/* IC description */}
      {icDef && (
        <Field label="Function">
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
            {icDef.desc}
          </div>
        </Field>
      )}

      {/* Pin table */}
      {icDef && (
        <Field label="Pins">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(icDef.pins).map(([num, pin]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text-3)', width: 18, textAlign: 'right', flexShrink: 0,
                }}>
                  {num}
                </span>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: pin.dir === 'input' ? 'var(--pin-input)'
                    : pin.dir === 'output' ? 'var(--pin-output)'
                    : pin.dir === 'power' ? 'var(--pin-power)'
                    : 'var(--pin-nc)',
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
                  {pin.name}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>
                  {pin.dir}
                </span>
              </div>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

function NoSelection({ netCount, compCount }: { netCount: number; compCount: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8,
      }}>
        {[
          { label: 'Components', value: compCount },
          { label: 'Nets', value: netCount },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 12,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Shortcuts
        </div>
        {[
          ['V', 'Select tool'],
          ['W', 'Wire tool'],
          ['Del', 'Delete selected'],
          ['Esc', 'Cancel / close'],
          ['Ctrl+Z', 'Undo'],
          ['Ctrl+Y', 'Redo'],
          ['F', 'Fit view'],
          ['0', 'Reset view'],
          ['T', 'Truth table'],
          ['Ctrl+K', 'Command palette'],
          ['Scroll', 'Zoom'],
        ].map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <kbd style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              background: 'var(--surface-3)', border: '1px solid var(--border-mid)',
              borderRadius: 3, padding: '1px 5px', color: 'var(--accent)',
            }}>{key}</kbd>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '6px 8px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12, outline: 'none',
};
