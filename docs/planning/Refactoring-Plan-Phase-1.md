# Phase 1 Refactoring Plan: Architecture Cleanup

**Status:** Not Started
**Priority:** CRITICAL
**Estimated Effort:** 3-4 days
**Target Completion:** Week 1-2
**Based on:** Opus Audit 2025-12-06

## Overview

This plan addresses critical architectural violations that impact maintainability and violate documented design patterns. **IMPORTANT:** Board.tsx decomposition is now **Task 1** due to blocking development (corruption risk).

All issues in this phase are **HIGH PRIORITY** and should be completed before moving to Phase 2 (Component Decomposition).

## Prerequisites

- [ ] Review `docs/audits/Opus-Audit-2025-12-06.md` (Architecture Review + Board.tsx section)
- [ ] Review `docs/system-architecture.md` for documented layering rules
- [ ] Create backup branch: `git checkout -b refactor/phase-1-architecture`
- [ ] **CRITICAL:** Do NOT attempt to edit Board.tsx directly - it will corrupt

---

## Task 1: Decompose Board.tsx (CRITICAL - BLOCKING ISSUE)

**Issue:** Board.tsx (932 lines) is blocking development - agent edits repeatedly corrupt the file
**Impact:** **Development blocked**, cannot make changes without breaking board functionality
**Root Cause:** Excessive complexity (40+ props, 176-line validation function, 207-line click handler)
**Files Affected:** 1 file → 5 new files

### Why This Is Task 1

This task has been escalated to **CRITICAL** priority and moved to Task 1 because:
1. **Actively blocking development** - any edit attempt by agents corrupts the file
2. **High-risk file** - contains core game interaction logic
3. **Prerequisite for other tasks** - still uses API routes (knight, metropolis) that need migration
4. **Cannot be edited incrementally** - must be recreated from scratch

**DO NOT** attempt to edit the existing Board.tsx file. It **WILL** corrupt due to complexity.

### Current State

**components/board/Board.tsx (932 lines)**

**Complexity Breakdown:**
```
Board.tsx
├── Imports (23 lines) - 17 different imports
├── BoardProps interface (40 props!) ← PROBLEM
├── Component body (850+ lines):
│   ├── useMemo: ports (1)
│   ├── useMemo: renderEdges (13 lines)
│   ├── useMemo: sortedTiles (4 lines)
│   ├── useMemo: diceStats (7 lines)
│   ├── useMemo: eventDiceStats (7 lines)
│   ├── useMemo: knightsMap (9 lines)
│   ├── useMemo: validVertices (176 lines) ← GOD FUNCTION
│   ├── useMemo: diplomatPlacementState (21 lines)
│   ├── useMemo: validEdges (49 lines)
│   ├── useMemo: validHexes (51 lines)
│   ├── handleVertexClick (207 lines) ← GOD FUNCTION
│   ├── handleEdgeClick (54 lines)
│   ├── handleHexClick (23 lines)
│   └── Render/JSX (160 lines)
```

**Problems:**
- 40+ props passed from GameController
- Mixed concerns: rendering + validation + interaction + API calls
- API route calls on lines 554 (knight) and 580 (metropolis)
- Complex dependency chains between memos
- 10+ levels of nested conditionals
- Phase-specific logic for 8+ game phases
- 15+ different progress card selection modes

### Decomposition Strategy

Create **5 new files** to replace Board.tsx:

#### File 1: `lib/types/board-selection-state.ts` (~80 lines)

**Purpose:** Consolidate 40 props into structured types

