# Codebase Improvement Plan — Review, Refactor & Cleanup

**Date:** 2026-07-09 (status re-verified against the code 2026-07-26)
**Status:** Ready for execution

> **Status markers below were audited on 2026-07-26.** Every `✅ Done (uncommitted, working tree)` note in §1.5, §4.1–4.4, and §6 referred to the Phase 4.5 pile that is now committed (`3e8876f`) and pushed — treat those as simply **Done**. Items verified still open are listed in "Suggested Execution Order" at the bottom.
**Audience:** This document is written for an AI agent (or developer) to execute. Each item lists concrete file paths, what to do, and acceptance criteria. Items are independent unless noted.

---

## Ground Rules for the Executing Agent

1. **Respect the layered architecture** described in `AGENTS.md` (Actions → Services → Core → Repositories → DB). Never move logic "up" a layer.
2. **Run the test suite before and after every task**: `npm run test:run`. Original baseline: 25 files / 179 tests. **Current baseline (2026-07-26): 33 files / 203 tests, all passing** (~33s).
3. **Run lint after edits**: `npm run lint`. Original baseline: 194 errors. **Current baseline (2026-07-26): 328 problems — 192 errors + 136 warnings.** Errors are flat and still mostly `@typescript-eslint/no-explicit-any` (see §2.1), but a large `react-hooks/set-state-in-effect` warning class has appeared since (concentrated in `GameController.tsx` and the hooks it delegates to). The `prefer-const` ×4 and the `require()` in `ck-game-service.ts` are fixed. Note §2.1 and the hook-warning class largely share the same files.
4. **Do not mix tasks in one commit.** One task = one atomic commit, listing only the files touched (see Git Rules in `AGENTS.md`).
5. ~~Uncommitted in-progress trade work~~ **Resolved 2026-07-09:** the trade UX work was evaluated (functional — full suite green, `tsc --noEmit` clean, reject/accept/cancel flows wired end-to-end) and committed as `7cbbe13`. All ⚠️TRADE-flagged tasks below are now **unblocked**. Its remaining polish items are tracked as §5.9–§5.11.
6. The graphics overhaul (tile/card/piece art) is a **separate initiative** with its own design doc — do not redesign visuals here. Section 4 below only removes technical debt that would block that overhaul.

---

## 1. Dead Code & Duplication (Priority: HIGH, Low risk)

### 1.1 Delete unused `BarbarianHexOverlay` — ✅ Done 2026-07-09 (deleted with `BarbarianTrack` when the on-board barbarian route landed; see graphics plan Phase 1)
- **File:** `components/board/BarbarianHexOverlay.tsx` (201 lines)
- **Evidence:** Zero imports anywhere in `components/`, `app/`, `lib/`. Only referenced in docs. The live barbarian UI is `components/game/overlays/BarbarianTrack.tsx`.
- **Action:** Delete the file. `docs/ui/BARBARIAN_HEX_TILES_DESIGN.md` references it as a starting point for an on-board version — that doc stays; the component is trivially recreatable and its tooltip copy can be lifted from git history.
- **Accept:** Build passes, no import errors.

### 1.2 Unify the two board-type modules — ✅ Done 2026-07-10 (Codex-executed, lead-verified: root `types/board.ts` merged into `lib/types/board.ts`, all importers updated incl. `board-palette.ts`, root file deleted)
- **Files:** root `types/board.ts` vs `lib/types/board.ts`
- **Evidence:** `core/engine/board/port-generator.ts`, `themes/flat/Port.tsx`, `themes/voxel/Port.tsx` import `Port`/`PortType` from `@/types/board`; everything else uses `@/lib/types` (which barrels `lib/types/board.ts`). Two sources of truth for board shapes.
- **Action:** Move whatever is unique in root `types/board.ts` into `lib/types/board.ts`, update the three importers to `@/lib/types`, delete the root `types/` directory (verify nothing else imports from it first: `grep -rn "@/types/"`).
- **Accept:** `tsc --noEmit` clean, tests pass.

