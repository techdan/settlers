# Cities & Knights Repair Implementation Plan

**Epic**: Fix 15 Critical C&K Errors Based on Corrected GDD
**Version**: 1.0
**Date**: 2025-11-27
**Estimated Effort**: 19-28 hours

---

## Executive Summary

This document provides a complete implementation plan to fix 15 critical errors in the Cities & Knights expansion, identified by comparing the implementation against the official corrected GDD. All errors have been categorized by severity and organized into 5 feature-complete implementations.

### Critical Issues Overview

- **4 CRITICAL** (game-breaking): Victory conditions, progress cards, metropolis, knight displacement
- **5 HIGH PRIORITY** (incorrect gameplay): Card drawing, hand limits, VP cards, displacement
- **6 MEDIUM PRIORITY** (edge cases): Alchemy timing, barbarian ties, Intrigue card, UI

---

## Error Categories & Fixes

### CRITICAL Errors

| ID | Error | Current Behavior | Correct Behavior | Fix Location |
|----|-------|------------------|------------------|--------------|
| C1 | Largest Army awards VP in C&K | Awards 2 VP | Should NOT award VP | victory-conditions.ts:60-63 |
| C2 | Defender of Catan missing | Doesn't exist | Awards 1 VP to best defender | barbarian-manager.ts, GameState type |
| C3 | Progress cards at level 1 | Level 1 can draw | Level 3+ only | improvement-manager.ts:199 |
| C4 | Manual metropolis building | Requires button click | Auto-award at level 4 | improvement-manager.ts, CityImprovements.tsx |

### HIGH PRIORITY Errors

| ID | Error | Current Behavior | Correct Behavior | Fix Location |
|----|-------|------------------|------------------|--------------|
| H1 | Multiple players draw | All eligible draw | Only ONE player per die | event-die-manager.ts:123-151 |
| H2 | No "draw 2 keep 1" | Draws 1 card | Level 3+: draw 2, choose 1 | progress-card-manager.ts:21-59 |
| H3 | No hand limit | Unlimited cards | Max 4 at turn end | game-service.ts endTurn |
| H4 | VP cards in hand | Stored like normal | Auto-play immediately | progress-card-manager.ts |
| H5 | No displacement validation | No strength check | Only displace weaker | knight-validator.ts |

### MEDIUM PRIORITY Errors

| ID | Error | Current Behavior | Correct Behavior (v2.0) | Fix Location |
|----|-------|------------------|------------------|--------------|
| M1 | Alchemy timing blocked | Can't play before roll | Playable before roll | progress-card/route.ts:59-64 |
| M2 | Barbarian fallback missing | Stops at weakest | Next weakest if no valid city | barbarian-manager.ts:192-235 |
| M3 | Intrigue ignores strength | Displaces any knight | Respects strength rules | progress-card-manager.ts:818-865 |
| M4 | Defender as transferable title | Like Longest Road | Physical VP tokens (keep forever) | GameStatus.tsx, GameState type |
| M5 | No temp hand limit | Not enforced | 5 during turn, 4 after | progress-card-manager.ts |
| M6 | Metropolis at level 4 permanent | Cannot be stolen | Only permanent at level 5 | improvement-manager.ts |

---

## Implementation Features (Feature-by-Feature Approach)

### Feature 1: Progress Card System (v2.0 UPDATED)

**Phases**: 2, 3, 6
**Errors Fixed**: C3, H1, H2, H3, H4, M1, M5
**Estimated Effort**: 5-8 hours (REDUCED - simpler than v1)

#### v2.0 Changes Required:

1. **Fix level requirement** (C3)
   - File: `core/engine/improvements/improvement-manager.ts:199`
   - Change: `if (level < 1)` → `if (level < 3)`

2. **Implement RED DIE threshold system** (H1 - v2.0)
   - File: `core/engine/dice/event-die-manager.ts:123-151`
   - **v2.0 Logic:**
     ```typescript
     // Level 1-2: No cards
     // Level 3: Draw if red die is 1 or 2
     // Level 4-5: Draw if red die is 1, 2, or 3

     function canDrawProgressCard(player, category, redDieValue) {
       const level = player.improvements?.[category] || 0;
       if (level < 3) return false;

       const threshold = level >= 4 ? 3 : 2;  // Level 4-5: red≤3, Level 3: red≤2
       return redDieValue <= threshold;
     }
     ```

3. **ALL qualifying players draw** (H1 - v2.0)
   - File: `core/engine/dice/event-die-manager.ts:123-151`
   - ❌ **REMOVE v1 logic**: "Only ONE player draws per die"
   - ✅ **v2.0 Logic**: ALL players who meet red die threshold draw 1 card each
   - No priority/selection needed - everyone eligible draws simultaneously

4. **Draw exactly 1 card** (H2 - v2.0)
   - File: `core/engine/progress/progress-card-manager.ts`
   - ❌ **REMOVE v1 logic**: "Draw 2 keep 1" with modal choice
   - ❌ **DELETE components**: `ProgressCardChoice.tsx` (not needed in v2.0)
   - ❌ **DELETE endpoint**: `choose/route.ts` (not needed in v2.0)
   - ✅ **v2.0 Logic**: Draw exactly 1 card from top of deck (topmost card)

