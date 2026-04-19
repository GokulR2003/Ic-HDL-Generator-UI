# audit.md — IC HDL Generator

> Engineering audit. No sugarcoating. Every claim is anchored to a file:line.

Repo audited: `d:/ic_hdl_generator-main` @ `master` (c50f21c)
Frontend repo: `GokulR2003/Ic-HDL-Generator-UI` (not cloned here — inferred from README)
Live: `https://ic-hdl-generator.onrender.com/` (Render free tier, cold-starts)

---

## 0. TL;DR

This is a **working student project with a strong HDL-generation core and a broken, amateurish UI shell**. The netlist logic in [schematic_hdl_generator.py](backend/services/schematic_hdl_generator.py) is actually the best-engineered part of the repo — it has a real IC pin database, handles 7402's output-first quirk, and emits valid Verilog identifiers. Everything around it (canvas, save/load, feedback affordances, visual identity) screams "hackathon MVP."

The headline problems:

1. **The entire circuit designer is 736 lines of inline JavaScript in a Jinja2 template** — [designer.html:143-735](backend/templates/designer.html#L143-L735). Not a script file. Not a module. Not a build. Inline. This is the single biggest technical debt item.
2. **Save/load is silently broken.** [saveCircuit()](backend/templates/designer.html#L698-L713) serializes `canvas.toJSON()` but **never includes the `wires[]` array** — load restores objects without connections. Users lose their circuit topology on every save.
3. **Wire-drawing state leaks across tool switches.** [setTool()](backend/templates/designer.html#L182-L212) never resets `isDrawingWire`, `wireStartPort`, or `tempWire`. Switching to Select mid-draw leaves an invisible `fabric.Line` on canvas and a stale port reference.
4. **Every user action confirms via `alert()` or asks via `prompt()`.** Module name? `prompt()`. Language choice? `prompt()`. Load which circuit? A numbered `prompt()` list. Saved? `alert('Saved!')`. This is 2003-era UX.
5. **The UI looks AI-generated** because it *is* — default Tailwind gray-100 canvas, rounded-lg cards with `hover:shadow-md`, a 💾 emoji next to Save, three gradient-free primary buttons (green/purple/blue). Nothing is distinctive.

The fix path is real but non-trivial. **Do not ship more features before hardening the canvas and killing the `prompt()`/`alert()` dialogs.** Every new feature on top of this foundation inherits its debt.

---

## 1. Product-Level Issues — "Does this feel professional?"

### 1a. Where trust breaks
- **Cold start on Render free tier** (~30s on first load). Users assume the app is broken and bounce. `render.yaml` is on the free plan per commit `cf45bf8`. There is no splash/loading state during cold start.
- **Three browser `prompt()` dialogs back-to-back** on Export ([designer.html:632-637](backend/templates/designer.html#L632-L637)): "Module name:", "Language:" — this is the user's *final* payoff for building a circuit, and you greet them with OS-level dialogs.
- **Emojis as icons** in primary actions: 💾 Save, 📂 Load ([designer.html:119, 124](backend/templates/designer.html#L119-L124)). No serious engineering tool does this.
- **No empty state** on the canvas. Open /designer for the first time and you get a blank gray rectangle with no hint of what to do.
- **No persistence of tool state or user identity**. Anonymous SQLite rows. Saving a circuit just dumps it into a shared table.
- **"Switch Input" / "LED Output" in sidebar but no way to rename them, label them, or set initial values.** A real designer distinguishes `clk`, `rst_n`, `data[0]`, etc.

### 1b. What signals "AI-generated"
| Tell | Location |
|---|---|
| Tailwind `bg-white border border-gray-200 rounded p-2 hover:shadow-md hover:border-blue-500 transition-all` — the exact default "card" pattern | sidebar components, [designer.html:24](backend/templates/designer.html#L24) |
| Three colored primary buttons: `bg-green-600`, `bg-purple-600`, `bg-blue-600` for Save/Load/Export. Color has no semantic meaning here. | [designer.html:117-128](backend/templates/designer.html#L117-L128) |
| `#f3f4f6` canvas background (Tailwind `gray-100`) — the default "I couldn't decide" backdrop | [designer.html:165](backend/templates/designer.html#L165) |
| "Drag to canvas" hint under the Components header — generic copy | [designer.html:14](backend/templates/designer.html#L14) |
| IC thumbnails are `w-8 h-8 bg-blue-100 rounded` with the last two chars of the part number — not schematic glyphs | [designer.html:28-29](backend/templates/designer.html#L28-L29) |
| LED rendered as a red circle with a white highlight dot. Switch rendered as a rounded rectangle with a green knob. Both cartoonish, neither EE-schematic-standard. | [designer.html:494-518, 471-489](backend/templates/designer.html#L471-L518) |

### 1c. Brutal truth: "student project" markers
- **No tests.** Zero. The service layer is complex enough to warrant at least golden-output tests for the 7400 family HDL.
- **No modular JS.** 736-line inline `<script>` in a template.
- **No state machine** — wire drawing uses three ungrouped mutable variables (`isDrawingWire`, `wireStartPort`, `tempWire`) that must be kept in sync by hand.
- **`prompt()`/`alert()` everywhere** for UX.
- **README is a setup script, not a product page.** No screenshots, no "what is this", no "why it exists." Just `cd`/`pip install`/`npm run dev`.
- **Two copies of Fabric.js** — CDN loaded in [designer.html:142](backend/templates/designer.html#L142) AND a local `backend/static/fabric.min.js` — version drift risk waiting to happen.
- **`canvas.toJSON()` used twice with inconsistent custom-prop lists** — [L641](backend/templates/designer.html#L641) includes `isPort, isIO, ioType, pinIndex, pinName, icType`, but [L708](backend/templates/designer.html#L708) omits all of them. Save and Export serialize different shapes of the same canvas.

---

## 2. UI/UX Problems

### 2a. Layout
- **Sidebar has 20 ICs in a single uncategorized scroll list** ([designer.html:22-35](backend/templates/designer.html#L22-L35)) — 7400s, flip-flops, decoders, 555, 4017 all thrown together. No search, no filter, no grouping by function (gates/latches/counters/decoders).
- **Toolbar is split between two absolute-positioned floating cards** overlapping the canvas ([designer.html:67-131](backend/templates/designer.html#L67-L131)). They work but collide with the top-left of the canvas content the moment users zoom or pan near that corner.
- **No bottom status bar** — there's nowhere to show coordinates, zoom level, selected component, or current tool hint.
- **No right-side inspector panel** — clicking a component shows you nothing. You cannot edit its label, rotate it, or see its pin list.

### 2b. Typography & color
- Sidebar uses `text-lg / text-sm / text-xs / text-xs uppercase tracking-wider` — four sizes, no rhythm. Tailwind-default everything.
- No design tokens. The literal hex `#1e293b`, `#475569`, `#cbd5e1` appear hardcoded inside Fabric.js component definitions ([designer.html:345-348, 403-406](backend/templates/designer.html#L345-L406)). These are Tailwind slate colors; they should be CSS variables or a theme object.
- Canvas background `#f3f4f6` against a `bg-gray-100` canvas container — the canvas and its container are the same gray. There's no visual frame.
- No dark mode. For an engineering tool that people stare at for hours, this is a miss.

### 2c. Interaction gaps
- **No keyboard shortcuts.** No `W` for wire, `V` for select, `Delete` for delete, `Esc` for cancel, `Ctrl+Z` for undo.
- **No undo/redo.** A wrong drag is permanent unless you Ctrl+Z via browser text fields (doesn't work on canvas).
- **No right-click context menu** despite `fireRightClick: true` being set on the canvas ([designer.html:168-169](backend/templates/designer.html#L168-L169)). The flag is on, but nothing is bound to it.
- **No hover preview** on component library items — you have to drag one to see what you'll get.
- **No snap-to-grid.** Components land wherever the mouse lets go. Wires don't align.
- **No pan.** There's zoom in/out but no middle-click drag, no space-drag, no fit-to-view.
- **Selection feedback is Fabric's default corner handles** — gives no app-specific visual language.

### 2d. Feedback
- 11 `alert()` and 4 `prompt()` calls across designer.html — search yourself: [Grep of designer.html](backend/templates/designer.html). No toasts, no inline error banners, no loading spinners.
- Console is the *primary* feedback channel for drag/drop (`console.log("Drop event triggered")`, etc. — [designer.html:257, 266, 278, 282](backend/templates/designer.html#L257-L282)). Users don't open devtools.
- Exports trigger an `alert()` before the download finishes prompting a save dialog — double-dialog UX.

---

## 3. Feature Gaps

### 3a. Missing critical features (table stakes for this category)
- **Delete a selected component or wire** — there is no `canvas.on('keydown')` for Delete/Backspace. The `clearCanvas` button nukes everything.
- **Undo / redo.**
- **Copy / paste / duplicate.**
- **Rename I/O pins** — every input is "SW" and every output is "LED" visually. For a generated Verilog module, you need named top-level ports.
- **Pin-direction aware wire validation** — the backend knows inputs vs outputs (ICPinDatabase), but the canvas lets you connect anything to anything.
- **Wire selection and deletion.** Wires are `selectable: true` ([designer.html:590](backend/templates/designer.html#L590)) but there's no delete handler.
- **Net-merge visualization** — when three pins share a net, the UI gives no indication they're electrically joined.
- **Error surfacing from the HDL generator.** If `generate-from-schematic` returns 500 with a useful message, the user sees an `alert()` popup and no way to diagnose.

### 3b. Weak / incomplete modules
- **I/O components have no pin object.** [addIO()](backend/templates/designer.html#L464-L530) creates the switch/LED but never attaches a `fabric.Circle` `isPort:true` — the *group itself* has `isPort = true` ([L526](backend/templates/designer.html#L526)). That's why wires can "connect" to a switch body instead of a specific terminal.
- **`pinName` fallback uses `P${pinNum}`** ([L424](backend/templates/designer.html#L424)). If the IC fetch fails, the HDL will be generated with meaningless pin names.
- **Testbench generation exists** (`backend/testbench_templates/`, untracked `generated_testbenches/`) but isn't wired into the designer UI — no button surfaces it.

### 3c. Circuit-designer-specific gaps (the ones that hurt most)
| Gap | Why it matters |
|---|---|
| No snap-to-grid | Wires look drunk; rotations misalign |
| No orthogonal/Manhattan wire routing | Wires are point-to-point diagonals — ugly and unreadable |
| No port labels on hover | You can't tell which pin is `A1` vs `B1` without memorizing pinouts |
| No output-vs-input visual distinction on pins | All pins are gray circles; you learn by failure |
| No zoom-to-fit / reset view | Once you zoom out too far you have to refresh |
| No multi-select / bounding box selection | Can't move a subassembly |

---

## 4. Technical Problems

### 4a. Frontend code structure (the big one)
- [designer.html](backend/templates/designer.html) is **one file containing HTML markup + 736 lines of inline JavaScript**. There is no build step, no module system, no TypeScript.
- All functions are attached to `window` ([L182, L236, L241, L249, L253, L624, L630-L632, L698, L715](backend/templates/designer.html#L182-L715)) so Jinja-rendered `onclick=` handlers can find them. This is 2010-era JS.
- **State is five mutable closures** in `initializeDesigner()`: `currentTool`, `isDrawingWire`, `wireStartPort`, `tempWire`, `wires`. No central store. Every feature that touches state manipulates these directly.
- **No separation between concerns**: Fabric object creation, event binding, DOM class toggling (Tailwind classes), network calls, and business logic (pin-map lookup, net inference) all live in the same 736-line scope.
- `backend/static/js/` directory exists but is **empty** — the previous intent to extract was abandoned.
- **Two Fabric.js copies**: `static/fabric.min.js` (local) and CDN (`cdnjs.cloudflare.com/fabric.js/5.3.1`). Only the CDN one is actually loaded; the local one is dead weight.

### 4b. Backend code structure
- `backend/services/schematic_hdl_generator.py` is a 30KB file — the heaviest service, reasonably well-organized into `ICPinDatabase` (data) and `SchematicHDLGenerator` (logic). Good.
- **Hardcoded IC pin database** inside Python — pin maps for 7400/7402/7404/7408/7432/7486 are in-code, not in the SQLite DB. Yet there's an `ics` table and `/ics/{part}` endpoint ([routers/ics.py](backend/routers/ics.py)). The frontend fetches from DB ([designer.html:312](backend/templates/designer.html#L312)), the backend generator ignores the DB and uses its own hardcoded `ICPinDatabase`. Two sources of truth for the same data.
- **Route naming inconsistency**: `POST /generator/generate-from-schematic` vs legacy `/generator/generate` endpoints. Router is growing organically without review.
- **No API versioning.** A frontend rewrite will break with any backend contract change.

### 4c. Performance / correctness bottlenecks
- [updateWires()](backend/templates/designer.html#L608-L621) iterates all wires on every `moving` event from every group — O(components × wires) per mousemove frame. Gets janky fast on 30+ components.
- [makePortsClickable()](backend/templates/designer.html#L214-L223) iterates `canvas.getObjects()` on every tool switch — same O(n) scan when a lookup table would be O(1).
- **No debouncing** on `mouse:move` wire-draw updates ([L578-L583](backend/templates/designer.html#L578-L583)) — every pixel of mouse motion triggers `requestRenderAll()`.
- Canvas resize re-queries DOM on every window resize ([L173-L178](backend/templates/designer.html#L173-L178)) — no `requestAnimationFrame` throttle.
- Backend generator doesn't stream or cache — every export is a full JSON parse + string concat of the generated HDL.

### 4d. Maintainability
- **Zero JSDoc or type hints** anywhere in the designer JS.
- **Backend is partially typed** (Pydantic schemas exist) but service-layer functions return plain dicts.
- **No linter config** (`.eslintrc`, `pyproject.toml` for ruff/black) visible in the repo root.
- **Git history is good** (small commits, descriptive messages) — this is the *one* healthy process signal.

---

## 5. Circuit Designer (Canvas) Deep Audit

This is the section you care about most. Four concrete bugs — ranked by severity:

### BUG #1 — CRITICAL: Save/load loses all wires
**Location:** [saveCircuit(), designer.html:698-713](backend/templates/designer.html#L698-L713)
```js
design_data: { objects: canvas.toJSON() }  // ← wires[] array NOT included
```
**What happens:** Save stores only canvas objects. The `wires[]` array — which holds `startPort` / `endPort` references — is never persisted. On Load, `canvas.loadFromJSON()` restores the visual wire lines (they're canvas objects), but `wires = []` is empty. `updateWires()` will not move them when components drag. **Export HDL on a loaded circuit will produce empty modules.**
**Reproduction:** Draw 2 ICs, connect them. Save. Refresh page. Load. Drag one IC — the wire doesn't follow. Export — generates HDL with no connections.
**Fix direction:** Serialize `wires[]` as `{ startPort: {parentId, pinIndex}, endPort: {parentId, pinIndex} }` and rebuild on load by resolving port references. Also fix the `canvas.toJSON()` custom-property list at L708 to match L641.

### BUG #2 — HIGH: Wire-drawing state leaks across tool switches
**Location:** [setTool(), designer.html:182-212](backend/templates/designer.html#L182-L212)
**What happens:** If you enter wire mode, click a pin (start drawing), then click the Select tool button — `currentTool` changes but `isDrawingWire`, `wireStartPort`, and `tempWire` stay set. The `tempWire` `fabric.Line` remains on canvas (invisible because `evented: false`). Next time you re-enter wire mode and click a pin, the endpoint will be drawn from the stale point.
**Fix direction:** Add a `cancelWireDraw()` helper and call it at the top of `setTool()` and from a new `keydown:Escape` handler.

### BUG #3 — HIGH: No cleanup on component delete → dangling wires + handler leaks
**Location:** [L445-L458 (group moving handler)](backend/templates/designer.html#L445-L458), [updateWires() L608-L621](backend/templates/designer.html#L608-L621)
**What happens:** There is no delete flow at all. If a user somehow removes an IC (manually via browser devtools, or via a future delete button you add), the `group.on('moving')` handler stays bound to the ghost reference, and `wires[]` still contains entries pointing at freed port circles. `updateWires()` will call `.set()` on undefined objects.
**Fix direction:** Implement `canvas.on('object:removed')` to (a) prune `wires[]` entries referencing the removed object, (b) explicitly `group.off('moving')`, (c) remove child pin objects that were added as siblings (they're not in the group).

### BUG #4 — MEDIUM: `tempWire.set({x2, y2})` uses raw pointer coords — ignores zoom/pan
**Location:** [mouse:move handler, L578-L583](backend/templates/designer.html#L578-L583)
```js
const pointer = canvas.getPointer(opt.e);
tempWire.set({ x2: pointer.x, y2: pointer.y });
```
`canvas.getPointer()` gives canvas-space coordinates, which is correct for the temp line endpoint. **But** `wireStartPort.left` / `.top` used at the *start* ([L545](backend/templates/designer.html#L545)) are the Fabric object's own left/top, which after any pan/zoom won't match `pointer`. Result: draw a wire after zooming, and the line visibly offsets from the pin it started on.
**Fix direction:** Use `startPort.getCenterPoint()` in canvas coordinates on both ends consistently.

### Additional smells
- **`finishWire` sets `lockMovementX/Y/Scaling/Rotation` but `selectable: true`** ([L590-L597](backend/templates/designer.html#L590-L597)). Wires can be selected but not moved — yet there's no delete path, so selection does nothing useful.
- **Pins are separate canvas objects, not children of the IC group** ([L379-L441](backend/templates/designer.html#L379-L441)). They're manually repositioned on `group.on('moving')`. This means: rotation will break them, scaling will break them, and selecting an IC selects only the body — the pins aren't part of the selection group.
- **`group.id` is used as `parentId`** ([L419](backend/templates/designer.html#L419)) but Fabric doesn't auto-assign `id` — this is likely `undefined` for every component. A `parentId` collision between multiple ICs means updates cross-wire between groups.

---

## 6. Code Quality Review

### Reusability
- **Component creation is copy-paste**. `addIC`, `addIO(input)`, `addIO(output)` build Fabric objects inline with hardcoded hex colors and dimensions. Adding a 7th IC variant means copying the switch body block and tweaking numbers.
- **No component factory / registry.** The sidebar iterates a Jinja `for part in [...]` list ([designer.html:22-23](backend/templates/designer.html#L22-L23)) — changing IC support requires edits in *both* the Python route config and the hardcoded `ICPinDatabase`.

### Component design
- Frontend has zero components — it's raw HTML + inline JS.
- Backend has `ICPinDatabase` which is a nice encapsulation. Its `get_pin_info(ic_type, pin_number)` is the right abstraction. Use more of this pattern.

### Naming
- `fetchAndAddIC` / `addIC` / `addIO` — inconsistent (why does one fetch and the other not?).
- `isPort` is used for both pin circles **and** whole I/O groups ([L418, L526](backend/templates/designer.html#L418-L526)) — overloaded meaning.
- `wireStartPort` is a port *object* variable. `startPort` is a *property* on wire objects. Same thing, two names.
- Backend's `_make_valid_identifier` is fine but this kind of logic usually lives in a shared `hdl_utils.py`.

### Scalability
- **The designer will collapse at ~50 components.** `updateWires()` is O(n²) per frame. Rendering 50 `fabric.Circle` pins across 10 ICs is already ~100 objects.
- **No virtualization, no layer caching, no dirty-region rendering.** Fabric supports all of this but none is used.

---

## 7. Brutal Truth — "Why does this look like a student project?"

These are the things that, one by one, would take you from "good CS final project" to "ship-to-a-portfolio":

1. **Kill every `alert()` and `prompt()`**. Replace with a real modal (Headless UI / Radix) and a toast system (sonner). This alone will 2x perceived quality.
2. **Extract the canvas JS** to `backend/static/js/designer/` as ES modules, or — better — move the designer to a real React/Next.js app that consumes the FastAPI backend as a pure API. The Next.js scaffold in `/frontend` is right there; fill it in.
3. **Redesign the UI identity.** Pick a real visual language. Dark canvas with a subtle dot-grid (not gray-100). Monospaced font for pin labels. Mute the accent colors — save bright colors for the one thing that matters (active wire). Schematic-style component glyphs, not blue rounded rectangles.
4. **Fix the state machine.** Wire-drawing, selection, delete, undo — all of it needs a single state container (Zustand if you stay React-ish, or a plain state object with an event emitter). Inline closure variables are the entire reason the bugs above exist.
5. **Add a right-side Inspector panel.** The moment a user clicks a component and sees `{ name: "7400", pins: [...], position: {x, y} }` in a structured panel, the product stops feeling like a toy.
6. **Write tests for the HDL generator.** The generator has real logic worth protecting. Golden tests per IC family (`test_7400_and.py`, `test_7402_nor.py`) with canonical input/output pairs.
7. **Put a real landing page** at `/`. Right now the app is a bag of tools at `/designer`, `/boolean/tool`, `/ics-view`. A product has a story.
8. **Fix the cold-start problem.** Either upgrade the Render plan, or add a health-check pinger (cron-job.org) + a proper loading state that says "waking server".

These aren't nice-to-haves. These are the line between "I built this in college" and "this is something I'd use."

---

## Summary table

| Layer | State | Top-1 action |
|---|---|---|
| HDL generator (service) | **Good** — cleanest code in repo | Add tests |
| Canvas state machine | **Broken** — 4 documented bugs | Fix #1 (save loses wires) today |
| UI visual identity | **Generic** — reads as AI-generated | Redesign in [design.md](design.md) |
| UX (dialogs, feedback) | **Poor** — `alert`/`prompt` driven | Replace with modals + toasts |
| Frontend architecture | **Monolithic** — 736-line inline JS | Extract to modules or migrate to React |
| Tests | **None** | Golden tests for HDL gen first |
| Docs / product framing | **Weak** — README is a setup script | Write a product-level README |

Next artifact: [design.md](design.md).
