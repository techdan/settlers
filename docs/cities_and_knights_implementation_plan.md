# Cities & Knights Expansion - Implementation Plan

## Executive Summary

This plan provides a detailed, phase-by-phase implementation guide for adding the Cities & Knights expansion to Settlers of Lanc. The expansion adds commodities, city improvements, knights, barbarian attacks, progress cards, and metropolises, raising the victory threshold from 10 to 13 points.

**Key Architecture Decision**: Implement as a selectable game mode rather than replacing the base game, ensuring backward compatibility and allowing players to choose their preferred ruleset.

---

## Architecture Overview

### Game Mode System
- Add `gameMode: 'base' | 'cities_and_knights'` field to GameState
- Initialize C&K-specific state only when C&K mode is selected
- Victory condition threshold adjusts based on mode (10 vs 13 VP)
- UI components conditionally render based on game mode

### Data Model Extensions
- Extend PlayerState with: commodities, improvements, progressCards, knights, metropolisOwned
- Extend GameState with: barbarianPosition, metropolises, progressDecks, eventDieRoll
- Extend Vertex to support knight placement and metropolis structure type
- No database migration required (JSON storage in games table)

### Core Systems
1. **Commodity System**: Parallel to resources, produced by cities on specific terrains
2. **Improvement System**: Three tracks (science/trade/politics) with 5 levels each
3. **Knight System**: Placeable units with activation, movement, and upgrade mechanics
4. **Barbarian System**: Track-based invasion with defender/attacker resolution
5. **Progress Card System**: Three decks with special abilities and VP cards
6. **Metropolis System**: Exclusive city upgrades tied to improvement levels

---

## Implementation Phases

### Phase 1: Foundation - Type Definitions (2-3 hours)

**Purpose**: Establish type system foundation that all other phases depend on

**Files to Create/Modify**:
- CREATE `core/rules/commodity-constants.ts` - Commodity types, terrain mapping, C&K constants
- MODIFY `lib/types/player.ts` - Add commodities, improvements, progressCards, knights, metropolisOwned
- MODIFY `lib/types/game.ts` - Add gameMode, barbarianPosition, metropolises, progressDecks, eventDieRoll, new game phases
- MODIFY `lib/types/board.ts` - Add metropolis structure type, knight property to Vertex

**Key Decisions**:
- Use Record<CommodityType, number> pattern matching resources
- Improvements as object with science/trade/politics number values (0-5)
- Knights as array of Knight objects with id, vertexId, level, active, playerId
- Game phases extended to include knight_movement, barbarian_attack

**Validation**: TypeScript compiles without errors, no breaking changes to base game types

---

### Phase 2: Commodity & Improvement Systems (3-4 hours)

**Purpose**: Implement commodity production and city improvement mechanics

**Files to Create**:
- `core/engine/resources/commodity-manager.ts` - Distribution, counting, commodity-from-terrain mapping
- `core/engine/improvements/improvement-manager.ts` - Upgrade costs, affordability checks, level tracking

**Key Functions**:
- `distributeCommodities(gameState, diceRoll)` - Only cities produce commodities (settlements produce resources only)
- `getCommodityFromTerrain(terrain)` - forest→paper, pasture→cloth, mountain→coin
- `getUpgradeCost(currentLevel)` - 1,1,2,3,4 commodity costs for levels 0→1, 1→2, 2→3, 3→4, 4→5
- `canAffordImprovement(player, improvement)` - Check commodity availability
- `upgradeImprovement(player, improvement)` - Deduct commodities, increment level

**Integration Point**: Call `distributeCommodities()` in `game-service.ts:rollDice()` right after `distributeResources()`

**Pattern**: Mirror resource-manager.ts structure for consistency

**Validation**: Commodities distribute correctly when cities are on producing hexes

---

### Phase 3: Knight System (6-8 hours)

**Purpose**: Implement knight placement, activation, movement, and combat mechanics

**Files to Create**:
- `core/engine/knights/knight-manager.ts` - Core knight operations
- `core/validation/knight-validator.ts` - Placement and activation validation

