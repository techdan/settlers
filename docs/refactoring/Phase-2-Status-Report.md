# Phase 2 Refactoring Status Report
## GameController.tsx Decomposition

**Date:** 2025-12-08
**Phase:** 2 - Component Decomposition
**Task:** GameController.tsx Refactoring

---

## Executive Summary

We have successfully begun the GameController refactoring, reducing the file from **2,181 lines to 1,330 lines** (39% reduction, 851 lines removed). The core infrastructure is in place with 3 specialized controllers and a consolidated selection manager. However, significant work remains to update ~500+ variable references throughout the JSX and complete the refactoring.

**Target:** 400-500 lines (further 63-66% reduction needed)

---

## ✅ Completed Work

### 1. Controller Infrastructure Created

**Files Created:**
- `lib/hooks/useSelectionManager.ts` (391 lines)
  - Consolidates ~40 selection-related useState calls
  - Provides clean interface with 100+ state properties and setters
  - Includes `clearAllSelections()` utility

- `lib/controllers/knight-controller.ts` (177 lines)
  - 8 knight handlers: activate, move, upgrade, smith card, displacement
  - Clean separation of knight business logic

- `lib/controllers/improvement-controller.ts` (215 lines)
  - 11 improvement handlers: city walls, metropolis, settlements→cities, crane card
  - Handles all city improvement flows

- `lib/controllers/progress-card-controller.ts` (683 lines)
  - **26+ progress card handlers** (merchant, inventor, taxation, intrigue, diplomat, treason, engineer, medicine, smith, crane, road building, etc.)
  - Handles hex/vertex/edge selection flows
  - Card-specific confirmation and cancellation logic
  - **⚠️ ARCHITECTURAL CONCERN:** This controller is large and handles many disparate card types

### 2. GameController Refactoring Progress

**Changes Made:**
- ✅ Added controller/hook imports (lines 57-61)
- ✅ Replaced ~57 useState calls with single `useSelectionManager()` hook
- ✅ Updated progress prompt dependencies to use selectionManager
- ✅ Added derived state computation (gameState, currentPlayer, isActiveTurn, treasonEffect, etc.)
- ✅ Created controller instances with proper dependency injection
- ✅ Removed ~850 lines of duplicate/corrupt handler implementations
- ✅ Refactored `handleCancelSelection` to use `selectionManager.clearAllSelections()`
- ✅ Fixed initial TypeScript errors

**Reduction So Far:**
- 2,181 lines → 1,330 lines (851 lines removed, 39% reduction)

---

## ⚠️ Remaining Work

### 1. Build Error Fixes (In Progress)

**Current Status:** ~5-10 type errors remaining
- Variable reference errors (old state variables used instead of selectionManager.*)
- Type annotation errors
- Handler reference errors

**Estimated Effort:** 2-3 hours

### 2. State Variable Reference Updates (Major Task)

**Scope:** Update ~500+ references throughout JSX and handler code

**Examples of needed changes:**
```typescript
// Old (broken):
{buildMode === 'knight' && ...}
{selectingKnightsForSmith && ...}
{selectedSmithKnightIds.map(...)}

// New (correct):
{selectionManager.buildMode === 'knight' && ...}
{selectionManager.selectingKnightsForSmith && ...}
{selectionManager.selectedSmithKnightIds.map(...)}
```

**Variables to update (40+):**
- `buildMode` → `selectionManager.buildMode`
- `movingKnightId` → `selectionManager.movingKnightId`
- `selectedKnightId` → `selectionManager.selectedKnightId`
- `selectedCityId` → `selectionManager.selectedCityId`
- `selectingHexForCard` → `selectionManager.selectingHexForCard`
- `selectingVertexForCard` → `selectionManager.selectingVertexForCard`
- `intrigueTarget` → `selectionManager.intrigueTarget`
- `diplomatStage` → `selectionManager.diplomatStage`
- `treasonMode` → `selectionManager.treasonMode`
- ... (30+ more)

**Estimated Effort:** 4-6 hours (can be partially automated with find-replace)

### 3. Component Prop Updates

**Board Component Callbacks:**
```typescript
// Need to update ~12 callbacks to use controller methods
callbacks={{
    onHexSelected: progressCardController.handleHexSelected,
    onVertexSelectedForCard: progressCardController.handleVertexSelected,
    onKnightClick: knightController.handleKnightClick,
    onCityClick: improvementController.handleCityClick,
    // ... etc
}}
```

