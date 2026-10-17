# Settlers of Lanc

A room-based implementation of Settlers of Catan and Cities & Knights, with a
shared 3D board, ephemeral player identities, chat, and configurable turn timers.

## Current development state

**Reviewed:** 2026-10-17. **Committed baseline:** `9163bc3`.

- **Implemented and committed:** base game and Cities & Knights mechanics;
  3D lobby and game board; 3D dice and confirmed production feedback; rich player
  cards and details; responsive panels; chat; timers; and the compact Chronicle.
- **Presentation rollout complete:** 3D is primary. The appearance switch is
  hidden. The old renderer is retained only for graphics-failure fallback and
  possible reuse; reloading retries 3D.
- **Cloudflare release:** [Play the game](https://settlers.manheim.workers.dev).
  Hosting and durable-room migration are
  tracked in [codebase plan §5.16](docs/codebase-improvement-plan.md#516-cloudflare-hosting-and-durable-rooms-2026-10-17).
  deployed and recorded in the release history.
- **Open production work:** typed action results and Alchemist integer validation,
  tracked in [codebase plan §§5.14–5.15](docs/codebase-improvement-plan.md).
- **Next presentation work:** action dock and next-action guidance, contextual
  board inspection, then expanded Chronicle/event feedback. See the
  [ordered graphics backlog](docs/graphics-overhaul-plan.md#412-next-presentation-work).

The last validation of the committed game/presentation baseline passed **616
tests across 115 files**, lint, standalone TypeScript, production build, and
browser checks. This is historical evidence for that baseline, not a test result
for subsequent migration edits or a claim that every multiplayer release check
has been completed.

## Where work is tracked

| Document | Purpose |
|---|---|
| [Codebase improvement plan](docs/codebase-improvement-plan.md) | Active infrastructure migration, correctness defects, and production error-handling work. |
| [Graphics and presentation plan](docs/graphics-overhaul-plan.md) | Completed presentation state, ordered UX backlog, release QA, and deferred cleanup. |
| [System architecture](docs/system-architecture.md) | Current baseline boundaries, main code paths, and what the hosting migration will change. |
| [AGENTS.md](AGENTS.md) | Contributor rules, architectural constraints, and tracking conventions. |
| [Game design](docs/cities_and_knights_gdd.md) | Gameplay reference. |
| [Chat specification](docs/planning/chat-feature-spec.md) and [timer specification](docs/planning/turn-timer-spec.md) | Specifications for implemented features; transport changes belong in the migration plan. |

Keep actionable work in the two active plans. This README is the navigation and
status overview, not a second task tracker. Completed proposals and historical
validation records live under `docs/archive/`; their old unchecked boxes do not
make them current work.

## Development

The app uses Next.js-compatible App Router APIs through vinext, React 19,
strict TypeScript, Tailwind CSS v4 and React Three Fiber / Three.js. Cloudflare
Workers hosts the app and assets. Each room has a SQLite-backed Durable Object
for lobby, players, game and chat; there is no D1 or Supabase dependency.
Players join by room code; there are no persistent user accounts.

Install with `npm ci` (Node 24 is also installed as a project-local runtime).
No database credentials are needed for local development:

```sh
npm run dev          # Workers runtime + hot reload, http://localhost:3000
npm run lint
npm run typecheck
npm run test:run
npm run build
npm start            # preview the production build on port 3000
npm run deploy       # build and publish using the existing Cloudflare login
```

Additional test commands are `npm test`, `npm run test:ui`, and
`npm run test:coverage`. Coverage thresholds are defined in `vitest.config.ts`.

Development and production preview use the same Worker and Durable Object code.
Local SQLite persists in `.wrangler/state`; keep that directory to resume local
games after restarting the server. It is separate from Cloudflare production
data. Rooms do not expire automatically. To resume later, use the home page's
Resume Game form and select your player, or bookmark your player-specific URL.
Timers retain their existing between-turn pause; disconnecting mid-turn does
not pause the clock. `cloudflare.config.ts` is the deployment source of truth.
Vite generates `dist/server/wrangler.json`; do not edit that generated file.
Deployments currently use the explicit command above, not automatic Git pushes.
Existing Vercel/Supabase games were not copied or deleted by this release.
