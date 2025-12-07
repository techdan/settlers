# Barbarian Hex Tiles - Design Document

**Project:** Settlers of Lancaster - Cities & Knights Edition  
**Date:** 2025-12-07  
**Status:** Draft - Awaiting Implementation  

---

## 📋 Overview

### Problem Statement
The current `BarbarianHexOverlay` component renders as a floating CSS-positioned panel in the upper-left corner of the screen. According to the reference design, the barbarian display should instead be rendered as **actual hex tiles** that extend from the edge of the game board - matching the size and style of resource hexes.

### Design Goal
Integrate 2 Barbarian hex tiles directly into the SVG game board, positioned to extend from the existing hex grid. Each hex should display:
1. **Upper Hex (Knights)**: Active knights count with individual knight markers
2. **Lower Hex (Barbarians)**: Barbarian strength with ship progression track

### Reference Images
- **Image 1**: Close-up showing hex tiles with "Active knights" (0) and "Barbarian strength" (0) labels
- **Image 2**: Full board view showing hex tiles seamlessly extending from the game board edge

---

## 🗺️ Hex Coordinate System

### Current Board Layout
The standard Catan board uses axial coordinates (q, r) with a hexagonal shape:

```
       (-1,-1) (0,-2) (1,-2) (2,-2)
     (-2,0) (-1,-1) (0,-1) (1,-1) (2,-1)
   (-2,0) (-1,0) (0,0) (1,0) (2,0)
     (-2,1) (-1,1) (0,1) (1,1)
       (-2,2) (-1,2) (0,2)
```

### Barbarian Hex Positions
To extend the board, we need coordinates outside the standard 19-hex grid. Based on the reference images (upper-left placement), optimal coordinates are:

```
Barbarian Hexes (extending from upper-left edge):
┌─────────────────────────────────────┐
│  BARB 1 → (q: -3, r: 0)  Knights    │
│  BARB 2 → (q: -3, r: 1)  Strength   │
└─────────────────────────────────────┘
```

**Alternative Positions** (if upper-left conflicts with ports):
- Lower-left: `(q: -3, r: 2)` and `(q: -3, r: 3)`
- Upper-right: `(q: 3, r: -2)` and `(q: 3, r: -1)`

### Pixel Calculation
Using the existing `hexToPixel` function:
```typescript
// lib/hex.ts
export const hexToPixel = (hex: Hex, size: number): { x: number; y: number } => {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * (3 / 2) * hex.r;
  return { x, y };
};
```

For `HEX_SIZE = 90`:
- Hex (-3, 0): x = 90 * √3 * (-3 + 0) ≈ **-467.7**, y = 90 * 1.5 * 0 = **0**
- Hex (-3, 1): x = 90 * √3 * (-3 + 0.5) ≈ **-389.7**, y = 90 * 1.5 * 1 = **135**

---

## 📐 Architecture

### Component Hierarchy

```
Board.tsx
├── TransformWrapper (zoom/pan)
│   └── TransformComponent
│       └── <svg> board-svg
│           ├── {sortedTiles.map(...)}      // Resource hexes
│           ├── {ports.map(...)}            // Port indicators
│           ├── <BarbarianHexTiles />       // NEW: Barbarian display
│           │   ├── <BarbarianKnightsHex /> // Upper hex - knights
│           │   └── <BarbarianStrengthHex /> // Lower hex - strength
│           ├── {renderEdges.map(...)}      // Roads
│           └── {vertices.map(...)}         // Settlements/Cities
```

### New Components

#### 1. `BarbarianHexTiles.tsx`
Container component that manages both hexes.

```typescript
// components/board/BarbarianHexTiles.tsx
interface BarbarianHexTilesProps {
    gameState: GameState;
    hexSize: number;
    theme: 'flat' | 'voxel';
}

// Coordinates for the two barbarian hexes
const BARBARIAN_HEX_COORDS = {
    knights: { q: -3, r: 0 },
    strength: { q: -3, r: 1 }
};
```

#### 2. `BarbarianKnightsHex.tsx`
Displays the "Active Knights" hex with individual knight markers.

```typescript
// components/board/BarbarianKnightsHex.tsx
interface BarbarianKnightsHexProps {
    coord: { q: number; r: number };
    totalKnightStrength: number;
    hexSize: number;
    theme: 'flat' | 'voxel';
}
```

**Visual Design:**
- Dark hex background (slate/charcoal gradient)
- Knight helmet icon (⚔️ or custom SVG)
- Large number in center
- "Active knights" label below