### 1.3 Remove unused imports in `GameController.tsx` — **open, unblocked**
- **File:** `components/game/GameController.tsx` (711 lines)
- **Evidence:** It imports `PlayerHand`, `GameLog`, `PlayerDevCards`, `CompactGameStatus`, `SidebarTabs`, `BuildControls`, `ActionControls`, `DiceDisplay`, `ProgressCardHand`, `DebugPanel`, `BarbarianTrack` — all of which are now rendered by `GameLayoutPanels.tsx`. Many of these are likely dead imports left from the layout extraction. ESLint / `tsc` with `noUnusedLocals` will confirm the exact set.
- **Action:** Remove imports not referenced in the JSX/logic of this file. (The ⚠️TRADE block is gone — trade work landed in `7cbbe13`.)
- **Verified 2026-07-26 (still open, 710 lines):** all ten flagged imports are still present — `PlayerHand`, `GameLog`, `PlayerDevCards`, `CompactGameStatus`, `SidebarTabs`, `BuildControls`, `ActionControls`, `DiceDisplay`, `ProgressCardHand`, `DebugPanel`. ESLint additionally reports three dead locals to remove in the same pass: `treasonEffectLevel` (:238), `selectedMerchantHex` (:346), `activeProgressCard` (:385).
- **Accept:** Lint clean; file renders the game identically.

### 1.4 `.beads` hygiene — ✅ Obsolete 2026-07-26
- **Resolution:** Beads was retired as the tracking system on 2026-07-09 (see `CLAUDE.md`: work items live in the `docs/` plan documents; do not run `bd`). No decision is needed. A stale `.beads/` directory is still on disk and can be deleted whenever convenient — it has no consumers.
- **Original evidence:** Git status shows `.beads/beads.base.jsonl`, `.beads/beads.left.jsonl` (+ meta) deleted but not committed, while `.beads/issues.jsonl` still exists. The bd auto-sync state is inconsistent.
- **Action:** Ask the user whether beads is still the tracking system of record (AGENTS.md says yes). Either commit the deletions or restore the files — do not silently resolve.

### 1.5 Duplicated `@keyframes` injected per hex tile
- **Files:** `themes/flat/HexTile.tsx` (lines 81–100), `themes/voxel/HexTile.tsx` (lines 97–116)
- **Evidence:** Each rendered hex injects a `<style>` block inside its SVG `<g>`. With 19 board tiles, the same `@keyframes flash` / `pulse-valid` rules are duplicated 19× in the DOM, and flat/voxel each define near-identical copies.
- **Action:** Move these keyframes/classes into `app/globals.css` (they are plain CSS, not per-instance), delete both `<style>` blocks.
- **Accept:** Rolled-tile flash and valid-placement pulse animations still work in both themes.
- ✅ **Done (uncommitted, working tree):** `flash`/`pulse-valid` keyframes + `.animate-flash`/`.animate-pulse-valid` moved into `app/globals.css` (`@layer utilities`); `<style>` block removed from `themes/flat/HexTile.tsx`. Voxel's copy no longer applies — `themes/voxel/` was deleted as part of the same pass (see §4.4). Verified: `npm run test:run` green (188/188 at the time), CSS brace-balance checked.

---

## 2. Type Safety (Priority: HIGH, Medium risk)

### 2.1 Eliminate `any` from component/controller seams
- **Evidence (recounted 2026-07-26: now **126** occurrences, up from ~100 — this is regressing, not holding):** Worst offenders, all unchanged since the original count:
  - `lib/controllers/progress-card-controller.ts` — 18
  - `lib/hooks/useGameControllerEffects.ts` — 10 (⚠️TRADE block cleared)
  - `components/game/ui/GameLayoutPanels.tsx` — 6 (`currentPlayer: any`, `selectionManager: any`, handler bundles typed loosely)
  - `components/board/BoardCanvas.tsx` — 3 (`vertices: any[]`, `renderEdges: any[]`, `pendingPlacement: any | null`)
- **Action:** Introduce/reuse proper types: `PlayerState` for `currentPlayer`; a `SelectionManager` return type exported from `lib/hooks/useSelectionManager.ts` (use `ReturnType<typeof useSelectionManager>` as a stopgap); `Vertex[]` / render-edge type for BoardCanvas; a `PendingPlacement` union (`{ type: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall'; id: string }`). Work file-by-file; do not do a big-bang sweep.
- **Accept:** `tsc --noEmit` clean; occurrence count reduced to < 30 with remaining ones justified by a comment.

