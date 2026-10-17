# Codebase Improvement Plan

**Status:** Typed-action production work remains; a separate validation defect is recorded in §5.15
**Active item:** §5.16 — Cloudflare hosting and durable room migration
**Completed-plan archive:** [`docs/archive/codebase-improvement-plan-v2.1.md`](archive/codebase-improvement-plan-v2.1.md)

## 5.14 Typed server-action results

### Related bug fix: tied barbarian defender rewards (2026-09-05)

- [x] Committed in `8b42012`: expose the saved defender reward queue through `components/game/progress/DefenderRewardModal.tsx`, `components/game/modals/GameEventModals.tsx`, and `app/actions.ts`; validate and consume claims in `lib/services/ck-game-service.ts`; keep `components/game/modals/WaitingOverlay.tsx` from covering the chooser. Queue new rewards in turn order in `core/engine/barbarian/barbarian-manager.ts`.
- Acceptance: the three pending rewards in room VZJP can be claimed by choosing a deck; each claim consumes one reward; invalid/repeated/out-of-order claims fail; empty decks retain the reward; the waiting overlay does not hide the action; VP cards reveal immediately.
- Include the new `claimDefenderProgressCard` action in this section's typed-result migration (the original 60-action audit predates this addition).

### Problem

Most exports in `app/actions.ts` return service data on success and throw on expected
business failures. Next.js redacts thrown server-action messages in production, so
players receive generic errors—or no visible explanation—for ordinary failures such
as an invalid placement, insufficient resources, a stale turn, or an unavailable
card action.

### Scope

The audited surface contains 60 actions:

- 41 game mutations
- 9 lobby mutations
- 4 debug mutations
- 1 timer mutation
- 1 already-typed chat mutation
- 3 redirect/form actions
- 1 read-only action

### Target contract

Introduce a shared serializable discriminated union:

```ts
export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
```

Expected validation and game-rule failures return `success: false`. Unexpected
transport, infrastructure, and programming failures remain exceptional and must
not expose internal details.

### Execution batches

Complete and validate the migration in these bounded batches:

1. Foundation and debug actions
2. Trade actions
3. Turn and timer actions
4. Development cards and mandatory choices
5. Progress cards
6. Board placement, pieces, management, robber, and barbarians
7. Lobby actions
8. Redirect/form actions

The redirect/form batch must preserve Next.js redirect sentinels rather than
converting them into failure results.

### Required behavior

- Sanitize every player-visible error message at the server-action boundary.
- Revalidate paths only after successful mutations.
- Update immediate-state consumers to read `result.data`.
- Treat `success: false` as a business failure and retain transport-failure handling.
- Roll back optimistic UI on both business and transport failures.
- Keep dialogs and composed input open when an action can be corrected and retried.
- Preserve the thin action-layer boundary: actions delegate to services and contain
  no business logic.

### Acceptance criteria

- All 60 actions are explicitly classified and migrated or intentionally exempted.
- No client relies on a thrown server-action `Error.message` for expected failures.
- Business-failure tests assert the returned typed result and sanitized message.
- Transport-failure tests remain separate and verify unexpected failures are not
  presented as trusted business messages.
