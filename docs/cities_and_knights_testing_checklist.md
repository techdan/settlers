# Cities & Knights Testing Checklist

## Phase 14: Edge Cases & Polish Testing

This document provides a comprehensive testing checklist for the Cities & Knights expansion implementation.

---

## Edge Cases Verification

### ✅ 1. Tied Weakest Player During Barbarian Attack

**Implemented in:** `core/engine/barbarian/barbarian-manager.ts:getWeakestPlayer()`

**How it works:**
- When multiple players have the same knight strength (minimum)
- Tiebreaker: Player with most cities loses
- Implementation lines 222-231

**Test scenario:**
1. Start C&K game with 3+ players
2. Trigger barbarian attack where defenders lose
3. Ensure 2+ players have same (minimum) knight strength
4. Verify player with most cities among tied players loses a city

**Verification:**
- Check `getWeakestPlayer()` returns player with most cities
- Check barbarian attack log shows correct player
- Check correct player's city is downgraded

---

### ✅ 2. Progress Card Deck Exhaustion

**Implemented in:** `core/engine/progress/progress-card-manager.ts:drawProgressCard()`

**How it works:**
- Check `deck.length === 0` before drawing (line 29)
- Log "deck empty" message if no cards available (lines 30-35)
- Returns null if deck exhausted

**Test scenario:**
1. Start C&K game
2. Draw cards until a deck is empty (science/trade/politics)
3. Trigger event die that would draw from empty deck
4. Verify graceful handling with log message

**Verification:**
- Check no crash when drawing from empty deck
- Check log shows "{category} progress card deck is empty!"
- Check player doesn't receive card

---

### ✅ 3. Knight on Vertex When Upgrading Settlement→City

**Implemented in:** Data model design

**How it works:**
- Knights stored in `PlayerState.knights[]` with `vertexId` reference
- Vertices store structure type ('settlement', 'city', 'metropolis')
- Knights and structures are independent - no displacement

**Test scenario:**
1. Build settlement with knight on it
2. Upgrade settlement to city
3. Verify knight remains on same vertex
4. Verify knight is still functional (can activate, move, etc.)

**Verification:**
- Check knight's `vertexId` unchanged
- Check vertex structure changed from 'settlement' to 'city'
- Check knight can still be activated/moved

---

### ✅ 4. Metropolis Immunity from Barbarians

**Implemented in:** `core/engine/barbarian/barbarian-manager.ts:destroyCity()`

**How it works:**
- Filter only finds cities with `vertex.structure === 'city'` (line 263)
- Explicitly excludes metropolises (metropolises have structure type 'metropolis')
- If no regular cities, returns false (line 266)

**Test scenario:**
1. Player has 1+ metropolises and 0 regular cities
2. Trigger barbarian attack where this player is weakest
3. Verify no cities destroyed
4. Verify log shows "no cities could be destroyed"

**Verification:**
- Check `destroyCity()` returns false
- Check metropolises remain intact
- Check log message indicates no destruction

---

### ✅ 5. Simultaneous Metropolis Claims

**Implemented in:** Server-side validation in service layer

**How it works:**
- Service methods use database transactions
- Server validates ownership before building
- First request succeeds, second fails validation

**Test scenario:**
1. Two players reach level 4 in same improvement simultaneously
2. Both click "Build Metropolis" at same time
3. Verify only one succeeds
4. Verify second receives error

**Verification:**
- Check only one player owns metropolis
- Check second player receives appropriate error
- Check database consistency

---

### ✅ 6. Event Die + 7 Roll Combination

**Implemented in:** `lib/services/game-service.ts:rollDice()`

**How it works:**
- Event die is rolled FIRST (lines 216-222) - even on a 7!
- Then robber logic processes (lines 224-245)
- Both effects can occur simultaneously
- Event die can advance barbarian even during robber phase

**Test scenario:**
1. Roll a 7 in C&K mode
2. Verify event die is rolled and processed
3. Verify robber placement still triggered
4. If event die shows ship, verify barbarian advances
5. If event die shows color, verify progress cards drawn

