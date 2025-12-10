# GameController Handler Inventory

Snapshot based on the current code (GameController.tsx ≈1300 lines) after partial controller extraction.

## Knight Handlers (8) — `lib/controllers/knight-controller.ts`
- `handleKnightClick` — selects a knight for movement or routes to smith selection.
- `handleActivateKnight` — activates a knight via `/api/game/{roomId}/knight` (wheat cost).
- `handleMoveKnight` — enters knight relocation mode for a clicked knight.
- `handleUpgradeKnight` — upgrades knight strength (basic → strong → mighty).
- `handleStartSmithSelection` — toggles smith mode and seeds selectable knights.
- `handleSmithKnightSelected` — toggles a knight in the smith selection (max 2).
- `handleConfirmSmithPromotions` — plays Smith card to promote selected knights.
- `handleRemoveDisplacedKnight` — removes a displaced knight when no relocation target exists.

## Progress Card Handlers (28) — `lib/controllers/progress-card-controller.ts`
- `handlePlayProgressCard` — central dispatch for all progress card plays.
- `handleStartHexSelection` — opens hex selection for Merchant / Inventor / Taxation.
- `handleHexSelected` — records a chosen hex for the active card.
- `handleConfirmInventorSwap` — completes Inventor swap between two hexes.
- `handleConfirmMerchantPlacement` — places Merchant on selected hex.
- `handleConfirmTaxationPlacement` — executes Taxation steal from selected hex.
- `handleStartVertexSelection` — begins vertex targeting (Intrigue).
- `handleVertexSelected` — records vertex/knight target for Intrigue or Treason.
- `handleConfirmIntrigueDisplacement` — displaces selected opponent knight (Intrigue).
- `handleStartEdgeSelection` — begins Diplomat road targeting.
- `handleEdgeSelected` — records road edge for Diplomat (remove or rebuild stage).
- `handleConfirmDiplomatRemove` — removes selected road for Diplomat.
- `handleConfirmDiplomatRebuild` — rebuilds relocated road for Diplomat.
- `handleStartEngineerSelection` — prompts city selection for Engineer.
- `handleEngineerCitySelected` — records city for Engineer wall placement.
- `handleConfirmEngineerBuild` — builds city wall via Engineer.
- `handleStartMedicineSelection` — prompts city upgrade selection for Medicine.
- `handleMedicineCitySelected` — records city for Medicine upgrade.
- `handleConfirmMedicineBuild` — applies discounted city upgrade via Medicine.
- `handleStartTreasonSelection` — enters Treason flow to pick opponent.
- `handleConfirmTreasonOpponent` — locks opponent choice for Treason.
- `handleConfirmTreasonKnightRemoval` — removes chosen knight (Treason).
- `handleConfirmTreasonPlacement` — places replacement knight (Treason).
- `handleCancelTreasonPlacement` — aborts Treason placement flow.
- `handleCancelRoadBuildingProgress` — cancels Road Building follow-up.
- `handleFinalizeRoadBuildingProgress` — finalizes free road placements.
- `handleCancelFollowupCard` — clears active follow-up/progress prompts.
- `handleDiscardProgressCards` — discards down to limit; can auto end turn.

## Improvement / Build Handlers (11) — `lib/controllers/improvement-controller.ts`
- `handleCityClick` — opens city management for the clicked city.
- `handleSettlementClick` — opens settlement management for the clicked settlement.
- `handleUpgradeImprovement` — upgrades improvement track; triggers metropolis flow when eligible.
- `handleStartMetropolisSelection` — begins selecting a city for a metropolis.
- `handleMetropolisCitySelected` — records or toggles the chosen metropolis city.
- `handleConfirmMetropolisBuild` — submits metropolis selection.
- `handleBuildMetropolis` — enters metropolis build mode from controls.
- `handleBuildCityWall` — builds a city wall on a vertex.
- `handleUpgradeSettlementToCity` — upgrades a settlement to a city.
- `handleStartCraneDialog` — toggles Crane progress card dialog.
- `handleCraneUpgrade` — plays Crane to upgrade an improvement for free.

## Trade Handlers (5) — `lib/controllers/trade-controller.ts`
- `handleBankTrade` — executes bank/port/merchant-fleet trade.
- `handleOfferTrade` — creates a player-to-player trade offer.
- `handleAcceptTrade` — accepts an open trade offer.
- `handleRejectTrade` — rejects an incoming trade offer.
- `handleCancelTrade` — cancels the player’s own open trade.

## GameController-Local Handlers (11) — `components/game/GameController.tsx`
- `handleRobberVictimRequest` — opens robber victim picker with eligible players.
- `handleRobberVictimSelected` — moves robber to hex and steals from chosen victim.
- `handleRobberVictimCancel` — closes robber victim selection without action.
- `handleDismissTheftNotification` — hides recent theft notification banner.
- `handleCancelSelection` — global cancel: clears selection manager, robber selection, treason prompts, and progress prompts.
- `handleOpenPlayerCityManagement` — clears selection and opens current player city management dialog.
- `handleCancelFollowupCard` — cancels follow-up card flows or road-building progress (delegates to controller).
- `handleDiscardProgressCards` — discards progress cards from modal; may auto end turn.
- `handleLoseCityToBarbarians` — submits city loss during barbarian attack resolution.
- `handleRollDiceClick` — applies optimistic roll state then calls `rollDice`.
- `handleEndTurnClick` — applies optimistic end-turn state; enforces discard check before ending turn.

## Notes / Gaps
- Total handlers tracked: **63** (controllers + GameController local).
- Trade actions now routed through `lib/controllers/trade-controller.ts` and wired into `TradeModal`/`TradeOfferDisplay`.
- Progress card cancel/discard handlers delegated to `ProgressCardController`; duplication removed from `GameController.tsx`.
- GameController currently ~1000 lines after extracting treason logic, progress prompts, and trade handling; further decomposition still needed to approach the 300–400 line target.

## Verification
- Counted from current controller returns and `handle*` functions in `GameController.tsx` (see files above).
- Categories align with the intended concerns: knights, progress cards, improvements/builds, and residual controller-level handlers; trade still pending extraction.
