# Progress Card Architecture - Comprehensive Review

## Executive Summary

After deep analysis of the current implementation, I've identified **3 critical issues** and **8 enhancement opportunities**. The foundation is solid, but addressing these issues now will prevent technical debt and ensure scalability to 25 cards.

---

## Critical Issues (Must Fix)

### 1. ❌ **Inconsistent Return Types**

**Problem**: Effects and commands return `GameState` directly, but we defined `CardExecutionResult` that includes success/error/interaction states. This creates a mismatch.

**Current**:
```typescript
export function executeAddResourcePerHex(
  state: GameState,
  playerId: string,
  effect: AddResourcePerHexEffect
): GameState {
  // ... mutation happens ...
  return state;
}
```

**Issue**:
- Can't differentiate success vs requires-interaction vs error
- Forces error-throwing for control flow
- Frontend can't know if interaction is needed without trying to execute

**Solution**: Return `CardExecutionResult` uniformly
```typescript
export function executeAddResourcePerHex(
  state: GameState,
  playerId: string,
  effect: AddResourcePerHexEffect
): CardExecutionResult {
  const hexes = getHexesWithAdjacentBuildings(state, playerId, effect.hexTerrain);
  const totalAdded = hexes.length * effect.amountPerHex;

  if (totalAdded > 0) {
    addResource(state, playerId, effect.resource, totalAdded);
  }

  return {
    success: true,
    newState: state,
    notification: {
      title: 'Irrigation',
      message: `Received ${totalAdded} grain from Irrigation`,
      type: 'success'
    }
  };
}
```

**Impact**: BREAKING - All effects and commands need updating
**Priority**: HIGH - Do this before adding more cards

---

### 2. ❌ **No Interaction Declaration in Card Config**

**Problem**: Cards that need interaction don't declare what they need upfront. Frontend has to attempt execution, catch error, then show modal.

**Current Flow**:
1. User clicks "Play Card"
2. POST to backend
3. Backend tries to execute
4. Throws error: "Resource Monopoly requires resource selection"
5. Frontend catches, shows modal
6. User selects, submits again

**Better Flow**:
1. User clicks "Play Card"
2. Frontend checks card config
3. If `requiresInteraction`, show modal immediately
4. User selects
5. POST to backend with selections
6. Backend executes

**Current Config**:
```typescript
{
  type: 'resource_monopoly',
  requiresInteraction: true,  // Boolean flag only
  effects: [...]
}
```

**Better Config**:
```typescript
{
  type: 'resource_monopoly',
  requiresInteraction: true,
  interaction: {  // ✅ Explicit interaction definition
    type: 'select_resource',
    prompt: 'Choose a resource to steal from all opponents',
    minSelections: 1,
    maxSelections: 1,
    buildOptions: (state: GameState, playerId: string) => [
      { id: 'wood', label: 'Wood', icon: '🪵' },
      { id: 'brick', label: 'Brick', icon: '🧱' },
      { id: 'sheep', label: 'Sheep', icon: '🐑' },
      { id: 'wheat', label: 'Wheat', icon: '🌾' },
      { id: 'ore', label: 'Ore', icon: '⛰️' }
    ]
  },
  effects: [...]
}
```

**Benefits**:
- Single source of truth
- No wasted backend calls
- Better UX (immediate modal)
- Declarative, testable

**Impact**: MEDIUM - Requires card config changes
**Priority**: HIGH - Improves UX significantly

---

### 3. ❌ **Validation Logic Scattered**

**Problem**: Validation is split between modal wrapper, selector components, and backend.

**Current**:
- Modal: Checks min/max selections
- Selector: Enforces max via disabled state
- Backend: Throws errors for invalid options

**Issues**:
- Duplication
- Inconsistent error messages
- Hard to test

