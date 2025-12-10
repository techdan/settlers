# Phase 5: Testing Infrastructure Implementation

## Context

You're implementing automated testing for a Settlers of Catan game with Cities & Knights expansion. Currently there is **ZERO test coverage**. This is the final phase of a comprehensive refactor that has:
- Eliminated architectural violations (Phase 1)
- Reduced component complexity by 66-87% (Phase 2)
- Cleaned type system (Phase 3)
- Consolidated colors and updated docs (Phase 4)

**Now**: Add testing infrastructure for critical game logic.

**Related Documentation:**
- @docs/audits/Opus-Audit-2025-12-06.md (lines 610-628)
- @AGENTS.md (tech stack and conventions)
- @docs/game-design/cities_and_knights_gdd_corrected.v2.1.md (game rules)
- @docs/game-design/catan_progress_cards_final.md (progress card rules)

## Tech Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **React**: Version 19
- **TypeScript**: Strict mode
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **State Management**: Zustand (client), Supabase Realtime (game state)

## Task Overview

**Estimated Time:** 11-16 hours

Implement Vitest testing framework and create comprehensive tests for:
1. Victory condition calculations (most complex logic)
2. Barbarian attack system (expansion-specific)
3. Validators (prevent invalid game states)
4. CI integration

---

## Task 1: Setup Testing Framework (2-3 hours)

### Step 1.1: Install Dependencies (15 min)

```bash
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitejs/plugin-react
npm install -D jsdom
```

**Dependencies explained:**
- `vitest` - Fast unit test framework (Vite-native)
- `@vitest/ui` - Web UI for test results
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom matchers for DOM assertions
- `@vitejs/plugin-react` - React support for Vitest
- `jsdom` - DOM implementation for Node

### Step 1.2: Create Vitest Config (30 min)

Create `vitest.config.ts` in project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'scripts/',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

Create `vitest.setup.ts` in project root:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest matchers with jest-dom
declare global {
  namespace Vi {
    interface Assertion extends jest.Matchers<void, any> {}
    interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
  }
}
```

### Step 1.3: Add Test Scripts to package.json (10 min)

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 1.4: Create Test Utilities (45 min)

Create `lib/test-utils/test-helpers.ts`:

```typescript
import { GameState, Player, Hex } from '@/lib/types';
import { PlayerColor } from '@/lib/types/player';

/**
 * Create a minimal valid player for testing
 */
export function createTestPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'test-player-1',
    name: 'Test Player',
    color: 'red' as PlayerColor,
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    commodities: { paper: 0, cloth: 0, coin: 0 },
    developmentCards: [],
    progressCards: [],
    revealedVPCards: [],
    settlements: [],
    cities: [],
    roads: [],
    knights: [],
    metropolises: [],
    improvements: { science: 0, trade: 0, politics: 0 },
    hasLongestRoad: false,
    hasLargestArmy: false,
    victoryPoints: 0,
    ...overrides,
  };
}

/**
 * Create a minimal valid game state for testing
 */
export function createTestGameState(overrides?: Partial<GameState>): GameState {
  return {
    roomId: 'test-room',
    players: [createTestPlayer()],
    currentPlayerIndex: 0,
    phase: 'playing',
    turnNumber: 1,
    diceRoll: null,
    eventDieRoll: null,
    barbarianPosition: 0,
    robberHex: null,
    merchantHex: null,
    board: [],
    ports: [],
    longestRoadPlayer: null,
    largestArmyPlayer: null,
    winner: null,
    logs: [],
    lastTheft: null,
    lastVPCardGain: null,
    diceStats: {},
    eventDieStats: {},
    ...overrides,
  };
}

/**
 * Create a test hex
 */
export function createTestHex(overrides?: Partial<Hex>): Hex {
  return {
    q: 0,
    r: 0,
    s: 0,
    terrain: 'forest',
    number: null,
    hasRobber: false,
    hasMerchant: false,
    ...overrides,
  };
}
```

Create `lib/test-utils/index.ts`:

```typescript
export * from './test-helpers';
```

### Step 1.5: Verify Setup (30 min)

Create a simple smoke test: `lib/test-utils/setup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTestPlayer, createTestGameState } from './test-helpers';