**Modal/Dialog Props:**
- Update ~15 modals/dialogs to use controller methods
- CityManagementDialog, KnightManagementDialog, ProgressCardHand, etc.

**Estimated Effort:** 2-3 hours

### 4. useEffect Dependency Updates

**Issue:** Many useEffect hooks reference old state variables
**Action:** Update dependency arrays to use selectionManager properties

**Estimated Effort:** 1-2 hours

### 5. Derived State Updates

**Current:** Lines 447-600+ contain derived state calculations using old variable names
**Action:** Update to use selectionManager properties

Examples:
```typescript
// Current (broken):
const smithEligibleKnights = selectingKnightsForSmith && gameState
    ? getPromotableKnights(gameState, playerId) : [];

// Fixed:
const smithEligibleKnights = selectionManager.selectingKnightsForSmith && gameState
    ? getPromotableKnights(gameState, playerId) : [];
```

**Estimated Effort:** 2-3 hours

---

## 🔥 Architectural Concern: Progress Card System

### Current State: Monolithic Progress Card Controller

**File:** `lib/controllers/progress-card-controller.ts` (683 lines)

**Handles 25+ Different Card Types:**

**Hex Selection Cards:**
- Merchant (resource hex selection)
- Inventor (number token swap)
- Taxation (robber placement)

**Vertex Selection Cards:**
- Intrigue (knight displacement)
- Treason (3-stage: opponent selection → knight removal → knight placement)
- Medicine (settlement → city upgrade)

**Edge Selection Cards:**
- Diplomat (2-stage: road removal → road rebuild)

**City Selection Cards:**
- Engineer (free city wall)

**Knight Selection Cards:**
- Smith (promote up to 2 knights) - **Currently in knight-controller, but really a progress card**

**Special Flow Cards:**
- Road Building (2 free roads with custom UI)
- Crane (free improvement upgrade)
- Aqueduct, Commercial Harbor, Wedding, Constitution, Printer (not yet in controller)

### Problem: Lack of Card Abstraction

**Issues:**
1. **Massive switch statements:** `handleHexSelected` has different logic for merchant vs. inventor vs. taxation
2. **Card-specific state scattered:** Each card type has its own state variables (merchantError, inventorSelection, diplomatStage, etc.)
3. **No reusability:** Similar patterns (select → confirm → execute) duplicated across cards
4. **Hard to extend:** Adding a new progress card requires modifying the monolithic controller
5. **Testing difficulty:** Can't test individual card flows in isolation

---

## 📋 Proposed Solutions: Progress Card Architecture

### Option A: Complete Now (Part of Current Refactor)

**Approach:** Create a card abstraction system before finishing GameController refactoring

**Pros:**
- GameController becomes truly clean (no card-specific logic leaking through)
- Easier to complete the refactoring with a clear abstraction
- Avoid rework later

**Cons:**
- Delays completion of Phase 2
- Adds ~1-2 weeks to timeline
- More complex to design and implement

**Estimated Additional Effort:** 20-30 hours

---

### Option B: Defer Until Phase 3+

**Approach:** Complete GameController refactoring with current monolithic controller, refactor cards later

**Pros:**
- Faster completion of Phase 2
- Can see the full picture before designing abstraction
- Incremental improvement

**Cons:**
- GameController still has card-specific knowledge (via progressCardController dependencies)
- Will need to refactor again later
- Harder to extend progress cards in the meantime

**Estimated Effort Now:** 8-12 hours to finish GameController
**Estimated Future Effort:** 25-35 hours to refactor card system

---

## 🏗️ Proposed Implementation: Card Abstraction Architecture

### Implementation 1: Base Card Class with Derived Cards

