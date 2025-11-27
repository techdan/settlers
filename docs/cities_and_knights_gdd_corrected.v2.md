# Cities & Knights of Catan — GDD (v2.0 Verified)
*(Original text preserved; v2.0 corrections inserted under each section)*
*(Citations reference the official rulebook CN3087)*

---

# 1. Overview (Original)
Cities & Knights expands Settlers of Catan with deeper strategy, city improvements, commodities, knights, the barbarian fleet, and metropolises. This GDD defines rules, systems, components, and digital adaptation behaviors.

## ✅ v2.0 CORRECTION (Verified)
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

## ✅ v2.0 CORRECTION (Verified)
- [cite_start]**Progress Cards:** There are 54 distinct cards [cite: 39] divided into three decks:
  - [cite_start]**Science (Green):** 18 cards [cite: 40]
  - [cite_start]**Trade (Yellow):** 18 cards [cite: 88]
  - [cite_start]**Politics (Blue):** 18 cards [cite: 89]
- [cite_start]**Metropolis Acquisition:** These are **automatically claimed** by the first player to reach level 4 in an improvement track (if unclaimed) or level 5 (to steal from a level 4 holder)[cite: 302, 303]. [cite_start]They are not "built" manually[cite: 325].

---

# 3. Resources & Commodities (Original)
Standard resources: lumber, brick, wool, grain, ore
Commodities:
- Paper (from forest)
- Cloth (from pasture)
- Coin (from mountain)

## ✅ v2.0 CORRECTION (Verified)
- **Production Logic:**
  - [cite_start]Settlements produce **1 resource** (standard Catan rules)[cite: 243].
  - [cite_start]Cities produce **1 resource AND 1 commodity** if the terrain type supports it (Forest/Pasture/Mountains)[cite: 243].
  - [cite_start]Cities on other terrains (Fields/Hills) produce **2 resources** (2 wheat or 2 brick)[cite: 256, 259].

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

## ✅ v2.0 CORRECTION (Verified)
- **Metropolis Logic:**
  - ❌ **PREVIOUS INCORRECT LOGIC:** "Unlocks ability to build."
  - [cite_start]✅ **v2.0 LOGIC:** Reaching level 4 **automatically grants** the metropolis piece if no one else has it[cite: 302]. [cite_start]Reaching level 5 **securely grants** it permanently (it cannot be stolen once at level 5)[cite: 303].
  - [cite_start]A metropolis is worth **2 extra VPs** (total city value 4 VPs)[cite: 328].
  - [cite_start]A city with a metropolis **cannot be pillaged** by barbarians[cite: 477].

---

# 5. Knights (Original)
Knights are pieces placed on intersections:
- Basic → Strong → Mighty upgrades
- States: active/inactive
- Cost: wool + ore
- Movement along roads (one edge per activation)
- Can chase robber, block, or support barbarian defense.

## ✅ v2.0 CORRECTION (Verified)
- **Costs:**
  - [cite_start]**Recruit:** 1 Wool + 1 Ore[cite: 337].
  - [cite_start]**Activate:** 1 Grain[cite: 366].
  - [cite_start]**Promote:** 1 Wool + 1 Ore[cite: 367].
- **Knight Strength:**
  - Basic = 1 | Strong = 2 | [cite_start]Mighty = 3[cite: 336, 339, 340].
- **Actions:**
  - A knight must be **Active** to perform actions (Move, Displace, Chase Robber).
  - [cite_start]Performing an action renders the knight **Inactive** immediately[cite: 382, 391, 418].
  - [cite_start]**Displacement:** You may only displace an opponent's knight if yours is **stronger**[cite: 390].
  - [cite_start]**Movement:** You cannot move and activate in the same turn, but you *can* activate and then move in the same turn (though moving makes it inactive again)[cite: 364].

---

# 6. Barbarian Mechanics (Original)
- Barbarian marker moves when event die shows “ship”.
- Reaches island → invasion happens.
- Total city strength = # of cities + metropolises
- Total knight strength = active knight values
- If knights >= cities → barbarian defeated
- If cities > knights → weakest player loses a city → settlement

## ✅ v2.0 CORRECTION (Verified)
- [cite_start]**Barbarian Strength:** Equal to the total number of **Cities + Metropolises** on the board[cite: 447].
- [cite_start]**Defender Strength:** Equal to the total strength of all **Active Knights** only[cite: 448].
- **Result - Barbarian Victory (Cities > Knights):**
  - ❌ **PREVIOUS INCORRECT LOGIC:** "Weakest player loses a city" (implied stopping there).
  - [cite_start]✅ **v2.0 LOGIC:** The player with the lowest active knight contribution is the primary target[cite: 474].
  - [cite_start]**Critical Fallback:** If the weakest contributor has **no cities** (only settlements) OR their only city is a **Metropolis** (immune), the barbarians target the player with the **next lowest** active knight contribution[cite: 475].
  - [cite_start]This continues until a valid city is pillaged[cite: 476].
  - [cite_start]If multiple players are tied for lowest, **all tied players** lose a city[cite: 496].
- **Result - Defender Victory (Knights >= Cities):**
  - [cite_start]The single highest contributor gets a **VP Token**[cite: 498].
  - [cite_start]If tied for highest, **no one** gets the token; instead, tied players draw a Progress Card[cite: 499, 500].