```typescript
// Consolidate selection state
export interface BoardSelectionState {
  buildMode: BuildMode | null;
  movingKnightId?: string | null;
  buildingMetropolisType?: MetropolisType | null;

  // Card selections
  hexCardSelection?: {
    type: 'merchant' | 'inventor' | 'taxation';
    selectedHexId?: string;
    inventorSelection?: { firstHexId?: string; secondHexId?: string };
  };

  vertexCardSelection?: {
    type: 'intrigue' | 'treason_remove' | 'treason_place';
    selectedKnightId?: string;
    placementVertexId?: string;
  };

  edgeCardSelection?: {
    type: 'diplomat';
    stage?: 'remove' | 'rebuild';
    removedEdgeId?: string;
    relocatedEdgeId?: string;
  };

  // City selections
  citySelection?: {
    type: 'engineer' | 'medicine' | 'metropolis';
    cityType?: MetropolisType;
    selectedCityId?: string;
  };

  // Smith selection
  smithSelection?: {
    selectableKnightIds?: string[];
    selectedKnightIds?: string[];
  };

  // Progress prompt
  progressPrompt?: {
    cardType?: ProgressCardType;
    visible?: boolean;
    ready?: boolean;
  };
}

export interface BoardCallbacks {
  onHexSelected?: (hexId: string) => void;
  onVertexSelectedForCard?: (vertexId: string) => void;
  onEdgeSelectedForCard?: (edgeId: string) => void;
  onEngineerCitySelected?: (vertexId: string) => void;
  onMedicineCitySelected?: (vertexId: string) => void;
  onMetropolisCitySelected?: (vertexId: string) => void;
  onCityClick?: (vertexId: string) => void;
  onKnightClick?: (knightId: string) => void;
  onBarbarianCitySelect?: (vertexId: string) => void;
  onCancelBuild: () => void;
}

// Reduces BoardProps from 40 props to ~5 props!
export interface BoardProps {
  gameState: GameState;
  playerId: string;
  selectionState: BoardSelectionState;
  callbacks: BoardCallbacks;
}
```

**Benefits:**
- Reduces prop count from 40 to 4
- Easier to pass around
- Type-safe selection state
- Clear grouping of related props

#### File 2: `lib/hooks/useBoardValidation.ts` (~350 lines)

**Purpose:** Extract ALL validation logic from useMemo hooks

```typescript
import { useMemo } from 'react';
import { GameState } from '@/lib/types';
import { BoardSelectionState } from '@/lib/types/board-selection-state';
import { /* validators */ } from '@/core/validation/*';

export function useBoardValidation(
  gameState: GameState,
  playerId: string,
  selectionState: BoardSelectionState
) {
  // Extract validVertices (176 lines)
  const validVertices = useMemo(() => {
    const valid = new Set<string>();
    // ... all the validation logic from Board.tsx lines 176-352
    return valid;
  }, [gameState, playerId, selectionState]);

  // Extract validEdges (49 lines)
  const validEdges = useMemo(() => {
    const valid = new Set<string>();
    // ... all the validation logic from Board.tsx lines 376-424
    return valid;
  }, [gameState, playerId, selectionState]);

  // Extract validHexes (51 lines)
  const validHexes = useMemo(() => {
    const valid = new Set<string>();
    // ... all the validation logic from Board.tsx lines 429-479
    return valid;
  }, [gameState, playerId, selectionState]);

  // Extract diplomatPlacementState
  const diplomatPlacementState = useMemo(() => {
    // ... from Board.tsx lines 354-374
  }, [/* deps */]);

  return {
    validVertices,
    validEdges,
    validHexes,
    diplomatPlacementState
  };
}
```

**Benefits:**
- Isolated validation logic
- Testable independently
- Clearer dependencies
- Easier to debug

#### File 3: `lib/hooks/useBoardActions.ts` (~450 lines)

**Purpose:** Extract ALL click handlers

```typescript
import { useTransition, useState } from 'react';
import { GameState } from '@/lib/types';
import { BoardSelectionState, BoardCallbacks } from '@/lib/types/board-selection-state';
import {
  placeSettlement, placeRoad, moveRobber, buildRoad,
  buildSettlement, buildCity, placeBonusRoad, buildKnight,
  buildCityWall, relocateKnight, moveKnightAction, placeMetropolisAction
} from '@/app/actions';

export function useBoardActions(
  gameState: GameState,
  playerId: string,
  selectionState: BoardSelectionState,
  callbacks: BoardCallbacks,
  validation: ReturnType<typeof useBoardValidation>
) {
  const [isPending, startTransition] = useTransition();
  const [isPlacingBonusRoad, setIsPlacingBonusRoad] = useState(false);

  // Extract handleVertexClick (207 lines) → usevertexClick
  // BUT replace API calls with server actions!
  const handleVertexClick = (vertexId: string) => {
    if (isPending) return;
    // ... all logic from Board.tsx lines 481-687
    // IMPORTANT: Replace fetch() calls with:
    // - await moveKnightAction(roomId, playerId, knightId, vertexId)
    // - await placeMetropolisAction(roomId, playerId, vertexId, type)
  };

  // Extract handleEdgeClick (54 lines)
  const handleEdgeClick = (edgeId: string) => {
    // ... from Board.tsx lines 689-742
  };

  // Extract handleHexClick (23 lines)
  const handleHexClick = (hexId: string) => {
    // ... from Board.tsx lines 744-766
  };

  return {
    handleVertexClick,
    handleEdgeClick,
    handleHexClick,
    isPending,
    isPlacingBonusRoad
  };
}
```