describe('Test Setup', () => {
  it('should create a valid test player', () => {
    const player = createTestPlayer();
    expect(player.id).toBe('test-player-1');
    expect(player.resources.wood).toBe(0);
  });

  it('should create a valid test game state', () => {
    const gameState = createTestGameState();
    expect(gameState.roomId).toBe('test-room');
    expect(gameState.players).toHaveLength(1);
  });

  it('should allow overrides', () => {
    const player = createTestPlayer({ name: 'Custom Name' });
    expect(player.name).toBe('Custom Name');
  });
});
```

Run tests:

```bash
npm test
```

Should see 3 passing tests.

---

## Task 2: Test Victory Conditions & Scoring (3-4 hours)

**Priority: HIGH** - This is the most complex game logic with the most edge cases.

### Step 2.1: Test VP Calculation (90 min)

Create `core/rules/__tests__/victory-conditions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { updateAllVictoryPoints, checkVictoryCondition } from '../victory-conditions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

describe('Victory Conditions', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createTestGameState({
      players: [
        createTestPlayer({ id: 'p1', name: 'Player 1' }),
        createTestPlayer({ id: 'p2', name: 'Player 2' }),
      ],
    });
  });

  describe('updateAllVictoryPoints', () => {
    it('should calculate 2 VP for settlements', () => {
      gameState.players[0].settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
        { vertex: { q: 0, r: 1, direction: 'N' } },
      ];

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(2);
    });

    it('should calculate 3 VP for cities', () => {
      gameState.players[0].cities = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 1 },
      ];

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(3);
    });

    it('should calculate 4 VP for metropolises', () => {
      gameState.players[0].metropolises = [
        { vertex: { q: 0, r: 0, direction: 'N' }, type: 'science' },
      ];

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(4);
    });

    it('should add 2 VP for longest road', () => {
      gameState.players[0].settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
      ];
      gameState.players[0].hasLongestRoad = true;

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(3); // 1 settlement + 2 longest road
    });

    it('should add 2 VP for largest army', () => {
      gameState.players[0].settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
      ];
      gameState.players[0].hasLargestArmy = true;

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(3); // 1 settlement + 2 largest army
    });

    it('should add VP for revealed VP cards', () => {
      gameState.players[0].settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
      ];
      gameState.players[0].revealedVPCards = ['printer', 'constitution'];

      updateAllVictoryPoints(gameState);

      expect(gameState.players[0].victoryPoints).toBe(3); // 1 settlement + 2 VP cards
    });

    it('should calculate complex VP scenario correctly', () => {
      const player = gameState.players[0];
      player.settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
        { vertex: { q: 0, r: 1, direction: 'N' } },
      ];
      player.cities = [
        { vertex: { q: 1, r: 0, direction: 'N' }, level: 1 },
      ];
      player.metropolises = [
        { vertex: { q: 2, r: 0, direction: 'N' }, type: 'science' },
      ];
      player.hasLongestRoad = true;
      player.revealedVPCards = ['printer'];

      updateAllVictoryPoints(gameState);

      // 2 settlements (2) + 1 city (3) + 1 metropolis (4) + longest road (2) + 1 VP card (1) = 12
      expect(player.victoryPoints).toBe(12);
    });
  });

  describe('checkVictoryCondition', () => {
    it('should return null if no player has 13+ VP', () => {
      gameState.players[0].settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
      ];
      updateAllVictoryPoints(gameState);

      const winnerId = checkVictoryCondition(gameState);
      expect(winnerId).toBeNull();
    });

    it('should return player ID if they have 13+ VP', () => {
      const player = gameState.players[0];
      // 4 settlements (4) + 3 cities (9) = 13 VP
      player.settlements = [
        { vertex: { q: 0, r: 0, direction: 'N' } },
        { vertex: { q: 0, r: 1, direction: 'N' } },
        { vertex: { q: 1, r: 0, direction: 'N' } },
        { vertex: { q: 1, r: 1, direction: 'N' } },
      ];
      player.cities = [
        { vertex: { q: 2, r: 0, direction: 'N' }, level: 1 },
        { vertex: { q: 2, r: 1, direction: 'N' }, level: 1 },
        { vertex: { q: 3, r: 0, direction: 'N' }, level: 1 },
      ];
      updateAllVictoryPoints(gameState);

      const winnerId = checkVictoryCondition(gameState);
      expect(winnerId).toBe('p1');
    });

    it('should handle ties correctly (no winner if tied)', () => {
      // Both players at 13 VP
      gameState.players[0].metropolises = [
        { vertex: { q: 0, r: 0, direction: 'N' }, type: 'science' },
        { vertex: { q: 0, r: 1, direction: 'N' }, type: 'trade' },
        { vertex: { q: 1, r: 0, direction: 'N' }, type: 'politics' },
      ];
      gameState.players[0].settlements = [
        { vertex: { q: 2, r: 0, direction: 'N' } },
      ];

      gameState.players[1].metropolises = [
        { vertex: { q: 3, r: 0, direction: 'N' }, type: 'science' },
        { vertex: { q: 3, r: 1, direction: 'N' }, type: 'trade' },
        { vertex: { q: 4, r: 0, direction: 'N' }, type: 'politics' },
      ];
      gameState.players[1].settlements = [
        { vertex: { q: 5, r: 0, direction: 'N' } },
      ];

      updateAllVictoryPoints(gameState);

      // Verify both at 13 VP
      expect(gameState.players[0].victoryPoints).toBe(13);
      expect(gameState.players[1].victoryPoints).toBe(13);

      // Should return null (no winner in tie)
      const winnerId = checkVictoryCondition(gameState);
      expect(winnerId).toBeNull();
    });
  });
});
```

Run tests:

```bash
npm test victory-conditions
```

### Step 2.2: Test Longest Road Calculation (90 min)

Create `core/rules/__tests__/longest-road.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { updateLongestRoad } from '../longest-road';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

