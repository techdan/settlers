# Migration Guide - Using Refactored Code

This guide shows how to use the new refactored structure.

## Importing Types

### ✅ New Way (Recommended)
```typescript
import { GameState, PlayerState, DevCardType } from '@/lib/types';
import { Vertex, Edge } from '@/lib/types';
```

### ⚠️ Old Way (Still works, but deprecated)
```typescript
import { GameState, PlayerState } from '@/lib/game-types';
```

## Using Game Constants

### ✅ New Way
```typescript
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { BUILDING_COSTS, canAfford, deductCost } from '@/core/rules/building-costs';

// Check if player can afford a settlement
if (canAfford(player.resources, BUILDING_COSTS.settlement)) {
    deductCost(player.resources, BUILDING_COSTS.settlement);
    // Build settlement...
}

// Check victory condition
if (player.victoryPoints >= GAME_CONSTANTS.VICTORY_POINTS_TO_WIN) {
    // Player wins!
}
```

### ❌ Old Way
```typescript
// Constants hardcoded everywhere
if (player.victoryPoints >= 10) { /* ... */ }

// Manual resource checking
if (player.resources.wood >= 1 && player.resources.brick >= 1) {
    player.resources.wood -= 1;
    player.resources.brick -= 1;
}
```

## Using Longest Road Calculator

### ✅ New Way
```typescript
import { calculateLongestRoad, updateLongestRoad } from '@/core/engine/scoring/longest-road';

// Calculate for a specific player
const roadLength = calculateLongestRoad(gameState, playerId);

// Update game-wide longest road ownership
updateLongestRoad(gameState);
```

### ⚠️ Old Way (Still works)
```typescript
import { calculateLongestRoad } from '@/lib/game-logic';
```

## Using Victory Calculations

### ✅ New Way
```typescript
import { checkVictoryCondition, calculatePublicVictoryPoints } from '@/core/rules/victory-conditions';

// Check if anyone won
const winnerId = checkVictoryCondition(gameState);
if (winnerId) {
    gameState.winner = winnerId;
    gameState.phase = 'game_over';
}

// Calculate public VPs (excluding hidden dev cards)
const publicVPs = calculatePublicVictoryPoints(gameState, playerId);
```

## Example: Building a Road (Old vs New)

### ❌ Old Way (Everything in actions.ts)
```typescript
export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    // 100+ lines of:
    // - Database query
    // - Validation
    // - Resource checks (hardcoded costs)
    // - Game state updates
    // - Longest road calculation
    // - Database update
    // - Victory check (hardcoded)
}
```

### ✅ New Way (Coming in Phase 2+)
```typescript
import { buildingService } from '@/lib/services';

export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    return buildingService.buildRoad(roomId, playerId, edgeId);
}
```

Service layer:
```typescript
// lib/services/building-service.ts
import { BUILDING_COSTS, canAfford, deductCost } from '@/core/rules/building-costs';
import { updateLongestRoad } from '@/core/engine/scoring/longest-road';
import { checkVictoryCondition } from '@/core/rules/victory-conditions';

export class BuildingService {
    async buildRoad(roomId: string, playerId: string, edgeId: string) {
        const game = await this.gameRepository.findByRoomId(roomId);
        const player = game.players.find(p => p.id === playerId);
        
        // Validate using extracted validator
        this.validator.validateRoadPlacement(game, playerId, edgeId);
        
        // Check costs using extracted rules
        if (!canAfford(player.resources, BUILDING_COSTS.road)) {
            throw new Error('Insufficient resources');
        }
        
        // Deduct resources using extracted helper
        deductCost(player.resources, BUILDING_COSTS.road);
        
        // Place road
        game.board.edges[edgeId].owner = playerId;
        game.board.edges[edgeId].structure = 'road';
        player.roadsRemaining--;
        
        // Update longest road using extracted algorithm
        updateLongestRoad(game);
        
        // Check victory using extracted rule
        const winnerId = checkVictoryCondition(game);
        if (winnerId) {
            game.winner = winnerId;
            game.phase = 'game_over';
        }
        
        await this.gameRepository.update(game);
        return game;
    }
}
```

## Benefits of New Structure

### 1. **Testability**
```typescript
// Easy to unit test pure functions
test('canAfford returns true when player has resources', () => {
    const resources = { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 };
    expect(canAfford(resources, BUILDING_COSTS.road)).toBe(true);
});

test('calculateLongestRoad returns correct length', () => {
    const gameState = createMockGameWithRoads();
    expect(calculateLongestRoad(gameState, 'player1')).toBe(5);
});
```

### 2. **Reusability**
```typescript
// Same helper used in multiple places
import { canAfford } from '@/core/rules/building-costs';

// In UI component
const canBuildRoad = canAfford(player.resources, BUILDING_COSTS.road);

// In server action
if (!canAfford(player.resources, BUILDING_COSTS.road)) {
    throw new Error('Insufficient resources');
}

// In AI logic (future)
const affordableBuildings = ['road', 'settlement', 'city'].filter(
    building => canAfford(player.resources, BUILDING_COSTS[building])
);
```

### 3. **Maintainability**
```typescript
// Change victory points in ONE place
// core/rules/constants.ts
export const GAME_CONSTANTS = {
    VICTORY_POINTS_TO_WIN: 10, // Change here, affects everywhere
    // ...
};

// vs old way: find and replace magic number "10" in 20 files
```

## Gradual Migration Strategy

You can migrate gradually:

1. **Start using new imports** in new code
2. **Update existing code** when you touch it
3. **Old imports still work** via re-exports
4. **No rush** - migrate at your own pace

## IDE Autocomplete

The new structure improves IDE support:

```typescript
import { GAME_CONSTANTS } from '@/core/rules/constants';

// Autocomplete shows all constants
GAME_CONSTANTS. // → IDE suggests: VICTORY_POINTS_TO_WIN, STARTING_PIECES, etc.

import { BUILDING_COSTS } from '@/core/rules/building-costs';

// Autocomplete shows all building types
BUILDING_COSTS. // → IDE suggests: road, settlement, city, devCard
```

## Next Steps

As we continue refactoring:
- Validators will move to `@/core/validation/`
- Managers will be in `@/core/engine/{domain}/`
- Services will be in `@/lib/services/`
- Repositories will be in `@/lib/repositories/`

Stay tuned for Phase 2!