**Key Functions**:
- `placeKnight(gameState, playerId, vertexId)` - Create basic knight on own settlement/city
- `activateKnight(gameState, knightId)` - Flip inactive→active, increment activeKnightCount
- `moveKnight(gameState, knightId, targetVertexId)` - Move along own roads, becomes inactive
- `upgradeKnight(gameState, knightId)` - basic→strong→mighty progression
- `canMoveKnight(gameState, knight, targetVertexId)` - Validate adjacent vertex along own road
- `calculateKnightStrength(player)` - Sum active knight values (basic=1, strong=2, mighty=3)
- `isValidKnightPlacement()` - Own settlement/city, no existing knight, has resources

**Knight Rules**:
- Cost: 1 sheep + 1 ore
- Activation cost: 1 wheat
- Placed on vertices with own buildings
- Movement: one edge per activation, along own roads only
- Strength counts only when active

**Pattern**: Spatial awareness similar to building placement logic

**Validation**: Knights can be placed, activated, moved; strength calculated correctly

---

### Phase 4: Barbarian & Event Die Systems (4-5 hours)

**Purpose**: Implement barbarian invasion mechanics and event die rolling

**Files to Create**:
- `core/engine/barbarian/barbarian-manager.ts` - Barbarian track and attack resolution
- `core/engine/dice/event-die-manager.ts` - Event die rolling and processing

**Key Functions**:
- `rollEventDie()` - Returns {color, isBarbarian} (50% ship, 50% split green/yellow/blue)
- `advanceBarbarian(gameState)` - Increment position, trigger attack at position 7
- `resolveBarbbarianAttack(gameState)` - Compare total cities vs total knight strength
- `getDefenderOfCatan(gameState)` - Player with most active knights (draws progress card if win)
- `getWeakestPlayer(gameState)` - Fewest knights; tiebreaker: most cities
- `destroyCity(gameState, player)` - Downgrade one city→settlement (skip metropolises)

**Barbarian Rules**:
- Advances when event die shows ship (50% probability)
- Attack at position 7, then reset to 0
- If totalKnightStrength >= totalCities: defenders win, strongest defender draws progress card
- If totalCities > totalKnightStrength: weakest player loses a city
- Metropolises immune to destruction

**Integration Point**: Modify `game-service.ts:rollDice()` to also roll event die and process result

**Validation**: Barbarian advances, attacks resolve correctly, cities destroyed/defended appropriately

---

### Phase 5: Progress Card System (6-8 hours)

**Purpose**: Implement progress card decks and card effects

**Files to Create**:
- `core/engine/progress/progress-card-definitions.ts` - Card types, deck creation, card metadata
- `core/engine/progress/progress-card-manager.ts` - Drawing and playing cards

**All Card Types** (define all 24 for deck creation):
- Science (green): alchemist, crane, engineer, inventor, irrigation, medicine, mining, printer, road_building, smith
- Trade (yellow): commercial_harbor, master_merchant, merchant, merchant_fleet, resource_monopoly, trade_monopoly
- Politics (blue): bishop, constitution, deserter, diplomat, intrigue, saboteur, spy, warlord, wedding

**Core Subset to Implement (10-12 cards)**:
- **Science**: alchemist, crane, engineer, road_building, smith (5 cards)
- **Trade**: master_merchant, merchant, merchant_fleet, resource_monopoly (4 cards)
- **Politics**: bishop, diplomat, spy (3 cards)

**Key Functions**:
- `createProgressDecks()` - Create and shuffle all three decks (all 24 cards in decks)
- `drawProgressCard(gameState, playerId, category)` - Draw from deck, add to player hand
- `playProgressCard(gameState, playerId, cardType, options)` - Remove from hand, execute effect
- `executeProgressCardEffect()` - Switch statement for card effects (implemented + stubbed)

**Drawing Trigger**: When event die shows color, all players with improvement level ≥3 in that category draw a card

**Implementation Strategy**:
- Define all 24 card types and metadata (needed for deck creation)
- Fully implement 10-12 core cards with effects
- Stub remaining cards (draw and discard, no effect, log "not yet implemented")
- Priority order: science cards > trade cards > politics cards

**Pattern**: Similar to dev-card-manager.ts structure

**Validation**: Cards can be drawn when event die triggers, core card effects work correctly, stubbed cards don't crash

---

### Phase 6: Metropolis System (3-4 hours)

**Purpose**: Implement exclusive city upgrades and ownership transfers

