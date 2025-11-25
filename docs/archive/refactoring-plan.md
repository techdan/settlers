# Settlers of Lanc - Architecture Refactoring Plan

## Executive Summary
The current codebase has grown organically with most logic consolidated in large monolithic files. This plan proposes a domain-driven architecture that separates concerns by game subsystems, improves maintainability, and follows Next.js best practices.

## Current Issues
1. **`app/actions.ts` (1346 lines)**: All server actions in one file
2. **`lib/game-logic.ts`**: Validation logic mixed with game rules
3. **`components/game/*`**: Flat structure without clear organization
4. **Lack of separation**: Business logic, validation, and persistence intermingled
5. **No service layer**: Direct database access from actions
6. **Missing abstractions**: Repeated patterns for resource management, validation

---

## Proposed Architecture

### 1. **Domain-Driven Design Structure**

```
app/
├── (routes)/              # Next.js app router pages
│   ├── page.tsx          # Home/lobby
│   ├── room/
│   │   └── [id]/
│   │       └── page.tsx
│   └── board/
│       └── flat/
│           └── page.tsx
│
├── actions/              # Server actions by domain
│   ├── index.ts         # Re-exports all actions
│   ├── room/
│   │   ├── create-room.ts
│   │   ├── join-room.ts
│   │   └── start-game.ts
│   ├── setup/
│   │   ├── place-settlement.ts
│   │   └── place-road.ts
│   ├── gameplay/
│   │   ├── roll-dice.ts
│   │   ├── end-turn.ts
│   │   └── move-robber.ts
│   ├── building/
│   │   ├── build-road.ts
│   │   ├── build-settlement.ts
│   │   ├── build-city.ts
│   │   └── place-bonus-road.ts
│   ├── trading/
│   │   ├── trade-with-bank.ts
│   │   ├── offer-trade.ts
│   │   ├── accept-trade.ts
│   │   └── cancel-trade.ts
│   └── development/
│       ├── buy-dev-card.ts
│       ├── play-dev-card.ts
│       └── discard-cards.ts
│
├── api/                  # REST API endpoints (if needed)
│   ├── game/
│   └── room/

components/
├── game/
│   ├── board/           # Board-related components
│   │   ├── Board.tsx
│   │   ├── EdgeRenderer.tsx
│   │   └── VertexRenderer.tsx
│   ├── controls/        # Game control components
│   │   ├── TurnControls.tsx
│   │   ├── DiceRoller.tsx
│   │   └── BuildControls.tsx
│   ├── player/          # Player-specific components
│   │   ├── PlayerHand.tsx
│   │   ├── PlayerDevCards.tsx
│   │   └── PlayerList.tsx
│   ├── status/          # Game status displays
│   │   ├── GameStatus.tsx
│   │   ├── GameLog.tsx
│   │   └── PhaseIndicator.tsx
│   ├── trading/         # Trading UI
│   │   ├── TradeModal.tsx
│   │   ├── TradeOfferDisplay.tsx
│   │   └── BankTradePanel.tsx
│   ├── modals/          # Modal dialogs
│   │   ├── DevCardModal.tsx
│   │   ├── DiscardModal.tsx
│   │   └── RobberModal.tsx
│   └── GameController.tsx
│
├── lobby/
│   └── LobbyView.tsx
│
├── themes/              # Theme components (already good)
│   ├── flat/
│   └── voxel/
│
└── ui/                  # Shared UI components
    └── button.tsx

core/                     # NEW: Core game engine
├── engine/
│   ├── board/
│   │   ├── board-generator.ts      # Board generation
│   │   ├── hex-geometry.ts         # Hex math & coordinates
│   │   └── port-generator.ts       # Port placement
│   ├── game-state/
│   │   ├── game-state-manager.ts   # State transitions
│   │   ├── turn-manager.ts         # Turn order logic
│   │   └── phase-manager.ts        # Game phase logic
│   ├── resources/
│   │   ├── resource-manager.ts     # Resource distribution
│   │   └── resource-calculator.ts  # Dice roll payouts
│   ├── buildings/
│   │   ├── building-manager.ts     # Building placement
│   │   └── building-validator.ts   # Placement validation
│   ├── trading/
│   │   ├── trade-manager.ts        # Trade execution
│   │   └── port-calculator.ts      # Port rate calculation
│   ├── development/
│   │   ├── dev-card-manager.ts     # Dev card deck & play
│   │   └── dev-card-effects.ts     # Card effect handlers
│   ├── scoring/
│   │   ├── victory-calculator.ts   # VP calculation
│   │   ├── longest-road.ts         # Longest road algorithm
│   │   └── largest-army.ts         # Largest army tracking
│   └── robber/
│       ├── robber-manager.ts       # Robber movement
│       └── stealing-handler.ts     # Resource stealing
│
├── validation/
│   ├── setup-validator.ts          # Setup phase validation
│   ├── building-validator.ts       # Building rules
│   ├── trading-validator.ts        # Trade validation
│   └── action-validator.ts         # General action validation
│
└── rules/
    ├── constants.ts                # Game constants
    ├── building-costs.ts           # Resource costs
    └── victory-conditions.ts       # Win conditions

lib/
├── db/                  # Database layer
│   ├── schema.ts
│   ├── queries/         # NEW: Organized queries
│   │   ├── game-queries.ts
│   │   ├── player-queries.ts
│   │   └── room-queries.ts
│   └── repositories/    # NEW: Data access layer
│       ├── game-repository.ts
│       ├── player-repository.ts
│       └── room-repository.ts
│
├── services/            # NEW: Business logic services
│   ├── game-service.ts  # Game orchestration
│   ├── room-service.ts  # Room management
│   └── player-service.ts # Player management
│
├── types/               # Centralized types
│   ├── game.ts         # Game state types
│   ├── player.ts       # Player types
│   ├── board.ts        # Board types
│   └── index.ts        # Re-exports
│
├── utils/              # Utility functions
│   ├── format.ts       # Formatters
│   ├── validation.ts   # Common validators
│   └── random.ts       # RNG utilities
│
└── stores/             # Client state management
    ├── theme-store.ts
    └── game-store.ts   # NEW: Client-side game state
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
**Goal**: Set up new structure without breaking functionality

1. **Create new directories**
   ```bash
   mkdir -p core/{engine,validation,rules}
   mkdir -p core/engine/{board,game-state,resources,buildings,trading,development,scoring,robber}
   mkdir -p lib/{services,repositories,types}
   mkdir -p app/actions/{room,setup,gameplay,building,trading,development}
   mkdir -p components/game/{board,controls,player,status,trading,modals}
   ```

2. **Extract types to `lib/types/`**
   - Move from `lib/game-types.ts` → `lib/types/game.ts`
   - Split into logical modules (game, player, board)
   - Create barrel exports

3. **Extract constants to `core/rules/`**
   - Building costs
   - Victory points
   - Resource types
   - Game configuration

### Phase 2: Core Engine (Week 2)
**Goal**: Extract business logic from actions

1. **Create Managers**
   - `ResourceManager`: Handle resource distribution
   - `BuildingManager`: Handle building placement
   - `TradeManager`: Handle trade execution
   - `DevCardManager`: Handle dev card logic

2. **Extract Algorithms**
   - Move `calculateLongestRoad` → `core/engine/scoring/longest-road.ts`
   - Move hex calculations → `core/engine/board/hex-geometry.ts`
   - Move board generation → `core/engine/board/board-generator.ts`

3. **Create Validators**
   - Extract validation from actions
   - Centralize in `core/validation/`

### Phase 3: Service Layer (Week 3)
**Goal**: Abstract database access

1. **Create Repositories**
   - `GameRepository`: CRUD for games
   - `RoomRepository`: CRUD for rooms
   - `PlayerRepository`: CRUD for players

2. **Create Services**
   - `GameService`: Orchestrate game operations
   - `RoomService`: Room lifecycle management
   - `PlayerService`: Player management

3. **Update actions to use services**
   - Actions become thin wrappers
   - Services handle business logic
   - Repositories handle data access

### Phase 4: Split Actions (Week 4)
**Goal**: Break up monolithic actions file

1. **Room actions** → `app/actions/room/`
   - create-room.ts
   - join-room.ts
   - start-game.ts

2. **Gameplay actions** → `app/actions/gameplay/`
   - roll-dice.ts
   - end-turn.ts
   - move-robber.ts

3. **Building actions** → `app/actions/building/`
   - build-road.ts
   - build-settlement.ts
   - build-city.ts

4. **Create index file** for re-exports
   ```typescript
   export * from './room';
   export * from './gameplay';
   export * from './building';
   export * from './trading';
   export * from './development';
   ```

### Phase 5: Component Organization (Week 5)
**Goal**: Organize components by feature

1. **Reorganize `components/game/`**
   - Group by feature (board, controls, player, etc.)
   - Extract shared logic to hooks
   - Create component composition

2. **Create custom hooks**
   - `useGameState()`: Subscribe to game state
   - `usePlayerHand()`: Player-specific data
   - `useGameActions()`: Action dispatchers

### Phase 6: Testing & Documentation (Week 6)
**Goal**: Add tests and documentation

1. **Unit tests**
   - Test managers and validators
   - Test algorithms (longest road, scoring)
   - Test repositories

2. **Integration tests**
   - Test service layer
   - Test action workflows

3. **Documentation**
   - Add JSDoc comments
   - Create architecture diagrams
   - Update README

---

## Key Principles

### 1. **Separation of Concerns**
- **Actions**: Thin wrappers, auth/validation entry points
- **Services**: Business logic orchestration
- **Managers**: Domain-specific operations
- **Repositories**: Data access only
- **Validators**: Pure validation functions

### 2. **Single Responsibility**
- Each file has one clear purpose
- Functions do one thing well
- Easy to test in isolation

### 3. **Dependency Injection**
```typescript
// Example: BuildingManager
export class BuildingManager {
  constructor(
    private validator: BuildingValidator,
    private resourceManager: ResourceManager,
    private gameRepository: GameRepository
  ) {}