**Structure:**
```
lib/
  ├── cards/
  │   ├── base/
  │   │   ├── ProgressCard.ts               (Abstract base class)
  │   │   ├── SelectionCard.ts              (Base for selection-based cards)
  │   │   ├── HexSelectionCard.ts           (Base for hex selection)
  │   │   ├── VertexSelectionCard.ts        (Base for vertex selection)
  │   │   └── EdgeSelectionCard.ts          (Base for edge selection)
  │   │
  │   ├── implementations/
  │   │   ├── MerchantCard.ts               (extends HexSelectionCard)
  │   │   ├── InventorCard.ts               (extends HexSelectionCard)
  │   │   ├── TaxationCard.ts               (extends HexSelectionCard)
  │   │   ├── IntrigueCard.ts               (extends VertexSelectionCard)
  │   │   ├── DiplomatCard.ts               (extends EdgeSelectionCard, multi-stage)
  │   │   ├── TreasonCard.ts                (extends VertexSelectionCard, multi-stage)
  │   │   ├── EngineerCard.ts               (extends VertexSelectionCard)
  │   │   ├── SmithCard.ts                  (extends SelectionCard)
  │   │   └── ... (20+ more cards)
  │   │
  │   └── CardRegistry.ts                   (Factory for card instances)
```

**Base Card Interface:**
```typescript
abstract class ProgressCard {
    abstract readonly cardType: ProgressCardType;
    abstract readonly selectionType: 'hex' | 'vertex' | 'edge' | 'none';

    // Lifecycle hooks
    abstract onPlay(options?: any): Promise<void>;
    abstract onCancel(): void;
    abstract canPlay(gameState: GameState, playerId: string): boolean;

    // UI state
    abstract getPromptMessage(): string;
    abstract getErrorMessage(): string | null;

    // Selection handling (if applicable)
    onSelectionMade?(selection: string): void;
    onConfirm?(): Promise<void>;
}

abstract class SelectionCard extends ProgressCard {
    protected selectionState: SelectionState;

    // Common selection logic
    protected beginSelection(promptMessage: string): void;
    protected clearSelection(): void;
    protected validateSelection(selection: string): boolean;
}

class MerchantCard extends HexSelectionCard {
    readonly cardType = 'merchant';

    onPlay() {
        this.beginSelection('Select a resource hex.');
    }

    onSelectionMade(hexId: string) {
        const hex = this.gameState.board.hexes.find(h => h.id === hexId);
        const resource = this.resourceForTerrain(hex.terrain);
        this.updatePrompt(`Selected ${resource}.`);
    }

    async onConfirm() {
        await this.apiCall('/api/game/.../progress-card', {
            cardType: 'merchant',
            hexId: this.selectionState.selectedHexId
        });
    }
}
```

**Usage in GameController:**
```typescript
const cardRegistry = new CardRegistry(gameState, playerId, selectionManager);

const handlePlayProgressCard = async (cardType: ProgressCardType, options?: any) => {
    const card = cardRegistry.getCard(cardType);
    await card.onPlay(options);
};

const handleHexSelected = async (hexId: string) => {
    const activeCard = cardRegistry.getActiveCard();
    if (activeCard && activeCard.selectionType === 'hex') {
        activeCard.onSelectionMade(hexId);
    }
};
```

**Pros:**
- ✅ Clean OOP design with inheritance
- ✅ Each card is a self-contained module
- ✅ Easy to add new cards (just create a new class)
- ✅ Testable in isolation
- ✅ Reusable selection logic in base classes
- ✅ Type-safe card registry

**Cons:**
- ❌ More files to manage (25+ card classes)
- ❌ Requires understanding of inheritance hierarchy
- ❌ Overkill if cards don't share much logic

**Estimated Effort:** 25-30 hours

---

### Implementation 2: Card Configuration Objects

**Structure:**
```
lib/
  └── cards/
      ├── card-config.ts           (Type definitions)
      ├── card-registry.ts         (Card configurations)
      ├── card-executor.ts         (Generic execution logic)
      └── card-ui-manager.ts       (Generic UI state management)
```

