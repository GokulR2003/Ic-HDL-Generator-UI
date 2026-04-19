# design.md — IC HDL Generator Redesign Spec

> Redesign pass. Every decision has a reason. If a choice doesn't clearly beat what's in [audit.md](audit.md), it's not here.

---

## 1. Design Philosophy

**One sentence:** A schematic-editor-first engineering tool that *looks* like EDA software, not a SaaS landing page.

**Visual identity: engineering-grade dark UI with one accent color.**

Why dark:
- Users stare at schematics for long sessions. Dark reduces eye fatigue.
- Every serious EDA tool (KiCad, Altium, Logisim-Evolution's recent builds, Wokwi dark mode) defaults to dark.
- Light Tailwind-cardy UIs read as "SaaS product." Dark + mono reads as "tool."

Why one accent:
- When everything is colored (current state: green save, purple load, blue export), nothing stands out.
- Reserve the one accent color for *active signals only* — a live wire being drawn, a selected net, a validation error. Everything else is neutral.

**Target audience — be honest:**
- **Primary:** Electronics/CS students learning digital logic (you, and people like you). They know what a 7400 is but not how to write Verilog from scratch.
- **Secondary:** Self-taught hobbyists and bootcamp grads who want to generate HDL without downloading 2GB of EDA software.
- **NOT the target:** Professional ASIC designers. They use Cadence. Don't chase them.

This framing changes design priorities: clarity beats power-features, teaching moments beat hidden keyboard shortcuts, a good default beats a configurable setting.

---

## 2. UI System (Design Tokens)

Put these in `backend/static/css/tokens.css` (or `app/globals.css` if you move to Next.js). **No more hardcoded hex inside `fabric.Rect({ fill: '#1e293b' })`.**

### Color
```css
:root {
  /* Neutrals (slate-based, 9-step) */
  --surface-0: #0a0d14;   /* app bg */
  --surface-1: #11151f;   /* canvas bg */
  --surface-2: #1a1f2e;   /* panel bg */
  --surface-3: #242a3d;   /* raised: cards, tooltips */
  --border:    #2e3448;
  --border-strong: #3d4560;

  /* Text */
  --text-1: #e6e8ee;      /* primary */
  --text-2: #a1a7b8;      /* secondary */
  --text-3: #5f6578;      /* disabled / hint */

  /* Component fills — schematic-style */
  --ic-body:    #1c2333;  /* dark slate, not blue */
  --ic-stroke:  #4a5470;
  --ic-label:   #e6e8ee;
  --pin-default: #8a93a8;
  --pin-input:  #4fa3ff;  /* subtle blue — inputs */
  --pin-output: #ffb24f;  /* amber — outputs */
  --pin-power:  #ff5f6d;  /* red — VCC/GND */

  /* The ONE accent (electric cyan) */
  --accent:       #3dd9d6;
  --accent-hover: #55e5e2;
  --accent-muted: rgba(61, 217, 214, 0.15);

  /* Semantic */
  --success: #4ade80;
  --warning: #fbbf24;
  --danger:  #f87171;

  /* Grid */
  --grid-dot:  rgba(255, 255, 255, 0.04);
  --grid-major: rgba(255, 255, 255, 0.08);
}
```

**Rules:**
- `--accent` only for: active wire being drawn, current tool indicator, focused input field border, the *primary* CTA, and the active net highlight.
- Never put `--accent` on more than one element in the same viewport simultaneously.
- Pin colors encode *direction*: blue = input, amber = output, red = power/ground, gray = unclassified. This is schematic convention — use it.

### Typography
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

--text-xs: 11px / 1.4;    /* pin labels, status bar */
--text-sm: 13px / 1.5;    /* secondary UI */
--text-base: 14px / 1.5;  /* primary UI */
--text-md: 16px / 1.4;    /* panel headers */
--text-lg: 20px / 1.3;    /* page titles */
```

**Use mono font for:**
- Pin names (`A1`, `CLK`, `Q̄`)
- Net names (`net_17`, `sum_out`)
- Part numbers in the sidebar (`7400`, `74138`) — this is a *code-adjacent* label, not marketing copy
- Generated HDL preview

**Use sans for** all other UI chrome (buttons, menus, headings). The mono/sans split is the cheapest way to make a UI *read* like an engineering tool.

### Spacing
Use a strict 4px base. `space-1 = 4px`, `space-2 = 8px`, `space-3 = 12px`, `space-4 = 16px`, `space-6 = 24px`, `space-8 = 32px`. Do not use arbitrary Tailwind `p-[17px]` anywhere.

### Component consistency rules
1. **Borders are 1px, not 2px.** The current canvas uses 2px strokes on everything — makes things look clunky. 1px with good contrast reads crisper.
2. **Radius scale:** buttons/inputs `4px`, cards `6px`, modals `8px`. No `rounded-xl` or `rounded-2xl` anywhere — too friendly for this product.
3. **Shadows:** only on floating UI (modals, tooltips, dropdowns). Never on sidebar components or buttons. Current code uses `hover:shadow-md` on every sidebar item — remove it.
4. **No gradients.** Flat colors only. Gradients read as decorative; this is a tool.
5. **No emojis in chrome.** Replace 💾 📂 with outline icons from Lucide or Phosphor.

---

## 3. Page-by-Page Redesign

### 3a. Landing page (`/`)

**Current:** Unknown — the app likely just redirects to `/designer` or shows a blank template.

**Redesign:**
- **Hero:** A live, non-interactive canvas preview in the background showing an animated schematic being wired (loop a pre-recorded JSON replay). Top-left: product name in mono. Center: one sentence — *"Design digital circuits. Get clean Verilog. In your browser."* Bottom: two buttons — `Open Designer` (primary, accent) and `View example` (secondary, loads a demo 4-bit adder).
- **Below fold:**
  - Three cards: *Schematic Designer* / *Boolean Logic → HDL* / *IC Reference Library* — link to `/designer`, `/boolean/tool`, `/ics-view` respectively.
  - **Drop the long README content** from the landing. Keep it terse.
- **No testimonials, no "why choose us", no feature grid of 12 icons.** That's SaaS-page noise.

### 3b. Designer page (`/designer`) — **the main redesign**

**Layout (grid):**
```
┌──────────────────────────────────────────────────────────────┐
│  Top bar: logo · file menu · module name · Export HDL       │  48px
├──────────┬─────────────────────────────────────┬─────────────┤
│ Palette  │                                     │  Inspector  │
│ (264px)  │        Canvas (dot-grid)            │  (300px)    │
│          │                                     │             │
│ Search   │                                     │  Selected   │
│ Gates    │                                     │  component  │
│ Latches  │                                     │  details    │
│ …        │                                     │             │
├──────────┴─────────────────────────────────────┴─────────────┤
│ Status bar: coord · zoom · tool · net count · validation    │  28px
└──────────────────────────────────────────────────────────────┘
```

**Key differences from current:**
1. **Fixed-width palette (264px) — not a floating sidebar.** With a search box at the top and collapsible categories (Gates / Flip-flops / Counters / Decoders / Analog / I/O). 20 ICs scattered in one list is unusable.
2. **Right-side Inspector (300px, collapsible).** On selection:
   - For an IC: shows part number, function description, pin table (pin # · name · direction · net).
   - For a wire: shows start/end ports, net name (editable).
   - For an I/O: shows label (editable — this is how users rename `SW` to `clk`), direction, initial value.
   - For empty selection: shows module-level info — name, language, validation status, pin count.
3. **Top bar replaces the two floating toolbars.** A real menu: `File` (New / Open / Save / Save As / Recent) · `Edit` (Undo / Redo / Delete / Duplicate) · `View` (Fit / Zoom / Grid toggle) · `Generate` (Verilog / VHDL / Testbench). Right side: module name input + primary `Export HDL` button.
4. **Status bar at bottom:** `x, y` canvas coords · zoom % · active tool · `N nets · M unconnected pins` · validation `✓ OK` / `⚠ 2 issues`.
5. **Canvas gets a dot-grid background** (not flat gray). Pattern: `radial-gradient(circle, var(--grid-dot) 1px, transparent 1px) 0 0 / 20px 20px`. Every 5th dot at `--grid-major`. This gives visual rhythm and doubles as snap-grid reference.
6. **Tool switcher moves to a vertical toolbar** on the left edge of the canvas (between palette and canvas). Select / Wire / Delete / Pan. Each with a keyboard shortcut tooltip (`V`, `W`, `Delete`, `Space`).

### 3c. Output display — the codegen result

This is your strongest feature. Right now it dumps a `.v` file via browser download with an `alert()`. That's thrown-away value.

**Redesign: A side-over panel that slides in from the right** when you click Export.

```
┌── Generated Module ─────────────────── [Copy] [Download] [X]
│ module_name.v     Verilog · 147 lines
├──────────────────────────────────────────────────────────
│ 1  module my_adder(                               ← line nums
│ 2      input  wire a,                              ↑
│ 3      input  wire b,                              │ syntax
│ 4      output wire sum                             │ highlighted
│ 5  );                                              │
│ 6    // IC1: 7486 XOR — gate 1                    ← annotation
│ 7    wire net_3;                                   │ from your
│ 8    xor #1 g1 (.a(a), .b(b), .y(sum));           │ 3-model system
│ …                                                  ↓
├──────────────────────────────────────────────────────────
│  ▸ Show pin mapping   ▸ Show truth table   ▸ Testbench
└──────────────────────────────────────────────────────────
```

Must-haves:
- **Syntax highlighting** via Shiki or Prism (pick one, don't roll your own).
- **Inline annotations** — hover over `net_3` and the corresponding canvas wire highlights. Hover over `IC1` and the canvas IC pulses. This is *the* differentiator.
- **Copy to clipboard** (primary affordance for students pasting into a simulator).
- **Download** as secondary.
- **Collapsible "show pin mapping"** — a table of every canvas port and its HDL identifier, so students can debug when their simulation doesn't match their schematic.
- **Testbench button** generates and downloads a Verilog testbench (the service exists — expose it).

### 3d. Boolean Logic tool (`/boolean/tool`)

Briefly:
- Input field with a live parser showing the expression tree as you type.
- Toggle: "Convert to Verilog module" / "Convert to schematic" (the latter is the *real* differentiator — auto-place gates on the designer canvas).
- Generated Verilog shown inline with the same syntax-highlighted panel as above.

### 3e. IC reference (`/ics-view`)

Simple list → searchable grid of cards:
- Part number (mono, large)
- Function (e.g., "Quad 2-input NAND")
- Pinout SVG (schematic DIP style)
- Click → modal with pin table, truth table, and "Add to canvas" button

---

## 4. Code Output UI — detail

Annotations spec (this is worth getting right):

| Interaction | Effect |
|---|---|
| Hover any `wire net_N` declaration in code | Corresponding canvas wire glows `--accent`, others dim to 40% opacity |
| Hover any instance name `g1, g2…` | Corresponding IC on canvas pulses with an accent outline |
| Click a line in code | Selects the corresponding canvas object(s) |
| Hover any port in canvas | Highlights its declaration line in code |
| Click an error/warning in validation panel | Scrolls code to the problematic line AND highlights the canvas object |

Implement as a simple `data-src-id` attribute on each Shiki-generated token span and a `sourceId` property on each Fabric object. A map `sourceId ↔ line numbers` lets you drive both directions.

Export options:
- `.v` / `.vhd` (single file)
- `.zip` with `<name>.v`, `<name>_tb.v`, `README.md`, and a `Makefile` that runs `iverilog` + `vvp` locally (give students something they can actually run)

---

## 5. Circuit Designer UX Fix (Interaction Spec)

### Drag-drop from palette
- Drag starts: ghost follows cursor with component preview (semi-transparent). Current code only adds `opacity-50` to the source list item — user doesn't see what they're about to place.
- Drag over canvas: a placeholder IC outline appears at the snapped grid position under the cursor.
- Drop: component lands snapped. Inspector opens on the right showing its details. First input/output gets a prompt to name it inline ("Rename this input") — but not via `prompt()`; inline text field in the Inspector.

### Wire connection
- Enter wire mode (click tool button or press `W`).
- Hover any pin: pin pulses `--pin-input` or `--pin-output` based on its direction. Tooltip shows `IC1 · pin 2 · A1 · input`.
- Click pin: anchors the wire. Canvas shows a dashed "rubber-band" line from the pin to the cursor. Status bar updates: `Drawing wire from IC1.A1 (input)…`.
- While dragging:
  - **Orthogonal routing** — the rubber-band draws as Manhattan segments, not diagonal. One corner by default; hold `Alt` to toggle L/Γ corner direction.
  - If cursor hovers a **valid target pin** (opposite direction): target pin glows green, tooltip shows `Connect to IC2.B1 (input)`.
  - If cursor hovers an **invalid target** (same direction, or same pin): target pin glows red, tooltip shows `⚠ Cannot connect output to output`.
- Click valid target: wire commits. Both pins get a small filled dot (junction marker). Wire renders in `--pin-default` gray; selecting it turns it `--accent`.
- Press `Esc` or right-click at any time: wire draw cancels cleanly.

### Validation
Continuous, non-blocking:
- Unconnected output pins: marked with a small amber `!` badge.
- Input pins with no driver: marked red `!`.
- Shorted nets (two outputs driving one wire): both outputs flash red; status bar shows `⚠ Short circuit detected`.
- Status bar aggregates: `✓ 4 components · 6 nets · 0 issues` or `⚠ 2 issues (1 short, 1 floating input)`.

### Snap / grid
- 20px grid (matches current pin spacing — [designer.html:336](backend/templates/designer.html#L336)).
- Components snap to grid on drop and during drag.
- Wires snap their endpoints to pins (magnetic radius ~12px).
- Toggle: `View → Show grid` / `Snap to grid` (separable, stored in localStorage).

### Selection & manipulation
- Click: select one.
- Shift+click: toggle selection.
- Drag on empty canvas: bounding-box multi-select.
- Selected set: shows resize/rotate handles (but disable resize on ICs — rotation only, 90° increments).
- `Delete` or `Backspace`: removes selection. Wires connected to deleted components are cleanly removed.
- `Ctrl+D`: duplicate. `Ctrl+C`/`Ctrl+V`: standard clipboard.

### Pan & zoom
- Scroll wheel: zoom (toward cursor, not canvas center).
- Middle-click drag OR `Space+drag`: pan.
- `1`: fit all. `0`: reset view.
- Zoom range: 25% to 400%. Clamp hard — don't let users zoom to 3200% and lose components.

---

## 6. Interaction Design (the polish)

**Hover states** — one transition, one property each.
- Buttons: `background-color 120ms ease`. No transform, no shadow, no scale.
- Palette items: `border-color 120ms ease` + a subtle `--accent-muted` background. No `hover:shadow-md`.
- Pins in wire mode: a 200ms `ease-out` scale from 1.0 → 1.3 on hover. Small and snappy.

**Loading states**
- Cold start / slow fetch: skeleton screens, not spinners. Sidebar shows 8 empty shimmering component cards for up to 2s before real content. After 2s, show "Still loading… server waking" with a subtle progress bar.
- Export HDL: the button disables and shows `Generating…` with a 1px animated accent underline. Panel slides in when ready.
- Save: button's label becomes `Saving…` then flashes `✓ Saved` for 1.5s before reverting. **No alert().**

**Feedback messages**
- Use toasts (top-right, 4s auto-dismiss, stack). Library: `sonner` (if React) or write a tiny 50-line toast component. Types: info (neutral), success (subtle green left border), error (red left border, 8s dismiss).
- Inline errors in forms (e.g., module name) appear under the field with the `--danger` color.
- The Inspector is the home for *persistent* per-object feedback — e.g., "This pin has no connection" shows as a Inspector warning, not a toast.

**Empty states**
- Empty canvas: a centered dotted placeholder "Drop components from the palette to start. Press `?` for shortcuts." Dismiss on first component drop.
- Empty recent circuits: "No saved circuits yet. Save your first one with `Ctrl+S`."

---

## 7. "Make it NOT look AI-generated"

Specific anti-patterns to remove, with what to replace them with:

| Avoid | Replace with | Why |
|---|---|---|
| `bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md` cards | Dark `bg-[var(--surface-2)] border-l-2 border-transparent hover:border-[var(--accent)]` rows | Signals "editor row," not "marketing card" |
| Rainbow primary buttons (green save, purple load, blue export) | One primary (`Export HDL` in `--accent`), everything else is ghost/secondary | Semantic color discipline |
| Tailwind `gray-100` backgrounds | `--surface-1` with a dot-grid pattern | A canvas with a grid *looks like a canvas* |
| Emoji icons 💾📂 | Lucide/Phosphor outline icons | Professional tools don't use emoji |
| `alert()` / `prompt()` / `confirm()` | Modal + toast + Inspector | Table stakes for a web app |
| `w-8 h-8 bg-blue-100` IC thumbnails with last-two-digits text | Small SVG DIP package glyphs (8-pin / 14-pin / 16-pin outlines) with part number underneath | Schematic vocabulary |
| "Drag to canvas" as body copy | Nothing — the palette items *are* draggable, users will try. Remove the hint. | Respect the user |
| All gates drawn as labeled rectangles | Keep the DIP rectangle for ICs (correct — that *is* what a 7400 IC is), but when a user expands a gate into its individual units (e.g., 7400 gate 1 of 4), render IEEE schematic symbols (AND, OR, NAND, NOR, XOR) as discrete gate shapes | Two levels of abstraction: chip view vs gate view |
| `rounded-xl` / `rounded-2xl` anywhere | Max radius 8px | "Friendly" radii belong in SaaS; this is a tool |
| Thick 2px borders around ICs | 1px borders with strong color contrast | Crispness |
| Three-line headings with emojis ("🚀 Quick Start") in the README/landing | Plain text headings with the product promise first | Engineering tool register |

**Positive tells to add** (things AI-gen rarely does):
- A real **keyboard shortcut legend** (press `?` → modal listing every shortcut). Tools have these; SaaS products don't.
- A **"debug overlay"** toggle (`Ctrl+Shift+D`) that shows net IDs, component IDs, and pin directions directly on canvas. The existence of a debug mode signals "someone built this for themselves."
- A **monospace status bar** showing live coordinates and tool state. Every professional editor has one.
- A `Cmd/Ctrl+K` **command palette** (same concept as VS Code / Linear). Commands: "New circuit", "Import from Verilog", "Export as ZIP", "Toggle grid", etc.
- **Persistent local-first state**. Saving shouldn't require a server round-trip in the hot path; use IndexedDB first, sync to backend on `Save to cloud`.

---

## 8. Component inventory (what needs to exist)

To build the above, you need these reusable pieces. Name them, ship them once, use them everywhere.

**Layout**
- `TopBar` (logo, menu bar, module name input, primary CTA)
- `Palette` (search + collapsible categories + draggable items)
- `Canvas` (Fabric.js wrapper — but wrapped behind a React component with a ref)
- `Inspector` (dynamic — switches based on selection type)
- `StatusBar`

**Controls**
- `Button` (variants: primary, secondary, ghost, danger)
- `IconButton` (square, for toolbar)
- `Input` / `TextField` (with inline validation)
- `Select` / `Combobox`
- `Modal` (for module name input, shortcut help, etc.)
- `Toast` (sonner or equivalent)
- `Tooltip` (Radix or Headless UI)
- `ContextMenu` (right-click on canvas objects)

**Domain-specific**
- `ComponentGlyph` — renders a DIP package outline given pin count, part number, and optional pinout SVG
- `PinIndicator` — small colored circle encoding pin direction (input/output/power)
- `CodePanel` — syntax-highlighted Verilog/VHDL viewer with annotation hooks
- `TruthTable` — tabular renderer for boolean functions

Implementing these as components is how you stop writing one-off Tailwind classes and start building a product.

---

Next: [plan.md](plan.md) turns all of the above into a phased execution roadmap.
