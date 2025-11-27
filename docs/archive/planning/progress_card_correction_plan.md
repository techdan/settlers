# Progress Card Correction Plan

**Date:** 2025-11-26
**Status:** NEW PLAN based on corrected documentation

## Critical Discovery

The original source document (`catan_progress_cards.md`) had **major errors**. The corrected version (`catan_cities_and_knights_progress_cards_corrected.md`) reveals significant discrepancies.

---

## KEY CORRECTIONS NEEDED

### 1. **DECK CLASSIFICATIONS - MAJOR ERROR**

**Current (WRONG):**
- Science: 8 cards (missing Road Building and Smith)
- Trade: 6 cards
- Politics: 10 cards (has Road Building + Smith incorrectly)

**Correct:**
- Science: 10 cards (includes Road Building ×2, Smith ×2)
- Trade: 8 cards (add Commodity Monopoly ×2, Master Merchant ×2)
- Politics: 10 cards (already has Spy ×3, Constitution ×1)

**CRITICAL FIX:** Road Building and Smith are **SCIENCE cards**, not Politics!

---

## 2. **MONOPOLY CARDS - COMPLETELY WRONG EFFECTS**

### Resource Monopoly (×4)
**Current (WRONG):** Takes **1** per player
**Correct:** Takes **up to 2** per player:
- If opponent has ≥2: take exactly 2
- If opponent has 1: take 1
- If opponent has 0: take 0

### Commodity Monopoly (×2)
**Current:** Called "trade_monopoly", takes **1** per player ✅ (this is correct)
**Correct name:** Should be "Commodity Monopoly" not "Trade Monopoly"

---

## 3. **MISSING CARDS - NEED TO ADD**

Currently have 24 card types. Should have 18 unique types (54 total cards with multiples).

**Missing from implementation:**
- None! (We already have all unique types)