**Benefits:**
- Isolated interaction logic
- **Fixes API route usage** - uses server actions instead
- Testable with mock gameState
- Clearer separation of concerns

#### File 4: `components/board/BoardCanvas.tsx` (~250 lines)

**Purpose:** Pure rendering component - NO logic

```typescript
'use client';

import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { generatePorts } from '@/core/engine/board/port-generator'; // UPDATED PATH
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { GameState } from '@/lib/types';
import { BoardSelectionState } from '@/lib/types/board-selection-state';

interface BoardCanvasProps {
  gameState: GameState;
  playerId: string;
  theme: 'flat' | 'voxel';
  hexSize: number;
  selectionState: BoardSelectionState;
  validation: {
    validVertices: Set<string>;
    validEdges: Set<string>;
    validHexes: Set<string>;
  };
  onVertexClick: (vertexId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onHexClick: (hexId: string) => void;
  onToggleTheme: () => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  gameState,
  playerId,
  theme,
  hexSize,
  selectionState,
  validation,
  onVertexClick,
  onEdgeClick,
  onHexClick,
  onToggleTheme
}) => {
  const ports = useMemo(() => generatePorts(hexSize), [hexSize]);
  const tiles = gameState.board.hexes;
  const vertices = Object.values(gameState.board.vertices);
  const edges = Object.values(gameState.board.edges);

  // Sorted tiles (voxel rendering)
  const sortedTiles = useMemo(() =>
    [...tiles].sort((a, b) => {
      if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
      return a.hex.q - b.hex.q;
    }),
    [tiles]
  );

  const TileComponent = theme === 'flat' ? FlatHexTile : VoxelHexTile;
  const PortComponent = theme === 'flat' ? FlatPort : VoxelPort;

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <TransformWrapper /* ... zoom config ... */>
        {({ zoomIn, zoomOut }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-10">
              {/* ... buttons ... */}
            </div>

            <TransformComponent>
              <svg /* ... */>
                {/* Render hexes */}
                {sortedTiles.map(tile => (
                  <TileComponent
                    key={tile.id}
                    {/* ... props ... */}
                    onClick={() => onHexClick(tile.id)}
                    isSelectable={validation.validHexes.has(tile.id)}
                  />
                ))}

                {/* Render ports */}
                {ports.map((port, i) => (
                  <PortComponent key={i} port={port} />
                ))}

                {/* Render edges */}
                {edges.map(edge => (
                  <EdgeRenderer
                    key={edge.id}
                    edge={edge}
                    onClick={onEdgeClick}
                    isValid={validation.validEdges.has(edge.id)}
                  />
                ))}

                {/* Render vertices */}
                {vertices.map(vertex => (
                  <VertexRenderer
                    key={vertex.id}
                    vertex={vertex}
                    onClick={onVertexClick}
                    isValid={validation.validVertices.has(vertex.id)}
                  />
                ))}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
```

**Benefits:**
- Pure rendering - no business logic
- Easy to understand
- Can be tested visually
- Clear props interface

#### File 5: `components/board/Board.tsx` (~120 lines)

**Purpose:** Thin orchestrator - glues everything together

```typescript
'use client';

import React from 'react';
import { useThemeStore } from '@/lib/theme-store';
import { BoardCanvas } from './BoardCanvas';
import { useBoardValidation } from '@/lib/hooks/useBoardValidation';
import { useBoardActions } from '@/lib/hooks/useBoardActions';
import { BoardProps } from '@/lib/types/board-selection-state';

export const Board: React.FC<BoardProps> = ({
  gameState,
  playerId,
  selectionState,
  callbacks
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const HEX_SIZE = 90;

  // Use validation hook
  const validation = useBoardValidation(gameState, playerId, selectionState);

  // Use actions hook
  const actions = useBoardActions(
    gameState,
    playerId,
    selectionState,
    callbacks,
    validation
  );

  // Render canvas with all the wiring
  return (
    <BoardCanvas
      gameState={gameState}
      playerId={playerId}
      theme={theme}
      hexSize={HEX_SIZE}
      selectionState={selectionState}
      validation={validation}
      onVertexClick={actions.handleVertexClick}
      onEdgeClick={actions.handleEdgeClick}
      onHexClick={actions.handleHexClick}
      onToggleTheme={toggleTheme}
    />
  );
};
```