### 2.2 Phase 5: `ResourceType` vs `TileType` split — ✅ Done (verified 2026-07-26)
- **Verification:** `core/rules/board-constants.ts:7` now declares `ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'` (no `desert`); `core/engine/board/board-generator.ts:36` declares `TileType = ResourceType | 'desert'`; `TerrainType` remains the separate six-value terrain union. A repo-wide scan for `desert: 0` in resource records returns **zero** hits. This landed incrementally rather than as the single isolated refactor the plan anticipated, so it was never marked done — recording it now. Remaining nicety (not blocking): the `satisfies Record<TerrainType, …>` exhaustiveness checks the acceptance criteria asked for were not added.
- **Evidence:** Documented known issue in `AGENTS.md` ("Known Issues"): `ResourceType` includes `desert`, so player resource records carry an unused `desert: 0`. ~20 files / 115 occurrences.
- **Action:** Execute the documented plan: `ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'`; `TileType = ResourceType | 'desert'` (note `core/rules/board-constants.ts` already has `TerrainType` — reconcile the three names into two: resource vs terrain). This is the largest mechanical refactor in this plan; do it last, alone, with tests green before and after.
- **Accept:** No `desert` key in any resource `Record`; all tests pass; type-level exhaustiveness checks (`satisfies Record<TerrainType, …>`) added where terrain maps exist.

---

## 3. Oversized Modules & Prop Drilling (Priority: MEDIUM)

### 3.1 Split `ProgressCardModal.tsx` (820 lines)
- **File:** `components/game/progress/ProgressCardModal.tsx`
- **Action:** One file per card-interaction body (or group by interaction shape: selector-modal, confirmation-modal, placement-prompt) under `components/game/progress/modals/`, with `ProgressCardModal` reduced to a dispatcher. Mirror the clean pattern already used by `core/engine/progress/commands/*` (one command per card).
- **Accept:** No behavior change; each new file < 200 lines.

### 3.2 Slim `lib/controllers/progress-card-controller.ts` (754 lines)
- **Action:** Extract per-card client orchestration into a declarative map (card type → `{ start, onBoardSelect, onConfirm }`) rather than long switch/if chains; reuse the `CARDS_REQUIRING_PARAMETERS` / `BOARD_SELECTION_CARDS` groupings currently duplicated in `ProgressCardHand.tsx` (they belong in `core/engine/progress/config/card-definitions.ts` as flags, defined once).
- **Accept:** Card behavior unchanged (manual smoke test of merchant, inventor, smith, engineer, medicine, treason flows); the card-group constants exist in exactly one module.

### 3.3 `GameController.tsx` (710 lines as of 2026-07-26) — **open, unblocked**
- **Action:** (⚠️TRADE block cleared — trade work landed in `7cbbe13`.) Continue the extraction pattern already started (`useGameControllerEffects.ts`) — move the remaining modal-visibility state clusters (VP modal, theft notification, trade completion, robber prompts) into dedicated hooks so the component is mostly composition.
- **Accept:** < 400 lines; render tree unchanged.

### 3.4 `GameLayoutPanels` prop explosion
- **File:** `components/game/ui/GameLayoutPanels.tsx` — 24 props, three "handler bundle" objects.
- **Action:** Either (a) pass children/slots from `GameController` instead of data (composition), or (b) introduce a `GameUIContext` providing `gameState`, `playerId`, `selectionManager`, controller handlers. Option (a) is less magic and preferred.
- **Accept:** Props ≤ 8; no `any` in its Props interface (pairs with 2.1).

### 3.5 `app/actions.ts` — enforce the thin-wrapper rule
- **Evidence:** 612 lines / 60 exported actions. Most are compliant 2–3 line wrappers, but `createRoom`, `joinRoom`, `resumeGame`, `getRoomPlayers` contain real logic (room-code generation, player lookup/creation, validation) in the Actions layer, violating the architecture rule in `AGENTS.md`.
- **Action:** Move that logic into `lib/services/lobby-service.ts` (already exists) / a small `room-service`; actions keep only `formData` unpacking + `redirect()` (redirect must stay in the action).
- **Accept:** Every exported action ≤ ~5 lines; tests pass.

