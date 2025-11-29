# Diplomat Card Fix - Implementation Summary

**Date:** 2025-11-28  
**Status:** ✅ PARTIALLY COMPLETE - Needs manual Board.tsx fix

---

## Issue Identified

The **Diplomat** progress card was incorrectly using vertex selection when it should use edge selection for road removal.

- **Backend:** Correctly expects `edgeId` parameter (verified in `progress-card-manager.ts` line 711-757)
- **Frontend:** Was calling `onStartVertexSelection('diplomat')` instead of `onStartEdgeSelection('diplomat')`

---

## Fixes Applied

### ✅ 1. ProgressCardHand.tsx - COMPLETE
**File:** `components/game/ProgressCardHand.tsx`

**Changes Made:**
- Added `onStartEdgeSelection` prop to interface (line 13)
- Updated component to accept `onStartEdgeSelection` callback (line 85)
- Changed Diplomat card handler from vertex to edge selection (lines 103-106)

```typescript
// OLD (INCORRECT)
if (onStartVertexSelection && (cardType === 'intrigue' || cardType === 'diplomat')) {
    onStartVertexSelection(cardType);
    return;
}

// NEW (CORRECT)
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

### ✅ 2. GameController.tsx - COMPLETE  
**File:** `components/game/GameController.tsx`

**Changes Made:**
- Updated `selectingEdgeForCard` state type from `null` to `'diplomat' | null` (line 54)
- Updated `selectingVertexForCard` type to remove `'diplomat'` (line 53)
- Added `handleStartEdgeSelection` function (lines 185-192)
- Added `handleEdgeSelected` function (lines 210-223)
- Updated `handleCancelSelection` to include edge selection (line 230)
- Passed `onStartEdgeSelection` to ProgressCardHand (line 519)
- Passed `selectingEdgeForCard` and `onEdgeSelectedForCard` to Board (lines 347-348)

```typescript
// New handler for edge selection
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
        // Diplomat: Select an open road to remove
        await handlePlayProgressCard(selectingEdgeForCard, {
            edgeId: edgeId
        });
    }

    setSelectingEdgeForCard(null);
};
```

---

### ⚠️ 3. Board.tsx - NEEDS MANUAL FIX
**File:** `components/board/Board.tsx`

**Required Changes:**
1. Update `BoardProps` interface (line 34):
   ```typescript
   selectingEdgeForCard?: 'diplomat' | null;  // Change from: null
   ```

2. Add Diplomat edge selection logic to `validEdges` useMemo (after line 228):
   ```typescript
   const validEdges = useMemo(() => {
       const valid = new Set<string>();
       if (gameState.currentTurn !== playerId) return valid;

       // Progress Card Edge Selection (Diplomat)
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

       // ... rest of existing logic
   ```

**Why Manual Fix Needed:**
Automated edits to Board.tsx kept corrupting the file structure. The file needs to be manually edited to add the Diplomat edge selection logic at the beginning of the `validEdges` useMemo hook.

---

## Testing Checklist

Once Board.tsx is fixed:

- [ ] Play a Diplomat card
- [ ] Verify all roads on the board are highlighted with white semi-transparent rectangles
- [ ] Verify cursor changes to pointer when hovering over roads
- [ ] Click on a road to select it
- [ ] Verify the road is removed (backend validation will check if it's "open")
- [ ] Verify the card is consumed from hand

---

## Visual Indicators

When Diplomat card is played and edge selection is active:
- **Highlight:** White semi-transparent rectangle (`rgba(255, 255, 255, 0.6)`)
- **Hover Effect:** `hover:fill-white transition-colors`
- **Cursor:** `cursor-pointer` class (already implemented in EdgeRenderer.tsx line 24)

---

## Summary

**Completed:**
- ✅ ProgressCardHand.tsx - Routes Diplomat to edge selection
- ✅ GameController.tsx - Handles edge selection state and callbacks

**Remaining:**
- ⚠️ Board.tsx - Manually add Diplomat edge validation logic to `validEdges` useMemo

**Estimated Time:** 5 minutes to manually edit Board.tsx