**Solution**: Centralize in one validation utility
```typescript
// core/engine/progress/utilities/InteractionValidator.ts
export function validateInteraction(
  interaction: CardInteraction,
  response: CardInteractionResponse
): ValidationResult {
  const errors: string[] = [];

  // Check selection count
  if (response.selections.length < (interaction.minSelections || 0)) {
    errors.push(`Select at least ${interaction.minSelections} option(s)`);
  }

  if (response.selections.length > (interaction.maxSelections || Infinity)) {
    errors.push(`Select at most ${interaction.maxSelections} option(s)`);
  }

  // Check selections are valid options
  const validIds = new Set(interaction.options?.map(o => o.id) || []);
  for (const id of response.selections) {
    if (!validIds.has(id)) {
      errors.push(`Invalid selection: ${id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Impact**: LOW - Refactor only
**Priority**: MEDIUM - Improves maintainability

---

## Enhancement Opportunities

### 4. 🔧 **Add Loading States**

**Current**: Submit button has no loading state
**Better**: Show spinner/disable while executing
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

<button disabled={!canSubmit() || isSubmitting}>
  {isSubmitting ? 'Executing...' : getActionLabel()}
</button>
```

### 5. 🔧 **Standardize Selector Props**

**Current**: Each selector has slightly different prop patterns
**Better**: Define base interface
```typescript
interface BaseSelectorProps {
  selections: string[];
  onSelectionsChange: (selections: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
  disabled?: boolean;
}

interface ResourceSelectorProps extends BaseSelectorProps {
  options: InteractionOption[];
}
```

### 6. 🔧 **Add Preview/Stats Display**

**Current**: Old modal shows stats (e.g., "You'll receive 6 wheat"), new modal doesn't
**Better**: Add preview section to modal
```tsx
<div className="p-4 bg-slate-700/50 rounded">
  <div className="text-sm text-slate-300">Preview:</div>
  <div className="text-lg text-emerald-300 font-semibold">
    +6 wheat from 3 adjacent fields
  </div>
</div>
```

### 7. 🔧 **Modal Sizing by Interaction Type**

**Current**: Fixed `max-w-md`
**Better**: Dynamic sizing
```tsx
const getModalWidth = () => {
  switch (interaction.type) {
    case 'select_knights': return 'max-w-2xl'; // Needs more space
    case 'select_cards': return 'max-w-3xl';  // Shows cards
    default: return 'max-w-md';
  }
};
```

### 8. 🔧 **Keyboard Shortcuts**

**Current**: Mouse-only
**Better**:
- Enter to submit
- Escape to cancel
- Arrow keys to navigate options

### 9. 🔧 **Success Notifications**

**Current**: No feedback after execution
**Better**: Toast notification
```typescript
{
  success: true,
  newState: state,
  notification: {
    title: 'Resource Monopoly',
    message: 'Stole 5 wood from opponents',
    type: 'success',
    duration: 3000
  }
}
```

### 10. 🔧 **Extract Utility Functions**

**Current**: `getKnightLevelDisplay` and `canPromote` are inline in KnightSelector
**Better**: Move to `core/utils/knight-utils.ts` for reuse

### 11. 🔧 **ARIA Labels and Focus Management**

**Current**: Basic accessibility
**Better**:
- Focus first option on modal open
- ARIA labels on all interactive elements
- Screen reader announcements

---

## Architecture Patterns: What's Working Well ✅

### 1. ✅ **Hybrid Command + Config Approach**
- Simple cards use declarative configs
- Complex cards use command pattern
- **Keep this** - It's the right balance

### 2. ✅ **Separate Utility Modules**
- ResourceTransfer, BoardScanning, StateManagement
- Promotes reuse
- **Keep this** - Well-organized

### 3. ✅ **Type Safety**
- Full TypeScript with strict types
- CardEffect, CardConfig, CardInteraction all well-typed
- **Keep this** - Prevents bugs

### 4. ✅ **Component Modularity**
- Small, focused selector components
- Each selector 50-120 lines
- **Keep this** - Easy to test and maintain

### 5. ✅ **Effect Composition**
- Cards can have multiple effects
- Effects are pure functions
- **Keep this** - Declarative and composable

---

## Recommended Implementation Order

### Phase A: Critical Fixes (Before adding more cards)
1. **Update return types** - All effects/commands return CardExecutionResult
2. **Add interaction definitions** - Update card configs with explicit interaction requirements
3. **Centralize validation** - Create InteractionValidator utility

### Phase B: Enhancement (Parallel with card implementation)
4. Add loading states to modal
5. Standardize selector props with base interface
6. Add preview/stats display
7. Implement dynamic modal sizing

### Phase C: Polish (After most cards implemented)
8. Add keyboard shortcuts
9. Add success notifications
10. Extract utility functions
11. Enhance accessibility

---

## Impact Analysis

### If we fix Critical Issues (1-3):
- ✅ Cleaner code (no error-throwing for control flow)
- ✅ Better UX (no wasted backend calls)
- ✅ Single source of truth for interactions
- ✅ Easier testing
- ✅ Easier to add new cards

### Cost:
- ~4-6 hours refactoring
- Breaking changes to existing cards
- But we only have 10 cards, so impact is minimal

### If we DON'T fix these issues:
- ❌ Every new card perpetuates bad patterns
- ❌ Technical debt grows with each card
- ❌ Harder to refactor later (25 cards vs 10 cards)
- ❌ Inconsistent behavior across cards

---

## Recommendation

**Fix Critical Issues 1-3 NOW before implementing more cards.**

The foundation is 80% solid. These three fixes will make it 95% solid and save significant time as we scale to 25 cards.

The enhancements (4-11) can be added incrementally without breaking changes.

---

## Code Examples: Before & After

### Before (Current):
```typescript
// Effect returns GameState directly
export function executeStealFromOpponents(state, playerId, effect, options): GameState {
  if (!options?.resource) {
    throw new Error('Resource Monopoly requires resource selection'); // ❌ Error for control flow
  }
  // ... execute ...
  return state;
}

// Config has no interaction definition
{
  type: 'resource_monopoly',
  requiresInteraction: true,  // ❌ Just a boolean
  effects: [...]
}
```

### After (Proposed):
```typescript
// Effect returns CardExecutionResult
export function executeStealFromOpponents(state, playerId, effect, options): CardExecutionResult {
  // If no options, indicate interaction needed
  if (!options?.resource && effect.requiresSelection) {
    return {
      success: false,
      requiresInteraction: {
        type: 'select_resource',
        cardName: 'Resource Monopoly',
        prompt: 'Choose a resource to steal',
        options: buildResourceOptions(state),
        minSelections: 1,
        maxSelections: 1
      }
    };
  }

  // Execute
  // ... steal resources ...

  return {
    success: true,
    newState: state,
    notification: {
      title: 'Resource Monopoly',
      message: `Stole ${totalStolen} ${resource} from opponents`,
      type: 'success'
    }
  };
}

// Config explicitly defines interaction
{
  type: 'resource_monopoly',
  requiresInteraction: true,
  interaction: {
    type: 'select_resource',
    prompt: 'Choose a resource to steal from all opponents',
    minSelections: 1,
    maxSelections: 1,
    buildOptions: (state, playerId) => buildResourceOptions(state)
  },
  effects: [...]
}
```

---

## Conclusion

The architecture is fundamentally sound. The hybrid command+config approach, modular utilities, and TypeScript typing are all excellent choices.

The three critical issues are fixable patterns that, if addressed now, will make the next 15 cards much smoother to implement.

**Verdict**: Fix issues 1-3, then proceed with confidence.
