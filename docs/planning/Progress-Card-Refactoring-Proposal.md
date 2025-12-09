# Phase 2 Task 2: Progress Card System Refactoring
## Architectural Proposal

---

## Current State Analysis

**File**: `core/engine/progress/progress-card-manager.ts` (1,767 lines)

**Problems**:
- Single monolithic file handling all 25 progress cards
- Mixed concerns: card drawing, validation, execution, state management
- Difficult to test individual cards in isolation
- Hard to understand card-specific logic buried in large switch statements

**Card Complexity Breakdown** (from exploration):
- **Simple instant effects** (10-30 lines): Irrigation, Mining, Encouragement, Merchant Fleet, Espionage
- **Single-selection cards** (30-40 lines): Crane, Engineer, Medicine, Merchant, Taxation, Inventor
- **Opponent-targeting cards** (25-45 lines): Resource Monopoly, Trade Monopoly, Guild Dues, Smith
- **Multi-stage cards** (80-180 lines): Commercial Harbor (181L), Wedding (166L), Road Building, Treason
- **Complex multi-step** (35-125 lines): Alchemist (125L), Diplomat, Intrigue, Saboteur
- **VP auto-reveal cards**: Printer, Constitution

---

## Option 1: Class Hierarchy Approach

### Structure
```
core/engine/progress/
├── base/
│   ├── ProgressCard.ts           # Abstract base class
│   ├── InstantCard.ts            # For simple instant effects
│   ├── SelectionCard.ts          # For single-selection cards
│   └── MultiStageCard.ts         # For complex multi-stage flows
├── cards/
│   ├── science/
│   │   ├── AlchemistCard.ts
│   │   ├── CraneCard.ts
│   │   ├── EngineerCard.ts
│   │   ├── IrrigationCard.ts
│   │   ├── MedicineCard.ts
│   │   ├── MiningCard.ts
│   │   ├── PrinterCard.ts
│   │   ├── RoadBuildingCard.ts
│   │   └── SmithCard.ts
│   ├── trade/
│   │   ├── CommercialHarborCard.ts
│   │   ├── MasterMerchantCard.ts
│   │   ├── MerchantCard.ts
│   │   ├── MerchantFleetCard.ts
│   │   ├── ResourceMonopolyCard.ts
│   │   └── TradeMonopolyCard.ts
│   └── politics/
│       ├── BishopCard.ts
│       ├── ConstitutionCard.ts
│       ├── DiplomatCard.ts
│       ├── IntrigueCard.ts
│       ├── SaboteurCard.ts
│       ├── SpyCard.ts
│       ├── WarlordCard.ts
│       └── WeddingCard.ts
├── registry/
│   └── CardRegistry.ts           # Maps card types to classes
└── ProgressCardManager.ts        # Orchestrator (draw/play)
```

### Base Class Design
```typescript
abstract class ProgressCard {
  abstract readonly type: ProgressCardType;
  abstract readonly category: 'science' | 'trade' | 'politics';
  abstract readonly isVictoryPoint: boolean;

  // Validation
  abstract canPlay(state: GameState, playerId: string): boolean;

  // Execution (may be multi-stage)
  abstract play(state: GameState, playerId: string, options?: any): GameState;

  // Optional: For cards requiring UI interaction
  getRequiredInteraction?(): InteractionType;
}

class InstantCard extends ProgressCard {
  // Simple implementation - just modify state and return
  play(state: GameState, playerId: string): GameState {
    return this.applyEffect(state, playerId);
  }

  protected abstract applyEffect(state: GameState, playerId: string): GameState;
}

class MultiStageCard extends ProgressCard {
  // Handles activeEffect tracking and pending state
  play(state: GameState, playerId: string, options?: any): GameState {
    if (!state.activeEffect) {
      return this.initiate(state, playerId);
    } else {
      return this.handleResponse(state, playerId, options);
    }
  }

  protected abstract initiate(state: GameState, playerId: string): GameState;
  protected abstract handleResponse(state: GameState, playerId: string, options: any): GameState;
}
```