**Files to Create**:
- `core/engine/metropolis/metropolis-manager.ts` - Building and transfer logic

**Key Functions**:
- `canBuildMetropolis(gameState, playerId, improvement)` - Check level 4, ownership rules
- `buildMetropolis(gameState, playerId, vertexId, improvement)` - Upgrade city→metropolis
- `downgradeMetropolis(gameState, playerId, improvement)` - Revert metropolis→city when stolen

**Metropolis Rules**:
- Requires level 4 in corresponding improvement track
- Only 3 exist (one per track), exclusive ownership
- Provides +2 VP in addition to city's 2 VP (total 4 VP)
- Immune to barbarian destruction
- Can be stolen if another player reaches higher improvement level

**Integration Point**: Victory point calculation must add metropolis VP

**Pattern**: Ownership transfer similar to longest road/largest army

**Validation**: Metropolis can be built at level 4, stolen at higher levels, provides correct VP

---

### Phase 7: Service Layer Integration (4-6 hours)

**Purpose**: Create service orchestration for all C&K features

**Files to Create**:
- `lib/services/ck-game-service.ts` - C&K-specific game operations
- `lib/services/knight-service.ts` - Knight action APIs
- `lib/services/improvement-service.ts` - Improvement and metropolis APIs

**Key Service Functions**:

**ck-game-service.ts**:
- `rollDiceWithEvent(roomId, playerId)` - Roll production dice + event die, distribute resources + commodities, process event

**knight-service.ts**:
- `buildKnight(roomId, playerId, vertexId)` - Validate, deduct resources, place knight
- `activateKnightAction(roomId, playerId, knightId)` - Cost 1 wheat, activate knight
- `moveKnightAction(roomId, playerId, knightId, targetVertexId)` - Validate movement, move along road
- `upgradeKnightAction(roomId, playerId, knightId)` - Upgrade to next level

**improvement-service.ts**:
- `upgradePlayerImprovement(roomId, playerId, improvement)` - Check commodities, upgrade level
- `buildPlayerMetropolis(roomId, playerId, vertexId, improvement)` - Build or steal metropolis

**Pattern**: Follow existing service structure (validation → state mutation → persistence → real-time sync)

**Validation**: All service functions integrate with repository layer and update game state correctly

---

### Phase 8: Victory Conditions Update (1-2 hours)

**Purpose**: Adjust victory point calculation and win threshold for C&K mode

**Files to Modify**:
- `core/rules/victory-conditions.ts` - Add metropolis VP, conditional win threshold

**Changes**:
- Add metropolis VP calculation: `metropolisOwned.length * 2`
- Update `checkVictoryCondition()` to use 13 VP threshold when `gameMode === 'cities_and_knights'`
- Largest army calculation could use knight strength instead of knights played (optional enhancement)

**Validation**: Victory triggers at 13 VP in C&K mode, includes metropolis points

---

### Phase 9: API Route Handlers (3-4 hours)

**Purpose**: Create HTTP endpoints for all C&K actions

**Files to Create**:
- `app/api/game/[roomId]/knight/route.ts` - POST endpoint for knight actions
- `app/api/game/[roomId]/improvement/route.ts` - POST endpoint for improvements and metropolises
- `app/api/game/[roomId]/progress-card/route.ts` - POST endpoint for playing progress cards

**Endpoint Structure**:
```typescript
POST /api/game/[roomId]/knight
Body: { playerId, action: 'build'|'activate'|'move'|'upgrade', vertexId?, knightId?, targetVertexId? }

POST /api/game/[roomId]/improvement
Body: { playerId, action: 'upgrade'|'metropolis', improvement, vertexId? }

POST /api/game/[roomId]/progress-card
Body: { playerId, cardType, options }
```

**Pattern**: Follow existing API route structure with try/catch error handling

**Validation**: All endpoints return updated game state, handle errors gracefully

---

### Phase 10: UI Components - Panels (4-5 hours)

**Purpose**: Create UI components for displaying C&K state

**Files to Create**:
- `components/game/CommodityHand.tsx` - Display paper/cloth/coin with counts
- `components/game/CityImprovements.tsx` - Three improvement tracks with upgrade buttons
- `components/game/KnightControls.tsx` - Knight list, build/activate/move controls
- `components/game/BarbarianTrack.tsx` - Visual track showing position, city/knight comparison
- `components/game/EventDieDisplay.tsx` - Show event die result (color or ship)
- `components/game/ProgressCardHand.tsx` - Display and play progress cards

