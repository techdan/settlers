# Turn Timer Implementation - Handoff Prompt

**Context**: You are implementing a turn timer feature for a Settlers of Catan web application. This is a comprehensive feature that adds lobby-configured time limits with per-player time banks, extensions, and obligation gating.

---

## Quick Start

1. **Read these documents in order**:
   - [docs/planning/turn-timer-spec.md](turn-timer-spec.md) - Functional specification
   - [docs/planning/turn-timer-implementation-plan.md](turn-timer-implementation-plan.md) - Detailed implementation guide

2. **Review the epic and beads**:
   - Epic: `SettlersOfLanc-eecc` - Turn Timer Implementation
   - Beads: `SettlersOfLanc-eecc.0` through `SettlersOfLanc-eecc.9` (10 phases)

3. **Start with Phase 0**: Preparation and codebase review

---

## Architecture Summary

### Key Design Principles

1. **Server-Authoritative Timing**
   - All timer state stored in database (`GameState`)
   - Server uses Unix timestamps for enforcement
   - Never trust client-side time calculations

2. **Optimistic Client Display**
   - Client calculates countdown: `(Date.now() - turnStartTime) / 1000`
   - When timer reaches 0, client immediately shows locked state
   - Buttons disabled, red pulsing timer, warning banner
   - **No waiting for server confirmation**

3. **Check-on-Action Enforcement**
   - Every game action calls `checkAndEnforceTimeout(roomId, gameState)`
   - If timeout detected, sets `gameState.timerLocked = true`
   - Persists to database, broadcasts via Supabase Realtime
   - **No background cron jobs needed**

4. **Timer Lifecycle**
   ```
   waiting_for_roll → Roll Dice → main_phase (timer STARTS)
     ↓
   Player builds/trades (timer running)
     ↓
   Timer hits 0 → Client shows locked state (optimistic)
     ↓
   Player tries to build → Server checks timeout → Sets timerLocked
     ↓
   Server rejects action: "Turn time expired"
     ↓
   Player clicks End Turn → Timer STOPS → Time bank refunded
     ↓
   Next player's turn → waiting_for_roll (timer paused)
   ```

### Data Model

**GameState additions** (`lib/types/game.ts`):
```typescript
interface GameState {
  // Timer config (copied from lobby)
  timerConfig?: {
    enabled: boolean;
    turnTimeLimit: number;        // Base seconds per turn
    timeBank: number;             // Total bank per player
    extensionIncrement: number;   // Seconds per extension request
    maxExtensionsPerTurn: number; // Max extensions per turn
    maxExtraSecondsPerTurn: number; // Max total borrowed per turn
  };

  // Active turn timer
  turnStartTime?: number;         // Unix timestamp (ms) when turn began
  turnTimeLimit?: number;         // Effective limit (base + extensions)
  timerLocked?: boolean;          // Is turn in locked state?

  // Per-player tracking
  playerTimeBanks?: Record<string, number>;  // Remaining seconds
  playerTotalTime?: Record<string, number>;  // Total seconds played

  // Current turn extension tracking
  currentTurnExtensions?: {
    count: number;                // Extensions requested this turn
    totalBorrowed: number;        // Total seconds borrowed this turn
  };
}
```

**Key Services**:
- `lib/services/timer-service.ts` - Timer start/stop, refund logic
- `lib/services/obligation-tracker.ts` - Centralized obligation detection
- `lib/services/game-service.ts` - Modified rollDice/endTurn

**Key Components**:
- `components/lobby/TimerConfigPanel.tsx` - Lobby timer settings
- `components/game/ui/TurnTimerBar.tsx` - Countdown display
- `components/game/ui/TimeBankDisplay.tsx` - Show remaining bank
- `components/game/ui/ExtensionRequestButton.tsx` - Request +60s
- `components/game/modals/WaitingOverlay.tsx` - Obligation blocking UI

---

## Implementation Phases

### Phase 0: Preparation (2-3 hours)
**Bead**: `SettlersOfLanc-eecc.0`

**Tasks**:
1. Review existing codebase architecture (see implementation plan for details)
2. Understand current turn flow: `rollDice()` → `endTurn()`
3. Review existing obligation tracking patterns (Commercial Harbor, Aqueduct)
4. Create feature branch: `git checkout -b feature/turn-timer`
5. Set up test environment with multiple browser tabs

**Key Files to Review**:
- `lib/services/game-service.ts` - Turn flow (rollDice, endTurn)
- `lib/types/game.ts` - GameState interface
- `lib/hooks/useGameSubscription.ts` - Realtime updates
- `components/game/ui/ActionControls.tsx` - Roll Dice / End Turn buttons

