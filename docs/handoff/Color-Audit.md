# Game Color Audit

Audit date: 2025-12-10

## Resource Colors (components/ui/icons/GameIcon.tsx)
- Wood: `#634336` → `var(--color-resource-wood)`
- Brick: `#ea7955` → `var(--color-resource-brick-alt)`
- Sheep: `#ded7bc` → `var(--color-resource-sheep)`
- Wheat: `#db8b1f` → `var(--color-resource-wheat)`
- Ore: `#4f4a3c` → `var(--color-resource-ore)`

## Commodity Colors (components/ui/icons/GameIcon.tsx)
- Paper: `#e8c4a4` → `var(--color-commodity-paper)`
- Cloth: `#ecd998` → `var(--color-commodity-cloth)`
- Coin: `#707c79` → `var(--color-commodity-coin)`

## Knight Level Colors (components/ui/icons/GameIcon.tsx)
- Basic: `#CD7F32` → `var(--color-knight-basic)`
- Strong: `#C0C0C0` → `var(--color-knight-strong)`
- Mighty: `#FFD700` → `var(--color-knight-mighty)`

## Hex Tile Backgrounds (components/ui/icons/GameIcon.tsx)
- Hills: `#ca7728` → `var(--color-hex-hills)`
- Forest: `#006636` → `var(--color-hex-forest)`
- Mountain: `#666d63` → `var(--color-hex-mountain)`
- Pasture: `#84b83f` → `var(--color-hex-pasture)`
- Fields: `#f9e26f` → `var(--color-hex-fields)`

## City Improvements (components/ui/icons/GameIcon.tsx, CompactImprovementBar.tsx)
- Science: `#6bb97f` → `var(--color-improvement-science-alt)`
- Trade: `#c6daa4` → `var(--color-improvement-trade-alt)`
- Politics: `#d7dfd1` → `var(--color-improvement-politics-alt)`

## Knight Rings & Highlights (components/board/VertexRenderer.tsx)
- Active ring: `#FFD700` → `var(--color-knight-mighty)`
- Inactive ring: `#000000` → `var(--color-highlight-ink)`
- Target/selection strokes: `#e5e7eb`, `#ef4444`, `#22d3ee`, `#22c55e` → `var(--color-highlight-*)`
- City wall browns: `#3f2e22`, `#2a1d15`, `#5c4033` → `var(--color-structure-wall-*)`

## Barbarian Overlay (components/board/BarbarianHexOverlay.tsx)
- Gradient: `#1e293b`, `#450a0a`, `#0f172a` → `var(--color-barbarian-gradient-*)`
- Stroke states: `#dc2626`, `#7f1d1d`, `#475569` → `var(--color-highlight-warning|barbarian-stroke-*)`

## Player Colors (components/lobby-view.tsx)
- Red/Blue/Beige/Orange hex values normalized to CSS vars `var(--color-player-1..4)` via `PLAYER_COLOR_VAR_MAP`

## Structure Fallbacks (components/ui/icons/GameIcon.tsx)
- Settlement/City/Road/City wall fallbacks now reference `--color-structure-*`

## Total hardcoded values replaced
- Components audited: GameIcon.tsx, VertexRenderer.tsx, BarbarianHexOverlay.tsx, lobby-view.tsx, CompactImprovementBar.tsx, EdgeRenderer.tsx, GameLog.tsx, BuildControls.tsx, CityManagementDialog.tsx, CompactPlayerCard.tsx, SettlementManagementDialog.tsx.
- Hardcoded hex/RGB in these components: **~110** → **0 remaining** (all routed through CSS custom properties).
