# features.md — Feature Roadmap

> Prioritized by *impact ÷ effort*, not by what's easiest. Cross-references [plan.md](plan.md) phases.

Scoring conventions:
- **Impact**: 1 (nice-to-have) – 5 (user-facing differentiator)
- **Effort**: 1 (hours) – 5 (weeks)
- **Score**: Impact ÷ Effort (higher = do sooner)

---

## Tier 1 — Must-have before any public launch

These are not "features" in the marketing sense. They're the minimum viable product. Without them, the app is a tech demo.

### 1. Export HDL as a full project (ZIP)
- **Score:** 5 / 1 = **5.0**
- **What:** Download a ZIP containing `<module>.v`, `<module>_tb.v`, `README.md`, and a `Makefile` that runs `iverilog && vvp` locally.
- **Why:** Today, students export a single `.v` file and then have to figure out how to simulate it. Handing them a ready-to-run project is the difference between "cool demo" and "actually useful."
- **Effort signals:** Python `zipfile` + Jinja templates for the TB and README. Backend work only. **Small.**
- **Blocked by:** none. Can ship after Phase 0.

### 2. Save / load that actually preserves circuits
- **Score:** 5 / 1 = **5.0**
- **What:** Serialize full circuit state including wires and rebuild it on load.
- **Why:** Currently broken ([audit.md](audit.md) BUG #1). Without this, no other feature matters.
- **Blocked by:** **This is Phase 0 — do it first.**

### 3. Named I/O pins
- **Score:** 5 / 1 = **5.0**
- **What:** Rename a dropped switch or LED to `clk`, `rst_n`, `data_in[0]`, etc. — and have that name appear as the port in the generated Verilog module.
- **Why:** Every generated module today has ports named like `sw_1_3cd`. Unreadable. Unshippable.
- **How:** Inspector panel exposes a `label` input field on selected I/O. Store in Fabric object as `customLabel`. Generator sanitizes → valid identifier.
- **Blocked by:** Inspector panel (P2.6).

### 4. Keyboard shortcuts (with in-app cheat sheet)
- **Score:** 4 / 1 = **4.0**
- **What:** `V / W / Del / Esc / Ctrl+Z / Ctrl+D / Ctrl+S / 1 / 0 / ?`. `?` opens a modal listing all shortcuts.
- **Why:** Engineering tools have shortcuts. A product without them feels like a demo.
- **Blocked by:** P2 complete (no keyboard shortcuts on a still-broken UI).

### 5. Undo / redo
- **Score:** 5 / 2 = **2.5**
- **What:** Command-pattern history of canvas mutations; ≥50 levels; `Ctrl+Z` / `Ctrl+Y`.
- **Why:** The absence of this is the #1 thing that makes the canvas feel fragile. One wrong drag → refresh → lose work.
- **Implementation note:** Build this *into* the Zustand store as a `history` slice. Don't reach for an existing lib until you understand the shape.
- **Blocked by:** Phase 1 (store refactor).

---

## Tier 2 — High-leverage differentiators

These are what separate "another circuit editor" from "I keep coming back."

### 6. Simulation preview
- **Score:** 5 / 4 = **1.25**
- **What:** After wiring a circuit, hit `Simulate`. A panel opens showing a stimulus section (toggles for each input, or a clock if one is named `clk`) and a waveform display of outputs over N cycles.
- **Why:** **This is what makes the product a learning tool**, not just a code generator. The 3-model system you already have (boolean / schematic / HDL) begs for a 4th: *simulation*.
- **How:**
  - Server-side: spawn `iverilog + vvp` in a sandboxed subprocess on the generated HDL + user-supplied stimulus, capture VCD output, parse to signal dicts.
  - Client-side: render a mini-waveform viewer (~250 lines of SVG). Don't pull in heavyweight libs.
  - Safety: hard CPU/time limit (1s), no filesystem access beyond tmpdir, run as a separate process with `resource.setrlimit`.
- **Alternative:** a pure-JS JS simulator (evaluate the gate graph tick by tick). Faster to ship, no backend risk, but limits you to pure combinational + sequential ICs you implement the semantics for. Recommended start here; add iverilog backend later.
- **Blocked by:** Phase 5.3 (validation endpoint — share the schematic-traversal code).

### 7. Boolean expression → auto-placed schematic
- **Score:** 4 / 2 = **2.0**
- **What:** In the Boolean Logic tool, a button "Send to schematic" that takes the expression, factors it into 74xx ICs, and auto-places them on the designer canvas with wires pre-drawn.
- **Why:** Closes the loop between your three models. A user types `Y = A·B + C`, hits a button, and sees *which ICs implement it and how to wire them*. This is the kind of thing students spend a week on in lab.
- **How:**
  - Parse expression → AST (you likely already have this in `boolean_logic.py`).
  - Greedy mapping: AND → 7408, OR → 7432, NOT → 7404, XOR → 7486, NAND → 7400, NOR → 7402.
  - Layout: simple horizontal layering (inputs → gate layer 1 → layer 2 → output).
  - Emit as a circuit JSON and open /designer with it loaded.
- **Blocked by:** Phase 3 (need the designer to properly load arbitrary circuits first).

### 8. Truth table visualizer
- **Score:** 4 / 2 = **2.0**
- **What:** Select a subcircuit (or the whole circuit) → "Show truth table" generates the full I/O × truth-value table, with color-coded cells and the ability to highlight the critical row.
- **Why:** Reinforces learning. Also useful for validating that the generated HDL matches expected behavior.
- **How:** Given N inputs, iterate all 2^N input combinations, evaluate the gate graph, tabulate outputs. Cap at N=8 (256 rows); beyond that, show a sampled table.
- **Blocked by:** A working in-memory circuit evaluator (same evaluator used by Feature 6 JS simulator).

### 9. Command palette (`Ctrl+K`)
- **Score:** 4 / 2 = **2.0**
- **What:** VS-Code-style fuzzy-searchable command bar. Commands: "New circuit", "Add 7400", "Export as ZIP", "Toggle grid", "Rename module", "Simulate", etc.
- **Why:** Power users live in this. Also a strong "this is a tool, not a SaaS page" signal.
- **How:** `cmdk` (the Radix-adjacent lib) if Next.js, or roll your own in ~200 lines.
- **Blocked by:** Phase 2 UI foundation.

### 10. Inline codegen annotations (hover wire → highlight line, vice versa)
- **Score:** 5 / 3 = **1.67**
- **What:** [design.md §4](design.md#4-code-output-ui--detail) describes this. Two-way linking between canvas objects and HDL source lines.
- **Why:** This is the feature that turns HDL from a black-box output into a *teaching artifact*. Students learn Verilog by mapping what they drew to what was emitted. **Unique selling point.**
- **Blocked by:** Phase 4.5 (same task).

---

## Tier 3 — Circuit designer depth

Improvements that make the canvas *feel* like professional EDA software.

### 11. Auto-routing (orthogonal wire paths with obstacle avoidance)
- **Score:** 3 / 4 = **0.75**
- **What:** On wire commit (or on demand via "Rewire all"), recompute wire paths as right-angle routes that don't cross ICs.
- **Why:** The visual difference between hand-drawn diagonal wires and auto-routed Manhattan paths is the difference between a napkin sketch and a schematic.
- **How:** A-star on a 20px grid treating ICs as obstacles. Cache paths; invalidate on component move.
- **Blocked by:** Phase 3.2 (basic Manhattan routing first).

### 12. Snap-to-grid with visible grid
- **Score:** 4 / 1 = **4.0**
- Included in Phase 3.1. Listed here for completeness.

### 13. Pin highlighting on hover with IC datasheet popover
- **Score:** 4 / 1 = **4.0**
- **What:** Hover any pin → tooltip showing `IC 7402 · pin 2 · A1 (input)` with a "View datasheet" link. Hover an IC body → a larger tooltip showing the full pin table.
- **Why:** The pin database already exists in `ICPinDatabase`. Surfacing it makes the designer self-documenting.
- **Blocked by:** Tooltip primitive + Inspector (Phase 2).

### 14. Multi-select and grouping
- **Score:** 3 / 2 = **1.5**
- **What:** Drag-box to select multiple. Shift+click to toggle. `Ctrl+G` groups a selection into a named subcircuit that can be moved/copied as a unit. Grouped components appear in the palette's "My Circuits" section.
- **Blocked by:** Phase 3.6 (multi-select foundation).

### 15. Orientation / rotation (90° increments)
- **Score:** 3 / 2 = **1.5**
- **What:** `R` key rotates selected IC/I/O by 90°. Pins re-arrange accordingly.
- **Why:** Real schematics route better when ICs can be oriented. Also: visual variety prevents the "row of identical rectangles" look.
- **Hard parts:** Rotating a Fabric group while keeping its `pin` satellite objects correctly positioned — requires fixing the "pins-as-siblings-not-children" architecture issue flagged in [audit.md §5](audit.md#5-circuit-designer-canvas-deep-audit).

---

## Tier 4 — Differentiation (vs Logisim, Wokwi, digital-jaco, etc.)

What makes this project *worth building* when alternatives exist?

### 16. HDL-first philosophy
- **Score:** 5 / 0 = (already a differentiator)
- Most schematic editors treat HDL as an export format. Here, HDL is *the* output and the rest supports it. Double down on this in the landing copy, the annotation feature (#10), and the testbench integration (below). Don't try to out-feature Logisim at visual simulation; out-feature it at teaching Verilog.

### 17. Testbench auto-generation
- **Score:** 5 / 2 = **2.5**
- **What:** Alongside the module, generate a stimulus testbench with `initial` blocks toggling each top-level input through every truth-table row. Include `$dumpfile` / `$dumpvars` so the VCD can be viewed in GTKWave.
- **Why:** Going from "I have HDL" → "I have verified HDL with a waveform" is a huge leap students don't know how to make. Handing them a working TB is invaluable.
- **How:** Template-based. Already partial: `backend/testbench_templates/` exists. Wire it up to the Export ZIP flow.
- **Blocked by:** Feature 1.

### 18. "Learning mode" — guided lessons based on the 3-model system
- **Score:** 5 / 5 = **1.0**
- **What:** Structured lesson path: "Build a half-adder." Introduces inputs → wires → a 7486 XOR → an output → generates HDL → shows the truth table → prompts the student to extend to a full adder.
- **Why:** The three-model system (boolean / schematic / HDL) you've implicitly built is *pedagogically strong*. Lessons make it explicit.
- **How:** JSON lesson scripts. Each step defines: prompt text, target canvas state (what the user should build), validation predicate (what makes the step "done"), next step. ~6 starter lessons: half-adder, full-adder, 2:1 mux, 4-bit counter, decoder, SR latch.
- **Blocked by:** Features 6, 8, 17 (simulation + truth table + TB).

### 19. Import Verilog → schematic
- **Score:** 5 / 5 = **1.0**
- **What:** Paste a simple structural Verilog module → app generates the matching schematic.
- **Why:** Reverses the tool. Suddenly the product is also a *Verilog debugger* for students: "I wrote this HDL, why doesn't it work? Let me see what it looks like."
- **How hard:** Non-trivial. Needs a structural Verilog parser (limited subset), symbol resolver, and placement algorithm. Use the existing [`pyverilog`](https://pypi.org/project/pyverilog/) library as a starting point for parsing. Layout via level-graph (same as Feature 7).
- **Blocked by:** Mature schematic-load path.

### 20. Shareable public circuits with URLs
- **Score:** 3 / 2 = **1.5**
- **What:** "Share" button → backend stores the circuit JSON + generated HDL, returns a short URL. Others can open read-only, fork to edit.
- **Why:** Shows off work. Natural growth mechanism (students share with each other).
- **Blocked by:** P5.4 (API versioning, simple user-less nanoids as circuit IDs).

### 21. AI-assisted circuit correction
- **Score:** 4 / 4 = **1.0**
- **What:** When the validator finds issues (floating input, shorted net, missing clock on a D flip-flop), offer an "AI fix" button that uses an LLM with the structured circuit state to suggest connections.
- **Why:** Differentiator. Also legitimately useful when a student is stuck.
- **Caveats:** Cost control (cache suggestions per circuit hash). Must degrade gracefully when API key unset. Don't make it a centerpiece — make it the *last resort* after the structured validator runs.
- **Blocked by:** P5.3 validator + an LLM provider selection.

---

## Explicitly deprioritized (Tier 5)

These are reasonable ideas that are **wrong to build now** — noting them here so they don't resurface unplanned.

| Idea | Why not now |
|---|---|
| Collaborative editing (like Figma multi-cursor) | Requires CRDT infra, auth, presence — XL effort for uncertain value in a learning tool. |
| Plugin system / custom IC definitions | Build after the core 20 ICs are polished. Premature extensibility is a common founder trap. |
| Mobile/tablet support | Canvas-heavy apps don't work on touch. Don't pretend. |
| Dark *and* light theme | Start with dark. Add light only if users ask. Themes double the QA burden. |
| Circuit version history (git-style diffs) | Nice, but save/load must work first. Revisit after Feature 2 is solid. |
| Export to KiCad / Altium | Different domain (PCB vs behavioral). Stay in your lane. |
| Real-time analog simulation (SPICE) | Different product. 74xx ICs are digital — keep it digital. |
| Native desktop app (Electron/Tauri) | The web app isn't mature enough to need one. |

---

## Summary: the six features worth building first

If you only have budget for six, it's these — they unlock 80% of the product value:

1. Fix save/load (Phase 0)
2. Named I/O pins (Phase 2)
3. Undo/redo (Phase 1+2)
4. ZIP export with TB + Makefile (Phase 4)
5. Inline codegen annotations (Phase 4)
6. Simulation preview (JS evaluator first; iverilog backend later)

After these ship, reassess. The world will have changed — users will be using the product, and priorities will shift accordingly.

---

Next: [review.md](review.md) — the living doc that critiques each iteration.
