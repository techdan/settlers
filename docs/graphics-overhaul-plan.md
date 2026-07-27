# Graphics Overhaul — Execution Plan

**Direction:** A — Illustrated Tabletop (straight to A; the B→A ramp was declined)
**Date locked:** 2026-07-09
**Reference pitch:** https://claude.ai/code/artifact/95a848d1-a210-4c55-999e-449affe2db7e
**Historical companion:** `docs/archive/codebase-improvement-plan-v2.1.md` (§4 = Phase 0 of this plan)

## 0. Locked decisions

| Question | Decision |
|---|---|
| Art direction | **A — Illustrated Tabletop.** Every terrain is a small illustrated scene on warm tile stock; cream punched tokens; card frames echoing the physical C&K deck; pieces that read as painted wood. |
| Barbarian invasion | **On-board sea route.** The drakkar sails an 8-step route through the board's sea toward a landfall marker; knights-vs-cities chips anchor at landfall. The left-column `BarbarianTrack` panel is retired. |
| Voxel theme | **Retired.** Deleted in Phase 0; one finished look instead of two half-finished ones. |
| Palette temperature | **Warm.** UI chrome shifts from cool slate to a warm dark ("harbor night"); board palette per §2. |

---

## 1. Division of labor — who does what

Two kinds of work with very different failure modes:

**Design-judgment work — done by the lead agent (Fable) directly, not delegated:**

| Work | Why it fails when delegated |
|---|---|
| All bespoke SVG artwork: 6 terrain scenes, sea frame, ports, robber, merchant, drakkar, all pieces, card frames, dice, ~25 progress-card icons | Consistency across ~60 assets (one light source, one line language, one palette, matched detail density) is a single-author judgment task. Piecemeal generation produces "clip-art soup" — technically valid SVGs that don't belong to the same world. Small-size readability (a mighty knight must differ from a strong knight at 24px) requires iterative visual tuning, not spec-following. |
| The art-system spec itself (§2) | It *is* the design. |
| Barbarian route geometry (§5) | Curve fitting through variable sea space with port avoidance + aesthetic placement. Math is easy; "looks right" is not. |
| Bottom tray & HUD visual design (Phase 4) | Same reason: layout is design. The mechanical panel moves are delegable; the tray's visual system is not. |
| Review gate on every delegated diff | Delegated work is checked against §2 and §7 before merge. |

**Mechanical/specified work — delegable to a coding agent (specs in this doc + improvement plan):**

- Phase 0 entirely: sprite pipeline, palette module, voxel retirement, theme wiring, smoke tests
- State wiring for the barbarian route (data already exists: `gameState.barbarianPosition`)
- Tailwind slate→warm token sweep (§4, Phase 4) — with the grep patterns in §6
- Emoji replacement once replacement icons exist
- Everything in the archived `docs/archive/codebase-improvement-plan-v2.1.md` §1, §2, §5, §6

Rule of thumb: **if the task's output is judged by looking at it, Fable does it; if it's judged by tests passing and diffs matching a spec, delegate it.**

---

## 2. Art system spec — the law for every asset

Every asset must obey all of these. A delegated asset that violates any rule is rejected without discussion.

### 2.1 Palette (board)

These are the values from the approved pitch vignette. Land them in `lib/constants/board-palette.ts` (Phase 0) as the single source; CSS custom properties in `globals.css` mirror them.

| Token | Value | Use |
|---|---|---|
| `sea` | `#2f6472` | Sea frame base (waves `#bfe0e6` at 70% opacity) |
| `seam` | `#e8dcc0` | Cardboard gap between tiles, tile outer edge |
| `forest.base` | `#3a7a48` | + canopy `#1e5230` / `#276a3d`, highlight `#348a4f`, trunk `#5b3a22` |
| `field.base` | `#e3ab3f` | + furrows `#c8922f` / `#f0c25c`, stalks `#8a6420` |
| `mountain.base` | `#93897a` | + facets `#6e675c` / `#877f70` / `#615a50`, snow `#f2efe6` |
| `pasture.base` | `#96c161` | + patches `#a5cf72` / `#88b455`, wool `#f4f1e4`, faces `#3d3630` |
| `hills.base` | `#c06a38` | + bricks `#b65d33` / `#a8502a`, mortar `#7e3a1d` |
| `desert.base` | `#e0c186` | + dunes `#c5a262`, sun `#f2d98b` |
| `token.face` | `#f3e9cf` | ring `#a98d55`, inner ring `#c9b381`, ink `#3a3020`, red `#b3352c` |
| `barbarian` | `#b8433c` | route landfall, attack states; hull `#6b4a2c`, sail `#ddd5c2`, sail stripe `#b3432f` |

