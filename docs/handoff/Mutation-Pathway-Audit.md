# Mutation Pathway Audit

## Existing Server Actions (app/actions.ts)

### Knight Actions
- [x] buildKnight (line 196)
- [x] activateKnight (line 200)
- [x] moveKnight (line 204)
- [x] upgradeKnight (line 208)
- [x] relocateKnight (line 212)

### Improvement Actions
- [x] upgradeImprovement (line 220)
- [x] buildCityWall (line 216)

### Metropolis Actions
- [x] placeMetropolis (lines 231-237)

### Barbarian Actions
- [x] resolveBarbarianAttack (line 243)
- [x] loseCityToBarbarian (line 250)

### Progress Card Actions
- [x] playProgressCard (line 375)
- [x] discardProgressCard (line 387)
- [x] roadBuildingProgress (cancel/complete) (lines 398, 405)
- [x] weddingProgress (line 433)
- [x] treasonProgress (lines 412-426)

### Commercial Harbor Actions
- [x] respondToCommercialHarbor (lines 444-466; makeOffers/respond/cancel covered)

## API Routes to Migrate

### app/api/game/[roomId]/knight/route.ts
Operations: build, activate, move, upgrade, relocate  
- [x] All operations covered by actions above (route removed)

### app/api/game/[roomId]/improvement/route.ts
Operations: upgrade improvement  
- [x] All operations covered by actions above (route removed)

### app/api/game/[roomId]/metropolis/route.ts
Operations: place metropolis  
- [x] All operations covered by actions above (route removed)

### app/api/game/[roomId]/barbarian/route.ts
Operations: lose city, attack resolve  
- [x] All operations covered by actions above (route removed)

### app/api/game/[roomId]/commercial-harbor/route.ts
Operations: makeOffers, respond, cancel  
- [x] All operations covered by actions above (route removed)

### app/api/game/[roomId]/progress-card/route.ts (+ discard/road-building/wedding/treason subroutes)
Operations: play card, discard, finalize/cancel road building, wedding gifts, treason (select/place/cancel)  
- [x] All operations covered by actions above (routes removed)
