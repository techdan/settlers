# Cities & Knights Implementation Issues - Planning Document
**Date**: 2025-11-27  
**Status**: Ready for Implementation  
**Priority**: HIGH  
**Estimated Effort**: 30-60 minutes

---

## Overview

This document outlines the remaining implementation issues found during the Cities & Knights audit. The progress card system was verified as CORRECT per v2.1 GDD specification.

---

## Issue #1: Defender VP Tokens Not Counted in Victory Points

### Priority: 🔴 CRITICAL
### Estimated Time: 5 minutes

**Problem**: 
The `defenderVPTokens` field exists in PlayerState and IS being awarded correctly in `barbarian-manager.ts` line 84, but it is **NOT being counted** in the victory point calculation.

**Impact**: 
Players earn Defender VP tokens after successful barbarian defenses, but these tokens don't contribute to winning the game. This completely breaks the barbarian defense incentive mechanic.

**Files Affected**:
- `core/rules/victory-conditions.ts`

**Current Code** (lines 66-78):
```typescript
// Cities & Knights: Metropolises
if (gameState.gameMode === 'cities_and_knights') {
    points += calculateMetropolisVP(player);

    // Cities & Knights: VP Progress Cards (Printer, Constitution)
    if (player.revealedVPCards) {
        points += player.revealedVPCards.length; // Each VP card = 1 VP
    }

    // Cities & Knights: Merchant (grants 1 VP)
    if (gameState.activeMerchant === playerId) {
        points += 1;
    }
}
```

**Fix Required**:
Add the following after line 77 (before the closing brace):

```typescript
// Cities & Knights: Defender of Catan VP Tokens
if (player.defenderVPTokens) {
    points += player.defenderVPTokens; // Each token = 1 VP
}
```

**Same fix needed in `calculatePublicVictoryPoints()`** (lines 114-127).

**Testing**:
1. Start C&K game
2. Trigger barbarian attack
3. Ensure single highest defender gets VP token
4. Verify token appears in player's VP count
5. Verify player can win with defender tokens

---

## Issue #2: Metropolis Level 5 Edge Case

### Priority: ⚠️ MEDIUM
### Estimated Time: 10 minutes

**Problem**: 
The metropolis stealing logic at level 5 has an edge case. If Player A owns a metropolis at level 5, and Player B also reaches level 5, the current code allows Player B to attempt to steal it (though it correctly prevents the steal). However, there's a logical gap in the scenario where both players are at level 5 simultaneously.

**Current Behavior**:
- Player A at level 5 with metropolis: ✅ Protected from stealing
- Player B reaches level 5: ✅ Correctly prevented from stealing
- Edge case: What if both reach level 5 in the same turn? (unlikely but possible)

**Files Affected**:
- `core/engine/improvements/improvement-manager.ts`