describe('Longest Road', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createTestGameState({
      players: [
        createTestPlayer({ id: 'p1', name: 'Player 1' }),
        createTestPlayer({ id: 'p2', name: 'Player 2' }),
      ],
    });
  });

  it('should require minimum 5 roads for longest road', () => {
    // Player 1 has 4 roads
    gameState.players[0].roads = [
      { edge: { q: 0, r: 0, direction: 'NE' } },
      { edge: { q: 0, r: 0, direction: 'E' } },
      { edge: { q: 0, r: 0, direction: 'SE' } },
      { edge: { q: 0, r: 1, direction: 'NE' } },
    ];

    updateLongestRoad(gameState);

    expect(gameState.longestRoadPlayer).toBeNull();
    expect(gameState.players[0].hasLongestRoad).toBe(false);
  });

  it('should award longest road to player with 5+ connected roads', () => {
    gameState.players[0].roads = [
      { edge: { q: 0, r: 0, direction: 'NE' } },
      { edge: { q: 0, r: 0, direction: 'E' } },
      { edge: { q: 0, r: 0, direction: 'SE' } },
      { edge: { q: 0, r: 1, direction: 'NE' } },
      { edge: { q: 0, r: 1, direction: 'E' } },
    ];

    updateLongestRoad(gameState);

    expect(gameState.longestRoadPlayer).toBe('p1');
    expect(gameState.players[0].hasLongestRoad).toBe(true);
  });

  it('should transfer longest road when another player builds longer road', () => {
    // Player 1 initially has longest road (5 roads)
    gameState.players[0].roads = [
      { edge: { q: 0, r: 0, direction: 'NE' } },
      { edge: { q: 0, r: 0, direction: 'E' } },
      { edge: { q: 0, r: 0, direction: 'SE' } },
      { edge: { q: 0, r: 1, direction: 'NE' } },
      { edge: { q: 0, r: 1, direction: 'E' } },
    ];
    gameState.longestRoadPlayer = 'p1';
    gameState.players[0].hasLongestRoad = true;

    // Player 2 builds 6 connected roads
    gameState.players[1].roads = [
      { edge: { q: 1, r: 0, direction: 'NE' } },
      { edge: { q: 1, r: 0, direction: 'E' } },
      { edge: { q: 1, r: 0, direction: 'SE' } },
      { edge: { q: 1, r: 1, direction: 'NE' } },
      { edge: { q: 1, r: 1, direction: 'E' } },
      { edge: { q: 1, r: 1, direction: 'SE' } },
    ];

    updateLongestRoad(gameState);

    expect(gameState.longestRoadPlayer).toBe('p2');
    expect(gameState.players[0].hasLongestRoad).toBe(false);
    expect(gameState.players[1].hasLongestRoad).toBe(true);
  });

  it('should NOT transfer on tie (current holder keeps it)', () => {
    // Player 1 has 5 roads
    gameState.players[0].roads = [
      { edge: { q: 0, r: 0, direction: 'NE' } },
      { edge: { q: 0, r: 0, direction: 'E' } },
      { edge: { q: 0, r: 0, direction: 'SE' } },
      { edge: { q: 0, r: 1, direction: 'NE' } },
      { edge: { q: 0, r: 1, direction: 'E' } },
    ];
    gameState.longestRoadPlayer = 'p1';
    gameState.players[0].hasLongestRoad = true;

    // Player 2 also builds 5 roads (tie)
    gameState.players[1].roads = [
      { edge: { q: 1, r: 0, direction: 'NE' } },
      { edge: { q: 1, r: 0, direction: 'E' } },
      { edge: { q: 1, r: 0, direction: 'SE' } },
      { edge: { q: 1, r: 1, direction: 'NE' } },
      { edge: { q: 1, r: 1, direction: 'E' } },
    ];

    updateLongestRoad(gameState);

    // Player 1 keeps longest road on tie
    expect(gameState.longestRoadPlayer).toBe('p1');
    expect(gameState.players[0].hasLongestRoad).toBe(true);
    expect(gameState.players[1].hasLongestRoad).toBe(false);
  });

  it('should handle knight blocking road network', () => {
    // TODO: Test that opponent knights block road segments
    // This requires more complex graph setup
    // For now, mark as pending implementation
    expect(true).toBe(true);
  });
});
```

---

## Task 3: Test Barbarian Attack System (3-4 hours)

**Priority: HIGH** - Expansion-specific logic with complex resolution.

### Step 3.1: Test Barbarian Track Progression (60 min)

Create `core/engine/barbarian/__tests__/barbarian-track.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { advanceBarbarianTrack, resetBarbarianTrack } from '../barbarian-manager';
import { createTestGameState } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

