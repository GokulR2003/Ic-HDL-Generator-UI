'use client';
import { useDesignerStore } from '@/lib/store/designer';

export function StatusBar() {
  const { tool, zoom, cursorX, cursorY, wires, components } = useDesignerStore();
  const compCount = Object.keys(components).length;

  return (
    <div style={{
      height: 26,
      background: 'var(--surface-0)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 20,
      flexShrink: 0,
    }}>
      {[
        { label: 'Tool', value: tool.toUpperCase(), accent: tool === 'wire' },
        { label: 'Zoom', value: `${zoom}%` },
        { label: 'X', value: cursorX },
        { label: 'Y', value: cursorY },
        { label: 'Components', value: compCount },
        { label: 'Nets', value: wires.length },
      ].map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10, color: 'var(--text-3)',
          }}>
            {item.label}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10, fontWeight: 600,
            color: (item as any).accent ? 'var(--accent)' : 'var(--text-2)',
          }}>
            {item.value}
          </span>
        </div>
      ))}

      {/* Right: hint */}
      <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-3)' }}>
        {tool === 'wire'
          ? 'Click a pin to start — Esc to cancel'
          : tool === 'delete'
          ? 'Click a component or wire to delete'
          : tool === 'pan'
          ? 'Click and drag to pan the canvas'
          : 'Drag from palette · T for truth table · Ctrl+K for commands'}
      </div>
    </div>
  );
}