#### 3. `BarbarianStrengthHex.tsx`
Displays the "Barbarian Strength" hex with ship progression track.

```typescript
// components/board/BarbarianStrengthHex.tsx
interface BarbarianStrengthHexProps {
    coord: { q: number; r: number };
    totalCityCount: number;
    barbarianPosition: number;
    attackThreshold: number;
    hexSize: number;
    theme: 'flat' | 'voxel';
}
```

**Visual Design:**
- Ominous hex background (red/crimson gradient)
- Ship icon (🏴‍☠️ or custom SVG)
- Large number in center
- 8 progression slots arranged in arc/circle
- Ship marker at current position

### Progression Track Design

The barbarian track shows 8 positions (0-7), with position 7 triggering attack:

```
   ┌──────────────────────┐
   │     ⚫ ⚫ ⚫ ⚫      │ <- Positions 4-7 (upper row)
   │    ⚫ ⚫ ⚫ ⚫       │ <- Positions 0-3 (lower row)
   │        🚢           │ <- Ship at current position
   │   Barbarian strength │
   │          [3]         │
   └──────────────────────┘
```

**Slot Styling:**
- Empty: `bg-slate-700` (dark gray)
- Passed: `bg-slate-500` (medium gray)
- Current: `bg-red-500 ring-2 ring-red-400` (pulsing red)
- Attack position (7): `bg-red-900 ring-1 ring-red-700` (danger indicator)

---

## 🎨 Theme Support

### Flat Theme
- Clean SVG gradients
- Colored fills with subtle shadows
- Modern minimalist icons

```tsx
// Flat hex base
<polygon
    points={hexPoints}
    fill="url(#barbarian-flat-gradient)"
    stroke="#475569"
    strokeWidth="2"
/>
```

### Voxel Theme
- Isometric 3D effect with depth
- Left/right shaded faces
- Raised platform appearance

```tsx
// Voxel hex with depth
const DEPTH = 15;
<g transform={`translate(0, ${-DEPTH})`}>
    {/* Top face */}
    <polygon points={hexPoints} fill="url(#barbarian-voxel-gradient)" />
    {/* Right face (darker) */}
    <polygon points={rightFacePoints} fill="#1e1e2e" opacity="0.6" />
    {/* Left face (medium) */}
    <polygon points={leftFacePoints} fill="#2d2d3d" opacity="0.4" />
</g>
```

---

## 🔗 Integration Points

### 1. Board.tsx Changes

```tsx
// Import new component
import { BarbarianHexTiles } from './BarbarianHexTiles';

// Inside the <svg> element, after tiles but before edges:
{gameState.gameMode === 'cities_and_knights' && (
    <BarbarianHexTiles
        gameState={gameState}
        hexSize={HEX_SIZE}
        theme={theme}
    />
)}
```

### 2. GameController.tsx Changes

Remove the current CSS-positioned overlay:

```tsx
// DELETE this section:
{/* Upper Left: Barbarian Hex Overlay (C&K only) */}
{isCitiesAndKnights && (
    <div className="absolute top-28 left-4 pointer-events-auto z-20">
        <BarbarianHexOverlay ... />
    </div>
)}
```

### 3. Props/Data Flow

```
GameController.tsx
└── Board (passes gameState)
    └── BarbarianHexTiles (extracts from gameState)
        ├── barbarianPosition: gameState.barbarianPosition
        ├── totalKnightStrength: computed from players
        ├── totalCityCount: computed from players
        └── attackThreshold: CK_CONSTANTS.BARBARIAN_ATTACK_POSITION
```

---

## 📦 Data Dependencies

### From GameState
```typescript
interface GameState {
    gameMode: 'base' | 'cities_and_knights';
    barbarianPosition: number;  // 0-7
    players: PlayerState[];
}

interface PlayerState {
    citiesRemaining: number;    // Starts at 4
    activeKnightCount: number;  // Sum of active knights
}
```

### Computed Values
```typescript
// Total knight strength
const totalKnightStrength = gameState.players.reduce(
    (sum, p) => sum + (p.activeKnightCount || 0), 0
);

// Total city count (4 - remaining for each player)
const totalCityCount = gameState.players.reduce(
    (sum, p) => sum + (4 - p.citiesRemaining), 0
);

// Defense status
const isDefeatImminent = totalKnightStrength < totalCityCount;
```

---

## 🖼️ Visual Specifications

### Color Palette

