# Bug Fix: Setup Round Road Placement

## Problem
During the setup phase, when placing roads after a settlement, players were only seeing 1-2 valid road placement options instead of the correct 3 options. Additionally, some invalid positions were being shown as valid.

## Root Cause
The `isValidSetupRoad()` function in `core/validation/setup-validator.ts` had incorrect adjacency logic. It was using a manual calculation that only identified 2 of the 3 edges adjacent to a vertex:

```typescript
// BUGGY CODE (removed)
const isAdjacent = (
    (edgeQ === settQ && edgeR === settR && (edgeD === settD || edgeD === (settD + 5) % 6))
);
```

This logic assumed an edge was adjacent if it shared hex coordinates (q, r) and had direction `d` or `(d+5)%6`, but this is incomplete.

### Why This Was Wrong
In a hexagonal grid, each vertex touches 3 hexes and has 3 adjacent edges. The buggy code only checked for edges that:
1. Share the same hex coordinates (q, r) as the vertex
2. Have direction d or (d+5)%6

This misses the third edge which may be on a neighboring hex.

## Solution
The fix uses the existing helper function `getEdgeEndpoints(q, r, d)` from `lib/hex.ts`, which correctly returns both vertices that an edge connects to. We then check if one of those vertices is the settlement:

```typescript
// FIXED CODE
const [q, r, d] = edgeId.split(',').map(Number);
const endpoints = getEdgeEndpoints(q, r, d);

if (!endpoints.includes(gameState.lastPlacedSettlementId)) {
    return false; // Not connected to the just-placed settlement
}
```

This correctly identifies all 3 edges adjacent to any vertex.

## Files Changed
1. **core/validation/setup-validator.ts** - Fixed `isValidSetupRoad()` function
2. **core/validation/building-validator.ts** - Removed duplicate unused `isValidSetupRoad()` function

## Testing
- Build verification: ✅ Successful (`npm run build`)
- Expected behavior: During setup, placing a road after a settlement should now show exactly 3 valid placement options (the 3 edges touching the settlement vertex)
