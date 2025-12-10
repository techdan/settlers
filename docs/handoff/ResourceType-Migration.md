# ResourceType Import Migration

## Files to Update (29 total)

### Group 1: lib/board-data imports (12 files) - PRIORITY
- [x] lib/types/player.ts
- [x] lib/types/game.ts
- [x] lib/services/trading-service.ts
- [x] lib/services/robber-service.ts
- [x] lib/services/game-service.ts
- [x] lib/services/devcard-service.ts
- [x] core/rules/building-costs.ts
- [x] app/actions.ts
- [x] components/game/TradeOfferDisplay.tsx
- [x] components/game/PlayerDevCards.tsx
- [x] components/game/PlayerHand.tsx
- [x] components/game/DiscardModal.tsx
- [x] components/game/DebugPanel.tsx
- [x] components/game/AqueductModal.tsx

### Group 2: board-generator imports (2 files)
- [x] core/engine/resources/resource-manager.ts
- [x] core/engine/board/port-generator.ts (no ResourceType import present)

### Group 3: GameIcon imports (2 files)
- [x] themes/flat/Port.tsx
- [x] themes/voxel/HexTile.tsx

### Group 4: Already correct (8 files) - VERIFY ONLY
- [x] core/rules/game-rules.ts
- [x] core/engine/progress/progress-card-manager.ts
- [x] components/game/GuildSelectionList.tsx
- [x] components/game/WeddingGiftModal.tsx
- [x] components/game/ProgressCardModal.tsx
- [x] components/game/MerchantPlacementModal.tsx
- [x] components/game/GameController.tsx
- [x] components/game/CommercialHarborInitiatorDialog.tsx

### Additional files (discovered during migration)
- [x] lib/services/building-service.ts
- [x] components/game/RobberTheftNotification.tsx
- [x] components/game/TradeModal.tsx
- [x] components/ui/icons/GameIcon.tsx
