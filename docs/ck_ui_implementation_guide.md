# Cities & Knights - Outstanding UI Implementation Guide

## Overview

This guide provides step-by-step instructions to complete the three outstanding C&K UI tasks:
1. **Knight Movement Target Selection**
2. **Progress Card Parameter Selection** (deferred for now)
3. **Metropolis Building City Selection**

## Status

✅ **COMPLETED**:
- Metropolis API route created (`app/api/game/[roomId]/metropolis/route.ts`)
- CityImprovements component updated with "Build Metropolis" button
- Board.tsx updated with knight movement and metropolis building logic

⚠️ **NEEDS MANUAL COMPLETION**:
- GameController.tsx - Add state and handlers (see instructions below)

---

## Task 1: GameController.tsx Updates

### Step 1: Add State Variables

In `components/game/GameController.tsx`, add these two state variables after line 39:

```typescript
const [movingKnightId, setMovingKnightId] = useState<string | null>(null);
const [buildingMetropolisType, setBuildingMetropolisType] = useState<'science' | 'trade' | 'politics' | null>(null);
```

### Step 2: Update handleMoveKnight

Replace the `handleMoveKnight` function (around line 80-87) with:

```typescript
const handleMoveKnight = async (knightId: string) => {
    // Enter knight movement mode - player will click target vertex
    setMovingKnightId(knightId);
    setBuildMode(null); // Clear any other build mode
};
```

### Step 3: Add handleBuildMetropolis

Add this new handler after `handleUpgradeKnight` (around line 100):

```typescript
const handleBuildMetropolis = (metropolisType: 'science' | 'trade' | 'politics') => {
    // Enter metropolis building mode - player will click a city vertex
    setBuildingMetropolisType(metropolisType);
    setBuildMode(null); // Clear any other build mode
    setMovingKnightId(null); // Clear knight movement mode
};
```

### Step 4: Update Board Component Props

Find the `<Board` component (around line 158-163) and update it to:

```typescript
<Board
    gameState={gameState}
    playerId={playerId}
    buildMode={buildMode}
    onCancelBuild={() => {
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
    }}
    movingKnightId={movingKnightId}
    buildingMetropolisType={buildingMetropolisType}
/>
```

### Step 5: Update CityImprovements Component Props

Find the `<CityImprovements` component (around line 196-200) and update it to:

```typescript
<CityImprovements
    player={currentPlayer}
    roomId={roomId}
    gameState={gameState}
    onUpgrade={handleUpgradeImprovement}
    onBuildMetropolis={handleBuildMetropolis}
/>
```

---

## How It Works

### Knight Movement Flow:
1. Player clicks "Move" button on a knight in KnightControls
2. `handleMoveKnight(knightId)` is called, setting `movingKnightId` state
3. Board component highlights valid target vertices (adjacent vertices connected by player's roads)
4. Player clicks a highlighted vertex
5. Board's `handleVertexClick` sends API request to `/api/game/[roomId]/knight` with action='move'
6. Knight is moved, `movingKnightId` is cleared

### Metropolis Building Flow:
1. Player reaches improvement level 4+
2. "Build Metropolis" button appears in CityImprovements
3. Player clicks button, `handleBuildMetropolis(type)` is called
4. Board highlights all player's cities (not settlements, not already metropolises)
5. Player clicks a highlighted city
6. Board's `handleVertexClick` sends API request to `/api/game/[roomId]/metropolis`
7. City is upgraded to metropolis, `buildingMetropolisType` is cleared

---

## Files Modified

✅ **Already Updated**:
- `app/api/game/[roomId]/metropolis/route.ts` - NEW FILE
- `components/game/CityImprovements.tsx` - Added gameState prop and Build Metropolis button
- `components/board/Board.tsx` - Added knight movement and metropolis building handlers

⚠️ **Needs Manual Update**:
- `components/game/GameController.tsx` - Follow steps above

---

## Testing Checklist

After completing the GameController updates:

### Knight Movement:
- [ ] Click "Move" on a knight
- [ ] Board highlights valid adjacent vertices along your roads
- [ ] Click a highlighted vertex
- [ ] Knight moves to new location
- [ ] Knight becomes inactive after moving

### Metropolis Building:
- [ ] Upgrade an improvement to level 4
- [ ] "Build Metropolis" button appears
- [ ] Click the button
- [ ] Board highlights your cities
- [ ] Click a highlighted city
- [ ] City upgrades to metropolis (gold border, +2 VP)

---

## Progress Card Parameter Selection (Task 2)

**Status**: Deferred

This task requires creating a modal component for cards that need parameters (alchemist, inventor, etc.). 
The implementation is more complex and should be tackled separately after Tasks 1 and 3 are complete.

**Files that will need to be created**:
- `components/game/ProgressCardModal.tsx` - Modal for parameter selection
- Individual form components for each card type

---

## Build & Test

```bash
# Test TypeScript compilation
npm run build

# Run development server
npm run dev
```

---

## Troubleshooting

### "Property 'gameState' is missing" error in GameController
- Make sure you added `gameState` prop to `<CityImprovements>` component

### Knight movement not highlighting vertices
- Check that `movingKnightId` is being passed to Board component
- Verify `canMoveKnightToVertex` function exists in `core/validation/knight-validator.ts`

### Metropolis button not appearing
- Verify improvement level is >= 4 (CK_CONSTANTS.METROPOLIS_REQUIREMENT)
- Check that `gameState.metropolises` array exists
- Ensure `onBuildMetropolis` prop is passed from GameController

---

## Next Steps

1. Complete the GameController.tsx updates above
2. Test knight movement and metropolis building
3. Create progress card parameter selection modal (Task 2)
4. Full end-to-end testing in multiplayer

