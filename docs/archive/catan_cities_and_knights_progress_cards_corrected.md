# Catan: Cities & Knights – Progress Cards (Corrected Reference)

This document lists **all 54 Progress Cards** in *Catan: Cities & Knights* with:

- **Name & deck (Science / Trade / Politics)**
- **Official-style effect (concise, rules-accurate)**
- **Implementation notes** to help code the behavior correctly

Card texts are aligned with the official rules and reference sites such as Colonist.io and the Cities & Knights rulebook.


---

## 1. Science Progress Cards (Green)

### Alchemist (×2)
- **Effect:** Play at the beginning of your turn *before* rolling any dice. Choose the results of both production dice (the red and the yellow/normal die), then roll the **event die** and resolve the event. Production then happens using the chosen dice results.
- **Implementation notes:**
  - Only card that can be played **before** rolling dice.
  - Player sets the two production dice; you still roll / resolve the event die normally.
  - The chosen combination may be a 7 (triggering robber / barbarian movement as normal).
  - Cannot be played after any dice roll has already happened this turn.


### Crane (×2)
- **Effect:** When you build a **city improvement** (flip-chart page), you may pay **1 fewer** commodity of the appropriate type.
- **Implementation notes:**
  - Applies only to **one** city improvement purchase.
  - You may reduce the cost of a level 1 improvement from 1 → 0 (free).
  - You **cannot** stack multiple Crane cards on the same improvement.
  - Does *not* change city upgrade cost (settlement → city).


### Engineer (×1)
- **Effect:** Build **one city wall** for free (no brick cost), if you have a city available to place it under.
- **Implementation notes:**
  - Check normal wall rules: max 3 walls total, 1 wall per city, wall destroyed if its city is destroyed.
  - Card does nothing if the player cannot legally place a wall.


### Inventor (×2)
- **Effect:** Swap 2 **number tokens** on the board, but **not** tokens with numbers 2, 12, 6, or 8.
- **Implementation notes:**
  - The hexes do **not** need to belong to the player.
  - You are allowed to move a token on a hex with the robber.
  - You may only select numbers other than {2, 12, 6, 8}. Enforce this constraint in UI.


### Irrigation (×2)
- **Effect:** Collect **2 grain** for each **fields hex** that is adjacent to at least one of your **settlements or cities**.
- **Implementation notes:**
  - Count **hexes**, not buildings. Each qualifying fields hex gives exactly 2 grain.
  - Cities **do not** double this bonus; city vs settlement does not matter.
  - Robber on the field hex does **not** block Irrigation (card effect is independent of robber).


### Medicine (×2)
- **Effect:** You may upgrade **one settlement → city** for **2 ore + 1 grain**, instead of 3 ore + 2 grain.
- **Implementation notes:**
  - Only affects the cost of a single upgrade action.
  - Player must still have a legal settlement to upgrade (and not exceed max cities).
  - Cannot combine two Medicine cards on one upgrade.


### Mining (×2)
- **Effect:** Collect **2 ore** for each **mountains hex** that is adjacent to at least one of your **settlements or cities**.
- **Implementation notes:**
  - Count hexes, not buildings; cities do **not** double this effect.
  - Robber on the mountain does **not** block the Mining effect.


### Printer (×1)
- **Effect:** Grants **1 victory point**.
- **Implementation notes:**
  - When drawn, must be played **immediately, face up** – it never stays in hand.
  - Does **not** count toward the 4-card progress hand limit.
  - Cannot be stolen by Spy.
  - VP persists for the rest of the game.


### Road Building (×2)
- **Effect:** Build **2 roads** for free, following all normal road-building rules.
- **Implementation notes:**
  - Roads need not be adjacent to each other, but each must connect to the player’s network as usual.
  - In combined games with Seafarers, this can be implemented as “2 road/ship edges” (2 roads, or 2 ships, or 1 of each).


### Smith (×2)
- **Effect:** Promote up to **2 of your knights** by one level each (basic → strong, or strong → mighty) for free.
- **Implementation notes:**
  - You may not promote a **mighty** knight (already level 3).
  - Promotion does **not** change activation state (active stays active, inactive stays inactive).
  - Enforce the Fortress requirement: can only have level 3 knights if the player has the level 3 Politics improvement, *unless* the knight came from Deserter.


---

## 2. Trade Progress Cards (Yellow)