**Component Patterns**:
- CommodityHand: Grid layout like PlayerHand, emoji icons (📜🧵🪙)
- CityImprovements: Three progress bars (0-5), color-coded (green/yellow/blue), upgrade buttons
- KnightControls: List of knights with level/status, action buttons
- BarbarianTrack: 7-segment progress indicator, strength comparison
- EventDieDisplay: Single die showing result (🚢 or 🏛️)

**Styling**: Match existing game component style (bg-gray-800/90, rounded-lg, etc.)

**Validation**: All components render correctly, show accurate state

---

### Phase 11: Board Rendering - Knights & Metropolises (6-8 hours)

**Purpose**: Update board to visually show knights and metropolises in both flat and voxel themes

**Files to Create/Modify**:
- CREATE `components/board/KnightRenderer.tsx` - Render knight shields on vertices
- MODIFY `components/board/VertexRenderer.tsx` - Add metropolis rendering, integrate knight renderer
- CREATE `themes/flat/Knight.tsx` - Flat theme knight rendering
- CREATE `themes/voxel/Knight.tsx` - Voxel theme knight rendering with 3D effect
- MODIFY `themes/voxel/HexTile.tsx` - Add metropolis voxel rendering if needed

**Flat Theme Knight Rendering**:
- Shield shape SVG with player color fill
- Level indicator circle with number (1/2/3 for basic/strong/mighty)
- Active state: gold stroke/outline, full opacity
- Inactive state: black stroke, 70% opacity
- Size scales with level (12px basic, 14px strong, 16px mighty)

**Voxel Theme Knight Rendering**:
- 3D shield with top face and two side faces (depth effect)
- Brightness filters for faces (similar to voxel buildings)
- Level indicator on top face
- Active state: gold/yellow glow effect
- Inactive state: dimmed with darker filters
- Depth offset to appear standing on vertex

**Flat Theme Metropolis**:
- Enlarged polygon compared to city (larger scale)
- Gold stroke (strokeWidth: 3)
- Crown or star decoration above structure
- Distinct silhouette from regular city

**Voxel Theme Metropolis**:
- Multi-tier tower structure with base, middle, top
- Each tier with top/side faces and depth
- Gold/yellow accent colors on top tier
- Crown or spire at peak
- Larger footprint than regular voxel city

**Integration**:
- VertexRenderer checks theme mode and conditionally renders flat vs voxel
- Both themes show knights and metropolises based on vertex state
- Theme switching updates rendering in real-time

**Pattern**: Follow existing voxel building patterns in `themes/voxel/HexTile.tsx` for depth and shading

**Validation**: Knights and metropolises render correctly in both themes, theme switching works, real-time updates work

---

### Phase 12: Game Initialization & Lobby (2-3 hours)

**Purpose**: Enable C&K mode selection and proper game initialization

**Files to Modify**:
- `lib/services/game-service.ts:startGame()` - Add gameMode parameter, initialize C&K state
- `components/lobby-view.tsx` - Add game mode selector dropdown

**Initialization Logic**:
- If gameMode === 'cities_and_knights':
  - Initialize all players with empty commodities, improvements, knights
  - Create progress card decks
  - Set barbarianPosition to 0
  - Initialize metropolises as unclaimed
  - Set victory threshold to 13

**Lobby UI**:
- Dropdown: "Base Game (10 VP)" vs "Cities & Knights (13 VP)"
- Host-only control
- Persist selection in lobby state

**Validation**: C&K games start with correct initial state, base games unaffected

---

### Phase 13: Main Game Controller Integration (3-4 hours)

**Purpose**: Wire all C&K components into main game interface

**Files to Modify**:
- `components/game/GameController.tsx` - Conditionally render C&K panels, add action handlers

**Integration Points**:
- Render C&K panels only when `gameMode === 'cities_and_knights'`
- Add handlers: handleBuildKnight, handleActivateKnight, handleMoveKnight, handleImprovementUpgrade, handlePlayProgressCard
- Update dice rolling to show event die result
- Add barbarian track to status area

