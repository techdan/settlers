# Cities & Knights - Intrigue Card Fix

**Date**: 2025-11-27  
**Status**: ✅ COMPLETED

---

## Summary

Fixed the Intrigue progress card implementation to properly use the knight displacement system. The card can now displace ANY knight type (basic, strong, or mighty) adjacent to the player's roads, triggering the proper displacement/relocation flow.

---

## Changes Made

### 1. **Exported `displaceKnight` Function**
**File**: `core/engine/knights/knight-manager.ts`

- Made the `displaceKnight` function public by adding the `export` keyword
- This allows the Intrigue card to use the proper displacement logic

### 2. **Fixed `executeIntrigue` Function**
**File**: `core/engine/progress/progress-card-manager.ts`

**Added imports**:
```typescript
import { displaceKnight } from '@/core/engine/knights/knight-manager';
import { getAdjacentEdgesForVertex, getEdgeEndpoints } from '@/lib/hex';
```

**Key fixes**:
- ✅ Removed `targetVertexId` parameter (displacement handles relocation separately)
- ✅ Improved road adjacency validation using proper hex geometry functions
- ✅ Now calls `displaceKnight()` instead of directly moving the knight
- ✅ Triggers `knight_displacement` phase where the displaced knight owner must relocate
- ✅ Added comment clarifying Intrigue can displace ANY knight type (no strength restriction)

**Before** (incorrect):
```typescript
// Directly moved the knight to targetVertexId
knight.vertexId = targetVertexId;
```

**After** (correct):
```typescript
// Use the proper displacement logic
// This will set the game into 'knight_displacement' phase
// The displaced knight owner must relocate it via their road network
displaceKnight(gameState, knight, 'main_phase');
```

---

## How It Works Now

1. **Player plays Intrigue card** and selects an opponent's knight adjacent to their road
2. **Validation**: Checks that the knight is on a vertex connected to one of the player's roads
3. **Displacement**: Calls `displaceKnight()` which:
   - Marks the knight as displaced (sets `vertexId` to `'displaced'`)
   - Sets game phase to `'knight_displacement'`
   - Creates `pendingDisplacement` state
4. **Relocation**: The displaced knight owner must:
   - Choose an adjacent empty vertex connected by their own road
   - OR remove the knight if no valid destination exists
5. **Game continues**: Phase returns to `'main_phase'` after relocation

---

## Key Clarifications

### Intrigue vs Normal Knight Displacement

**Normal Knight Displacement** (when moving a knight):
- ✅ Requires your own knight to be STRONGER than the opponent's knight
- ❌ Cannot displace knights of equal or greater strength
- ❌ A mighty knight (strength 3) cannot be displaced by any knight

**Intrigue Card**:
- ✅ Can displace ANY knight (basic, strong, OR mighty)
- ✅ No strength validation required
- ✅ Only requires the target knight to be adjacent to one of your roads
- ✅ Uses the same displacement/relocation flow as normal displacement

---

## Testing Checklist

- [ ] Play Intrigue card and select a basic knight adjacent to your road
- [ ] Verify knight enters displacement phase
- [ ] Verify displaced knight owner can relocate via their road network
- [ ] Play Intrigue card and select a mighty knight adjacent to your road
- [ ] Verify mighty knight can be displaced (unlike normal knight movement)
- [ ] Verify displaced knight is removed if no valid relocation exists
- [ ] Verify game log shows correct message with knight level

---

## Related Files

- `core/engine/knights/knight-manager.ts` - Knight displacement logic
- `core/engine/progress/progress-card-manager.ts` - Progress card effects
- `lib/hex.ts` - Hex geometry helper functions

---

## Build Status

✅ **Build successful** - No TypeScript errors

---

## Next Steps

Continue with remaining Cities & Knights verification tasks:
1. ✅ **Intrigue Card** - COMPLETED
2. ⏭️ Verify knight displacement strength validation (normal movement)
3. ⏭️ Verify Level 3 abilities (Trading House, Fortress)
4. ⏭️ Verify barbarian attack knight deactivation
5. ⏭️ Integration testing
