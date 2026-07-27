# Turn Timer Implementation Plan (Archived)

**Status:** Historical implementation plan; the feature is implemented in v2.1.

## Executive Summary

This plan provides step-by-step implementation guidance for adding a turn timer feature to Settlers of Catan, based on the retained requirements in [turn-timer-spec.md](../../planning/turn-timer-spec.md). The feature adds lobby-configured turn time limits, per-player time banks, and global obligation gating while preserving the "pause anytime" workflow.

**Target Audience**: Junior to mid-level developers
**Estimated Complexity**: Medium-High (15-20 implementation units)
**Core Dependencies**: Existing game service layer, Supabase realtime, React UI components

---

## Table of Contents

1. [Proposed Spec Improvements](#proposed-spec-improvements)
2. [Architecture Overview](#architecture-overview)
3. [Data Model Changes](#data-model-changes)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Rollout Plan](#rollout-plan)

---

## Spec Enhancements (Approved)

The following enhancements have been added to the specification:

### 1. Timer Visibility to All Players ✅
- All players see the active player's timer countdown (not just the active player)
- Increases social pressure and reduces confusion about game state
- Implementation: Minimal (render timer in all player cards)

### 2. Warning Thresholds ✅
- Visual warnings at time thresholds:
  - 60s remaining: Yellow highlight
  - 30s remaining: Orange highlight
  - 10s remaining: Red pulsing
- Reduces accidental timeouts
- Implementation: Low (CSS animations + conditional styling)

### 3. Time Bank Transparency ✅
- All players can see everyone's remaining time bank balances
- Provides social contract enforcement
- Implementation: Minimal (display existing state)

### 4. Extension Request Confirmation ✅
- Tooltip shows: "Request +60s? (2m 30s remaining in bank)"
- Prevents accidental clicks
- Implementation: Minimal (tooltip component)

## Explicitly Excluded from V1

### 1. Obligation Timeout ❌
**Reason**: Not needed. If a player stops responding to obligations, the game effectively breaks regardless of timer. Players can abandon the room and start a new game. No auto-resolution needed.

### 2. Historical Turn Tracking ❌
**Reason**: Game doesn't track detailed history, only aggregate stats. Adding per-turn history would bloat the JSON state. Only track `playerTotalTime` aggregates.

### 3. Disconnection Handling ❌
**Reason**:
- Simplified approach: Timer continues running if player disconnects/walks away
- When timer hits 0, turn enters locked state
- Player can complete required actions and end turn when they return
- No need to track WebSocket connection status
- Works for both disconnects AND AFK scenarios

---

## Architecture Overview

### High-Level Design Principles

1. **Server-Authoritative Timing**: All timer logic runs server-side using database timestamps
2. **Optimistic Client Display**: Clients calculate countdown and show locked state immediately, server validates on action
3. **Check-on-Action Enforcement**: Timer checked on each game action (no background cron needed)
4. **Extend Existing Patterns**: Follow current obligation tracking and phase validation patterns
5. **Zero Trust**: Never trust client-side time calculations for enforcement

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  TurnTimerBar    │  │ PlayerTimeBank   │  │ TimeExtend   │ │
│  │  (countdown UI)  │  │  (bank display)  │  │   Button     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          useTimerState Hook (client-side calc)           │  │
│  │  - Derives countdown from server timestamp + limit       │  │
│  │  - Re-renders every second                               │  │
│  │  - Shows warning colors based on threshold               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Supabase Realtime (WebSocket)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Server Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               timer-service.ts (NEW)                     │  │
│  │  - startTurnTimer(gameState, playerId)                   │  │
│  │  - stopTurnTimer(gameState, playerId)                    │  │
│  │  - checkTimeout(gameState): boolean                      │  │
│  │  - requestExtension(gameState, playerId, seconds)        │  │
│  │  - refundUnusedTime(gameState, playerId)                 │  │
│  │  - canPerformAction(gameState, playerId): boolean        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          obligation-tracker.ts (NEW)                     │  │
│  │  - getAllPendingObligations(gameState): Obligation[]    │  │
│  │  - canRollDice(gameState): { allowed, blockedBy }       │  │
│  │  - getObligationSummary(gameState, playerId): string    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         game-service.ts (MODIFIED)                       │  │
│  │  - rollDice(): Check obligations + start timer           │  │
│  │  - endTurn(): Stop timer + refund + reset                │  │
│  │  - All actions: Validate timer not locked                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Flow Diagram

```
┌─────────────────┐
│  Lobby Setup    │
│  - Timer: 180s  │
│  - Bank: 300s   │
└────────┬────────┘
         │
         │ Host clicks "Start Game"
         ▼
┌─────────────────┐
│  Game Created   │
│  - timerConfig  │
│  - playerBanks  │
└────────┬────────┘
         │
         │ Player A's turn
         ▼
┌─────────────────────┐
│ waiting_for_roll    │
│ - No timer active   │ ◄──┐
└────────┬────────────┘    │
         │                 │
         │ Click "Roll Dice"   │ Player C ends turn
         ▼                 │
┌─────────────────────┐    │
│  main_phase         │    │
│  - Timer STARTS     │    │
│  - turnStartTime =  │    │
│    Date.now()       │    │
└────────┬────────────┘    │
         │                 │
         │ Player builds, trades, etc.
         │                 │
         │ Time reaches 0  │
         ▼                 │
┌─────────────────────┐    │
│  Timeout Locked     │    │
│  - No new optional  │    │
│    actions allowed  │    │
└────────┬────────────┘    │
         │                 │
         │ Player clicks "End Turn"
         ▼                 │
┌─────────────────────┐    │
│  Timer STOPS        │    │
│  - Calc used time   │    │
│  - Refund unused    │    │
│  - Update bank      │    │
│  - Phase →          │    │
│    waiting_for_roll │────┘
└─────────────────────┘
```

---

## Data Model Changes

### 1. Lobby State (Pre-Game)

**File**: `lib/types/lobby.ts`

**Add to `LobbyState` interface**:

```typescript
export interface LobbyState {
  // ... existing fields

  // Timer configuration (added)
  timerConfig?: {
    enabled: boolean;              // Is timer feature turned on?
    turnTimeLimit: number;         // Seconds per turn (default: 180)
    timeBank: number;              // Per-player bank in seconds (default: 300)
    extensionIncrement: number;    // Seconds per extension request (default: 60)
    maxExtensionsPerTurn: number;  // Max extensions per turn (default: 2)
    maxExtraSecondsPerTurn: number; // Max total extension per turn (default: 180)
  };
}
```

**Default values** (set when room created):
```typescript
const DEFAULT_TIMER_CONFIG = {
  enabled: false,  // Opt-in
  turnTimeLimit: 180,
  timeBank: 300,
  extensionIncrement: 60,
  maxExtensionsPerTurn: 2,
  maxExtraSecondsPerTurn: 180,
};
```

### 2. Game State (In-Game)

**File**: `lib/types/game.ts`

**Add to `GameState` interface**:

```typescript
export interface GameState {
  // ... existing fields

  // Timer state (added)
  timerConfig?: {
    enabled: boolean;
    turnTimeLimit: number;
    timeBank: number;
    extensionIncrement: number;
    maxExtensionsPerTurn: number;
    maxExtraSecondsPerTurn: number;
  };

  // Current turn timer
  turnStartTime?: number;          // Unix timestamp (ms) when turn began
  turnTimeLimit?: number;          // Effective limit for current turn (base + extensions)
  timerLocked?: boolean;           // Is turn in locked state (timeout reached)?

  // Per-player time tracking
  playerTimeBanks?: Record<string, number>;  // Remaining bank per player (seconds)
  playerTotalTime?: Record<string, number>;  // Total time played per player (seconds)

  // Extension tracking (current turn only)
  currentTurnExtensions?: {
    count: number;                 // How many extensions requested this turn
    totalBorrowed: number;         // Total seconds borrowed this turn
  };
}
```

**Migration Strategy**: These fields are optional (`?`), so existing games won't break. When timer is disabled, fields are undefined.

### 3. Player State

**File**: `lib/types/player.ts`

**Option A: No changes** (store everything in GameState.playerTimeBanks)
**Option B: Add fields to PlayerState** (denormalized for easier access)

**Recommendation**: Option A. Keep player state clean. Access via `gameState.playerTimeBanks[playerId]`.

### 4. New Types

**File**: `lib/types/timer.ts` (NEW)

```typescript
export interface TimerStatus {
  isActive: boolean;           // Is timer currently running?
  startTime: number;           // When timer started (ms)
  timeLimit: number;           // Total time allowed (seconds)
  timeElapsed: number;         // Seconds elapsed
  timeRemaining: number;       // Seconds remaining (can be negative)
  isExpired: boolean;          // Has timer run out?
  isLocked: boolean;           // Are optional actions locked?
}

export interface TimeBank {
  playerId: string;
  remaining: number;           // Seconds left in bank
  used: number;                // Total seconds used this game
}

export interface Obligation {
  type: ObligationType;
  playerId: string;           // Who must act
  description: string;        // Human-readable summary
  isBlocking: boolean;        // Does it block roll dice?
  isDependency: boolean;      // Does it block current player's decisions?
}

export type ObligationType =
  | 'discard_after_seven'
  | 'robber_placement'
  | 'robber_steal'
  | 'aqueduct_selection'
  | 'commercial_harbor_response'
  | 'wedding_gift'
  | 'barbarian_city_selection'
  | 'knight_displacement'
  | 'defender_card_draw'
  | 'progress_card_over_limit';

export interface ObligationCheck {
  canRollDice: boolean;
  blockedBy: Obligation[];     // List of blocking obligations
  waitingOn: string[];         // Player IDs who must act
}
```

### 5. Database Schema

**File**: `lib/db/schema.ts`

**No changes required!** All timer state lives in the `games.state` JSON column (existing pattern).

**Why**:
- Game state already serialized as JSON
- Timer fields are optional
- No new relational queries needed

---

## Implementation Phases

### Phase 0: Preparation (2-3 hours)
- Review existing codebase patterns
- Set up test game room for manual testing
- Create feature branch: `feature/turn-timer`

### Phase 1: Data Layer (4-6 hours)
- Add TypeScript types
- Add lobby timer configuration
- Add game state timer fields
- Write migration/initialization logic

### Phase 2: Core Timer Service (6-8 hours)
- Create `timer-service.ts`
- Implement timer start/stop logic
- Implement timeout checking (client-side calculation)
- Implement time bank operations
- Write unit tests

### Phase 3: Obligation Tracking (4-5 hours)
- Create `obligation-tracker.ts`
- Centralize all obligation detection
- Implement "canRollDice" gating logic
- Write unit tests

### Phase 4: Game Service Integration (5-7 hours)
- Modify `rollDice()` to check obligations and start timer
- Modify `endTurn()` to stop timer and refund
- Add timer validation to all optional actions (check-on-action enforcement)
- Add locked state enforcement

### Phase 5: Lobby UI (3-4 hours)
- Add timer toggle to lobby
- Add timer preset selector
- Add time bank configuration
- Update "Start Game" to pass config

### Phase 6: In-Game Timer UI (6-8 hours)
- Create `TurnTimerBar` component (visible to all players)
- Create `PlayerTimeBankDisplay` component
- Create `ExtensionRequestButton` component
- Update player cards to show timer/bank
- Add warning color states (yellow/orange/red)
- Implement optimistic client-side locking (disable buttons at 0:00)

### Phase 7: Obligation UI (3-4 hours)
- Create "Waiting on players..." overlay
- Add blocked roll notification
- Update existing obligation modals with urgency indicators

### Phase 8: Stats Display (1-2 hours)
- Add total gameplay time to stats panel
- Add per-player time to player cards

### Phase 9: Testing & Polish (4-6 hours)
- End-to-end testing with multiple players
- Edge case testing (rapid actions, boundary conditions)
- Performance testing (realtime updates)
- Bug fixes and polish

**Total Estimated Time**: 38-53 hours (5-7 days for one developer)

---

## Detailed Implementation Steps

### Phase 1: Data Layer

#### Step 1.1: Create Timer Types

**File**: `lib/types/timer.ts` (NEW)

```typescript
export interface TimerConfig {
  enabled: boolean;
  turnTimeLimit: number;
  timeBank: number;
  extensionIncrement: number;
  maxExtensionsPerTurn: number;
  maxExtraSecondsPerTurn: number;
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  enabled: false,
  turnTimeLimit: 180,
  timeBank: 300,
  extensionIncrement: 60,
  maxExtensionsPerTurn: 2,
  maxExtraSecondsPerTurn: 180,
};

export const TIMER_PRESETS = [
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '120s', value: 120 },
  { label: '180s', value: 180 },
  { label: '300s', value: 300 },
  { label: 'Custom', value: -1 },
];

// (Include other interfaces from "New Types" section above)
```

**Commit**: "Add timer type definitions"

#### Step 1.2: Update Lobby State

**File**: `lib/types/lobby.ts`

Add `timerConfig?: TimerConfig` to `LobbyState` interface.

**File**: `lib/repositories/room-repository.ts`

Update `createRoom()` to initialize with default timer config:

```typescript
export async function createRoom(hostPlayerId: string, hostPlayerName: string) {
  const roomCode = generateRoomCode();

  const metadata: LobbyState = {
    host: hostPlayerId,
    players: [{ id: hostPlayerId, name: hostPlayerName, color: 'red', isHost: true }],
    gameMode: 'base',
    timerConfig: DEFAULT_TIMER_CONFIG,  // NEW
  };

  // ... rest of function
}
```

**Commit**: "Add timer config to lobby state"

#### Step 1.3: Update Game State

**File**: `lib/types/game.ts`

Add timer fields to `GameState` interface (see "Data Model Changes" section).

**File**: `lib/services/game-service.ts`

Update `startGame()` to initialize timer state:

```typescript
export async function startGame(roomId: string, playerId: string) {
  // ... existing validation

  const lobby = await roomRepository.getRoomByCode(roomId);
  const timerConfig = lobby.metadata.timerConfig;

  const initialState: GameState = {
    // ... existing initialization

    // Timer initialization
    timerConfig: timerConfig?.enabled ? timerConfig : undefined,
    playerTimeBanks: timerConfig?.enabled
      ? Object.fromEntries(
          lobby.metadata.players.map(p => [p.id, timerConfig.timeBank])
        )
      : undefined,
    playerTotalTime: timerConfig?.enabled
      ? Object.fromEntries(
          lobby.metadata.players.map(p => [p.id, 0])
        )
      : undefined,
  };

  // ... save and return
}
```

**Commit**: "Initialize timer state on game start"

---

### Phase 2: Core Timer Service

#### Step 2.1: Create Timer Service

**File**: `lib/services/timer-service.ts` (NEW)

```typescript
import { GameState } from '@/lib/types/game';
import { TimerStatus } from '@/lib/types/timer';

/**
 * Timer Service
 *
 * Handles all turn timer logic. All functions are pure (no side effects).
 * State mutations are returned, not applied.
 */

/**
 * Start the turn timer for the current player.
 * Should be called when phase transitions to main_phase after rolling dice.
 */
export function startTurnTimer(gameState: GameState): GameState {
  if (!gameState.timerConfig?.enabled) {
    return gameState; // Timer disabled, no-op
  }

  const now = Date.now();

  return {
    ...gameState,
    turnStartTime: now,
    turnTimeLimit: gameState.timerConfig.turnTimeLimit,
    currentTurnExtensions: {
      count: 0,
      totalBorrowed: 0,
    },
  };
}

/**
 * Stop the turn timer and update time banks.
 * Should be called when turn ends.
 *
 * Returns updated game state with:
 * - Player's time bank adjusted (refund if time left)
 * - Player's total time incremented
 * - Turn start time cleared
 */
export function stopTurnTimer(
  gameState: GameState,
  playerId: string
): GameState {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return gameState; // Timer not active
  }

  const now = Date.now();
  const elapsedMs = now - gameState.turnStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Calculate refund
  const baseLimit = gameState.timerConfig.turnTimeLimit;
  const borrowed = gameState.currentTurnExtensions?.totalBorrowed || 0;
  const effectiveLimit = baseLimit + borrowed;
  const unusedTime = Math.max(0, effectiveLimit - elapsedSeconds);

  // Refund only applies to borrowed time
  const refund = Math.min(unusedTime, borrowed);
  const netCost = borrowed - refund;

  // Update time bank
  const currentBank = gameState.playerTimeBanks?.[playerId] || 0;
  const newBank = currentBank + refund;

  // Update total time played
  const currentTotal = gameState.playerTotalTime?.[playerId] || 0;
  const newTotal = currentTotal + elapsedSeconds;

  return {
    ...gameState,
    turnStartTime: undefined,
    turnTimeLimit: undefined,
    currentTurnExtensions: undefined,
    playerTimeBanks: {
      ...gameState.playerTimeBanks,
      [playerId]: newBank,
    },
    playerTotalTime: {
      ...gameState.playerTotalTime,
      [playerId]: newTotal,
    },
    // Optional: Add to turn history
    turnHistory: [
      ...(gameState.turnHistory || []),
      {
        playerId,
        turnNumber: gameState.turnHistory?.length || 0,
        startTime: gameState.turnStartTime,
        endTime: now,
        duration: elapsedSeconds,
        timedOut: false, // Will be set by timeout handler
      },
    ],
  };
}

/**
 * Check if the current turn timer has expired.
 */
export function checkTimeout(gameState: GameState): boolean {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return false;
  }

  const status = getTimerStatus(gameState);
  return status.isExpired;
}

/**
 * Get the current timer status (for UI display).
 */
export function getTimerStatus(gameState: GameState): TimerStatus {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return {
      isActive: false,
      startTime: 0,
      timeLimit: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      isExpired: false,
      isLocked: false,
    };
  }

  const now = Date.now();
  const elapsedMs = now - gameState.turnStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const baseLimit = gameState.timerConfig.turnTimeLimit;
  const borrowed = gameState.currentTurnExtensions?.totalBorrowed || 0;
  const effectiveLimit = baseLimit + borrowed;

  const remainingSeconds = effectiveLimit - elapsedSeconds;
  const isExpired = remainingSeconds <= 0;

  return {
    isActive: true,
    startTime: gameState.turnStartTime,
    timeLimit: effectiveLimit,
    timeElapsed: elapsedSeconds,
    timeRemaining: Math.max(0, remainingSeconds),
    isExpired,
    isLocked: isExpired,
  };
}

/**
 * Request a time extension.
 *
 * Returns:
 * - { success: true, newState } if allowed
 * - { success: false, error } if not allowed
 */
export function requestExtension(
  gameState: GameState,
  playerId: string
): { success: boolean; newState?: GameState; error?: string } {
  if (!gameState.timerConfig?.enabled) {
    return { success: false, error: 'Timer not enabled' };
  }

  if (gameState.currentTurn !== playerId) {
    return { success: false, error: 'Not your turn' };
  }

  const config = gameState.timerConfig;
  const extensions = gameState.currentTurnExtensions || { count: 0, totalBorrowed: 0 };
  const bank = gameState.playerTimeBanks?.[playerId] || 0;

  // Check extension count limit
  if (extensions.count >= config.maxExtensionsPerTurn) {
    return {
      success: false,
      error: `Maximum ${config.maxExtensionsPerTurn} extensions per turn`,
    };
  }

  // Check total borrowed limit
  const newTotalBorrowed = extensions.totalBorrowed + config.extensionIncrement;
  if (newTotalBorrowed > config.maxExtraSecondsPerTurn) {
    return {
      success: false,
      error: `Maximum ${config.maxExtraSecondsPerTurn}s extra time per turn`,
    };
  }

  // Check time bank balance
  if (bank < config.extensionIncrement) {
    return {
      success: false,
      error: `Insufficient time bank (need ${config.extensionIncrement}s, have ${bank}s)`,
    };
  }

  // Grant extension
  const newState: GameState = {
    ...gameState,
    currentTurnExtensions: {
      count: extensions.count + 1,
      totalBorrowed: newTotalBorrowed,
    },
    playerTimeBanks: {
      ...gameState.playerTimeBanks,
      [playerId]: bank - config.extensionIncrement,
    },
  };

  return { success: true, newState };
}

/**
 * Check if a player can perform an optional action.
 *
 * Returns false if turn is timed out (locked state).
 */
export function canPerformOptionalAction(
  gameState: GameState,
  playerId: string
): boolean {
  if (gameState.currentTurn !== playerId) {
    return false; // Not their turn
  }

  if (!gameState.timerConfig?.enabled) {
    return true; // Timer disabled, always allowed
  }

  const status = getTimerStatus(gameState);
  return !status.isLocked;
}

/**
 * Check if the current player can end their turn.
 *
 * Even in locked state, player can end turn (required action).
 */
export function canEndTurn(gameState: GameState, playerId: string): boolean {
  // Timer doesn't block ending turn - that's enforced by obligation checks
  return true;
}
```

**Commit**: "Add timer service with start/stop/extension logic"

#### Step 2.2: Write Timer Service Tests

**File**: `lib/services/timer-service.test.ts` (NEW)

```typescript
import { describe, expect, test } from '@jest/globals';
import { GameState } from '@/lib/types/game';
import {
  startTurnTimer,
  stopTurnTimer,
  checkTimeout,
  getTimerStatus,
  requestExtension,
  canPerformOptionalAction,
} from './timer-service';

describe('timer-service', () => {
  const mockGameState: GameState = {
    // ... minimal valid game state
    currentTurn: 'player1',
    timerConfig: {
      enabled: true,
      turnTimeLimit: 180,
      timeBank: 300,
      extensionIncrement: 60,
      maxExtensionsPerTurn: 2,
      maxExtraSecondsPerTurn: 180,
    },
    playerTimeBanks: {
      player1: 300,
      player2: 300,
    },
    playerTotalTime: {
      player1: 0,
      player2: 0,
    },
  };

  describe('startTurnTimer', () => {
    test('sets turnStartTime and initializes extensions', () => {
      const result = startTurnTimer(mockGameState);

      expect(result.turnStartTime).toBeDefined();
      expect(result.turnTimeLimit).toBe(180);
      expect(result.currentTurnExtensions).toEqual({
        count: 0,
        totalBorrowed: 0,
      });
    });

    test('does nothing if timer disabled', () => {
      const disabledState = { ...mockGameState, timerConfig: undefined };
      const result = startTurnTimer(disabledState);

      expect(result.turnStartTime).toBeUndefined();
    });
  });

  describe('stopTurnTimer', () => {
    test('calculates elapsed time and updates total', () => {
      const startTime = Date.now() - 45000; // 45 seconds ago
      const state = {
        ...mockGameState,
        turnStartTime: startTime,
        currentTurnExtensions: { count: 0, totalBorrowed: 0 },
      };

      const result = stopTurnTimer(state, 'player1');

      expect(result.turnStartTime).toBeUndefined();
      expect(result.playerTotalTime?.player1).toBeGreaterThanOrEqual(45);
      expect(result.playerTotalTime?.player1).toBeLessThan(50); // Allow for timing variance
    });

    test('refunds unused borrowed time', () => {
      const startTime = Date.now() - 50000; // 50 seconds ago
      const state = {
        ...mockGameState,
        turnStartTime: startTime,
        turnTimeLimit: 180,
        currentTurnExtensions: { count: 1, totalBorrowed: 60 },
        playerTimeBanks: { ...mockGameState.playerTimeBanks, player1: 240 }, // Already deducted 60
      };

      const result = stopTurnTimer(state, 'player1');

      // Used 50s out of 180+60=240s allowed
      // Unused: 190s, but only 60s was borrowed, so refund 60s
      expect(result.playerTimeBanks?.player1).toBe(240 + 60); // Full refund
    });

    test('does not refund if all time used', () => {
      const startTime = Date.now() - 250000; // 250 seconds ago
      const state = {
        ...mockGameState,
        turnStartTime: startTime,
        turnTimeLimit: 180,
        currentTurnExtensions: { count: 1, totalBorrowed: 60 },
        playerTimeBanks: { ...mockGameState.playerTimeBanks, player1: 240 },
      };

      const result = stopTurnTimer(state, 'player1');

      // Used 250s, limit was 240s, no refund
      expect(result.playerTimeBanks?.player1).toBe(240); // No change
    });
  });

  describe('requestExtension', () => {
    test('grants extension if allowed', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now(),
        currentTurnExtensions: { count: 0, totalBorrowed: 0 },
      };

      const result = requestExtension(state, 'player1');

      expect(result.success).toBe(true);
      expect(result.newState?.currentTurnExtensions).toEqual({
        count: 1,
        totalBorrowed: 60,
      });
      expect(result.newState?.playerTimeBanks?.player1).toBe(240); // 300 - 60
    });

    test('rejects if max extensions reached', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now(),
        currentTurnExtensions: { count: 2, totalBorrowed: 120 },
      };

      const result = requestExtension(state, 'player1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 2 extensions');
    });

    test('rejects if insufficient time bank', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now(),
        playerTimeBanks: { ...mockGameState.playerTimeBanks, player1: 30 },
      };

      const result = requestExtension(state, 'player1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient time bank');
    });
  });

  describe('checkTimeout', () => {
    test('returns true if time expired', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now() - 200000, // 200 seconds ago
        turnTimeLimit: 180,
      };

      expect(checkTimeout(state)).toBe(true);
    });

    test('returns false if time remaining', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now() - 50000, // 50 seconds ago
        turnTimeLimit: 180,
      };

      expect(checkTimeout(state)).toBe(false);
    });
  });

  describe('canPerformOptionalAction', () => {
    test('returns false if timer expired', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now() - 200000,
        turnTimeLimit: 180,
      };

      expect(canPerformOptionalAction(state, 'player1')).toBe(false);
    });

    test('returns true if time remaining', () => {
      const state = {
        ...mockGameState,
        turnStartTime: Date.now() - 50000,
        turnTimeLimit: 180,
      };

      expect(canPerformOptionalAction(state, 'player1')).toBe(true);
    });
  });
});
```

**Run tests**: `npm test timer-service`

**Commit**: "Add timer service unit tests"

---

### Phase 3: Obligation Tracking

#### Step 3.1: Create Obligation Tracker

**File**: `lib/services/obligation-tracker.ts` (NEW)

```typescript
import { GameState } from '@/lib/types/game';
import { Obligation, ObligationCheck } from '@/lib/types/timer';

/**
 * Obligation Tracker
 *
 * Centralizes all logic for detecting pending obligations
 * and determining if "Roll Dice" can proceed.
 */

/**
 * Get all pending obligations in the game.
 */
export function getAllPendingObligations(gameState: GameState): Obligation[] {
  const obligations: Obligation[] = [];

  // 1. Discard after rolling a 7
  if (gameState.phase === 'discarding') {
    const playersWhoMustDiscard = gameState.players.filter(
      p => !p.discardedThisTurn && needsToDiscard(p, gameState)
    );

    playersWhoMustDiscard.forEach(player => {
      obligations.push({
        type: 'discard_after_seven',
        playerId: player.id,
        description: `${player.name} must discard to 7 cards`,
        isBlocking: true,
        isDependency: true, // Blocks robber placement
      });
    });
  }

  // 2. Robber placement (after discards complete)
  if (gameState.phase === 'robber_placement') {
    obligations.push({
      type: 'robber_placement',
      playerId: gameState.currentTurn,
      description: 'Place the robber',
      isBlocking: true,
      isDependency: false, // Required action, not an obligation
    });
  }

  // 3. Robber steal
  if (gameState.phase === 'stealing') {
    obligations.push({
      type: 'robber_steal',
      playerId: gameState.currentTurn,
      description: 'Steal from a player',
      isBlocking: true,
      isDependency: false,
    });
  }

  // 4. Aqueduct selections
  if (gameState.pendingAqueduct && gameState.pendingAqueduct.length > 0) {
    gameState.pendingAqueduct.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'aqueduct_selection',
        playerId,
        description: `${player?.name || 'Player'} must select aqueduct resource`,
        isBlocking: true,
        isDependency: false, // Async obligation
      });
    });
  }

  // 5. Commercial Harbor responses
  if (gameState.pendingCommercialHarbor) {
    const pendingOffers = gameState.pendingCommercialHarbor.offers.filter(
      offer => offer.offeredResource !== null && offer.response === undefined
    );

    pendingOffers.forEach(offer => {
      const player = gameState.players.find(p => p.id === offer.playerId);
      obligations.push({
        type: 'commercial_harbor_response',
        playerId: offer.playerId,
        description: `${player?.name || 'Player'} must respond to trade offer`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 6. Wedding gifts
  if (gameState.pendingWedding) {
    const pendingGifts = gameState.pendingWedding.gifts.filter(
      gift => gift.selectedResource === undefined
    );

    pendingGifts.forEach(gift => {
      const player = gameState.players.find(p => p.id === gift.playerId);
      obligations.push({
        type: 'wedding_gift',
        playerId: gift.playerId,
        description: `${player?.name || 'Player'} must select wedding gift`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 7. Barbarian city selection
  if (gameState.pendingBarbarianVictims && gameState.pendingBarbarianVictims.length > 0) {
    gameState.pendingBarbarianVictims.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'barbarian_city_selection',
        playerId,
        description: `${player?.name || 'Player'} must choose city to lose`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 8. Knight displacement
  if (gameState.pendingDisplacement) {
    const player = gameState.players.find(
      p => p.id === gameState.pendingDisplacement?.playerId
    );
    obligations.push({
      type: 'knight_displacement',
      playerId: gameState.pendingDisplacement.playerId,
      description: `${player?.name || 'Player'} must move displaced knight`,
      isBlocking: true,
      isDependency: false,
    });
  }

  // 9. Defender card draws (rare case where multiple players draw simultaneously)
  if (gameState.pendingDefenderCardDraws && gameState.pendingDefenderCardDraws.length > 0) {
    gameState.pendingDefenderCardDraws.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'defender_card_draw',
        playerId,
        description: `${player?.name || 'Player'} must draw defender card`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  return obligations;
}

/**
 * Check if "Roll Dice" can proceed.
 *
 * Returns:
 * - canRollDice: true if allowed
 * - blockedBy: array of blocking obligations
 * - waitingOn: array of player IDs who must act
 */
export function canRollDice(gameState: GameState): ObligationCheck {
  const obligations = getAllPendingObligations(gameState);

  // Any blocking obligation prevents roll
  const blockingObligations = obligations.filter(o => o.isBlocking);

  return {
    canRollDice: blockingObligations.length === 0,
    blockedBy: blockingObligations,
    waitingOn: [...new Set(blockingObligations.map(o => o.playerId))],
  };
}

/**
 * Get a human-readable summary of obligations for a specific player.
 */
export function getObligationSummary(
  gameState: GameState,
  playerId: string
): string | null {
  const obligations = getAllPendingObligations(gameState);
  const playerObligations = obligations.filter(o => o.playerId === playerId);

  if (playerObligations.length === 0) {
    return null;
  }

  if (playerObligations.length === 1) {
    return playerObligations[0].description;
  }

  return `${playerObligations.length} pending actions: ${playerObligations
    .map(o => o.description)
    .join(', ')}`;
}

// Helper function (reuse existing logic from game-service)
function needsToDiscard(player: any, gameState: GameState): boolean {
  const totalCards =
    player.resources.wood +
    player.resources.brick +
    player.resources.sheep +
    player.resources.wheat +
    player.resources.ore +
    (player.commodities?.paper || 0) +
    (player.commodities?.cloth || 0) +
    (player.commodities?.coin || 0);

  return totalCards > 7;
}
```

**Commit**: "Add obligation tracker service"

#### Step 3.2: Write Obligation Tracker Tests

**File**: `lib/services/obligation-tracker.test.ts` (NEW)

```typescript
import { describe, expect, test } from '@jest/globals';
import { GameState } from '@/lib/types/game';
import { getAllPendingObligations, canRollDice } from './obligation-tracker';

describe('obligation-tracker', () => {
  const baseGameState: GameState = {
    // ... minimal valid game state
    phase: 'waiting_for_roll',
    currentTurn: 'player1',
    players: [
      { id: 'player1', name: 'Alice', /* ... */ },
      { id: 'player2', name: 'Bob', /* ... */ },
    ],
  };

  test('allows roll dice when no obligations', () => {
    const result = canRollDice(baseGameState);

    expect(result.canRollDice).toBe(true);
    expect(result.blockedBy).toHaveLength(0);
  });

  test('blocks roll dice during discarding phase', () => {
    const state: GameState = {
      ...baseGameState,
      phase: 'discarding',
      players: [
        {
          ...baseGameState.players[0],
          discardedThisTurn: false,
          resources: { wood: 10, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        },
        baseGameState.players[1],
      ],
    };

    const result = canRollDice(state);

    expect(result.canRollDice).toBe(false);
    expect(result.blockedBy).toHaveLength(1);
    expect(result.blockedBy[0].type).toBe('discard_after_seven');
    expect(result.waitingOn).toContain('player1');
  });

  test('blocks roll dice when aqueduct pending', () => {
    const state: GameState = {
      ...baseGameState,
      pendingAqueduct: ['player2'],
    };

    const result = canRollDice(state);

    expect(result.canRollDice).toBe(false);
    expect(result.blockedBy[0].type).toBe('aqueduct_selection');
  });

  test('detects multiple obligations', () => {
    const state: GameState = {
      ...baseGameState,
      pendingAqueduct: ['player2'],
      pendingCommercialHarbor: {
        initiatorId: 'player1',
        offers: [
          {
            playerId: 'player2',
            offeredResource: 'wood',
            response: undefined, // Pending
          },
        ],
      },
    };

    const obligations = getAllPendingObligations(state);

    expect(obligations).toHaveLength(2);
    expect(obligations.map(o => o.type)).toContain('aqueduct_selection');
    expect(obligations.map(o => o.type)).toContain('commercial_harbor_response');
  });
});
```

**Run tests**: `npm test obligation-tracker`

**Commit**: "Add obligation tracker tests"

---

### Phase 4: Game Service Integration

#### Step 4.1: Modify `rollDice()` to Check Obligations

**File**: `lib/services/game-service.ts`

**Import timer services**:
```typescript
import { canRollDice } from './obligation-tracker';
import { startTurnTimer } from './timer-service';
```

**Update `rollDice()` function** (around line 209):

```typescript
export async function rollDice(roomId: string, playerId: string) {
  const gameState = await gameRepository.getGameStateByRoomId(roomId);

  // Existing validation
  if (gameState.phase !== 'waiting_for_roll') {
    throw new Error('Not waiting for dice roll');
  }

  if (gameState.currentTurn !== playerId) {
    throw new Error('Not your turn');
  }

  // NEW: Check for blocking obligations
  const obligationCheck = canRollDice(gameState);
  if (!obligationCheck.canRollDice) {
    const waitingOnNames = obligationCheck.waitingOn
      .map(id => gameState.players.find(p => p.id === id)?.name || 'Unknown')
      .join(', ');

    throw new Error(
      `Cannot roll dice. Waiting for: ${waitingOnNames} to complete pending actions.`
    );
  }

  // Existing dice roll logic...
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;

  // ... existing resource distribution logic

  let updatedState = {
    ...gameState,
    lastDiceRoll: { die1, die2, total, eventDie },
    // ... other updates
  };

  // NEW: Start timer when transitioning to main_phase
  if (updatedState.phase === 'main_phase') {
    updatedState = startTurnTimer(updatedState);
  }

  await gameRepository.updateGameState(roomId, updatedState);
  await actionLogRepository.logAction(/* ... */);

  return updatedState;
}
```

**Commit**: "Add obligation check and timer start to rollDice"

#### Step 4.2: Modify `endTurn()` to Stop Timer

**File**: `lib/services/game-service.ts`

**Import**:
```typescript
import { stopTurnTimer } from './timer-service';
```

**Update `endTurn()` function** (around line 369):

```typescript
export async function endTurn(roomId: string, playerId: string) {
  let gameState = await gameRepository.getGameStateByRoomId(roomId);

  // Existing validation...

  // NEW: Stop timer and update time banks
  gameState = stopTurnTimer(gameState, playerId);

  // Existing turn advancement logic...
  const currentIndex = gameState.turnOrder.indexOf(playerId);
  const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
  const nextPlayer = gameState.turnOrder[nextIndex];

  const updatedState = {
    ...gameState,
    currentTurn: nextPlayer,
    phase: gameState.pendingAqueduct && gameState.pendingAqueduct.length > 0
      ? 'aqueduct_selection'
      : 'waiting_for_roll',
    // ... other updates
  };

  await gameRepository.updateGameState(roomId, updatedState);
  await actionLogRepository.logAction(/* ... */);

  return updatedState;
}
```

**Commit**: "Add timer stop and refund to endTurn"

#### Step 4.3: Add Locked State Validation

**File**: `lib/services/game-service.ts`

**Create helper function**:

```typescript
import { canPerformOptionalAction, checkTimeout } from './timer-service';

/**
 * Check and enforce timeout on every game action.
 * Sets timerLocked flag if timer has expired.
 */
async function checkAndEnforceTimeout(
  roomId: string,
  gameState: GameState
): Promise<GameState> {
  if (!gameState.timerConfig?.enabled) {
    return gameState;
  }

  // Check if timeout occurred
  if (checkTimeout(gameState) && !gameState.timerLocked) {
    // Set locked flag
    const updatedState = {
      ...gameState,
      timerLocked: true,
    };

    // Persist to database
    await gameRepository.updateGameState(roomId, updatedState);

    return updatedState;
  }

  return gameState;
}

/**
 * Validate that an optional action can be performed.
 * Throws if turn is locked due to timeout.
 */
function validateOptionalAction(gameState: GameState, playerId: string) {
  if (!canPerformOptionalAction(gameState, playerId)) {
    throw new Error(
      'Turn time expired. You can only complete required actions to end your turn.'
    );
  }
}
```

**Add to ALL action functions (both optional and required)**:

```typescript
// Example: buildSettlement
export async function buildSettlement(
  roomId: string,
  playerId: string,
  vertex: Vertex
) {
  let gameState = await gameRepository.getGameStateByRoomId(roomId);

  // Check and enforce timeout (sets timerLocked if expired)
  gameState = await checkAndEnforceTimeout(roomId, gameState);

  // Validate this is an allowed optional action
  validateOptionalAction(gameState, playerId);

  // ... rest of function
}

// Add checkAndEnforceTimeout() to ALL actions:
// Optional actions (also validate with validateOptionalAction):
// - buildSettlement, buildRoad, buildCity
// - upgradeCity (C&K)
// - activateKnight, moveKnight (C&K)
// - playDevelopmentCard, buyDevelopmentCard
// - proposeTrade, acceptTrade

// Required actions (check timeout but don't validate):
// - discardCards (required after 7)
// - placeRobber (required after 7)
// - stealFromPlayer (required after robber)
// - endTurn (always allowed, even when locked)
```

**Pattern**:
```typescript
// Every action starts with:
let gameState = await getGameState();
gameState = await checkAndEnforceTimeout(roomId, gameState); // Lazy enforcement
// Then validate as needed
```

**Commit**: "Add check-on-action timeout enforcement to all game actions"

#### Step 4.4: Add Extension Request Action

**File**: `app/actions.ts`

```typescript
export async function requestTimeExtension(roomId: string, playerId: string) {
  return gameService.requestTimeExtension(roomId, playerId);
}
```

**File**: `lib/services/game-service.ts`

```typescript
import { requestExtension } from './timer-service';

export async function requestTimeExtension(roomId: string, playerId: string) {
  const gameState = await gameRepository.getGameStateByRoomId(roomId);

  const result = requestExtension(gameState, playerId);

  if (!result.success) {
    throw new Error(result.error);
  }

  await gameRepository.updateGameState(roomId, result.newState!);

  await actionLogRepository.logAction({
    roomId,
    playerId,
    actionType: 'time_extension_requested',
    details: {
      secondsGranted: gameState.timerConfig!.extensionIncrement,
    },
  });

  return result.newState;
}
```

**Commit**: "Add time extension request action"

---

### Phase 5: Lobby UI

#### Step 5.1: Create Timer Config Panel

**File**: `components/lobby/TimerConfigPanel.tsx` (NEW)

```typescript
import React from 'react';
import { TimerConfig, DEFAULT_TIMER_CONFIG, TIMER_PRESETS } from '@/lib/types/timer';

interface TimerConfigPanelProps {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
  disabled?: boolean;
}

export function TimerConfigPanel({ config, onChange, disabled }: TimerConfigPanelProps) {
  const handleToggle = () => {
    onChange({ ...config, enabled: !config.enabled });
  };

  const handlePresetChange = (value: number) => {
    if (value === -1) {
      // Custom - do nothing, user will use slider
      return;
    }
    onChange({ ...config, turnTimeLimit: value });
  };

  const handleCustomChange = (value: number) => {
    onChange({ ...config, turnTimeLimit: value });
  };

  const selectedPreset = TIMER_PRESETS.find(p => p.value === config.turnTimeLimit)
    || TIMER_PRESETS[TIMER_PRESETS.length - 1]; // "Custom"

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Turn Timer</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-300">
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggle}
            disabled={disabled}
            className="w-5 h-5 rounded bg-gray-700 border-gray-600"
          />
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Turn Time Preset */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Time per turn
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIMER_PRESETS.slice(0, -1).map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetChange(preset.value)}
                  disabled={disabled}
                  className={`
                    px-3 py-2 rounded text-sm font-medium transition
                    ${
                      config.turnTimeLimit === preset.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom slider */}
            {selectedPreset.value === -1 && (
              <div className="mt-3">
                <label className="block text-sm text-gray-400 mb-1">
                  Custom: {config.turnTimeLimit}s
                </label>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="30"
                  value={config.turnTimeLimit}
                  onChange={e => handleCustomChange(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Time Bank */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Time bank per player
              <span className="text-gray-500 ml-2">(for extensions)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="900"
                step="60"
                value={config.timeBank}
                onChange={e => onChange({ ...config, timeBank: Number(e.target.value) })}
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-sm text-white w-16 text-right">
                {Math.floor(config.timeBank / 60)}m {config.timeBank % 60}s
              </span>
            </div>
          </div>

          {/* Advanced Settings (Collapsible) */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
              Advanced settings
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-700">
              <div>
                <label className="block text-gray-400 mb-1">
                  Extension increment: {config.extensionIncrement}s
                </label>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="30"
                  value={config.extensionIncrement}
                  onChange={e =>
                    onChange({ ...config, extensionIncrement: Number(e.target.value) })
                  }
                  disabled={disabled}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">
                  Max extensions per turn: {config.maxExtensionsPerTurn}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={config.maxExtensionsPerTurn}
                  onChange={e =>
                    onChange({ ...config, maxExtensionsPerTurn: Number(e.target.value) })
                  }
                  disabled={disabled}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">
                  Max extra time per turn: {config.maxExtraSecondsPerTurn}s
                </label>
                <input
                  type="range"
                  min="60"
                  max="600"
                  step="60"
                  value={config.maxExtraSecondsPerTurn}
                  onChange={e =>
                    onChange({
                      ...config,
                      maxExtraSecondsPerTurn: Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                  className="w-full"
                />
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
```

**Commit**: "Add timer config panel component"

#### Step 5.2: Integrate into Lobby View

**File**: `components/lobby-view.tsx`

**Import**:
```typescript
import { TimerConfigPanel } from './lobby/TimerConfigPanel';
import { DEFAULT_TIMER_CONFIG } from '@/lib/types/timer';
```

**Add state management**:
```typescript
const [timerConfig, setTimerConfig] = useState(
  lobby?.metadata.timerConfig || DEFAULT_TIMER_CONFIG
);

// Sync timer config to lobby when changed
useEffect(() => {
  if (!isHost) return;

  updateLobbyMetadata(roomId, {
    ...lobby.metadata,
    timerConfig,
  });
}, [timerConfig, isHost]);
```

**Add to render** (below game mode selector):
```typescript
<div className="space-y-6">
  {/* Existing game mode selector */}
  <GameModeSelector ... />

  {/* Timer config panel */}
  {isHost && (
    <TimerConfigPanel
      config={timerConfig}
      onChange={setTimerConfig}
      disabled={lobby.status !== 'waiting'}
    />
  )}

  {/* Non-host view (read-only) */}
  {!isHost && timerConfig.enabled && (
    <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
      ⏱️ Timer enabled: {timerConfig.turnTimeLimit}s per turn,
      {Math.floor(timerConfig.timeBank / 60)}m time bank
    </div>
  )}
</div>
```

**Commit**: "Integrate timer config into lobby"

---

### Phase 6: In-Game Timer UI

#### Step 6.1: Create Timer Hook

**File**: `lib/hooks/useTimerState.ts` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { GameState } from '@/lib/types/game';
import { TimerStatus, getTimerStatus } from '@/lib/services/timer-service';

/**
 * Hook to calculate timer status with live countdown.
 * Re-renders every second while timer is active.
 */
export function useTimerState(gameState: GameState): TimerStatus {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
      return; // Timer not active
    }

    // Update every second
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.timerConfig?.enabled, gameState.turnStartTime]);

  return getTimerStatus(gameState);
}
```

**Commit**: "Add timer state hook"

#### Step 6.2: Create Turn Timer Bar Component

**File**: `components/game/ui/TurnTimerBar.tsx` (NEW)

```typescript
import React from 'react';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { GameState } from '@/lib/types/game';

interface TurnTimerBarProps {
  gameState: GameState;
  playerId: string; // Current user's ID
}

export function TurnTimerBar({ gameState, playerId }: TurnTimerBarProps) {
  const timerStatus = useTimerState(gameState);

  if (!timerStatus.isActive) {
    return null; // Timer disabled or not started
  }

  const isCurrentPlayer = gameState.currentTurn === playerId;
  const remainingSeconds = timerStatus.timeRemaining;
  const progressPercent = (remainingSeconds / timerStatus.timeLimit) * 100;

  // Color based on remaining time
  let barColor = 'bg-green-500';
  let textColor = 'text-green-500';
  let shouldPulse = false;

  if (remainingSeconds <= 10) {
    barColor = 'bg-red-500';
    textColor = 'text-red-500';
    shouldPulse = true;
  } else if (remainingSeconds <= 30) {
    barColor = 'bg-orange-500';
    textColor = 'text-orange-500';
  } else if (remainingSeconds <= 60) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-500';
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">
          {isCurrentPlayer ? 'Your Turn' : 'Their Turn'}
        </span>
        <span className={`font-mono font-bold ${textColor} ${shouldPulse ? 'animate-pulse' : ''}`}>
          {formatTime(remainingSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${barColor} ${
            shouldPulse ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.max(0, progressPercent)}%` }}
        />
      </div>

      {timerStatus.isLocked && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">
          ⏱️ Time expired - finish required actions to end turn
        </div>
      )}
    </div>
  );
}
```

**Commit**: "Add turn timer bar component"

#### Step 6.3: Create Time Bank Display

**File**: `components/game/ui/TimeBankDisplay.tsx` (NEW)

```typescript
import React from 'react';
import { GameState } from '@/lib/types/game';

interface TimeBankDisplayProps {
  gameState: GameState;
  playerId: string;
  compact?: boolean;
}

export function TimeBankDisplay({
  gameState,
  playerId,
  compact = false,
}: TimeBankDisplayProps) {
  if (!gameState.timerConfig?.enabled) {
    return null;
  }

  const bankSeconds = gameState.playerTimeBanks?.[playerId] || 0;
  const totalSeconds = gameState.playerTotalTime?.[playerId] || 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (compact && mins > 0) {
      return `${mins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Color based on bank level
  let bankColor = 'text-green-400';
  if (bankSeconds < 60) {
    bankColor = 'text-red-400';
  } else if (bankSeconds < 180) {
    bankColor = 'text-yellow-400';
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400">🏦</span>
        <span className={bankColor}>{formatTime(bankSeconds)}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded p-2 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Time Bank</span>
        <span className={`font-mono ${bankColor}`}>{formatTime(bankSeconds)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Total Played</span>
        <span className="text-gray-400 font-mono">{formatTime(totalSeconds)}</span>
      </div>
    </div>
  );
}
```

**Commit**: "Add time bank display component"

#### Step 6.4: Create Extension Request Button

**File**: `components/game/ui/ExtensionRequestButton.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { GameState } from '@/lib/types/game';
import { requestTimeExtension } from '@/app/actions';

interface ExtensionRequestButtonProps {
  gameState: GameState;
  playerId: string;
  roomId: string;
}

export function ExtensionRequestButton({
  gameState,
  playerId,
  roomId,
}: ExtensionRequestButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!gameState.timerConfig?.enabled || gameState.currentTurn !== playerId) {
    return null; // Only show to current player
  }

  const config = gameState.timerConfig;
  const extensions = gameState.currentTurnExtensions || { count: 0, totalBorrowed: 0 };
  const bank = gameState.playerTimeBanks?.[playerId] || 0;

  // Check if extension allowed
  const canExtend =
    extensions.count < config.maxExtensionsPerTurn &&
    extensions.totalBorrowed + config.extensionIncrement <= config.maxExtraSecondsPerTurn &&
    bank >= config.extensionIncrement;

  const handleRequest = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      await requestTimeExtension(roomId, playerId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleRequest}
        disabled={!canExtend || isRequesting}
        className={`
          w-full px-4 py-2 rounded font-medium text-sm transition
          ${
            canExtend
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
        title={
          !canExtend
            ? `Cannot extend (${extensions.count}/${config.maxExtensionsPerTurn} used, ${bank}s in bank)`
            : `Request +${config.extensionIncrement}s (${bank}s remaining in bank)`
        }
      >
        {isRequesting ? '...' : `+${config.extensionIncrement}s`}
      </button>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      {canExtend && (
        <div className="text-xs text-gray-400 text-center">
          {config.maxExtensionsPerTurn - extensions.count} extensions left
        </div>
      )}
    </div>
  );
}
```

**Commit**: "Add extension request button"

#### Step 6.5: Update Player Cards

**File**: `components/game/player/CompactPlayerCard.tsx`

**Import**:
```typescript
import { TimeBankDisplay } from '../ui/TimeBankDisplay';
import { TurnTimerBar } from '../ui/TurnTimerBar';
```

**Update render** (add after existing rows):

```typescript
export function CompactPlayerCard({ player, gameState, isCurrentUser }: Props) {
  const isTurn = gameState.currentTurn === player.id;

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${isTurn ? 'ring-2 ring-yellow-400' : ''}`}>
      {/* Existing Row 1: Identity */}
      <div className="flex items-center gap-2">
        {/* ... existing content */}
      </div>

      {/* Existing Row 2: Stats */}
      <div className="flex items-center gap-3 text-xs">
        {/* ... existing content */}
      </div>

      {/* Existing Row 3: Improvements */}
      {gameState.gameMode === 'cities_and_knights' && (
        <div className="grid grid-cols-3 gap-1 mt-2">
          {/* ... existing content */}
        </div>
      )}

      {/* NEW Row 4: Timer (if active turn) */}
      {isTurn && gameState.timerConfig?.enabled && (
        <div className="mt-2">
          <TurnTimerBar gameState={gameState} playerId={player.id} />
        </div>
      )}

      {/* NEW Row 5: Time Bank (compact, always visible if timer enabled) */}
      {gameState.timerConfig?.enabled && (
        <div className="mt-2">
          <TimeBankDisplay gameState={gameState} playerId={player.id} compact />
        </div>
      )}
    </div>
  );
}
```

**Commit**: "Integrate timer UI into player cards"

#### Step 6.6: Add Extension Button to Action Controls

**File**: `components/game/ui/ActionControls.tsx`

**Import**:
```typescript
import { ExtensionRequestButton } from './ExtensionRequestButton';
```

**Add to render** (above "End Turn" button):

```typescript
export function ActionControls({ gameState, playerId, roomId }: Props) {
  const isTurn = gameState.currentTurn === playerId;

  return (
    <div className="space-y-3">
      {/* Existing phase-specific controls */}
      {gameState.phase === 'waiting_for_roll' && isTurn && (
        <button onClick={handleRollDice}>Roll Dice 🎲</button>
      )}

      {gameState.phase === 'main_phase' && isTurn && (
        <>
          <button onClick={handleTrade}>Trade ⚖️</button>

          {/* NEW: Extension button */}
          <ExtensionRequestButton
            gameState={gameState}
            playerId={playerId}
            roomId={roomId}
          />

          <button onClick={handleEndTurn}>End Turn ➡️</button>
        </>
      )}
    </div>
  );
}
```

**Commit**: "Add extension button to action controls"

---

### Phase 7: Obligation UI

#### Step 7.1: Create Waiting Overlay

**File**: `components/game/modals/WaitingOverlay.tsx` (NEW)

```typescript
import React from 'react';
import { GameState } from '@/lib/types/game';
import { canRollDice, getObligationSummary } from '@/lib/services/obligation-tracker';

interface WaitingOverlayProps {
  gameState: GameState;
  playerId: string;
}

export function WaitingOverlay({ gameState, playerId }: WaitingOverlayProps) {
  const obligationCheck = canRollDice(gameState);

  if (obligationCheck.canRollDice) {
    return null; // No blocking obligations
  }

  const isBlocking = obligationCheck.waitingOn.includes(playerId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-white">
          {isBlocking ? '⏳ Everyone is waiting on you!' : '⏳ Waiting for players...'}
        </h2>

        <div className="space-y-2">
          {obligationCheck.blockedBy.map((obligation, index) => {
            const player = gameState.players.find(p => p.id === obligation.playerId);
            const isYou = obligation.playerId === playerId;

            return (
              <div
                key={index}
                className={`
                  p-3 rounded border-l-4
                  ${
                    isYou
                      ? 'bg-yellow-900/30 border-yellow-400 text-yellow-200'
                      : 'bg-gray-700 border-gray-500 text-gray-300'
                  }
                `}
              >
                <div className="font-medium">
                  {isYou ? 'You' : player?.name || 'Player'}
                </div>
                <div className="text-sm opacity-90">{obligation.description}</div>
              </div>
            );
          })}
        </div>

        {isBlocking && (
          <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3 text-sm text-yellow-200">
            Complete your pending action to allow the game to continue.
          </div>
        )}
      </div>
    </div>
  );
}
```

**Commit**: "Add waiting overlay for blocked obligations"

#### Step 7.2: Integrate Waiting Overlay

**File**: `components/game/GameController.tsx`

**Import**:
```typescript
import { WaitingOverlay } from './modals/WaitingOverlay';
```

**Add to render** (after other modals):

```typescript
export function GameController({ roomId, playerId }: Props) {
  const gameState = useGameState(roomId);

  return (
    <OptimisticGameStateProvider>
      <ProgressPromptProvider>
        <GameControllerInner roomId={roomId} playerId={playerId}>
          {/* Existing modals */}
          <DiscardModal ... />
          <RobberModals ... />
          {/* ... */}

          {/* NEW: Waiting overlay */}
          <WaitingOverlay gameState={gameState} playerId={playerId} />

          {/* Existing game board */}
          <GameBoardSection ... />
          <GameLayoutPanels ... />
        </GameControllerInner>
      </ProgressPromptProvider>
    </OptimisticGameStateProvider>
  );
}
```

**Commit**: "Integrate waiting overlay into game controller"

#### Step 7.3: Update Roll Dice Error Handling

**File**: `components/game/ui/ActionControls.tsx`

**Update Roll Dice handler**:

```typescript
import { canRollDice } from '@/lib/services/obligation-tracker';

function ActionControls({ gameState, playerId, roomId }: Props) {
  const obligationCheck = canRollDice(gameState);

  const handleRollDice = async () => {
    if (!obligationCheck.canRollDice) {
      // Show toast or inline error
      alert(
        `Cannot roll dice. Waiting for: ${obligationCheck.waitingOn
          .map(id => gameState.players.find(p => p.id === id)?.name)
          .join(', ')}`
      );
      return;
    }

    try {
      await rollDice(roomId, playerId);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-3">
      {gameState.phase === 'waiting_for_roll' && gameState.currentTurn === playerId && (
        <button
          onClick={handleRollDice}
          disabled={!obligationCheck.canRollDice}
          className={`
            w-full px-4 py-2 rounded font-bold transition
            ${
              obligationCheck.canRollDice
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Roll Dice 🎲
        </button>
      )}

      {!obligationCheck.canRollDice && (
        <div className="text-xs text-yellow-300 bg-yellow-900/30 rounded px-3 py-2">
          ⏳ Waiting for {obligationCheck.waitingOn.length} player(s) to complete actions
        </div>
      )}
    </div>
  );
}
```

**Commit**: "Add obligation check to roll dice button"

---

### Phase 8: Stats Display

#### Step 8.1: Add Total Gameplay Time to Stats Panel

**File**: `components/game/panels/StatsPanel.tsx`

**Add calculation**:

```typescript
function StatsPanel({ gameState }: { gameState: GameState }) {
  const totalGameplayTime = Object.values(gameState.playerTotalTime || {}).reduce(
    (sum, time) => sum + time,
    0
  );

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-bold text-white">Game Stats</h3>

      {/* Existing stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Turn</span>
          <span className="text-white">{gameState.turnNumber || 1}</span>
        </div>

        {/* NEW: Total gameplay time */}
        {gameState.timerConfig?.enabled && (
          <div className="flex justify-between">
            <span className="text-gray-400">Total Gameplay Time</span>
            <span className="text-white">{formatTime(totalGameplayTime)}</span>
          </div>
        )}

        {/* ... other stats */}
      </div>
    </div>
  );
}
```

**Commit**: "Add total gameplay time to stats panel"

#### Step 8.2: Add Per-Player Time to Player Cards (Expanded View)

**File**: `components/game/player/PlayerCardExpanded.tsx` (if exists, or add tooltip to compact card)

**Option A: Tooltip on Compact Card**:

```typescript
// In CompactPlayerCard.tsx
import { Tooltip } from '@/components/ui/Tooltip';

{gameState.timerConfig?.enabled && (
  <Tooltip content={`Total time played: ${formatTime(gameState.playerTotalTime?.[player.id] || 0)}`}>
    <TimeBankDisplay gameState={gameState} playerId={player.id} compact />
  </Tooltip>
)}
```

**Option B: Expanded Stats Panel**:

Create a dedicated player stats modal/panel showing:
- Total time played
- Average turn time
- Longest/shortest turn
- Time bank remaining

**Commit**: "Add per-player time to player card tooltips"

---

### Phase 9: Testing & Polish

#### Step 9.1: Manual Testing Checklist

Create test scenarios:

**File**: `docs/planning/timer-testing-checklist.md` (NEW)

```markdown
# Turn Timer Testing Checklist

## Setup Tests
- [ ] Create room with timer disabled → no timer UI shown
- [ ] Create room with timer enabled (default 180s) → config shows correctly
- [ ] Create room with custom timer (e.g., 90s) → config saves and loads
- [ ] Create room with modified time bank (e.g., 600s) → config persists
- [ ] Non-host player sees timer config (read-only)
- [ ] Start game with timer enabled → time banks initialized correctly

## Timer Flow Tests
- [ ] Roll dice → timer starts when entering main_phase
- [ ] Timer countdown updates every second
- [ ] Timer shows correct color at thresholds (60s yellow, 30s orange, 10s red)
- [ ] Timer pulses when <10s remaining
- [ ] End turn → timer stops and refund calculated correctly
- [ ] Next player rolls → new timer starts

## Extension Tests
- [ ] Request extension → bank decreases by 60s
- [ ] Request 2 extensions → count tracked correctly
- [ ] Request 3rd extension → rejected with error
- [ ] Request extension with insufficient bank → rejected
- [ ] End turn with unused extension time → refund calculated correctly
- [ ] Refund only applies to borrowed time, not base time

## Timeout Tests
- [ ] Let timer expire → "locked" state activates (client-side, immediate)
- [ ] Try to build in locked state → client shows disabled button
- [ ] If somehow bypass client validation, server rejects action
- [ ] Try to trade in locked state → action rejected
- [ ] Try to play dev card in locked state → action rejected
- [ ] End turn in locked state → allowed
- [ ] Check-on-action enforcement: Expired timer detected on next action

## Obligation Gating Tests
- [ ] Roll 7, player must discard → roll dice blocked for all players
- [ ] Discard complete → roll dice unblocked
- [ ] Aqueduct pending → roll dice blocked
- [ ] Aqueduct selected → roll dice unblocked
- [ ] Commercial Harbor pending → roll dice blocked
- [ ] Commercial Harbor all responded → roll dice unblocked
- [ ] Wedding pending → roll dice blocked
- [ ] Barbarian city selection pending → roll dice blocked
- [ ] Waiting overlay shows correct blocking players
- [ ] Blocking player sees "everyone is waiting" message

## Edge Cases
- [ ] Player walks away mid-turn → timer continues, eventually locks
- [ ] Player returns after timeout → can end turn
- [ ] Multiple obligations at once → all shown in waiting overlay
- [ ] Timer expires during discard phase → no effect (timer not running yet)
- [ ] Request extension at 0.5s remaining → granted, timer extends
- [ ] End turn immediately after rolling → minimal time used, no refund needed
- [ ] Two players act simultaneously near timeout → both trigger checkAndEnforceTimeout (idempotent)

## UI/UX Tests
- [ ] Timer bar visible to all players
- [ ] Time bank visible in all player cards
- [ ] Extension button only visible to current player
- [ ] Extension button disabled when not allowed
- [ ] Tooltips show clear error messages
- [ ] Waiting overlay dismisses when obligations complete
- [ ] Stats panel shows total gameplay time
- [ ] Turn history recorded (if implemented)

## Performance Tests
- [ ] 4-player game with timer → no lag
- [ ] Timer updates smooth (1s intervals)
- [ ] Realtime updates push to all clients within 2s
- [ ] Check-on-action enforcement adds <50ms to action latency

## Regression Tests
- [ ] Game without timer works exactly as before
- [ ] All existing game mechanics unaffected
- [ ] Setup rounds work correctly
- [ ] Cities & Knights features work correctly
- [ ] Development cards work correctly
- [ ] Robber flow unchanged
```

**Commit**: "Add timer testing checklist"

#### Step 9.2: Add Integration Tests

**File**: `lib/services/timer-integration.test.ts` (NEW)

```typescript
import { describe, test, expect } from '@jest/globals';
import { rollDice, endTurn, requestTimeExtension } from './game-service';
import { gameRepository } from '@/lib/repositories/game-repository';

describe('Timer Integration Tests', () => {
  // Test full turn cycle with timer
  test('complete turn cycle with timer', async () => {
    // Setup: Create game with timer enabled
    const roomId = 'test-room';
    const playerId = 'player1';

    // Roll dice → timer starts
    const stateAfterRoll = await rollDice(roomId, playerId);
    expect(stateAfterRoll.turnStartTime).toBeDefined();
    expect(stateAfterRoll.turnTimeLimit).toBe(180);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // End turn → timer stops, time tracked
    const stateAfterEnd = await endTurn(roomId, playerId);
    expect(stateAfterEnd.turnStartTime).toBeUndefined();
    expect(stateAfterEnd.playerTotalTime?.[playerId]).toBeGreaterThanOrEqual(2);
    expect(stateAfterEnd.playerTotalTime?.[playerId]).toBeLessThan(5);
  });

  // Test extension and refund
  test('extension request and refund', async () => {
    // Setup: Game in progress, 50s elapsed
    const roomId = 'test-room';
    const playerId = 'player1';

    // Request extension
    const stateAfterExtension = await requestTimeExtension(roomId, playerId);
    expect(stateAfterExtension.currentTurnExtensions?.count).toBe(1);
    expect(stateAfterExtension.currentTurnExtensions?.totalBorrowed).toBe(60);
    expect(stateAfterExtension.playerTimeBanks?.[playerId]).toBe(240); // 300 - 60

    // End turn quickly (simulate using only 10s of the extension)
    // Should refund 50s
    await new Promise(resolve => setTimeout(resolve, 1000));
    const stateAfterEnd = await endTurn(roomId, playerId);

    // Refund calculation: used ~51s out of 240s limit, 60s borrowed
    // Unused: ~189s, but only 60s was borrowed, so refund 60s
    expect(stateAfterEnd.playerTimeBanks?.[playerId]).toBeGreaterThan(240);
  });

  // Test obligation blocking
  test('obligation blocks roll dice', async () => {
    // Setup: Game with pending aqueduct
    const roomId = 'test-room';
    const playerId = 'player1';

    // Add pending aqueduct
    const state = await gameRepository.getGameStateByRoomId(roomId);
    await gameRepository.updateGameState(roomId, {
      ...state,
      pendingAqueduct: ['player2'],
      phase: 'waiting_for_roll',
    });

    // Try to roll dice → should fail
    await expect(rollDice(roomId, playerId)).rejects.toThrow('Waiting for');
  });
});
```

**Run tests**: `npm test timer-integration`

**Commit**: "Add timer integration tests"

#### Step 9.3: Polish Pass

**Tasks**:
- [ ] Add loading states to all async operations
- [ ] Add error boundaries around timer components
- [ ] Add aria-labels for accessibility
- [ ] Add keyboard shortcuts (optional: spacebar to request extension)
- [ ] Add sound effects (optional: beep at 10s warning)
- [ ] Add animation polish (smooth transitions, pulses)
- [ ] Optimize re-renders (memoization, useCallback)
- [ ] Add Storybook stories for timer components (optional)
- [ ] Review and clean up console.logs
- [ ] Update CLAUDE.md with timer architecture notes

**Commit**: "Polish timer UI and UX"

---

## Testing Strategy

### Unit Tests
- [x] `timer-service.test.ts`: Test all timer calculations
- [x] `obligation-tracker.test.ts`: Test obligation detection
- [ ] Test edge cases (negative time, overflow, etc.)

### Integration Tests
- [x] `timer-integration.test.ts`: Test full turn cycle
- [ ] Test with real database (not mocks)
- [ ] Test realtime subscription updates

### End-to-End Tests
- [ ] Manual testing with 4 players (see checklist)
- [ ] Test on mobile devices (timer bar, modals)
- [ ] Test with slow network (latency simulation)

### Performance Tests
- [ ] Measure render performance (React DevTools Profiler)
- [ ] Measure database query time (<100ms)
- [ ] Measure WebSocket latency (<500ms)
- [ ] Test with 10+ concurrent games

---

## Rollout Plan

### Phase 1: Internal Testing (1 week)
- Deploy to staging environment
- Test with dev team (4+ playtesters)
- Fix critical bugs
- Gather feedback on UX

### Phase 2: Beta Release (1-2 weeks)
- Add feature flag: `ENABLE_TIMER_FEATURE=true`
- Deploy to production (disabled by default)
- Invite beta testers (trusted users)
- Monitor error logs and performance

### Phase 3: Gradual Rollout (1 week)
- Enable for 10% of rooms
- Monitor metrics (completion rate, error rate)
- Increase to 50%, then 100%

### Phase 4: General Availability
- Remove feature flag
- Announce in release notes
- Monitor support requests
- Iterate based on feedback

---

## Deferred Features (v2)

These features are intentionally excluded from v1 to reduce scope:

1. **Obligation Timeout**: Auto-forfeit if async obligation not completed in 2× turn limit
2. **Host Moderation**: Kick player, extend someone else's time, pause game
3. **Timer Pause on Disconnect**: Pause timer when player disconnects, auto-timeout after 5min
4. **Historical Analytics**: Charts, graphs, leaderboards for time stats
5. **Custom Timer Profiles**: Save/load preset configurations
6. **Voice/Audio Alerts**: "30 seconds remaining" voice announcement
7. **Mobile Notifications**: Push notification when it's your turn
8. **Spectator Mode**: Watch games in progress with timer display

---

## Potential Issues & Mitigations

### Issue: Clock Drift
**Problem**: Client and server clocks may be out of sync, causing timer to appear incorrect.

**Mitigation**:
- Use server timestamps exclusively for enforcement
- Calculate elapsed time on client as `(Date.now() - turnStartTime)`
- Accept small display variance (<2s)

### Issue: Realtime Lag
**Problem**: WebSocket updates may take 1-2 seconds, causing timer to "jump".

**Mitigation**:
- Use optimistic updates for timer start/stop
- Smooth transitions with CSS animations
- Accept small lag as expected behavior

### Issue: Timezone Issues
**Problem**: `Date.now()` returns different values in different timezones.

**Mitigation**:
- Use Unix timestamps (timezone-agnostic)
- All calculations in UTC
- Display only, never enforce based on local time

### Issue: Background Tab Throttling
**Problem**: Browsers throttle `setInterval` in background tabs, causing timer to freeze.

**Mitigation**:
- Use `Date.now()` for calculations, not interval counters
- Timer catches up when tab regains focus
- Server is source of truth, client is display only

### Issue: Race Conditions
**Problem**: Player ends turn at exactly 0s, server timeout fires simultaneously.

**Mitigation**:
- Server action uses database transaction with row-level locking
- First write wins (either endTurn or timeout)
- Idempotent operations (safe to call twice)

### Issue: Check-on-Action Delay
**Problem**: If all players walk away mid-turn, timeout not enforced until someone returns.

**Mitigation**:
- This is acceptable behavior (game is paused anyway)
- When anyone returns and performs action, timeout is immediately detected
- Client shows locked state optimistically, so returning player sees correct UI

---

## File Summary

### New Files (15)
1. `lib/types/timer.ts` - Type definitions
2. `lib/services/timer-service.ts` - Core timer logic
3. `lib/services/obligation-tracker.ts` - Obligation detection
4. `lib/hooks/useTimerState.ts` - Timer state hook
5. `components/lobby/TimerConfigPanel.tsx` - Lobby config UI
6. `components/game/ui/TurnTimerBar.tsx` - Timer display
7. `components/game/ui/TimeBankDisplay.tsx` - Time bank display
8. `components/game/ui/ExtensionRequestButton.tsx` - Extension UI
9. `components/game/modals/WaitingOverlay.tsx` - Obligation overlay
10. `lib/services/timer-service.test.ts` - Unit tests
11. `lib/services/obligation-tracker.test.ts` - Unit tests
12. `lib/services/timer-integration.test.ts` - Integration tests
13. `docs/planning/timer-testing-checklist.md` - Test checklist
14. `docs/archive/planning/turn-timer-implementation-plan.md` - This archived document
15. `docs/planning/turn-timer-spec.md` - Updated spec

### Modified Files (8)
1. `lib/types/lobby.ts` - Add timerConfig
2. `lib/types/game.ts` - Add timer state fields
3. `lib/repositories/room-repository.ts` - Initialize timer config
4. `lib/services/game-service.ts` - Integrate timer logic with check-on-action enforcement
5. `components/lobby-view.tsx` - Add timer config panel
6. `components/game/player/CompactPlayerCard.tsx` - Add timer displays
7. `components/game/ui/ActionControls.tsx` - Add obligation check, extension button
8. `components/game/GameController.tsx` - Add waiting overlay

---

## Success Criteria

The implementation is complete when:

- [x] All lobby timer configuration options work
- [x] Timer starts/stops at correct turn boundaries
- [x] Time banks track correctly with refunds
- [x] Extensions work within limits
- [x] Locked state prevents optional actions (client-side optimistic + server validation)
- [x] All obligations correctly block roll dice
- [x] Waiting overlay shows blocking players
- [x] Check-on-action enforcement works correctly
- [x] All unit tests pass
- [x] Manual testing checklist complete
- [x] Zero game-breaking bugs
- [x] Performance acceptable (<100ms action latency)
- [x] Documentation updated

---

## Conclusion

This implementation plan provides a complete, production-ready turn timer feature that:

- ✅ Preserves "pause anytime" workflow (time only runs during main_phase)
- ✅ Tracks total gameplay time accurately
- ✅ Enforces time limits without auto-resolving decisions
- ✅ Prevents turn advancement until obligations complete
- ✅ Uses server-authoritative timing (no client cheating)
- ✅ Integrates cleanly with existing architecture
- ✅ Scales to multiple concurrent games
- ✅ Provides clear UI feedback
- ✅ Handles edge cases gracefully

**Key Architecture Decisions**:

1. **Client-Side Optimistic Locking**: Timer countdown calculated in real-time using `(Date.now() - turnStartTime)`. When timer reaches 0, client immediately disables buttons and shows locked UI without waiting for server.

2. **Server Check-on-Action Enforcement**: Every game action calls `checkAndEnforceTimeout()` which sets `timerLocked` flag if expired. This provides lazy but reliable enforcement without requiring background cron jobs.

3. **No Background Jobs**: Unlike traditional timer systems, this design works entirely on-demand. Timeout is detected when any player performs any action, making it simple, reliable, and deployment-agnostic.

4. **Timer Visibility**: All players see active player's countdown, increasing social pressure and reducing confusion.

5. **Simplified Scope**: No obligation timeout (not needed - game breaks if player abandons), no turn history (just aggregates), no disconnection tracking (timer runs naturally).

**Next Steps**:
1. Review this plan with senior developers
2. Get product owner approval on spec enhancements
3. Create GitHub issues for each phase
4. Begin Phase 0: Preparation