| Element | Flat Theme | Voxel Theme |
|---------|------------|-------------|
| Knights Hex BG | `linear-gradient(#1e293b, #0f172a)` | `#1e293b` + 3D faces |
| Strength Hex BG | `linear-gradient(#1e293b, #450a0a)` | `#450a0a` + 3D faces |
| Hex Border (normal) | `#475569` (slate-600) | `#475569` |
| Hex Border (danger) | `#dc2626` (red-600) | `#7f1d1d` |
| Knight Number (winning) | `#34d399` (emerald-400) | `#34d399` |
| Strength Number (losing) | `#f87171` (red-400) | `#f87171` |
| Slot Empty | `#334155` (slate-700) | `#334155` |
| Slot Passed | `#64748b` (slate-500) | `#64748b` |
| Slot Current | `#ef4444` (red-500) | `#ef4444` pulse |

### Typography

| Text | Style |
|------|-------|
| Count Numbers | `font-bold text-2xl tabular-nums` |
| Labels | `text-[10px] uppercase tracking-wide text-slate-400` |

### Hex Dimensions
- Size: `HEX_SIZE = 90` (same as resource hexes)
- Icon Size: `size * 0.6 = 54px`
- Label Font: 10px

---

## 🧪 Testing Considerations

### Unit Tests
```typescript
describe('BarbarianHexTiles', () => {
    it('renders only in cities_and_knights mode');
    it('positions hexes correctly using hexToPixel');
    it('displays correct knight strength total');
    it('displays correct city count total');
    it('updates ship position correctly');
    it('shows warning state when defenders losing');
    it('handles attack state (position >= 7)');
});
```

### Visual Regression
- Screenshot comparison at various barbarianPosition values (0-7)
- Screenshot comparison with isDefeatImminent = true/false
- Ensure no overlap with existing ports/hexes

### Edge Cases
1. 0 knights, 0 cities (game start)
2. Maximum knights (2 × 6 × players = 24 for 4 players)
3. Position exactly at 7 (attack in progress)
4. Rapid position changes (animation smoothness)

---

## 📅 Implementation Plan

### Phase 1: Core Component Structure
1. Create `BarbarianHexTiles.tsx` container
2. Create `BarbarianKnightsHex.tsx` (flat theme first)
3. Create `BarbarianStrengthHex.tsx` (flat theme first)
4. Integrate into Board.tsx

### Phase 2: Visual Polish
1. Add progression track visualization
2. Implement ship marker animation
3. Add tooltip on hover
4. Style warning/danger states

### Phase 3: Voxel Theme
1. Add 3D depth faces
2. Adjust shading
3. Ensure consistent depth with other hexes

### Phase 4: Cleanup
1. Remove old `BarbarianHexOverlay.tsx` (or keep as fallback)
2. Remove CSS overlay from `GameController.tsx`
3. Update documentation

---

## ⚠️ Potential Issues

### 1. Port Collision
The upper-left area has ports. Need to verify coordinates don't overlap.
- **Mitigation**: Use coordinates that are further out (q=-3) or adjust port positions

### 2. Zoom/Pan Behavior
Barbarian hexes should zoom/pan with the board.
- **Mitigation**: Render inside `<TransformComponent>` not as CSS overlay

### 3. Render Order
Barbarian hexes should render before edges/vertices but after ports.
- **Mitigation**: Careful placement in SVG render order

### 4. Touch Targets
Hexes should be tappable for tooltip on mobile.
- **Mitigation**: Add onClick handler with foreignObject for tooltip

---

## 📝 Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `components/board/BarbarianHexTiles.tsx` | CREATE | New container component |
| `components/board/BarbarianKnightsHex.tsx` | CREATE | Knights display hex |
| `components/board/BarbarianStrengthHex.tsx` | CREATE | Strength/track display hex |
| `components/board/Board.tsx` | MODIFY | Add BarbarianHexTiles in SVG |
| `components/game/GameController.tsx` | MODIFY | Remove CSS overlay |
| `components/board/BarbarianHexOverlay.tsx` | DELETE/ARCHIVE | Old overlay component |

---

## ✅ Acceptance Criteria

1. [ ] Barbarian hexes render at correct position extending from board edge
2. [ ] Hex size matches resource hexes (90px)
3. [ ] Knights hex shows correct total active knight count
4. [ ] Strength hex shows correct city count
5. [ ] Progression track shows 8 positions with current position highlighted
6. [ ] Warning/danger styling when defenders losing
7. [ ] Tooltip shows detailed breakdown on hover/tap
8. [ ] Works in both flat and voxel themes
9. [ ] Zooms/pans with the rest of the board
10. [ ] No collision with ports or other hexes
11. [ ] Only renders in Cities & Knights mode