### Phase 1: Data Layer (4-6 hours)
**Bead**: `SettlersOfLanc-eecc.1`

**Tasks**:
1. Create `lib/types/timer.ts` with all timer types
2. Add `timerConfig` to `LobbyState` in `lib/types/lobby.ts`
3. Add timer fields to `GameState` in `lib/types/game.ts`
4. Update `createRoom()` to initialize timer config
5. Update `startGame()` to copy timer config and initialize player banks

**Reference**: Implementation plan Phase 1 (detailed code examples)

### Phase 2: Core Timer Service (6-8 hours)
**Bead**: `SettlersOfLanc-eecc.2`

**Tasks**:
1. Create `lib/services/timer-service.ts` with functions:
   - `startTurnTimer(gameState): GameState`
   - `stopTurnTimer(gameState, playerId): GameState`
   - `checkTimeout(gameState): boolean`
   - `getTimerStatus(gameState): TimerStatus`
   - `requestExtension(gameState, playerId): { success, newState?, error? }`
   - `canPerformOptionalAction(gameState, playerId): boolean`
2. Implement refund logic (only unused borrowed time refunded)
3. Write unit tests: `lib/services/timer-service.test.ts`

**Reference**: Implementation plan Phase 2 (complete code provided)

### Phase 3: Obligation Tracking (4-5 hours)
**Bead**: `SettlersOfLanc-eecc.3`

**Tasks**:
1. Create `lib/services/obligation-tracker.ts` with:
   - `getAllPendingObligations(gameState): Obligation[]`
   - `canRollDice(gameState): ObligationCheck`
   - `getObligationSummary(gameState, playerId): string`
2. Centralize detection for all obligations:
   - Discard after 7
   - Aqueduct selection
   - Commercial Harbor responses
   - Wedding gifts
   - Barbarian city selection
   - Knight displacement
   - Defender card draws
3. Write unit tests

**Reference**: Implementation plan Phase 3

### Phase 4: Game Service Integration (5-7 hours)
**Bead**: `SettlersOfLanc-eecc.4`

**Tasks**:
1. Add `checkAndEnforceTimeout()` helper to `game-service.ts`
2. Modify `rollDice()`:
   - Check obligations before allowing roll
   - Start timer when entering main_phase
3. Modify `endTurn()`:
   - Stop timer and refund unused time
4. Add timeout check to **ALL** game actions:
   - `buildSettlement`, `buildRoad`, `buildCity`
   - `playDevelopmentCard`, `buyDevelopmentCard`
   - `proposeTrade`, `acceptTrade`
   - etc.
5. Add `validateOptionalAction()` to reject locked actions
6. Create `requestTimeExtension()` action

**Pattern for all actions**:
```typescript
export async function anyAction(...) {
  let gameState = await getGameState();

  // Check and enforce timeout (lazy enforcement)
  gameState = await checkAndEnforceTimeout(roomId, gameState);

  // Validate if optional action
  validateOptionalAction(gameState, playerId);

  // ... perform action
}
```

**Reference**: Implementation plan Phase 4

### Phase 5: Lobby UI (3-4 hours)
**Bead**: `SettlersOfLanc-eecc.5`

**Tasks**:
1. Create `components/lobby/TimerConfigPanel.tsx`:
   - Toggle: Timer enabled/disabled
   - Presets: 60s, 90s, 120s, 180s (default), 300s, Custom
   - Custom slider: 30s-600s
   - Time bank slider: 0-900s
   - Advanced settings (collapsible): extension increment, max extensions
2. Integrate into `components/lobby-view.tsx`
3. Update lobby metadata sync
4. Show read-only config to non-host players

**Reference**: Implementation plan Phase 5 (complete component code provided)

### Phase 6: In-Game Timer UI (6-8 hours)
**Bead**: `SettlersOfLanc-eecc.6`

**Tasks**:
1. Create `lib/hooks/useTimerState.ts`:
   - Calculate countdown every second
   - Return `TimerStatus` object
2. Create `components/game/ui/TurnTimerBar.tsx`:
   - Progress bar showing time remaining
   - Color: green → yellow (60s) → orange (30s) → red pulsing (10s)
   - Display: "Your Turn" / "Their Turn" + MM:SS
   - Locked state banner
3. Create `components/game/ui/TimeBankDisplay.tsx`:
   - Compact: 🏦 2m (in player card)
   - Full: Time Bank + Total Played
4. Create `components/game/ui/ExtensionRequestButton.tsx`:
   - "+60s" button
   - Tooltip: "Request +60s? (2m 30s remaining in bank)"
   - Error handling