**Benefits:**
- Clean, readable orchestration
- Easy to understand data flow
- All complexity hidden in hooks
- ~120 lines vs 932 lines!

### Action Items

#### Step 1: Create Type Definitions (30 min)

- [ ] Create `lib/types/board-selection-state.ts`
- [ ] Define `BoardSelectionState` interface
- [ ] Define `BoardCallbacks` interface
- [ ] Define `BoardProps` interface
- [ ] Export all types

**Verification:**
```bash
npm run build  # Should compile without errors
```

#### Step 2: Create Validation Hook (2 hours)

- [ ] Create `lib/hooks/useBoardValidation.ts`
- [ ] Copy `validVertices` logic from Board.tsx lines 176-352
- [ ] Copy `validEdges` logic from Board.tsx lines 376-424
- [ ] Copy `validHexes` logic from Board.tsx lines 429-479
- [ ] Copy `diplomatPlacementState` logic from Board.tsx lines 354-374
- [ ] Update to use `BoardSelectionState` instead of individual props
- [ ] Test that it compiles

**Dependencies to update:**
- Replace prop checks like `buildMode === 'road'` with `selectionState.buildMode === 'road'`
- Replace `movingKnightId` with `selectionState.movingKnightId`
- Replace `selectingHexForCard` with `selectionState.hexCardSelection?.type`
- Etc.

**Verification:**
```typescript
// Test in isolation
const validation = useBoardValidation(mockGameState, 'player1', mockSelectionState);
console.log(validation.validVertices.size); // Should return number
```

#### Step 3: Create Server Actions for Knight/Metropolis (1 hour)

**BEFORE creating actions hook, create missing server actions:**

