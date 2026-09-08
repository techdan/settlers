# Codebase Improvement Plan

**Status:** Typed-action production work remains; a separate validation defect is recorded in §5.15
**Active item:** §5.14 — typed server-action results
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
