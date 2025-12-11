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

## ✅ v2.1 CORRECTION (Updated)
### **Level 3 Special Abilities:**
Reaching Level 3 in an improvement track unlocks a special ability:

1.  **Science (Green) → The Aqueduct:**
    *   **Effect:** If you receive **no production** (resources or commodities) from the dice roll (excluding a '7'), you may take **1 resource of your choice** from the bank.
    *   **Trigger:** End of Distribution Phase.
    *   **Condition:** `dice_roll != 7` AND `total_cards_received == 0`.
    *   **Edge Case:** If you receive a commodity but no resources, you *did* receive production, so Aqueduct does **not** trigger.
    *   **Robber:** If the Robber blocks your only producing hex, you received 0 cards, so Aqueduct **does** trigger.

2.  **Trade (Yellow) → The Trading House:**
    *   **Effect:** You may trade **2 identical commodities** (Paper, Cloth, or Coin) for any **1 resource or commodity** of your choice.
    *   **Ratio:** 2:1 (Commodities only).
    *   **Constraint:** You cannot trade 2 Resources for 1 Item using this ability (unless you have a standard 2:1 port). This is exclusive to Commodity inputs.

3.  **Politics (Blue) → The Fortress:**
    *   **Effect:** You may promote **Strong Knights** (Level 2) to **Mighty Knights** (Level 3).
    *   **Constraint:** Without this improvement, the maximum knight level is Strong (Level 2).
    *   **Cost:** Standard promotion cost (1 Wool + 1 Ore).

---

# 5. Knights (Original)
Knights are pieces placed on intersections:
- Basic → Strong → Mighty upgrades
- States: active/inactive
- Cost: wool + ore
- Movement along roads (one edge per activation)
- Can chase robber, block, or support barbarian defense.

## ✅ v2.1 CORRECTION (Updated)
- **Knight Pieces Per Player:**
  - Each player has exactly **6 knights total**:
    - 2 Basic knights (strength 1)
    - 2 Strong knights (strength 2)
    - 2 Mighty knights (strength 3)
  - Knights are upgraded in place (Basic → Strong → Mighty)
  - Cannot recruit more knights once all 6 are on the board

- **Costs:**
  - **Recruit:** 1 Wool + 1 Ore
  - **Activate:** 1 Grain
  - **Promote:** 1 Wool + 1 Ore

- **Knight Strength:**
  - Basic = 1 | Strong = 2 | Mighty = 3

- **Activation & Action Timing (Corrected):**
  - Performing ANY knight action immediately makes the knight **Inactive**.
  - **Allowed (same turn):**
    - Recruit → Activate
    - Action (becomes Inactive) → Activate
  - **Not Allowed:**
    - Activate → Action (the same knight cannot activate and then act)

- **Actions (All Auto-Deactivate):**
  - Knight must be **Active** to Move, Displace, or Chase the Robber.
  - **Move:** An active knight can move to any empty intersection connected by a continuous path of the player's own roads.
    - Can pass through intersections occupied by own pieces
    - Cannot end on occupied intersection (even own knight)
    - Knight becomes **Inactive** after move
  - **Displacement:** A knight may displace only a **weaker** knight.
    - Move your active knight to an enemy knight's intersection (must be connected by your roads)
    - Displaced knight owner must immediately move it to any empty intersection connected by **their own roads** from the displacement point
    - Displaced knight retains its active/inactive status
    - Can return to original spot if connected and empty after displacing knight occupies it
    - If no valid destination exists along owner's road network, knight is **permanently removed** from board
    - Moving knight becomes **Inactive** after displacement
  - **Chase Robber:** An active knight adjacent to robber may chase it.
    - Robber must be moved to a new hex (follows standard robber placement rules)
    - Knight becomes **Inactive** after chasing robber
  - **Barbarian Attack:** ALL active knights become **Inactive** after barbarian resolution (win or lose)

