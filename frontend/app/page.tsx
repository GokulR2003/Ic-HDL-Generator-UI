'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, Cpu, GitBranch, BookOpen } from 'lucide-react';

// Animated circuit trace SVG drawn with stroke-dashoffset
function CircuitTrace() {
  return (
    <svg
      viewBox="0 0 800 400"
      fill="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 1200; }
          to   { stroke-dashoffset: 0; }
        }
        .trace { stroke-dasharray: 1200; animation: draw 3.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .t1 { animation-delay: 0.2s; }
        .t2 { animation-delay: 0.8s; }
        .t3 { animation-delay: 1.3s; }
        .t4 { animation-delay: 1.8s; }
        @keyframes pop { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
        .node { animation: pop 0.3s ease forwards; }
        .n1 { animation-delay: 1.4s; opacity:0; }
        .n2 { animation-delay: 2.0s; opacity:0; }
        .n3 { animation-delay: 2.5s; opacity:0; }
      `}</style>

      {/* IC body */}
      <rect x="300" y="120" width="80" height="160" rx="2"
        stroke="#3dd9d6" strokeWidth="1.5" fill="none"
        className="trace t1" strokeDasharray="600" />
      {/* IC label */}
      <text x="340" y="208" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="11"
        fill="#3dd9d6" opacity="0.7">7408</text>

      {/* Left pins */}
      {[140,160,180,200,220,240,260].map((y, i) => (
        <line key={`lp${i}`} x1="280" y1={y} x2="300" y2={y}
          stroke="#4fa3ff" strokeWidth="1" className="trace t2"
          style={{ animationDelay: `${0.9 + i * 0.04}s` }} />
      ))}
      {/* Right pins */}
      {[140,160,180,200,220,240,260].map((y, i) => (
        <line key={`rp${i}`} x1="380" y1={y} x2="400" y2={y}
          stroke="#f5a623" strokeWidth="1" className="trace t3"
          style={{ animationDelay: `${1.3 + i * 0.04}s` }} />
      ))}

      {/* Traces going left */}
      <path d="M280 160 H200 V200 H100" stroke="#4fa3ff" strokeWidth="1.5"
        className="trace t2" />
      <path d="M280 200 H180 V260 H100" stroke="#4fa3ff" strokeWidth="1.5"
        className="trace t2" style={{ animationDelay: '1.1s' }} />
      <path d="M280 240 H160" stroke="#4fa3ff" strokeWidth="1.5"
        className="trace t2" style={{ animationDelay: '1.2s' }} />

      {/* Traces going right */}
      <path d="M400 160 H500 V140 H620" stroke="#f5a623" strokeWidth="1.5"
        className="trace t3" />
      <path d="M400 200 H540 V220 H620" stroke="#f5a623" strokeWidth="1.5"
        className="trace t3" style={{ animationDelay: '1.5s' }} />
      <path d="M400 240 H460 V300 H620" stroke="#f5a623" strokeWidth="1.5"
        className="trace t3" style={{ animationDelay: '1.7s' }} />

      {/* Junction dots */}
      <circle cx="200" cy="200" r="4" fill="#4fa3ff" className="node n1" />
      <circle cx="500" cy="140" r="4" fill="#f5a623" className="node n2" />
      <circle cx="460" cy="300" r="4" fill="#f5a623" className="node n3" />

      {/* Second IC */}
      <rect x="540" y="100" width="60" height="120" rx="2"
        stroke="#3dd9d6" strokeWidth="1" fill="none"
        className="trace t4" />
      <text x="570" y="165" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="10"
        fill="#3dd9d6" opacity="0.5">7404</text>
    </svg>
  );
}

const FEATURES = [
  {
    icon: <Cpu size={18} />,
    title: 'Circuit Designer',
    desc: 'Visual schematic editor with pin-aware wiring, drag-drop ICs, and live validation.',
    href: '/designer',
    accent: '#3dd9d6',
    cta: 'Open Designer',
    external: false,
  },
  {
    icon: <GitBranch size={18} />,
    title: 'Boolean → HDL',
    desc: 'Type a logic expression and get clean, annotated Verilog or VHDL instantly.',
    href: 'http://localhost:8000/boolean/tool',
    accent: '#4fa3ff',
    cta: 'Open Tool',
    external: true,
  },
  {
    icon: <BookOpen size={18} />,
    title: 'IC Reference',
    desc: 'Pin maps, truth tables, and function descriptions for the 74xx family.',
    href: 'http://localhost:8000/ics-view',
    accent: '#f5a623',
    cta: 'Browse ICs',
    external: true,
  },
];

export default function Home() {
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // blinking cursor
    const el = cursorRef.current;
    if (!el) return;
    let vis = true;
    const t = setInterval(() => {
      el.style.opacity = (vis = !vis) ? '1' : '0';
    }, 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-0)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 24,
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(6,10,18,0.85)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={15} style={{ color: 'var(--accent)' }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
            color: 'var(--text-1)', letterSpacing: '0.03em',
          }}>IC HDL</span>
        </div>
        <div style={{ flex: 1 }} />
        {['Designer', 'Boolean', 'ICs'].map((item, i) => (
          <a
            key={item}
            href={i === 0 ? '/designer' : i === 1 ? 'http://localhost:8000/boolean/tool' : 'http://localhost:8000/ics-view'}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--text-3)',
              textDecoration: 'none',
              transition: 'color 0.12s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--text-1)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            {item}
          </a>
        ))}
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        minHeight: '72vh',
        padding: '80px 10vw',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div className="canvas-grid" style={{
          position: 'absolute', inset: 0, opacity: 0.5,
        }} />
        {/* Circuit animation */}
        <CircuitTrace />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
          {/* Eyebrow */}
          <div
            className="hero-in"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginBottom: 28,
              padding: '4px 10px',
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              animationDelay: '0s',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              74xx series · Verilog · VHDL
            </span>
          </div>

          {/* Headline */}
          <h1
            className="hero-in"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 800,
              lineHeight: 1.08,
              color: 'var(--text-1)',
              margin: '0 0 20px',
              letterSpacing: '-0.02em',
              animationDelay: '0.1s',
            }}
          >
            Design circuits.<br />
            <span style={{ color: 'var(--accent)' }}>Get clean Verilog.</span>
            <span ref={cursorRef} style={{
              display: 'inline-block', width: 3, height: '0.85em',
              background: 'var(--accent)', marginLeft: 6,
              verticalAlign: 'middle', borderRadius: 1,
            }} />
          </h1>

          {/* Sub */}
          <p
            className="hero-in"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 16, lineHeight: 1.6,
              color: 'var(--text-2)',
              margin: '0 0 36px',
              maxWidth: 480,
              animationDelay: '0.2s',
            }}
          >
            Draw schematics with 74xx ICs. Connect pins visually.
            Export production-ready HDL — in your browser, zero install.
          </p>

          {/* CTAs */}
          <div
            className="hero-in"
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animationDelay: '0.32s' }}
          >
            <Link
              href="/designer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                background: 'var(--accent)', color: 'var(--text-inv)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'opacity 0.12s, transform 0.12s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              Open Designer <ArrowRight size={14} />
            </Link>
            <a
              href="http://localhost:8000/docs"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                background: 'transparent',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-mono)', fontSize: 13,
                textDecoration: 'none',
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hi)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-mid)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              API Docs
            </a>
          </div>

          {/* Stats row */}
          <div
            className="hero-in"
            style={{
              display: 'flex', gap: 28, marginTop: 44,
              paddingTop: 28, borderTop: '1px solid var(--border)',
              animationDelay: '0.44s',
            }}
          >
            {[
              ['6', 'IC families'],
              ['2', 'HDL targets'],
              ['0', 'install required'],
            ].map(([num, label]) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                  color: 'var(--text-1)', lineHeight: 1,
                }}>{num}</div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11,
                  color: 'var(--text-3)', marginTop: 4,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{
        padding: '48px 10vw 72px',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {FEATURES.map((f, i) => (
          <a
            key={f.title}
            href={f.href}
            className="hero-in"
            style={{
              display: 'block',
              padding: '24px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
              position: 'relative', overflow: 'hidden',
              animationDelay: `${0.1 + i * 0.08}s`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = f.accent;
              el.style.transform = 'translateY(-3px)';
              el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.accent}22`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--border)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Accent top border */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 2, background: f.accent, opacity: 0.6,
            }} />

            <div style={{ color: f.accent, marginBottom: 14 }}>{f.icon}</div>

            <h3 style={{
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              color: 'var(--text-1)', margin: '0 0 8px',
            }}>
              {f.title}
            </h3>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.5,
            }}>
              {f.desc}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              color: f.accent, letterSpacing: '0.04em',
            }}>
              {f.cta} <ArrowRight size={11} />
            </div>
          </a>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '18px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          IC HDL Generator
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          FastAPI · Next.js · Fabric.js
        </span>
      </footer>
    </div>
  );
}