---

## 4. Rendering-Layer Tech Debt (Priority: MEDIUM — prerequisite for the graphics overhaul)

> These make the upcoming art overhaul cheap instead of painful. They change *how* graphics are delivered, not how they look.
>
> **Update 2026-07-09:** The overhaul decisions are locked — see `docs/graphics-overhaul-plan.md`. This section is that plan's **Phase 0**; execute it via the work orders there (which fold in voxel retirement and adjust §4.4 below).

### 4.1 Replace `foreignObject` + `<img>` icons inside the board SVG
- **Files:** `themes/flat/HexTile.tsx` (resource + desert icons), `themes/flat/Port.tsx` (port icons)
- **Evidence:** Icons are embedded via `<foreignObject>` wrapping an HTML `<div>`/`<img>`/CSS-mask (`ColoredSvgIcon`). Problems: extra layout passes per tile, clip-path workarounds, hydration-sensitive coordinates (see the `round()` hack in `Port.tsx`), and it blocks board export/screenshots.
- **Action:** Build an SVG sprite: one `<defs>` block (rendered once in `BoardCanvas`) containing `<symbol id="icon-wood">…` for each board icon, referenced with `<use href="#icon-wood" fill=…>`. Inline the needed `public/icons/*.svg` paths into a generated `components/board/board-icon-defs.tsx` (a small script in `scripts/` can regenerate it from `public/icons/`).
- **Accept:** No `foreignObject` remains under `#board-svg`; visual parity confirmed side-by-side.
- ✅ **Done (uncommitted, working tree):** `components/board/board-icon-defs.tsx` created with `<symbol>`/`<use>` defs for wood/brick/sheep/wheat/ore/desert (hand-verified against the source `-colored.svg` paths, not regenerated by a script — no `scripts/` regenerator was added). Mounted once each in `BoardCanvas.tsx` (`#board-svg`) and the lobby `BoardPreview.tsx` (separate top-level SVG). `HexTile.tsx`/`Port.tsx` foreignObject blocks replaced with `<use>`. **Not touched (discovered, out of scope):** `themes/flat/Merchant.tsx` still uses `foreignObject` for the merchant icon — same fix would apply, not in the step-4 file list.

### 4.2 Centralize the color system — kill hardcoded duplicates
- **Evidence:** `app/globals.css` defines the canonical tokens (`--color-hex-forest`, `--color-resource-*`, etc.), but:
  - `themes/flat/HexTile.tsx` hardcodes `TERRAIN_COLORS` hex values that duplicate `--color-hex-*`
  - `themes/voxel/HexTile.tsx` hardcodes a *different* palette
  - `themes/flat/Port.tsx` hardcodes `PORT_COLORS` (third copy)
  - `components/game/ui/DiceDisplay.tsx` hardcodes die colors `#dc2626` / `#fbbf24`
  - `themes/flat/NumberToken.tsx` hardcodes `#F5F5DC`, `#D00`