### Example Card Implementation
```typescript
// Simple instant card
class IrrigationCard extends InstantCard {
  readonly type = 'irrigation';
  readonly category = 'science';
  readonly isVictoryPoint = false;

  canPlay(state: GameState, playerId: string): boolean {
    return state.currentTurn === playerId;
  }

  protected applyEffect(state: GameState, playerId: string): GameState {
    const newState = { ...state };
    const hexes = Object.values(newState.board.hexes).filter(h => h.terrain === 'field');

    for (const hex of hexes) {
      const adjacentVertices = getVertexIdsForHex(hex.id);
      const hasBuilding = adjacentVertices.some(vId => {
        const vertex = newState.board.vertices[vId];
        return vertex?.owner === playerId && vertex.structure;
      });

      if (hasBuilding) {
        const player = newState.players.find(p => p.id === playerId)!;
        player.resources.wheat = (player.resources.wheat || 0) + 1;
      }
    }

    return newState;
  }
}

// Complex multi-stage card
class CommercialHarborCard extends MultiStageCard {
  readonly type = 'commercial_harbor';
  readonly category = 'trade';
  readonly isVictoryPoint = false;

  canPlay(state: GameState, playerId: string): boolean {
    return state.currentTurn === playerId;
  }

  protected initiate(state: GameState, playerId: string): GameState {
    const newState = { ...state };
    newState.pendingCommercialHarbor = {
      initiatorId: playerId,
      responses: {},
      trades: []
    };
    newState.activeEffect = 'commercial_harbor';
    return newState;
  }

  protected handleResponse(state: GameState, playerId: string, options: any): GameState {
    // Handle player responses and execute batch trades
    // ... implementation ...
  }
}
```

### Pros
- Clear inheritance hierarchy
- Easy to understand card behavior at a glance
- Type-safe with TypeScript
- Simple cards remain simple (minimal boilerplate)
- Complex cards get full control

### Cons
- More files (25 card files + base classes)
- Inheritance can be rigid for cards that don't fit patterns
- Shared utilities still need separate module

---

## Option 2: Strategy Pattern with Registry

### Structure
```
core/engine/progress/
├── types/
│   ├── CardDefinition.ts         # Card metadata interface
│   └── CardExecutor.ts           # Execution strategy interface
├── executors/
│   ├── instant/
│   │   ├── IrrigationExecutor.ts
│   │   ├── MiningExecutor.ts
│   │   └── ...
│   ├── selection/
│   │   ├── CraneExecutor.ts
│   │   ├── MerchantExecutor.ts
│   │   └── ...
│   └── multi-stage/
│       ├── CommercialHarborExecutor.ts
│       ├── WeddingExecutor.ts
│       └── ...
├── validators/
│   └── CardValidators.ts         # Centralized validation logic
├── utilities/
│   ├── ResourceTransfer.ts       # Common resource operations
│   ├── BoardScanning.ts          # Common board queries
│   └── StateManagement.ts        # ActiveEffect/pending helpers
├── registry/
│   └── CardRegistry.ts           # Maps types to executors + metadata
└── ProgressCardManager.ts        # Orchestrator
```

### Strategy Interface
```typescript
interface CardExecutor {
  execute(state: GameState, playerId: string, options?: any): GameState;
  canExecute(state: GameState, playerId: string): boolean;
}

interface CardDefinition {
  type: ProgressCardType;
  category: 'science' | 'trade' | 'politics';
  isVictoryPoint: boolean;
  requiresInteraction: boolean;
  executor: CardExecutor;
  validator?: (state: GameState, playerId: string) => boolean;
}

class CardRegistry {
  private cards: Map<ProgressCardType, CardDefinition> = new Map();

  register(definition: CardDefinition) {
    this.cards.set(definition.type, definition);
  }

  get(type: ProgressCardType): CardDefinition | undefined {
    return this.cards.get(type);
  }

  // Initialize all cards
  static create(): CardRegistry {
    const registry = new CardRegistry();

    registry.register({
      type: 'irrigation',
      category: 'science',
      isVictoryPoint: false,
      requiresInteraction: false,
      executor: new IrrigationExecutor()
    });

    // ... register all 25 cards ...

    return registry;
  }
}
```

