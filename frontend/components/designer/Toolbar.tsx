'use client';
import { MousePointer2, Pencil, Trash2, Hand, Undo2, Redo2, Maximize2 } from 'lucide-react';
import { useDesignerStore, type Tool } from '@/lib/store/designer';

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
  { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select',    key: 'V' },
  { id: 'wire',   icon: <Pencil size={16} />,        label: 'Wire',      key: 'W' },
  { id: 'delete', icon: <Trash2 size={16} />,        label: 'Delete',    key: 'Del' },
  { id: 'pan',    icon: <Hand size={16} />,           label: 'Pan',       key: 'Space' },
];

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  onResetView: () => void;
}

export function Toolbar({ onUndo, onRedo, onFitView, onResetView }: ToolbarProps) {
  const { tool, setTool } = useDesignerStore();

  return (
    <div style={{
      width: 44,
      background: 'var(--surface-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 0',
      gap: 4,
      flexShrink: 0,
    }}>
      {TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            aria-label={`${t.label} tool (${t.key})`}
            aria-pressed={active}
            onClick={() => setTool(t.id)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'var(--accent-muted)' : 'transparent',
              border: active ? '1px solid var(--accent)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color: active ? 'var(--accent)' : 'var(--text-3)',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            {t.icon}
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ width: 20, height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* History + view buttons */}
      {[
        { icon: <Undo2 size={15} />,     title: 'Undo (Ctrl+Z)', action: onUndo },
        { icon: <Redo2 size={15} />,     title: 'Redo (Ctrl+Y)', action: onRedo },
        { icon: <Maximize2 size={15} />, title: 'Fit view (F)',  action: onFitView },
      ].map((btn, i) => (
        <button
          key={i}
          title={btn.title}
          aria-label={btn.title}
          onClick={btn.action}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-3)',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