**Layout**:
- Right sidebar: GameStatus + CityImprovements + BarbarianTrack
- Bottom center: PlayerHand + CommodityHand + BuildControls + KnightControls
- Board: Knights and metropolises rendered on vertices

**Validation**: Full game UI works seamlessly, all interactions functional

---

### Phase 14: Edge Cases & Polish (4-6 hours)

**Purpose**: Handle edge cases from GDD, testing, bug fixes

**Edge Cases to Address**:

1. **Tied weakest player during barbarian attack**
   - Tiebreaker: player with most cities loses
   - Implementation: `getWeakestPlayer()` already handles this

2. **Progress card deck exhaustion**
   - Check deck.length before drawing
   - Log "deck empty" message if no cards available

3. **Knight on vertex when upgrading settlement→city**
   - Knights remain on vertex (no displacement)
   - Already supported by data model

4. **Metropolis immunity from barbarians**
   - `destroyCity()` skips structures where `structure === 'metropolis'`

5. **Simultaneous metropolis claims**
   - Server-side validation prevents race conditions
   - First request wins, second fails validation

6. **Event die + 7 roll combination**
   - Process both: robber placement AND event die result
   - Event die can advance barbarian even during robber phase

**Manual Testing Checklist**:
- Full game playthrough from lobby to victory
- Knight placement, activation, movement, strength calculation
- Commodity production and improvement upgrades
- Barbarian attack (win and loss scenarios)
- Progress card drawing and core effects (10-12 implemented cards)
- Metropolis building and stealing
- Victory at 13 VP
- Theme switching with knights and metropolises visible
- Real-time synchronization across multiple browser tabs

**Validation**: All edge cases handled, game plays smoothly end-to-end

---

### Phase 15: Automated Testing (3-4 hours)

**Purpose**: Create basic unit tests for critical path logic

**Files to Create**:
- `tests/ck/barbarian-attack.test.ts` - Barbarian resolution tests
- `tests/ck/knight-strength.test.ts` - Knight strength calculation tests
- `tests/ck/metropolis-transfer.test.ts` - Metropolis ownership transfer tests

**Test Framework**: Use existing testing framework (likely Vitest based on Next.js/React setup)

**Barbarian Attack Tests**:
```typescript
describe('Barbarian Attack Resolution', () => {
  it('should destroy city when knights lose', () => { /* ... */ });
  it('should award progress card to defender when knights win', () => { /* ... */ });
  it('should handle tied weakest players correctly', () => { /* ... */ });
  it('should not destroy metropolis', () => { /* ... */ });
});
```

**Knight Strength Tests**:
```typescript
describe('Knight Strength Calculation', () => {
  it('should count only active knights', () => { /* ... */ });
  it('should calculate correct strength values (1/2/3)', () => { /* ... */ });
  it('should update activeKnightCount when activating', () => { /* ... */ });
});
```

**Metropolis Transfer Tests**:
```typescript
describe('Metropolis Ownership', () => {
  it('should allow building at level 4', () => { /* ... */ });
  it('should transfer to player with higher level', () => { /* ... */ });
  it('should downgrade previous owner metropolis to city', () => { /* ... */ });
  it('should reject simultaneous claims', () => { /* ... */ });
});
```

**Testing Strategy**:
- Focus on complex business logic, not UI components
- Test edge cases and tiebreaker logic
- Mock game state setup functions for clean test data
- Validate state mutations correctly update all related fields

**Validation**: All critical path tests pass, edge cases verified

---

## Critical Files Reference

### Must Modify (Existing Files)
1. `lib/types/game.ts` - Core game state types
2. `lib/types/player.ts` - Player state extensions
3. `lib/types/board.ts` - Board structure types
4. `lib/services/game-service.ts` - Game initialization and dice rolling
5. `core/rules/victory-conditions.ts` - Victory point calculation
6. `components/game/GameController.tsx` - Main game UI orchestration
7. `components/board/VertexRenderer.tsx` - Metropolis and knight rendering
8. `components/lobby-view.tsx` - Game mode selection