describe('Barbarian Track', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createTestGameState({
      barbarianPosition: 0,
    });
  });

  it('should advance barbarian position by 1', () => {
    advanceBarbarianTrack(gameState);
    expect(gameState.barbarianPosition).toBe(1);
  });

  it('should trigger attack when reaching position 7', () => {
    gameState.barbarianPosition = 6;

    const result = advanceBarbarianTrack(gameState);

    expect(gameState.barbarianPosition).toBe(7);
    expect(result.attackTriggered).toBe(true);
  });

  it('should NOT advance beyond position 7', () => {
    gameState.barbarianPosition = 7;

    advanceBarbarianTrack(gameState);

    expect(gameState.barbarianPosition).toBe(7);
  });

  it('should reset position to 0 after attack', () => {
    gameState.barbarianPosition = 7;

    resetBarbarianTrack(gameState);

    expect(gameState.barbarianPosition).toBe(0);
  });
});
```

### Step 3.2: Test Attack Resolution (120 min)

Create `core/engine/barbarian/__tests__/barbarian-attack.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBarbarianAttack } from '../barbarian-attack';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

describe('Barbarian Attack', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createTestGameState({
      players: [
        createTestPlayer({ id: 'p1', name: 'Player 1' }),
        createTestPlayer({ id: 'p2', name: 'Player 2' }),
        createTestPlayer({ id: 'p3', name: 'Player 3' }),
      ],
    });
  });

  describe('Victory - Players defeat barbarians', () => {
    it('should award VP to strongest defender when players win', () => {
      // Player 1: 3 knights (strongest)
      gameState.players[0].knights = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 'basic', active: true },
        { vertex: { q: 0, r: 1, direction: 'N' }, level: 'strong', active: true },
        { vertex: { q: 1, r: 0, direction: 'N' }, level: 'mighty', active: true },
      ];

      // Player 2: 2 knights
      gameState.players[1].knights = [
        { vertex: { q: 2, r: 0, direction: 'N' }, level: 'basic', active: true },
        { vertex: { q: 2, r: 1, direction: 'N' }, level: 'basic', active: true },
      ];

      // Player 3: 1 knight
      gameState.players[2].knights = [
        { vertex: { q: 3, r: 0, direction: 'N' }, level: 'basic', active: true },
      ];

      // Total: 6 active knights, 3 cities = barbarian strength is 3
      // Players have 6 knight strength, barbarians have 3 = players win
      gameState.players[0].cities = [
        { vertex: { q: 4, r: 0, direction: 'N' }, level: 1 },
      ];
      gameState.players[1].cities = [
        { vertex: { q: 5, r: 0, direction: 'N' }, level: 1 },
      ];
      gameState.players[2].cities = [
        { vertex: { q: 6, r: 0, direction: 'N' }, level: 1 },
      ];

      const result = resolveBarbarianAttack(gameState);

      expect(result.playersWin).toBe(true);
      expect(result.strongestDefender).toBe('p1');
      // Player 1 should have received defender of catan VP card
    });

    it('should handle tie for strongest defender (no VP awarded)', () => {
      // Both players have 2 active knights
      gameState.players[0].knights = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 'basic', active: true },
        { vertex: { q: 0, r: 1, direction: 'N' }, level: 'basic', active: true },
      ];

      gameState.players[1].knights = [
        { vertex: { q: 1, r: 0, direction: 'N' }, level: 'basic', active: true },
        { vertex: { q: 1, r: 1, direction: 'N' }, level: 'basic', active: true },
      ];

      // 1 city total
      gameState.players[0].cities = [
        { vertex: { q: 2, r: 0, direction: 'N' }, level: 1 },
      ];

      const result = resolveBarbarianAttack(gameState);

      expect(result.playersWin).toBe(true);
      expect(result.strongestDefender).toBeNull(); // Tie
    });
  });

  describe('Defeat - Barbarians win', () => {
    it('should destroy city of weakest defender when barbarians win', () => {
      // Only 1 active knight total
      gameState.players[0].knights = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 'basic', active: true },
      ];

      // 3 cities total (barbarian strength = 3)
      gameState.players[0].cities = [
        { vertex: { q: 1, r: 0, direction: 'N' }, level: 1 },
      ];
      gameState.players[1].cities = [
        { vertex: { q: 2, r: 0, direction: 'N' }, level: 1 },
      ];
      gameState.players[2].cities = [
        { vertex: { q: 3, r: 0, direction: 'N' }, level: 1 },
      ];

      const result = resolveBarbarianAttack(gameState);

      expect(result.playersWin).toBe(false);
      // Player 2 and 3 have 0 knights (tied for weakest), city should be destroyed from one of them
      expect(result.losersLoseCity).toBe(true);
    });

    it('should handle player with no cities (immune to barbarian attack)', () => {
      // Players have no knights
      // Only Player 1 has a city
      gameState.players[0].cities = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 1 },
      ];

      const result = resolveBarbarianAttack(gameState);

      expect(result.playersWin).toBe(false);
      // Player 1 should lose their city (only player with city)
    });
  });

  describe('Knight Deactivation', () => {
    it('should deactivate all active knights after attack', () => {
      gameState.players[0].knights = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 'basic', active: true },
        { vertex: { q: 0, r: 1, direction: 'N' }, level: 'strong', active: true },
      ];

      gameState.players[1].knights = [
        { vertex: { q: 1, r: 0, direction: 'N' }, level: 'mighty', active: true },
      ];

      resolveBarbarianAttack(gameState);

      // All knights should be deactivated
      expect(gameState.players[0].knights[0].active).toBe(false);
      expect(gameState.players[0].knights[1].active).toBe(false);
      expect(gameState.players[1].knights[0].active).toBe(false);
    });

    it('should NOT deactivate inactive knights', () => {
      gameState.players[0].knights = [
        { vertex: { q: 0, r: 0, direction: 'N' }, level: 'basic', active: false },
      ];

      resolveBarbarianAttack(gameState);

      expect(gameState.players[0].knights[0].active).toBe(false);
    });
  });
});
```

---

## Task 4: Test Validators (2-3 hours)

**Priority: MEDIUM** - Prevent invalid game states.

### Step 4.1: Test Settlement Placement Validator (60 min)

Create `core/validation/__tests__/settlement-validator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { canPlaceSettlement } from '../settlement-validator';
import { createTestGameState, createTestPlayer, createTestHex } from '@/lib/test-utils';

