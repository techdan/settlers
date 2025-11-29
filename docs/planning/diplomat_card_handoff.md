# Diplomat Card Implementation - Agent Handoff

## ⚠️ CRITICAL: Read This First

**This handoff document describes work that encountered significant file corruption issues during implementation. The next agent MUST validate all changes before proceeding.**

---

## Task Summary
Complete and validate the Diplomat progress card implementation for Cities & Knights. Frontend changes were made but need verification due to file corruption. Backend validation needs to be added.

---

## Implementation History & File Corruption Issues

### What Happened During This Session

Multiple attempts to edit files resulted in **severe file corruption**, requiring git restores. Some changes may have been lost or incomplete.

#### Files That Experienced Corruption:

**1. `components/board/Board.tsx`**
- **Corruption Events:** 3 failed edit attempts (Steps 83, 94, 99)
- **Git Restores:** 3 times (Steps 90, 97, 99)
- **Final Attempt:** Step 106 using `multi_replace_file_content`
- **Status:** ⚠️ **UNCERTAIN** - Changes may or may not be intact
- **Action Required:** **MUST VERIFY** before proceeding

**2. `core/engine/progress/progress-card-manager.ts`**
- **Corruption Events:** 3 failed edit attempts (Steps 138, 148, 152)
- **Git Restores:** 3 times (Steps 141, 150, 154)
- **Final State:** **NO SUCCESSFUL EDITS** - abandoned after repeated failures
- **Status:** ❌ **NOT IMPLEMENTED**
- **Action Required:** Implement from scratch

#### Corruption Pattern Observed:

When automated edits failed:
- Tool reported: "You had inaccuracies in your replacement chunks"
- Files became corrupted with missing code blocks
- Hundreds of lines deleted or malformed
- TypeScript errors appeared (missing imports, undefined variables)
- Required `git checkout HEAD` to restore

---

## MANDATORY VALIDATION STEPS

### Before Implementing Backend Code

**DO NOT PROCEED** with backend implementation until you verify:

### 1. ✅ Verify `Board.tsx` Lines 34-35

**Expected (CORRECT):**
```typescript
selectingVertexForCard?: 'intrigue' | null;
selectingEdgeForCard?: 'diplomat' | null;
```

**If you see this (WRONG - changes were lost):**
```typescript
selectingVertexForCard?: 'intrigue' | 'diplomat' | null;
selectingEdgeForCard?: null;
```

### 2. ✅ Verify `Board.tsx` Lines 229-241