**Verification:**
- Check `eventDieRoll` is set in game state
- Check barbarian position increments if ship rolled
- Check phase set to 'discarding' or 'robber_placement' as appropriate
- Check both events logged

---

## Functional Testing Checklist

### Lobby & Game Initialization

- [ ] **Game mode selector appears in lobby** (host only)
- [ ] **Base Game option works** (starts normal 10 VP game)
- [ ] **Cities & Knights option works** (starts 13 VP C&K game)
- [ ] **C&K state initialized correctly**:
  - [ ] All players have commodities (0/0/0)
  - [ ] All players have improvements (0/0/0)
  - [ ] All players have empty knights array
  - [ ] All players have empty progressCards array
  - [ ] Progress decks created (science/trade/politics)
  - [ ] Barbarian position at 0
  - [ ] Metropolises array has 3 unclaimed entries
  - [ ] Victory threshold is 13

---

### UI Component Rendering

- [ ] **CommodityHand** displays correctly with icons
- [ ] **CityImprovements** shows 3 progress bars with colors
- [ ] **KnightControls** lists knights with actions
- [ ] **BarbarianTrack** shows position and comparison
- [ ] **EventDieDisplay** shows last roll result
- [ ] **ProgressCardHand** groups cards by category
- [ ] **All components only render in C&K mode**
- [ ] **Theme switching** works (flat ↔ voxel)

---

### Board Rendering

**Flat Theme:**
- [ ] Knights render as shields with player color
- [ ] Active knights have gold stroke/glow
- [ ] Inactive knights have black stroke, 70% opacity
- [ ] Level indicators show 1/2/3
- [ ] Metropolises show as enlarged circles with gold stroke
- [ ] Crown decoration above metropolises

**Voxel Theme:**
- [ ] Knights render as 3D shields
- [ ] Active knights have gold glow effect
- [ ] Inactive knights dimmed
- [ ] Level indicators on top face
- [ ] Metropolises show as multi-tier towers
- [ ] Gold accents on top tier
- [ ] Crown/spire at peak

**Both Themes:**
- [ ] Knights visible on correct vertices
- [ ] Metropolises visible on correct vertices
- [ ] Theme switching updates rendering
- [ ] Real-time updates work

---

### Commodity System

- [ ] **Cities produce commodities** when dice rolled
  - [ ] Forest hex → paper
  - [ ] Pasture hex → cloth
  - [ ] Mountain hex → coin
- [ ] **Settlements produce only resources** (no commodities)
- [ ] **Commodity counts display correctly** in CommodityHand
- [ ] **Total commodity count accurate**

---

### Improvement System

- [ ] **Upgrade costs correct** (1, 1, 2, 3, 4 commodities for levels 0→5)
- [ ] **Upgrade buttons disabled** when can't afford
- [ ] **Progress bars update** visually
- [ ] **Metropolis indicator** appears at level 4+
- [ ] **Max level message** shows at level 5
- [ ] **Science uses paper** (green)
- [ ] **Trade uses cloth** (yellow)
- [ ] **Politics uses coin** (blue)

---

### Knight System

**Placement:**
- [ ] **Build knight button** shows cost (🐑 1 + 🪨 1)
- [ ] **Can place on own settlement/city**
- [ ] **Cannot place where knight exists**
- [ ] **Deducts resources correctly**

**Activation:**
- [ ] **Activate button** shows cost (🌾 1)
- [ ] **Inactive → active** state change
- [ ] **Visual indicator** changes (gold glow)
- [ ] **Active knight count** increments
- [ ] **Deducts wheat correctly**

**Movement:**
- [ ] **Move button** appears for active knights
- [ ] **Can move along own roads**
- [ ] **Knight becomes inactive** after move
- [ ] **Cannot move inactive knights**

**Upgrade:**
- [ ] **Upgrade button** shows cost
- [ ] **Basic → Strong → Mighty** progression
- [ ] **Cannot upgrade beyond mighty**
- [ ] **Level indicator updates** (1→2→3)
- [ ] **Strength calculation correct**

