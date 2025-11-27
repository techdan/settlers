# Cities & Knights v2.0 Corrections Summary

**Source**: `docs/cities_and_knights_gdd_corrected.v2.md`
**Date**: 2025-11-27

---

## 🚨 MAJOR CHANGES FROM v1 TO v2

### 1. Progress Card Drawing (COMPLETELY DIFFERENT)

#### ❌ v1 INCORRECT Logic (DISCARD):
- Draw 2 cards, keep 1 (with modal choice)
- Only ONE player draws per event die roll
- Highest level wins, ties go to closest player clockwise

#### ✅ v2 CORRECT Logic (IMPLEMENT):
- Draw exactly **1 card** (topmost from deck)
- **ALL** qualifying players draw (not just one!)
- **Red Die Threshold System**:
  - Level 1-2: Cannot draw
  - Level 3: Draw if red die shows **1 or 2**
  - Level 4-5: Draw if red die shows **1, 2, or 3**

**Impact**:
- REMOVE ProgressCardChoice.tsx component
- REMOVE choose/route.ts endpoint
- SIMPLIFY draw logic significantly
- ADD red die threshold checks

---

### 2. Defender of Catan (FUNDAMENTALLY DIFFERENT)

#### ❌ v1 INCORRECT Logic (DISCARD):
- Transferable title like "Longest Road"
- Single player "owns" it at a time
- Can be lost when another player becomes top defender
- GameState field: `defenderOfCatan: string | null`

#### ✅ v2 CORRECT Logic (IMPLEMENT):
- **Physical VP Tokens** (6 total in game)
- Once earned, tokens are **KEPT PERMANENTLY** (not transferred!)
- PlayerState field: `defenderVPTokens: number`
- Award 1 token to highest contributor after successful defense
- **Tie behavior**: If multiple players tied for highest, **NO ONE** gets token; instead tied players draw a progress card

**Impact**:
- REMOVE GameState.defenderOfCatan field
- ADD PlayerState.defenderVPTokens field
- CHANGE from transferable title to permanent tokens
- UPDATE player card UI to show token count (not ownership badge)

---

### 3. Metropolis Permanence (NEW RULE)

#### ❌ v1 INCORRECT Logic (DISCARD):
- Level 4: Claim metropolis (end of story)
- Level 5: Steal from level 4 holder

#### ✅ v2 CORRECT Logic (IMPLEMENT):
- Level 4: Claim metropolis (**TEMPORARY** - can be stolen!)
- Level 5: Metropolis becomes **PERMANENT** (cannot be stolen)
- Stealing logic: Only works if current owner is at level 4 (not level 5)

**Impact**:
- ADD permanence check in metropolis transfer logic
- UPDATE auto-transfer at level 5 to check if stealable
- Log messages should indicate "temporary" vs "permanent" ownership

---

### 4. Barbarian Targeting Fallback (NEW COMPLEX RULE)

#### ❌ v1 INCOMPLETE Logic (PARTIAL):
- All tied players lose cities (correct, but incomplete)
- Target weakest player

#### ✅ v2 CORRECT Logic (IMPLEMENT):
- Target player with **lowest active knight contribution**
- **Fallback Logic** (NEW):
  1. If weakest player has **no cities** (only settlements): target **next weakest**
  2. If weakest player's only city is a **Metropolis** (immune): target **next weakest**
  3. Continue until a valid target city is found
- If multiple players tied for lowest: ALL tied players lose a city (this part was correct in v1)

**Impact**:
- ADD fallback targeting system
- ADD validation: skip players with no valid cities
- ADD validation: skip metropolis-only players
- Continue iteration until valid target found

---

### 5. Tied Defender Behavior (NEW RULE)

#### v1 Logic (INCOMPLETE):
- Highest contributor gets defender title
- No tie handling specified

#### ✅ v2 CORRECT Logic (IMPLEMENT):
- **Single highest**: Award 1 VP token
- **Tied for highest**: NO token awarded to anyone; instead, all tied players draw a progress card

**Impact**:
- ADD tie detection for highest contributor
- ADD progress card distribution for tied defenders
- Log appropriately for both scenarios

---

## 📊 SUMMARY OF CHANGES BY FEATURE

### Feature 1: Progress Cards
- ✅ Keep: Level 3+ requirement
- ✅ Keep: VP cards auto-play immediately
- ✅ Keep: Hand limit (4 end of turn, 5 during turn)
- ❌ REMOVE: Draw 2 keep 1 logic
- ❌ REMOVE: Single player selection logic
- ❌ DELETE: ProgressCardChoice.tsx component
- ❌ DELETE: choose/route.ts endpoint
- ✅ ADD: Red die threshold system (level 3: red≤2, level 4-5: red≤3)
- ✅ ADD: ALL qualifying players draw simultaneously

