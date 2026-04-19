# plan.md — Execution Roadmap

> Turns [audit.md](audit.md) findings + [design.md](design.md) decisions into a sequenced, shippable plan.

**Estimation key:** S = ≤0.5 day · M = 1–2 days · L = 3–5 days · XL = 1–2 weeks.
(Solo developer, part-time cadence — adjust to your own velocity.)

**Guiding principle:** No new features until the canvas stops losing data. Fix → extract → redesign → expand. In that order.

---

## Phase 0 — Stop the bleeding (P0, before anything else)

One-day pass. These are bugs that would embarrass the project in a portfolio review.

| Task | Files | Priority | Effort | Depends |
|---|---|---|---|---|
| **P0.1** Fix save/load losing wires (serialize `wires[]` with `parentId` + `pinIndex`; rebuild on load) | [designer.html:698-731](backend/templates/designer.html#L698-L731), [routers/circuits.py](backend/routers/circuits.py) | High | M | — |
| **P0.2** Reset wire-draw state in `setTool()` + add `Escape` handler | [designer.html:182-212, 535-576](backend/templates/designer.html#L182-L576) | High | S | — |
| **P0.3** Delete the unused local `backend/static/fabric.min.js` (or switch to local and drop the CDN) | `backend/static/fabric.min.js` | High | S | — |
| **P0.4** Replace the 4 `prompt()` calls with a real modal; replace `alert()` with a toast utility | [designer.html:633, 636, 699, 722](backend/templates/designer.html) | High | M | — |
| **P0.5** Assign a stable ID to each IC group so `parentId` lookup actually works | [designer.html:364-419](backend/templates/designer.html#L364-L419) | High | S | — |
| **P0.6** Delete handler (`Delete`/`Backspace` key) that removes selection AND prunes `wires[]` + unbinds `group.on('moving')` | [designer.html](backend/templates/designer.html) | High | M | P0.5 |
| **P0.7** Fix `canvas.toJSON()` custom-property list mismatch between save (L708) and export (L641) | [designer.html:641, 708](backend/templates/designer.html) | High | S | — |

**Exit criteria:** Save, reload, drag a component — wires follow. Switch tools mid-draw — no phantom wire. Press Delete on a selected IC — wires vanish cleanly.

---

## Phase 1 — Extract canvas to a real architecture (P1)

**Decision point first:** Do we stay with Jinja-served HTML or migrate the designer to the Next.js frontend in `/frontend`?

Recommendation: **Migrate.** The canvas will grow; 736 lines of inline JS is already at breaking point. The Next.js scaffold is already in the repo. Do the migration now, before Phase 2 piles UI changes on top of the inline version.

If you disagree (or want to defer the migration), Phase 1 becomes "extract inline JS to `backend/static/js/designer/` ES modules, keep Jinja template." Both paths are listed below.

### Path A (recommended): Migrate /designer to Next.js + FastAPI-as-API

| Task | Files | Priority | Effort |
|---|---|---|---|
| **P1.A1** Audit FastAPI routes; add CORS for Next.js dev (localhost:3000) | [backend/main.py](backend/main.py), [routers/](backend/routers/) | High | S |
| **P1.A2** Bootstrap Next.js designer page: `app/designer/page.tsx` with a `<Canvas />` client component wrapping Fabric.js | [frontend/app/](frontend/app/) | High | M |
| **P1.A3** Port state to Zustand: `useDesignerStore` with slices for components, wires, tool, selection, clipboard | [frontend/lib/store/](frontend/lib/) | High | M |
| **P1.A4** Port drag-drop, wire-drawing, selection logic as hooks: `useDragDrop`, `useWireTool`, `useSelection` | [frontend/hooks/](frontend/) | High | L |
| **P1.A5** API client in `lib/api.ts` for `/ics/*`, `/circuits/*`, `/generator/*` with proper error types | [frontend/lib/](frontend/lib/) | High | S |
| **P1.A6** Feature-flag cutover: old `/designer` still works until new `/designer` is validated; then redirect | [backend/main.py](backend/main.py) | Medium | S |

**Exit criteria:** `cd frontend && npm run dev` opens a working designer with feature parity to the current Jinja version. Zustand store is the single source of truth. No `window.*` global functions anywhere.

### Path B (deferred migration): Modularize inline JS in place

| Task | Files | Priority | Effort |
|---|---|---|---|
| **P1.B1** Split designer.html inline JS into ES modules under `backend/static/js/designer/{canvas,state,tools,drag,wire,io,export,api}.js` | `backend/static/js/designer/*` | High | L |
| **P1.B2** Add a tiny state container (plain module with pub/sub) replacing the closure vars | `backend/static/js/designer/state.js` | High | M |
| **P1.B3** Template reduces to `<script type="module" src="/static/js/designer/main.js">` + a 30-line bootstrap | [designer.html](backend/templates/designer.html) | High | S |

Pick one path and commit. **Don't do both.**

---

## Phase 2 — UI redesign (P1)

Implements [design.md](design.md). Assumes Phase 1 done.

| Task | Files | Priority | Effort |
|---|---|---|---|
| **P2.1** Install design tokens (CSS vars). Delete all hardcoded hex colors. | `tokens.css` / `globals.css`, Fabric component configs | High | S |
| **P2.2** Dark theme across all pages (landing, designer, boolean tool, ics-view) | Global | High | M |
| **P2.3** Add Inter + JetBrains Mono fonts (self-hosted via `next/font` or `@fontsource`) | Frontend | Medium | S |
| **P2.4** Rebuild TopBar (file menu, module name, primary Export CTA) | `components/TopBar.tsx` | High | M |
| **P2.5** Rebuild Palette: search + categories + draggable items with real glyphs (SVG DIP outlines) | `components/Palette.tsx` | High | M |
| **P2.6** Build Inspector panel (selection-aware: IC / wire / I/O / none) | `components/Inspector.tsx` | High | L |
| **P2.7** Build StatusBar (coords, zoom, tool, net count, validation summary) | `components/StatusBar.tsx` | Medium | S |
| **P2.8** Canvas dot-grid background (CSS-layer pattern behind the Fabric canvas) | `components/Canvas.tsx` | Medium | S |
| **P2.9** Left-side vertical tool toolbar (Select / Wire / Delete / Pan) with keyboard shortcut hints | `components/Toolbar.tsx` | Medium | S |
| **P2.10** Toast system (sonner) and Modal primitive (Radix Dialog) | `components/ui/` | High | S |
| **P2.11** Shortcut help modal (`?` trigger) | `components/ShortcutHelp.tsx` | Medium | S |

**Exit criteria:** The designer does not contain a single `alert()`, `prompt()`, emoji icon, or default Tailwind card. Every hover, focus, and click has a defined design-token-driven state.

---

## Phase 3 — Canvas quality (P1/P2)

Fix the interaction behaviors that made the canvas feel broken beyond just the bugs.

| Task | Priority | Effort |
|---|---|---|
| **P3.1** Snap-to-grid on drop and drag (20px, toggleable) | High | M |
| **P3.2** Orthogonal wire routing (Manhattan, one-corner) during draw + after commit | High | L |
| **P3.3** Pin-direction-aware validation during wire draw (green/red target indicator) | High | M |
| **P3.4** Keyboard shortcuts: `V`, `W`, `Del`, `Esc`, `Ctrl+Z/Y/D/C/V/A/S`, `1`, `0`, `?` | High | M |
| **P3.5** Undo/redo (command pattern on the Zustand store, ≥50 levels) | High | L |
| **P3.6** Multi-select via bounding box + Shift+click | Medium | M |
| **P3.7** Pan (middle-mouse / Space+drag) + cursor-centered wheel zoom | Medium | S |
| **P3.8** Fit-to-view (`1` key) + reset view (`0` key) | Medium | S |
| **P3.9** Net merge visualization (junction dots when 3+ pins share a net) | Medium | M |
| **P3.10** I/O components get real pin objects (not group-as-port) with direction encoded | High | M |

**Exit criteria:** Build a 4-bit adder end-to-end from scratch without needing to refresh or redo. If you can't, Phase 3 isn't done.

---

## Phase 4 — Codegen UX (P1)

The moment that defines whether this product *delivers*.

| Task | Priority | Effort |
|---|---|---|
| **P4.1** `CodePanel` component with Shiki syntax highlighting (Verilog + VHDL grammars) | High | M |
| **P4.2** Export opens a side-over panel, not a download + alert | High | S |
| **P4.3** Copy-to-clipboard primary, download secondary | High | S |
| **P4.4** Pin-mapping collapsible section (canvas port → HDL identifier table) | High | S |
| **P4.5** Inline annotation linkage: hover wire line in code → highlight canvas wire (and vice versa) via shared `sourceId` | High | L |
| **P4.6** Testbench button: POST to a `/generator/testbench` endpoint, returns template-based TB | High | M |
| **P4.7** ZIP export (HDL + TB + README + Makefile) | Medium | M |

**Exit criteria:** A student exports HDL, pastes it into EDA Playground / iverilog, and it compiles + simulates correctly on the first try for the 7400-family ICs currently supported.

---

## Phase 5 — Backend hardening (P2)

Parallel-izable with Phase 2-4; do when there's a break in UI work.

| Task | Priority | Effort |
|---|---|---|
| **P5.1** Golden tests for HDL generator (one input JSON + expected `.v` per IC family; 6 ICs = 6 tests) | High | M |
| **P5.2** Consolidate ICPinDatabase: pick ONE source — either move Python's hardcoded DB into SQLite seed data, or remove the DB-backed `/ics` endpoint and have both paths use the Python class | High | M |
| **P5.3** Add `/generator/validate` endpoint: runs the schematic through the generator without emitting HDL, returns structured errors/warnings. Feeds Phase 3's live validation. | Medium | M |
| **P5.4** Versioned API prefix: `/api/v1/*` | Medium | S |
| **P5.5** Structured error responses: `{ code, message, details, source_id }` — `source_id` drives Phase 4's annotation linking | Medium | S |
| **P5.6** Pyright/ruff/black config + CI workflow running them | Medium | S |
| **P5.7** Health endpoint + Render cold-start ping cron | Medium | S |

**Exit criteria:** `pytest` runs in CI. Breaking the HDL generator breaks a test.

---

## Phase 6 — New features (P2/P3)

See [features.md](features.md) for prioritization and rationale. Summary of what gets built here:

| Feature | Priority | Effort | Phase dep |
|---|---|---|---|
| Simulation preview (basic stimulus + waveform) | High | XL | P3, P4 |
| Boolean expression → schematic auto-placement | High | L | P3 |
| Truth table visualizer (per-component and full-circuit) | High | M | P5.3 |
| Command palette (`Ctrl+K`) | Medium | M | P2 |
| Learning mode / guided lessons | Medium | XL | P3, P4, P6 |
| User accounts + cloud save | Medium | L | P5.4 |
| Import Verilog → schematic (reverse generator) | Low | XL | P5 |
| Collaborative editing | Low | XL | all |

---

## Phase 7 — Polish (P3)

Don't start before Phase 2–4 are shippable. Polish compounds on a broken base; don't invert the order.

| Task | Priority | Effort |
|---|---|---|
| Entry animation: palette items stagger-fade on load | Low | S |
| Wire-draw rubber-band animates in one easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`) | Low | S |
| Hover micro-interaction: pin grows 1.0→1.3 with overshoot when in wire mode | Low | S |
| Save/Export button "pulse" on success (single 400ms scale 1.0→1.03→1.0) | Low | S |
| Landing page animated hero (JSON replay of a circuit being wired) | Medium | M |
| Performance: virtualize palette list if >100 ICs | Low | M |
| Performance: dirty-region rendering on canvas via Fabric's object caching | Medium | L |
| PWA manifest (offline-first with IndexedDB state) | Medium | M |
| Accessibility: keyboard nav through palette, focus rings, aria-labels on all icon buttons | High | M |

---

## Dependency graph (at a glance)

```
Phase 0 (bugs)
    ↓
Phase 1 (architecture / migration)
    ↓
    ├─→ Phase 2 (UI redesign)
    │       ↓
    │   Phase 3 (canvas quality) ←──── Phase 5 (backend hardening, parallel)
    │       ↓
    │   Phase 4 (codegen UX)
    │       ↓
    │   Phase 6 (new features)
    │       ↓
    └─→ Phase 7 (polish)
```

**Shippable milestones:**
- **M1 (end of Phase 0):** "No data loss." You can demo it without your stomach turning.
- **M2 (end of Phase 2):** "Looks like a product." Portfolio-safe.
- **M3 (end of Phase 4):** "The codegen is the magic." Share-with-strangers-safe.
- **M4 (end of Phase 6):** "People return to use it." Actual product.

Do not skip milestones. If Phase 2 feels unfinished, fix it before starting Phase 3.

---

## Parallelization

If you pull in a collaborator, split along these seams:
- Backend: Phase 5 (independent of all UI work).
- Frontend migration (Phase 1 Path A) + Phase 2 UI: one person owns both — they're too entangled to split.
- Phase 4 Codegen UX: can begin in parallel with Phase 3 if Phase 5.3 (`/generator/validate`) is done first.

---

Next: [features.md](features.md) details what to build in Phase 6 and why.
