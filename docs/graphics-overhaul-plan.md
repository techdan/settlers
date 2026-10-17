# Graphics and Presentation Polish Plan

**Status:** Foundational graphics overhaul complete in v2.1; 3D primary rollout checkpoint `27c42de` (§4.15), building on `7f113f1`
**Production blocker:** No
**Historical execution plan:** [`docs/archive/graphics-overhaul-plan-v2.1.md`](archive/graphics-overhaul-plan-v2.1.md)

The illustrated-tabletop board, pieces, cards, HUD, responsive layout, warm modal
system, icon retirement, and typed board-theme boundary are complete. This document
tracks presentation work worth revisiting without treating it as unfinished v2.1
production work.

## 1. Motion and feedback

Evaluate these as separate, small enhancements:

- Dice tumble when a roll resolves.
- Drakkar movement between barbarian-route positions.
- Resource-gain motion from producing tiles toward the player HUD.
- A brief metropolis-award moment.

### Motion requirements

- Honor `prefers-reduced-motion`.
- Do not delay authoritative state updates or input availability.
- Avoid layout shifts and animation-driven hydration differences.
- Keep board animation smooth at the supported zoom range.
- Add focused behavior tests where motion changes interaction timing.

## 2. Targeted presentation QA

Complete reachable visual checks for the interaction states that were not exercised
during the overhaul:

- Taxation and Treason after the first barbarian attack.
- Aqueduct selection.
- Timer expiry and extension exhaustion.
- Game-over presentation.
- Remaining mandatory-choice and error modal variants.

Record only reproducible defects as new work. Passing manual checks do not require
additional implementation.

## 3. Optional legacy-asset housekeeping

The old `/public/icons` pipeline has no active runtime consumers. Before removing
those assets, repeat the full reference scan and preserve any licensing or attribution
material required by surviving artifacts.

## 4. Parallel 3D UX migration proposal — 2026-09-08

**Status:** Opt-in 3D implementation is in the working tree; release acceptance
is in progress (see §4.7). This is a presentation migration, not a
second game implementation. The existing application release is already v2.1;
use **Classic / 3D Preview** in the UI to distinguish renderer choice from releases.
Keep Classic as the default until the acceptance gates pass.

### 4.1 Intent and visual direction

The user's video screenshots are inspiration for depth, tactile animation, helpful
instructions, and readable feedback, not a specification to copy its art or layout.
The X post and Designcode course could not be retrieved during this assessment;
the proposal is based on the supplied screenshots, user description, and local code.

Extend the current illustrated tabletop into a crafted miniature landscape:

- Retain the palette in `themes/tabletop/palette.ts`: harbor teal, cream tile edges,
  forest greens, golden fields, terracotta hills, warm stone, and brass accents.
- Give hexes beveled edges and shallow sculpted relief. Build clusters of trees,
  planted furrows, grazing sheep, rock outcrops, clay cuts, and dunes. Reserve clear
  areas for number tokens and unobstructed edges/intersections for game pieces.
- Make ports a primary visual feature: timber piers at the actual port locations,
  pilings, moored boats, resource cargo, small pennants, and legible ratio markers.
  Keep their two associated coastal vertices visually obvious.
- Use soft directional light and grounded shadows; restrained water movement and
  shoreline foam. Preserve the current warm, illustrated character in materials.
- Keep painted player colors and distinct building silhouettes. Give the robber
  a small cloaked human form; distinguish the merchant by posture, clothing, and
  cargo. Both must remain identifiable at the overview camera distance.
- Start with an angled orthographic camera, bounded zoom/pan, optional constrained
  rotation, a top-down preset, and reset-view control. Avoid automatic camera
  travel during normal play. Number labels remain readable at every allowed angle.
- Use original procedural geometry for the initial scene. Introduce authored GLB
  assets where they materially improve silhouettes/detail, with reusable materials
  and recorded provenance. A full-board art review must prevent mismatched assets.

### 4.2 Architecture and rollback boundary

Observed seams:

- `components/game/GameController.tsx` uses `lib/hooks/useGameControllerModel.ts`
  and composes the board, game overlays, and HUD.
- `components/board/Board.tsx` owns pending placement, visual previews, validation
  through `useBoardValidation`, and interactions through `useBoardActions`.