**Card Configuration:**
```typescript
interface CardConfig {
    cardType: ProgressCardType;
    selectionType: 'hex' | 'vertex' | 'edge' | 'none';

    // Validation
    canPlay: (gameState: GameState, playerId: string) => boolean;
    validateSelection?: (selection: string, gameState: GameState) => boolean;

    // Execution
    onPlay: (options: any, context: CardContext) => Promise<void>;

    // UI
    getPrompt: (state: SelectionState) => string;
    getError?: (state: SelectionState) => string | null;
}

const CARD_REGISTRY: Record<ProgressCardType, CardConfig> = {
    merchant: {
        cardType: 'merchant',
        selectionType: 'hex',

        canPlay: (gameState, playerId) => {
            // Validation logic
            return true;
        },

        validateSelection: (hexId, gameState) => {
            const hex = gameState.board.hexes.find(h => h.id === hexId);
            return hex && hex.terrain !== 'desert';
        },

        onPlay: async (options, context) => {
            await context.apiCall('/api/game/.../progress-card', {
                cardType: 'merchant',
                hexId: options.hexId
            });
        },

        getPrompt: (state) => {
            if (state.selectedMerchantHexId) {
                const resource = state.selectedMerchantHex?.terrain;
                return `Selected ${resource}. Click Confirm to place Merchant.`;
            }
            return 'Select a resource hex for the Merchant.';
        }
    },

    inventor: {
        // ... config
    },

    // ... 25+ more card configs
};
```

**Usage:**
```typescript
const cardExecutor = new CardExecutor(gameState, playerId, selectionManager);

const handlePlayProgressCard = async (cardType: ProgressCardType, options?: any) => {
    const config = CARD_REGISTRY[cardType];
    await cardExecutor.execute(config, options);
};
```

**Pros:**
- ✅ All cards in one place (easy to see overview)
- ✅ Less boilerplate than classes
- ✅ Functional programming style
- ✅ Easy to understand data-driven approach

**Cons:**
- ❌ Large configuration object (1000+ lines)
- ❌ Less type-safe than classes
- ❌ Harder to share logic between similar cards
- ❌ Callback hell for complex multi-stage cards

**Estimated Effort:** 20-25 hours

---

### Implementation 3: Hybrid Approach (Recommended)

**Combine the best of both:**

```
lib/
  ├── cards/
  │   ├── base/
  │   │   ├── CardExecutor.ts          (Generic execution engine)
  │   │   ├── SelectionManager.ts      (Generic selection handling)
  │   │   └── CardTypes.ts             (Type definitions)
  │   │
  │   ├── simple/
  │   │   └── card-configs.ts          (Config objects for simple cards)
  │   │
  │   └── complex/
  │       ├── TreasonCard.ts           (Class for multi-stage cards)
  │       ├── DiplomatCard.ts
  │       └── RoadBuildingCard.ts
```

**Use config objects for simple cards:**
```typescript
// Simple cards (merchant, inventor, taxation, engineer, medicine, etc.)
const SIMPLE_CARDS: Record<string, CardConfig> = {
    merchant: { /* config */ },
    inventor: { /* config */ },
    // ... 15+ simple cards
};
```

**Use classes for complex multi-stage cards:**
```typescript
// Complex cards with state machines
class TreasonCard extends MultiStageCard {
    stages = ['select_opponent', 'remove_knight', 'place_knight'];

    async executeStage(stage: string, context: CardContext) {
        switch (stage) {
            case 'select_opponent':
                return this.selectOpponent(context);
            case 'remove_knight':
                return this.removeKnight(context);
            case 'place_knight':
                return this.placeKnight(context);
        }
    }
}
```

**Pros:**
- ✅ Best of both worlds
- ✅ Simple cards stay simple (config)
- ✅ Complex cards get full class power
- ✅ ~60% reduction in code vs. current approach
- ✅ Easier to extend

**Cons:**
- ❌ Two different patterns to learn
- ❌ Need to decide simple vs. complex for each card

**Estimated Effort:** 22-28 hours

---

## 📊 Recommendation Matrix

| Approach | Time to Complete Phase 2 | Future Maintainability | Extensibility | Code Quality |
|----------|--------------------------|------------------------|---------------|--------------|
| **Current (No Card Refactor)** | 8-12 hrs | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Option A: Refactor Now (Impl 1)** | 33-40 hrs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Option A: Refactor Now (Impl 2)** | 28-35 hrs | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Option A: Refactor Now (Impl 3)** | 30-38 hrs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Option B: Defer to Phase 3+** | 8-12 hrs (now)<br>+25-35 hrs (later) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Recommendation

### Short-term (Next 2-3 sessions):
**Complete GameController refactoring with current architecture**
- Finish fixing build errors (2-3 hours)
- Update all variable references (4-6 hours)
- Update component props (2-3 hours)
- Test functionality (2-3 hours)
- **Total: 10-15 hours**

