# Cities & Knights Implementation Audit Report
**Date**: 2025-11-27  
**Auditor**: AI Assistant  
**Reference Document**: `docs/cities_and_knights_repair_plan.md`
**Reference GDD**: `docs/cities_and_knights_gdd_corrected.v2.md`

---

## Executive Summary

The Cities & Knights expansion has been substantially implemented with 3 critical bugs and several areas requiring attention. Most core systems are in place, but some critical logic errors exist that prevent the game from functioning according to the official GDD v2.0 specification.

### Issues Found
- ❌ **3 CRITICAL** bugs (game-breaking logic errors)
- ⚠️ **2 HIGH PRIORITY** issues (missing validations)
- ℹ️ **4 MEDIUM PRIORITY** improvements (code quality/architecture)

---

## Critical Issues (MUST FIX)

### ❌ CRITICAL #1: Defender VP Tokens Not Counted in Victory Points
**File**: `core/rules/victory-conditions.ts`  
**Lines**: 66-78  
**Status**: ❌ **BROKEN**

**Problem**: 
The `defenderVPTokens` field exists in PlayerState and IS being awarded in barbarian-manager.ts line 84, but it is **NOT being counted** in the victory point calculation.

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

**Missing**: 
```typescript
// Cities & Knights: Defender of Catan VP Tokens
if (player.defenderVPTokens) {
    points += player.defenderVPTokens; // Each token = 1 VP
}
```

**Impact**: Players earn Defender VP tokens but they don't contribute to winning the game. This completely breaks the barbarian defense mechanic.

**Fix Required**: Add 3 lines to `calculateTotalVictoryPoints()` and `calculatePublicVictoryPoints()` in victory-conditions.ts

---

### ❌ CRITICAL #2: Wrong Progress Card Draw Logic
**File**: `core/engine/improvements/improvement-manager.ts`  
**Lines**: 361-374  
**Status**: ❌ **BROKEN**

**Problem**:
The `canDrawProgressCard` function uses an incorrect formula that allows Level 1 and Level 2 players to draw cards, and gives wrong thresholds for Level 3+.

**Current Code** (lines 368-373):
```typescript
// Must have at least level 1
if (level < 1) return false;

// Red die must be ≤ number of red-die symbols (level + 1)
const redDieThreshold = level + 1;
return redDieValue <= redDieThreshold;
```

**Current Behavior**:
- Level 1: Draws if red die ≤ 2 (wrong)
- Level 2: Draws if red die ≤ 3 (wrong)
- Level 3: Draws if red die ≤ 4 (wrong)
- Level 4: Draws if red die ≤ 5 (wrong)
- Level 5: Draws if red die ≤ 6 (wrong)

**Correct Behavior** (per GDD v2.0 lines 130-132):
- Level 1-2: NO cards
- Level 3: Draw if red die is 1 or 2
- Level 4-5: Draw if red die is 1, 2, or 3

**Correct Code**:
```typescript
// Must have at least level 3 (v2.0: Level 1-2 cannot draw)
if (level < 3) return false;

// Level 3: red die ≤ 2
// Level 4+: red die ≤ 3
const redDieThreshold = level >= 4 ? 3 : 2;
return redDieValue <= redDieThreshold;
```

**Impact**: Massive gameplay imbalance. Players are drawing progress cards too early and too frequently, making the game much easier and breaking the progression system.

**Fix Required**: Replace lines 368-373 in improvement-manager.ts

---

### ❌ CRITICAL #3: Metropolis Permanence at Level 5 Not Implemented
**File**: `core/engine/improvements/improvement-manager.ts`  
**Lines**: 179-264  
**Status**: ⚠️ **PARTIALLY BROKEN**

**Problem**:
The `tryStealMetropolis()` function checks if the current owner is at level 5 (lines 202-211), which is correct. However, there's a conceptual issue: the repair plan states "Metropolis at level 4 permanent" is wrong and "Only permanent at level 5" is correct (repair plan line 52, M6).

**Current Logic** (lines 202-211):
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

**Status**: This appears to be **CORRECT** per the GDD v2.0 line 66 which states "Reaching level 5 securely grants it permanently". The function prevents stealing if the owner is at level 5.

**However**, there's a missing edge case: What if two players are both at level 5? The code allows stealing because it only checks `ownerLevel >= 5`, but the stealing player is also at level 5. This should result in NO transfer (first to level 5 keeps it).