- `components/board/BoardCanvas.tsx` receives derived entities, valid target sets,
  selection state, and callbacks. This is the initial renderer substitution point.
- `themes/board-theme.ts` is an SVG component contract; retain it for Classic.
  Do not force Three.js meshes into that contract.
- `lib/hex.ts` provides canonical IDs and coordinate helpers; port geometry comes
  from `core/engine/board/port-generator.ts`. Convert these coordinates to the 3D
  ground plane with one consistent scale. Do not invent a second board topology.

Proposed dependency: Three.js with React Three Fiber and selected Drei helpers.
The repository uses React 19.2; the official Fiber installation documentation pairs
React 19 with Fiber 9. Verify compatible package versions when installing.
References: [installation](https://r3f.docs.pmnd.rs/getting-started/installation),
[rendering performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Keep one mounted controller, subscription, optimistic-state provider, and Board
interaction owner. Switch only the renderer subtree initially. Later, separate
shell components may consume shared state and callback props; do not mount a second
controller or copy services, rules, repositories, or server actions for 3D.

Use a browser-local presentation preference, independent of room/game state. Players
in the same room may choose different views. Load the WebGL renderer only when
requested, through a client-side dynamic import; Classic must not eagerly download
3D assets. Put the error boundary around the scene, below the interaction owner.
Handle unsupported WebGL, initialization failure, and context loss with an explicit
Classic fallback. Returning to Classic must work without a game reload.

Switching preserves pending placement, current turn, mandatory prompts, in-flight
action status, and shared dialog input. It must neither submit an action nor clear
an existing selection. Unmount only the old scene and dispose its GPU resources.
Renderer-local hover and camera state can reset. Keep semantic controls and dialogs
in HTML, with keyboard focus, touch targets, and pointer cursors on clickable items.

### 4.3 Layout proposal

First integrate the new board under the existing HUD to isolate interaction risk.
Then evaluate the following layout with a dense C&K game on a laptop and tablet:

- The board owns the central visual area. Fit the camera to the usable area after
  accounting for panels, hand, port extents, and barbarian route.
- Keep resources, commodities, build costs/actions, and trade together in a bottom
  dock. Put Roll / End Turn in a consistent, clearly separated primary-action area.
  Do not move the primary control around as the log or help text expands.
- Keep a collapsible desktop right rail for player status and Chronicle / Chat /
  Stats, extending the existing `GameLayoutPanels` and `SidebarTabs` approach.
- Offer a concise contextual instruction near the board: what to do next, valid
  targets, costs, and why an action is unavailable. Optional learn-mode detail and
  settlement-site previews should use shared rules/data, including C&K exceptions.
- On narrower screens use drawers and a compact dock; no permanently open side
  panels. Do not reduce important text just to fit more decorative UI.

AI opponents and new trading rules are separate gameplay work, not prerequisites
for this UX migration. Reuse the existing trade behavior and game log.

### 4.4 Animation contract

Animation presents authoritative outcomes; it never determines them:

- Preview a proposed placement distinctly. On accepted placement, lower the road
  or building into place with a short settle and grounded shadow. On rejection,
  restore the correct board without success feedback.
- Roll 3D dice with authored tumble/bounce motion ending on server-selected faces.
  Support the red/yellow production dice, C&K event die, and Alchemist flow. Never
  use client physics/randomness as the dice result or replay a roll on view switch.
- After roll feedback, emphasize producing hexes, then animate resource/commodity
  gains toward the relevant player HUD. Respect robber blocking, production rules,
  shortages, and deferred choices; do not infer production from generic hand deltas.
- Audit confirmed event data before this work. `GameState` currently exposes dice
  results, logs, and several specific recent-event fields; this is not a complete
  resource-production animation stream. If exact production attribution needs new
  metadata, add a small backward-compatible typed event at the existing service
  boundary, derived from the actual resolved result, with stable event identity.
  Never parse prose log messages to reconstruct outcomes or reveal hidden cards.
- Maintain event deduplication outside the renderer so action responses, realtime
  echoes, view switching, reconnects, and React remount behavior do not double-play
  effects. Initial/resynced snapshots establish a baseline, not historical playback.
- Sequence cosmetics independently of state updates. New mandatory choices and
  turn changes take precedence; stale effects cancel or settle immediately. Input
  availability and timers must not wait for animation completion.
- Animate barbarian movement, knight actions, robber movement, and metropolis
  awards after the basic roll/build/production flow works. Provide reduced-motion
  equivalents and avoid forced zooms, flashes, or long cinematic interruptions.

### 4.5 Work items and acceptance criteria

Mark items complete only after their gates pass; record the commit hash when a
commit is authorized and made. Until then explicitly record uncommitted status.
Paths marked **new** are proposed locations, not existing implementations.

1. [ ] **3D art and performance preview.** Paths: `app/dev/board-3d/page.tsx`
   (**new**), `components/board/three/` (**new**), `lib/test-utils/test-helpers.ts`,
   `themes/tabletop/palette.ts`, `package.json`, and the package lockfile.
   Acceptance: isolated deterministic fixture with all six terrains, actual ports,
   sample structures, robber, merchant, and C&K pieces; inspect both close-up and a
   complete board at laptop/tablet sizes. Show at least one placement and dice
   animation in the fixture. No live mutations. Record device, viewport, FPS,
   draw calls, asset transfer size, and visual defects before live integration.

2. [ ] **Shared renderer contract and view switch.** Paths:
   `lib/types/board-renderer.ts` (**new**), `lib/hooks/useBoardPresentation.ts`
   (**new**), `components/board/Board.tsx`, `components/board/BoardCanvas.tsx`,
   `components/board/BoardControls.tsx`, `components/board/three/BoardScene.tsx`
   (**new**), `components/board/__tests__/Board.presentation.test.tsx` (**new**).
   Acceptance: derive the contract from existing Canvas props; both views receive
   the same entity IDs, previews, valid targets, and handlers. Switching while a
   placement or request is pending preserves its state and causes no mutation.
   Classic remains default; verify lazy loading and each fallback failure path.

3. [ ] **Live board interaction parity.** Paths: `components/board/three/`,
   `components/game/board/GameBoardSection.tsx`,
   `lib/hooks/__tests__/useBoardValidation.test.tsx`,
   `lib/hooks/__tests__/useBoardActions.robberConfirmation.test.tsx`, and new
   renderer interaction tests under `components/board/__tests__/`.
   Acceptance: verify setup ordering, road/settlement/city/wall placement, confirm
   and cancel, all knight levels/actions/displacement, robber/victim selection,
   merchant, Inventor, Diplomat, Engineer, Medicine, Smith, Intrigue, Taxation,
   Treason, Road Building, metropolis placement, and barbarian city loss. Raycasts
   resolve canonical IDs; decoration cannot intercept input, and camera drags
   cannot place pieces. Verify crowded intersections, touch, and minimum zoom.

4. [ ] **Confirmed-event motion.** Paths: `lib/presentation/` (**new**),
   `lib/hooks/useGameControllerModel.ts`, `lib/hooks/useGameNotifications.ts`,
   `components/game/ui/DiceDisplay.tsx`, and `components/board/three/`.
   Conditional event-metadata paths: `lib/types/game.ts`,
   `lib/services/game-service.ts`, `lib/services/ck-game-service.ts`, and their
   tests; audit the actual resolution owners before changing them.
   Acceptance: implement the contract in §4.4 with tests for duplicates, reconnect,
   rejected placement, rapid updates, identical consecutive dice results, reduced
   motion, and C&K choices. Resource quantities match resolved server outcomes.

5. [ ] **3D shell, teaching, and chronicle.** Paths:
   `components/game/ui/GameLayoutPanels.tsx`, `components/game/ui/ActionControls.tsx`,
   `components/game/ui/SidebarTabs.tsx`, `components/game/player/PlayerHand.tsx`,
   `components/game/three/` (**new**), `app/dev/viewports/`, and
   `components/game/GameController.tsx` for shared composition only.
   Acceptance: proposed §4.3 layout works with all eight resource/commodity types,
   progress cards, long player names, long logs, and mandatory prompts. Verify at
   1366×768, 1920×1080, tablet portrait/landscape, and narrow touch viewports. Preserve
   keyboard access, readable help, dialog state, log history, and existing actions.

6. [ ] **Mixed-view playtest and rollout.** Paths: renderer/HUD tests above,
   `components/board/three/` quality and fallback controls, and this plan.
   Acceptance: play complete base and C&K games with Classic and 3D clients sharing
   a room, including reconnect and mid-action switches. Pass the gates below and
   all mandatory-choice flows (discard, Aqueduct, defender rewards, progress-card
   discards, and multiplayer card choices), timers, failures, and game over.
   Make 3D default only after visual and interaction acceptance. Retire the old
   shell in a separate reviewed cleanup; evaluate retaining Classic as a low-power
   and accessibility option before deleting the renderer.

### 4.6 Performance and release gates

- Initial proposed targets: approximately 60 FPS on the chosen reference laptop
  and at least 30 FPS on the chosen supported tablet during active interaction.
  Identify the actual test hardware and measure before promising these targets.
- Reuse geometry/materials and instance repeated terrain props. Bound pixel ratio,
  shadow quality, particles, and detail density. Avoid React state updates per
  animation frame. Pause work in hidden tabs and provide a lower-quality mode.
- Use on-demand rendering when the scene is idle; continuous water/ambient motion
  must be explicitly budgeted and optional so it does not defeat the idle policy.
- Verify WebGL failure/context loss, network/asset-load failure, GPU disposal on
  repeated switches, Classic bundle isolation, and visual contrast at low quality.
- Run lint, typecheck, focused meaningful interaction/event tests, the full suite,
  and production build for implementation batches. Inspect the actual WebGL scene
  in a browser: DOM-only tests cannot establish rendering or raycast correctness.
- Complete reduced-motion, keyboard, touch, resizing, and mixed-view multiplayer
  checks before default rollout. The existing production-readiness work in
  `docs/codebase-improvement-plan.md` remains a separate release prerequisite.

### 4.7 Implementation record — 2026-09-08 (uncommitted)

Completed implementation slices:

- [x] Original Blender asset pipeline: `scripts/art/generate_tabletop_models.py`,
  editable `assets/3d/tabletop-art-review.blend`, and 37 GLBs under
  `public/models/tabletop/` (2.16 MB combined). All six terrains, six foundations,
  resource harbors, buildings, walls, knight variants, human-form travelers, and
  barbarian ship. Corrected overlapping foundation caps after rendered review.
- [x] Shared `lib/types/board-renderer.ts`, lazy `BoardPresentation.tsx`, browser-local
  Classic/3D preference, scene error boundary, and stable placement owner. Classic
  stays the default. Four tests exercise real Board/hooks with mocked renderers:
  lazy default, canonical pending placement through switching, fallback, and busy
  confirmation without duplicate actions.
- [x] `components/board/three/` scene: original terrain and harbor assets, warm
  player paint, canonical hit targets, C&K selection highlights, keyboard target
  chooser, confirmation/cancel, bounded camera, top-down and quality controls.
  Twelve focused selection/geometry tests passed. Ordinary directional shadows
  replace the accumulated-shadow pass after visible rectangular sea edges in QA.
- [x] `components/game/three/DiceTray.tsx`: sculpted wooden tray, rounded textured
  production/event dice, exact final faces, authored tumble, reduced motion, and
  Alchemist's separately locked event die. Existing game tray selects this display
  only in 3D mode.
- [x] Exact production metadata from actual award sites in resource/commodity
  managers; normal rolls and Alchemist publish an additive `lastProduction` field.
  Source parcels and summaries use this event, never generic hand deltas. Forty-six
  focused dice/production/service tests passed.
- [x] Isolated `/dev/board-3d` playground with deterministic fixture, local placements,
  rolls using production managers, hand, player panel, and chronicle. It is disabled
  in production and performs no server actions. Its renderer preference is separate
  from the live-game preference; preview players are explicitly not AI opponents.

Browser evidence so far: complete island/ports/dice render at 1280×720; pending
settlement survives 3D → Classic → 3D and confirms once; confirmed production adds
exactly two wood and one paper in the fixture. Inspected tablet portrait (768×1024)
and narrow touch (390×844), corrected footer wrapping, drawer default, and horizontal
hand scrolling. Reference browser is Codex's in-app Chromium; physical GPU/tablet
performance targets are not established by these viewport simulations.

Final hardening: live viewport insets measure the scaled HUD instead of placing
the island behind it (four focused tests). WebGL2 capability gates return failed
initialization to the existing Classic boundaries; probe contexts are released.
Production and dice suppress snapshots older than eight seconds using server time
where available, while still baselining their IDs. Legacy rolls without a timestamp
show settled faces. Thirteen freshness/dice tests and four capability tests pass.
Reduced-motion browser verification confirmed settled dice and exact resource gains;
final desktop reload had no console errors. Temporary viewport overrides and the
separate reduced-motion verification browser were reset/closed.

The six broad work-item checkboxes above remain acceptance gates, not merely code
existence checks. Complete mixed-view base/C&K multiplayer walkthroughs, all mandatory
choice states, full reconnect/resync walkthroughs, reference-device performance measurements,
and default-rollout approval remain before declaring the migration finished or
retiring Classic. No game rules were intentionally changed.

Aggregate checks: production build, standalone strict typecheck, and full ESLint
pass. The initial full suite passed 567 tests with three 5-second timeouts; those
three files then passed all 36 tests with a 20-second timeout. The final full-suite
run including all hardening tests passed **587 tests across 111 files**, using
`--maxWorkers=2 --testTimeout=20000`. `git diff --check` passes. No files are staged
or committed. The local preview server remains available on port 3011.

### 4.8 Piece legibility — 2026-09-08 (superseded by §4.9)

User review found ivory/orange roads blending into tile seams and mountain/clay
terrain, and insufficient separation between miniatures and scenery.

- [x] Give roads a dark structural silhouette and distinct painted upper face;
  give buildings/knights raised dark-rimmed ownership bases and visible paint from
  angled and top-down views. Paths: `components/board/three/BoardScene.tsx`,
  `components/board/three/art/index.tsx`, and shared piece presentation helpers.
  Acceptance: all four player colors remain identifiable at fitted board scale,
  including orange/ivory beside mountains; knight rank and active state use shape
  cues; canonical placement/hitboxes and selection state remain unchanged.
- [x] Expand `lib/presentation/preview-fixture.ts` with difficult terrain/piece
  combinations and all four knight owners, and align the playground ownership
  swatches with renderer paint. Acceptance: repeatable visual review of angled,
  top-down, and low-detail views, plus existing switching/placement regression
  checks and the normal polish checks below.

Landed shared `lib/presentation/piece-style.ts`, `PiecePresentation.tsx` with
beveled road bodies, hexagonal building plinths, round knight plinths, rank studs,
raised/furled pennants, and depth-aware occluded footprint outlines. Roof and native
building-plinth materials are recolored on private clones; scenery materials and
Blender source assets remain shared. Player swatches use the same paint helper.
The playground includes a compact piece legend and excludes knight-occupied sites
from settlement previews. Visual checks passed at 1280×720, top-down, low detail,
and reduced motion. A pending road survived Classic → 3D and confirmed once, with
no browser errors. All 587 existing tests across 111 files passed, plus 19 focused
tests including new palette-contrast coverage. Global lint, standalone strict
typecheck, and the final production build all pass. Temporary browser preferences
and verification files were cleaned up; the updated preview remains open. No files
were staged or committed.

### 4.9 Cleaner relief and ownership paint — 2026-09-08 (uncommitted)

User rejected §4.8's heavy black bevels and through-terrain footprint outlines.
The outlines created an unwanted see-through appearance. That visual treatment
was rolled back without reverting the shared 3D architecture or game behavior.

- [x] Restore original simple roads and native Blender building/knight models;
  remove `PiecePresentation.tsx`, extra bases, pennants, studs, and depth overlays.
  Keep opaque normal depth-tested pieces, stronger player paint and matte painted
  roof planes; restore native timber and stone materials. Paths:
  `components/board/three/BoardScene.tsx`, `components/board/three/art/index.tsx`,
  `lib/presentation/piece-style.ts` and its compatibility tests.
- [x] Reduce mountain relief to .62, forest relief to .70, and hill relief to .86
  of original height while keeping footprints and token clearance unchanged.
  Knights are 12% taller with unchanged footprint; canonical hitboxes stay intact.
- [x] Restore the original sparse playground fixture and remove obsolete legend;
  retain matching ownership swatches and prevention of settlement previews on
  knight-occupied vertices. Paths: `lib/presentation/preview-fixture.ts`,
  `app/dev/board-3d/IslandPlayground.tsx`.
- [x] Recover local preview: port3011 had no listener and refused connections.
  Restarted Next dev as a hidden background process; verified HTTP200 and rendered
  island. Active server logs are in the user's Temp directory, outside the repo.

Browser review confirms the clean geometry and lower terrain in angled and top-down
views, with no permanent through-terrain effects and no console errors. Fifteen
focused selection/geometry/color compatibility tests and eight Board switching/
fallback tests passed. Changed-file ESLint, strict typecheck, production build, and
diff whitespace checks passed. This presentation-only correction used focused
regressions; the earlier full-suite result in §4.8 belongs to that prior iteration.
Further design options discussed: quieter tile borders, less saturated scenery,
subtle material-finish contrast, and an optional focus-pieces view; not implemented
in this iteration so the simpler direction can be evaluated on its own.

### 4.15 Primary 3D presentation — 2026-10-01 (committed 27c42de on 2026-10-17)

User approved making the new 3D design primary in the lobby and main game. This
supersedes the earlier opt-in/Classic-default rollout guidance above.

- [x] Default `lib/hooks/useBoardPresentation.ts` to 3D on both server and client,
  ignoring the retired stored Classic preference. The shared game HUD/player
  cards and dice follow this default. Graphics failure fallback is session-only;
  reloading retries 3D.
- [x] Hide the appearance switch in `components/board/BoardPresentation.tsx`,
  including the art preview. Preserve `BoardCanvas.tsx` and existing flat UI code
  for recovery and possible reuse. Graphics failure still permits play through
  the retained compatibility renderer without discarding pending placement.
- [x] Use the shared lazy 3D scene in `components/lobby/BoardPreview.tsx`, with
  the actual generated tiles, camera controls, and no legal gameplay targets.
  Keep the old preview in `components/lobby/ClassicBoardPreview.tsx` as the
  graphics failure fallback. Reserve layout space for generator controls in
  `components/lobby-view.tsx` so they do not cover camera controls or the island.
- [ ] **Deferred: retire retained non-3D presentation after the reuse decision.**
  Paths: `components/lobby/ClassicBoardPreview.tsx`,
  `components/board/BoardCanvas.tsx`, `components/board/BoardPresentation.tsx`,
  `components/game/ui/DiceDisplay.tsx`, `GameLayoutPanels.tsx`,
  `CompactGameStatus.tsx`, `components/game/player/CompactPlayerCard.tsx`,
  `lib/hooks/useBoardPresentation.ts`, and legacy-only assets/tests in
  `themes/tabletop/`. Acceptance: explicitly decide whether to archive or remove
  the old design, establish behavior for unsupported WebGL devices, remove only
  confirmed unused branches/assets, and keep shared game rules, IDs, interactions,
  and production feedback intact. Leave this code in place until then.

Validation: lint, standalone TypeScript, production build, and the final full
suite passed (616 tests across 115 files). The sandboxed build could not fetch
the existing Google fonts; the network-enabled build passed. The first full
test run was disrupted by a host stall and worker/test timeouts; all three
affected files passed focused reruns, followed by the clean full run above.
Browser review of the shared lobby preview and live board/player-panel components
at 1280×720 confirmed 3D rendering, visible camera controls, no appearance switch,
and no browser errors. The temporary visual fixture and its generated route
references were removed; TypeScript passed again after cleanup. No new animation
was introduced; OS reduced-motion and multiplayer playthrough checks were not
repeated for this default change. Validation covered the combined working tree;
checkpoint `27c42de` contains only the primary-3D rollout. The preceding
art, player-card, and Chronicle edits remain uncommitted.

## Acceptance gates

For any polish batch:

- `npm run lint`
- `npm run typecheck`
- Focused interaction/render tests
- `npm run test:run`
- `npm run build`
- Manual check with reduced motion enabled