- **Action:** Export a single typed palette module `lib/constants/board-palette.ts` that reads the CSS variables (`var(--color-hex-forest)` strings are fine for SVG fills) and replace all hardcoded literals. Voxel may keep intentionally brighter values, but they should live in the same module, clearly named.
- **Accept:** `grep -rn "#[0-9a-fA-F]\{6\}" themes/ components/board/` returns only the palette module (or nothing).
- ✅ **Done (uncommitted, working tree)** for the 4 files named in the graphics-overhaul work order (`themes/flat/HexTile.tsx`, `themes/flat/Port.tsx`, `themes/flat/NumberToken.tsx`, `components/game/ui/DiceDisplay.tsx`): all now import from `lib/constants/board-palette.ts` (literal hex values, not CSS-var strings, to preserve pixel-exact current rendering — see the module's `forest` drift note). Voxel is deleted, not migrated (§4.4). **Residual grep hits (expected, not fixed — out of scope for this pass):** `themes/flat/Knight.tsx` and `components/board/EdgeRenderer.tsx` still hardcode a few hex literals; `themes/tabletop/*` (in-flight, different agent) has its own palette; `components/board/board-icon-defs.tsx` intentionally keeps fixed-art fills baked in from source icon SVGs (not board-palette candidates). Note: `--color-hex-forest` in `app/globals.css` (`#006636`) has drifted from the board's actual forest fill (`#06740E`, now centralized in the palette module) — pre-existing, not touched here, flagged for a deliberate design decision.

### 4.3 Extract inline building/knight SVG path data from `VertexRenderer`
- **File:** `components/board/VertexRenderer.tsx` (324 lines, of which ~150 are raw path data; three near-identical knight `<svg>` blocks differ only in the path).
- **Action:** Move settlement/city/metropolis/knight path data into the sprite from 4.1 (`<symbol>` per piece), parameterize fill via `<use fill>`; collapse the three knight branches into one that selects `href={#knight-${level}}`.
- **Accept:** File < 200 lines; per-level knight rendering identical.
- ✅ **Done (uncommitted, working tree):** `VertexRenderer.tsx` is now 183 lines. Settlement/city/metropolis moved to `<symbol id="piece-settlement|piece-city|piece-metropolis">` in `board-icon-defs.tsx`; their 2-stop opacity gradient (100%→70%) is preserved via 4 stable per-canonical-player-color gradients (`piece-fill-p1..p4` + a gray fallback) instead of the old per-vertex gradient ids, selected by the caller and passed as `fill="url(#piece-fill-p1)"` on the `<use>` (SVG `fill` inheritance). Knight collapsed to one `<use href={\`#knight-${knight.level}\`}>` selecting `knight-basic|knight-strong|knight-mighty`; `fill`/`fill-opacity` left unset on the symbols' background path so the active/inactive dimming still applies to background + glyph together. Hitbox elements untouched (verified via diff). All 6 new symbols verified byte-faithful against the pre-refactor inline path data.

### 4.4 Formalize the theme interface
- **Files:** `themes/flat/*`, `themes/voxel/*`, `components/board/BoardCanvas.tsx`
- **Evidence:** Flat and voxel components share prop shapes by convention only; `BoardCanvas` picks components with ternaries; `VertexRenderer`/`EdgeRenderer` take `theme: 'flat' | 'voxel'` and branch internally — so piece rendering is half in the theme folders, half in board components.
- **Action (revised per locked decision):** The voxel theme is **retired** — delete `themes/voxel/`, remove all `theme === 'voxel'` branches, the `BoardControls` 3D toggle, and the `theme` prop chain (full work order: `docs/graphics-overhaul-plan.md` Phase 0.1). Then define a light single-theme object `boardTheme = { HexTile, Port, NumberToken, Robber, Merchant, pieces… }` in `themes/` so piece rendering leaves `VertexRenderer`/`EdgeRenderer` and the upcoming `tabletop` theme is a drop-in swap.
- **Accept:** `grep -rn "voxel"` in source → 0 hits; no theme string comparisons anywhere; flat theme renders pixel-identical to today.
- ✅ **Voxel retirement done (uncommitted, working tree)**, per Phase 0.1's exact work order — see that doc's checklist for detail. **Not done:** the `boardTheme` object formalization (piece rendering still lives directly in `VertexRenderer`/`EdgeRenderer` via sprite `<use>`, not routed through a theme object) — wasn't in the delegated step list for this pass. `grep -rn "voxel" components lib themes app core --include="*.ts*"` → 0 hits except a pre-existing orphaned `components/board/VertexRenderer.tsx.backup` (tracked, last touched in an old unrelated commit, not part of the TS build) — flagged for lead review/deletion rather than removed unilaterally.

### 4.5 Emoji as game iconography — ✅ Done in graphics Phase 4.5 (`3e8876f`)
- **Resolution:** superseded by the far broader Phase 4.5 legacy visual retirement, which replaced every emoji/Unicode glyph across `components/game` and `components/board` with `themes/tabletop` SVG glyphs (not `GameIcon`/lucide as originally proposed — `GameIcon` was itself deleted in the same pass). Static emoji scans return 0 hits.
- **Evidence:** `BarbarianTrack.tsx` (⚔️ 🛡️ ✓ ✗), `ProgressCardHand.tsx` (`CATEGORY_ICONS` 🟢🟡🔵), confirm/cancel buttons in `VertexRenderer`/`EdgeRenderer` (✓ ✕ as `<text>`). Emoji render differently per OS and clash with the SVG icon system (`docs/ui/ICON_SYSTEM.md`).
- **Action:** Replace with `GameIcon`/lucide icons or sprite symbols. Keep this cosmetic pass separate from the art overhaul.
- **Accept:** No emoji literals in `components/` (chat content excluded).

---

## 5. Consistency & Small Fixes (Priority: LOW)

> ✅ **5.1, 5.6, 5.12 done 2026-07-10** (Codex-executed, lead-verified + two follow-on type errors fixed by lead; `tsc --noEmit` now fully clean project-wide). Lint: `prefer-const` ×4 and the `require()` in `ck-game-service.ts` also fixed.

| # | Item | Files | Action |
|---|------|-------|--------|
| 5.1 | `isEngineerCancel`/`isMedicineCancel` are hardcoded `false` | `components/board/BoardCanvas.tsx` (lines ~229–230) | Dead logic — delete the constants and simplify `showCancelIcon` wiring |
| 5.2 | `activeFollowupCard` hardcoded to null | **Moved 2026-07-26:** now `components/game/ui/GameTray.tsx:146` (`activeFollowupCard={null}`), not `GameLayoutPanels` | Still open. Either wire the real value or remove the prop. Note this is closer to a functional gap than cleanup — the follow-up-card highlight can never light up while it's pinned to null |
| 5.3 | `MEDICINE_COST` defined in **three** places | `GameController.tsx:118`, `ProgressCardHand.tsx:46`, and `core/engine/progress/commands/MedicineCommand.ts:13` | Move to `core/rules/commodity-constants.ts` (costs are rules) and have all three read it — the engine copy is the one that actually enforces the cost, so the two UI copies are the drift risk |
| 5.4 | Port clip-path IDs built from float coordinates | `themes/flat/Port.tsx` | Use port index for the id instead of coordinates |
| 5.5 | Pointer-cursor audit (house rule: everything clickable shows pointer) | all interactive components | Sweep for `onClick` without `cursor-pointer`; known gaps: log entries, some modal option rows |
| 5.6 | `console.log` noise in tests (port mapping test prints table) | `core/engine/board/__tests__/verify-all-ports.test.ts` | Remove/gate behind env flag |
| 5.7 | `components/game/overlays/` contains non-overlays | `GameBoardSection.tsx` | Move to `components/game/` root or `components/game/board/` |
| 5.8 | Barrel exports missing for services | `lib/services/index.ts` exists — verify all services exported; some files import service modules directly | Standardize on barrel or direct, one convention |
| 5.9 | Trade follow-up: offer errors are silent | `components/game/trade/TradeModal.tsx` (~line 168) | ✅ **Done 2026-07-26:** both `handleOfferTrade` and `handleBankTrade` set an inline `role="alert"` message instead of only `console.error`, and a failed offer no longer closes the modal, so the composed offer survives for correction. Caveat: these are server actions, so Next redacts the thrown message in production builds — the inline text is exact in dev and generic in prod. Returning typed results from `app/actions.ts` instead of throwing would fix that repo-wide; tracked as §5.14. |
| 5.10 | Trade follow-up: all-players-rejected offer stays open | `lib/services/trading-service.ts` `rejectTrade` | ✅ **Done 2026-07-26:** `rejectTrade` clears `tradeOffer` and pushes a public "All players rejected X's trade offer." log once every non-initiator has rejected. The pre-existing test asserting the offer stays open encoded the old behavior and was replaced by two tests (still-open with a remaining responder, auto-cancel when all have rejected). |
| 5.11 | Trade follow-up: new modals off-style | `TradeProgressModal.tsx`, `TradeCompletedNotification.tsx` | ✅ **Done in Phase 4.5, committed 2026-07-26 as `3e8876f`:** both use the warm shared modal shell, tabletop trade/resource/commodity/status glyphs, and `--ui-*` tokens; legacy emoji and slate chrome removed. |
| 5.12 | Pre-existing type errors in test files (masked by incremental cache + vitest's non-typechecking transform) | `core/engine/progress/__tests__/merchant-command.test.ts:9` (Expected 1-2 args, got 3), `core/engine/progress/commands/__tests__/SimpleCommands.test.ts:23` (missing `GameState` import) | Fix both; then add `tsc --noEmit` as a script/CI step so type errors in test files can't hide again (delete stale `tsconfig.tsbuildinfo` when verifying) |
| 5.13 | Dead board renderers (found during Phase 0) | `components/board/KnightRenderer.tsx`, `themes/flat/Knight.tsx` | ✅ **Done (verified 2026-07-26: both files are gone).** Original note: zero importers apart from each other; delete both. (`VertexRenderer.tsx.backup` already removed 2026-07-09.) `themes/flat/Merchant.tsx`'s remaining `foreignObject` and `EdgeRenderer.tsx`/`Knight.tsx` hex literals die naturally with Phase 1/2 of the overhaul — no separate action |
| 5.14 | Server action failures are unreadable in production | `app/actions.ts` (all exports), consumers in `lib/controllers/*` | Actions rethrow service `Error`s, and Next redacts thrown messages in production builds — so every inline error UI (§5.9, `DebugPanel`, `ExtensionRequestButton`) shows the generic redaction blurb to real users while reading correctly in dev. Return a typed `{ ok: true, state } \| { ok: false, message }` from the action layer so validation messages survive the server/client boundary; migrate consumers and drop the try/catch-on-message pattern |
| 5.15 | Runtime `require('@/...')` makes progress commands untestable | `MedicineCommand`, `WeddingCommand`, `CraneCommand`, `DiplomatCommand`, `EspionageCommand`, `GuildDuesCommand`, `IntrigueCommand`, `SaboteurCommand`, `progress-card-manager.ts` | Next's bundler resolves the `@/` alias inside `require()`, so the game works — but Node's require (what vitest supplies) cannot, and could not load a `.ts` file even if it did. Every one of these commands is therefore untestable past its validation guards. `TaxationCommand` was converted 2026-07-26 (`f68ca93`) and its theft tests now pass. Convert the rest **one at a time, running the suite after each**: several look like deliberate cycle-breakers (`MedicineCommand` → victory-conditions, `progress-card-manager` → progress-card-definitions), so a blind sweep risks introducing a circular import |
| 5.16 | Robber auto-steal result only reliably notified the stealing player | `lib/services/robber-service.ts`, `lib/hooks/useBoardActions.ts`, `lib/hooks/useRobberInteractions.ts`, `lib/hooks/useGameControllerEffects.ts`, `components/game/GameController.tsx`, `components/game/overlays/RobberModals.tsx` | ✅ **Done (committed 2026-07-26 as `bca0b3c`):** robber thefts are explicitly tagged, the initiating client immediately consumes the returned authoritative state, and each participating client captures its own theft-event snapshot for the modal. Both the thief (“You stole…”) and victim (“…stole…from you”) paths have focused component coverage; the victim event trigger has hook coverage. |
| 5.17 | Turn countdown inherits player device-clock skew | `lib/services/timer-clock.ts`, `lib/hooks/useGameSubscription.ts`, `lib/hooks/useTimerState.ts`, `lib/repositories/game-repository.ts`, `app/api/game/[roomId]/route.ts` | ✅ **Done (committed 2026-07-26 as `bca0b3c`):** authoritative updates carry a server-clock sample, clients capture a stable local offset when each sample arrives, and timer displays calculate against the aligned clock. A focused hook regression test covers the reported 20-second-ahead device clock (2:00 previously rendered as 1:40). Server-side timeout enforcement continues using the server clock. |
| 5.18 | Robber placement committed on the first hex click without confirmation | `components/board/Board.tsx`, `components/board/BoardCanvas.tsx`, `themes/tabletop/HexTile.tsx`, `lib/hooks/useBoardActions.ts`, `lib/hooks/useBoardValidation.ts` | ✅ **Done (committed 2026-07-26 as `bca0b3c`):** robber movement now uses the same pending-placement interaction as pieces: selecting a legal hex previews the robber with a green check and red X, confirmation alone advances to victim selection/server movement, and cancellation restores legal hex selection without leaving the mandatory robber phase. Focused hook and board-render coverage protect the commit boundary and controls. |
| 5.19 | C&K robber discard ignored commodity cards after eligibility check | `components/game/modals/DiscardModal.tsx`, `app/actions.ts`, `lib/services/robber-service.ts`, `core/engine/progress/commands/AlchemistCommand.ts` | ✅ **Done (committed 2026-07-26 as `bca0b3c`):** every seven path, the discard dialog, and the service now count resources plus commodities for robber obligations; the dialog renders commodity choices, submits and validates both card classes, and deducts the selected mix. Saboteur remains resource-only. Focused component, service, and Alchemy coverage reproduce Kaius’s 9-card room `AVXU` symptom. |

---

## 6. Testing Gaps (Priority: MEDIUM, ongoing)

- **Well covered:** `core/engine/*` (board, ports, progress commands, barbarian, metropolis, resources), some services (`trading-service` covers bank/offer/accept/reject, including reject auto-cancel).
- **Not covered at all:** every React component, all hooks (`useSelectionManager`, `useBoardValidation` — 422 lines of placement logic with no tests), controllers (`progress-card-controller` — 754 lines).
- **Actions:**
  1. Add unit tests for `useBoardValidation` and `useSelectionManager` first (pure-ish logic, highest regression risk during the graphics overhaul).
  2. Add render smoke tests for `BoardCanvas` with a fixture `GameState` (flat + voxel) — this is the safety net the graphics overhaul needs (assert tile count, token numbers, piece placement).
  3. Snapshot-test `GameLayoutPanels` in base and C&K modes.
- **Accept:** New tests in `lib/hooks/__tests__/` and `components/board/__tests__/`; suite stays < 90s.
- ✅ **Item 2 (board smoke tests) done (uncommitted, working tree):** `components/board/__tests__/BoardCanvas.smoke.test.tsx` (flat/single-theme only, per the locked voxel-retirement decision — no voxel variant written). Covers tile count, number-token values, port count, settlement/city/road rendering with owner color, knight rendering + tooltip, valid-placement highlights attaching to the correct (and only the correct) vertex/edge, and sprite `<defs>`/`<use>` resolution. 10 tests, suite total 189/189, ~13s. Items 1 (`useBoardValidation`/`useSelectionManager` unit tests) and 3 (`GameLayoutPanels` snapshot tests) remain open.

---

## Suggested Execution Order

**Original order (mostly consumed):** 1.1, 1.2, 1.5, 5.1/5.6/5.12 → 6.2 smoke tests → 4.1–4.4 rendering debt → 2.2 type split. All done.

**Remaining work, re-ordered 2026-07-26 after verifying each item against the code:**

1. **1.3** — dead imports + three dead locals in `GameController.tsx`. Unblocked, mechanical, ~10 minutes.
2. **2.1 (scoped) + 3.4 together** — type `GameLayoutPanels` (6 `any`) and `BoardCanvas` (3 `any`) while collapsing the 24-prop surface. These two items touch the same seam, and it is the seam the graphics work keeps returning to. Do not attempt the full 126-occurrence sweep in one pass.
3. **5.2, 5.3, 5.4, 5.7, 5.8** — small consistency fixes. 5.2 first: it is the only one with user-visible behavior attached.
4. **3.5** — thin out the four fat actions in `app/actions.ts`; pairs naturally with **5.14** (typed action results), since both rewrite the same call signatures.
5. **3.1, 3.2** — the progress-card splits. Highest risk in the plan: 1,574 lines across two files with **no controller test coverage**. Needs §6 item 1 as a safety net first, plus a manual smoke plan for merchant/inventor/smith/engineer/medicine/treason.
6. **6 items 1 and 3** — hook unit tests (`useBoardValidation`, `useSelectionManager`) and `GameLayoutPanels` snapshots.
7. **4.4 (remainder)** — the `boardTheme` object; piece rendering still lives in `VertexRenderer`/`EdgeRenderer`.
8. **Lint debt** — 192 errors + 136 warnings. The `react-hooks/set-state-in-effect` warning class overlaps §2.1's files; fold it in rather than treating it as a separate campaign.