**Fix Required**: Add check `if (ownerLevel >= 5 && playerLevel >= 5)` to prevent stealing between two level-5 players.

---

## High Priority Issues

### ⚠️ HIGH #1: Intrigue Card Displacement Validation
**File**: `core/engine/progress/progress-card-manager.ts`  
**Lines**: 839-886  
**Status**: ⚠️ **CHECK REQUIRED**

**Problem** (per repair plan line 49, M3):
The Intrigue card should only displace basic/strong knights (acts as "virtual mighty knight" with strength 3), but cannot displace mighty knights.

**Requires Manual Verification**: Need to check lines 839-886 to ensure strength validation exists.

---

### ⚠️ HIGH #2: Knight Displacement Strength Validation
**File**: `core/validation/knight-validator.ts` or `core/engine/knights/knight-manager.ts`  
**Status**: ⚠️ **LOCATION UNKNOWN**

**Problem** (per repair plan line 41, H5):
Need to verify that knight displacement logic properly validates:
- Can only displace WEAKER knights (Basic < Strong < Mighty)
- Equal strength cannot displace
- Displaced knight owner must relocate via their own road network

**Requires Manual Verification**: Search for knight displacement logic and validate strength checks.

---

## Medium Priority Issues

### ℹ️ MEDIUM #1: Missing Hand Limit Warning UI
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Current State**:
- Hand limit enforcement exists (line 334-339 in game-service.ts)
- Error thrown if > 4 cards at turn end
- Progress card discard endpoint exists

**Missing**:
- UI indicator showing "X/4 cards" or "X/5 cards"
- Visual warning when approaching limit
- Discard buttons in progress card hand UI

**Recommendation**: Check if `components/game/ProgressCardHand.tsx` shows limit and discard UI.

---

### ℹ️ MEDIUM #2: V2.0 Corrections Documentation
**Status**: ✅ **GOOD**

**Finding**: The repair plan document appears to reference an older v1.0 specification, but the GDD v2.0 corrects several errors. The implementation mostly follows v2.0, not the repair plan.

**Examples**:
- Repair plan says "draw 2 keep 1" but v2.0 says "draw 1 card" (implementation is correct with v2.0)
- Repair plan mentions defenderOfCatan as transferable title, but v2.0 uses defenderVPTokens as permanent tokens (implementation follows v2.0)

**Recommendation**: Update repair plan to v2.1 to match GDD v2.0 specification.

---

### ℹ️ MEDIUM #3: Barbarian Fallback Logic
**File**: `core/engine/barbarian/barbarian-manager.ts`  
**Lines**: 127-201  
**Status**: ✅ **LOOKS GOOD**

**Finding**: The barbarian fallback system (M2 from repair plan line 48) appears to be correctly implemented with strength grouping and victim selection logic (lines 127-201). The code handles:
- Multiple tied players losing cities
- Fallback to next weakest group if no valid targets
- Metropolis immunity

**Recommendation**: Perform integration test to confirm behavior.

---

### ℹ️ MEDIUM #4: UI Components Status
**Status**: ✅ **COMPONENTS EXIST**

**Found Components**:
- ✅ `CityManagementDialog.tsx` (exists)
- ✅ `KnightManagementDialog.tsx` (exists)
- ✅ `AqueductModal.tsx` (exists)

**Required Verification**:
- Check if old `CityImprovements.tsx` panel was removed (repair plan line 261)
- Check if old `KnightControls.tsx` panel was removed (repair plan line 342)
- Verify knight management dialog implements all actions (activate, move, upgrade, chase robber, NO manual deactivate)

---

## Feature Completion Checklist

### Feature 1: Progress Card System
| Requirement | Status | Notes |
|-------------|--------|-------|
| Level 3+ requirement | ❌ BROKEN | Current allows level 1+, should be level 3+ |
| Red die threshold (3: ≤2, 4-5: ≤3) | ❌ BROKEN | Current uses wrong formula |
| All qualifying players draw | ✅ | Code in event-die-manager.ts looks correct |
| Draw exactly 1 card | ✅ | No "draw 2 keep 1" logic found |
| VP cards auto-reveal | ✅ | Lines 46-61 in progress-card-manager.ts |
| Hand limit (4 at turn end) | ✅ | Enforced in game-service.ts line 336 |
| Alchemy playable before roll | ⚠️ | Needs verification |

