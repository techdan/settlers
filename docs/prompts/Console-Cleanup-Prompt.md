# Console Cleanup Prompt

## Context

You're working on a Settlers of Catan implementation with Cities & Knights expansion. The codebase has 29 files containing console.log/warn/error statements that need cleanup. This is part of Phase 4 completion following a comprehensive refactor.

**Related Documentation:**
- @docs/audits/Opus-Audit-2025-12-06.md (lines 591-609)
- @AGENTS.md (tech stack and conventions)

## Current State

**Files with console statements (29 total):**

```bash
# UI Components (13 files)
./app/room/[id]/page.tsx
./components/game/ActionControls.tsx
./components/game/AqueductModal.tsx
./components/game/BuildControls.tsx
./components/game/DebugPanel.tsx
./components/game/DiscardModal.tsx
./components/game/GameController.tsx
./components/game/PlayerDevCards.tsx
./components/game/ProgressCardDiscardDialog.tsx
./components/game/ProgressCardHand.tsx
./components/game/TradeModal.tsx
./components/game/TradeOfferDisplay.tsx
./components/lobby-view.tsx

# Rendering Layer (2 files)
./components/ui/icons/ColoredSvgIcon.tsx
./core/engine/board/board-generator.ts

# Controllers & Hooks (9 files)
./lib/controllers/improvement-controller.ts
./lib/controllers/knight-controller.ts
./lib/controllers/progress-card-controller.ts
./lib/hooks/useBoardActions.ts
./lib/hooks/useGameControllerEffects.ts
./lib/hooks/useGameSubscription.ts
./lib/hooks/useOptimisticGameState.tsx
./lib/hooks/useRobberInteractions.ts
./lib/hooks/useTurnActions.ts

# Services (2 files)
./lib/services/game-service.ts
./lib/supabase.ts

# Scripts (3 files - KEEP THESE)
./scripts/check-db.ts
./scripts/event-die-distribution.ts
./scripts/verify-lobby.ts
```

## Task: Remove Development Console Statements

**Estimated Time:** 1-2 hours

### Step 1: Categorize Console Statements (15 min)

Review each file and categorize console statements:

1. **Remove entirely** - Debug logging during development
   - Example: `console.log('entering useEffect')`
   - Example: `console.log('selectedHex:', selectedHex)`

2. **Keep as-is** - Intentional debug tooling
   - DebugPanel.tsx console statements (debug UI feature)
   - scripts/*.ts files (dev/admin scripts)

3. **Replace with proper error handling** - Error cases
   - Example: `console.error('Failed to fetch')` → throw error or show user toast
   - Example: `console.warn('Invalid state')` → log to monitoring service (future)

### Step 2: Clean UI Components (30 min)

For each component file:

1. **Read the file** to understand context
2. **Search for console statements**: `console.log`, `console.warn`, `console.error`, `console.debug`
3. **Apply categorization** from Step 1:
   - Remove debug logging
   - Keep intentional debug features (DebugPanel.tsx)
   - Convert errors to proper error handling
4. **Verify no regressions** - ensure removing logs doesn't break functionality

**Priority files** (most likely to have removable logs):
- GameController.tsx
- ProgressCardHand.tsx
- TradeModal.tsx
- AqueductModal.tsx
- DiscardModal.tsx

### Step 3: Clean Controllers & Hooks (20 min)

Focus on business logic files:

1. **Controllers** (improvement-controller.ts, knight-controller.ts, progress-card-controller.ts)
   - Remove debug logging
   - Keep error cases but convert to proper handling

2. **Hooks** (all useBoardActions, useGameControllerEffects, etc.)
   - Remove effect debugging (`console.log` in useEffect)
   - Keep critical error warnings

### Step 4: Clean Services & Core (15 min)

1. **game-service.ts** - Remove debug logs, keep errors
2. **supabase.ts** - Review connection/subscription logs
3. **board-generator.ts** - Remove generation debug logs
4. **ColoredSvgIcon.tsx** - Remove icon rendering debug

### Step 5: Verification & Testing (15-20 min)

1. **Run TypeScript check**:
   ```bash
   npx tsc --noEmit
   ```

2. **Run build**:
   ```bash
   npm run build
   ```
   Should complete without errors.

3. **Test in browser** (critical paths):
   - Create a new game room
   - Join as 2+ players
   - Start game
   - Roll dice
   - Build structures (settlement, city)
   - Play a progress card
   - Trade resources
   - End turn
   - Check browser console - should be quiet (no debug spam)

4. **Verify debug panel still works** (if enabled in dev):
   - DebugPanel.tsx console statements should remain
   - Debug features should still function

### Step 6: Update Beads (5 min)

Close the console cleanup tracking:

```bash
# If there's a specific bead for console cleanup, close it
bd close <bead-id> -m "Removed 50+ console statements from 26 files. Kept intentional debug tooling in DebugPanel.tsx and scripts/. Build passing, manual testing complete."

# Update Phase 4 completion bead
bd update SettlersOfLanc-tqwo.3 -m "Console cleanup complete"
```

## Guidelines

### What to Remove ✅

```typescript
// Debug logging - REMOVE
console.log('component mounted');
console.log('state:', state);
console.log('entering useEffect');
console.debug('calculation result:', result);

// Development debugging - REMOVE
console.warn('TODO: implement this');
console.log({ selectedHex, playerColor, buildMode });
```

### What to Keep ❌ (Don't Remove)

```typescript
// DebugPanel.tsx - intentional debug UI
console.log('[Debug Panel] Resource added:', resource);

// scripts/*.ts - admin/dev scripts
console.log('Database connection successful');
console.log('Event die distribution:', results);

// Critical errors that should be monitored (future: replace with proper logging)
console.error('Supabase subscription failed:', error);
```

### What to Replace 🔄

```typescript
// BEFORE
console.error('Failed to update game state:', error);

// AFTER - proper error handling
throw new Error(`Failed to update game state: ${error.message}`);

// OR show user feedback
toast.error('Failed to update game. Please try again.');

// OR both
toast.error('Action failed. Please try again.');
throw error; // Re-throw for error boundary
```

## Success Criteria

1. ✅ **26 files cleaned** (excluding 3 scripts)
2. ✅ **Build passes**: `npm run build` succeeds
3. ✅ **TypeScript check passes**: `npx tsc --noEmit` succeeds
4. ✅ **Browser console quiet** during normal gameplay (no debug spam)
5. ✅ **DebugPanel.tsx still functional** (intentional debug logging remains)
6. ✅ **Manual testing complete** (critical game paths tested)
7. ✅ **Beads updated** to reflect completion

## Expected Outcome

- **~50-100 console statements removed**
- **Clean browser console** during gameplay
- **No functional regressions**
- **Build passing**
- **Phase 4 completion: 100%** (was 95%)

## Notes

- **Do NOT remove** error logs that indicate critical failures
- **Do NOT remove** DebugPanel.tsx console statements (feature, not bug)
- **Do NOT remove** scripts/*.ts console statements (intentional admin output)
- **Focus on** removing development debug logging from UI components and hooks
- **Be surgical** - only remove what's clearly debug logging, preserve error handling

## Next Steps After Completion

After console cleanup is complete and verified:
- Phase 4 will be 100% complete
- Ready to proceed to Phase 5: Testing Infrastructure
- Or ready to tackle P1 gameplay bugs if testing is deferred
