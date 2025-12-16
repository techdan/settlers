# Start Turn Timer Implementation

You are implementing a turn timer feature for a Settlers of Catan web application. This adds lobby-configured time limits with per-player time banks, extensions, and obligation gating.

## Your Mission

Implement the Turn Timer feature by following the detailed plan in `docs/planning/turn-timer-implementation-plan.md`. Work through phases sequentially, starting with Phase 0 (Preparation).

## Essential Reading (in order)

1. **[docs/planning/turn-timer-spec.md](turn-timer-spec.md)** - What the feature does (functional spec)
2. **[docs/planning/turn-timer-implementation-plan.md](turn-timer-implementation-plan.md)** - How to build it (step-by-step guide with code)
3. **[docs/planning/turn-timer-implementation-handoff.md](turn-timer-implementation-handoff.md)** - Architecture overview and patterns

## Quick Architecture Overview

**Design**: Server-authoritative timing + client-side optimistic display + check-on-action enforcement (no cron needed).

**Flow**:
```
waiting_for_roll → Roll Dice → main_phase (timer STARTS at server timestamp)
  ↓
Player builds/trades (client shows live countdown)
  ↓
Timer hits 0 → Client immediately disables buttons (optimistic)
  ↓
Player tries action → Server checks timeout → Sets timerLocked → Rejects
  ↓
Player clicks End Turn → Timer STOPS → Refunds unused borrowed time
  ↓
Next turn → waiting_for_roll (paused between turns)
```

**Key Pattern** (used in every game action):
```typescript
export async function anyGameAction(roomId, playerId, ...) {
  let gameState = await getGameState();

  // Check and enforce timeout (lazy enforcement)
  gameState = await checkAndEnforceTimeout(roomId, gameState);

  // Validate action allowed (throws if locked)
  validateOptionalAction(gameState, playerId);

  // Perform action...
  await saveGameState(roomId, updatedState);
}
```

## Implementation Checklist (10 Phases)

Work through the beads in order:

- [ ] **Phase 0** (`SettlersOfLanc-eecc.0`): Preparation - Review codebase, create branch
- [ ] **Phase 1** (`SettlersOfLanc-eecc.1`): Data Layer - Add timer types and fields
- [ ] **Phase 2** (`SettlersOfLanc-eecc.2`): Core Timer Service - Start/stop/refund logic
- [ ] **Phase 3** (`SettlersOfLanc-eecc.3`): Obligation Tracking - Centralize obligation detection
- [ ] **Phase 4** (`SettlersOfLanc-eecc.4`): Game Service Integration - Add timeout checks to actions
- [ ] **Phase 5** (`SettlersOfLanc-eecc.5`): Lobby UI - Timer config panel
- [ ] **Phase 6** (`SettlersOfLanc-eecc.6`): In-Game Timer UI - Countdown, bank display, extension button
- [ ] **Phase 7** (`SettlersOfLanc-eecc.7`): Obligation UI - Waiting overlay for blocked players
- [ ] **Phase 8** (`SettlersOfLanc-eecc.8`): Stats Display - Total gameplay time
- [ ] **Phase 9** (`SettlersOfLanc-eecc.9`): Testing & Polish - Manual testing, edge cases, bug fixes

**Estimated Time**: 38-53 hours (5-7 days for one developer)

## Critical Design Decisions (Already Made)

✅ **Timer visible to all players** (not just active player)
✅ **Warning thresholds**: green → yellow (60s) → orange (30s) → red pulsing (10s)
✅ **Time bank transparency**: All players see everyone's remaining banks
✅ **Check-on-action enforcement**: No background cron jobs (simpler, works anywhere)
✅ **Optimistic client locking**: Buttons disable immediately when timer hits 0
✅ **Refund unused borrowed time**: Only borrowed time refunded, not base time

❌ **No obligation timeout**: Game breaks if player abandons, that's acceptable
❌ **No turn history**: Only track aggregate `playerTotalTime`
❌ **No disconnection handling**: Timer runs naturally, player can catch up when back

## Files You'll Create (15 new)

1. `lib/types/timer.ts` - Type definitions
2. `lib/services/timer-service.ts` - Timer logic
3. `lib/services/obligation-tracker.ts` - Obligation detection
4. `lib/hooks/useTimerState.ts` - Timer state hook
5. `components/lobby/TimerConfigPanel.tsx` - Lobby UI
6. `components/game/ui/TurnTimerBar.tsx` - Countdown display
7. `components/game/ui/TimeBankDisplay.tsx` - Bank display
8. `components/game/ui/ExtensionRequestButton.tsx` - Extension UI
9. `components/game/modals/WaitingOverlay.tsx` - Blocked overlay
10. `lib/services/timer-service.test.ts` - Unit tests
11. `lib/services/obligation-tracker.test.ts` - Unit tests
12. `lib/services/timer-integration.test.ts` - Integration tests
13. `docs/planning/timer-testing-checklist.md` - Manual test checklist
14-15. (Other supporting files)

## Files You'll Modify (8 existing)

1. `lib/types/lobby.ts` - Add timerConfig
2. `lib/types/game.ts` - Add timer state fields
3. `lib/repositories/room-repository.ts` - Initialize config
4. `lib/services/game-service.ts` - Integrate timer (most complex changes)
5. `components/lobby-view.tsx` - Add config panel
6. `components/game/player/CompactPlayerCard.tsx` - Add timer displays
7. `components/game/ui/ActionControls.tsx` - Add extension button, obligation checks
8. `components/game/GameController.tsx` - Add waiting overlay

## Getting Started

1. **Read the implementation plan**: `docs/planning/turn-timer-implementation-plan.md`
   - Has complete code examples for every function
   - Follow it step-by-step, commit frequently
   - Use the exact commit messages provided

2. **Start with Phase 0**:
   ```bash
   git checkout -b feature/turn-timer
   # Review codebase patterns
   # Read: lib/services/game-service.ts (rollDice, endTurn)
   # Read: lib/types/game.ts (GameState)
   # Read: lib/hooks/useGameSubscription.ts (realtime)
   ```

3. **Ask questions**: If anything is unclear, refer back to the implementation plan or handoff doc

## Success Criteria

You're done when:
- Timer works end-to-end (roll dice → countdown → end turn)
- Time banks track correctly with refunds
- Extensions work within limits
- Timeout locks optional actions
- Obligations block Roll Dice
- All tests pass
- Manual testing checklist complete

**Time Estimate**: Start with Phase 0 (2-3 hours), then Phase 1 (4-6 hours). Each phase has detailed estimates.

---

**Ready?** Read `docs/planning/turn-timer-implementation-plan.md` and start with Phase 0. Good luck!