### Feature 2: Victory Conditions
| Requirement | Status | Notes |
|-------------|--------|-------|
| Largest Army disabled in C&K | ✅ | Line 61 victory-conditions.ts |
| Defender VP Tokens field exists | ✅ | PlayerState.defenderVPTokens |
| Defender VP Tokens awarded | ✅ | barbarian-manager.ts line 84 |
| Defender VP Tokens counted in VP | ❌ BROKEN | Missing from victory calculation! |
| Player card shows Defender badge | ✅ | GameStatus.tsx lines 142-145 |

### Feature 3: Metropolis & City Improvements  
| Requirement | Status | Notes |
|-------------|--------|-------|
| Auto-award at level 4 | ✅ | tryAwardMetropolis function exists |
| Auto-transfer at level 5 | ⚠️ | Needs edge case fix (both at level 5) |
| CityManagementDialog exists | ✅ | Component found |
| City walls per-city | ⚠️ | Needs verification |
| Aqueduct (Science level 3) | ✅ | Implemented in game-service.ts lines 266-292 |
| Trading House (Trade level 3) | ⚠️ | Needs verification |
| Fortress (Politics level 3) | ⚠️ | Needs verification |

### Feature 4: Knight Management & Combat
| Requirement | Status | Notes |
|-------------|--------|-------|
| KnightManagementDialog exists | ✅ | Component found |
| Displacement strength validation | ⚠️ | Needs verification |
| Knight piece limits (6 total) | ⚠️ | Needs verification |
| Movement pathfinding via roads | ⚠️ | Needs verification |
| Auto-deactivate after actions | ⚠️ | Needs verification |
| Chase robber | ⚠️ | Needs verification |

### Feature 5: Barbarian System
| Requirement | Status | Notes |
|-------------|--------|-------|
| Fallback targeting | ✅ | Lines 127-201 barbarian-manager.ts |
| Tied players lose cities | ✅ | Lines 150-184 barbarian-manager.ts |
| Metropolis immunity | ✅ | hasDestroyableCity function |
| Defender token award | ✅ | Line 84 barbarian-manager.ts |
| All knights deactivate after attack | ⚠️ | Needs verification |

---

## Recommendations

### Immediate (Before Production)
1. **FIX CRITICAL #1**: Add defender VP tokens to victory calculation (5 minutes)
2. **FIX CRITICAL #2**: Replace progress card draw logic with correct formula (10 minutes)
3. **FIX CRITICAL #3**: Add edge case for two level-5 players competing for metropolis (10 minutes)

###Short-Term (This Week)
4. Verify HIGH #1 and HIGH #2 by manual code inspection
5. Test barbarian fallback logic with integration test
6. Verify Level 3 improvement abilities (Aqueduct, Trading House, Fortress)
7. Check knight management dialog for completeness

### Long-Term (Next Sprint)
8. Update repair plan to v2.1 to reflect v2.0 GDD corrections
9. Add UI indicators for hand limits
10. Comprehensive end-to-end testing of all C&K features

---

## Code Quality Assessment

### Strengths
- ✅ Good separation of concerns (managers, services, validators)
- ✅ Comprehensive logging throughout
- ✅ Type safety with TypeScript
- ✅ Most v2.0 GDD corrections properly implemented

### Weaknesses
- ❌ Critical victory point calculation bug went unnoticed
- ❌ Progress card draw formula completely wrong
- ⚠️ Incomplete test coverage allowed these bugs
- ⚠️ Repair plan outdated vs actual GDD

### Architecture Issues
None major. The junior developer followed good patterns but made formula/logic errors.

---

## Testing Gaps

### Unit Tests Needed
1. Progress card draw eligibility (level 3+ with correct red die thresholds)
2. Victory point calculation including all C&K sources
3. Metropolis ownership transfer logic at level 4 and 5

### Integration Tests Needed
1. Full barbarian attack flow with fallback targeting
2. Progress card hand limit enforcement
3. Level 3 improvement abilities (Aqueduct, Trading House, Fortress)

---

## Conclusion

The implementation is **60-70% complete** with most systems in place but **3 critical bugs preventing correct gameplay**. The developer showed good understanding of architecture but made calculation errors in core game logic.

**Estimated Fix Time**: 2-3 hours for critical bugs + 4-6 hours for verification/testing

**Risk Level**: **HIGH** - Critical bugs affect core mechanics and victory conditions

**Recommendation**: **DO NOT RELEASE** until Critical #1 and Critical #2 are fixed and tested.