  async buildRoad(gameId: string, playerId: string, edgeId: string) {
    // Use injected dependencies
  }
}
```

### 4. **Composition over Inheritance**
```typescript
// Compose managers
const gameService = new GameService({
  buildingManager,
  resourceManager,
  tradeManager,
  scoreCalculator
});
```

### 5. **Pure Functions Where Possible**
```typescript
// validators/, rules/, calculators/ should be pure
export function validateRoadPlacement(
  gameState: GameState,
  playerId: string,
  edgeId: string
): ValidationResult {
  // No side effects, easy to test
}
```

---

## Example Refactored Action

### Before (in actions.ts):
```typescript
export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
  // 100+ lines of validation, resource management, database updates
}
```

### After (in app/actions/building/build-road.ts):
```typescript
'use server';

import { gameService } from '@/lib/services';

export async function buildRoad(
  roomId: string,
  playerId: string,
  edgeId: string
) {
  return gameService.buildRoad(roomId, playerId, edgeId);
}
```

### Service Layer (lib/services/game-service.ts):
```typescript
export class GameService {
  async buildRoad(roomId: string, playerId: string, edgeId: string) {
    const game = await this.gameRepository.findByRoomId(roomId);
    
    // Validate
    this.validator.validatePlayerTurn(game, playerId);
    this.buildingValidator.validateRoadPlacement(game, playerId, edgeId);
    
    // Execute
    const updatedGame = await this.buildingManager.placeRoad(game, playerId, edgeId);
    
    // Persist
    await this.gameRepository.update(updatedGame);
    
    return updatedGame;
  }
}
```

---

## Benefits

1. **Maintainability**: Each file <200 lines, single purpose
2. **Testability**: Pure functions, dependency injection
3. **Reusability**: Managers can be used by multiple actions
4. **Scalability**: Easy to add new features
5. **Clarity**: Clear separation of concerns
6. **Team Collaboration**: Parallel development on different subsystems

---

## Risks & Mitigation

### Risk: Breaking existing functionality
**Mitigation**: 
- Migrate incrementally
- Keep old code until new code is tested
- Comprehensive testing at each phase

### Risk: Over-engineering
**Mitigation**:
- Start with high-value extractions (longest road, validation)
- Don't abstract until pattern is clear
- YAGNI principle

### Risk: Development slowdown
**Mitigation**:
- Dedicate 1-2 weeks for refactoring
- Don't add new features during refactoring
- Pair refactoring with feature freeze

---

## Next Steps

1. **Review and approve** this plan
2. **Start with Phase 1**: Directory structure and types
3. **Extract one subsystem** as proof of concept (e.g., building system)
4. **Validate approach** before proceeding to full migration
5. **Iterate** based on learnings

---

## Conclusion

This refactoring will transform the codebase from a monolithic structure to a well-organized, domain-driven architecture. The incremental approach minimizes risk while delivering immediate benefits in code clarity and maintainability.