---

### Barbarian System

**Track:**
- [ ] **Position displays** (0-7)
- [ ] **Advances when event die shows ship**
- [ ] **Attack triggers at position 7**
- [ ] **Resets to 0 after attack**

**Defense Status:**
- [ ] **Total cities calculated** correctly
- [ ] **Total knight strength calculated** correctly
- [ ] **Defender status shows** (winning/losing)
- [ ] **Color coding** (green=winning, red=losing)

**Attack Resolution (Defenders Win):**
- [ ] **Strongest defender identified** correctly
- [ ] **Defender draws progress card** (choice of category)
- [ ] **Tie handling** (no single defender if tied)
- [ ] **Barbarian resets** to position 0

**Attack Resolution (Attackers Win):**
- [ ] **Weakest player identified** correctly
- [ ] **Tiebreaker: most cities** loses
- [ ] **One city downgraded** to settlement
- [ ] **Metropolises immune** (skipped)
- [ ] **Player resources updated** (city piece returned)
- [ ] **Barbarian resets** to position 0

---

### Event Die System

- [ ] **Rolls on every production roll** (including 7!)
- [ ] **50% ship** → barbarian advances
- [ ] **50% color** → progress card draw opportunity
- [ ] **EventDieDisplay** shows result
- [ ] **Log message** for each result

**Color Results:**
- [ ] **Green (science)** → players with level 3+ science draw
- [ ] **Yellow (trade)** → players with level 3+ trade draw
- [ ] **Blue (politics)** → players with level 3+ politics draw

**Edge Case:**
- [ ] **7 + ship** → both robber AND barbarian advance
- [ ] **7 + color** → robber AND progress cards

---

### Progress Card System

**Drawing:**
- [ ] **Cards drawn from correct deck** (science/trade/politics)
- [ ] **Cards added to player hand**
- [ ] **Deck exhaustion handled** gracefully
- [ ] **Log message** shows card drawn

**Playing:**
- [ ] **Card removed from hand**
- [ ] **Expandable card view** shows description
- [ ] **Play button** triggers effect
- [ ] **Card effect executes** (or shows "not implemented")
- [ ] **Log message** shows card played

**Implemented Cards (verify effects work):**
- [ ] Alchemist - Convert 2→1 resources
- [ ] Inventor - Swap number tokens
- [ ] Irrigation - Take wheat
- [ ] Mining - Take ore
- [ ] Merchant - Trade at 2:1
- [ ] Resource Monopoly - Take all of one resource
- [ ] Trade Monopoly - Take all of one commodity
- [ ] Spy - Steal opponent's progress card
- [ ] Deserter - Deactivate opponent's knight
- [ ] Intrigue - Move opponent's knight
- [ ] Warlord - Activate all own knights

---

### Metropolis System

**Building:**
- [ ] **Requires level 4** in corresponding improvement
- [ ] **Upgrades city → metropolis** on board
- [ ] **Gold visual styling** applied
- [ ] **Victory points** increase by 2 (total 4 VP for metropolis)
- [ ] **Exclusive ownership** (only 3 exist)

**Stealing:**
- [ ] **Player with higher level** can steal
- [ ] **Previous owner** downgraded to city
- [ ] **New owner** gets metropolis
- [ ] **Victory points** update correctly

**Immunity:**
- [ ] **Barbarians cannot destroy** metropolises
- [ ] **Metropolises counted** in total cities for defense
- [ ] **Metropolises excluded** from destruction targets

---

### Victory Conditions

- [ ] **13 VP threshold** in C&K mode
- [ ] **Metropolis VP counted** (+2 per metropolis)
- [ ] **Victory triggers** at 13 VP
- [ ] **Victory message** displays
- [ ] **Base game still 10 VP** (backward compatible)

---

### Real-Time Multiplayer

- [ ] **State updates** propagate to all players
- [ ] **Knights visible** to all players
- [ ] **Metropolises visible** to all players
- [ ] **Barbarian position** syncs
- [ ] **Event die result** syncs
- [ ] **Commodity changes** sync
- [ ] **Improvement levels** sync
- [ ] **Multiple browser tabs** work correctly

