# Console Cleanup Prompt - DEBUG LOGGING ONLY

## ⚠️ CRITICAL: NARROW SCOPE

**ONLY remove development debug logging (console.log/console.debug) that serves no purpose.**

**DO NOT remove:**
- ❌ Error handling logs (`console.error`, `console.warn` in try/catch blocks)
- ❌ Error boundary logs
- ❌ Critical failure logs
- ❌ Intentional debug tooling (DebugPanel.tsx)
- ❌ Admin/dev scripts (scripts/*.ts)

**DO remove:**
- ✅ Development debugging: `console.log('entering useEffect')`
- ✅ State inspection: `console.log('selectedHex:', selectedHex)`
- ✅ Temporary debugging: `console.debug('calculation result:', result)`

---

## Context

You're working on a Settlers of Catan implementation. The codebase has some development debug logging (`console.log`, `console.debug`) that should be removed. This is **NOT** about error handling - leave all error logs intact.

**Related Documentation:**
- @AGENTS.md (tech stack and conventions)

---

## Task: Remove Development Debug Logging ONLY

**Estimated Time:** 30-60 minutes

### Files with Console Statements (29 total)

```bash
# UI Components
./app/room/[id]/page.tsx
./components/game/ActionControls.tsx
./components/game/AqueductModal.tsx
./components/game/BuildControls.tsx
./components/game/DebugPanel.tsx              # KEEP - intentional debug feature
./components/game/DiscardModal.tsx
./components/game/GameController.tsx
./components/game/PlayerDevCards.tsx
./components/game/ProgressCardDiscardDialog.tsx
./components/game/ProgressCardHand.tsx
./components/game/TradeModal.tsx
./components/game/TradeOfferDisplay.tsx
./components/lobby-view.tsx

# Rendering Layer
./components/ui/icons/ColoredSvgIcon.tsx
./core/engine/board/board-generator.ts

# Controllers & Hooks
./lib/controllers/improvement-controller.ts
./lib/controllers/knight-controller.ts
./lib/controllers/progress-card-controller.ts
./lib/hooks/useBoardActions.ts
./lib/hooks/useGameControllerEffects.ts
./lib/hooks/useGameSubscription.ts
./lib/hooks/useOptimisticGameState.tsx
./lib/hooks/useRobberInteractions.ts
./lib/hooks/useTurnActions.ts

# Services
./lib/services/game-service.ts
./lib/supabase.ts

# Scripts - KEEP THESE
./scripts/check-db.ts                         # KEEP - admin script
./scripts/event-die-distribution.ts           # KEEP - admin script
./scripts/verify-lobby.ts                     # KEEP - admin script
```

---

## Step-by-Step Process

### Step 1: Review Each File (20 min)

For each file, **read the file first** and identify ONLY:

**REMOVE (development debug logging):**
```typescript
console.log('component mounted');
console.log('state:', state);
console.log('entering useEffect');
console.debug('calculation result:', result);
console.log({ selectedHex, playerColor, buildMode });
console.log('TODO: implement this');
```

**KEEP (error handling, critical logs):**
```typescript
// Error handling - KEEP
try {
  await updateGame();
} catch (error) {
  console.error('Failed to update game:', error); // KEEP THIS
  throw error;
}

// Critical failures - KEEP
if (!gameState) {
  console.error('Game state is null'); // KEEP THIS
  return;
}

// Supabase errors - KEEP
subscription.on('error', (error) => {
  console.error('Supabase subscription failed:', error); // KEEP THIS
});

// Network errors - KEEP
console.warn('Retry attempt failed'); // KEEP THIS

// DebugPanel.tsx - KEEP ALL
console.log('[Debug Panel] Resource added:', resource); // KEEP THIS

// scripts/*.ts - KEEP ALL
console.log('Database connection successful'); // KEEP THIS
```

### Step 2: Remove Debug Logging Only (15 min)

Use the Edit tool to remove **only** the development debug logging identified in Step 1.

**Example edits:**

```typescript
// BEFORE
useEffect(() => {
  console.log('selectedHex changed:', selectedHex); // REMOVE
  if (selectedHex) {
    handleHexSelection(selectedHex);
  }
}, [selectedHex]);

// AFTER
useEffect(() => {
  if (selectedHex) {
    handleHexSelection(selectedHex);
  }
}, [selectedHex]);
```

```typescript
// BEFORE
const handleClick = () => {
  console.log('button clicked'); // REMOVE
  onClick();
};

// AFTER
const handleClick = () => {
  onClick();
};
```

**DO NOT change error handling:**

```typescript
// KEEP AS-IS (error handling)
try {
  const result = await fetchData();
  console.log('Fetch successful'); // REMOVE THIS debug log
  return result;
} catch (error) {
  console.error('Fetch failed:', error); // KEEP THIS error log
  throw error;
}

// AFTER
try {
  const result = await fetchData();
  return result;
} catch (error) {
  console.error('Fetch failed:', error); // KEPT
  throw error;
}
```

### Step 3: Verification (10 min)

1. **TypeScript check:**
   ```bash
   npx tsc --noEmit
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Tests:**
   ```bash
   npm test -- --run
   ```

All should pass.

### Step 4: Manual Spot Check (10 min)

Open browser and test:
- Create room
- Join as player
- Start game
- Roll dice
- Build structure

Check browser console - should be cleaner (no "entering useEffect" spam), but error handling should still log.

---

## Clear Examples

### Example 1: Remove Debug Log, Keep Error Log

**File:** `lib/hooks/useGameSubscription.ts`

```typescript
// BEFORE
useEffect(() => {
  console.log('Setting up subscription for room:', roomId); // REMOVE

  const channel = supabase.channel(`game:${roomId}`);

  channel.on('postgres_changes', { ... }, (payload) => {
    console.log('Received update:', payload); // REMOVE
    setGameState(payload.new.state);
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Subscribed successfully'); // REMOVE
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('Subscription error'); // KEEP - error handling
    }
  });
}, [roomId]);

// AFTER
useEffect(() => {
  const channel = supabase.channel(`game:${roomId}`);

  channel.on('postgres_changes', { ... }, (payload) => {
    setGameState(payload.new.state);
  });

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.error('Subscription error'); // KEPT
    }
  });
}, [roomId]);
```

### Example 2: Keep DebugPanel Logs

**File:** `components/game/DebugPanel.tsx`

```typescript
// KEEP ALL LOGS IN THIS FILE
const handleAddResource = () => {
  console.log('[Debug Panel] Adding resource:', resource); // KEEP - intentional feature
  giveResource(playerId, resource);
};
```

### Example 3: Keep Scripts

**File:** `scripts/check-db.ts`

```typescript
// KEEP ALL LOGS IN SCRIPTS
async function checkDatabase() {
  console.log('Connecting to database...'); // KEEP - script output
  const db = await connectDB();
  console.log('Database connected successfully'); // KEEP - script output
}
```

---

## Success Criteria

1. ✅ **Debug logging removed** - No more `console.log('entering useEffect')` spam
2. ✅ **Error handling intact** - All `console.error`, `console.warn` in try/catch remain
3. ✅ **Build passes** - `npm run build` succeeds
4. ✅ **Tests pass** - `npm test -- --run` succeeds
5. ✅ **DebugPanel works** - Debug feature still functional
6. ✅ **No regressions** - Error logging still works

---

## Common Mistakes to Avoid

### ❌ DON'T DO THIS:

```typescript
// Removing error handling logs - DON'T DO THIS
try {
  await updateGame();
} catch (error) {
  console.error('Failed:', error); // ❌ Don't remove this!
}

// Removing critical failure logs - DON'T DO THIS
if (!data) {
  console.error('Data is null'); // ❌ Don't remove this!
  return;
}
```

### ✅ DO THIS:

```typescript
// Remove only debug logs
console.log('entering function'); // ✅ Remove this
console.log('state:', state);     // ✅ Remove this
console.debug('result:', result); // ✅ Remove this
```

---

## Expected Outcome

- **~20-30 debug logs removed** (not 50-100)
- **Cleaner browser console** during development
- **Error handling intact** - still logs errors properly
- **No functional changes** - only removing noise

---

## If Unsure

**When in doubt, KEEP the log.** It's better to leave an error log than break error handling.

Ask yourself:
- Is this inside a try/catch block? → **KEEP**
- Is this logging an error or warning? → **KEEP**
- Is this in DebugPanel.tsx or scripts/? → **KEEP**
- Is this just "console.log('entering effect')"? → **REMOVE**