4. **VP card handling** (H4)
   - File: `core/engine/progress/progress-card-manager.ts`
   - New field: `PlayerState.revealedVPCards`
   - Logic: VP cards (Printer/Constitution) go to `revealedVPCards`, not hand
   - UI: Display VP cards in player card (show icons for Printer +1 VP, Constitution +1 VP)
   - Victory calculation: Count VP cards in `revealedVPCards` array

5. **Hand limits** (H3, M5)
   - File: `lib/services/game-service.ts` (endTurn)
   - Logic: Prevent turn end if >4 cards, allow 5 during turn
   - New endpoint: `app/api/game/[roomId]/progress-card/discard/route.ts`
   - UI: `components/game/ProgressCardHand.tsx` - show limit, discard buttons

6. **Alchemy timing** (M1)
   - File: `app/api/game/[roomId]/progress-card/route.ts:59-64`
   - Logic: Allow Alchemy in 'waiting_for_roll' phase, others only 'main_phase'

#### Player Card Display Updates:
- **VP Progress Cards**: Printer and Constitution icons displayed in player card
- **Merchant Card**: Display Merchant icon in player card when active (grants 1 VP)
- Note: Merchant progress card logic should track which player currently has it active

#### Testing (v2.0 UPDATED):
- [ ] Can only draw at level 3+ (not level 1-2)
- [ ] Level 3: draws if red die ≤ 2
- [ ] Level 4-5: draws if red die ≤ 3
- [ ] ALL qualifying players draw (not just one)
- [ ] Each player draws exactly 1 card (not 2)
- [ ] VP cards don't appear in hand
- [ ] VP cards (Printer, Constitution) display in player card
- [ ] Merchant displays in player card when active
- [ ] Cannot end turn with >4 cards
- [ ] Can hold 5 during turn
- [ ] Alchemy playable before roll
- [ ] All card draws logged to game log
- [ ] VP card reveals logged with "+1 VP" message
- [ ] Hand limit warnings logged
- [ ] Card plays logged with card name

---

### Feature 2: Victory Conditions (v2.0 UPDATED)

**Phases**: 1
**Errors Fixed**: C1, C2, M4
**Estimated Effort**: 2-3 hours

#### v2.0 Changes Required:

1. **Add Defender VP Tokens field** (C2 - v2.0)
   - File: `lib/types/player.ts`
   - ❌ **REMOVE v1**: `GameState.defenderOfCatan: string | null` (transferable title)
   - ✅ **v2.0 ADD**: `PlayerState.defenderVPTokens: number` (physical tokens, default 0)
   - **v2.0 Logic**: There are 6 total VP tokens. Once earned, they are KEPT permanently (not transferred like Longest Road)

2. **Fix VP calculation** (C1, C2 - v2.0)
   - File: `core/rules/victory-conditions.ts:60-63, 105-108`
   - Wrap Largest Army in: `if (gameMode !== 'cities_and_knights')`
   - ✅ **v2.0 ADD**: `points += player.defenderVPTokens` (each token = 1 VP)

3. **Award Defender VP Token after barbarian defense** (C2 - v2.0)
   - File: `core/engine/barbarian/barbarian-manager.ts:58-70`
   - **v2.0 Logic**:
     ```typescript
     // After successful defense
     const highestContributor = getHighestContributor(gameState);
     if (highestContributor.length === 1) {
       // Single highest: award 1 VP token (permanent)
       highestContributor[0].defenderVPTokens += 1;
       log: "Player earned a Defender of Catan token! (+1 VP)"
     } else {
       // Tied for highest: NO token awarded, tied players draw progress card instead
       for (const player of highestContributor) {
         drawProgressCard(player, randomCategory);
       }
       log: "Players tied for defense - each draws a progress card"
     }
     ```

4. **Initialize in game start** (C2 - v2.0)
   - File: `lib/services/game-service.ts:148`
   - ❌ **REMOVE**: `defenderOfCatan: null`
   - ✅ **v2.0 ADD**: Initialize each player with `defenderVPTokens: 0`

5. **Update Player Card UI** (M4)
   - File: `components/game/GameStatus.tsx:97-102`
   - **Knight Strength Display**:
     - Base game: Show "Army" (total knights played from dev cards)
     - C&K mode: Show "Defense" (active knight strength: sum of active knight levels)
   - **Victory Point Achievements**:
     - Base game: Show "Largest Army" icon/badge if player owns it (2 VP)
     - C&K mode: Show "Defender of Catan" icon/badge if player owns it (1 VP)
   - **VP Progress Cards**:
     - Display icons for revealed VP cards (Printer +1 VP, Constitution +1 VP)
     - Show in player card's VP section
   - **Merchant**:
     - Display Merchant icon/badge if player currently has Merchant active (1 VP)
     - Show in player card's VP section