---

### Error Handling

- [ ] **Invalid knight placement** shows error
- [ ] **Insufficient resources** shows error
- [ ] **Insufficient commodities** shows error
- [ ] **Invalid card play** shows error
- [ ] **API errors** handled gracefully
- [ ] **Empty deck** doesn't crash
- [ ] **No valid barbarian target** handled

---

### Performance & Polish

- [ ] **No console errors** during gameplay
- [ ] **Smooth animations** for updates
- [ ] **Responsive UI** (no lag)
- [ ] **Proper loading states**
- [ ] **Hover states** work correctly
- [ ] **Disabled states** clearly visible
- [ ] **Color coding** consistent
- [ ] **Icons render** correctly

---

## Integration Testing Scenarios

### Full Game Playthrough

**Setup:**
1. [ ] Create room as host
2. [ ] Select "Cities & Knights (13 VP)"
3. [ ] Wait for 2-4 players
4. [ ] Start game

**Initial Setup Phase:**
5. [ ] Place initial settlements (round 1)
6. [ ] Place initial roads (round 1)
7. [ ] Place initial settlements (round 2)
8. [ ] Place initial roads (round 2)
9. [ ] Receive starting resources (round 2)

**Early Game (Turns 1-5):**
10. [ ] Roll dice, receive resources
11. [ ] Roll event die, process result
12. [ ] Build settlements and roads
13. [ ] Trade resources
14. [ ] Build first city

**Mid Game (Turns 6-15):**
15. [ ] Receive first commodities (from cities)
16. [ ] Upgrade first improvement
17. [ ] Build first knight
18. [ ] Activate knight
19. [ ] Barbarian advances (ship rolls)
20. [ ] First progress card drawn (level 3+ improvement)
21. [ ] First barbarian attack resolves
22. [ ] Play progress card
23. [ ] Move knight
24. [ ] Upgrade knight to strong

**Late Game (Turns 16+):**
25. [ ] Reach improvement level 4
26. [ ] Build first metropolis
27. [ ] Another player reaches higher level
28. [ ] Metropolis stolen
29. [ ] Multiple active knights
30. [ ] Barbarian attack (varied outcomes)
31. [ ] Victory at 13 VP

---

## Regression Testing (Base Game)

Verify base game still works:

- [ ] **Can start base game** (10 VP)
- [ ] **No C&K components** render
- [ ] **No event die** rolled
- [ ] **No barbarian** track
- [ ] **Resources work** normally
- [ ] **Victory at 10 VP**
- [ ] **All base features** functional

---

## Known Issues / Future Enhancements

### Not Implemented (Expected):
- City walls (crane, engineer cards)
- Some progress card effects (medicine, printer, etc.)
- Vertex selection UI for knight placement/movement
- Progress card selection UI for some effects
- Metropolis selection UI

### Areas for Polish:
- Knight placement mode (similar to building mode)
- Knight movement target selection
- Progress card effect parameter selection
- Animated barbarian movement
- Sound effects
- Card descriptions in hover tooltips

---

## Test Environment

**Recommended Setup:**
1. **Browser:** Chrome/Firefox latest
2. **Multiple tabs:** Test real-time sync
3. **Device:** Desktop (responsive mobile testing later)
4. **Network:** Local (test performance) and remote (test real connection)

**Testing Tools:**
- Chrome DevTools (console, network, performance)
- React DevTools (component state inspection)
- Supabase Dashboard (database state verification)

---

## Sign-Off Checklist

After completing all tests above, verify:

- [ ] All edge cases handled correctly
- [ ] All core features functional
- [ ] No breaking bugs found
- [ ] Performance acceptable
- [ ] Real-time sync working
- [ ] Base game regression tests pass
- [ ] Ready for Phase 15 (automated testing)

---

**Testing completed by:** _____________
**Date:** _____________
**Build/Commit:** _____________
**Notes:** _____________