Player colors stay as-is for now (they are player identity); re-evaluate harmony in Phase 2 with pieces on the real board.

### 2.2 Light, line, shadow, density

- **One sun, top-left.** Every 3D-implying facet: left/top faces lighter, right/bottom darker. No exceptions, including cards and dice.
- **Line language:** shapes are outlined only where they must separate from same-hue neighbors, using a **darkened version of their own fill** (multiply ≈ 0.6–0.72), never black, never white. Tile inner stroke: 2px at hex size 90.
- **Shadows:** grounded objects (trees, sheep, buildings) get one ellipse shadow, black at 15–18% opacity, rx ≈ 0.9× object width. No blur filters on the board (perf; C's look was rejected).
- **Detail density:** each terrain scene = 3–6 feature objects, sized so the largest is ≈ 0.5× hex radius. More reads as noise at zoom 0.5.
- **Numbers hierarchy:** nothing inside a tile may compete with the number token. Features sit in the upper ⅔; token center at `(0, 0.3 × size)`, radius `max(12, 0.28 × size)`.
- **Serif for game-world text** (tokens, card names — Palatino/Georgia stack), sans for HUD counts. No emoji anywhere on board or cards.

### 2.3 Technical form of an asset

- Authored at hex `size = 90` (the live `HEX_SIZE`), all coordinates as fractions of `size` — assets scale with the board.
- **No `foreignObject`, no `<img>`, no HTML inside board SVG.** Pure SVG elements only.
- **No per-instance `<defs>`**: gradients/filters/clipPaths that repeat across tiles are defined once in `themes/tabletop/defs.tsx` and referenced by stable IDs (`tt-*` prefix). Per-tile clip paths use the tile ID: `tt-clip-${tileId}`.
- Player-color parameterization via prop → `fill`, with shading derived by a shared `shade(hex, factor)` util — pieces never hardcode player hexes.
- Deterministic output: round emitted coordinates to 2 decimals (hydration; see the `Port.tsx` lesson).
- Readability check at zoom 0.5 / 0.8 / 1.3 (the live `TransformWrapper` range) before an asset is "done".

---

## 3. Asset inventory

Owner: **F** = Fable (art), **D** = delegable (wiring). Phase in parentheses.

**Board (Phase 1):** terrain tiles ×6 (F); sea frame + coast/wave treatment (F); number token component, 2–12 with pip dots (F, one parametric component); ports ×6 types — pier + banner with resource glyph (F); robber figure (F); merchant figure (F); rolled-tile flash + valid-placement highlight redesigned to fit the art — glow ring in `seam` cream, not brightness filter (F spec, D wiring).

**Barbarian route (Phase 1, §5):** drakkar ship (F); route step discs ×4 states (F); landfall marker (F); knights/cities chips (F); state wiring + tooltip port from old `BarbarianTrack` (D).

**Pieces (Phase 2, all player-color parametric):** road; settlement; city; city+wall variant; metropolis; knight ×3 levels ×2 (active/inactive) — all F. Wiring into `VertexRenderer`/`EdgeRenderer` replacing inline path blobs (D).

**Cards (Phase 3):** resource faces ×5; commodity faces ×3; progress frame ×3 categories + ~25 per-card icons (batched by category); dev-card faces ×5 (base game); deck backs ×3 for `ProgressDecksPanel` — all F. Hand-tray card components + fanning (F design, D integration).

**Dice (Phase 4):** red/yellow pip dice faces; event die ×4 faces (ship, science, politics, trade) — F.

**HUD (Phase 4):** improvement-track glyphs (science/trade/politics), VP/knight/hand-size chips — F restyle of existing icon set; layout moves D.

---

## 4. Phase work orders

Every phase ends: `npm run test:run` green, lint no worse than baseline, manual smoke of a full C&K turn (roll → resource gain → build → play progress card → end turn).

### Phase 0 — Plumbing (delegable, ~1–2 days agent work)

Prereq for everything. Execute the archived `docs/archive/codebase-improvement-plan-v2.1.md` §4.1 (sprite pipeline), §4.2 (palette module), §4.3 (extract piece paths), plus:

1. **Retire voxel** (supersedes the two-theme parts of §4.4):
   - Delete `themes/voxel/` (7 files).
   - Remove voxel imports/branches: `components/board/BoardCanvas.tsx` (`VoxelHexTile`, `VoxelPort`, painter's-algorithm sort can stay but is no longer required), `VertexRenderer.tsx` (`VoxelKnight`, all `theme === 'voxel'` branches), `EdgeRenderer.tsx` (voxel road branch + `DEPTH` offset), `BoardControls.tsx` (3D toggle button), `lib/theme-store.ts` (drop the toggle; keep the store only if anything else uses it — grep first).
   - Remove `theme` props end-to-end (`Board.tsx` → `BoardCanvas` → renderers); check `app/board/flat/page.tsx` and `components/lobby/BoardPreview.tsx` for theme references.
   - Acceptance: `grep -rn "voxel" components lib themes app core --include="*.ts*"` → 0 hits; board renders identically to today's flat theme.
   - ✅ **Done (uncommitted, working tree).** `lib/theme-store.ts` deleted outright (zero other consumers after `Board.tsx` was updated — grepped first, per instruction). `app/board/flat/page.tsx` had no theme references. `components/board/KnightRenderer.tsx` (pre-existing dead code, zero importers) also had its `VoxelKnight` import/branch stripped since it would otherwise fail `tsc` once `themes/voxel/` was gone. Acceptance grep: 0 hits except a pre-existing orphaned `components/board/VertexRenderer.tsx.backup` (tracked, unrelated to this change, flagged not deleted — see improvement-plan §4.4 note).
2. **Board smoke tests** (improvement plan §6.2) — the safety net: fixture `GameState`, assert tile count, token numbers, piece placement, port count, and that selection highlights attach to the right vertices/edges.
   - ✅ **Done (uncommitted, working tree):** `components/board/__tests__/BoardCanvas.smoke.test.tsx`, 10 tests, single (flat) theme only per the locked decision. Written first, then kept green (with expected, intentional assertion updates) through steps 1/2/4/5/6 below.
3. **Scaffold `themes/tabletop/`**: `defs.tsx`, `palette.ts` re-export, empty component shells matching the (now single-theme, light) `BoardTheme` object: `{ HexTile, Port, NumberToken, Robber, Merchant, pieces: { Road, Settlement, City, Metropolis, Knight }, BarbarianRoute }`.
   - ✅ **Completed 2026-07-26:** the tabletop implementation is fully built, and `themes/board-theme.ts` now supplies the previously missing typed `BoardTheme` boundary. It includes the current sea frame/viewBox, status glyph and city-wall additions alongside the planned surface. `BoardCanvas`, `VertexRenderer`, and `EdgeRenderer` consume the stable object at module scope; no hitbox/selection markup changed. The inline tabletop implementation makes the originally proposed shared `defs.tsx` unnecessary.

### Phase 1 — The island (F art + D wiring, the big visual drop)

> ✅ **Done 2026-07-09** (lead-authored, user visual pass passed): `themes/tabletop/` tiles ×6, tokens, ports, robber, merchant, sea frame + expanded viewBox, barbarian route per §5 (ship kept upright — tangent rotation reads as capsized on this steep route); wired into `BoardCanvas`; `BarbarianTrack`/`BarbarianHexOverlay` deleted; smoke tests adapted (`g[data-terrain]`) + 2 route tests. `themes/flat/` survives for pieces until Phase 2 (lobby `BoardPreview` still flat — swap when pieces land).

1. Expand board viewBox (currently `-500 -500 1000 1000`) to fit the sea frame + route (est. `-580 -560 1160 1120`; tune with the route in place).
2. Sea frame: water fill behind/around the island in `sea`, wave strokes, cream coastline seam per §2.1. Tiles get the cardboard-seam treatment (cream underlay + darkened-base inner stroke — the pitch vignette technique).
3. Terrain tiles ×6 per §2, replacing `themes/flat/HexTile.tsx` content; number token, ports, robber, merchant.
4. Barbarian route per §5; delete `BarbarianTrack` from `GameLayoutPanels` left column (`ProgressDecksPanel` stays there until Phase 4).
5. Switch `BoardCanvas` to `themes/tabletop/`; `themes/flat/` survives only for pieces until Phase 2 completes, then is deleted.

### Phase 2 — Pieces (F art + D wiring)

> ✅ **Done 2026-07-10** (lead-authored, user approved via piece-gallery artifact): `themes/tabletop/pieces.tsx` — roads (beveled planks), settlements/cities (lit roofs, watchtowers), metropolis (brass tier+spire), crenellated wall ramparts, knights (helm-silhouette + pip rank coding, brass ring when active, desaturation when inactive); wired into `VertexRenderer`/`EdgeRenderer` with hitboxes untouched; `BoardCanvas` no longer mounts sprite defs. Facets use CSS `brightness()` (player colors are CSS vars). **Tail delegated:** lobby `BoardPreview` → tabletop, delete `themes/flat/` + `board-icon-defs.tsx`.

Replace `VertexRenderer`'s ~150 lines of inline path data and `EdgeRenderer`'s rect-roads with `themes/tabletop/pieces.tsx` sprites. Knight levels must be distinguishable at 24px by **silhouette** (helm shape), not only by detail; inactive = desaturated + flag lowered, not opacity 0.4 (current approach reads as a rendering bug). City walls render as a rampart ring under the city, not a rect outline. Delete `themes/flat/` at the end.

### Phase 3 — Cards & tray (F design/art + D integration)

> 🔶 **In progress 2026-07-10.** Batch 1 done: `themes/tabletop/cards.tsx` (5 resource faces, 3 commodity faces, 3 progress deck backs, `CardStack` fanned-quantity primitive) wired into `PlayerHand` and `ProgressDecksPanel`. Remaining: progress-card icons (~25, lead; concept list vetted by user before drawing), dev-card faces, `ProgressCardHand` as real cards, unified bottom tray (lead design → delegated integration). Phase 2 tail (flat theme retirement) completed by delegated agent, lead-verified.
>
> ✅ **Phase 3 functionally complete 2026-07-10** (manual click-through pass pending, checklist in session notes): all card faces + 25 icons shipped; `PlayerDevCards` renders DevCardFace stacks (lead-executed after a Codex zombie); `ProgressCardHand` rewired onto `ProgressHandView` (Opus-executed, lead-reviewed — per-card gating incl. engineer/medicine targets, Commercial Harbor lock, and pre-barbarian robber-card rule preserved with human-readable reasons). Old slate hand panel removed so the drawer shelf can escape overflow. Remaining Phase 3 oddments fold into Phase 4: tray assembly.
>
> **Progress-hand UX (user-approved via card artifact):** name-fitting rule for long card names (wrap to two balanced lines, shrink only single long words); tray shows progress cards **inline at ~58px when holding 1–3**, switching to the **drawer** (category-edge chip stack + count pill; hover/click opens a full-size shelf above the tray, fits 7) when **count ≥ 4 or the viewport is narrow**. The shelf doubles as the end-of-turn discard picker.

Card frame system per pitch (cream stock, brass double rule, art window, serif name plate, category color for progress cards). Hand becomes rendered cards in the unified bottom tray (design from the pitch's "Proposed" layout): resources + commodities as mini-cards with counts, progress cards fanned, build buttons docked, dice + roll/end-turn at the tray's right end. The three separately-positioned bottom clusters and the `scale-75 xl:scale-85 2xl:scale-100` hacks in `GameLayoutPanels.tsx` are deleted.

### Phase 4 — HUD re-zoning + warm chrome (F design + D sweep)

> ✅ **Done 2026-07-11 — `dc2ead9`.** Unified `GameTray`, tabletop dice, warm HUD tokens, right-rail layout, build/action glyphs, compact player-card polish, and chronological log landed after the user's visual pass. Verification at commit: `npx tsc --noEmit` clean and 191/191 tests. The original sweep deliberately did not cover the modal/dialog/notification layer; the audit below makes that remaining work an explicit gate before Phase 5.

1. Warm dark chrome tokens in `globals.css` (replacing ad-hoc slate classes):
   `--ui-bg #14100c · --ui-panel #211a13/92% · --ui-panel-raised #2a2118 · --ui-border #3d3226 · --ui-text #ede3cf · --ui-muted #a89a83 · --ui-accent #c9973f · --ui-danger #b8433c · --ui-success #5d8a4e`
   (Fable may tune exact values on the live board; semantic timer colors stay green/orange/red.)
2. Sweep `bg-slate-*`, `border-slate-*`, `text-slate-*` in `components/game/**` to the tokens (see §6 for the dynamic-class trap).
3. Layout: top-center status banner (phase/turn/timer), right rail (players → collapsible log/chat/stats), tray from Phase 3. Piece-anchored popovers for city/knight management.
4. Dice restyle (pip + event die per §2), replacing hardcoded `#dc2626`/`#fbbf24` in `DiceDisplay.tsx`.

### Phase 4.5 — Legacy visual retirement across the full game (required before Phase 5)

**Why this phase exists:** the Phase 4 tray/HUD is cohesive, but secondary interactions still fall back to the pre-overhaul visual system. The corrected boundary-aware audit on 2026-07-11 found **333 actual slate color utilities across 39 `components/game` files** (the initial broad grep incorrectly counted `translate-*` classes), **10 game surfaces importing the old `GameIcon` / `ColoredSvgIcon` / `/icons/` pipeline**, hardcoded resource/commodity emoji maps in five active surfaces, plus Unicode status/action symbols in board prompts and notifications. A live C&K setup pass confirmed the new tray/build glyphs are correct; the hidden modal states need their own systematic pass.

> ✅ **Committed 2026-07-26 as `3e8876f` (QA-005 fix split out as `98f52e8`, debug-panel collapse as `eb52934`); pushed to `origin/main`.** Shared tabletop glyph/modal primitives and all active trade, city/knight, progress/resource, robber, timer/status, game-over, and board-prompt consumers are migrated. `GameStatus.tsx`, `GameIcon.tsx`, and `ColoredSvgIcon.tsx` are deleted; `CompactImprovementBar` moved out of the retired icon directory. Static gates, TypeScript, and 198/198 tests pass. The now-unreferenced `public/icons/` directory remains only because the environment's destructive-action reviewer rejected its deletion; no runtime source references it. Direct requests previously confirmed both `/` and the live `/board/flat` route compile and return HTTP 200. Multiplayer QA passed lifecycle synchronization, Debug grants (QA-001 retracted after the overlap fix), road/settlement/city/wall/knight construction (QA-002 retracted after the target fix), bank/domestic/Commercial Harbor trades, discard synchronization, Road Building, Merchant selection/cancel, Wedding, and Alchemy. The 2026-07-15 continuation found three defects, all since fixed and retested: QA-003, the narrow progress-card trigger immediately recloses for hands of three or fewer cards; QA-004, the fixed desktop rails/tray/debug layout overlaps and clips core play surfaces at 390×844; and QA-005, Wedding gifts incorrectly trigger the robber-style “Resources Stolen!” notification. A follow-up on 2026-07-26 also moved the desktop debug panel from a hardcoded offset into the tray's flex column and collapsed it by default, retiring the last fixed-offset overlap in the HUD. Taxation/Treason remain legitimately gated until the first barbarian attack; Aqueduct, timer expiry, and game-over still need reachable coverage.

This is a retirement pass, not new art direction. Reuse the existing tabletop palette, cards, pieces, and glyph language. Do not start Phase 5 motion until every acceptance gate below passes and the user completes the interaction-matrix visual pass.

#### 4.5.1 Shared tabletop UI primitives first

- **Files:** `themes/tabletop/glyphs.tsx`, `themes/tabletop/index.ts`, plus a small shared wrapper under `components/game/ui/` if standalone sizing/background treatment is needed.
- **Action:** extend the existing pure-SVG glyph set with commodity glyphs (paper/cloth/coin), improvement-category glyphs, and neutral status/action glyphs (confirm, cancel, warning, trade, time). Provide one reusable resource/commodity token presentation for lists, costs, selectors, and trade summaries. Do not duplicate new SVG paths inside individual dialogs.
- **Accept:** every replacement below imports a shared primitive; no new emoji map, `/icons/` path, CSS-mask icon, or one-off resource SVG is introduced.

#### 4.5.2 Resource, commodity, piece, and card replacements

- **Trade surfaces:** `components/game/trade/TradeModal.tsx`, `components/game/trade/TradeOfferDisplay.tsx`, `components/game/overlays/TradeProgressModal.tsx`, `components/game/overlays/TradeCompletedNotification.tsx`.
- **City/knight surfaces:** `components/game/city/CityManagementDialog.tsx`, `components/game/city/SettlementManagementDialog.tsx`, `components/game/city/KnightManagementDialog.tsx`, `components/game/city/GuildSelectionList.tsx`.
- **Progress/resource surfaces:** `components/game/progress/AqueductModal.tsx`, `components/game/progress/CommercialHarborModal.tsx`, `components/game/progress/CommercialHarborInitiatorDialog.tsx`, `components/game/progress/ProgressCardModal.tsx`, `components/game/progress/ProgressCardDiscardDialog.tsx`, `components/game/modals/selectors/ResourceSelector.tsx`, `components/game/modals/selectors/CommoditySelector.tsx`, `components/game/modals/selectors/KnightSelector.tsx`.
- **Other consumers:** `components/game/overlays/RobberTheftNotification.tsx`, `components/game/ui/ExtensionRequestButton.tsx`, and `components/game/player/CommodityHand.tsx` (verify whether still rendered before refactoring; delete only with explicit approval if dead).
- **Action:** replace old `GameIcon`/`ColoredSvgIcon`, emoji maps, and raw text symbols with the shared tabletop glyphs; use `ResourceCardFace`, `CommodityCardFace`, `ProgressCardFace`, `DevCardFace`, or tabletop piece components when the UI is presenting an actual card/piece rather than a compact cost token.
- **Accept:** `rg -n "GameIcon|ColoredSvgIcon|/icons/" components/game` returns 0; no visible resource/commodity names are represented by platform emoji.

#### 4.5.3 Modal, dialog, prompt, and notification chrome

- **Files:** all active files under `components/game/modals/`, plus active `*Modal.tsx`, `*Dialog.tsx`, `*Prompt.tsx`, and `*Notification.tsx` under `components/game/{city,progress,trade,overlays,ui}/`.
- **Action:** introduce/reuse one warm modal shell (backdrop, panel, header, close action, footer actions, focus treatment) based on `--ui-*` tokens. Migrate the active surfaces in interaction-matrix order rather than blind search-and-replace. Preserve semantic danger/success/timer colors, but remove cool slate containers, borders, disabled states, and typography.
- **Accept:** `rg -n "slate-" components/game` returns 0 except an explicitly documented exception approved during review; every clickable row/button has `cursor-pointer`, while disabled controls use `cursor-not-allowed`; focus-visible treatment remains present.

#### 4.5.4 Board/action symbols and dead legacy infrastructure

- **Board files:** `components/board/VertexRenderer.tsx`, `components/board/EdgeRenderer.tsx` — replace Unicode `✓`/`✕` markers with shared SVG confirm/cancel glyphs without changing hitboxes.
- **Status files:** `components/game/ui/ConnectionStatus.tsx`, `components/game/ui/TurnTimerBar.tsx`, `components/game/ui/TurnTimerExpiredNotification.tsx`, `components/game/modals/WaitingOverlay.tsx`, and active game-over/robber/trade notifications — remove emoji-as-iconography while keeping human-readable text and ARIA labels.
- **Dead file:** `components/game/ui/GameStatus.tsx` has zero importers (the live layout uses `CompactGameStatus`); delete it during this phase after a final importer check.
- **Legacy pipeline:** after all consumers are migrated, re-run a repo-wide import/reference inventory for `components/ui/icons/GameIcon.tsx`, `components/ui/icons/ColoredSvgIcon.tsx`, and `public/icons/*.svg`. Delete only assets/components with zero remaining consumers; do not bulk-delete `public/icons` by directory assumption.
- **Accept:** no visible emoji or Unicode check/cross glyph remains in board/game UI; `GameStatus.tsx` is gone; legacy icon modules/assets are either removed or have each surviving non-game consumer documented.

#### 4.5.5 Verification matrix

Automated gate for every batch: `npx tsc --noEmit`, `npm run test:run`, lint no worse than baseline, and targeted render tests for any new shared primitive/modal shell. Final static gates are the `rg` commands above plus an emoji scan over `components/board` and `components/game`.

- ✅ `npx tsc --noEmit` — clean.
- ✅ `npm run test:run` — 31 files, 198/198 tests (Debug grant feedback and collapse toggle, legal perimeter-road Knight validation, accessible Knight targets, responsive progress drawer, and Wedding transfer semantics included).
- ✅ Boundary-aware slate/gray/zinc/neutral/stone scan — 0 hits under `components/game`.
- ✅ Active-source scan for `GameIcon|ColoredSvgIcon|/icons/` — 0 hits.
- ✅ Targeted resource/status emoji and board check/cross scans — 0 hits.
- ✅ `git diff --check` — clean; scoped lint for migrated batches clean. Full-project lint remains at its pre-existing cleanup baseline (the documented `any`, hook, and unused-import backlog).
- ⚠️ Manual interaction matrix below — desktop multiplayer lifecycle/build/trade/discard plus Road Building, Commercial Harbor, Merchant, Wedding, and Alchemy passed. QA-002 Knight retest passed. QA-003/QA-004/QA-005 are fixed and retested: the progress drawer, responsive HUD/tray, trade dialogs, Debug drawer, and Wedding gift notifications passed at 744×1133, 768×1024, 1024×768, and a reduced 1024×694 Safari-height viewport. Taxation/Treason, Aqueduct, timer expiry, game-over, and the remaining modal inventory still require coverage before the whole matrix is complete.

**iPad/Safari responsive resolution (2026-07-15, committed in `3e8876f`):** viewports below `xl` now use a touch-first HUD with mutually exclusive Status, Log & Chat, Decks, and Debug drawers; the board retains the full dynamic viewport and the bottom tray wraps into two rows throughout the iPad range. `viewport-fit=cover`, `100dvh`, safe-area insets, contained modal/drawer scrolling, deliberate tap highlighting, and 44px primary trade/debug/tab targets cover Safari chrome and touch interaction. Live two-player DVCL validation confirmed no document overflow, visible turn actions, working 3- and 4-card progress shelves, bank/domestic trade modal fit, and cross-tab Wedding Gift Sent/Received copy without theft terminology.

Manual visual pass, in both base and C&K modes where applicable, at desktop and narrow widths:

1. Build tray: every structure, every cost, enabled/disabled/selected states.
2. Bank trade; domestic trade compose, offer, accept/reject/cancel, progress, and completion.
3. Discard, robber victim selection, theft success/failure, and board confirm/cancel markers.
4. Dev-card modal and progress-card flows: Aqueduct, Commercial Harbor (both players), Merchant, Taxation, Treason, Wedding, and progress-card discard.
5. Settlement, city/improvement/metropolis, and knight management dialogs.
6. Waiting overlay, board-selection prompts, timer expiry, connection states, and game-over surfaces.
7. Progress-card drawer/shelf with 1–3 cards, 4–7 cards, active follow-up, disabled reason, and narrow viewport.

Record each row as passed in this plan before Phase 5 begins.

### Phase 5 — Motion (F, small)

Dice tumble on roll; drakkar advances along the route path on ship events (CSS `offset-path` or transform interpolation, ~600ms ease); resource fly-ups from rolled tiles; metropolis award moment. All gated behind `prefers-reduced-motion`.

---

## 5. Barbarian sea route — detailed spec

**Data (already exists, no schema change):** `gameState.barbarianPosition` (0–7), `CK_CONSTANTS.BARBARIAN_ATTACK_POSITION` (7), `gameState.skipFirstBarbarianAttack`, `gameState.hasBarbariansAttacked`, phase `barbarian_city_selection`. Knights/cities totals computed exactly as `BarbarianTrack.tsx` does today (lift that logic into a shared helper, don't duplicate).

**Geometry:** quadratic Bézier from open-sea start (NW of island, outside the port ring) to landfall (W coast). 8 step points at equal parameter intervals (t = i/7). Control points chosen so the route bows away from the island. **Port avoidance:** after `generatePorts(hexSize)`, if any step disc center is within 45px of a port center, push that step outward along the curve normal until clear. Route renders once per board (memoized on hexSize + ports).

**States:**
- Step disc: passed (filled `#2c5262`), current (ship sits on it), future (dark `#16303c`, ring `#4d7e88`), landfall (larger, `barbarian` red ring + crossed-swords glyph).
- Ship: drakkar at current step, rotated to the curve tangent; at position 7 the ship overlaps the landfall marker and the marker pulses.
- Skip-first-attack: shield badge over the landfall marker while `skipFirstBarbarianAttack && !hasBarbariansAttacked` at position 7.
- Chips: `⟨shield⟩ N knights` vs `⟨tower⟩ M cities` pills anchored seaward of landfall; knights chip turns `--ui-success`/`barbarian` red by comparison. (Glyphs are drawn SVG, not emoji.)
- Tooltip: the full text block from `BarbarianTrack` moves here unchanged (position, rolls-to-landfall, defense status, weakest-contributor warning).

**Fallback:** one summary line in the tray (`ship icon · 4/7 · 4⚔ vs 5⛫` rendered with sprite glyphs) for viewports `< lg`, since board pan/zoom can push the route off-screen.

**Component:** `themes/tabletop/BarbarianRoute.tsx`, rendered inside `#board-svg` after tiles/ports, before edges/vertices. Delete `components/board/BarbarianHexOverlay.tsx` (already dead) and `components/game/overlays/BarbarianTrack.tsx` when this lands.

---

## 6. Known traps (for the executing agent — read before touching code)

1. **`<use>` + fill:** presentation attributes inside a `<symbol>` beat inherited `fill` on `<use>`. Symbols meant to be player-colored must leave `fill` unset (or use `fill="currentColor"` / CSS vars); symbols with fixed art keep explicit fills. Mixing these up silently renders black or invisible shapes.
2. **SVG ID collisions:** 19 tiles × per-tile gradients previously worked because IDs embedded coordinates. The new rule is shared defs with `tt-*` IDs rendered exactly once — mounting `defs.tsx` twice (e.g., board + lobby preview) duplicates IDs and breaks Safari. Export a `<TabletopDefs/>` that guards with a module-level flag or render it only in the top-level SVG of each page.
3. **Hydration:** any coordinate computed from floats must be rounded before emitting (the `round()` hack in `Port.tsx` exists because of a real bug). Keep it deterministic — no `Math.random()`, no `Date.now()` in render.
4. **Hitboxes ≠ visuals:** `VertexRenderer`/`EdgeRenderer` rely on transparent hit circles/rects and 13+ selection states wired in `BoardCanvas`. When swapping visuals, never remove or resize the hitbox elements; run the Phase 0 smoke tests plus a manual pass of: settlement place, road place, knight move, Diplomat edge select, Inventor two-hex select, robber move.
5. **Dynamic Tailwind classes:** the slate sweep will miss template-literal classes (e.g. `` `bg-${x}-800` `` or conditionals building class strings). Grep for `slate` *and* run the UI; don't trust class-name greps alone.
6. **Zoom range:** strokes authored at hex 90 are visually halved at minScale 0.5. Minimum meaningful stroke: 2px authored (1px apparent). Text under 9px authored is illegible zoomed out — that's why chips/tokens use bold weights.
7. **Don't reintroduce per-tile `<style>` tags** — animations live in `globals.css` (improvement plan §1.5).

---

## 7. Review gates

- Every delegated diff is reviewed against §2 + §6 by the lead agent before merge.
- Per-phase acceptance: tests green, lint ≤ baseline, full C&K turn smoke, and a side-by-side screenshot check at zoom 0.5 / 0.8 / 1.3.
- Asset "done" = obeys all of §2, readable at all three zooms, no console warnings, works over the warm chrome.