### Commercial Harbor (×2)
- **Effect:** You may, player by player, **force trades**: each other player may trade you **1 commodity of their choice** in exchange for **1 of your resources**. You can end this process early and are not required to trade with everyone.
- **Implementation notes:**
  - Iterate over opponents; for each:
    - If they have at least 1 commodity, they *may* trade 1 commodity for 1 of your resources.
    - You may stop using the card before all possible trades are resolved.
  - You must have a resource available to pay for each trade you accept.
  - Direction is always “they give you a commodity; you give them a resource.”


### Master Merchant (×2)
- **Effect:** Choose a player with **more victory points than you**. Look at all their **resource and commodity cards**, then **take any 2** of those cards.
- **Implementation notes:**
  - Target must have strictly higher VP.
  - You see their hand (for UI, show their cards revealed to the acting player only).
  - You then choose exactly 2 cards, unless they have fewer than 2, in which case you take as many as possible.


### Merchant Fleet (×2)
- **Effect:** Choose **1 resource or commodity**. For the remainder of *this turn*, you may trade that chosen type with the bank at a **2:1** rate for any other resource or commodity.
- **Implementation notes:**
  - Applies for the current turn only; expire at end of turn.
  - Works for **either** a resource or a commodity (e.g., you can pick ore or cloth).
  - Does not stack with itself for better than 2:1; just track “this type is 2:1 for this turn.”


### Merchant (×6)
- **Effect:** Move the **Merchant figure** to any resource hex adjacent to one of your settlements or cities. As long as the Merchant remains there and you “control” it:
  - You may trade that **resource** at a **2:1** rate with the bank.
  - You gain **+1 victory point**.
- **Implementation notes:**
  - There is a **single global Merchant piece** shared by all players.
  - Control = Merchant is on a hex where you have a settlement/city on the edge.
  - Only the controller gets the 2:1 trade and the +1 VP.
  - Playing this card always lets you move the Merchant, even if you already control it (move to another of your hexes).


### Resource Monopoly (×4)
- **Effect:** Name **one resource** (brick, lumber, wool, grain, ore). Each player must give you **up to 2** of that resource:
  - If they have ≥2, they give you exactly 2.
  - If they have 1, they give 1.
  - If they have 0, they give none.
- **Implementation notes:**
  - Count all opponents (and you do *not* pay anything).
  - If no one has the named resource, the card still counts as played and is discarded (no “retry”).


### Commodity Monopoly (×2)
- **Effect:** Name **one commodity** (paper, cloth, coin). Each other player must give you **1** of that commodity if they have any.
- **Implementation notes:**
  - Each opponent either gives 1 or 0 (if they have none).
  - As with Resource Monopoly, you do **not** get to choose again if you miscall and nobody has that commodity.


---

## 3. Politics Progress Cards (Blue)

### Bishop (×2)
- **Effect:** Move the **robber** to any hex (cannot be the desert if that’s disallowed at your table) and then draw **1 card from each player** who has a settlement or city on that hex.
- **Implementation notes:**
  - The card taken from each player is a **random card from hand** (resource or commodity).
  - Bishop only moves the robber, not the pirate.
  - Does *not* count as a roll of 7: no discarding, only robber move + steals.


### Constitution (×1)
- **Effect:** Grants **1 victory point**.
- **Implementation notes:**
  - Just like Printer: revealed immediately upon draw, does not count toward progress-card hand limit, cannot be stolen by Spy.


### Deserter (×2)
- **Effect:** Choose an opponent. That opponent must remove **one of their knights of their choice** from the board. You may then place **one of your own knights** of the same strength (basic, strong, or mighty) on any legal intersection in your network for free.
- **Implementation notes:**
  - The target player chooses which of their knights to remove (not you).
  - When you gain the knight, it is placed **inactive** (must still be activated with grain later).
  - You are allowed to end up with a mighty knight even if you don’t have Fortress yet (this is a special exception).


### Diplomat (×2)
- **Effect:** Remove any **open road** (a road segment that has at least one end not connected to a settlement or city). If the removed road is **yours**, you may immediately place that road segment elsewhere as if building it from your supply.
- **Implementation notes:**
  - If the removed road belonged to an opponent, it simply goes back to their supply; you do **not** get to steal it.
  - “Open” should be coded as: at least one endpoint is not adjacent to a building of that road’s owner.


### Intrigue (×2)
- **Effect:** Displace **an enemy knight** that is adjacent to *one of your roads*. The opponent must move that knight to another legal adjacent intersection connected to the same road network; if there is no legal intersection, the knight is removed from the board.
- **Implementation notes:**
  - Check adjacency: knight must touch an intersection on a hex where the road also touches; and the road must be yours.
  - If there is at least one legal new intersection, the opponent chooses where to place it (still following knight placement rules).
  - If no legal new intersection exists, the knight is removed (returned to supply).