### Example Executor
```typescript
class IrrigationExecutor implements CardExecutor {
  canExecute(state: GameState, playerId: string): boolean {
    return state.currentTurn === playerId;
  }

  execute(state: GameState, playerId: string): GameState {
    const newState = { ...state };
    const hexes = Object.values(newState.board.hexes).filter(h => h.terrain === 'field');

    for (const hex of hexes) {
      if (BoardScanning.hasAdjacentBuilding(newState, hex.id, playerId)) {
        ResourceTransfer.addResource(newState, playerId, 'wheat', 1);
      }
    }

    return newState;
  }
}
```

### Pros
- Composition over inheritance (more flexible)
- Shared utilities are explicit and reusable
- Easy to swap/mock executors for testing
- Registry provides central card catalog
- Validator/executor separation

### Cons
- More indirection (registry lookup)
- Less obvious card behavior (need to find executor)
- More boilerplate for simple cards
- 25+ executor files

---

## Option 3: Hybrid Command + Config Approach

### Structure
```
core/engine/progress/
├── config/
│   └── card-definitions.ts       # Declarative configs for simple cards
├── commands/
│   ├── AlchemistCommand.ts       # Custom logic for complex cards
│   ├── CommercialHarborCommand.ts
│   ├── WeddingCommand.ts
│   ├── TreasonCommand.ts
│   ├── IntrigueCommand.ts
│   └── ...                       # Only 8-10 complex cards
├── effects/
│   ├── ResourceEffects.ts        # Reusable effect builders
│   ├── BuildingEffects.ts
│   └── KnightEffects.ts
├── utilities/
│   ├── ResourceTransfer.ts
│   ├── BoardScanning.ts
│   └── StateManagement.ts
├── CardExecutor.ts               # Interprets configs + runs commands
└── ProgressCardManager.ts        # Orchestrator
```

### Config-Driven for Simple Cards
```typescript
// card-definitions.ts
export const SIMPLE_CARD_CONFIGS: CardConfig[] = [
  {
    type: 'irrigation',
    category: 'science',
    isVictoryPoint: false,
    effects: [
      {
        type: 'add_resource_per_hex',
        resource: 'wheat',
        hexTerrain: 'field',
        requiresAdjacentBuilding: true
      }
    ]
  },
  {
    type: 'mining',
    category: 'science',
    isVictoryPoint: false,
    effects: [
      {
        type: 'add_resource_per_hex',
        resource: 'ore',
        hexTerrain: 'mountain',
        requiresAdjacentBuilding: true
      }
    ]
  },
  {
    type: 'merchant_fleet',
    category: 'trade',
    isVictoryPoint: false,
    effects: [
      {
        type: 'add_resource_per_hex',
        resource: 'wheat',
        hexTerrain: 'sea',
        requiresAdjacentBuilding: true,
        resourceMapping: {
          'sea_wheat': 'wheat',
          'sea_ore': 'ore'
        }
      }
    ]
  },
  // ... 15 more simple cards
];
```

### Command Pattern for Complex Cards
```typescript
interface ProgressCardCommand {
  type: ProgressCardType;
  category: 'science' | 'trade' | 'politics';
  isVictoryPoint: boolean;

  canExecute(state: GameState, playerId: string): boolean;
  execute(state: GameState, playerId: string, options?: any): GameState;
}

class CommercialHarborCommand implements ProgressCardCommand {
  readonly type = 'commercial_harbor';
  readonly category = 'trade';
  readonly isVictoryPoint = false;

  canExecute(state: GameState, playerId: string): boolean {
    return state.currentTurn === playerId;
  }

  execute(state: GameState, playerId: string, options?: any): GameState {
    if (!state.activeEffect) {
      return this.initiate(state, playerId);
    } else {
      return this.handleResponse(state, playerId, options);
    }
  }

  private initiate(state: GameState, playerId: string): GameState {
    // ... multi-stage logic ...
  }

  private handleResponse(state: GameState, playerId: string, options: any): GameState {
    // ... handle player responses ...
  }
}
```

