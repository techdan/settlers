# `any` Type Audit

## trading-service.ts
- [x] Line 51: `(entry: any): entry is MerchantFleetEffect` — replaced with shared type guard on `unknown[]`.

## progress-card-service.ts
- [x] Line 31: `(effect: any): effect is RoadBuildingEffect`
- [x] Line 39: `(effect: any) => !(effect?.type === 'road_building_progress' && effect.playerId === playerId)`
- [x] Line 129: `(effect: any): effect is TreasonEffect => effect?.type === 'treason'`
- [x] Line 135: `filter((effect: any) => effect?.type !== 'treason')`
- [x] Line 362: `options?: any`

## lobby-service.ts
- [x] No `any` occurrences (confirmed via `rg -n ": any"`).

## game-service.ts
- [x] Line 436: `(effect: any) => !(effect?.type === 'merchant_fleet' && effect.playerId === playerId)`
- [x] Lines 106-107: `Record<string, any>` for vertices/edges

## devcard-service.ts
- [x] Line 270: `(effect: any) => effect?.type === 'road_building_progress' && effect.playerId === playerId`
