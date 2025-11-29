# Alchemy Progress Card Backend Fix - Handoff

## Context
The Alchemy progress card UI has been fully fixed and is working correctly. However, there are two remaining backend issues in `core/engine/progress/progress-card-manager.ts` that need to be addressed.

## Current State
- ✅ UI shows correct card name "Alchemy" (not "Alchemist")
- ✅ Modal shows "Red Die" and "Yellow Die" dropdowns with values 1-6
- ✅ Modal validates and sends `{ chosenDice1, chosenDice2 }` to backend
- ✅ All errors display inline, no alert popups
- ❌ Game log shows "Alchemist" instead of "Alchemy"
- ❌ Dice roll doesn't use the chosen values - player must still click "Roll Dice" which generates random values

## Issue #1: Wrong Card Name in Log

**File:** `core/engine/progress/progress-card-manager.ts`
**Line:** 292
**Current Code:**
```typescript
gameState.logs.push({
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    message: `${player.name} played Alchemist and chose the dice results`,
    playerId: player.id
});
```

**Required Fix:**
```typescript
gameState.logs.push({
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    message: `${player.name} played ${getCardMetadata('alchemist').name} and chose ${chosenDice1} + ${chosenDice2} = ${chosenDice1 + chosenDice2}`,
    playerId: player.id
});
```

**Why:** The display name for the card is "Alchemy" (from `progress-card-definitions.ts`), not "Alchemist". Using `getCardMetadata()` ensures the log uses the correct display name. Also include the chosen dice values in the message.

---

## Issue #2: Alchemy Doesn't Auto-Roll Dice

**File:** `core/engine/progress/progress-card-manager.ts`
**Function:** `executeAlchemist` (starts at line 262)

**Current Behavior:**
1. Player plays Alchemy card and chooses dice values (e.g., 5 and 6)
2. Card sets an `activeEffect` flag with the chosen values
3. Player must still click "Roll Dice"
4. The "Roll Dice" action ignores the `activeEffect` and generates random values
5. Result: Chosen values are never used

**Expected Behavior:**
1. Player plays Alchemy card and chooses dice values (e.g., 5 and 6)
2. Card **immediately executes the dice roll** with the chosen values
3. Resources/commodities are distributed based on the chosen total
4. Event die is rolled normally
5. Game phase changes to `main_phase` (or appropriate phase based on the roll)
6. "Roll Dice" button changes to "End Turn" button
7. Result: Chosen values are used, no additional roll needed

**Implementation Guidance:**

The `executeAlchemist` function needs to duplicate the dice rolling logic from `lib/services/game-service.ts` `rollDice()` function (lines 186-315), but use the chosen dice values instead of random ones.

**Key Steps:**
1. Set `gameState.diceRoll = { d1: chosenDice1, d2: chosenDice2, total: chosenDice1 + chosenDice2 }`
2. Roll and process event die (if Cities & Knights mode)
3. Handle total === 7 (robber/discarding logic)
4. Handle total !== 7 (distribute resources/commodities, check Aqueduct)
5. Set appropriate game phase (`main_phase`, `discarding`, `robber_placement`, or `aqueduct_selection`)

**Reference Code to Adapt:**
Look at `lib/services/game-service.ts` lines 203-309. The logic should be nearly identical, except:
- Replace `Math.floor(Math.random() * 6) + 1` with `chosenDice1` and `chosenDice2`
- Remove the "waiting_for_roll" phase check (card can be played in that phase)
- Keep all the resource distribution, event die, robber, and Aqueduct logic

**Important Notes:**
- The card can be played in `waiting_for_roll` or `main_phase` (validated in API route)
- Event die should still roll randomly (only production dice are chosen)
- All existing game logic (7 handling, resource distribution, Aqueduct, etc.) must work identically
- Remove the `activeEffects` code - it's not needed if we roll immediately

**Dependencies:**
You'll need to import/require these functions within `executeAlchemist`:
```typescript
const { rollEventDie, processEventDieRoll } = require('@/core/engine/dice/event-die-manager');
const { distributeResources, getTotalResources } = require('@/core/engine/resources/resource-manager');
const { distributeCommodities, getTotalCommodities } = require('@/core/engine/resources/commodity-manager');
const { getRobberDiscardThreshold } = require('@/core/utils/city-wall-utils');
```

---

## Testing Checklist

After making these fixes, test the following:

1. **Log Message:**
   - Play Alchemy card
   - Verify log shows "played Alchemy" not "played Alchemist"
   - Verify log shows chosen dice values (e.g., "chose 5 + 6 = 11")

2. **Dice Roll Execution:**
   - Play Alchemy card with specific values (e.g., Red: 5, Yellow: 6)
   - Verify dice display immediately shows 5 + 6 = 11
   - Verify "Roll Dice" button changes to "End Turn"
   - Verify resources/commodities are distributed for total 11
   - Verify event die rolled and processed

3. **Edge Cases:**
   - Test with total = 7 (should trigger robber/discard logic)
   - Test with Aqueduct eligible player (Science level 3, no production)
   - Test in both `waiting_for_roll` and `main_phase`
   - Test event die outcomes (barbarian advance, etc.)

---

## File Locations

- **File to edit:** `core/engine/progress/progress-card-manager.ts`
- **Reference file:** `lib/services/game-service.ts` (rollDice function, lines 186-315)
- **Card definition:** `core/engine/progress/progress-card-definitions.ts` (line 12-18)
- **API validation:** `app/api/game/[roomId]/progress-card/route.ts` (lines 59-78)

---

## Additional Context

The Alchemy card is unique because it's the only progress card that can be played **before** rolling dice. All other progress cards require the dice to have been rolled already (`main_phase`). This is why the API route has special validation for it (lines 62-69).

The card's official description from the rulebook:
> "Play at start of your turn, before rolling. Choose results of the production dice; roll the event die normally."

This means:
- Production dice (red and yellow) = chosen by player
- Event die (special C&K die) = rolled randomly as normal
- Must be played before the normal dice roll
- Replaces the normal dice roll entirely

---

## Why Previous Edits Failed

The `progress-card-manager.ts` file is large (1131 lines) and has many similar function structures. The replacement tool had difficulty matching the exact target content due to:
1. Whitespace inconsistencies
2. Similar code patterns across multiple functions
3. Large replacement chunks spanning many lines

**Recommendation:** Make small, targeted edits:
1. Fix the log message first (single line change)
2. Then add the dice rolling logic to `executeAlchemist` incrementally
3. Test after each change

Good luck!
