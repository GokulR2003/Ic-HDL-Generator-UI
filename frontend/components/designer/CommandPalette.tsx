'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';

export interface Command {
  id: string;
  category: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

// Fuzzy-ish: returns true if every char of `q` appears in `s` in order
function fuzzyMatch(s: string, q: string): boolean {
  if (!q) return true;
  s = s.toLowerCase(); q = q.toLowerCase();
  let si = 0;
  for (let qi = 0; qi < q.length; qi++) {
    si = s.indexOf(q[qi], si);
    if (si === -1) return false;
    si++;
  }
  return true;
}

function fuzzyScore(label: string, category: string, q: string): number {
  if (!q) return 0;
  const target = `${category} ${label}`.toLowerCase();
  const query = q.toLowerCase();
  if (target.startsWith(query)) return 3;
  if (target.includes(query)) return 2;
  if (fuzzyMatch(target, query)) return 1;
  return 0;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map((cmd) => ({ cmd, score: fuzzyScore(cmd.label, cmd.category, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [commands, query]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Command[]> = {};
    filtered.forEach((cmd) => {
      if (!map[cmd.category]) map[cmd.category] = [];
      map[cmd.category].push(cmd);
    });
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flat = filtered;

  function execute(cmd: Command) {
    onClose();
    setTimeout(() => cmd.action(), 60); // close first, then act
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[activeIdx]) execute(flat[activeIdx]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Reset active when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed',
        top: '18%', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        width: 'min(560px, 92vw)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-mid)',
        borderRadius: 10,
        boxShadow: '0 32px 100px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '60vh',
      }}>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'var(--text-1)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
          <kbd style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            background: 'var(--surface-3)', border: '1px solid var(--border-mid)',
            borderRadius: 4, padding: '2px 6px', color: 'var(--text-3)',
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {flat.length === 0 ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)',
            }}>
              No commands match "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div style={{
                  padding: '6px 14px 3px',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                  color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const globalIdx = flat.indexOf(cmd);
                  const isActive = globalIdx === activeIdx;
                  return (
                    <div
                      key={cmd.id}
                      data-idx={globalIdx}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px',
                        background: isActive ? 'var(--accent-muted)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.08s',
                      }}
                    >
                      {cmd.icon && (
                        <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }}>
                          {cmd.icon}
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: 13,
                          color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div style={{
                            fontFamily: 'var(--font-sans)', fontSize: 11,
                            color: 'var(--text-3)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          background: 'var(--surface-3)', border: '1px solid var(--border-mid)',
                          borderRadius: 4, padding: '1px 6px',
                          color: isActive ? 'var(--accent)' : 'var(--text-3)',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '6px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16,
          background: 'var(--surface-2)',
        }}>
          {[
            ['↑↓', 'navigate'],
            ['↵',  'run'],
            ['Esc','close'],
          ].map(([key, desc]) => (
            <span key={key} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <kbd style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                borderRadius: 3, padding: '1px 4px', color: 'var(--text-3)',
              }}>{key}</kbd>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-3)' }}>{desc}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
