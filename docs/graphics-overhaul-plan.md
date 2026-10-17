# Graphics and Presentation Plan

**Reviewed:** 2026-10-17. **State:** 3D rollout and the completed polish batches are
committed; new UX enhancements and broader release checks remain.

This is the active presentation backlog. Infrastructure and correctness work,
including the deployed Cloudflare migration, is tracked separately in the
[codebase improvement plan](codebase-improvement-plan.md). The
[README](../README.md) is the project-wide status and navigation entry point.

## Completed baseline

| Area | Delivered behavior | Implementation commit |
|---|---|---|
| Shared 3D foundation | Original terrain/harbor/piece assets, canonical hit targets, shared board interaction owner, camera controls, 3D dice, confirmed production events, WebGL fallback, and development playground. | `7f113f1` |
| Primary presentation | 3D lobby and game default, old preference ignored, appearance switch hidden, legacy rendering retained for graphics failure. | `27c42de` |
| Scenery and board polish | Quieter terrain, clearer ivory pieces, slimmer roads and brighter legal-site guides, simplified view controls with keyboard actions. | `29183b4` |
| Player information | Rich public player cards, Details dialogs, timers, city-management affordances, and responsive game/player panels. | `29183b4` |
| Compact Chronicle | Playground reuses the shared GameLog, with compact chronological entries, player attribution, tooltips, and scrolling behavior. | `29183b4` |

These are completed implementations, not tasks awaiting another coding pass.
The latest documentation checkpoint is `9163bc3`. Full release QA remains
separate from implementation completion; see the checklist below.

## 4.12 Next presentation work

The section number is retained for existing references. This is the ordered UX
queue; it does not supersede the infrastructure migration's active priority.
Each item is **not started** unless a later entry records implementation evidence.

### UX-1 — Action dock redesign and next-action guidance

- [ ] **Next presentation batch.** Keep resources, commodities, build costs/actions,
  and trade together; make Roll / End Turn occupy a stable primary-action area.
- Paths: `components/game/ui/GameTray.tsx`,
  `components/game/ui/ActionControls.tsx`,
  `components/game/city/BuildControls.tsx`,
  `components/game/player/PlayerHand.tsx`,
  `components/board/three/BoardSceneHud.tsx`, and
  `components/board/three/scene-selection.ts`.
- Acceptance: show the next required action and explain unavailable actions;
  keep the board readable during choices; preserve all existing callbacks,
  optimistic behavior, busy guards, timer locks, and progress-card-panel gating
  of Roll / End Turn. Mandatory choices must remain reachable.
- Check at desktop, 1366×768 laptop, tablet, and narrow touch sizes. Verify
  keyboard navigation, pointer cursors, full resource/commodity hands, progress
  cards, and no action moving unexpectedly as explanatory content changes.
- Keep game rules and service contracts outside this presentation batch.

### UX-2 — Contextual board inspection and learning

- [ ] Add clear inspection for terrain yields, number likelihood, ports,
  settlement adjacency, and knight state.
- Paths: `components/board/three/BoardScene.tsx`,
  `components/board/three/BoardSceneHud.tsx`, shared board selectors/hooks, and
  existing tooltips/dialogs. Derive information from shared game data and rules.
- Acceptance: click, tap, and keyboard users can inspect the same information;
  inspection cannot trigger placement or steal input from a mandatory choice;
  scenery, tokens, valid-site highlights, and owner identity remain readable.
  Include Cities & Knights exceptions without duplicating rule logic.

### UX-3 — Expanded Chronicle and event feedback

- [ ] Connect confirmed production feedback to the receiving player card and
  refine live Chronicle feedback alongside Chat and Stats.
- Paths: `components/game/ui/SidebarTabs.tsx`,
  `components/game/ui/GameLog.tsx`, `components/game/ui/GameLayoutPanels.tsx`,
  `components/game/player/ThreePlayerCard.tsx`,
  `components/board/three/ProductionFeedback.tsx`, and `lib/presentation/`.
- Already delivered: shared compact GameLog and exact `lastProduction`-based
  board feedback. This task extends them; it does not reimplement dice motion
  or reconstruct awards from prose logs or generic hand-count changes.
- Acceptance: preserve Chat/Stats, rich rule explanations, public/private
  information boundaries, and follow-latest scrolling. Show exact confirmed
  awards once; reconnects and stale snapshots must not replay them. Never move
  the camera or delay authoritative state/input to complete an effect.

## Release QA — checks still to complete

These are validation tasks, not claims of known defects. Record viewport/device,
scenario, result, and any reproducible defect here when exercised.

- [ ] **Multiplayer base and C&K walkthroughs:** complete games across multiple
  clients, including reconnect/resync, stale/rejected actions, pending placements,
  timers, chat, victory, and graphics-fallback clients sharing a room with 3D
  clients. There is no longer a user-facing renderer switch to test.