**Rationale:**
- Gets Phase 2 completed and functional
- Provides immediate value (cleaner GameController)
- Allows us to see full picture before committing to card architecture

### Mid-term (Phase 3 or dedicated sprint):
**Implement Hybrid Card System (Implementation 3)**
- Design card abstraction interfaces (3-4 hours)
- Migrate simple cards to configs (10-12 hours)
- Build complex card classes (8-10 hours)
- Update GameController to use card system (4-5 hours)
- Testing and refinement (4-5 hours)
- **Total: 29-36 hours**

**Rationale:**
- Best balance of code quality and implementation time
- Future-proof architecture
- Clear migration path

---

## 📈 Progress Metrics

### Current State
- **Lines of Code:**
  - GameController: 1,330 lines (target: 400-500)
  - Controllers: 1,075 lines total
  - Hooks: 391 lines

- **Handlers Extracted:** ~47 of ~55 handlers
- **State Consolidated:** ~40 useState calls → 1 useSelectionManager call
- **Build Status:** ~5-10 type errors remaining

### Target State (End of Phase 2)
- **GameController:** 400-500 lines (70% reduction from current)
- **All handlers** moved to controllers
- **All state references** updated to use selectionManager
- **Build:** Zero errors, all tests passing
- **Functionality:** No regressions

### Future State (After Card Refactor)
- **GameController:** 300-400 lines (further 20% reduction)
- **Progress Card System:** 25+ cards as modular units
- **Code Quality:** ⭐⭐⭐⭐⭐ maintainability
- **Extensibility:** Add new cards in 1-2 hours instead of 4-6 hours

---

## 🚀 Next Actions

### Immediate (This Session):
1. ✅ Create this status document
2. ⏭️ Discuss architecture options with team/stakeholders
3. ⏭️ Decide: Complete Phase 2 first, or refactor cards now?

### If Decision = Complete Phase 2 First:
1. Fix remaining build errors (2-3 hours)
2. Update variable references with find-replace (4-6 hours)
3. Update component props (2-3 hours)
4. Test and verify (2-3 hours)

### If Decision = Refactor Cards Now:
1. Design card abstraction interfaces (3-4 hours)
2. Create base classes/configs (5-6 hours)
3. Migrate cards incrementally (15-20 hours)
4. Update GameController (3-4 hours)
5. Complete remaining Phase 2 work (5-7 hours)

---

## 📝 Questions for Decision Making

1. **Timeline Priority:** Is faster completion of Phase 2 critical, or can we invest in better architecture now?

2. **Future Card Development:** How many new progress cards do you expect to add? (If many, abstractions are more valuable)

3. **Team Familiarity:** Is the team more comfortable with OOP (classes) or functional (configs) patterns?

4. **Testing Strategy:** Do you want to unit test individual card behaviors, or just integration test the whole flow?

5. **Maintenance Ownership:** Will multiple developers be adding/modifying progress cards, or primarily one person?

---

## Appendix: File Size Analysis

### Current File Sizes
```
components/game/GameController.tsx:     1,330 lines  ⚠️ Still too large
lib/controllers/knight-controller.ts:     177 lines  ✅ Good
lib/controllers/improvement-controller.ts: 215 lines  ✅ Good
lib/controllers/progress-card-controller.ts: 683 lines  ⚠️ Too large, needs refactoring
lib/hooks/useSelectionManager.ts:         391 lines  ✅ Acceptable (mostly simple state)
```

### Target File Sizes (After Full Refactor)
```
components/game/GameController.tsx:        400 lines  ✅ UI orchestrator
lib/controllers/knight-controller.ts:      180 lines  ✅ No change
lib/controllers/improvement-controller.ts: 220 lines  ✅ No change
lib/cards/base/CardExecutor.ts:           150 lines  ✅ Generic execution
lib/cards/simple/card-configs.ts:         400 lines  ✅ 15+ simple cards
lib/cards/complex/TreasonCard.ts:          80 lines  ✅ Per complex card
lib/cards/complex/DiplomatCard.ts:         70 lines  ✅ Per complex card
lib/cards/complex/RoadBuildingCard.ts:     90 lines  ✅ Per complex card
```

**Total Reduction:** ~1,075 lines → ~1,590 lines (but much better organized and maintainable)
