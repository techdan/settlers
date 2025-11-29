# Settlers of Lanc – System Architecture

**Document Version:** 2.0  
**Last Updated:** 2025-11-29  
**Status:** Current architecture (App Router, Cities & Knights)

---

## Executive Summary

Settlers of Lanc is a Next.js 15 (App Router) + React 19 application with strict TypeScript. The architecture follows a five-layer stack with thin Server Actions delegating to services, pure core logic, repository-backed persistence via Drizzle ORM, and PostgreSQL storage. Real-time state sync uses Supabase Realtime on the `games` table; the lobby still uses lightweight ETag polling. Styling is Tailwind CSS v4 with shadcn/ui (New York style). Authentication is Clerk-first (see `AGENTS.md`), and state management uses TanStack Query for data fetching with Zustand limited to theme toggling.

### Current Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict)
- **Styling/UI:** Tailwind CSS v4, shadcn/ui (New York), Lucide icons
- **State/Data:** TanStack Query (data), Zustand (theme only), Optimistic state hooks (incl. shared progress-prompt manager)
- **Auth:** Clerk (provider + route protection; `clerkUserId` persisted)
- **Backend Runtime:** Next.js Server Actions + API routes
- **Persistence:** PostgreSQL via Drizzle ORM
- **Realtime:** Supabase Realtime channel on `games` table
- **Build/Tooling:** ESLint (Next config), Turbopack dev, Tailwind PostCSS v4

---

## Layered Architecture (enforced)

```
app/actions.ts          // Thin wrappers only (no business logic)
        ↓
lib/services/           // Orchestration & transactions
        ↓
core/                   // Pure domain logic (engine, rules, validation, utils)
        ↓
lib/repositories/       // Database access only
        ↓
lib/db/                 // Drizzle schema + client
```

### Actions Layer (app/actions.ts)
- 2–3 line Server Actions that **only delegate** to services and return results.
- Example: `buildRoad`, `buildSettlement`, `playDevCard`, knight/city-wall actions, lobby board generators.

### Service Layer (lib/services/)
- Orchestrates validations, rules, and persistence. Key services:
  - `game-service` (start/turn flow, dice, victory checks, aqueduct claims)
  - `building-service` (roads/settlements/cities; incremental longest road)
  - `trading-service` (bank + player trades)
  - `robber-service` (move robber, discard)
  - `devcard-service` (dev card play, bonus roads)
  - `knight-service`, `city-walls-service` (C&K mechanics)
  - `lobby-service` (board preview/fair mode controls)
- Uses pure core functions; no direct DB queries outside repositories.

### Core Layer (core/)
- **Engine:** board generation, resource/commodity distribution, knights, scoring (longest road incremental), progress cards.
- **Rules:** building costs, constants, victory conditions.
- **Validation:** setup/main-phase validators.
- **Utils:** city wall/upgrade helpers, dice/event handling.
- Pure, side-effect free, no I/O.

### Repository Layer (lib/repositories/)
- `game-repository`, `player-repository`, `room-repository`.
- Responsibilities: fetch/parse game state, update/insert game rows, CRUD rooms/players.
- No business logic; all state stored as JSON in `games.state`.

### Database Layer (lib/db/)
- Drizzle schema (`rooms`, `players`, `games`), PostgreSQL connection.
- `games.state` is a JSON blob; `clerkUserId` column exists on players for auth alignment.

---

## Data Flow (example: build road)

1) **UI**: `Board` click → `GameController` uses optimistic state + mutations.  
2) **Action**: `buildRoad(roomId, playerId, edgeId)` in `app/actions.ts`.  
3) **Service**: `building-service.buildRoad`  
   - Validates turn/phase and placement (core validators)  
   - Affordability (core rules), piece counts  
   - Mutates game state; **updateLongestRoadIncremental(gameState, playerId)**  
   - `updateAllVictoryPoints`, `checkAndUpdateVictory`  
   - Persists via `updateGameState` (repository)  
4) **DB**: `games` row updated (`state` JSON, `updatedAt`).  
5) **Realtime**: Supabase `postgres_changes` on `games` (`room_id` filter) broadcasts update.  
6) **Client**: `useGameSubscription` receives payload, parses `state`, updates view (no polling).  
7) **Fallback/initial**: Initial GET `/api/game/[roomId]` fetch before subscription ready.

---

## Network Communication

- **Game state:** Supabase Realtime (WebSocket) subscribed to `games` table updates; initial fetch via `/api/game/[roomId]`.  
- **Lobby:** ETag-aware polling (`components/lobby-view.tsx`) against `/api/room/[id]` for players/metadata; interval-based with 304 short-circuit.  
- **API surface (read):**
  - `GET /api/game/[roomId]`
  - `GET /api/room/[id]`
  - C&K supporting GET routes (barbarian track, improvements, knight state, metropolis, progress-card listings/discards, road-building helpers).  
- **Mutations:** Server Actions only (no REST POST/PUT), invoked from client components.

---

## Performance Notes (current state)

- **Longest road:** Incremental recalculation for the affected player only (`updateLongestRoadIncremental`); previous “recalc all players on every build” bottleneck is resolved.  
- **Victory points:** `updateAllVictoryPoints` still recalculates for all players; could be event-scoped in future.  
- **State payload:** Full game state serialized/deserialized per mutation; stored as JSON blob. Optimization options remain (partial updates, normalization, MessagePack).  
- **Realtime vs polling:** Game views avoid 2s polling; bandwidth/cpu reduced. Lobby still polls but uses ETags to cut payloads when unchanged.  
- **Optimistic UX:** Optimistic game-state provider reduces perceived latency for the acting player. Shared progress prompt system (`ProgressPromptProvider` + `useProgressPrompt`) powers instant board-selection flows (e.g., Road Building) with begin/hide/clear API; `Board` consumes generic prompt flags to enter selection mode immediately while guarding placements until server-confirmed. Canceling a progress card should not log; only successful completion logs play.

---

## UI/Styling & State

- **Styling:** Tailwind CSS v4 with custom theme tokens; shadcn/ui (New York) components; Lucide icons.  
- **Pointer affordance:** Clickable controls/components use pointer cursor per design guideline.  
- **State management:** TanStack Query for data fetching patterns; Zustand limited to theme toggling (`lib/theme-store.ts`); custom optimistic state and selection decorators for progress cards; shared progress prompt hook/context for board-selection card flows.

---

## Authentication & Security

- **Auth provider:** Clerk (public/secret keys required); user identity persisted as `clerkUserId` on players; routes guarded via middleware/layout.  
- **Multi-tenancy:** Room/game/player queries scoped by `roomId` and `clerkUserId` to prevent cross-user access (service-level responsibility).  
- **Rate limiting:** Not yet implemented for Server Actions/API routes.  
- **Input validation:** Server-side validation performed in services/core validators; client is untrusted.

---

## Known Issues / Gaps

- **Type hygiene:** ResourceType vs TileType split planned (desert should not be a resource).  
- **VP recalculation:** Still global; could be event-driven for performance.  
- **Schema:** Single JSON blob limits partial updates and indexing; normalization is a future improvement.  
- **Monitoring:** No production observability (logging/metrics) wired yet.  
- **Rate limits/security:** Need rate limiting and broader auth enforcement across all actions.

---

## Document Maintenance

- Update after major architectural or network changes (new transports, schema normalization, auth shifts).  
- Keep API route listings aligned with `app/api/**`.  
- Reflect performance-sensitive code paths (scoring, victory, resource distribution) when optimized.  
- Review quarterly or alongside major feature releases (e.g., new progress cards, auth changes).