**But wrong names/categories:**
- `trade_monopoly` should be renamed to `commodity_monopoly`
- `constitution` exists (correct - it's the Politics VP card, not "Constable")

---

## 4. **INVENTOR - WRONG CONSTRAINT**

**Current:** Cannot swap tokens on opponent's hexes
**Correct:** Cannot swap tokens showing **2, 12, 6, or 8** (regardless of ownership)

---

## 5. **IRRIGATION & MINING - ROBBER HANDLING**

**Current Implementation:** Mining checks robber ✅ Correct
**Correct Rule:** Robber does **NOT** block Irrigation or Mining!

**FIX:** Remove robber check from Mining implementation

---

## 6. **MERCHANT - NO GOLD PRODUCTION**

**Current (from earlier work):** Mentioned adding "gold when hex produces"
**Correct:** Merchant does NOT produce gold. Only:
- 2:1 trade for that resource
- +1 VP while controlling

---

## 7. **BISHOP - RANDOM STEAL**

**Current:** Takes "first available resource" (opponent doesn't choose)
**Correct:** Takes **1 random card** from each player on hex (resource or commodity)

Implementation is close but should be explicitly random.

---

## 8. **INTRIGUE - WRONG ADJACENCY**

**Current:** "opponent's knight must be adjacent to your knight"
**Correct:** Enemy knight must be adjacent to **one of your roads**, not your knight!

---

## 9. **SABOTEUR - WRONG THRESHOLD**

**Current:** Affects opponents with "more VP"
**Correct:** Affects players with **equal to or greater than** your VP (includes ties!)

---

## 10. **WEDDING - WRONG AMOUNT**

**Current:** Takes **1** card per opponent
**Correct:** Takes **2** cards per opponent (or as many as they have if <2)

---

## 11. **COMMERCIAL HARBOR - WRONG EFFECT**

**Current:** Exchange 1 commodity for 2 different commodities from opponent
**Correct:** **Force trades** - iterate through opponents, each may trade you 1 commodity for 1 of your resources. You can stop early.

Completely different mechanic!

---

## 12. **DIPLOMAT - CLARIFICATION NEEDED**

**Current:** Can relocate removed road if it's your own
**Correct:** Same, but clarify "open road" = at least one end not connected to a settlement/city

---

## 13. **CONSTITUTION vs CONSTABLE**

**Original doc said:** Rename "constitution" to "constable"
**Corrected doc says:** Card is actually **Constitution** (Politics VP card)

The current name is CORRECT. Do not rename.

---

## 14. **SPY CARD - IS OFFICIAL**

**Original doc said:** Remove Spy (not official)
**Corrected doc says:** Spy (×3) is an official Politics card

The card is CORRECT. Do not remove.

---

## 15. **DECK COUNTS**

**Correct distribution (18 unique types, 54 total cards):**

### Science (10 cards, 18 total)
- Alchemist ×2
- Crane ×2
- Engineer ×1
- Inventor ×2
- Irrigation ×2
- Medicine ×2
- Mining ×2
- Printer ×1
- Road Building ×2
- Smith ×2

### Trade (8 cards, 16 total)
- Commercial Harbor ×2
- Master Merchant ×2
- Merchant ×6
- Merchant Fleet ×2
- Resource Monopoly ×4
- Commodity Monopoly ×2

### Politics (10 cards, 20 total)
- Bishop ×2
- Constitution ×1
- Deserter ×2
- Diplomat ×2
- Intrigue ×2
- Saboteur ×2
- Spy ×3
- Warlord ×2
- Wedding ×2

---

## IMPLEMENTATION PLAN

### Phase 1: CRITICAL Fixes (Priority 0)

1. ✅ **DONE** - Move Road Building from Politics to Science (REVERTED!)
2. ✅ **DONE** - Move Smith from Science comments (already in Science)
3. **TODO** - Fix Resource Monopoly: change from 1 → up to 2 per player
4. **TODO** - Rename trade_monopoly → commodity_monopoly
5. **TODO** - Fix Wedding: change from 1 → 2 cards per opponent

### Phase 2: Effect Corrections (Priority 1)

6. **TODO** - Fix Inventor: check for numbers {2,12,6,8}, not ownership
7. **TODO** - Fix Mining: remove robber blocking (robber doesn't block)
8. **TODO** - Fix Intrigue: adjacent to YOUR ROADS, not your knight
9. **TODO** - Fix Saboteur: include players with EQUAL VP, not just more
10. **TODO** - Fix Commercial Harbor: complete rewrite (force trades mechanic)
11. **TODO** - Fix Bishop: explicitly random steal
12. **TODO** - Remove Merchant gold production mention (if added)

### Phase 3: Documentation & Naming (Priority 2)

13. **TODO** - Keep Constitution name (don't rename to Constable)
14. **TODO** - Keep Spy card (don't remove)
15. **TODO** - Update all card descriptions to match corrected doc
16. **TODO** - Update deck creation to proper card counts (×2, ×3, ×4, ×6 multiples)

---

## FIXES ALREADY MADE (That Were Correct)

✅ Alchemist - dice manipulation (correct in current impl)
✅ Crane - city improvement discount (correct)
✅ Engineer - free city wall (correct)
✅ Medicine - city upgrade discount (correct)
✅ Smith - 2 knights (correct)
✅ Irrigation - 2 grain per field hex (correct, but need to remove robber check if added)
✅ Deserter - steal knight (correct)
✅ Diplomat - remove open road (correct, yours = relocate)
✅ Warlord - activate all knights (correct)

---

## SUMMARY OF CHANGES

**Revert:**
- Road Building back to Science (currently in Politics)

**Major rewrites needed:**
- Commercial Harbor (completely wrong effect)
- Resource Monopoly (1 → up to 2)
- Wedding (1 → 2 cards)
- Intrigue (knight adjacency → road adjacency)

**Medium fixes:**
- Inventor (ownership → number restriction)
- Mining (remove robber check)
- Saboteur (include equal VP)
- Bishop (make random explicit)

**Naming:**
- trade_monopoly → commodity_monopoly
- Keep Constitution (don't rename)
- Keep Spy (don't remove)

**Total cards to fix:** 12 cards need changes