- [ ] **Mandatory choices and crowded board interactions:** setup; roads,
  settlements, cities and walls; knight actions/displacement; robber/victim
  choice; merchant; Inventor, Diplomat, Engineer, Medicine, Smith, Intrigue,
  Taxation and Treason; Road Building; metropolis placement; barbarian city loss;
  discard, Aqueduct, defender rewards, and multiplayer progress-card choices.
  Check raycast IDs, camera drags versus clicks, touch, and fitted/minimum zoom.
- [ ] **Late-game/error presentation:** Taxation and Treason after the first
  barbarian attack, Aqueduct, timer expiry and exhausted extensions, game over,
  and remaining mandatory/error modal variants.
- [ ] **Latest combined UI accessibility pass:** OS-level reduced motion,
  keyboard focus/return, touch, resizing, and public Details dialogs. Earlier
  batches have browser/keyboard evidence; do not treat that as a complete new
  OS/device-level pass after later changes.
- [ ] **Reference-device performance and recovery:** measure active frame rate,
  draw calls, transferred assets, and idle/hidden-tab rendering on named laptop
  and tablet hardware. Check initialization failure, context loss, asset-load
  failure, and GPU resource cleanup. The historical 60/30 FPS goals were proposed
  targets, not established guarantees.

Relevant paths: `components/board/__tests__/`, `components/board/three/`,
`components/game/`, `lib/hooks/`, and `app/dev/viewports/`. If a check exposes a
bug, add a scoped item with concrete paths and acceptance criteria to this plan
or the codebase plan, according to ownership.

## Optional later work and cleanup

- [ ] **Additional confirmed-event motion:** barbarian travel, knight/robber
  movement, and a brief metropolis-award effect. Paths:
  `components/board/three/BoardScene.tsx`, `components/board/three/`, and
  `lib/presentation/`. Acceptance: use authoritative outcomes, cancel stale
  effects, honor reduced motion, avoid forced camera travel, and keep input and
  timers independent of animation. Existing dice/placement/production effects
  are already implemented.
- [ ] **Retained non-3D code:** decide whether to keep or retire it after the
  reuse decision. Paths: `components/lobby/ClassicBoardPreview.tsx`,
  `components/board/BoardCanvas.tsx`, `components/board/BoardPresentation.tsx`,
  `components/game/ui/DiceDisplay.tsx`, `components/game/ui/GameLayoutPanels.tsx`,
  `components/game/ui/CompactGameStatus.tsx`,
  `components/game/player/CompactPlayerCard.tsx`,
  `lib/hooks/useBoardPresentation.ts`, and legacy-only assets/tests in
  `themes/tabletop/`. Acceptance: explicitly establish unsupported-WebGL
  behavior before removal, confirm unused branches/assets with reference scans,
  and preserve shared rules, IDs, interactions, and production feedback.
  **Leave the code in place until that decision.**
- [ ] **Legacy icon assets:** re-scan `public/icons/` and its references before
  removal; preserve licensing/attribution for surviving material. The original
  icon-retirement work is historical, not permission to delete current assets.

## 4.15 Current presentation policy

This section number is retained for the reference in `useBoardPresentation.ts`.
3D is primary in both lobby and game. Classic is hidden from normal selection
and retained as an automatic graphics-failure fallback. Fallback lasts for the
current client session; reloading retries 3D. Presentation is never synchronized
as room/game state.

Keep one game controller, subscription flow, optimistic-state owner, and Board
interaction owner. Both renderers consume the same canonical entities, valid
sites, pending placement, and callbacks. A graphics failure must not submit an
action, lose a selection, duplicate an in-flight confirmation, or unmount the
shared game controller. Camera/hover state may reset.

Use original assets and the established miniature/harbor visual direction.
Preserve 3D detail, ownership contrast, fitted-board readability, and semantic
HTML controls. Render on demand when idle; bound expensive effects and avoid
layout shifts. Animation presents server-selected results and never determines
outcomes or postpones mandatory player choices.

## Validation record and completion rules

The combined committed presentation baseline last passed **616 tests across 115
files**, full lint, standalone TypeScript, production build, and browser review.
The full-suite rerun was clean after earlier host-stall timeouts. Browser review
covered the shared lobby/live components; player-card work also covered laptop,
tablet, narrow viewports, and keyboard Details behavior. This evidence belongs
to the committed baseline, not later in-progress hosting/dependency changes.

For each implementation batch, run lint, typecheck, appropriate focused tests,
the full suite, and the production build for the runtime being changed. Inspect
actual WebGL output and relevant keyboard/touch/reduced-motion behavior; DOM
assertions alone do not establish rendering or picking correctness. Record any
unperformed release checks without marking them complete.

Mark implemented work complete with its commit hash once committed. Keep this
active document short: current behavior, open tasks with paths and acceptance,
and current validation limits. Move detailed execution history to the archive.

## Historical records

- [3D proposal, iterations, and checkpoint evidence through 2026-10-17](archive/graphics-overhaul-plan-3d-checkpoint-2026-10-17.md).
  Its old opt-in/default instructions and broad unchecked implementation gates
  are superseded by this document; outstanding QA has been carried forward above.
- [Foundational v2.1 graphics execution plan](archive/graphics-overhaul-plan-v2.1.md).
