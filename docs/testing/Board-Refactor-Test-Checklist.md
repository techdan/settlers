# Board.tsx Refactoring - Test Checklist

**Date**: 2025-12-08
**Refactoring**: Board.tsx decomposition (SettlersOfLanc-6kf4.1)
**Files Changed**:
- Board.tsx (932 → 174 lines)
- GameController.tsx (Board usage updated)
- 5 new files created (types, hooks, canvas)

## Critical Changes to Verify

### 1. API Route Replacement
- ✅ **Knight Movement**: Replaced `fetch('/api/game/.../knight')` with `moveKnight()` server action
- ✅ **Metropolis Placement**: Replaced `fetch('/api/game/.../metropolis')` with `placeMetropolis()` server action

⚠️ **Test Priority: CRITICAL** - These were direct API calls, now server actions

### 2. Props Consolidation
- ✅ **40+ props → 4 props**: All selection state and callbacks consolidated
- ✅ **Type safety**: BoardSelectionState and BoardCallbacks interfaces

---

## Testing Checklist

### Setup Phase Testing
- [ ] **Place First Settlement**
  - Click valid vertex location
  - Confirm placement modal appears
  - Settlement appears after confirmation
  - Turn advances correctly

- [ ] **Place First Road**
  - Click valid edge adjacent to settlement
  - Road appears after confirmation
  - Turn advances correctly

- [ ] **Place Second Settlement (reverse order)**
  - Verify reverse turn order works
  - Settlement placement works

- [ ] **Place Second Road**
  - Verify placement works
  - Setup phase completes and transitions to main phase

### Main Phase - Basic Building
- [ ] **Build Road**
  - Click Build Controls → Road
  - Valid edges highlight in green
  - Click valid edge
  - Confirm placement
  - Road appears, resources deducted

- [ ] **Build Settlement**
  - Click Build Controls → Settlement
  - Valid vertices highlight
  - Click valid vertex (adjacent to player road)
  - Settlement appears, resources deducted

- [ ] **Build City**
  - Click Build Controls → City
  - Valid cities highlight
  - Click valid settlement to upgrade
  - City appears, resources deducted

### Cities & Knights - Knight System
- [ ] **Build Knight** ⚠️ CRITICAL (server action replacement)
  - Click Build Controls → Knight
  - Valid vertices highlight
  - Click valid vertex
  - Knight appears, commodities deducted
  - Knight is inactive (gray)

- [ ] **Activate Knight**
  - Click on inactive knight
  - Knight Management Dialog appears
  - Click "Activate"
  - Knight becomes active (colored)
  - Commodities deducted

- [ ] **Move Knight** ⚠️ CRITICAL (server action replacement)
  - Click on active knight
  - Select "Move Knight"
  - Valid relocation vertices highlight
  - Click target vertex
  - **VERIFY**: Knight moves to new location
  - **VERIFY**: Server state updates correctly
  - **VERIFY**: No console errors about API routes

- [ ] **Upgrade Knight**
  - Click on basic knight
  - Select "Upgrade"
  - Knight upgrades to strong/mighty
  - Commodities deducted

- [ ] **Knight Displacement**
  - Move knight to occupied vertex
  - Displaced player prompted to relocate
  - Relocation works for displaced player

### Cities & Knights - Metropolis
- [ ] **Build Metropolis** ⚠️ CRITICAL (server action replacement)
  - Reach level 4 or 5 in improvement track
  - Metropolis selection triggered
  - Valid cities highlight
  - Click city to place metropolis
  - **VERIFY**: Metropolis appears
  - **VERIFY**: Server state updates
  - **VERIFY**: No console errors

### Progress Cards - Hex Selection
- [ ] **Merchant Card**
  - Play Merchant progress card
  - Valid hexes highlight (adjacent to player settlements)
  - Click hex
  - Merchant token moves
  - Player receives bonus commodity

