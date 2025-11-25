# Settlers of Lanc - System Architecture Document

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Status:** Current Production Architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Layers](#architecture-layers)
4. [Data Flow](#data-flow)
5. [Network Communication](#network-communication)
6. [Performance Analysis](#performance-analysis)
7. [Optimization Opportunities](#optimization-opportunities)
8. [Deprecated Code](#deprecated-code)
9. [Technical Debt](#technical-debt)
10. [Recommendations](#recommendations)

---

## Executive Summary

Settlers of Lanc is a full-stack web implementation of Settlers of Catan built with **Next.js 16**, **React 19**, **TypeScript**, and **PostgreSQL**. The system employs a **3-tier layered architecture** with clear separation between repositories, services, and controllers. Game state synchronization uses **HTTP polling every 2 seconds** rather than WebSockets, prioritizing simplicity over real-time performance.

### Key Metrics
- **Tech Stack:** Next.js (App Router), React 19, Drizzle ORM, PostgreSQL, Zustand
- **Architecture Pattern:** Layered (Repository → Service → Controller)
- **Communication:** HTTP polling (2s interval)
- **State Size:** ~50-100KB JSON per game state
- **Polling Overhead:** ~30 requests/minute per client
- **Database:** Single PostgreSQL instance with Drizzle ORM

### Critical Findings
- ✅ **Strengths:** Clean architecture, type-safe, comprehensive validation
- ⚠️ **Performance Issues:** Aggressive polling, repeated calculations, no caching
- ⚠️ **Technical Debt:** Deprecated imports in 16+ files, no optimistic updates
- 🔴 **Major Bottleneck:** Longest road calculation runs DFS on every building action

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (UI Layer)                           │ │
│  │  - Board, GameController, ActionControls, etc.         │ │
│  │  - Zustand Store (theme only)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                             ▲                     │
│           │ Server Actions              │ HTTP Polling        │
│           │ (mutations)                 │ (every 2s)          │
└───────────┼─────────────────────────────┼─────────────────────┘
            │                             │
            ▼                             │
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server (Node.js)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (HTTP GET endpoints)                       │ │
│  │  - /api/game/[roomId]    → Get game state             │ │
│  │  - /api/room/[id]        → Get room + players          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Server Actions (app/actions.ts)                       │ │
│  │  - buildRoad, rollDice, endTurn, tradeWithBank, etc.  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer (lib/services/)                         │ │
│  │  - game-service, building-service, trading-service     │ │
│  │  - devcard-service, robber-service                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Core Game Logic (core/)                               │ │
│  │  - Validators, Rules, Algorithms (longest road, etc.)  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Repository Layer (lib/repositories/)                  │ │
│  │  - game-repository, player-repository, room-repository │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL DB   │
                    │  - rooms          │
                    │  - players        │
                    │  - games (JSON)   │
                    └──────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19.2, Next.js 16 | UI components, routing |
| State Management | Zustand | Theme preference only |
| Styling | TailwindCSS | Component styling |
| UI Components | Radix UI, Lucide React | Accessible components, icons |
| Board Rendering | Custom hex grid system | Hexagonal coordinate system |
| Pan/Zoom | react-zoom-pan-pinch | Board interaction |
| Backend | Next.js Server Actions | API layer |
| ORM | Drizzle | Database queries |
| Database | PostgreSQL | Persistent storage |
| Language | TypeScript | Type safety |

---

## Architecture Layers

### 1. Database Layer

**Location:** `lib/db/schema.ts`

```typescript
// Schema Definition
rooms: { id, status, createdAt }
players: { id, roomId, name, color, isHost, clerkUserId, joinedAt }
games: { id, roomId, state (JSON string), createdAt, updatedAt }
```

**Key Characteristics:**
- Game state stored as **single JSON blob** (~50-100KB)
- No normalization of game data (vertices, edges, etc.)
- Simple table structure for rapid development
- Drizzle ORM with prepared statements disabled

**Performance Notes:**
- ⚠️ Every game state fetch parses entire JSON
- ⚠️ No database-level indexes on frequently queried fields
- ⚠️ JSON serialization/deserialization overhead on every request

### 2. Repository Layer

**Location:** `lib/repositories/`

Three repositories handle data access:

#### game-repository.ts
- `findGameByRoomId(roomId)` - Get game record
- `getGameStateByRoomId(roomId)` - Parse JSON state
- `updateGameState(gameState)` - Serialize to JSON
- `createGame(roomId, gameState)` - Initialize game
- `deleteGame(gameId)` - Remove game

#### player-repository.ts
- `findPlayersByRoomId(roomId)` - Get all players in room
- `createPlayer(id, roomId, name, isHost)` - Add player
- `deletePlayer(playerId)` - Remove player
- `countPlayersInRoom(roomId)` - Player count

#### room-repository.ts
- `findRoomById(roomId)` - Get room
- `createRoom(roomId)` - Create new room
- `updateRoomStatus(roomId, status)` - Update status

**Pattern:** Simple query wrappers, no caching, no connection pooling optimizations

### 3. Service Layer

**Location:** `lib/services/`

Six services orchestrate business logic:

#### game-service.ts (290 lines)
**Core turn management**
- `startGame(roomId)` - Initialize game, shuffle players, generate board
- `rollDice(roomId, playerId)` - Roll + distribute resources OR handle robber
- `endTurn(roomId, playerId)` - Victory check + advance turn
- `checkAndUpdateVictory(gameState)` - Win condition check

#### building-service.ts (410 lines)
**Construction operations**
- `buildRoad(roomId, playerId, edgeId)` - Build road with validation
- `buildSettlement(roomId, playerId, vertexId)` - Build settlement
- `buildCity(roomId, playerId, vertexId)` - Upgrade to city
- `placeInitialSettlement/Road(...)` - Setup phase placement

**Critical Pattern:** Every building action triggers:
```typescript
updateLongestRoad(gameState);      // DFS for ALL players
updateAllVictoryPoints(gameState); // Recalc ALL player VP
checkAndUpdateVictory(gameState);  // Check win condition
```

#### trading-service.ts
**Resource trading**
- `tradeWithBank(...)` - 4:1, 3:1, or 2:1 based on ports
- `offerTrade(...)` - Create player-to-player trade
- `acceptTrade(...)` - Accept active offer
- `cancelTrade(...)` - Cancel offer

#### devcard-service.ts
**Development cards**
- `buyDevCard(...)` - Draw from deck
- `playDevCard(...)` - Play card with effects (knight, monopoly, etc.)
- `placeBonusRoad(...)` - Road Building card placement

#### robber-service.ts
**Robber mechanics**
- `moveRobber(...)` - Move robber, steal resource
- `discardCards(...)` - Mandatory discard on 7 roll

### 4. Core Logic Layer

**Location:** `core/`

#### Validators (`core/validation/`)
- `building-validator.ts` - Placement rules for roads, settlements, cities
- `setup-validator.ts` - Setup phase specific rules

#### Rules (`core/rules/`)
- `building-costs.ts` - Cost definitions and affordability checks
- `victory-conditions.ts` - VP calculation and win condition
- `constants.ts` - Game parameters (10 VP to win, starting pieces, etc.)

#### Algorithms (`core/engine/`)
- `board-generator.ts` - Fixed Catan board layout
- `port-generator.ts` - Harbor placement
- `longest-road.ts` - **DFS graph algorithm** (performance bottleneck)
- `largest-army.ts` - Knight count tracking
- `resource-manager.ts` - Distribution logic
- `dev-card-manager.ts` - Deck creation

### 5. API Layer

**Location:** `app/actions.ts` (Server Actions) + `app/api/`

#### HTTP Endpoints (GET only)
- `GET /api/game/[roomId]` - Returns full GameState JSON
- `GET /api/room/[id]` - Returns room + players array

#### Server Actions (mutations)
All mutations use Next.js Server Actions:
```typescript
// Building
buildRoad(roomId, playerId, edgeId)
buildSettlement(roomId, playerId, vertexId)
buildCity(roomId, playerId, vertexId)

// Game Flow
rollDice(roomId, playerId)
endTurn(roomId, playerId)
moveRobber(roomId, playerId, hexId, victimId?)

// Trading
tradeWithBank(roomId, playerId, give, get)
offerTrade/acceptTrade/cancelTrade(...)

// Dev Cards
buyDevCard(roomId, playerId)
playDevCard(roomId, playerId, cardType, options)
```

### 6. Frontend Layer

**Location:** `components/`, `app/`

#### Page Components
- `app/page.tsx` - Home (create/join room)
- `app/room/[id]/page.tsx` - Lobby
- `app/board/flat/page.tsx` - Game board

#### Game Components
- `GameController.tsx` - Main orchestrator, **polling logic here**
- `Board.tsx` - Hexagonal grid rendering, pan/zoom
- `GameStatus.tsx` - Player info, VP breakdown
- `ActionControls.tsx` - Roll, Trade, End Turn buttons
- `BuildControls.tsx` - Road, Settlement, City mode
- `PlayerHand.tsx` - Resource display
- `PlayerDevCards.tsx` - Dev card display/play
- `DiceDisplay.tsx` - Dice roll results
- `TradeModal.tsx` - Trading interface
- `DiscardModal.tsx` - Forced discard on 7

#### Rendering
- `VertexRenderer.tsx` - Settlements/cities (clickable)
- `EdgeRenderer.tsx` - Roads (clickable)
- `themes/flat/HexTile.tsx` - 2D hexagon rendering
- `themes/voxel/HexTile.tsx` - 3D isometric rendering

---

## Data Flow

### Example: Building a Road

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION                                               │
│    User clicks edge on board → Board.tsx detects click           │
│    buildMode === 'road' → Call server action                     │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. SERVER ACTION (app/actions.ts)                                 │
│    buildRoad(roomId, playerId, edgeId)                           │
│    → Calls buildingService.buildRoad()                           │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. SERVICE LAYER (lib/services/building-service.ts)              │
│    buildingService.buildRoad():                                  │
│    ├─ Get gameState from DB                                      │
│    ├─ Validate: is player's turn?                                │
│    ├─ Validate: valid placement? (building-validator)            │
│    ├─ Validate: has resources? (building-costs)                  │
│    ├─ Validate: roads remaining?                                 │
│    ├─ Deduct resources                                           │
│    ├─ Place road on edge                                         │
│    ├─ updateLongestRoad() ← DFS ALL PLAYERS                     │
│    ├─ updateAllVictoryPoints() ← RECALC ALL PLAYERS            │
│    ├─ checkAndUpdateVictory()                                   │
│    ├─ Add log entry                                              │
│    └─ Update DB with new gameState                               │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. DATABASE (PostgreSQL)                                          │
│    UPDATE games SET state = $1 WHERE roomId = $2                │
│    (Serializes entire GameState to JSON string)                  │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. CLIENT RESPONSE                                                │
│    Server Action returns → useTransition completes               │
│    Button state changes from "Building..." to "Build Road"       │
└──────────────────────────────────────────────────────────────────┘
                     │
                     ▼ (2 seconds later)
┌──────────────────────────────────────────────────────────────────┐
│ 6. POLLING UPDATE (GameController.tsx)                            │
│    setInterval fires:                                             │
│    ├─ fetch(`/api/game/${roomId}`)                               │
│    ├─ Receive new GameState with placed road                     │
│    ├─ setGameState(newState)                                     │
│    └─ Components re-render                                        │
│        ├─ Board shows new road                                    │
│        ├─ PlayerHand shows reduced resources                     │
│        └─ GameLog shows "Player X built a road"                  │
└──────────────────────────────────────────────────────────────────┘
```

### State Synchronization Flow

```
Client A                    Server                      Client B
   │                          │                           │
   │─buildRoad()─────────────>│                           │
   │ (Server Action)           │                           │
   │                           │                           │
   │<─────────────response─────│                           │
   │  (GameState returned)     │                           │
   │                           │                           │
   │  [Shows building...]      │                           │
   │                           │                           │
   ├─────── 2s poll ──────────>│                           │
   │<─────── new state ─────────│                           │
   │  [Shows placed road]      │                           │
   │                           │<───── 2s poll ────────────┤
   │                           │─────── new state ────────>│
   │                           │      [Shows placed road]  │
```

**Latency Breakdown:**
- Action execution: ~50-200ms (depends on calculations)
- Database write: ~10-50ms
- Polling interval: **up to 2000ms**
- Total perceived delay for other players: **0-2 seconds**

---

## Network Communication

### Polling Architecture

**Critical Code:** `components/game/GameController.tsx:30-46`

```typescript
useEffect(() => {
    const fetchState = async () => {
        const res = await fetch(`/api/game/${roomId}`);
        if (res.ok) {
            const data = await res.json();
            setGameState(data);
        }
    };

    fetchState(); // Initial fetch
    const interval = setInterval(fetchState, 2000); // Poll every 2s
    return () => clearInterval(interval);
}, [roomId]);
```

### Network Traffic Analysis

**Per Client, Per Minute:**
- Lobby polling: 30 requests × ~1KB = ~30KB/min
- Game polling: 30 requests × ~75KB = ~2.25MB/min
- Server actions: Variable (1-10 per minute)

**For 4-Player Game:**
- Total polling traffic: ~9MB/min
- Database reads: 120 queries/min (30 per client)
- Most queries return **identical data** (no caching)

### WebSocket Alternative (Not Implemented)

**Current:** HTTP polling every 2s
**Proposed:** WebSocket pub/sub

Benefits:
- Instant updates (0ms delay vs 0-2000ms)
- Reduced bandwidth (~99% reduction)
- Lower server load (1 broadcast vs N queries)

Trade-offs:
- More complex infrastructure
- Connection management overhead
- WebSocket library dependency

---

## Performance Analysis

### Bottleneck #1: Longest Road Calculation

**File:** `core/engine/scoring/longest-road.ts:16-72`

**Algorithm:** Depth-First Search (DFS) with backtracking

**Frequency:** Runs on EVERY building action:
- Build road → `updateLongestRoad()` for ALL players
- Build settlement → `updateLongestRoad()` for ALL players
- Place initial road → `updateLongestRoad()` for ALL players

**Complexity:**
- Time: O(N! × E) where N = edges per player, E = total edges
- Space: O(N) for recursion stack
- Typical: 4 players × 15 roads each = 60 edges
- Worst case: ~1-10ms per calculation

**Why It's Problematic:**
```typescript
// building-service.ts:74-78
updateLongestRoad(gameState);      // DFS for player 1
                                    // DFS for player 2
                                    // DFS for player 3
                                    // DFS for player 4
updateAllVictoryPoints(gameState);  // Recalc all VP
checkAndUpdateVictory(gameState);   // Check win
```

**Impact:** Every road placement triggers 4 DFS calculations, even though only 1 player's road changed.

**Optimization Opportunity:**
- **Incremental calculation**: Only recalc for affected player
- **Caching**: Store road graph, update incrementally
- **Lazy evaluation**: Only calculate when VP display requested

### Bottleneck #2: Victory Point Recalculation

**File:** `core/rules/victory-conditions.ts:94-98`

**Frequency:** Runs on EVERY:
- Building action
- Dev card play
- Trade completion
- Turn end

**Current Implementation:**
```typescript
export function updateAllVictoryPoints(gameState: GameState): void {
    for (const player of gameState.players) {
        player.victoryPoints = calculateTotalVictoryPoints(gameState, player.id);
    }
}
```

**Issue:** Recalculates from scratch even when VP can't change:
- Trading resources → VP unchanged, still recalculated
- Accepting trade offer → VP unchanged, still recalculated

**Optimization:**
- **Event-driven updates**: Only recalc when VP-affecting event occurs
- **Dirty flag pattern**: Mark players whose VP changed
- **Incremental updates**: Store VP breakdown, update only changed parts

### Bottleneck #3: Full State Serialization

**File:** `lib/repositories/game-repository.ts:36-43`

**Problem:** Entire GameState serialized/deserialized on every request:

```typescript
export async function updateGameState(gameState: GameState): Promise<void> {
    const stateString = JSON.stringify(gameState); // ~50-100KB
    await db.update(games)
        .set({
            state: stateString,  // Full serialization
            updatedAt: new Date()
        })
        .where(eq(games.roomId, gameState.roomId));
}
```

**Cost:**
- JSON.stringify: ~5-10ms
- JSON.parse: ~5-10ms
- Database transfer: ~50-100KB per request

**Alternative Architectures:**
1. **Normalized schema**: Separate tables for players, vertices, edges
2. **Partial updates**: Send only changed fields
3. **Binary serialization**: MessagePack or Protocol Buffers

### Bottleneck #4: No Caching

**Current State:**
- Every client polls every 2s
- Every poll hits database
- No HTTP cache headers
- No in-memory cache
- No CDN caching

**Opportunities:**
1. **Client-side cache**: Only fetch if game state version changed
2. **Server-side cache**: Redis/in-memory for active games
3. **ETags**: HTTP cache validation
4. **Optimistic updates**: Apply changes immediately, reconcile later

---

## Optimization Opportunities

### Priority 1: High Impact, Low Effort

#### 1. Implement Optimistic UI Updates

**Current Flow:**
```
User clicks → Server action → Wait for response → Poll (2s) → Update UI
Total delay: 2-3 seconds
```

**Optimized Flow:**
```
User clicks → Update UI immediately → Server action → Reconcile if error
Total delay: 0ms (instant feedback)
```

**Implementation:**
```typescript
// GameController.tsx
const [gameState, setGameState] = useState<GameState | null>(null);
const [optimisticState, setOptimisticState] = useState<GameState | null>(null);

const handleBuildRoad = async (edgeId: string) => {
    // Optimistic update
    const newState = { ...gameState };
    newState.board.edges[edgeId].owner = playerId;
    setOptimisticState(newState);

    try {
        const result = await buildRoad(roomId, playerId, edgeId);
        setGameState(result); // Real state
        setOptimisticState(null);
    } catch (error) {
        setOptimisticState(null); // Rollback
        showError(error);
    }
};
```

**Benefits:**
- Instant feedback for current player
- Eliminates 2s perceived latency
- Better UX for turn-based actions

**Complexity:** Medium (1-2 days)

#### 2. Add ETag-Based Caching

**Current:** Every poll fetches full state, even if unchanged

**Optimized:**
```typescript
// app/api/game/[roomId]/route.ts
export async function GET(request: Request) {
    const gameState = await getGameStateByRoomId(roomId);
    const etag = generateETag(gameState); // Hash of state

    const clientEtag = request.headers.get('If-None-Match');
    if (clientEtag === etag) {
        return new Response(null, { status: 304 }); // Not Modified
    }

    return Response.json(gameState, {
        headers: { 'ETag': etag }
    });
}
```

**Benefits:**
- 99% reduction in bandwidth when state unchanged
- Faster polling responses
- Lower database load

**Complexity:** Low (4-6 hours)

#### 3. Incremental Longest Road Calculation

**Current:** Recalculate all players on every action

**Optimized:**
```typescript
export async function buildRoad(roomId, playerId, edgeId) {
    // ... place road ...

    // Only recalculate for affected player
    const oldLength = gameState.longestRoadLength;
    const newLength = calculateLongestRoad(gameState, playerId);

    // Only update global longest road if player's road changed
    if (newLength > oldLength) {
        updateLongestRoad(gameState); // Full recalc only if potential change
    }

    // Only recalc VP for affected player
    const player = gameState.players.find(p => p.id === playerId);
    player.victoryPoints = calculateTotalVictoryPoints(gameState, playerId);
}
```

**Benefits:**
- 75% reduction in calculation time
- Lower server CPU usage
- Faster action responses

**Complexity:** Medium (1 day)

### Priority 2: Medium Impact, Medium Effort

#### 4. Implement Server-Sent Events (SSE)

**Alternative to WebSockets, simpler to implement:**

```typescript
// app/api/game/[roomId]/stream/route.ts
export async function GET(request: Request) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const interval = setInterval(async () => {
                const gameState = await getGameStateByRoomId(roomId);
                const data = `data: ${JSON.stringify(gameState)}\n\n`;
                controller.enqueue(encoder.encode(data));
            }, 2000);

            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
```

**Benefits:**
- Server-push model (more efficient than polling)
- Native browser support
- Simpler than WebSockets

**Complexity:** Medium (2-3 days)

#### 5. Add Redis Caching Layer

**Cache active game states in memory:**

```typescript
// lib/cache/redis.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({ /* config */ });

export async function getCachedGameState(roomId: string) {
    const cached = await redis.get(`game:${roomId}`);
    if (cached) return JSON.parse(cached);

    const gameState = await getGameStateByRoomId(roomId);
    await redis.set(`game:${roomId}`, JSON.stringify(gameState), {
        ex: 60 // Expire after 60s
    });
    return gameState;
}

export async function invalidateGameCache(roomId: string) {
    await redis.del(`game:${roomId}`);
}
```

**Benefits:**
- 10-100x faster reads for active games
- Reduced database load
- Lower latency

**Complexity:** Medium (2 days + infrastructure)

#### 6. Normalize Database Schema

**Current:** Single JSON blob

**Proposed:**
```sql
CREATE TABLE game_states (
    id UUID PRIMARY KEY,
    room_id TEXT NOT NULL,
    current_turn UUID,
    phase TEXT,
    winner UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE player_states (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES game_states(id),
    player_id UUID,
    resources JSONB,
    dev_cards JSONB,
    victory_points INTEGER,
    -- ... other fields
);

CREATE TABLE board_vertices (
    id TEXT PRIMARY KEY,
    game_id UUID REFERENCES game_states(id),
    owner UUID,
    structure TEXT
);

CREATE TABLE board_edges (
    id TEXT PRIMARY KEY,
    game_id UUID REFERENCES game_states(id),
    owner UUID,
    structure TEXT
);
```

**Benefits:**
- Partial updates (only changed rows)
- Better query performance
- Database-level validation
- Easier analytics

**Trade-offs:**
- Migration effort
- More complex queries
- Multiple table joins

**Complexity:** High (1-2 weeks)

### Priority 3: Low Impact or High Effort

#### 7. Implement WebSocket Real-Time Sync

**Full WebSocket implementation with Socket.io or Pusher**

**Benefits:**
- True real-time updates (<100ms)
- Bidirectional communication
- Presence detection (online/offline)

**Complexity:** High (1-2 weeks)

#### 8. Client-Side Game State Prediction

**Predict opponent actions for smoother UX:**

```typescript
// Speculative execution of opponent moves
const predictOpponentMove = (gameState, action) => {
    // Validate + simulate action
    // Show "pending" state in UI
    // Reconcile when real update arrives
};
```

**Complexity:** High (2-3 weeks)

---

## Deprecated Code

### Files Marked as Deprecated

#### 1. `lib/game-logic.ts`
**Status:** Deprecated (re-export only)
**New Location:** `core/validation/` and `core/engine/scoring/`

```typescript
/**
 * @deprecated This file is being refactored.
 * Import validators from '@/core/validation' instead.
 * Import algorithms from '@/core/engine/scoring' instead.
 */
```

**Still Imported By (16 files):**
- `components/board/Board.tsx`
- `components/game/GameController.tsx`
- `components/game/GameStatus.tsx`
- `components/game/PlayerHand.tsx`
- `components/game/PlayerDevCards.tsx`
- `components/game/BuildControls.tsx`
- `components/game/ActionControls.tsx`
- `components/game/DiceDisplay.tsx`
- `components/game/TradeModal.tsx`
- `components/game/DiscardModal.tsx`
- `components/game/TradeOfferDisplay.tsx`
- `components/game/GameLog.tsx`
- `components/board/EdgeRenderer.tsx`
- `components/board/VertexRenderer.tsx`
- `app/actions.ts`
- `docs/archive/migration-guide.md`

#### 2. `lib/game-types.ts`
**Status:** Deprecated (re-export only)
**New Location:** `lib/types/`

```typescript
/**
 * @deprecated This file is deprecated.
 * Import from '@/lib/types' instead.
 */
```

**Still Imported By:** Same 16 files as above

### Migration Plan

**Phase 1: Update Imports (2-4 hours)**
```bash
# Find and replace across codebase
from '@/lib/game-types' → from '@/lib/types'
from '@/lib/game-logic' → from '@/core/validation/building-validator'
                        → from '@/core/engine/scoring/longest-road'
```

**Phase 2: Remove Deprecated Files (1 hour)**
```bash
# After verifying all imports updated:
rm lib/game-logic.ts
rm lib/game-types.ts
```

**Phase 3: Update Documentation (1 hour)**
- Update migration guide
- Remove deprecation notices

**Total Effort:** ~4-6 hours

---

## Technical Debt

### Code Duplication

#### 1. Building Cost Validation
**Locations:**
- `core/rules/building-costs.ts` (authoritative)
- Client components may duplicate checks for UI feedback

**Recommendation:** Create shared validation hook:
```typescript
// hooks/useCanAfford.ts
export function useCanAfford(
    resources: Resources,
    cost: Resources
): boolean {
    return canAfford(resources, cost);
}
```

#### 2. Phase Display Logic
**Duplicated in:**
- `GameStatus.tsx` (phase name display)
- `ActionControls.tsx` (phase-specific button visibility)

**Recommendation:** Centralize phase UI logic:
```typescript
// lib/utils/phase-helpers.ts
export function getPhaseDisplay(phase: GamePhase): string {
    // Single source of truth for phase names
}

export function getAvailableActions(
    phase: GamePhase,
    isCurrentPlayer: boolean
): ActionType[] {
    // Determine available actions
}
```

### Missing Features

#### 1. Error Recovery
- No retry logic for failed requests
- No offline mode or connection status indicator
- No conflict resolution for race conditions

#### 2. Game Persistence
- Games stored indefinitely (no cleanup)
- No game history/replay
- No save/restore functionality

#### 3. Observability
- No logging infrastructure
- No performance monitoring
- No error tracking (Sentry, etc.)

#### 4. Testing
- No unit tests found
- No integration tests
- No E2E tests

### Security Considerations

#### 1. Player ID Validation
- Player IDs passed from client (potential spoofing)
- No session management or JWT validation
- Clerk user IDs stored but not consistently used

#### 2. Rate Limiting
- No rate limiting on Server Actions
- Potential for spam/abuse

#### 3. Input Validation
- Server-side validation exists ✅
- But no input sanitization for logs/messages

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Implement ETag Caching** (6 hours)
   - Reduce bandwidth by 99% for unchanged states
   - Quick win with minimal risk

2. **Fix Deprecated Imports** (4 hours)
   - Technical debt cleanup
   - Reduces confusion for new developers

3. **Add Optimistic Updates for Current Player** (1 day)
   - Dramatic UX improvement
   - Eliminates perceived 2s lag

### Short-Term (Next Sprint)

4. **Incremental Longest Road Calculation** (1 day)
   - Reduce server CPU by 75%
   - Faster action responses

5. **Add Error Recovery** (2 days)
   - Retry failed requests
   - Show connection status
   - Better error messages

6. **Add Basic Monitoring** (1 day)
   - Add Vercel Analytics or similar
   - Track action latencies
   - Monitor error rates

### Medium-Term (Next Month)

7. **Implement SSE or WebSockets** (1 week)
   - Real-time updates
   - Better scalability
   - Modern architecture

8. **Add Redis Caching** (3 days)
   - 10-100x faster reads
   - Essential for scaling

9. **Add Unit Tests** (1 week)
   - Test core game logic
   - Regression prevention
   - Confidence for refactoring

### Long-Term (Next Quarter)

10. **Normalize Database Schema** (2 weeks)
    - Better performance at scale
    - Partial updates
    - Proper indexing

11. **Add Comprehensive Testing** (2 weeks)
    - Integration tests
    - E2E tests with Playwright
    - Performance tests

12. **Security Hardening** (1 week)
    - Implement proper session management
    - Add rate limiting
    - Input sanitization
    - Security audit

### Performance Targets

| Metric | Current | Target (1 month) | Target (3 months) |
|--------|---------|------------------|-------------------|
| Action Response Time | 50-200ms | 30-100ms | 20-50ms |
| UI Update Latency | 0-2000ms | 0ms (optimistic) | 0ms (real-time) |
| Bandwidth per Client | 2.25MB/min | 50KB/min | 10KB/min |
| Database Queries/Min | 120 (4 clients) | 60 | 4 (events only) |
| Longest Road Calc Time | 5-10ms × 4 | 5-10ms × 1 | 1-2ms (cached) |

---

## Conclusion

The Settlers of Lanc codebase demonstrates **excellent architectural fundamentals** with clear layering, comprehensive validation, and type safety throughout. The main areas for improvement are **performance optimizations** around network communication and repeated calculations.

**Key Strengths:**
- Clean separation of concerns
- Type-safe throughout
- Comprehensive game rule validation
- Well-organized file structure

**Priority Improvements:**
1. Optimistic UI updates (instant feedback)
2. ETag caching (bandwidth reduction)
3. Incremental calculations (CPU reduction)
4. Real-time sync via SSE/WebSockets (better UX)

The recommended optimizations can be implemented incrementally without major architectural changes, providing immediate value while maintaining code quality.

---

**Document Maintenance:**
- Update this document quarterly or after major architectural changes
- Track implementation of recommendations in project management tools
- Review performance metrics monthly