### Saboteur (×2)
- **Effect:** All players whose victory point total is **equal to or greater than** yours must discard **half** of their resource and commodity cards, rounded down.
- **Implementation notes:**
  - Includes players **tied** with you, not just those ahead.
  - Discard is chosen by each affected player from their own hand.
  - Discarded cards go to the bank, not to you.


### Spy (×3)
- **Effect:** Choose any one player. Look at all of their **Progress Cards**, then take **one** of those progress cards into your own hand.
- **Implementation notes:**
  - You only see their *progress* cards, not resources/commodities.
  - You cannot steal VP cards (Printer, Constitution), since those are never in hand.
  - After stealing one, the rest of their progress cards are returned to them unchanged.


### Warlord (×2)
- **Effect:** **Activate all of your knights** for free.
- **Implementation notes:**
  - Every knight you own becomes active (standing) without paying grain.
  - Very strong right before a barbarian attack; in code, just set all of the player’s knights’ state to “active”.


### Wedding (×2)
- **Effect:** Each player with **more victory points than you** must give you **2 cards** (resources or commodities) of their choice.
- **Implementation notes:**
  - Only players with strictly more VP are affected; ties are ignored.
  - Each affected player chooses which 2 cards to give you. If they have fewer than 2, they give as many as they can.


---

## 4. Global Progress Card Rules (for Implementation)

These rules apply to all progress cards:

- **When you draw cards**
  - You draw based on the event die icon + your city improvement levels.
  - At level 3+ in a color, you usually draw **2** from that deck and keep **1**.

- **Hand limit**
  - You may hold a maximum of **4 progress cards** in your hand.
  - On **your own turn**, you may temporarily have **5** (e.g., you draw one before discarding/playing). You must end your turn with at most 4.
  - If you ever draw a 5th progress card when it’s *not* your turn, you must immediately discard down to 4.
  - VP cards (Printer, Constitution) are revealed immediately and **do not** count toward this limit.

- **Play timing**
  - **Alchemist**: only card that must be played **before** rolling dice.
  - All other progress cards: may only be played **after** you have rolled the dice for your turn (standard rulebook).
  - You may play **multiple** progress cards on the same turn, as long as their individual requirements are met.

---

## 5. Summary of Earlier Errors (for Fixing Your Implementation)

If you coded from the earlier, incorrect description, check for these specific bugs:

1. **Deck misclassification**
   - `Road Building` and `Smith` belong to the **Science (Green)** deck, not Politics.
2. **Missing cards**
   - Make sure you include:
     - `Constitution` (blue VP card)
     - `Spy` (blue card that steals a progress card)
     - `Commodity Monopoly` (yellow)
     - `Master Merchant` (yellow)
3. **Monopoly effects**
   - `Resource Monopoly` should take **up to 2** of the named resource from **each** opponent (2 if possible, otherwise 1 or 0).
   - `Commodity Monopoly` takes **1** of the named commodity from each opponent who has any (not 2; not resources).
4. **Merchant effect**
   - `Merchant` does **not** produce gold or anything extra when the hex produces; it only grants:
     - 2:1 trade for that resource
     - +1 VP while you control the Merchant
5. **Irrigation & Mining scope**
   - They count **hexes with your settlements OR cities** and give **2** cards per hex.
   - Cities do **not** double the yield; robber does not block these effects.
6. **Inventor restriction**
   - You may **not** swap tokens showing **2, 12, 6, or 8**.
7. **Bishop steal behavior**
   - You **steal 1 random card** from each player with a building on the target hex (not “they choose which to give”). It can be resource or commodity.
8. **Deserter choice**
   - The **targeted player** chooses which of their knights to remove; you don’t pick it.
   - You then place one of your knights of that strength, inactive.
9. **Diplomat limitation**
   - You may relocate the removed road **only if it was your own**. You **cannot** turn an opponent’s road into your road.
10. **Intrigue condition**
    - The knight you move must be **touching one of your roads**, not necessarily adjacent to your knight.
    - If there is no legal intersection to move to, the knight is removed.
11. **Saboteur threshold**
    - Affects players with **equal or more** VP than you (not just strictly more).
12. **Wedding amount**
    - Each affected player must give you **2** cards, not 1.
13. **Progress card timing**
    - All progress cards (except Alchemist) must be played **after the dice roll** for the turn.
14. **Hand limit nuance**
    - Enforce the **“4 cards, 5 temporarily on your turn”** rule and make sure VP cards (Printer, Constitution) do **not** count toward that limit and cannot be stolen.

Use this list as a checklist against your current implementation to clean up any subtle rules drift.