### Card Executor
```typescript
class CardExecutor {
  private commands: Map<ProgressCardType, ProgressCardCommand>;
  private configs: Map<ProgressCardType, CardConfig>;

  constructor() {
    // Register complex card commands
    this.commands = new Map([
      ['alchemist', new AlchemistCommand()],
      ['commercial_harbor', new CommercialHarborCommand()],
      ['wedding', new WeddingCommand()],
      ['treason', new TreasonCommand()],
      ['intrigue', new IntrigueCommand()],
      ['diplomat', new DiplomatCommand()],
      ['saboteur', new SaboteurCommand()],
      ['road_building', new RoadBuildingCommand()],
      // ~8-10 complex cards total
    ]);

    // Load simple card configs
    this.configs = new Map(
      SIMPLE_CARD_CONFIGS.map(cfg => [cfg.type, cfg])
    );
  }

  execute(type: ProgressCardType, state: GameState, playerId: string, options?: any): GameState {
    // Check if complex card with custom command
    const command = this.commands.get(type);
    if (command) {
      return command.execute(state, playerId, options);
    }

    // Otherwise execute config-driven card
    const config = this.configs.get(type);
    if (config) {
      return this.executeConfig(config, state, playerId);
    }

    throw new Error(`Unknown card type: ${type}`);
  }

  private executeConfig(config: CardConfig, state: GameState, playerId: string): GameState {
    let newState = { ...state };

    for (const effect of config.effects) {
      newState = this.applyEffect(effect, newState, playerId);
    }

    return newState;
  }

  private applyEffect(effect: CardEffect, state: GameState, playerId: string): GameState {
    switch (effect.type) {
      case 'add_resource_per_hex':
        return ResourceEffects.addResourcePerHex(state, playerId, effect);
      case 'steal_from_opponents':
        return ResourceEffects.stealFromOpponents(state, playerId, effect);
      case 'upgrade_knight':
        return KnightEffects.upgradeKnight(state, playerId, effect);
      // ... more effect types
    }
  }
}
```

### Pros
- **Best of both worlds**: Simple cards stay simple (config), complex cards get full control (commands)
- **Minimal files**: Only 8-10 command files for complex cards
- **Highly testable**: Effects are pure functions, configs are data
- **Easy to add simple cards**: Just add to config array
- **Shared utilities**: ResourceEffects, BoardScanning, etc.

### Cons
- Two execution paths (config vs command)
- Need to design effect types carefully
- Config system adds abstraction layer

---

## Recommended Approach: Option 3 (Hybrid)

### Rationale
1. **Simplicity where it matters**: 17 of 25 cards are simple instant/selection effects that fit well in declarative configs
2. **Flexibility for complexity**: 8 cards (Alchemist, Commercial Harbor, Wedding, Treason, Intrigue, Diplomat, Saboteur, Road Building) need custom multi-stage logic
3. **Maintainability**: Adding a new simple card = adding config object (low friction)
4. **Testability**: Effect functions are pure and reusable
5. **File count**: ~15 files total vs. 25+ in other options

### Critical Files to Create
```
core/engine/progress/
├── config/
│   └── card-definitions.ts               # NEW: ~150 lines
├── commands/
│   ├── AlchemistCommand.ts               # NEW: ~130 lines
│   ├── CommercialHarborCommand.ts        # NEW: ~190 lines
│   ├── WeddingCommand.ts                 # NEW: ~170 lines
│   ├── TreasonCommand.ts                 # NEW: ~80 lines
│   ├── IntrigueCommand.ts                # NEW: ~70 lines
│   ├── DiplomatCommand.ts                # NEW: ~60 lines
│   ├── SaboteurCommand.ts                # NEW: ~60 lines
│   └── RoadBuildingCommand.ts            # NEW: ~50 lines
├── effects/
│   ├── ResourceEffects.ts                # NEW: ~200 lines
│   ├── BuildingEffects.ts                # NEW: ~100 lines
│   └── KnightEffects.ts                  # NEW: ~80 lines
├── utilities/
│   ├── ResourceTransfer.ts               # NEW: ~100 lines
│   ├── BoardScanning.ts                  # NEW: ~120 lines
│   └── StateManagement.ts                # NEW: ~80 lines
├── types/
│   ├── CardConfig.ts                     # NEW: ~50 lines
│   └── CardEffect.ts                     # NEW: ~40 lines
├── CardExecutor.ts                       # NEW: ~150 lines
└── ProgressCardManager.ts                # REFACTOR: ~300 lines (from 1,767)
```

