# Console Statement Cleanup

## Totals
- Found: 71 console statements (log/warn/error/info/debug) across components/lib/app (including legacy backups).
- Removed: all console.log/info/debug usages in active components/services (ActionControls, GameService, lobby-view, GameController effects, backups).
- Remaining: 71 console.error/console.warn statements kept for error visibility (controllers/hooks/server actions). Primary locations: lib/controllers/*, lib/hooks/useBoardActions.ts, lib/hooks/useGameSubscription.ts, components/game/*.tsx error handlers, lib/supabase.ts warning.

## Categorization
- **Category 1: Debug/Development (removed)**
  - Client click traces in ActionControls
  - Roll/turn trace logging in game-service
  - Retry tracing in lobby-view
  - Stuck barbarian auto-resolve log (useGameControllerEffects)
  - Backup GameController debug traces

- **Category 2: Error Handling (kept, contextual)**
  - Server action wrappers (knight/improvement/progress-card controllers)
  - Game subscription/board action hooks
  - UI modals and dialogs (trade/discard/dev card)
  - Supabase configuration warning

## Notes
- Error logs now include contextual messages; AqueductModal updated to log descriptive failure.
- Further reduction would require a structured logging strategy to replace controller-level console.error calls.