- [ ] **Taxation Card**
  - Play Taxation progress card
  - Valid hexes highlight (all non-ocean, non-robber)
  - Click hex
  - Taxation effect triggers

- [ ] **Inventor Card**
  - Play Inventor progress card
  - First hex selection works
  - Second hex selection works
  - Number tokens swap correctly

### Progress Cards - Vertex Selection
- [ ] **Intrigue Card**
  - Play Intrigue card
  - Valid opponent knights highlight (adjacent to player roads)
  - Click knight
  - Valid relocation targets highlight
  - Click target
  - Knight displaces

- [ ] **Treason Card (2-step)**
  - Play Treason card
  - Opponent selects knight to remove
  - Knight removed from board
  - Player selects placement vertex
  - Stolen knight appears

### Progress Cards - Edge Selection
- [ ] **Diplomat Card**
  - Play Diplomat card
  - **Remove stage**: Open opponent roads highlight
  - Click road to remove
  - **Rebuild stage**: Valid placement edges highlight
  - Click edge
  - Player's road appears at new location

### Progress Cards - City Selection
- [ ] **Engineering Card**
  - Play Engineering card
  - Valid cities for city walls highlight
  - Click city
  - City wall appears (free)

- [ ] **Medicine Card**
  - Play Medicine card
  - Valid settlement upgrade positions highlight
  - Click settlement
  - Upgrades to city (free)

- [ ] **Smith Card**
  - Play Smith card
  - Valid knights for upgrade highlight
  - Select 2 knights
  - Both knights upgrade (free)

### Robber Placement
- [ ] **Roll 7 or Play Knight**
  - Robber placement mode activates
  - Valid hexes highlight (all except current robber)
  - Click hex
  - If multiple victims: victim selection modal appears
  - If single/no victim: robber moves immediately
  - Resource stolen from victim

### City/Settlement Management
- [ ] **Click Own City**
  - City Management Dialog opens
  - Can activate improvements
  - Can build city walls

- [ ] **Click Own Settlement**
  - Settlement Management Dialog opens
  - Shows settlement info

### Barbarian Attack
- [ ] **Lose City to Barbarians**
  - When barbarian defeats, victims prompted
  - Valid cities highlight
  - Click city to downgrade
  - City becomes settlement

### UI Controls
- [ ] **Zoom Controls**
  - Click + button → board zooms in
  - Click - button → board zooms out
  - Mouse wheel zoom works

- [ ] **Theme Toggle**
  - Click 2D/3D button
  - Board switches between flat and voxel themes
  - All tiles, roads, settlements render correctly

- [ ] **Pan/Drag**
  - Click and drag board
  - Board pans smoothly

### Error Handling
- [ ] **Cancel Build Mode**
  - Enter build mode (road/settlement/etc)
  - Click "Cancel" or press Escape
  - Build mode exits
  - Highlights disappear

- [ ] **Invalid Placement**
  - Try to build in invalid location
  - No placement occurs
  - No errors in console

### Console Errors
- [ ] **No Console Errors During Testing**
  - Open browser console (F12)
  - Perform all actions above
  - **VERIFY**: No errors appear
  - **VERIFY**: No warnings about deprecated APIs
  - **VERIFY**: No "fetch failed" errors for knight/metropolis

---

## Test Results

**Tester**: _________________
**Date**: _________________
**Build Version**: _________________

**Overall Result**:
- [ ] ✅ All tests passed
- [ ] ⚠️ Minor issues found (list below)
- [ ] ❌ Critical issues found (list below)

**Issues Found**:
```
[List any issues discovered during testing]
```

**Notes**:
```
[Additional observations]
```

---

## Regression Risks

Based on the refactoring, these areas have highest regression risk:

1. **Knight Movement** (API → server action)
2. **Metropolis Placement** (API → server action)
3. **Progress card vertex/edge selection** (complex state mapping)
4. **Diplomat card** (two-stage edge manipulation)
5. **Pending placement confirmation** (state management refactored)

Pay special attention to these during testing.