**Expected (CORRECT) - Diplomat edge selection should be present:**
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

    if (gameState.phase.startsWith('setup')) {
        // ... rest of code
```

### 3. ✅ Verify `Board.tsx` - Old Code Removed

**This code should NOT be present anywhere in validVertices:**
```typescript
// THIS SHOULD BE DELETED:
if (selectingVertexForCard === 'diplomat') {
    vertices.forEach(v => {
        const vertex = gameState.board.vertices[v.id];
        if (vertex && vertex.structure && vertex.owner === playerId) {
            valid.add(v.id);
        }
    });
    return valid;
}
```

### 4. ✅ Verify Other Frontend Files

**ProgressCardHand.tsx (lines 12-13):**
```typescript
onStartVertexSelection?: (cardType: 'intrigue') => void;
onStartEdgeSelection?: (cardType: 'diplomat') => void;
```

**ProgressCardHand.tsx (lines 103-106):**
```typescript
if (onStartEdgeSelection && cardType === 'diplomat') {
    onStartEdgeSelection(cardType);
    return;
}
```

**GameController.tsx (lines 53-54):**
```typescript
const [selectingVertexForCard, setSelectingVertexForCard] = useState<'intrigue' | null>(null);
const [selectingEdgeForCard, setSelectingEdgeForCard] = useState<'diplomat' | null>(null);
```

### 5. ✅ Run Build Test

```bash
npm run build
```

**If build fails:** Frontend changes were corrupted or incomplete. Fix before proceeding.

---

## Context

The Diplomat progress card was incorrectly using **vertex selection** when it should use **edge selection** for road removal.

### Official Rule
**Diplomat Card:** Remove any open road; you may place it as your own.

**"Open Road" Definition:** A road that lies at the beginning or end of a continuous chain of roads, where at that end there is no piece of the same color (no road, city, settlement, or knight of that player touching that end).

### Original Audit Context

This fix was identified during a comprehensive progress card audit:

✅ **All other cards working perfectly:**
- Merchant, Irrigation, Mining, Inventor, Intrigue
- Proper visual indicators and cursor behavior
- Clear user prompts

⚠️ **One issue found:** Diplomat using vertex instead of edge selection

**Audit Documents:**
- `docs/progress_card_board_interaction_audit.md`
- `docs/progress_card_audit_summary.md`

---

## Completed Work (IF Validation Passes)

### 1. Frontend Implementation

#### Files Modified:
- `components/game/ProgressCardHand.tsx`
- `components/game/GameController.tsx`
- `components/board/Board.tsx`

#### Changes Made:

**ProgressCardHand.tsx:**
- Added `onStartEdgeSelection?: (cardType: 'diplomat') => void` prop (line 13)
- Updated `onStartVertexSelection` to only accept `'intrigue'` (line 12)
- Diplomat card now calls `onStartEdgeSelection('diplomat')` (lines 103-106)

**GameController.tsx:**
- Updated `selectingEdgeForCard` state type to `'diplomat' | null` (line 54)
- Removed `'diplomat'` from `selectingVertexForCard` type (line 53)
- Added `handleStartEdgeSelection` function (lines 185-192)
- Added `handleEdgeSelected` function (lines 210-223)
- Updated `handleCancelSelection` to reset edge selection (line 230)
- Passed `onStartEdgeSelection` to ProgressCardHand (line 519)
- Passed `selectingEdgeForCard` and `onEdgeSelectedForCard` to Board (lines 347-348)

**Board.tsx:**
- Updated `selectingVertexForCard` prop type to remove `'diplomat'` (line 34)
- Updated `selectingEdgeForCard` prop type to `'diplomat' | null` (line 35)
- Removed old Diplomat vertex selection logic from `validVertices`
- Added Diplomat edge selection logic to `validEdges` useMemo (lines 229-241)

### 2. Documentation Updated

**docs/archive/catan_progress_cards.md (line 91):**

Changed from:
```
**Explanation:** Only roads with an open end may be targeted.
```

To:
```
**Explanation:** An "open road" is a road at the beginning or end of a continuous road chain, where at that end there is no piece of the same color (no road, city, settlement, or knight of that player touching that end). You may optionally place the removed road elsewhere as your own.
```

---

## Remaining Work

### Backend Validation (NOT IMPLEMENTED)

**File:** `core/engine/progress/progress-card-manager.ts`  
**Function:** `executeDiplomat` (lines 711-757)

**Current State:** Has placeholder comment - no validation implemented

**Required:** Replace entire function with validation code below:

```typescript
function executeDiplomat(gameState: GameState, player: PlayerState, options?: any): void {
    // Remove an open road and optionally place it as your own
    const { edgeId, newEdgeId } = options || {};
    if (!edgeId) {
        throw new Error('Diplomat requires edgeId (road to remove)');
    }

    const edge = gameState.board.edges[edgeId];
    if (!edge || !edge.owner || edge.structure !== 'road') {
        throw new Error('Invalid edge or no road present');
    }

    const roadOwner = edge.owner;

    // Validate the road is "open"
    const endpoints = getEdgeEndpoints(edgeId);
    if (!endpoints || endpoints.length !== 2) {
        throw new Error('Invalid edge endpoints');
    }

    const [vertex1Id, vertex2Id] = endpoints;
    
    // Helper function to check if an end is open
    const isEndOpen = (vertexId: string): boolean => {
        const vertex = gameState.board.vertices[vertexId];
        if (!vertex) return false;

        // Check if vertex has same-color settlement/city/metropolis
        if (vertex.owner === roadOwner && vertex.structure) {
            return false;
        }

        // Check if vertex has same-color knight
        const knight = gameState.players
            .flatMap(p => p.knights || [])
            .find(k => k.vertexId === vertexId);
        if (knight && knight.playerId === roadOwner) {
            return false;
        }

        // Check if vertex has other same-color roads
        const [q, r, d] = vertexId.split(',').map(Number);
        const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);
        const otherRoads = adjacentEdges.filter(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const e = gameState.board.edges[adjEdgeId];
            return e && e.owner === roadOwner && e.structure === 'road';
        });

        return otherRoads.length === 0;
    };

    const end1Open = isEndOpen(vertex1Id);
    const end2Open = isEndOpen(vertex2Id);

    if (!end1Open && !end2Open) {
        throw new Error('Road is not "open" - must be at the end of a road chain with no same-color pieces at that end');
    }

    // Remove the road
    edge.owner = null;
    edge.structure = null;

    // Optionally place it as player's own road
    if (newEdgeId) {
        const newEdge = gameState.board.edges[newEdgeId];
        if (!newEdge || newEdge.owner !== null) {
            throw new Error('Invalid new edge location');
        }

        newEdge.owner = player.id;
        newEdge.structure = 'road';

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} removed a road from another player and placed it elsewhere`,
            playerId: player.id
        });
    } else {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} removed an open road`,
            playerId: player.id
        });
    }
}
```

**Note:** `getAdjacentEdgesForVertex` is already imported (line 8)

---

## Visual Examples

### "Open Road" Examples

✅ **VALID (Open at left):**
```
[Empty] ─── Road A ─── [Settlement A]
```

✅ **VALID (Open at right):**
```
[Settlement B] ─── Road A ─── [Empty]
```

❌ **INVALID (Connected to road):**
```
[Settlement A] ─── Road A ─── Road A
```

❌ **INVALID (Same-color pieces both ends):**
```
[Knight A] ─── Road A ─── [City A]
```

❌ **INVALID (Roads both ends):**
```
Road A ─── Road A ─── Road A
```

---

## Testing Checklist

### Frontend Validation
- [ ] Verify build passes: `npm run build`
- [ ] Verify all changes listed above are present
- [ ] Play Diplomat card in-game
- [ ] Confirm roads highlighted with white rectangles
- [ ] Confirm cursor changes to pointer on roads
- [ ] Click road and verify `edgeId` sent to backend

### Backend Validation
- [ ] Implement `executeDiplomat` function
- [ ] Verify build passes
- [ ] Test open road (end of chain) - should succeed
- [ ] Test closed road (between settlements) - should fail
- [ ] Test road with knight at end - should fail
- [ ] Test road with roads at both ends - should fail

### Integration Testing
- [ ] Remove open road successfully
- [ ] Verify road removed from board
- [ ] Verify game log message
- [ ] Test optional road placement
- [ ] Verify longest road updates

---

## Success Criteria

1. ✅ All frontend files compile without errors
2. ✅ Diplomat triggers edge selection mode
3. ✅ Roads visually highlighted when Diplomat active
4. ✅ Backend validates "open road" rule
5. ✅ Clear error messages for invalid roads
6. ✅ Road removal works for valid open roads
7. ✅ Game log shows correct messages

---

## Key Files

**Modified (Verify These):**
1. `components/game/ProgressCardHand.tsx`
2. `components/game/GameController.tsx`
3. `components/board/Board.tsx`
4. `docs/archive/catan_progress_cards.md`

**To Update:**
5. `core/engine/progress/progress-card-manager.ts`

**Supporting Docs:**
6. `docs/diplomat_card_implementation_summary.md`
7. `docs/progress_card_board_interaction_audit.md`
8. `docs/progress_card_audit_summary.md`

---

**Estimated Time:** 1 hour (30 min validation + 15 min implementation + 15 min testing)

**Priority:** Medium - Game playable but Diplomat won't enforce rules correctly