### Feature 2: Victory Conditions
- ✅ Keep: Remove Largest Army VP in C&K mode
- ❌ REMOVE: GameState.defenderOfCatan field
- ❌ REMOVE: Transferable defender title concept
- ✅ ADD: PlayerState.defenderVPTokens (integer count)
- ✅ ADD: Permanent VP tokens (once earned, kept forever)
- ✅ ADD: Tied defender behavior (no token, draw cards instead)

### Feature 3: Metropolis
- ✅ Keep: Auto-award at level 4
- ✅ Keep: Auto-transfer at level 5
- ✅ ADD: Level 4 = temporary (can be stolen)
- ✅ ADD: Level 5 = permanent (cannot be stolen)
- ✅ ADD: Stealing validation (only if current owner at level 4)

### Feature 4: Knights
- ✅ No changes (all v1 logic was correct)

### Feature 5: Barbarian
- ✅ Keep: Tied players all lose cities
- ✅ ADD: Fallback targeting (next weakest if no valid city)
- ✅ ADD: Skip metropolis-only players
- ✅ ADD: Skip players with no cities
- ✅ ADD: Continue until valid target found

---

## 🔧 FILES REQUIRING MAJOR CHANGES

### Type Definitions
- `lib/types/game.ts`: REMOVE defenderOfCatan field
- `lib/types/player.ts`: ADD defenderVPTokens: number field

### Core Engine
- `core/engine/progress/progress-card-manager.ts`: SIMPLIFY (remove draw 2 logic)
- `core/engine/dice/event-die-manager.ts`: ADD red die threshold, ALL players draw
- `core/engine/barbarian/barbarian-manager.ts`: ADD fallback targeting, ADD tied defender card draws
- `core/engine/improvements/improvement-manager.ts`: ADD metropolis permanence at level 5
- `core/engine/metropolis/metropolis-manager.ts`: ADD level 5 permanence check

### UI Components
- `components/game/GameStatus.tsx`: CHANGE from defender badge to token count display
- DELETE: `components/game/ProgressCardChoice.tsx` (not needed)

### API Routes
- DELETE: `app/api/game/[roomId]/progress-card/choose/route.ts` (not needed)

---

## ✅ TESTING UPDATES

### Progress Cards (v2.0):
- [ ] Level 3: can draw if red die ≤ 2
- [ ] Level 4-5: can draw if red die ≤ 3
- [ ] ALL qualifying players draw (test with 3-4 players at level 3+)
- [ ] Each player draws exactly 1 card (not 2)

### Defender Tokens (v2.0):
- [ ] Single highest contributor: gets 1 VP token (permanent)
- [ ] Token count persists across turns and barbarian attacks
- [ ] Multiple tied for highest: NO token, all draw progress card instead
- [ ] Player with 3 tokens shows "3 VP" from defender tokens

### Metropolis (v2.0):
- [ ] Level 4: metropolis can be stolen by level 5 player
- [ ] Level 5: metropolis cannot be stolen (permanent)
- [ ] Stealing attempt at level 5 fails with message

### Barbarian (v2.0):
- [ ] Weakest player with no cities: next weakest loses city
- [ ] Weakest player with only metropolis: next weakest loses city
- [ ] Fallback continues until valid target found
- [ ] All tied players still lose cities (if they have valid cities)

---

## 📝 ESTIMATED EFFORT CHANGES

| Feature | v1 Estimate | v2 Estimate | Change | Reason |
|---------|-------------|-------------|--------|--------|
| Feature 1 | 7-10h | 5-8h | ✅ -2h | Simpler (no modal choice logic) |
| Feature 2 | 2-3h | 3-4h | ⚠️ +1h | More complex (tied defender, tokens) |
| Feature 3 | 4-6h | 5-7h | ⚠️ +1h | Added permanence logic |
| Feature 4 | 4-6h | 4-6h | - | No change |
| Feature 5 | 1-2h | 2-3h | ⚠️ +1h | Complex fallback targeting |
| **Total** | **18-27h** | **19-28h** | **+1h** | Net: simpler cards, complex barbarian |

---

## 🎯 PRIORITY ACTIONS

1. ✅ **UPDATE** repair plan document with v2.0 corrections
2. ✅ **UPDATE** all bead acceptance criteria
3. ✅ **DELETE** ProgressCardChoice.tsx references from plan
4. ✅ **ADD** red die threshold logic to plan
5. ✅ **CHANGE** defender from title to tokens in all docs
6. ✅ **ADD** metropolis permanence at level 5
7. ✅ **ADD** barbarian fallback targeting logic

---

## ⚠️ BREAKING CHANGES

These v2.0 corrections introduce **breaking changes** from v1 plan:

1. **Progress Card UI**: Remove entire modal choice component (was in v1 design)
2. **Defender UI**: Change from ownership badge to token count display
3. **Metropolis Logic**: Add temporary/permanent distinction
4. **Barbarian Logic**: Add complex fallback iteration

**Recommendation**: Implement v2.0 from scratch rather than trying to adapt v1 implementation.