- Redirect-based room creation, joining, and resume flows still navigate correctly.
- Success-only revalidation is covered.
- `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass.

## 5.15 Alchemist integer validation (discovered 2026-09-08)

- [ ] In `core/engine/progress/commands/AlchemistCommand.ts`, require both selected
  production dice to be integers from 1 through 6; the current range comparisons
  admit fractional values. This was discovered during the 3D dice audit and is
  separate from the presentation migration.
- Acceptance: unit tests in the adjacent `__tests__/AlchemistCommand.test.ts`
  reject fractions, NaN, infinities, and out-of-range values without consuming the
  card or changing the game; valid integer selections retain current behavior.

## 5.16 Cloudflare hosting and durable rooms (2026-10-17)

Completed implementation and release-validation items below landed in `816849a`
(`feat: migrate 3D game to Cloudflare durable rooms`), including 3D label/loading
fixes. The dependency-audit follow-up remains open.

User authorized migrating hosting and storage off Supabase to Cloudflare,
including the latest 3D presentation. Baseline: `9163bc3`, clean checkout.
User clarified: Durable Objects only, no D1; rooms must remain resumable the
following week. No automatic room expiry. Local dev must run the same Workers
code with persistent local SQLite, and restart recovery must be demonstrated.
Timer clarification: preserve existing between-turn pauses; do not add automatic
mid-turn pausing when clients disconnect.
Commit and push authorized on 2026-10-17. Preserve existing production until replacement
passes validation; do not delete Supabase data. Initial release may use fresh
rooms; preserving active games requires an explicit cutover decision.

- [x] Hosting compatibility: `package.json`, `vite.config.ts`, `cloudflare.config.ts`.
  Run vinext compatibility check; prove server actions, routes, and 3D assets
  in the Workers runtime before switching deployment commands.
- [x] Durable room persistence: `workers/`, `lib/repositories/`, `lib/services/`.
  One SQLite-backed Durable Object per room owns game, lobby, players and chat.
  Serialize complete service operations, persist before broadcasting, and test
  concurrent actions, failed operations, restart recovery and room isolation.
  Keep validators/rules pure and actions thin.
- [x] Replace Supabase sync: `lib/hooks/useGameSubscription.ts`,
  `useLobbySubscription.ts`, `useChatSubscription.ts`, and shared transport.
  Verify reconnect catch-up, serialized refresh ordering, cleanup and multiple tabs.
- [x] Remove runtime PostgreSQL/Supabase dependencies and direct database reads
  from `app/api/game/[roomId]/route.ts`, `app/api/room/[id]/route.ts`, and
  `app/room/[id]/page.tsx`. Route reads through the service/repository boundaries.
- [x] Release validation: lint, strict typecheck, existing suite, Workers runtime
  tests, production build, two-browser base/C&K gameplay, chat, timers and 3D.
  Deploy to the verified Cloudflare account, verify the public URL, and document
  actual results here. Do not claim free-tier suitability without measurements.

Discovery: game persistence replaces the full JSON state without a version guard.
The per-room execution boundary must cover read/validate/write, not only writes.
Some nominal lobby reads normalize and persist state, so they also require that
boundary. Existing SQL uses PostgreSQL timestamps and a `count(*)::int` cast.

Implementation evidence: 625 tests across
118 files passed, including concurrent room operations, rollback, context
isolation, reconnect/cleanup, and complete base/C&K setup followed by simulated
week-later recovery. Local real SQLite survived stopping production preview and
starting development, retaining room KZPG, both players, settlement and turn.
Two browser clients verified join, start, settlement and road notifications.
The runtime uses Node 24, vinext/Vite and workerd; local state is in
`.wrangler/state`. `cloudflare.config.ts` is the source configuration; Vite emits
`dist/server/wrangler.json` for deployment. No D1/KV/R2 bindings are configured.
No room expiry or disconnect timer pause was added. Legacy SQL utility scripts
and unused Supabase/Drizzle/Postgres modules and packages were removed.
New 3D models suspend individually so loading a piece does not hide the scene.
The retained Next compatibility package was updated to remove its critical
audit advisories; remaining dependency audit findings require separate review.

Deployed to `https://settlers.manheim.workers.dev`, version
`e33735c8-4207-4bdc-a7e5-fe4744570a3c`. Binding output confirmed only ROOMS
(GameRoom) and ASSETS. Live room CZJZ verified create/join from two clients,
C&K settings with timer enabled, start, settlement/road placement, shared chat,
and home-page Resume Game after redeploy. Saved players, phase, board and turn
survived that deploy. This is a multiplayer smoke test, not a complete game
playthrough. Base/C&K complete setup and week-later persistence are covered by
the service/repository integration test. Existing timer tests pass unchanged.
Final lint/typecheck/build passed; migration-focused tests passed again after
dependency updates. Replaced Drei Html roots with BoardLabel's deferred cleanup;
the updated live page shows all number/port labels and no new console errors
in the resume/chat checks. Screenshot: `.wrangler/cloudflare-release.png`
(local ignored QA artifact). Vercel/Supabase remain untouched; no old game data
was imported.

- [x] Follow-up dependency audit: `package.json`, `package-lock.json`.
  Reviewed the 17 npm audit findings (6 moderate, 11 high), applied compatible
  fixes and a tested mitigation for the unpatched upstream advisory below.
  Validated and deployed; implementation commit `24cb8a8`.
  The release uses vinext/workerd; Next is retained for API types/tooling.

### Dependency remediation (2026-10-17, deployed; commit `24cb8a8`)

- Compatible lockfile updates repair advisories in `@humanfs/node`, `ajv`,
  `brace-expansion`, `js-yaml`, and `minimatch`. A scoped override updates
  Satori's pinned `fflate` from 0.7.3 to patched 0.7.5.
- `braces` GHSA-vfj7-8cjw-p6xm has no published patched release as of this
  review. `scripts/patch-braces.mjs` applies bounded parser/AST recursion in
  postinstall, checks the exact version and expected source, and fails on drift.
  `lib/__tests__/dependency-security.test.ts` exercises deeply nested complete
  and incomplete patterns, direct AST inputs, and ordinary nested globs/ranges.
- Preserve the real `braces@3.0.3` version and npm's advisory reporting. The
  remaining nine high audit entries are this advisory and its dependent chains,
  not nine separate unmitigated defects. Do not claim a zero-finding npm audit.
- [ ] Replace the temporary patch and override when upstream publishes a fix;
  run a clean install, security tests, full regression checks and Workers build,
  then verify `npm audit` no longer reports the upstream advisory.

Clean `npm ci`, postinstall, typecheck, lint and the production build passed.
The full regression run passed 628 tests; five UI tests hit the default 5-second
timeout under host load. All 22 tests in those three files passed when rerun
serially with a 30-second timeout, covering all 633 tests across 119 files.
The eight new dependency-security tests passed in the full run.

Deployed Worker version `e69c6a39-bfb2-488d-93e1-dd46d395d617` to
`https://settlers.manheim.workers.dev`; bindings remain ROOMS and ASSETS only.
Reloaded both clients in saved room CZJZ after deployment: previous players,
placements and chat persisted. New guest settlement/road placements advanced
setup and synchronized to the host without reload; new chat reached both
clients. The 3D board and labels rendered, and both browser error logs were
empty. This is a live multiplayer smoke test, not a complete game playthrough.
Screenshot: `.wrangler/dependency-security-release.png` (ignored QA artifact).

Post-commit local check: all eight dependency-security tests passed with the
installed dependencies. `npm run dev` started on port 3003 (3000-3002 occupied),
returned HTTP 200 with the game homepage, and the local Explorer confirmed
`settlers-GameRoom` uses SQLite Durable Object storage. Local state stays in
`.wrangler/state`, separate from production rooms.
