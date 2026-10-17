# Settlers of Lanc — System Architecture

**Reviewed:** 2026-10-17. **Scope:** committed baseline `9163bc3`.
The active Cloudflare migration is described in
[codebase plan §5.16](codebase-improvement-plan.md#516-cloudflare-hosting-and-durable-rooms-2026-10-17);
it is now deployed and recorded in the release history. The baseline account
below remains historical; the current runtime override is described here.

## Current Cloudflare runtime (2026-10-17)

`workers/app.ts` serves vinext App Router requests and routes room notification
WebSockets to `GameRoom`. `app/actions.ts` calls the typed room client, which uses
the `ROOMS` binding. Each room's SQLite-backed Durable Object executes the
existing service layer within `RoomExecution`, serializing the complete
read/validate/write operation. Repositories access its isolated transaction
snapshot through async-local context. A successful mutation persists the whole
snapshot before notification; a failed operation does not commit partial state.

The stored snapshot contains room metadata, player identities, game JSON, chat
and a revision. No D1, Supabase, PostgreSQL, KV or R2 service is used. Hibernating
WebSockets carry change notifications; clients fetch authoritative API snapshots
and reconnect with catch-up. A shared per-tab connection serves game/lobby/chat,
with disconnected polling fallback and serialized refreshes.

`npm run dev` and `npm start` run workerd with persistent local SQLite under
`.wrangler/state`; production uses Cloudflare-managed storage with the same
code. There is no automatic room expiry. Between-turn timer pauses are retained;
disconnecting during a turn does not pause it. Production is
<https://settlers.manheim.workers.dev>. Legacy SQL/Supabase code has been removed.

## Historical committed baseline

## Application and runtime

- Next.js 16 App Router and React 19, with strict TypeScript.
- Tailwind CSS v4 and shadcn/ui for HTML UI; Three.js / React Three Fiber for
  the primary board, with original GLB assets under `public/models/tabletop/`.
- Ephemeral room/player identities and room-code entry; no persistent user
  accounts or Clerk authentication.
- Client hooks and optimistic state manage interactions. Supabase Realtime is
  used where configured, with polling fallback in the subscription flows.
  TanStack Query is not a baseline dependency.
- PostgreSQL through Drizzle stores rooms, players, lobby/game state, and chat.
  Exact runtime versions and scripts are owned by `package.json`; in-progress
  migration edits may differ from this committed baseline.

## Boundaries to preserve

```text
app/actions.ts                  thin server-action wrappers
    -> lib/services/            orchestration and operation boundaries
        -> core/                game managers, engine, rules, validators
        -> lib/repositories/    persistence access
            -> lib/db/          current PostgreSQL/Drizzle implementation
```

Actions pass parameters and return results. Services coordinate validation,
state changes, side effects, and persistence. Validators/rules are pure;
domain managers may mutate game state but must not perform persistence I/O.
Repositories provide data access rather than game rules.

This is the required dependency structure, not a claim that every legacy path
already conforms. Existing direct database reads in room/game routes and the
room page are explicit cleanup targets in §5.16. The full-state JSON write path
also needs operation-level serialization/version protection in the migration;
serializing only writes is insufficient.

## Main code paths

| Concern | Entry points / owners |
|---|---|
| Create/join/resume rooms | `app/page.tsx`, `app/room/[id]/page.tsx`, `app/actions.ts`, `lib/services/lobby-service.ts` |
| Lobby preview/settings | `components/lobby-view.tsx`, `components/lobby/`, `lib/hooks/useLobbySubscription.ts` |
| Game composition | `components/game/GameController.tsx`, `lib/hooks/useGameControllerModel.ts` |
| Board interactions | `components/board/Board.tsx`, `lib/hooks/useBoardValidation.ts`, `lib/hooks/useBoardActions.ts` |
| Board presentation | `components/board/BoardPresentation.tsx`, `components/board/three/`, `lib/hooks/useBoardPresentation.ts` |
| HUD, players, actions | `components/game/ui/GameLayoutPanels.tsx`, `GameTray.tsx`, `components/game/player/` |
| Game/chat sync | `lib/hooks/useGameSubscription.ts`, `useChatSubscription.ts`, related API routes and repositories |
| Domain state | `lib/types/game.ts`, `lib/types/player.ts`, `lib/types/board.ts` |

The existing `/board/flat` route name is retained; it does not imply the active
renderer is flat. 3D is the default. The retained SVG renderer is a graphics-failure
fallback. Both share one interaction owner, canonical board IDs, validation,
pending selections, and action callbacks; renderer code must not submit game
mutations itself. See the [presentation policy](graphics-overhaul-plan.md#415-current-presentation-policy).

Dice/production animation consumes confirmed outcomes and exact production-event
metadata. It must not infer private card contents, invent dice results, replay
stale events, or block authoritative updates and mandatory choices.

## Active changes and known gaps

- **Cloudflare migration (§5.16):** runtime compatibility, one durable room owner,
  serialized service operations, persisted-before-broadcast updates, replacement
  transport, and restart/reconnect/concurrency verification. Preserve existing
  production until the replacement passes its release checks.
- **Typed action results (§5.14):** expected game-rule failures still need a
  consistent serializable result contract rather than relying on production
  server-action exception messages. The old action-count audit must be reconciled
  with later additions during implementation.
- **Alchemist validation (§5.15):** integer validation remains an open correctness
  item, separate from graphics work.

These work items and acceptance criteria live in the
[codebase improvement plan](codebase-improvement-plan.md). Future action-dock,
inspection, and event-feedback work lives in the
[graphics plan](graphics-overhaul-plan.md#412-next-presentation-work).

## Supporting references

- [Repository rules](../AGENTS.md) — mandatory contributor and architectural constraints.
- [Chat specification](planning/chat-feature-spec.md) and [turn timer specification](planning/turn-timer-spec.md) — implemented feature contracts.
- [Superseded 2025 architecture snapshot](archive/system-architecture-2025-11-29.md) — historical context only; its old stack/auth descriptions are not current setup guidance.
