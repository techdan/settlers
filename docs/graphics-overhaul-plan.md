# Graphics and Presentation Polish Plan

**Status:** Foundational graphics overhaul complete in v2.1; optional polish items remain
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

## Acceptance gates

For any polish batch:

- `npm run lint`
- `npm run typecheck`
- Focused interaction/render tests
- `npm run test:run`
- `npm run build`
- Manual check with reduced motion enabled