#### Testing:
- [ ] C&K: Defender of Catan awards 1 VP after defense
- [ ] C&K: Largest Army does NOT award VP
- [ ] Base game: Largest Army still works (2 VP)
- [ ] Defender can be lost to another player
- [ ] Player card shows Defender badge/icon in C&K mode
- [ ] Player card shows knight strength (not knights played) in C&K mode
- [ ] Player card shows Largest Army badge/icon in base game mode
- [ ] VP progress cards (Printer, Constitution) display in player card
- [ ] Merchant displays in player card when active
- [ ] Defender award logged: "Player is now Defender of Catan! (+1 VP)"
- [ ] Defender loss logged when another player takes it

---

### Player Card UI Specification

**Component**: `components/game/GameStatus.tsx` or `components/game/PlayerCard.tsx`

The player card must display different information based on game mode:

#### Base Game Mode:
- **Army**: Total knights played (from development cards)
- **Largest Army Badge**: Icon/badge shown if player owns Largest Army (2 VP)
- **VP Display**: Settlement (1), City (2), Dev Cards (varies), Longest Road (2), Largest Army (2)

#### Cities & Knights Mode:
- **Defense**: Active knight strength (sum of active knight levels: basic=1, strong=2, mighty=3)
- **Defender of Catan Badge**: Icon/badge shown if player owns Defender of Catan (1 VP)
- **VP Progress Cards**: Icons for Printer (+1 VP) and Constitution (+1 VP) if revealed
- **Merchant**: Icon/badge shown if player currently has Merchant active (1 VP)
- **VP Display**: Settlement (1), City (2), Metropolis (2 each), Dev Cards (varies), Longest Road (2), Defender (1), VP Cards (1 each), Merchant (1)

#### Implementation Details:
1. **Check game mode** to determine which display to show
2. **Knight Strength Calculation**:
   - Base game: Count `player.knightsPlayed` (dev cards used)
   - C&K: Sum active knight strengths using `calculateKnightStrength(player)`
3. **VP Badge Display**:
   - Show icon/badge with tooltip
   - Color/highlight when player owns achievement
   - Click to see details (optional)
4. **VP Cards Display**:
   - Check `player.revealedVPCards` array
   - Show icon for each card (Printer, Constitution)
   - Tooltip shows card name and VP value
5. **Merchant Display**:
   - Check if player has Merchant progress card active
   - Track in `GameState` or `PlayerState` which player owns active Merchant
   - Show Merchant icon with "1 VP" tooltip

---

### Feature 3: Metropolis & City Improvements

**Phases**: 4
**Errors Fixed**: C4
**Estimated Effort**: 4-6 hours

#### UI/UX Changes:

**REMOVE**:
- `components/game/CityImprovements.tsx` - Delete panel UI
- Remove references from `GameController.tsx`

**CREATE**:
- `components/game/CityManagementDialog.tsx` - Modal shown when clicking city

**CityManagementDialog Specs**:
- Triggered by clicking city/metropolis on board
- Shows:
  - City name/location
  - Current improvement levels (science/trade/politics: 0-5)
  - Upgrade buttons for each improvement (cost: 1-4 commodities based on level)
  - Available commodities display
  - City wall building option (2 brick) - **per-city**, not player-wide
  - Wall status indicator (shows if this city has a wall)
  - Metropolis status (if applicable)