**Current Code** (lines 202-211):
```typescript
// Check if current owner is at level 5 (can't steal)
const ownerLevel = currentOwner.improvements?.[improvement] || 0;
if (ownerLevel >= 5) {
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} reached level 5 ${improvement}, but ${currentOwner.name} has secured the ${metropolisType} Metropolis at level 5.`,
        playerId: player.id
    });
    return false;
}
```

**Analysis**:
The current implementation is actually **CORRECT**. The first player to reach level 5 gets the metropolis permanently. If another player also reaches level 5 later, they cannot steal it. The code correctly handles this.

**Recommendation**: 
✅ **NO CHANGE NEEDED** - Current implementation is correct per GDD v2.1 line 66: "Reaching level 5 securely grants it permanently (it cannot be stolen once at level 5)."

The edge case of "both at level 5" is handled correctly because:
1. First player to level 5 claims it (via `tryAwardMetropolis` if unclaimed, or already owns it)
2. Second player to level 5 cannot steal it (correctly blocked by the check above)

**Status**: ✅ VERIFIED CORRECT - No implementation needed

---

## Issue #3: Missing UI Indicators

### Priority: ℹ️ LOW
### Estimated Time: 15-30 minutes

**Problem**: 
Progress card hand limit enforcement exists in the backend, but UI indicators may be missing or incomplete.

**Current State**:
- ✅ Hand limit enforced (max 4 at turn end)
- ✅ Error thrown if >4 cards at turn end
- ✅ Progress card discard endpoint exists
- ⚠️ UI indicators unknown

**Files to Check**:
- `components/game/ProgressCardHand.tsx`
- `components/game/GameStatus.tsx`

**Required UI Elements**:
1. **Hand Limit Indicator**: Show "X/4 cards" or "X/5 cards" (5 during turn, 4 at end)
2. **Visual Warning**: Highlight when at/over limit
3. **Discard Buttons**: Allow discarding cards when over limit
4. **Tooltip**: Explain hand limit rules

**Implementation**:
Check if `ProgressCardHand.tsx` component exists and has these features. If not, add them.

**Testing**:
1. Draw 5 progress cards during your turn
2. Verify UI shows "5/5 cards" or similar
3. Try to end turn - should be blocked
4. Discard 1 card
5. Verify UI updates to "4/4 cards"
6. End turn successfully

---

## Issue #4: Verification Items

### Priority: ℹ️ LOW
### Estimated Time: 10-15 minutes per item

These items need manual verification to confirm they're implemented correctly:

### 4.1: Intrigue Card Displacement Validation
**File**: `core/engine/progress/progress-card-manager.ts` (lines 839-886)

**Requirement** (per repair plan M3):
- Intrigue acts as "virtual mighty knight" (strength 3)
- Can displace basic (1) and strong (2) knights
- Cannot displace mighty (3) knights

**Action**: Review `executeIntrigue()` function to verify strength validation exists.

### 4.2: Knight Displacement Strength Validation
**Files**: `core/validation/knight-validator.ts` or `core/engine/knights/knight-manager.ts`

**Requirements** (per repair plan H5):
- Can only displace WEAKER knights (Basic < Strong < Mighty)
- Equal strength cannot displace
- Displaced knight owner must relocate via their own road network

**Action**: Search for knight displacement logic and verify strength checks exist.

### 4.3: Level 3 Improvement Abilities
**Files**: Various

**Requirements** (per GDD v2.1 lines 71-90):
1. **Aqueduct (Science Level 3)**: ✅ Implemented (verified in game-service.ts lines 266-292)
2. **Trading House (Trade Level 3)**: ⚠️ Needs verification
3. **Fortress (Politics Level 3)**: ⚠️ Needs verification

**Action**: 
- Search for Trading House 2:1 commodity trade logic
- Search for Fortress mighty knight upgrade restriction
- Verify both are implemented correctly

### 4.4: Knight Management Dialog Completeness
**File**: `components/game/KnightManagementDialog.tsx`

**Requirements** (per repair plan lines 348-373):
- ✅ Activate button (1 grain)
- ❌ NO manual deactivate button (should not exist)
- ✅ Upgrade button (1 wool + 1 ore)
- ✅ Move action (shows valid destinations)
- ✅ Chase Robber action (if adjacent)
- ✅ Auto-deactivate after actions

**Action**: Review component to verify all actions exist and manual deactivate does NOT exist.

### 4.5: Barbarian Attack Knight Deactivation
**File**: `core/engine/barbarian/barbarian-manager.ts`

**Requirement**: ALL active knights become inactive after barbarian attack (win or lose)

**Action**: Search for knight deactivation logic in `resolveBarbbarianAttack()` function.

---

## Summary

### Critical Issues (Must Fix)
1. ✅ ~~Progress Card Draw Logic~~ - VERIFIED CORRECT per v2.1 GDD
2. 🔴 **Defender VP Tokens Not Counted** - 5 minutes to fix

### Medium Priority
3. ✅ ~~Metropolis Level 5 Edge Case~~ - VERIFIED CORRECT

### Low Priority (Verification Needed)
4. ℹ️ UI Indicators - 15-30 minutes
5. ℹ️ Intrigue Card Validation - 10 minutes
6. ℹ️ Knight Displacement Validation - 10 minutes
7. ℹ️ Trading House Implementation - 10 minutes
8. ℹ️ Fortress Implementation - 10 minutes
9. ℹ️ Knight Dialog Completeness - 10 minutes
10. ℹ️ Barbarian Knight Deactivation - 5 minutes

### Total Estimated Time
- **Critical**: 5 minutes
- **All Issues**: 30-60 minutes

---

## Implementation Order

1. **Fix Defender VP Tokens** (5 min) - Critical for gameplay
2. **Verify Level 3 Abilities** (20 min) - Important features
3. **Verify Knight Systems** (20 min) - Core mechanics
4. **Add UI Indicators** (15-30 min) - User experience

---

## Testing Checklist

After implementation, verify:
- [ ] Defender VP tokens count toward victory
- [ ] Player can win with defender tokens
- [ ] Metropolis cannot be stolen at level 5
- [ ] Trading House allows 2:1 commodity trades
- [ ] Fortress allows mighty knight upgrades
- [ ] Intrigue cannot displace mighty knights
- [ ] Knight displacement validates strength
- [ ] All knights deactivate after barbarian attack
- [ ] Progress card hand limit shows in UI
- [ ] Hand limit warnings appear when needed

---

## Notes

### What Was Outdated in Repair Plan?

The repair plan referenced an older v2.0 specification that had incorrect progress card draw logic:
- **v2.0 (incorrect)**: Level 3+ only, with thresholds 2 and 3
- **v2.1 (correct)**: Level 1+ allowed, with threshold = level + 1

The current implementation follows v2.1 correctly. The repair plan has been updated to reflect this.

### Metropolis Level 5 Clarification

**Question**: "What is the metropolis level 5 edge case?"

**Answer**: There is no edge case. The implementation is correct:
- Once a player reaches level 5 with a metropolis, it becomes **permanent**
- No other player can steal it, even if they also reach level 5
- The "first to level 5" rule is implicit in the turn order
- The current code correctly prevents stealing from a level 5 owner

This is working as intended per GDD v2.1 line 66.
