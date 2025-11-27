# Cities & Knights of Catan — GDD with Inline Corrections  
*(Original text preserved; corrections inserted under each section)*  
*(Citations reference the official rulebook CN3087)*

---

# 1. Overview (Original)
Cities & Knights expands Settlers of Catan with deeper strategy, city improvements, commodities, knights, the barbarian fleet, and metropolises. This GDD defines rules, systems, components, and digital adaptation behaviors.

## ✔ Correction
No changes required.

---

# 2. Core Additions (Original)
- Commodities (paper, cloth, coin)
- City Improvements (Science, Trade, Politics)
- Knights (basic/strong/mighty)
- Barbarian track + invasion resolution
- Metropolises
- Progress Cards (green, yellow, blue)
- Events Dice + Barbarian marker

## ⚠ Correction
- Progress cards are not general categories; they are a **fixed set** of card types:
  - **Science: 10 types**
  - **Trade: 6 types**
  - **Politics: 9 types**
- Metropolises are **not built manually**. They are **automatically awarded** when reaching improvement level 4 in a branch, per rulebook.

---

# 3. Resources & Commodities (Original)
Standard resources: lumber, brick, wool, grain, ore  
Commodities:  
- Paper (from forest)  
- Cloth (from pasture)  
- Coin (from mountain)

## ⚠ Correction
- Cities produce **both** a resource and a commodity.
- Settlements produce **only resources**.
- This difference must be explicitly encoded.

---

# 4. City Improvements (Original)
Three improvement tracks:
- Science → paper  
- Trade → cloth  
- Politics → coin  

Leveling costs:  
1→2: 1 commodity  
2→3: 2 commodities  
3→4: 3 commodities  
4→5: 4 commodities  

Reaching level 3 unlocks Progress Cards.  
Reaching level 4 unlocks ability to build a Metropolis.

## ❗ Correction
- City improvements do not “unlock ability to build” a metropolis.
- Reaching **level 4** immediately **claims** that branch’s metropolis, if unclaimed.
- Reaching **level 5** allows taking a metropolis from another player.
- Metropolises grant **+2 VP** and **barbarian immunity** to the city.

---

# 5. Knights (Original)
Knights are pieces placed on intersections:
- Basic → Strong → Mighty upgrades  
- States: active/inactive  
- Cost: wool + ore  
- Movement along roads (one edge per activation)  
- Can chase robber, block, or support barbarian defense.

## ❗ Correction
Missing official rules:
- Activation cost: **1 grain**, not wool/ore.
- Upgrade cost: **wool + ore**.
- Knight strengths: Basic=1, Strong=2, Mighty=3.
- Only **active** knights:
  - contribute to barbarian defense
  - can displace weaker knights
  - can chase the robber
- Displacement rules:
  - A knight can displace only a **weaker** knight.
  - Ties cannot displace.
  - Intrigue can displace without having your own knight present.
- Knight movement consumes the **activation action**, not the upgrade.

---

# 6. Barbarian Mechanics (Original)
- Barbarian marker moves when event die shows “ship”.  
- Reaches island → invasion happens.  
- Total city strength = # of cities + metropolises  
- Total knight strength = active knight values  
- If knights >= cities → barbarian defeated  
- If cities > knights → weakest player loses a city → settlement  

## ❗ Correction
Several inaccuracies:
- Barbarian strength = **total cities on board** (metropolises count as cities).
- Knight strength = **total active knight strength** (Basic=1, Strong=2, Mighty=3).
- If knights < barbarian strength:
  - Only players with **lowest knight contribution** lose a city.
  - If tied, all tied players lose a city.
- Metropolis cities **cannot be destroyed**.
- Barbarian always targets cities (not settlements).
- After invasion, barbarian returns to start.

---

# 7. Progress Cards (Original)
Triggered by event die showing city-gate color: green/yellow/blue.  
Player with improvement ≥3 draws corresponding deck card.  
Each deck has ~20 unique abilities (in digital version implement all).  
Cards include trade advantages, construction boosts, resources, steals, road building, diplomacy, etc.

## ❗ Correction
- Exact rules:
  - Must have improvement **level ≥3**.
  - At level 3+, draw **2**, keep **1**.
  - Only **one progress card per event die**, even if multiple players qualify.
- Hand limit:
  - Max **4 progress cards** in hand at end of your turn.
  - May temporarily hold **5** during your turn.
  - VP cards (Printing, Constitution) are played immediately and **not kept**.
- Only **Alchemy** is played before rolling; all others must be played after rolling.
- Progress card abilities are fixed and must match official card definitions.

---

# 8. Metropolises (Original)
Created when reaching level 4 in a branch.  
Three metropolises exist, each permanently tied to a single branch.  
Provide:
- +2 victory points  
- City immunity from barbarians  
- Exclusive: only one player can hold each metropolis

## ✔ Correction
Mostly correct, but add:
- If another player reaches **level 5** in that branch, they may steal the metropolis.

---

# 9. Turn Structure (Original)
1. Roll dice  
2. Resolve event die  
3. Player actions  
4. End turn

## ❗ Correction
Missing:
- Resource production occurs immediately after number roll.
- Event die triggers:
  - Ship → barbarian moves  
  - Gate color → progress card  
- Player actions include:
  - maritime/domestic trade  
  - building  
  - knight activation (1 grain)  
  - knight movement (after activation)  
  - robber displacement via knight  
- Progress cards must be played **after dice roll**, except Alchemy.

---

# 10. Victory Conditions (Original)
Victory threshold changes:
- Base game: 10  
- Cities & Knights: **13**  
Points include:  
- Settlements (1)  
- Cities (2)  
- Metropolises (+2)  
- Largest army of active knights (2)  
- Special cards / achievements  

## ❗ Correction
- **Largest Army does NOT exist** in Cities & Knights.
- Instead:
  - **Defender of Catan** = 1 VP  
  - Awarded to highest contributing defender in successful barbarian defense.
- Defender VP can be lost if another player wins it later.

---

# 11. Digital Adaptation Rules (Original)
(Various interface/UX rules)

## ✔ Correction
Mostly UI; no issues.

---

# 12. Data Model (Original)
(Player, Board, Game State definitions)

## ⚠ Correction
Add:
- `cityWalls`: count per player  
- `metropolis`: location + ownership  
- `progressHandLimit` logic  
- Knight strength and status fields  
- Active/inactive flags  
- Event die state

---

# 13–15. AI, Edge Cases, Multiplayer (Original)

## ❗ Correction
Missing critical edge cases:
- Progress hand overflow  
- Knight displacement conflicts  
- Simultaneous metropolis claim resolution  
- Barbarian destruction handling when multiple weakest players  
- VP cards not storable in hand  
- Knight activation before movement

---

# END OF DOCUMENT  
This file preserves the **original GDD**, highlights **incorrect logic**, and embeds **official-rule corrections** required for accurate implementation.