### Must Create (New Files)
1. `core/rules/commodity-constants.ts` - C&K constants and types
2. `core/engine/resources/commodity-manager.ts` - Commodity production
3. `core/engine/improvements/improvement-manager.ts` - City improvements
4. `core/engine/knights/knight-manager.ts` - Knight operations
5. `core/validation/knight-validator.ts` - Knight validation
6. `core/engine/barbarian/barbarian-manager.ts` - Barbarian attacks
7. `core/engine/dice/event-die-manager.ts` - Event die rolling
8. `core/engine/progress/progress-card-definitions.ts` - Card definitions
9. `core/engine/progress/progress-card-manager.ts` - Card operations
10. `core/engine/metropolis/metropolis-manager.ts` - Metropolis logic
11. `lib/services/ck-game-service.ts` - C&K game orchestration
12. `lib/services/knight-service.ts` - Knight API services
13. `lib/services/improvement-service.ts` - Improvement API services
14. `app/api/game/[roomId]/knight/route.ts` - Knight HTTP endpoints
15. `app/api/game/[roomId]/improvement/route.ts` - Improvement HTTP endpoints
16. `components/game/CommodityHand.tsx` - Commodity display
17. `components/game/CityImprovements.tsx` - Improvement tracks
18. `components/game/KnightControls.tsx` - Knight controls
19. `components/game/BarbarianTrack.tsx` - Barbarian tracker
20. `components/board/KnightRenderer.tsx` - Knight rendering

---

## Implementation Timeline

**Total Estimated Time**: 56-78 hours (adjusted for voxel theme and testing)

**Week 1** (Phases 1-4): Foundation and core mechanics - 15-20 hours
**Week 2** (Phases 5-8): Advanced systems and integration - 14-19 hours (reduced for core card subset)
**Week 3** (Phases 9-11): API and UI components - 13-17 hours (increased for voxel theme)
**Week 4** (Phases 12-15): Integration, testing, polish - 14-18 hours (increased for automated tests)

---

## Testing Strategy

### Unit Testing (Optional)
- Knight manager: placement, movement, strength calculation
- Barbarian manager: attack resolution, tiebreakers
- Improvement manager: costs, affordability, level progression
- Metropolis manager: building, stealing, ownership

### Integration Testing
- Full game flow: lobby → setup → gameplay → victory
- Real-time synchronization across multiple clients
- Game mode switching between base and C&K

### Manual Testing Checklist
- [ ] Commodities produce correctly for cities
- [ ] Improvements upgrade with correct costs
- [ ] Knights place, activate, move correctly
- [ ] Barbarian advances and attacks resolve properly
- [ ] Progress cards draw and play correctly
- [ ] Metropolises build and transfer ownership
- [ ] Victory triggers at 13 VP
- [ ] Base game still works (backward compatibility)

---

## Key Design Patterns

1. **Conditional Game Mode**: All C&K features gated behind `gameMode === 'cities_and_knights'` checks
2. **Parallel Systems**: Commodities parallel resources, progress cards parallel dev cards
3. **Service Layer**: All mutations go through service functions for validation and persistence
4. **Real-time Sync**: Supabase subscriptions automatically propagate state changes
5. **Optimistic Updates**: Client-side optimistic rendering for responsive UX
6. **Canonical Coordinates**: Vertex/edge coordinate system ensures consistent structure references

---

## Success Criteria

Implementation is complete when:
- ✅ Players can select C&K mode in lobby
- ✅ All C&K mechanics functional (commodities, improvements, knights, barbarian, progress cards, metropolises)
- ✅ Victory triggers at 13 VP with correct point sources
- ✅ UI displays all C&K state clearly
- ✅ Board renders knights and metropolises
- ✅ Event die rolls and processes correctly
- ✅ Base game remains fully functional
- ✅ Full game playthrough works end-to-end
- ✅ Real-time multiplayer synchronization works
- ✅ Edge cases handled gracefully

---

## Future Enhancements (Post-Implementation)

- Complete implementation of remaining progress card effects (12-14 cards)
- Animated barbarian ship movement along track
- Sound effects for barbarian attacks and knight movement
- Tutorial mode for C&K rules explanation
- AI opponent support for C&K mode
- Statistics tracking (games won with metropolises, knight strength records, barbarian defeats, etc.)
- Progress card trade marketplace
- Expanded unit test coverage (UI components, service layer)
- Performance optimizations for knight movement calculations
