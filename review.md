# review.md — Iteration Log

> A living document. Update it **every time** a phase or feature ships. The goal is continuous forced critique — otherwise the product drifts back toward "looks AI-generated."

**Rules of this file:**
1. One entry per merged PR or completed phase milestone.
2. Every entry answers the four questions below, honestly.
3. No entry is allowed to say "everything is great." If nothing is wrong, you're not looking hard enough.
4. Findings that recur 2+ times get promoted to [audit.md](audit.md) permanently.
5. Don't delete old entries. They are the record of how the product evolved.

---

## Template — copy this for each iteration

```markdown
## YYYY-MM-DD — <Phase/Feature name>

**Scope:** What was merged (1 line).
**Shipped:** PR links, commits, screenshots if UI.

### 1. What improved?
- Concrete wins. Tie to metrics if possible (Lighthouse, frame time, lines of code, bug count).
- User-visible changes — what can a user now do that they couldn't before?

### 2. What still looks bad?
- Specific visual or interaction flaws. Cite file:line or a screenshot annotation.
- What did NOT get addressed that you'd meant to?

### 3. What still feels AI-generated?
- Any default Tailwind patterns that snuck back in?
- Any "one of those 12 colors from a palette" decisions?
- Any copy that sounds like a SaaS landing page?

### 4. What needs redesign / refactor again?
- Tech debt introduced in this iteration.
- Things that worked for the MVP but won't scale past 3× current state.
- Cross-reference back to [plan.md](plan.md) if it affects later phases.

### Action items (next iteration)
- [ ] Specific, small, trackable tasks surfacing from this review.
```

---

## Example (delete when real entries exist)

## 2026-04-19 — Phase 0 — Stop the bleeding (SAMPLE ENTRY)

**Scope:** P0.1–P0.7. Canvas no longer loses wires on save/reload. Tool switching no longer leaks wire state. Delete key now works. Replaced all `prompt()`/`alert()` with a Radix modal and a sonner toast.

**Shipped:** PR #TBD, commit sha TBD. Screenshots: `docs/iterations/2026-04-19-phase0/{before,after}.png`.

### 1. What improved?
- Save → reload → drag: wires follow. (Previously: wires stayed pinned to the old location.)
- 11 `alert()` calls reduced to 0; 4 `prompt()` calls replaced with a proper `<Modal>`.
- Delete key works — selected component + its incident wires are removed cleanly.
- Tool switching mid-draw no longer leaves phantom wires.
- Inline JS dropped 80 LOC (removed the ad-hoc error-alert blocks).

### 2. What still looks bad?
- The modal opens in 180ms with no focus trap — tabbing outside it is possible. Should use Radix's `<Dialog.Root modal>` behavior properly.
- Sidebar is still a flat list of 20 ICs. Categorization and search remain unresolved (Phase 2).
- Canvas is still `#f3f4f6` gray. Dark theme not touched yet.

### 3. What still feels AI-generated?
- The toast uses sonner's default style — white background, soft shadow, rounded corners. Matches every other SaaS app. **Needs themed variant** using our `--surface-3` tokens (these don't exist yet — Phase 2).
- The new save-confirmation copy reads "Circuit saved successfully!" — generic. Should be "Saved as `<name>` • just now" with mono font on the name.
- Icons in the new modal are from Heroicons — same icons everyone else uses. Switch to Phosphor or Lucide with a distinctive stroke weight.

### 4. What needs redesign / refactor again?
- The closure-scoped state in `initializeDesigner()` is still there. I worked around it with a local `activeWireDraw` helper object but the larger refactor (Phase 1) is still outstanding. Every bug I hit in this PR was because state is not centralized.
- The `canvas.toJSON()` custom-property list is now consistent across save + export, but it's duplicated in two places. Extract to a `const CANVAS_EXPORT_PROPS = [...]` constant.
- The new `parentId` uses `crypto.randomUUID()` which isn't available in older Safari — add a polyfill or `uuid` lib.

### Action items (next iteration)
- [ ] Focus-trap the modal (Radix `<Dialog.Root modal>` + test with Tab).
- [ ] Extract `CANVAS_EXPORT_PROPS` into a shared constant.
- [ ] Replace sonner default theme with token-driven version (defer to Phase 2).
- [ ] Add `uuid` dependency OR polyfill `crypto.randomUUID` for Safari <15.