---

# 7. Progress Cards (Original)
Triggered by event die showing city-gate color: green/yellow/blue.
Player with improvement ≥3 draws corresponding deck card.
Each deck has ~20 unique abilities (in digital version implement all).
Cards include trade advantages, construction boosts, resources, steals, road building, diplomacy, etc.

## ✅ v2.0 CORRECTION (Verified)
- **Draw Mechanics:**
  - ❌ **PREVIOUS INCORRECT LOGIC:** "Draw 2, keep 1" and "Only one player draws."
  - ✅ **v2.0 LOGIC:**
    1.  [cite_start]**Trigger:** Event Die shows a gate (Green/Blue/Yellow) + Red Die shows a number[cite: 221].
    2.  **Eligibility:**
        - [cite_start]**Level 1-2:** No cards[cite: 29].
        - [cite_start]**Level 3:** Draw if Red Die is **1 or 2**[cite: 29].
        - [cite_start]**Level 4-5:** Draw if Red Die is **1, 2, or 3**[cite: 29].
    3.  [cite_start]**Multiple Winners:** **All players** who qualify based on the die roll draw 1 card[cite: 235]. It is not limited to one player.
    4.  [cite_start]**Quantity:** Draw exactly **1 card** (the topmost)[cite: 223].
- **Hand Limit:**
  - You may hold max **4** progress cards. If it is not your turn, you must discard immediately. [cite_start]If it is your turn, you may hold more but must discard down to 4 by the end of the turn[cite: 428, 429].
  - [cite_start]VP Cards (Printer, Constitution) are played immediately and do not count toward the limit[cite: 431, 432].

---

# 8. Metropolises (Original)
Created when reaching level 4 in a branch.
Three metropolises exist, each permanently tied to a single branch.
Provide:
- +2 victory points
- City immunity from barbarians
- Exclusive: only one player can hold each metropolis

## ✅ v2.0 CORRECTION (Verified)
- [cite_start]**Stealing:** A metropolis is **not** strictly permanent at level 4. If Player A has it at Level 4, and Player B reaches Level 5 in that same track, Player B **takes** the metropolis[cite: 303, 325].
- [cite_start]It becomes permanent only once a player reaches Level 5[cite: 303].

---

# 9. Turn Structure (Original)
1. Roll dice
2. Resolve event die
3. Player actions
4. End turn

## ✅ v2.0 CORRECTION (Verified)
- [cite_start]**Alchemy Exception:** The *Alchemy* progress card is the **only** card played before rolling dice[cite: 209].
- **Dice Sequence:**
  1.  [cite_start]Roll all 3 dice (Red, White, Event)[cite: 211].
  2.  [cite_start]Resolve Event Die (Ship moves OR Progress Cards distributed)[cite: 211, 221].
  3.  [cite_start]Production (Resources/Commodities) distributed based on dice sum[cite: 243].
  4.  [cite_start]Action Phase (Trade, Build, Play Cards)[cite: 262].

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

## ✅ v2.0 CORRECTION (Verified)
- **Largest Army:**
  - ❌ **PREVIOUS INCORRECT LOGIC:** "Largest Army of active knights (2)."
  - [cite_start]✅ **v2.0 LOGIC:** The "Largest Army" card is **removed** from the game in Cities & Knights[cite: 31].
- **Defender of Catan:**
  - ❌ **PREVIOUS INCORRECT LOGIC:** "Defender VP can be lost."
  - [cite_start]✅ **v2.0 LOGIC:** These are physical **VP Tokens** (worth 1 VP each) awarded for being the strongest defender[cite: 498]. [cite_start]There are 6 tokens total[cite: 86]. Once earned, they are kept (unless the player exceeds 13+ points and wins). They function as permanent +1 VP items, not a transferable title like "Longest Road."

---

# 11. Digital Adaptation Rules (Original)
(Various interface/UX rules)

## ✅ v2.0 CORRECTION (Verified)
No rule changes, but UI must reflect the "Next Lowest" barbarian targeting and the simultaneous Progress Card draws.

---

# 12. Data Model (Original)
(Player, Board, Game State definitions)

## ✅ v2.0 CORRECTION (Verified)
**Required Fields:**
- [cite_start]`progress_hand_limit`: Fixed at 4[cite: 428].
- `metropolis_owner`: Needs logic for "Level 4 (Temporary)" vs "Level 5 (Permanent)" ownership logic.
- [cite_start]`defender_vp_tokens`: Integer count per player (not a boolean flag)[cite: 86].
- [cite_start]`knight_strength`: Enum (1, 2, 3)[cite: 336].
- [cite_start]`knight_status`: Enum (Active, Inactive)[cite: 335].

---

# 13–15. AI, Edge Cases, Multiplayer (Original)

## ✅ v2.0 CORRECTION (Verified)
**Key Edge Cases:**
- [cite_start]**Barbarian Tie:** If multiple players tie for lowest contribution, **ALL** of them lose a city[cite: 496].
- **Metropolis Immunity:** The pillage logic must skip cities with Metropolises and check if the player has *any* valid non-metropolis cities. [cite_start]If not, the target moves to the next player[cite: 475, 477].
- **Progress Card Deck Empty:** (Implicit standard rule) If a deck is empty, no card is drawn.