- [ ] Create `moveKnightAction` in `app/actions.ts` (if doesn't exist)
  ```typescript
  export async function moveKnightAction(
    roomId: string,
    playerId: string,
    knightId: string,
    targetVertexId: string
  ) {
    'use server';
    // Call knight-service.moveKnight()
    // Revalidate
  }
  ```

- [ ] Create `placeMetropolisAction` in `app/actions.ts` (if doesn't exist)
  ```typescript
  export async function placeMetropolisAction(
    roomId: string,
    playerId: string,
    vertexId: string,
    metropolisType: 'science' | 'trade' | 'politics'
  ) {
    'use server';
    // Call metropolis-service.placeMetropolis()
    // Revalidate
  }
  ```

**Verification:**
- [ ] Actions compile without errors
- [ ] Actions follow same pattern as existing actions

#### Step 4: Create Actions Hook (2-3 hours)

- [ ] Create `lib/hooks/useBoardActions.ts`
- [ ] Copy `handleVertexClick` from Board.tsx lines 481-687
- [ ] Copy `handleEdgeClick` from Board.tsx lines 689-742
- [ ] Copy `handleHexClick` from Board.tsx lines 744-766
- [ ] **CRITICAL:** Replace fetch() API calls with server actions:
  - Line 554-568: Replace with `await moveKnightAction(...)`
  - Line 580-594: Replace with `await placeMetropolisAction(...)`
- [ ] Update to use `BoardSelectionState` and `BoardCallbacks`
- [ ] Use validation from hook parameter

**Key Changes:**
```typescript
// BEFORE (Board.tsx line 554)
const res = await fetch(`/api/game/${gameState.roomId}/knight`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId, action: 'move', knightId, targetVertexId })
});

// AFTER (useBoardActions.ts)
await moveKnightAction(gameState.roomId, playerId, knightId, vertexId);
callbacks.onCancelBuild();
```

**Verification:**
- [ ] Hook compiles
- [ ] No fetch() calls remaining
- [ ] All actions use server actions

#### Step 5: Create BoardCanvas Component (1-2 hours)

- [ ] Create `components/board/BoardCanvas.tsx`
- [ ] Copy rendering logic from Board.tsx (SVG + zoom controls)
- [ ] Accept click handlers as props (don't implement logic)
- [ ] Accept validation sets as props
- [ ] Update `generatePorts` import to `@/core/engine/board/port-generator`
- [ ] Keep component pure - NO useTransition, NO fetch, NO validation logic

**Key principle:** BoardCanvas should ONLY render. All logic is in hooks.

**Verification:**
- [ ] Component compiles
- [ ] Visual check: Board renders (may not be interactive yet)
- [ ] No business logic in component

#### Step 6: Create New Board.tsx Orchestrator (30 min)

- [ ] **Rename** old Board.tsx to `Board.tsx.backup`
- [ ] Create NEW `components/board/Board.tsx` (orchestrator)
- [ ] Import hooks and types
- [ ] Wire up validation hook
- [ ] Wire up actions hook
- [ ] Render BoardCanvas with props
- [ ] Keep file under 150 lines

**Verification:**
- [ ] New Board.tsx compiles
- [ ] Exports `Board` component
- [ ] No duplicate exports

#### Step 7: Update GameController (1 hour)

GameController currently passes 40+ props to Board. Update to use new structure:

- [ ] Open `components/game/GameController.tsx`
- [ ] Find Board component usage (search for `<Board`)
- [ ] Create `BoardSelectionState` object from current state
- [ ] Create `BoardCallbacks` object from handlers
- [ ] Replace 40 props with 4 props: `gameState`, `playerId`, `selectionState`, `callbacks`

**BEFORE:**
```typescript
<Board
  gameState={gameState}
  playerId={playerId}
  buildMode={buildMode}
  onCancelBuild={handleCancelBuild}
  movingKnightId={movingKnightId}
  buildingMetropolisType={buildingMetropolisType}
  // ... 34 more props ...
/>
```

**AFTER:**
```typescript
<Board
  gameState={gameState}
  playerId={playerId}
  selectionState={{
    buildMode,
    movingKnightId,
    buildingMetropolisType,
    hexCardSelection: selectingHexForCard ? {
      type: selectingHexForCard,
      selectedHexId: merchantSelectedHexId || taxationSelectedHexId,
      inventorSelection
    } : undefined,
    // ... grouped selection state ...
  }}
  callbacks={{
    onCancelBuild: handleCancelBuild,
    onHexSelected: handleHexSelected,
    // ... all callbacks ...
  }}
/>
```

**Verification:**
- [ ] GameController compiles
- [ ] No TypeScript errors
- [ ] Board prop interface satisfied

#### Step 8: Test Board Functionality (1-2 hours)

**Manual Testing Checklist:**

- [ ] **Setup Phase:**
  - [ ] Can place settlement
  - [ ] Can place road
  - [ ] Valid placements highlighted correctly

- [ ] **Main Phase:**
  - [ ] Can build settlement (build mode)
  - [ ] Can build city (build mode)
  - [ ] Can build road (build mode)
  - [ ] Can build knight (build mode)
  - [ ] Can build city wall (build mode)

- [ ] **Knight Actions:**
  - [ ] Can click knight to activate
  - [ ] Can move knight (using NEW server action)
  - [ ] Valid movement targets highlighted

- [ ] **Metropolis:**
  - [ ] Can select city for metropolis
  - [ ] Can build metropolis (using NEW server action)

- [ ] **Progress Cards:**
  - [ ] Merchant hex selection works
  - [ ] Inventor hex selection works
  - [ ] Taxation hex selection works
  - [ ] Intrigue vertex selection works
  - [ ] Treason knight selection works
  - [ ] Diplomat edge selection works
  - [ ] Engineer city selection works
  - [ ] Medicine city selection works

- [ ] **Special Phases:**
  - [ ] Robber placement works
  - [ ] Barbarian city selection works
  - [ ] Knight displacement works

- [ ] **UI:**
  - [ ] Zoom controls work
  - [ ] 2D/3D toggle works
  - [ ] Board renders correctly in both themes

**If any test fails:**
1. Check browser console for errors
2. Verify server action exists and is imported
3. Check validation hook logic
4. Check actions hook logic

#### Step 9: Cleanup (15 min)

- [ ] Delete `Board.tsx.backup` (if all tests pass)
- [ ] Remove unused imports from GameController
- [ ] Run `npm run build` - should succeed
- [ ] Commit changes (atomic commit per the plan)

### Success Criteria

- ✅ Board.tsx reduced from 932 lines to ~120 lines
- ✅ 40 props reduced to 4 props
- ✅ NO API route fetch() calls (knight, metropolis use server actions)
- ✅ All validation logic in dedicated hook (~350 lines)
- ✅ All action logic in dedicated hook (~450 lines)
- ✅ Pure rendering in BoardCanvas (~250 lines)
- ✅ Type definitions in dedicated file (~80 lines)
- ✅ All manual tests pass
- ✅ `npm run build` succeeds
- ✅ No corruption when making future edits (testable by making small edit)

### Rollback Plan

If decomposition fails or breaks critical functionality:

1. **Restore old Board.tsx:**
   ```bash
   mv Board.tsx.backup components/board/Board.tsx
   ```

2. **Delete new files:**
   ```bash
   rm lib/types/board-selection-state.ts
   rm lib/hooks/useBoardValidation.ts
   rm lib/hooks/useBoardActions.ts
   rm components/board/BoardCanvas.tsx
   ```

3. **Revert GameController changes:**
   ```bash
   git checkout components/game/GameController.tsx
   ```

4. **Verify:**
   ```bash
   npm run build
   # Test board manually
   ```

---

## Task 2: Consolidate Mutation Pathways

**Issue:** Dual mutation pathways violate documented architecture (API routes + Server Actions)
**Impact:** Logic duplication, inconsistent validation, unclear cache invalidation
**Files Affected:** ~12 API route files + Board.tsx (now fixed in Task 1)

### Current State

The following API routes handle POST mutations despite architecture docs stating "mutations through server actions only":

```
app/api/game/[roomId]/
├── barbarian/route.ts              (POST - barbarian actions)
├── commercial-harbor/route.ts      (POST - commercial harbor responses)
├── improvement/route.ts            (POST - improvement upgrades)
├── knight/route.ts                 (POST - knight actions)
├── metropolis/route.ts             (POST - metropolis placement)
└── progress-card/
    ├── alchemy/route.ts            (POST)
    ├── deserter/route.ts           (POST)
    ├── diplomat/route.ts           (POST)
    ├── intrigue/route.ts           (POST)
    └── wedding/route.ts            (POST)
```

### Action Items

#### Step 1: Audit Existing Server Actions

- [ ] List all existing server actions in `app/actions.ts`
- [ ] Identify which API route operations already have server action equivalents
- [ ] Document any operations that DON'T have server actions yet

#### Step 2: Create Missing Server Actions

For each API route that lacks a server action equivalent:

- [ ] `improvementUpgradeAction` (for improvement/route.ts)
- [ ] `activateKnightAction` / `moveKnightAction` (for knight/route.ts if not present)
- [ ] `placeMetropolisAction` (for metropolis/route.ts if not present)
- [ ] Progress card actions (if not present):
  - [ ] `playAlchemyCardAction`
  - [ ] `playDeserterCardAction`
  - [ ] `playDiplomatCardAction`
  - [ ] `playIntrigueCardAction`
  - [ ] `playWeddingCardAction`

#### Step 3: Update Client Components

For each API route being removed:

- [ ] Find all client components making `fetch()` calls to the route
- [ ] Replace with server action imports and calls
- [ ] Update error handling to match server action patterns
- [ ] Test mutation + optimistic updates

**Files to check:**
```bash
grep -r "api/game.*barbarian" components/
grep -r "api/game.*improvement" components/
grep -r "api/game.*knight" components/
grep -r "api/game.*metropolis" components/
grep -r "api/game.*progress-card" components/
```

#### Step 4: Convert Routes to Read-Only or Remove

For each POST API route:

**Option A: Convert to GET (if read logic needed)**
- [ ] Remove POST handler
- [ ] Keep GET handler if needed for reads
- [ ] Ensure no mutations in GET

**Option B: Delete entirely (if no read logic needed)**
- [ ] Delete route file
- [ ] Remove from routing

#### Step 5: Verification

- [ ] Run `npm run build` - should succeed
- [ ] Test each converted mutation in browser
- [ ] Verify Supabase realtime sync still works
- [ ] Check game logs are still written correctly

### Success Criteria

- ✅ No API routes handle POST requests
- ✅ All mutations go through `app/actions.ts`
- ✅ All game actions properly validated and logged
- ✅ Build completes without errors
- ✅ Integration tests pass (manual testing required - no automated tests exist)

---

## Task 2: Fix Service Layer Bypass

**Issue:** `lobby-service.ts` imports `db` directly instead of using repository layer
**Impact:** Architecture violation, complicates testing, bypasses data access abstraction
**Files Affected:** 1 service file

### Current State

**lib/services/lobby-service.ts:1-2**
```typescript
import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
```

This violates the documented layering:
```
Services → Repositories → Database
```

### Action Items

#### Step 1: Create Lobby Repository

- [ ] Create file: `lib/repositories/lobby-repository.ts`
- [ ] Review existing repositories for patterns:
  - [ ] Read `lib/repositories/game-repository.ts`
  - [ ] Read `lib/repositories/room-repository.ts`
  - [ ] Read `lib/repositories/player-repository.ts`

#### Step 2: Define Repository Interface

Create methods mirroring lobby-service's DB operations:

```typescript
// lib/repositories/lobby-repository.ts
import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const lobbyRepository = {
  // Example methods - adjust based on actual lobby-service needs

  async getRoomWithPlayers(roomId: string) {
    // Move room+players query here
  },

  async updateRoomStatus(roomId: string, status: string) {
    // Move room status update here
  },

  async addPlayerToRoom(roomId: string, playerId: string, playerData: any) {
    // Move player addition logic here
  },

  async removePlayerFromRoom(roomId: string, playerId: string) {
    // Move player removal logic here
  },

  // Add other methods as needed
};
```

**Checklist:**
- [ ] Identify all DB operations in `lobby-service.ts`
- [ ] Create corresponding repository methods
- [ ] Add TypeScript types for all parameters and returns
- [ ] Add JSDoc comments for each method
- [ ] Handle errors at repository level (throw with context)

#### Step 3: Refactor Lobby Service

- [ ] Remove direct `db` import from `lobby-service.ts`
- [ ] Remove `rooms`, `players` schema imports
- [ ] Import `lobbyRepository` instead
- [ ] Replace all `db.select()`, `db.insert()`, `db.update()`, `db.delete()` calls with repository methods
- [ ] Ensure service layer only orchestrates, doesn't handle DB directly

**Before:**
```typescript
import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';

export async function getRoomStatus(roomId: string) {
  const room = await db.select().from(rooms).where(eq(rooms.id, roomId));
  // ... business logic
}
```

**After:**
```typescript
import { lobbyRepository } from '@/lib/repositories/lobby-repository';

export async function getRoomStatus(roomId: string) {
  const room = await lobbyRepository.getRoom(roomId);
  // ... business logic
}
```

#### Step 4: Verification

- [ ] Run `npm run build` - should succeed
- [ ] Test lobby operations:
  - [ ] Create room
  - [ ] Join room
  - [ ] Leave room
  - [ ] Start game
  - [ ] Room list refresh
- [ ] Verify no direct DB imports in `lobby-service.ts`
- [ ] Check all tests pass (none exist currently, manual testing required)

### Success Criteria

- ✅ `lobby-service.ts` no longer imports `db` directly
- ✅ All DB operations go through `lobby-repository.ts`
- ✅ Proper separation of concerns: Service = orchestration, Repository = data access
- ✅ Build completes without errors
- ✅ Lobby functionality works end-to-end

---

## Task 3: Cleanup Legacy Code

**Issue:** `engine/generatePorts.ts` exists outside modular boundary
**Impact:** Violates architecture, complicates code navigation
**Files Affected:** 1 legacy file, 1 import

### Current State

```
engine/
└── generatePorts.ts (108 lines)
```

Imported by: `components/board/Board.tsx`

Should be in: `core/engine/board/port-generator.ts`

### Action Items

#### Step 1: Move File

- [ ] Create new file: `core/engine/board/port-generator.ts`
- [ ] Copy contents from `engine/generatePorts.ts`
- [ ] Verify file contents are correct

#### Step 2: Update Import

- [ ] Open `components/board/Board.tsx`
- [ ] Find import: `from '@/engine/generatePorts'`
- [ ] Replace with: `from '@/core/engine/board/port-generator'`
- [ ] Save file

**Before:**
```typescript
import { generatePorts } from '@/engine/generatePorts';
```

**After:**
```typescript
import { generatePorts } from '@/core/engine/board/port-generator';
```

#### Step 3: Verify No Other Imports

- [ ] Run global search for `'@/engine/`
- [ ] Run global search for `from 'engine/`
- [ ] Ensure no other files import from `engine/` directory

```bash
grep -r "from '@/engine" .
grep -r "from 'engine" .
grep -r 'from "@/engine' .
grep -r 'from "engine' .
```

#### Step 4: Delete Legacy File

- [ ] Delete `engine/generatePorts.ts`
- [ ] Delete `engine/` directory (should be empty)
- [ ] Verify directory is gone

```bash
rm engine/generatePorts.ts
rmdir engine
```

#### Step 5: Verification

- [ ] Run `npm run build` - should succeed
- [ ] Test board rendering
- [ ] Verify ports appear correctly on board
- [ ] Check no broken imports

### Success Criteria

- ✅ `engine/` directory deleted
- ✅ `core/engine/board/port-generator.ts` exists
- ✅ Board.tsx imports from correct location
- ✅ No other files import from legacy `engine/` path
- ✅ Build completes without errors
- ✅ Board ports render correctly

---

## Phase 1 Completion Checklist

### Pre-Completion Review

- [ ] All Task 1 success criteria met (Mutation Pathways)
- [ ] All Task 2 success criteria met (Service Layer Bypass)
- [ ] All Task 3 success criteria met (Legacy Cleanup)
- [ ] No new console errors in browser
- [ ] No new TypeScript errors in IDE
- [ ] `npm run build` succeeds

### Testing Checklist

Since no automated tests exist, perform manual testing:

- [ ] **Lobby Operations:**
  - [ ] Create new room
  - [ ] Join existing room
  - [ ] Leave room
  - [ ] Start game from lobby

- [ ] **Game Operations (using new server actions):**
  - [ ] Place settlement/city
  - [ ] Upgrade city to metropolis
  - [ ] Activate knight
  - [ ] Move knight
  - [ ] Play improvement card
  - [ ] Play progress card (test each type)
  - [ ] Respond to barbarian attack
  - [ ] Use commercial harbor

- [ ] **Board Rendering:**
  - [ ] Ports display correctly
  - [ ] Port tooltips show correct resources
  - [ ] Port positioning accurate

### Code Quality Review

- [ ] No `any` types introduced
- [ ] All functions have TypeScript types
- [ ] Consistent error handling patterns
- [ ] No console.log statements added
- [ ] Code follows existing patterns

### Documentation Updates

- [ ] Update system-architecture.md if needed
- [ ] Add comments to new repository methods
- [ ] Document any breaking changes (shouldn't be any)

### Git Commit

```bash
# Stage changes
git add .

# Commit with detailed message
git commit -m "$(cat <<'EOF'
refactor: Phase 1 Architecture Cleanup

Architecture improvements:
- Consolidated all mutations through server actions (removed POST from 12 API routes)
- Fixed lobby-service to use repository layer (created lobby-repository.ts)
- Moved engine/generatePorts.ts to core/engine/board/port-generator.ts

Breaking changes: None
All existing functionality preserved and tested.

Related: docs/audits/Opus-Audit-2025-12-06.md
Related: docs/planning/Refactoring-Plan-Phase-1.md

🤖 Generated with Claude Code
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"

# DO NOT push yet - wait for user review
```

### Next Steps

After Phase 1 completion:

1. **User Review:**
   - Request code review of refactor branch
   - Address any feedback

2. **Merge to Main:**
   - Only after approval
   - Ensure CI passes (if configured)

3. **Proceed to Phase 2:**
   - See: `docs/planning/Refactoring-Plan-Phase-2.md` (to be created)
   - Focus: Component Decomposition (GameController, progress-card-manager)

---

## Troubleshooting

### Build Errors After Refactor

**Issue:** TypeScript errors about missing types

**Solution:**
- Check all imports are updated
- Verify repository methods return correct types
- Run `npm run build` to see all errors at once

### Runtime Errors in Browser

**Issue:** "Cannot read property of undefined" errors

**Solution:**
- Check server action error handling
- Verify repository methods handle null cases
- Add null checks in service layer

### Realtime Sync Broken

**Issue:** Game state not updating for other players

**Solution:**
- Ensure server actions still call `revalidatePath()` or `revalidateTag()`
- Check Supabase channels still subscribed
- Verify game state is written to DB correctly

### Port Rendering Broken

**Issue:** Ports not appearing on board

**Solution:**
- Check import path in Board.tsx is correct
- Verify `generatePorts` function exported correctly
- Ensure function signature unchanged

---

## Notes

- All changes should be **non-breaking** - existing functionality must be preserved
- Focus on **architecture conformance**, not feature additions
- Test thoroughly after each task before moving to next
- If blocked, document issue and proceed to next independent task
- Keep commits atomic - one task per commit preferred

**Remember:** This is a "throwaway game" context, so auth/tests remain medium priority. Focus is on maintainability and clean architecture for future development.