- Disabled when:
  - Not player's turn
  - Player has no cities (can't buy improvements without cities)
- Close button to dismiss

**City Walls Implementation**:
- Stored as `vertex.hasCityWall: boolean` in board state
- Each city/metropolis can have 0 or 1 wall
- Maximum 3 walls total per player (validation checks count across all cities)
- Wall is automatically destroyed when city is downgraded to settlement
- Robber discard threshold = 7 + (2 × total walls owned)
- Helper function: `getCityWallCount(gameState, playerId)` computes count on demand

#### Core Logic Changes:

1. **Auto-award metropolis at level 4** (C4)
   - File: `core/engine/improvements/improvement-manager.ts:73-101`
   - Add `tryAwardMetropolis()` function called when reaching level 4
   - Logic: Find player's first city, upgrade to metropolis automatically
   - Log: "[Player] automatically claimed the [type] Metropolis! (+2 VP)"

2. **Auto-transfer at level 5**
   - Add `tryStealMetropolis()` function called when reaching level 5
   - Logic: If another player owns metropolis at level 4, transfer to new player
   - Downgrade previous owner's metropolis to city
   - Log: "[Player] stole the [type] Metropolis from [Owner]!"

3. **Board click handlers**
   - File: `components/board/Board.tsx` or vertex rendering
   - Add `onClick` handler for cities/metropolises
   - Opens `CityManagementDialog` with `vertexId`, `gameState`, `playerId`

4. **Deprecate manual API endpoint**
   - File: `app/api/game/[roomId]/metropolis/route.ts`
   - Remove 'build' action, only allow internal calls

5. **Service layer update**
   - File: `lib/services/improvement-service.ts`
   - Mark `buildPlayerMetropolis` as internal-only

#### Testing:
- [ ] No CityImprovements panel exists
- [ ] Click city on board opens dialog
- [ ] Can purchase improvements with commodities
- [ ] Metropolis auto-awarded at level 4
- [ ] Metropolis auto-transferred at level 5
- [ ] Previous owner's metropolis downgrades to city
- [ ] Dialog disabled when player has no cities
- [ ] Improvement upgrades logged with level and cost
- [ ] Auto-metropolis award logged: "Player automatically claimed Science Metropolis! (+2 VP)"
- [ ] Auto-metropolis transfer logged: "Player stole Trade Metropolis from OtherPlayer!"
- [ ] City wall purchases logged with cost
- [ ] Validation errors logged (no cities, insufficient commodities)

---

### Feature 4: Knight Management & Combat

**Phases**: 5
**Errors Fixed**: H5, M3
**Estimated Effort**: 4-6 hours

#### UI/UX Changes:

**REMOVE**:
- `components/game/KnightControls.tsx` - Delete panel UI (if exists)
- Remove references from `GameController.tsx`

**CREATE**:
- `components/game/KnightManagementDialog.tsx` - Modal shown when clicking knight

**KnightManagementDialog Specs**:
- Triggered by clicking knight on board
- Shows:
  - Knight level (basic/strong/mighty)
  - Active/inactive status
  - Strength value (1/2/3)
  - Knight count: "X/6 knights on board" (2 basic, 2 strong, 2 mighty max)
- Action buttons:
  - **Activate** (1 grain) - if inactive, costs 1 grain
  - **NO Deactivate button** - Knights auto-deactivate only (see below)
  - **Upgrade** (1 wool + 1 ore) - if basic→strong or strong→mighty
  - **Move** - if active:
    - Shows ALL empty intersections reachable via continuous path of own roads
    - Can pass through intersections with own pieces (highlight in yellow)
    - Cannot end on occupied intersection (even own knight)
    - Highlights valid empty destinations (green)
    - Shows displacement targets (red - weaker enemy knights on own road network)
    - Click target vertex to move
    - **Auto-deactivates after move**
  - **Chase Robber** - if active and robber adjacent:
    - Click to chase robber away
    - Opens robber placement UI (standard robber rules)
    - **Auto-deactivates after chasing**
- Disabled actions:
  - Greyed out with tooltip explaining why (e.g., "Need 1 grain to activate")
- Close button to dismiss

**Knight Movement Rules** (IMPORTANT):
- Active knight can move to **any** empty intersection connected by continuous path of **own roads**
- Not limited to 1 edge - can move multiple edges along road network
- Can pass through own pieces (settlements, cities, other knights)
- Must end on empty intersection
- Auto-deactivates after move

**Displacement Rules** (IMPORTANT):
- Can only displace **weaker** knight (Basic < Strong < Mighty)
- Displacing knight must reach enemy knight via **own road network**
- Displaced knight owner must **immediately** relocate it:
  - To any empty intersection connected by **their own roads** from displacement point
  - Displaced knight keeps its active/inactive status
  - Can return to original spot if connected by their roads and now empty
  - If no valid destination exists, knight is **permanently removed** from board
- Displacing knight becomes **Inactive** after displacement

**Auto-Deactivation Rules** (IMPORTANT):
- Knights are ONLY deactivated automatically, NEVER manually
- **After Barbarian Attack**: ALL active knights become inactive (win or lose)
- **After Knight Actions**:
  - Moving knight along road network → inactive
  - Displacing weaker knight → inactive (moving knight only, displaced keeps status)
  - Chasing robber → inactive
- **Chase Robber Follow-Up**: Player must move robber to new hex (triggers standard robber logic)

#### Core Logic Changes:

1. **Board click handlers**
   - File: `components/board/Board.tsx` or knight rendering
   - Add `onClick` handler for knights
   - Opens `KnightManagementDialog` with `knightId`, `gameState`, `playerId`

2. **Add knight piece limit constants**
   - File: `core/rules/constants.ts`
   - Add C&K constants:
   ```typescript
   export const CK_CONSTANTS = {
     KNIGHTS_PER_PLAYER: {
       basic: 2,
       strong: 2,
       mighty: 2,
       total: 6,
     },
     VICTORY_POINTS_TO_WIN: 13,
     // ... other C&K constants
   }
   ```

3. **Add knight piece validation**
   - File: `core/validation/knight-validator.ts`
   - New function: `canRecruitKnight(gameState, playerId)`
   - Logic: Count player's knights on board by type
   - Prevent recruitment if 6 total knights already placed
   - Return: `{ canRecruit: boolean, reason?: string }`

4. **Add knight movement pathfinding**
   - File: `core/validation/knight-validator.ts`
   - New function: `getReachableIntersections(gameState, knightId, playerId)`
   - Logic:
     - Use BFS/DFS to find all intersections reachable via continuous path of player's roads
     - Can pass through intersections with own pieces (settlements, cities, knights)
     - Cannot end on occupied intersections (any piece)
     - Include enemy knight positions if they're weaker (displacement targets)
     - Return: `{ empty: Intersection[], displacement: Intersection[] }`

5. **Add displacement validation** (H5)
   - File: `core/validation/knight-validator.ts`
   - New function: `canDisplaceKnight(gameState, movingKnight, targetVertex)`
   - Logic:
     - Check if target has enemy knight
     - If same player: cannot displace own knight
     - Compare strengths: moving must be STRONGER (not equal)
     - Check if target reachable via own road network
     - Return: `{ canDisplace: boolean, reason?: string }`

6. **Add displaced knight relocation validation**
   - File: `core/validation/knight-validator.ts`
   - New function: `getDisplacedKnightDestinations(gameState, displacedKnight, fromVertex)`
   - Logic:
     - Find all empty intersections connected by **displaced knight owner's roads** from `fromVertex`
     - Can pass through own pieces
     - Must end on empty intersection
     - If no valid destinations: return empty array (knight will be removed)
     - Return: `Intersection[]`

7. **Implement displacement logic with follow-up**
   - File: `core/engine/knights/knight-manager.ts`
   - In `moveKnight()`, check for enemy knight at target
   - If weaker knight present:
     - Get valid relocation destinations for displaced knight
     - If destinations exist: Trigger UI for owner to choose relocation
     - If no destinations: Permanently remove displaced knight from board
     - Move displacing knight to target, set inactive
     - Log: "[Player] displaced [Owner]'s [level] knight!"
   - **Trigger follow-up**: Set game state to require displaced knight placement
   - Game state: `{ type: 'relocateKnight', knightId, validDestinations, playerId }`

8. **Implement chase robber with follow-up**
   - File: `core/engine/knights/knight-manager.ts`
   - New function: `chaseRobber(gameState, knightId, playerId)`
   - Logic:
     - Validate knight active and adjacent to robber
     - Set knight inactive
     - **Trigger follow-up**: Set game state to require robber placement
     - Player must move robber (triggers standard robber logic: choose hex, steal card)
     - Log: "[Player] chased away the robber! Move it to a new location."

9. **Add barbarian attack deactivation**
   - File: `core/engine/barbarian/barbarian-manager.ts`
   - In `resolveBarbarian()`, after victory/defeat calculation:
   - Set ALL active knights to inactive (all players)
   - Log: "All active knights have been deactivated after the barbarian attack."

10. **Fix Intrigue card** (M3)
   - File: `core/engine/progress/progress-card-manager.ts:818-865`
   - Add strength validation before displacement
   - Logic: Intrigue acts as "virtual mighty knight" (strength 3)
   - Can only displace basic/strong, not mighty
   - Displaced knight must relocate using same rules (own roads from displacement point)
   - Error: "Cannot use Intrigue on mighty knight (too strong)"

#### Testing:
**UI/UX:**
- [ ] No KnightControls panel exists
- [ ] Click knight on board opens dialog
- [ ] Dialog shows knight count (X/6 knights)
- [ ] NO manual deactivate button exists

**Piece Limits:**
- [ ] Cannot recruit 7th knight (validation error)
- [ ] Cannot recruit 3rd basic knight (validation error)
- [ ] Can activate knight (1 grain)
- [ ] Can upgrade knight (1 wool + 1 ore)

**Movement Pathfinding:**
- [ ] Knight can move to any empty intersection via own road network (not just 1 edge)
- [ ] Can move multiple edges in single move
- [ ] Can pass through own pieces (settlements, cities, knights)
- [ ] Cannot end on occupied intersection (even own knight)
- [ ] Shows all reachable empty intersections (green)
- [ ] Shows displacement targets - weaker knights on own road network (red)
- [ ] Knight auto-deactivates after move

**Displacement:**
- [ ] Can only displace weaker knights (Basic < Strong < Mighty)
- [ ] Equal strength cannot displace
- [ ] Cannot displace own knight
- [ ] Displacing knight must reach target via own road network
- [ ] Displacement triggers relocation UI for displaced knight owner
- [ ] Displaced knight owner sees valid destinations connected by their roads
- [ ] Displaced knight can return to original spot if connected and empty
- [ ] Displaced knight keeps its active/inactive status after relocation
- [ ] If no valid destinations, knight permanently removed from board
- [ ] Displacing knight auto-deactivates after displacement

**Other Actions:**
- [ ] Can chase robber when adjacent
- [ ] Chase robber triggers robber placement UI
- [ ] Chase robber triggers steal card logic
- [ ] Knight auto-deactivates after chasing robber
- [ ] ALL active knights deactivate after barbarian attack (win or lose)

**Intrigue Card:**
- [ ] Intrigue respects strength rules (acts as mighty knight strength 3)
- [ ] Intrigue can displace basic and strong knights
- [ ] Intrigue cannot displace mighty knights
- [ ] Intrigue displacement triggers same relocation rules

**Logging:**
- [ ] Knight activation logged with cost
- [ ] Knight deactivation logged (move, displace, chase, barbarian)
- [ ] Displacement logged with both players mentioned
- [ ] Displaced knight relocation logged
- [ ] Displaced knight removal logged (no valid destinations)
- [ ] Chase robber logged with follow-up action required
- [ ] Knight upgrades logged with level change and cost
- [ ] Knight movement logged with start/end location
- [ ] Displacements logged: "Strong knight (2) displaced basic knight (1)!"
- [ ] Intrigue displacement logged
- [ ] Validation errors logged (can't displace, no path, etc.)

---

### Feature 5: Barbarian System

**Phases**: 7
**Errors Fixed**: M2
**Estimated Effort**: 1-2 hours

#### Changes Required:

1. **Update getWeakestPlayer to getWeakestPlayers** (M2)
   - File: `core/engine/barbarian/barbarian-manager.ts:192-235`
   - Change return type: `PlayerState[]` instead of `PlayerState`
   - Logic:
     ```typescript
     const playerStrengths = gameState.players.map(player => ({
         player,
         strength: calculateKnightStrength(player)
     }));
     const minStrength = Math.min(...playerStrengths.map(ps => ps.strength));
     return playerStrengths
         .filter(ps => ps.strength === minStrength)
         .map(ps => ps.player);
     ```

2. **Update handleDefendersLose to handle multiple players**
   - File: `core/engine/barbarian/barbarian-manager.ts:57-82`
   - Logic:
     ```typescript
     const weakestPlayers = getWeakestPlayers(gameState);
     for (const player of weakestPlayers) {
         const cityVertex = findCity(player); // skip metropolises
         if (cityVertex) {
             destroyCity(gameState, player, cityVertex);
         }
     }
     ```
   - Log: "Knights failed! [Player1, Player2] will lose cities!"

#### Testing:
- [ ] If 2+ players tied for lowest: all lose a city
- [ ] Metropolises immune to destruction
- [ ] Proper logging for multiple losses
- [ ] Player with no cities doesn't crash
- [ ] Barbarian advance logged: "Barbarian ship advances! (position X/7)"
- [ ] Attack initiation logged: "Barbarian attack! Cities: X, Knights: Y"
- [ ] Successful defense logged with defender name
- [ ] Failed defense logged with all losing players
- [ ] City destruction logged per player
- [ ] Metropolis immunity logged if targeted
- [ ] Barbarian return logged

---

## File Changes Summary

### Type Definitions (3 files)
- **lib/types/game.ts** - Add `defenderOfCatan`, `pendingProgressCardDraw`, `pendingCardChoice`, `activeMerchant`
- **lib/types/player.ts** - Add `revealedVPCards`
- **lib/types/board.ts** - (no changes needed)

**Note on activeMerchant**: Track which player currently has the Merchant progress card active (grants 1 VP). Similar to `longestRoadOwner`, this field should be `string | null` and store the player ID.

### Core Engine (6 files)
- **core/engine/improvements/improvement-manager.ts** - Level 3 requirement, auto-metropolis logic
- **core/engine/progress/progress-card-manager.ts** - Draw 2 keep 1, VP card handling, hand limits
- **core/engine/dice/event-die-manager.ts** - Single player draw per die
- **core/engine/barbarian/barbarian-manager.ts** - Defender of Catan award, tied players lose
- **core/engine/knights/knight-manager.ts** - Displacement logic
- **core/rules/victory-conditions.ts** - Defender VP, conditional Largest Army

### Validation (1 file)
- **core/validation/knight-validator.ts** - Displacement validation, strength checks

### Services (2 files)
- **lib/services/game-service.ts** - Initialize defenderOfCatan, hand limit check at turn end
- **lib/services/improvement-service.ts** - Mark metropolis functions internal-only

### API Routes (4 files: 2 modified, 2 new)
- **app/api/game/[roomId]/progress-card/route.ts** - Alchemy timing fix
- **app/api/game/[roomId]/metropolis/route.ts** - Deprecate manual building
- **NEW: app/api/game/[roomId]/progress-card/choose/route.ts** - Card choice endpoint
- **NEW: app/api/game/[roomId]/progress-card/discard/route.ts** - Card discard endpoint

### UI Components (9 files: 4 modified, 3 new, 2 removed)
- **components/game/GameStatus.tsx** - Show Defender/Largest Army, knight strength, VP cards, Merchant
- **components/game/PlayerCard.tsx** (or similar) - Display VP achievements and progress cards
- **components/game/ProgressCardHand.tsx** - Hand limit indicator, discard buttons
- **components/board/Board.tsx** - Click handlers for cities and knights
- **REMOVE: components/game/CityImprovements.tsx** - Replace with dialog
- **REMOVE: components/game/KnightControls.tsx** - Replace with dialog (if exists)
- **NEW: components/game/ProgressCardChoice.tsx** - Modal for draw 2 keep 1
- **NEW: components/game/CityManagementDialog.tsx** - Click city to manage
- **NEW: components/game/KnightManagementDialog.tsx** - Click knight to manage

**Total Changes**: 19 files modified, 5 files created, 2 files removed

---

## Testing Strategy

### Unit Testing
- Progress card drawing logic (level checks, card selection)
- Hand limit enforcement (4 at turn end, 5 during turn)
- Knight displacement validation (strength comparisons)
- Barbarian attack resolution (tied players)
- Metropolis auto-award triggers

### Integration Testing
- Full game flow: lobby → setup → gameplay → victory
- Real-time synchronization across multiple clients
- Game mode switching (base vs C&K)
- Click-to-manage dialogs (city, knight)

### Regression Testing
- Base game functionality unaffected
- Existing C&K features still work
- No performance degradation
- Theme switching (flat/voxel) still works

---

## Implementation Timeline

### Week 1: Foundation (9-13 hours)
- **Days 1-2**: Feature 1 (Progress Cards) - 7-10 hours
- **Day 3**: Feature 2 (Victory Conditions) - 2-3 hours

### Week 2: Core Systems (7-10 hours)
- **Days 4-5**: Feature 3 (Metropolis & Improvements) - 4-6 hours
- **Day 6**: Feature 5 (Barbarian) - 1-2 hours
- **Day 6-7**: Start Feature 4 - 2 hours

### Week 3: Combat & Polish (3-6 hours)
- **Days 8-9**: Complete Feature 4 (Knights) - 2-4 hours
- **Day 10**: End-to-end testing - 1-2 hours

**Total**: 19-28 hours over ~2 weeks

---

## Risk Mitigation

### High Risk
**Progress card drawing refactor** - Complex logic with UI implications
- **Mitigation**: Implement incrementally, test after each step
- **Fallback**: Feature flag to revert to old behavior

### Medium Risk
**Click-to-manage dialogs** - Changes UX expectations
- **Mitigation**: Clear visual affordances (hover effects, cursors)
- **Fallback**: Could add back panels if users prefer

**Metropolis auto-award** - May surprise users
- **Mitigation**: Clear log messages explaining automatic award
- **Fallback**: Could add confirmation dialog

### Low Risk
- Victory condition fix (simple conditional)
- Knight displacement (isolated validation)
- Alchemy timing (single phase check)
- Barbarian ties (straightforward array logic)

---

## Success Criteria

### Functional Requirements
- ✅ All 15 errors fixed (4 critical, 5 high, 6 medium)
- ✅ All tests passing (unit, integration, regression)
- ✅ No game-breaking bugs introduced
- ✅ Base game mode unaffected

### UX Requirements
- ✅ Click-to-manage dialogs intuitive and responsive
- ✅ Clear visual feedback for all actions
- ✅ Proper error messages and validation
- ✅ Smooth animations and transitions
- ✅ Player card displays all VP sources correctly (Defender, VP cards, Merchant)
- ✅ Knight strength vs knights played shown correctly per game mode

### Technical Requirements
- ✅ Code follows existing patterns and conventions
- ✅ Proper TypeScript typing throughout
- ✅ Real-time sync works across all changes
- ✅ Performance maintained (no lag with dialogs)

### Documentation Requirements
- ✅ All code changes documented with comments
- ✅ Corrected GDD referenced in key locations
- ✅ Testing checklist completed
- ✅ This implementation plan followed

---

## Game Logging Requirements

**Critical**: ALL user actions and automatic actions MUST be logged to `gameState.logs` for player visibility and debugging.

### Logging Principles
1. **User Actions**: Log what happened, who did it, and any costs/effects
2. **Automatic Actions**: MUST log clearly that action was automatic with reason
3. **Errors**: Log validation failures and why they occurred
4. **Achievements**: Log when players gain/lose special achievements
5. **VP Changes**: Log any action that changes victory points

### Feature 1: Progress Card Logging

**User Actions**:
- ✅ "Player drew 2 progress cards (Science)" (when draw triggered)
- ✅ "Player chose [Card Name]" (when selection made)
- ✅ "Player played [Card Name]" (when card used)
- ✅ "Player discarded [Card Name]" (when over hand limit)

**Automatic Actions**:
- ✅ "Player drew a progress card (event die: green)" (when die triggers)
- ✅ "Player revealed Printer for +1 VP!" (VP card auto-play)
- ✅ "Player revealed Constitution for +1 VP!" (VP card auto-play)
- ✅ "Player is at hand limit (4/5). Must discard or play cards." (warning)

**Validation Errors**:
- ✅ "Cannot draw progress card - improvement level too low (need level 3)"
- ✅ "Cannot end turn - must discard down to 4 progress cards"
- ✅ "Cannot play [Card] - not your turn"

### Feature 2: Victory Conditions Logging

**Automatic Actions**:
- ✅ "Player is now the Defender of Catan! (+1 VP)" (after barbarian defense)
- ✅ "Player lost Defender of Catan to OtherPlayer" (when transferred)

**Achievements**:
- ✅ Log Defender changes in game log with green/special color
- ✅ VP recalculation should not spam logs (silent unless achievement changes)

### Feature 3: Metropolis & City Improvements Logging

**User Actions**:
- ✅ "Player upgraded Science to level 3" (with commodity cost shown)
- ✅ "Player upgraded Trade to level 4" (triggers metropolis check)
- ✅ "Player built city wall (cost: 2 brick)" (city wall purchase)

**Automatic Actions** (CRITICAL):
- ✅ "Player automatically claimed the Science Metropolis! (+2 VP)" (level 4 auto-award)
- ✅ "Player stole the Trade Metropolis from OtherPlayer!" (level 5 auto-transfer)
- ✅ "OtherPlayer's metropolis downgraded to city" (after transfer)
- ✅ "Player reached level 4 in Politics but has no city to upgrade to metropolis!" (warning)

**Validation Errors**:
- ✅ "Cannot upgrade improvement - insufficient commodities (need 3 cloth)"
- ✅ "Cannot upgrade improvement - player has no cities"
- ✅ "Cannot upgrade improvement - already at max level (5)"

### Feature 4: Knight Management Logging

**User Actions**:
- ✅ "Player activated knight (cost: 1 grain)"
- ✅ "Player deactivated knight"
- ✅ "Player upgraded knight from basic to strong (cost: 1 wool, 1 ore)"
- ✅ "Player moved knight to [location]"

**Combat Actions**:
- ✅ "Player's strong knight (2) displaced OtherPlayer's basic knight (1)!" (displacement)
- ✅ "Player played Intrigue and displaced OtherPlayer's basic knight!"

**Validation Errors**:
- ✅ "Cannot activate knight - insufficient resources (need 1 grain)"
- ✅ "Cannot move knight - knight must be active"
- ✅ "Cannot displace knight - your basic knight (1) cannot displace strong knight (2)"
- ✅ "Cannot move knight - no path along your roads"
- ✅ "Cannot use Intrigue on mighty knight (too strong)"

### Feature 5: Barbarian System Logging

**Automatic Actions** (CRITICAL):
- ✅ "Barbarian ship advances! (position X/7)" (when event die shows ship)
- ✅ "Barbarian attack incoming! Cities: X, Knight Strength: Y" (when reaching position 7)
- ✅ "Knights defended successfully! [Player] is the defender (strength: X)" (victory)
- ✅ "Knights failed to defend! [Player1, Player2] will lose cities!" (defeat with tied players)
- ✅ "Player's city was destroyed by barbarians and downgraded to settlement" (city loss)
- ✅ "Player's metropolis is immune to barbarian attack" (if targeted)
- ✅ "Barbarian ship returns to start" (after attack)

**Validation Errors**:
- ✅ "Player has no cities to lose!" (edge case)

### General Logging Standards

**Log Message Format**:
```typescript
gameState.logs.push({
    message: "Descriptive message with player names and values",
    type: 'action' | 'info' | 'warning' | 'error' | 'special' | 'battle',
    playerId?: string,  // Optional: which player triggered this
    timestamp?: number  // Optional: for sorting/filtering
});
```

**Log Types**:
- `action`: Player performed an action (blue)
- `info`: General information (gray)
- `warning`: Something needs attention (yellow)
- `error`: Validation failure (red)
- `special`: Achievement/milestone (green/gold)
- `battle`: Combat/conflict (red/orange)

**Best Practices**:
1. Use player names, not IDs: "Alice" not "player-123"
2. Include specific values: "cost: 3 cloth" not "insufficient resources"
3. Make automatic actions VERY clear: "automatically claimed" not just "claimed"
4. Use active voice: "Player built" not "Building was built"
5. Be concise but complete: Include what, who, and why

---

## Post-Implementation Tasks

1. **Code Review**: Full review against corrected GDD
2. **Performance Testing**: Verify no regressions
3. **Logging Audit**: Verify all actions are logged appropriately
4. **Documentation Update**: Update player-facing docs
5. **Changelog**: Document all fixes for release notes
6. **User Communication**: Announce corrections and new UX

---

## Appendix: Detailed Error Reference

### C1: Largest Army Awards VP in C&K Mode

**Current Code** (`core/rules/victory-conditions.ts:60-63`):
```typescript
// Largest Army
if (gameState.largestArmyOwner === playerId) {
    points += GAME_CONSTANTS.VP_FROM_LARGEST_ARMY;
}
```

**Problem**: No game mode check, always awards VP.

**Fix**:
```typescript
// Largest Army (base game only)
if (gameState.gameMode !== 'cities_and_knights' && gameState.largestArmyOwner === playerId) {
    points += GAME_CONSTANTS.VP_FROM_LARGEST_ARMY;
}

// Defender of Catan (C&K only)
if (gameState.gameMode === 'cities_and_knights' && gameState.defenderOfCatan === playerId) {
    points += 1;
}
```

### C2: Defender of Catan Missing

**Missing**: `GameState.defenderOfCatan` field

**Required Additions**:
1. Add field to GameState type
2. Award after successful barbarian defense
3. Calculate in victory points
4. Display in UI

### C3: Progress Cards Drawable at Level 1

**Current Code** (`core/engine/improvements/improvement-manager.ts:199`):
```typescript
if (level < 1) return false;
```

**Fix**:
```typescript
if (level < 3) return false;
```

### C4: Manual Metropolis Building

**Current**: Button in `CityImprovements.tsx` allows manual building

**Fix**:
1. Remove UI button
2. Auto-award in `upgradeImprovement()` at level 4
3. Auto-transfer at level 5
4. Replace with click-to-manage dialog

---

## References

- **Corrected GDD**: `docs/cities_and_knights_gdd_corrected.md`
- **Original Implementation Plan**: `docs/cities_and_knights_implementation_plan.md`
- **Official Rulebook**: CN3087 (Cities & Knights)
- **Codebase**: Settlers of Lanc (Next.js/React/TypeScript)