5. Update `components/game/player/CompactPlayerCard.tsx`:
   - Add timer bar (if active turn)
   - Add time bank display (compact)
6. Update `components/game/ui/ActionControls.tsx`:
   - Add extension button

**Reference**: Implementation plan Phase 6

### Phase 7: Obligation UI (3-4 hours)
**Bead**: `SettlersOfLanc-eecc.7`

**Tasks**:
1. Create `components/game/modals/WaitingOverlay.tsx`:
   - Full-screen overlay (backdrop blur)
   - List of blocking obligations
   - Highlight blocking player's obligation
   - "Everyone is waiting on you!" message
2. Update `components/game/ui/ActionControls.tsx`:
   - Check obligations before allowing roll dice
   - Disable "Roll Dice" if blocked
   - Show warning banner with waiting players
3. Integrate overlay into `GameController.tsx`

**Reference**: Implementation plan Phase 7

### Phase 8: Stats Display (1-2 hours)
**Bead**: `SettlersOfLanc-eecc.8`

**Tasks**:
1. Update `components/game/panels/StatsPanel.tsx`:
   - Add "Total Gameplay Time" row
   - Format: `${hours}h ${minutes}m` or `${minutes}m ${seconds}s`
2. Add tooltip to player cards showing total time played

**Reference**: Implementation plan Phase 8

### Phase 9: Testing & Polish (4-6 hours)
**Bead**: `SettlersOfLanc-eecc.9`

**Tasks**:
1. Create `docs/planning/timer-testing-checklist.md`
2. Manual testing with 4 players (use 4 browser tabs)
3. Test all scenarios in checklist:
   - Timer start/stop
   - Extensions and refunds
   - Timeout locking
   - Obligation gating
   - Edge cases
4. Write integration tests: `lib/services/timer-integration.test.ts`
5. Performance testing (realtime lag, action latency)
6. Bug fixes and polish

**Reference**: Implementation plan Phase 9 (complete testing checklist)

---

## Common Patterns

### Server-Side Pure Functions

All timer functions are pure (no side effects):
```typescript
// ✅ Good - pure function
export function startTurnTimer(gameState: GameState): GameState {
  return {
    ...gameState,
    turnStartTime: Date.now(),
    turnTimeLimit: gameState.timerConfig.turnTimeLimit,
  };
}

// ❌ Bad - mutates state
export function startTurnTimer(gameState: GameState) {
  gameState.turnStartTime = Date.now(); // Mutation!
}
```

### Check-on-Action Pattern

Every action follows this pattern:
```typescript
export async function someAction(roomId: string, playerId: string) {
  let gameState = await gameRepository.getGameStateByRoomId(roomId);

  // 1. Check and enforce timeout (sets timerLocked if expired)
  gameState = await checkAndEnforceTimeout(roomId, gameState);

  // 2. Validate action is allowed
  if (!canPerformOptionalAction(gameState, playerId)) {
    throw new Error('Turn time expired');
  }

  // 3. Perform action...
  const updatedState = { ...gameState, /* changes */ };

  // 4. Save and broadcast
  await gameRepository.updateGameState(roomId, updatedState);

  return updatedState;
}
```

### Client-Side Optimistic Display

```typescript
// Hook recalculates every second
export function useTimerState(gameState: GameState): TimerStatus {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [gameState.turnStartTime]);

  return getTimerStatus(gameState); // Pure calculation
}

// Component uses status
function ActionControls({ gameState, playerId }) {
  const timerStatus = useTimerState(gameState);

  // Optimistic locking (client-side)
  const isLocked = timerStatus.isExpired;

  return (
    <button disabled={isLocked || gameState.timerLocked}>
      Build Settlement
    </button>
  );
}
```

---

## Critical Implementation Notes

### 1. Refund Logic

**Only unused borrowed time is refunded, NOT base time**:

```typescript
// Example: 180s base limit, player requests +60s extension
// Turn ends after 200s

const baseLimit = 180;
const borrowed = 60;
const effectiveLimit = 240;
const elapsed = 200;

const unused = effectiveLimit - elapsed; // 40s
const refund = Math.min(unused, borrowed); // min(40, 60) = 40s

// Player gets 40s refunded to bank
```

### 2. Timer Only Runs During main_phase

Timer does NOT run during:
- `waiting_for_roll` (paused between turns)
- `discarding` (required obligation)
- `robber_placement` (required action)
- `aqueduct_selection` (async obligation from previous turn)

Timer ONLY runs:
- `main_phase` (from Roll Dice → End Turn)

### 3. Obligation Gating

