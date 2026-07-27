# Codebase Improvement Plan

**Status:** One production-readiness item remains after the v2.1 cleanup release
**Active item:** §5.14 — typed server-action results
**Completed-plan archive:** [`docs/archive/codebase-improvement-plan-v2.1.md`](archive/codebase-improvement-plan-v2.1.md)

## 5.14 Typed server-action results

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
