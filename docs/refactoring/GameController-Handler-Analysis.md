# GameController Handler Analysis

**Current State:** GameController.tsx is 2,181 lines with ~50 handler functions

## Handler Categorization

### Knight Handlers (~8 handlers) → `lib/controllers/knight-controller.ts`
1. `handleKnightClick` - Select knight for actions
2. `handleActivateKnight` - Activate a knight
3. `handleMoveKnight` - Move knight to new location
4. `handleUpgradeKnight` - Upgrade knight strength
5. `handleStartSmithSelection` - Begin smith card flow
6. `handleSmithKnightSelected` - Select knights to promote
7. `handleConfirmSmithPromotions` - Confirm smith card usage
8. Inline knight displacement handler (lines ~2028-2044)

### Progress Card Handlers (~26 handlers) → `lib/controllers/progress-card-controller.ts`
1. `handlePlayProgressCard` - Main card play entry point
2. `handleStartHexSelection` - Begin hex selection (merchant, inventor, taxation)
3. `handleHexSelected` - Hex selected on board
4. `handleConfirmInventorSwap` - Confirm inventor number swap
5. `handleConfirmMerchantPlacement` - Confirm merchant placement
6. `handleConfirmTaxationPlacement` - Confirm taxation placement
7. `handleStartEngineerSelection` - Begin engineer card flow
8. `handleEngineerCitySelected` - Select city for free upgrade
9. `handleConfirmEngineerBuild` - Confirm engineer upgrade
10. `handleStartMedicineSelection` - Begin medicine card flow
11. `handleMedicineCitySelected` - Select city to rebuild
12. `handleStartVertexSelection` - Begin vertex selection (intrigue)
13. `handleVertexSelected` - Vertex selected on board
14. `handleConfirmIntrigueDisplacement` - Confirm intrigue knight displacement
15. `handleStartEdgeSelection` - Begin edge selection (diplomat)
16. `handleEdgeSelected` - Edge selected on board
17. `handleConfirmDiplomatRemove` - Confirm diplomat road removal
18. `handleConfirmDiplomatRebuild` - Confirm diplomat road rebuild
19. `handleStartTreasonSelection` - Begin treason card flow
20. `handleConfirmTreasonOpponent` - Confirm treason opponent selection
21. `handleConfirmTreasonKnightRemoval` - Confirm treason knight removal
22. `handleConfirmTreasonPlacement` - Confirm treason knight placement
23. `handleCancelTreasonPlacement` - Cancel treason placement
24. `handleCancelRoadBuildingProgress` - Cancel road building progress card
25. `handleFinalizeRoadBuildingProgress` - Finalize road building
26. `handleCancelFollowupCard` - Cancel active followup card
27. `handleDiscardProgressCards` - Discard excess progress cards
28. `handleStartCraneDialog` - Begin crane card dialog
29. `handleCraneUpgrade` - Perform crane upgrade

### City Improvement Handlers (~10 handlers) → `lib/controllers/improvement-controller.ts`
1. `handleCityClick` - City clicked on board
2. `handleSettlementClick` - Settlement clicked on board
3. `handleUpgradeImprovement` - Upgrade city improvement (science/trade/politics)
4. `handleStartMetropolisSelection` - Begin metropolis selection
5. `handleMetropolisCitySelected` - Select city for metropolis
6. `handleConfirmMetropolisBuild` - Confirm metropolis build
7. `handleBuildMetropolis` - Build metropolis
8. `handleBuildCityWall` - Build city wall
9. `handleUpgradeSettlementToCity` - Upgrade settlement to city

### Robber/Barbarian Handlers (~5 handlers) → Keep in GameController (game flow)
1. `handleRobberVictimRequest` - Request robber victim selection
2. `handleRobberVictimSelected` - Victim selected
3. `handleRobberVictimCancel` - Cancel robber victim selection
4. `handleDismissTheftNotification` - Dismiss theft notification
5. `handleLoseCityToBarbarians` - Handle city loss to barbarians

### General/Flow Handlers (~3 handlers) → Keep in GameController (orchestration)
1. `handleCancelSelection` - Cancel current selection
2. `handleOpenPlayerCityManagement` - Open city management dialog
3. `handleEndTurnClick` - End turn

## Selection State Management → `lib/hooks/useSelectionManager.ts`

**Current scattered state variables (~20+):**
- `buildMode` - road, settlement, city, knight, city_wall
- `movingKnightId` - Knight being moved
- `selectedKnightId` - Selected knight
- `selectedCityId` - Selected city
- `selectedSettlementId` - Selected settlement
- `buildingMetropolisType` - Metropolis type being built
- `selectingCityForMetropolis` - City selection for metropolis
- `selectedMetropolisCityId` - Selected metropolis city
- `selectingHexForCard` - merchant, inventor, taxation
- `selectingVertexForCard` - intrigue, treason_remove, treason_place
- `selectingEdgeForCard` - diplomat
- `intrigueTarget` - Intrigue displacement target
- `inventorSelection` - Inventor hex selections
- `selectedMerchantHexId` - Merchant placement hex
- `selectedTaxationHexId` - Taxation placement hex
- `diplomatStage` - remove, rebuild
- `diplomatSelectedEdgeId` - Edge for diplomat
- `diplomatSelectedEdgeOwner` - Owner of diplomat edge
- `diplomatRelocateEdgeId` - Relocation edge for diplomat
- Plus many modal open/error states

**Proposed consolidated interface:**
```typescript
interface SelectionState {
  // Build mode
  buildMode: BuildMode | null;

  // Entity selections
  selectedKnight: string | null;
  selectedCity: string | null;
  selectedSettlement: string | null;
  movingKnight: string | null;

  // Card-specific selections
  cardSelection: CardSelectionState | null;

  // Actions
  clearSelection: () => void;
  setBuildMode: (mode: BuildMode | null) => void;
  setSelectedKnight: (id: string | null) => void;
  // ... etc
}
```

## Proposed Architecture

```
components/game/
  └── GameController.tsx          (~350-400 lines - UI orchestrator only)

lib/
  ├── controllers/                (Business logic - NEW)
  │   ├── knight-controller.ts    (~200-300 lines)
  │   ├── progress-card-controller.ts (~500-700 lines)
  │   └── improvement-controller.ts (~200-300 lines)
  │
  └── hooks/
      └── useSelectionManager.ts  (~150-200 lines - NEW)
```

## Migration Strategy

1. Create `lib/controllers/` directory
2. Build `useSelectionManager` hook first (foundation)
3. Extract controllers one at a time:
   - KnightController (simplest, ~8 handlers)
   - ImprovementController (medium, ~10 handlers)
   - ProgressCardController (most complex, ~26 handlers)
4. Refactor GameController to use new controllers
5. Test thoroughly

## Success Metrics

- ✅ GameController.tsx: 2,181 lines → ~350-400 lines (83% reduction)
- ✅ Clear separation: UI vs business logic vs state management
- ✅ Each controller focused on single responsibility
- ✅ All functionality maintained, no regressions
- ✅ Build succeeds with no type errors