Roll Dice is blocked if ANY obligation exists, even if it belongs to another player:

```typescript
// Player A has pending aqueduct selection
// Player B tries to roll dice → BLOCKED

const obligationCheck = canRollDice(gameState);
if (!obligationCheck.canRollDice) {
  throw new Error(`Waiting for: ${obligationCheck.waitingOn.join(', ')}`);
}
```

### 4. Locked State

When `timerLocked === true`:
- ✅ Can end turn
- ✅ Can complete required actions (place robber, steal, discard)
- ❌ Cannot build/trade/play dev cards
- ❌ Cannot propose trades
- ❌ Cannot buy dev cards

### 5. Realtime Synchronization

All state updates broadcast via Supabase Realtime:
```typescript
// Server updates game state
await gameRepository.updateGameState(roomId, newState);

// Database triggers Supabase Realtime
// WebSocket pushes to all connected clients
// Clients receive update via useGameSubscription hook
```

---

## Testing Strategy

### Unit Tests (Phase 2-3)

Test timer calculations:
```typescript
test('refunds unused borrowed time', () => {
  const state = {
    turnStartTime: Date.now() - 50000, // 50s ago
    turnTimeLimit: 180,
    currentTurnExtensions: { count: 1, totalBorrowed: 60 },
    playerTimeBanks: { player1: 240 },
  };

  const result = stopTurnTimer(state, 'player1');

  // Used 50s out of 240s, unused = 190s
  // But only 60s was borrowed, so refund 60s
  expect(result.playerTimeBanks.player1).toBe(300); // 240 + 60
});
```

### Integration Tests (Phase 9)

Test full turn cycle:
```typescript
test('complete turn cycle with timer', async () => {
  // Roll dice → timer starts
  const afterRoll = await rollDice(roomId, player1);
  expect(afterRoll.turnStartTime).toBeDefined();

  // Wait 2 seconds
  await sleep(2000);

  // End turn → timer stops, time tracked
  const afterEnd = await endTurn(roomId, player1);
  expect(afterEnd.turnStartTime).toBeUndefined();
  expect(afterEnd.playerTotalTime.player1).toBeGreaterThan(2);
});
```

### Manual Testing (Phase 9)

Use checklist in `docs/planning/timer-testing-checklist.md`:
- Setup: Timer enabled, disabled
- Timer flow: Start, countdown, stop
- Extensions: Request, reject (max reached), refund
- Timeout: Lock state, disabled buttons, End Turn allowed
- Obligations: Blocked roll, waiting overlay, resolution
- Edge cases: Disconnect, rapid actions, boundary conditions

---

## Troubleshooting

### Timer not starting
- Check `gameState.timerConfig?.enabled === true`
- Check phase is `main_phase` (not `waiting_for_roll`)
- Verify `startTurnTimer()` called in `rollDice()`

### Timer not stopping
- Check `stopTurnTimer()` called in `endTurn()`
- Verify `turnStartTime` cleared

### Refund incorrect
- Check `currentTurnExtensions.totalBorrowed` tracking
- Verify refund formula: `min(unused, borrowed)`
- Ensure refund only applies to borrowed time

### Locked state not enforcing
- Check `checkAndEnforceTimeout()` called in all actions
- Verify `canPerformOptionalAction()` validation
- Check client-side `isExpired` calculation

### Obligations not blocking
- Review `getAllPendingObligations()` for missing obligation types
- Check `canRollDice()` returns correct blocked state
- Verify obligation fields in `GameState` (pendingAqueduct, etc.)

---

## Success Criteria

Implementation is complete when:

- [ ] Timer visible to all players (not just active player)
- [ ] Timer shows warning colors (green/yellow/orange/red)
- [ ] Timer starts on Roll Dice, stops on End Turn
- [ ] Time banks track correctly with refunds
- [ ] Extensions work within limits
- [ ] Timeout locks optional actions (client + server)
- [ ] All obligations block Roll Dice
- [ ] Waiting overlay shows when blocked
- [ ] Stats panel shows total gameplay time
- [ ] All unit tests pass
- [ ] Manual testing checklist complete
- [ ] Zero game-breaking bugs
- [ ] Performance acceptable (<100ms action latency)

---

## Next Steps

1. **Start with Phase 0**: Create branch, review codebase
2. **Work sequentially**: Complete each phase before moving to next
3. **Test incrementally**: Test after each phase
4. **Commit frequently**: Use commit messages from implementation plan
5. **Ask questions**: If anything is unclear, refer to implementation plan or ask

**Good luck!** The implementation plan has complete code examples for every step. Follow it closely and you'll have a production-ready turn timer feature.