- **Knight States:**
  - Active: can act
  - Inactive: must be reactivated with grain (manual action only)
  - **No manual deactivation**: Knights are only deactivated automatically by actions or barbarian attacks  

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
  - [cite_start]✅ **v2.0 LOGIC:** The player(s) with the lowest active knight contribution are the primary targets[cite: 474].
  - [cite_start]**Tie-Breaking:** If multiple players are tied for lowest strength, **all tied players** must lose a city[cite: 496].
  - [cite_start]**Critical Fallback (Cascade):** If a targeted player (weakest or tied for weakest) has **no cities** (only settlements) or only **Metropolises** (immune), they are skipped. The penalty moves to the **next lowest** eligible player(s) (or group of tied players) until at least one city is lost[cite: 475, 476].
  - [cite_start]**Outcome:** The attack ends once a city (or cities from a tied group) is destroyed. If no one in the entire game has a destroyable city, no penalty occurs.
- **Result - Defender Victory (Knights >= Cities):**
  - [cite_start]The single highest contributor gets a **VP Token**[cite: 498].
  - [cite_start]If tied for highest, **no one** gets the token; instead, tied players draw a Progress Card[cite: 499, 500].

---

# 6.5. Robber Delay Rule (Cities & Knights)

## ✅ v2.1 ADDITION (Verified)

In Cities & Knights mode, the **Robber remains on the desert hex and does not move** until **after the first barbarian attack** on Catan.

### **Rules:**
1. **Rolling a 7 Before First Attack:**
   - Players with more than 7 cards (adjusted for city walls: 7 + 2 per wall) **must still discard half** their cards.
   - The Robber **does NOT move** from the desert hex.
   - No player steals cards.
   - The game proceeds directly to the main phase after discarding is complete.

2. **Knight Actions Before First Attack:**
   - Knights **cannot chase the robber** if they move adjacent to it.
   - The knight move is still valid, but no robber placement phase is triggered.

3. **Progress Cards Before First Attack:**
   - The **Bishop (Taxation)** progress card **cannot be played** before the first barbarian attack (it requires moving the robber).

4. **Development Cards Before First Attack:**
   - **Knight development cards** (from base game, if somehow in deck) **cannot be played** before the first barbarian attack.

5. **After First Attack:**
   - Once the barbarian ship reaches position 7 and the first attack is resolved, the robber functions normally for the rest of the game.
   - All subsequent 7 rolls trigger normal robber movement and stealing.
   - Knights can chase the robber.
   - Bishop and Knight cards can be played normally.

### **Implementation:**
- `gameState.hasBarbariansAttacked` flag tracks whether the first attack has occurred.
- Initialized to `false` at game start in C&K mode.
- Set to `true` when `barbarianPosition >= 7`.

---

# 7. Progress Cards (Original)
Triggered by event die showing city-gate color: green/yellow/blue.
Player with improvement ≥3 draws corresponding deck card.
Each deck has ~20 unique abilities (in digital version implement all).
Cards include trade advantages, construction boosts, resources, steals, road building, diplomacy, etc.

## ✅ v2.1 CORRECTION (Updated)
### **Draw Mechanics:**
1. **Trigger:** Event Die shows a gate (Green/Yellow/Blue).
2. **Eligibility:** A player draws **one** card from that deck if:
   - They have **level ≥ 1** in that improvement track, AND  
   - The **Red Die** result is within that level’s range:

| Level | Red Die Range |
|-------|----------------|
| 0 | — |
| 1 | 1–2 |
| 2 | 1–3 |
| 3 | 1–4 |
| 4 | 1–5 |
| 5 | 1–6 |

3. **Multiple Winners:** All eligible players draw.  
4. **Quantity:** Exactly **one** card per eligible player.

### **Hand Limit:**
- Maximum **4** progress cards at end of your turn.
- If you exceed 4 during **another player's turn**, discard immediately.
- VP cards (**Printing**, **Constitution**) are played immediately, cannot be stolen, and do **not** count toward hand limit.

### **Play Timing:**
- **Alchemy** is the ONLY progress card playable **before** rolling dice.
- All other cards must be played **after** rolling dice on your turn.

### **Deck Structure:**
- Each deck contains **18 cards** (total 54).

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