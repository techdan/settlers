# Port Mapping Bug Fix - Summary

## Problem
Ports drawn on the board were not mapped to the correct vertices for trading. Each port appeared to have "one correct vertex and one wrong vertex" - a symptom of an off-by-one error in edge-to-corner mapping.

## Root Cause
The `port-generator.ts` file had a **duplicated and incorrect** implementation of the edge-to-vertex formula:

```typescript
// WRONG (duplicated logic)
function getEdgeVertices(q: number, r: number, edgeIndex: number): string[] {
    const corner1 = edgeIndex;
    const corner2 = (edgeIndex + 1) % 6;
    // ...
}
```

This violated DRY principles because the correct formula already existed in `lib/hex.ts`:

```typescript
// CORRECT (canonical implementation)
export const getEdgeEndpoints = (q: number, r: number, d: number): string[] => {
    return [
        getCanonicalVertexId(q, r, (d + 5) % 6),
        getCanonicalVertexId(q, r, d)
    ];
};
```

## Why Adjacent Edges Share One Vertex
For pointy-top hexagons:
- Edge 0 connects corners 5 and 0
- Edge 1 connects corners 0 and 1
- They share corner 0, which is why the bug manifested as "one right, one wrong"

## Solution
1. **Fixed the formula** by replacing the duplicated logic with a call to the canonical `getEdgeEndpoints` function
2. **Updated tests** to match the corrected vertex pairs
3. **Removed debug code** (`debugPorts` functionality)
4. **Updated documentation** (`PORT_MAPPING.md`)

## Files Changed
- `core/engine/board/port-generator.ts` - Now uses `getEdgeEndpoints` from `lib/hex.ts`
- `core/engine/board/__tests__/verify-all-ports.test.ts` - Updated test expectations
- `core/engine/board/__tests__/port-generator.test.ts` - Updated test expectations
- `components/board/Board.tsx` - Removed debug port state
- `components/board/BoardCanvas.tsx` - Removed debug port rendering
- `docs/PORT_MAPPING.md` - Updated with correct vertex pairs
- `docs/handoff/port-mapping-notes.md` - Deleted (issue resolved)

## Verification
✅ All 19 port-related tests pass  
✅ Build compiles successfully  
✅ User-reported vertex pairs now match the trading logic:
- Wood: `1,1,5` + `2,0,0`
- Brick: `2,-1,5` + `2,-1,0`
- Sheep: `-1,-2,0` + `-2,-1,5`
- Wheat: `-2,2,0` + `-2,3,5`
- Ore: `-3,1,0` + `-3,2,5`

## Why the Previous Agent Was Confused
The previous agent was checking vertex pairs against the **buggy formula** in the code, so when you reported what you actually saw on screen (which was rendered correctly), they concluded your pairs were "NOT adjacent" because they didn't match the buggy trading logic. They defended the code instead of questioning it.

## Key Takeaway
**Always use canonical implementations** - don't duplicate geometry formulas. The `lib/hex.ts` module is the single source of truth for hexagonal grid calculations.
