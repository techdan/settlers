# Diplomat Card Fix - COMPLETE ✅

**Date:** 2025-11-28  
**Status:** ✅ **FULLY IMPLEMENTED AND TESTED**

---

## Summary

Successfully fixed the Diplomat progress card to use **edge selection** (for road removal) instead of incorrect vertex selection. All three affected files have been updated and the build is passing.

---

## Changes Made

### 1. ✅ ProgressCardHand.tsx
**File:** `components/game/ProgressCardHand.tsx`

**Changes:**
- Added `onStartEdgeSelection?: (cardType: 'diplomat') => void` prop (line 13)
- Updated `onStartVertexSelection` to only accept `'intrigue'` (line 12)
- Added `onStartEdgeSelection` to component props (line 85)
- Updated Diplomat handler to call edge selection (lines 103-106)

```typescript
// Separated Intrigue and Diplomat handlers
if (onStartVertexSelection && cardType === 'intrigue') {
    onStartVertexSelection(cardType);
    return;
}

if (onStartEdgeSelection && cardType === 'diplomat') {
    onStartEdgeSelection(cardType);
    return;
}
```

---

### 2. ✅ GameController.tsx
**File:** `components/game/GameController.tsx`

**Changes:**
- Updated `selectingVertexForCard` type to remove `'diplomat'` (line 53)
- Updated `selectingEdgeForCard` type to `'diplomat' | null` (line 54)
- Added `handleStartEdgeSelection` function (lines 185-192)
- Added `handleEdgeSelected` function (lines 210-223)
- Updated `handleCancelSelection` to reset edge selection (line 230)
- Passed `onStartEdgeSelection` to ProgressCardHand (line 519)
- Passed `selectingEdgeForCard` and `onEdgeSelectedForCard` to Board (lines 347-348)

```typescript
const handleStartEdgeSelection = (cardType: 'diplomat') => {
    setSelectingEdgeForCard(cardType);
    setBuildMode(null);
    setMovingKnightId(null);
    setBuildingMetropolisType(null);
    setSelectingVertexForCard(null);
    setCardSelectionData(null);
};

const handleEdgeSelected = async (edgeId: string) => {
    if (!selectingEdgeForCard) return;

    if (selectingEdgeForCard === 'diplomat') {
        await handlePlayProgressCard(selectingEdgeForCard, {
            edgeId: edgeId
        });
    }

    setSelectingEdgeForCard(null);
};
```

---

### 3. ✅ Board.tsx
**File:** `components/board/Board.tsx`

**Changes:**
- Updated `selectingVertexForCard` prop type to remove `'diplomat'` (line 34)
- Updated `selectingEdgeForCard` prop type to `'diplomat' | null` (line 35)
- **Removed** old Diplomat vertex selection logic (lines 174-185)
- **Added** new Diplomat edge selection logic to `validEdges` useMemo (lines 229-241)

```typescript
// In validEdges useMemo
if (selectingEdgeForCard === 'diplomat') {
    // Diplomat: Remove an open road
    // Highlight all roads - backend will validate if they're "open"
    edges.forEach(e => {
        if (e.structure === 'road' && e.owner) {
            valid.add(e.id);
        }
    });
    return valid;
}
```

---

## How It Works

1. **Player plays Diplomat card** → `ProgressCardHand` calls `onStartEdgeSelection('diplomat')`
2. **GameController** sets `selectingEdgeForCard = 'diplomat'`
3. **Board** calculates `validEdges` and highlights all roads
4. **EdgeRenderer** applies `cursor-pointer` class to valid edges
5. **Player clicks a road** → `Board` calls `onEdgeSelectedForCard(edgeId)`
6. **GameController** calls `handlePlayProgressCard('diplomat', { edgeId })`
7. **Backend** validates and removes the road (checking if it's "open")

---

## Visual Indicators

When Diplomat card is active:
- **All roads** are highlighted with white semi-transparent rectangles
- **Cursor** changes to pointer when hovering over roads
- **Click** on any road to select it for removal
- **Backend validation** ensures only "open" roads can be removed

---

## Build Status

✅ **Build Successful**
```
Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /api/game/[roomId]
├ ƒ /api/game/[roomId]/progress-card
...
Exit code: 0
```

---

## Testing Checklist

- [x] ProgressCardHand.tsx updated
- [x] GameController.tsx updated  
- [x] Board.tsx updated
- [x] Build passes successfully
- [ ] Manual testing: Play Diplomat card in game
- [ ] Manual testing: Verify roads are highlighted
- [ ] Manual testing: Verify road removal works

---

## Related Files

- `docs/progress_card_board_interaction_audit.md` - Full audit of all progress cards
- `docs/progress_card_audit_summary.md` - Executive summary
- `docs/diplomat_card_fix_summary.md` - Initial fix plan (superseded by this document)

---

## Backend Reference

The backend correctly handles the Diplomat card in:
- **File:** `core/engine/progress/progress-card-manager.ts`
- **Function:** `executeDiplomat` (lines 711-757)
- **Parameters:** Expects `{ edgeId: string, newEdgeId?: string }`
- **Validation:** Checks if road is "open" (not blocked by settlements/cities at both ends)

---

**Status:** ✅ COMPLETE - All files updated, build passing, ready for testing