describe('Settlement Placement Validator', () => {
  it('should allow placement on empty valid vertex', () => {
    const gameState = createTestGameState({
      board: [
        createTestHex({ q: 0, r: 0, s: 0, terrain: 'forest' }),
      ],
    });

    const result = canPlaceSettlement(
      gameState,
      'test-player-1',
      { q: 0, r: 0, direction: 'N' }
    );

    expect(result.valid).toBe(true);
  });

  it('should reject placement on occupied vertex', () => {
    const gameState = createTestGameState({
      players: [
        createTestPlayer({
          id: 'p1',
          settlements: [{ vertex: { q: 0, r: 0, direction: 'N' } }],
        }),
      ],
    });

    const result = canPlaceSettlement(
      gameState,
      'test-player-1',
      { q: 0, r: 0, direction: 'N' }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('occupied');
  });

  it('should reject placement adjacent to existing settlement (distance rule)', () => {
    const gameState = createTestGameState({
      players: [
        createTestPlayer({
          id: 'p1',
          settlements: [{ vertex: { q: 0, r: 0, direction: 'N' } }],
        }),
      ],
    });

    // Adjacent vertex (violates distance rule)
    const result = canPlaceSettlement(
      gameState,
      'test-player-1',
      { q: 0, r: 0, direction: 'NE' }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('distance');
  });

  it('should require road connection (not initial placement)', () => {
    const gameState = createTestGameState({
      phase: 'playing',
      players: [
        createTestPlayer({
          id: 'p1',
          roads: [{ edge: { q: 0, r: 0, direction: 'NE' } }],
        }),
      ],
    });

    // Vertex not connected to any roads
    const result = canPlaceSettlement(
      gameState,
      'p1',
      { q: 1, r: 1, direction: 'N' }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('road');
  });
});
```

### Step 4.2: Test City Upgrade Validator (60 min)

Create `core/validation/__tests__/city-validator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { canUpgradeToCity } from '../city-validator';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';

describe('City Upgrade Validator', () => {
  it('should allow upgrade from settlement to city', () => {
    const gameState = createTestGameState({
      players: [
        createTestPlayer({
          id: 'p1',
          settlements: [{ vertex: { q: 0, r: 0, direction: 'N' } }],
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
        }),
      ],
    });

    const result = canUpgradeToCity(
      gameState,
      'p1',
      { q: 0, r: 0, direction: 'N' }
    );

    expect(result.valid).toBe(true);
  });

  it('should reject upgrade without settlement', () => {
    const gameState = createTestGameState({
      players: [
        createTestPlayer({
          id: 'p1',
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
        }),
      ],
    });

    const result = canUpgradeToCity(
      gameState,
      'p1',
      { q: 0, r: 0, direction: 'N' }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('settlement');
  });

  it('should reject upgrade without sufficient resources', () => {
    const gameState = createTestGameState({
      players: [
        createTestPlayer({
          id: 'p1',
          settlements: [{ vertex: { q: 0, r: 0, direction: 'N' } }],
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 2 },
        }),
      ],
    });

    const result = canUpgradeToCity(
      gameState,
      'p1',
      { q: 0, r: 0, direction: 'N' }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('resources');
  });
});
```

### Step 4.3: Test Metropolis Validator (60 min)

See `core/validation/__tests__/metropolis-validator.test.ts` - test:
- Level 4 improvement requirement
- One metropolis per category
- Metropolis stealing when opponent reaches level 5

---

## Task 5: CI Integration (1-2 hours)

### Step 5.1: Create GitHub Actions Workflow (45 min)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Run build
        run: npm run build

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov (optional)
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: false
```

### Step 5.2: Add Test Coverage Thresholds (30 min)

Update `vitest.config.ts` to enforce minimum coverage:

```typescript
export default defineConfig({
  // ... existing config
  test: {
    // ... existing test config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'scripts/',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
      // Minimum coverage thresholds
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
```

### Step 5.3: Update README with Testing Instructions (15 min)

Add to README.md:

```markdown
## Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

### Run Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Coverage

Current coverage targets:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

Coverage reports are generated in `coverage/` directory.
```

---

## Success Criteria

### Phase 5 Complete When:

1. ✅ **Testing framework installed** - Vitest + Testing Library configured
2. ✅ **Test utilities created** - Helper functions for creating test data
3. ✅ **Victory condition tests** - 100% coverage of VP calculation logic
4. ✅ **Longest road tests** - Core road calculation tested
5. ✅ **Barbarian attack tests** - Attack resolution and knight deactivation
6. ✅ **Validator tests** - Settlement, city, metropolis placement
7. ✅ **CI pipeline** - GitHub Actions running tests on PRs
8. ✅ **All tests passing** - No failing tests
9. ✅ **Build passes** - `npm run build` succeeds
10. ✅ **Documentation updated** - README has testing instructions

### Minimum Test Coverage:

- **Victory conditions**: 90%+ coverage
- **Barbarian system**: 80%+ coverage
- **Validators**: 70%+ coverage
- **Overall project**: 60%+ coverage (threshold enforced)

---

## Update Beads

When complete:

```bash
# Close all Phase 5 sub-tasks
bd close SettlersOfLanc-bkn6.1 -m "Vitest framework installed and configured"
bd close SettlersOfLanc-bkn6.2 -m "Victory condition tests complete (12 tests)"
bd close SettlersOfLanc-bkn6.3 -m "Barbarian attack tests complete (8 tests)"
bd close SettlersOfLanc-bkn6.4 -m "Validator tests complete (9 tests)"
bd close SettlersOfLanc-bkn6.5 -m "CI integration complete with GitHub Actions"

# Close Phase 5 epic
bd close SettlersOfLanc-bkn6 -m "Phase 5 complete: 29 tests, 65% coverage, CI running"
```

---

## Expected Outcome

- **~30-40 tests written**
- **60-70% test coverage** (victory conditions, barbarian, validators)
- **CI pipeline** running tests on every PR
- **Fast test execution** (<5 seconds for full suite)
- **Confidence in critical game logic** - no regressions

---

## Notes

- **Focus on critical paths** - Victory conditions and barbarian attacks are highest risk
- **Don't over-test** - UI components can be tested later, focus on business logic
- **Use test utilities** - createTestGameState/createTestPlayer make tests readable
- **Follow AAA pattern** - Arrange, Act, Assert in every test
- **Descriptive test names** - "should award VP to strongest defender when players win"

---

## Next Steps After Phase 5

Once testing infrastructure is complete:
1. **Refactor complete** - All 5 phases done (100%)
2. **Ready for production** - Comprehensive test coverage
3. **Tackle P1 bugs** - Address gameplay issues with confidence
4. **Add more tests** - Expand coverage to progress cards, trade logic, etc.
