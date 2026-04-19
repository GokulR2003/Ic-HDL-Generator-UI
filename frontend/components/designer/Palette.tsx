'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { IC_CATEGORIES, IC_DB } from '@/lib/constants/icPins';

interface PaletteProps {
  onDragStart: (type: string, name: string) => void;
}

const IO_ITEMS = [
  { type: 'input',  name: 'Switch', label: 'IN',  color: 'var(--pin-input)',  desc: 'Switch Input' },
  { type: 'output', name: 'LED',    label: 'OUT', color: 'var(--pin-output)', desc: 'LED Output' },
];

export function Palette({ onDragStart }: PaletteProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  const toggleCat = (cat: string) =>
    setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));

  return (
    <aside style={{
      width: 220,
      background: 'var(--surface-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Components
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{
            position: 'absolute', left: 8, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-3)',
            pointerEvents: 'none',
          }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '5px 8px 5px 26px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12, outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

        {/* I/O section */}
        {(!q || IO_ITEMS.some(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))) && (
          <Section label="I / O">
            {IO_ITEMS
              .filter(i => !q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
              .map((item, idx) => (
                <IOItem key={item.name} item={item} onDragStart={onDragStart} animIdx={idx} />
              ))}
          </Section>
        )}

        {/* IC categories */}
        {Object.entries(IC_CATEGORIES).map(([cat, parts]) => {
          const filtered = parts.filter(
            (p) => !q || p.toLowerCase().includes(q) ||
              IC_DB[p]?.desc?.toLowerCase().includes(q)
          );
          if (!filtered.length) return null;
          const isCollapsed = collapsed[cat];
          return (
            <Section
              key={cat}
              label={cat}
              collapsible
              isCollapsed={isCollapsed}
              onToggle={() => toggleCat(cat)}
            >
              {filtered.map((part, idx) => (
                <ICItem key={part} partNumber={part} onDragStart={onDragStart} animIdx={idx} />
              ))}
            </Section>
          );
        })}
      </div>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Section({
  label, children, collapsible, isCollapsed, onToggle,
}: {
  label: string; children: React.ReactNode;
  collapsible?: boolean; isCollapsed?: boolean; onToggle?: () => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={collapsible ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '4px 14px',
          background: 'none', border: 'none', cursor: collapsible ? 'pointer' : 'default',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: 600,
          color: 'var(--text-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          textAlign: 'left',
        }}
      >
        {label}
        {collapsible && (
          <span style={{
            fontSize: 9, color: 'var(--text-3)',
            transform: isCollapsed ? 'rotate(-90deg)' : 'none',
            display: 'inline-block', transition: 'transform 0.15s',
          }}>▾</span>
        )}
      </button>
      {!isCollapsed && <div style={{ padding: '2px 8px' }}>{children}</div>}
    </div>
  );
}

function ICItem({ partNumber, onDragStart, animIdx = 0 }: { partNumber: string; onDragStart: (t: string, n: string) => void; animIdx?: number }) {
  const def = IC_DB[partNumber];
  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={`${partNumber}${def?.desc ? ` — ${def.desc}` : ''}. Drag to canvas.`}
      onDragStart={(e) => {
        e.dataTransfer.setData('type', 'ic');
        e.dataTransfer.setData('name', partNumber);
        onDragStart('ic', partNumber);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 6px', marginBottom: 2,
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab', userSelect: 'none',
        border: '1px solid transparent',
        transition: 'background 0.12s, border-color 0.12s',
        animation: `paletteItemIn 0.22s cubic-bezier(0,0,0.2,1) ${animIdx * 0.025}s both`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      {/* DIP glyph */}
      <DipGlyph />
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
          {partNumber}
        </div>
        {def?.desc && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {def.desc}
          </div>
        )}
      </div>
    </div>
  );
}

function IOItem({ item, onDragStart, animIdx = 0 }: { item: typeof IO_ITEMS[0]; onDragStart: (t: string, n: string) => void; animIdx?: number }) {
  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={`${item.desc}. Drag to canvas.`}
      onDragStart={(e) => {
        e.dataTransfer.setData('type', item.type);
        e.dataTransfer.setData('name', item.name);
        onDragStart(item.type, item.name);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 6px', marginBottom: 2,
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab', userSelect: 'none',
        border: '1px solid transparent',
        transition: 'background 0.12s, border-color 0.12s',
        animation: `paletteItemIn 0.22s cubic-bezier(0,0,0.2,1) ${animIdx * 0.025}s both`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      <div style={{
        width: 28, height: 28,
        border: `1.5px solid ${item.color}`,
        borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: item.color }}>
          {item.label}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-1)' }}>
        {item.desc}
      </div>
    </div>
  );
}

function DipGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <rect x="7" y="4" width="14" height="20" rx="1.5" stroke="var(--border-hi)" strokeWidth="1" fill="var(--surface-3)" />
      {[7, 11, 15, 19].map((y, i) => (
        <g key={i}>
          <line x1="3" y1={y} x2="7" y2={y} stroke="var(--pin-input)" strokeWidth="1" />
          <line x1="21" y1={y} x2="25" y2={y} stroke="var(--pin-output)" strokeWidth="1" />
        </g>
      ))}
      <circle cx="9" cy="6" r="1" fill="var(--accent)" opacity="0.6" />
    </svg>
  );
}