---

## Anti-patterns to watch for in every review

Run this checklist on every merge. If any box checks, call it out in §3 "What still feels AI-generated."

- [ ] Any new `bg-white border border-gray-200 rounded-lg ...` card component?
- [ ] Any new color that isn't a design token from `tokens.css`?
- [ ] Any new emoji in product chrome (💾, 📂, 🚀, 🎨, etc.)?
- [ ] Any `alert()` / `prompt()` / `confirm()` reintroduced?
- [ ] Any hardcoded hex inside a Fabric.js component config?
- [ ] Any heading with "successfully" / "awesome" / "amazing" copy?
- [ ] Any new dependency duplicating something we already ship (e.g., second icon library)?
- [ ] Any new UI that works at 1440px but breaks at 1024px?
- [ ] Any new keyboard-inaccessible interaction?
- [ ] Any new `console.log` left in a shipped file?

---

## Recurring-issue graveyard

When a problem appears in 2+ iterations, list it here and fix it at the *source*, not again per-iteration. This list should grow and shrink; if it's growing without shrinking, you're accumulating debt.

_(Empty — populate as patterns emerge.)_

---

## Definition-of-done checklists per phase

Use these as literal exit gates before starting the next phase.

### Phase 0 done when…
- [ ] Save → refresh → load → drag: wires track the dragged component
- [ ] Switch Wire→Select mid-draw: no phantom wire on canvas, `isDrawingWire === false`
- [ ] Delete an IC with incident wires: wires are removed, no console errors
- [ ] `Esc` during wire draw cancels cleanly
- [ ] `alert()` / `prompt()` count across the repo: 0
- [ ] Only one copy of Fabric.js ships (either CDN or local, not both)

### Phase 1 done when…
- [ ] No `window.*` function assignments in `designer.html` (or the file is deleted, migrated to Next.js)
- [ ] State is a single object (Zustand store or equivalent), not five closure vars
- [ ] Canvas interactions are testable — at least one unit test for wire-draw state transitions exists
- [ ] Lighthouse performance ≥ 85 on `/designer`

### Phase 2 done when…
- [ ] Zero hardcoded hex colors in JS/TSX
- [ ] All icons from a single icon library
- [ ] Dark mode works on all 4 pages (landing, designer, boolean, ics-view)
- [ ] A right-side Inspector panel is live and shows correct content for IC / wire / I/O / none
- [ ] Keyboard shortcut help modal exists and is reachable via `?`

### Phase 3 done when…
- [ ] Can build a 4-bit full adder start-to-finish without refresh or devtools
- [ ] Undo works across 50+ steps
- [ ] Snap-to-grid toggles via `View` menu and persists via localStorage
- [ ] Wire direction validation blocks output→output connections with a visible warning

### Phase 4 done when…
- [ ] Export opens an in-app panel, not a download+alert
- [ ] Hovering a wire in the code panel highlights the canvas wire (and vice versa)
- [ ] ZIP download contains `.v`, `_tb.v`, `README.md`, and a runnable `Makefile`
- [ ] For every supported IC family, there is a golden test comparing generated HDL to an expected file

### Phase 5 done when…
- [ ] `pytest` runs in CI on every PR
- [ ] One source of truth for IC pin data (ICPinDatabase OR the SQLite `ics` table, not both)
- [ ] Structured error responses (`{ code, message, source_id }`) are emitted by `/generator/*`
- [ ] Health endpoint + cold-start ping running on Render

---

## How to use this file going forward

1. **Every PR that merges a phase or feature task** — add a new dated entry at the top of the iterations section (below the template). Fill all four questions.
2. **After filling an entry** — re-run the Anti-patterns checklist. Every unchecked box is a follow-up.
3. **Quarterly** — review the Recurring-issue graveyard. If nothing has been fixed at the source, the team is treating symptoms instead of causes.
4. **Never** — use this file to brag. §1 is for facts (what changed), not celebration.

---

## Iterations (add new entries below, newest first)

*(Empty — add your first entry here when Phase 0 ships.)*