**Total**: ~2,000 lines across 17 files vs. 1,767 lines in 1 file

---

## Migration Strategy

### Phase 1: Setup Infrastructure (No Breaking Changes)
1. Create directory structure
2. Create type definitions (CardConfig, CardEffect, ProgressCardCommand)
3. Create utility modules (ResourceTransfer, BoardScanning, StateManagement)
4. Create effect modules (ResourceEffects, BuildingEffects, KnightEffects)
5. Run tests - should still pass (no functional changes yet)

### Phase 2: Migrate Simple Cards (Incremental)
1. Create card-definitions.ts with first 5 simple cards (Irrigation, Mining, Encouragement, Merchant Fleet, Espionage)
2. Create CardExecutor with config interpreter
3. Update ProgressCardManager to use CardExecutor for those 5 cards
4. Test those 5 cards thoroughly
5. Migrate remaining 12 simple cards in batches of 3-4
6. Test each batch

### Phase 3: Migrate Complex Cards (One at a Time)
1. Start with simplest complex card (Road Building)
2. Create RoadBuildingCommand
3. Register in CardExecutor
4. Test thoroughly
5. Repeat for remaining 7 complex cards in order of complexity:
   - Intrigue → Diplomat → Saboteur → Treason → Wedding → Commercial Harbor → Alchemist

### Phase 4: Cleanup
1. Remove old switch statements from progress-card-manager.ts
2. Verify ProgressCardManager is now ~300 lines (orchestration only)
3. Run full test suite
4. Update documentation

### Rollback Plan
- Keep original progress-card-manager.ts as progress-card-manager.legacy.ts
- Feature flag: `USE_NEW_CARD_SYSTEM` (default: false initially)
- Gradual rollout: enable for testing, then production
- Can revert to legacy with single flag change

---

## File Organization Final Structure

```
core/engine/progress/
├── types/
│   ├── CardConfig.ts                 # Config schema for simple cards
│   ├── CardEffect.ts                 # Effect type definitions
│   └── index.ts                      # Barrel export
│
├── config/
│   └── card-definitions.ts           # All 17 simple card configs
│
├── commands/
│   ├── AlchemistCommand.ts           # Complex card: Alchemist
│   ├── CommercialHarborCommand.ts    # Complex card: Commercial Harbor
│   ├── WeddingCommand.ts             # Complex card: Wedding
│   ├── TreasonCommand.ts             # Complex card: Treason
│   ├── IntrigueCommand.ts            # Complex card: Intrigue
│   ├── DiplomatCommand.ts            # Complex card: Diplomat
│   ├── SaboteurCommand.ts            # Complex card: Saboteur
│   ├── RoadBuildingCommand.ts        # Complex card: Road Building
│   └── index.ts                      # Barrel export
│
├── effects/
│   ├── ResourceEffects.ts            # Resource-related effects
│   ├── BuildingEffects.ts            # Building-related effects
│   ├── KnightEffects.ts              # Knight-related effects
│   └── index.ts                      # Barrel export
│
├── utilities/
│   ├── ResourceTransfer.ts           # Resource add/remove/steal helpers
│   ├── BoardScanning.ts              # Hex-adjacent queries, building checks
│   ├── StateManagement.ts            # ActiveEffect/pending state helpers
│   └── index.ts                      # Barrel export
│
├── CardExecutor.ts                   # Main executor (config + command router)
├── ProgressCardManager.ts            # Refactored orchestrator (~300 lines)
└── progress-card-manager.legacy.ts   # Backup of original (for rollback)
```

**Total Files**: 17 new files + 1 refactored + 1 backup = 19 files
**Total Lines**: ~2,000 lines (well-organized) vs. 1,767 lines (monolithic)

---

## Success Criteria

✅ ProgressCardManager.ts reduced from 1,767 → ~300 lines
✅ All 25 progress cards work identically to before
✅ Simple cards defined in <10 lines of config
✅ Complex cards isolated in separate command files
✅ Shared utilities reduce code duplication
✅ All existing tests pass
✅ New cards can be added in <20 lines (simple) or <100 lines (complex)
✅ Code is more maintainable and testable
