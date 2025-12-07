# Cities & Knights UI Redesign Documentation

**Project:** Settlers of Lancaster - Cities & Knights Edition
**Date:** 2025-12-06 (Updated)
**Status:** In Development

---

# 🎯 WIREFRAME IMPLEMENTATION PLAN

> **Based on wireframe screenshot and stakeholder clarifications (2025-12-06)**
> **Final design decisions confirmed: 2-row compact player cards, instant tab switching, Chat disabled placeholder**

---

## 📋 Final Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Player Card Layout | 2-row compact | Dense design, future potential to move to top |
| Tab Switching Animation | Instant | No animation overhead, snappy UX |
| Chat Tab | Disabled placeholder | Implement later, show "Coming soon" |
| Target Viewports | Desktop + Tablet Landscape | ~1024px+ width |
| Debug Button | Env-controlled | `NEXT_PUBLIC_DEBUG_MODE` already exists |

---

## 🗺️ Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [+ - 3D]  ┌──────────────┐                        ┌───────────────────────────┐ │
│           │  Barbarian   │                        │         Phase             │ │
│           │  Hex Overlay │                        ├───────────────────────────┤ │
│           └──────────────┘                        │ [●] Player1    8VP [▓▓░]  │ │
│                                                   │ 📦3 📜2 🛤5 ⚔2  🛡1 🏪●   │ │
│              ┌────────────────────────────┐       ├───────────────────────────┤ │
│              │                            │       │ [●] Player2    6VP [▓░░]  │ │
│              │        GAME BOARD          │       │ 📦5 📜1 🛤3 ⚔1  🛡0 🏪-   │ │
│              │                            │       ├───────────────────────────┤ │
│              │                            │       │ [●] Player3    5VP [░░░]  │ │
│              │                            │       │ 📦2 📜3 🛤4 ⚔0  🛡0 🏪-   │ │
│              │                            │       ├───────────────────────────┤ │
│              └────────────────────────────┘       │ [●] Player4    4VP [░░░]  │ │
│                                                   │ 📦1 📜0 🛤2 ⚔0  🛡0 🏪-   │ │
│ ┌──────────┐  ┌───────────────┐  ┌─────────────┐  ├───────────────────────────┤ │
│ │  Build   │  │   Resources   │  │  Progress   │  │   [Log] [Chat] [Stats]    │ │
│ │ (stack)  │  │  + Commodities│  │    Cards    │  │                           │ │
│ └──────────┘  └───────────────┘  └─────────────┘  │   (tabbed content area)   │ │
│                                  ┌───────────────┐│                           │ │
│                                  │ Dice│Trade│End││                           │ │
│                                  │Debug│     │   ││                           │ │
│                                  └───────────────┘└───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 📐 DETAILED COMPONENT SPECIFICATIONS

## 1. Compact Player Card (2-Row Design)

### Visual Design

```
┌────────────────────────────────────────────────────────────┐
│ [●] PlayerName                              8 VP    [🏴]   │  ← Row 1: Identity
│ 📦4 📜2 🛤5 ⚔3   [▓▓▓░░][▓▓░░░][▓░░░░]   🛡1 📜1 🏪●     │  ← Row 2: Stats + Bars + VP
└────────────────────────────────────────────────────────────┘
```

**Row 1 Elements:**
| Element | Description | Style |
|---------|-------------|-------|
| Color Dot | 12x12 circle | `bg-[player.color]` |
| Player Name | Truncated if >12 chars | `text-sm font-semibold` |
| VP Count | Victory points | `text-lg font-bold text-amber-400` |
| Turn Indicator | Flag when current turn | `🏴` or hidden |

**Row 2 Elements (Left to Right):**
| Element | Icon | Description | Tooltip |
|---------|------|-------------|---------|
| Resources | 📦 | Total res + commodities | Full breakdown |
| Prog Cards | 📜 | Progress card count | - |
| Roads | 🛤 | Longest continuous road | Longest Road status |
| Defense | ⚔ | Active knight strength | Knight breakdown |
| Science Bar | `[▓▓▓░░]` | Level 1-5, green | Level 3 = Aqueduct unlock |
| Trade Bar | `[▓▓░░░]` | Level 1-5, yellow | Level 3 = Trading House |
| Politics Bar | `[▓░░░░]` | Level 1-5, blue | Level 3 = Fortress |
| Defender VP | 🛡 | Defender of Catan tokens | +1 VP each |
| VP Cards | 📜 | Revealed VP progress cards | Card names |
| Merchant | 🏪 | ● if owned, - if not | +1 VP if owned |

### Component Architecture

```tsx
// File: components/game/CompactPlayerCard.tsx
interface CompactPlayerCardProps {
    player: PlayerState;
    gameState: GameState;
    isCurrentPlayer: boolean;  // Is this the local user?
    isTurn: boolean;           // Is it this player's turn?
}

// CRITICAL: All detailed information MUST be available via Tooltip
// The compact display is a summary - tooltips provide full details
```

### Data Dependencies

```typescript
// Required from PlayerState:
player.id
player.name
player.color
player.victoryPoints
player.resources: Record<ResourceType, number>
player.commodities: Record<CommodityType, number>  // C&K only
player.progressCards: ProgressCardType[]
player.activeKnightCount: number
player.improvements: { science: number, trade: number, politics: number }
player.metropolisOwned: ('science' | 'trade' | 'politics')[]
player.defenderVPTokens: number
player.revealedVPCards: string[]

// Required from GameState:
gameState.currentTurn                    // For turn indicator
gameState.longestRoadOwner               // For road highlighting
gameState.activeMerchant                 // Player ID who has merchant
gameState.gameMode                       // 'base' | 'cities_and_knights'
```

### Implementation Notes

```tsx
// ⚠️ PITFALL: Don't forget base game mode!
// In base game, hide C&K-specific elements:
// - Improvement bars
// - Commodities
// - Defender VP
// - Merchant

{gameState.gameMode === 'cities_and_knights' && (
    // C&K specific elements here
)}

// ⚠️ PITFALL: Resource count should include commodities in C&K!
const totalCards = Object.values(player.resources).reduce((a, b) => a + b, 0)
    + (gameState.gameMode === 'cities_and_knights' 
        ? Object.values(player.commodities || {}).reduce((a, b) => a + b, 0) 
        : 0);

// ⚠️ PITFALL: Show danger indicator when over safe limit (7 base + 2 per city wall)
const cityWallCount = Object.values(gameState.board.vertices)
    .filter(v => v.owner === player.id && v.hasCityWall).length;
const safeLimit = 7 + (cityWallCount * 2);
const isDanger = totalCards > safeLimit;
```

---

## 2. Compact Improvement Bar Component

### Visual Design

```
[▓][▓][▓][░][░]    ← 5 segments, level 3 has ring indicator
          ↑
     Level 3 = unlock threshold (ring-1 ring-amber-400)
```

### Component Architecture

```tsx
// File: components/ui/icons/CompactImprovementBar.tsx
// ✅ ALREADY CREATED

interface Props {
    type: 'science' | 'trade' | 'politics';
    level: number;              // 0-5
    hasMetropolis?: boolean;    // Show 🏛️ icon
    size?: 'sm' | 'md';         // 'sm' = 8px segments, 'md' = 12px
}

// Color mapping:
const colors = {
    science: 'bg-green-500',   // Matches existing theme
    trade: 'bg-yellow-400',
    politics: 'bg-blue-500',
};
```

### Implementation Notes

```tsx
// ⚠️ PITFALL: Level 3 is the unlock level - ALWAYS show ring indicator
// This is consistent with the 5-city improvement cards in physical game
// Levels 4-5 are for metropolis (one player takes it, steals from level 4+ player)

// ⚠️ PITFALL: Metropolis can be stolen!
// If player.metropolisOwned includes the type, show 🏛️
// But if another player steals it (reaches level 4 when owner at 5), it moves
```

---

## 3. Sidebar Tabs Component

### Visual Design

```
┌─────────────────────────────────────────┐
│  [Log]  │  [Chat]  │  [Stats]          │  ← Tab buttons
├─────────────────────────────────────────┤
│                                         │
│        (Tab content area)               │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### Component Architecture

```tsx
// File: components/game/SidebarTabs.tsx
// ✅ ALREADY CREATED

interface SidebarTabsProps {
    logs: GameLogEntry[];
    diceStats?: DiceStats;
    eventDieStats?: EventDieStats;
}

// Tab configuration (easy to extend):
const tabs = [
    { id: 'log', label: 'Log', disabled: false },
    { id: 'chat', label: 'Chat', disabled: true },  // ← Disabled for now
    { id: 'stats', label: 'Stats', disabled: false },
];
```

### Implementation Notes

```tsx
// ⚠️ PITFALL: Chat tab must be disabled but visible
// Use disabled prop, show tooltip "Coming soon"
// Don't hide the tab entirely - users should know feature is planned

// ⚠️ PITFALL: Stats tab needs diceStats from gameState
// If no rolls yet, show placeholder message
// diceStats may be undefined on fresh games

// ⚠️ IMPORTANT: Tab content must be scrollable
// Use overflow-y-auto on content container
// Set max-h to prevent sidebar from growing too tall
```

---

## 4. Barbarian Hex Overlay

### Visual Design

```
┌─────────────────────────────┐
│   ⚔ 2   Active Knights      │  ← Upper hex: Knight strength
│   🚢 3   Barbarian Strength  │
├─────────────────────────────┤
│   [○][○][●][○][○][○][○][○]  │  ← Lower hex: Track position
│      Position: 3 / 7        │
└─────────────────────────────┘
```

### Position Strategy

```typescript
// The overlay should be positioned OUTSIDE the main hex grid
// to avoid overlap with ports and the game board

// Option 1: Use foreignObject in SVG (for in-board positioning)
// - Renders HTML content inside SVG
// - Position at negative hex coordinates

// Option 2: Position as absolute overlay (RECOMMENDED)
// - Simpler CSS positioning
// - Easier responsive behavior
// - Position: absolute top-32 left-4 (below map controls)

// ⚠️ PITFALL: Must work around ports!
// The upper-left area has a port (Sheep 2:1)
// Position the overlay ABOVE the port, not overlapping
```

### Component Architecture

```tsx
// File: components/board/BarbarianHexOverlay.tsx
interface BarbarianHexOverlayProps {
    barbarianPosition: number;      // 0-7 (attacks at 7)
    totalKnightStrength: number;    // Sum of all players' active knights
    totalCityCount: number;         // Sum of all players' cities
    attackThreshold: number;        // Usually 7
}

// Calculate totals in GameController before passing:
const totalKnightStrength = gameState.players.reduce(
    (sum, p) => sum + (p.activeKnightCount || 0), 0
);
const totalCityCount = gameState.players.reduce(
    (sum, p) => sum + (4 - p.citiesRemaining), 0
);
```

### Implementation Notes

```tsx
// ⚠️ PITFALL: Attack threshold is configurable but typically 7
// Import from: CK_CONSTANTS.BARBARIAN_ATTACK_POSITION

// ⚠️ PITFALL: Knights must be ACTIVE to count
// player.activeKnightCount, not total knight count
// Inactive knights don't defend!

// ⚠️ PITFALL: Show warning state when defenders losing
const isDefeatImminent = totalKnightStrength < totalCityCount;
// Use red/danger styling when true
```

---

## 5. Bottom Layout Restructure

### Layout Structure

```
bottom-left           bottom-center                bottom-right
┌──────────┐  ┌─────────────────────────┐  ┌────────────────────┐
│   Build  │  │  Resources + Comms      │  │   Progress Cards   │
│  (stack) │  │                         │  │                    │
└──────────┘  └─────────────────────────┘  └────────────────────┘
                                           ┌────────────────────┐
                                           │ Dice|Trade|End     │
                                           │ Debug              │
                                           └────────────────────┘
```

### Build Controls (Vertical Stack)

```tsx
// File: components/game/BuildControls.tsx
// Add vertical layout variant

interface BuildControlsProps {
    // ... existing props
    layout?: 'horizontal' | 'vertical';  // NEW: default 'horizontal'
}

// Vertical layout:
<div className="flex flex-col gap-1 w-20">
    <BuildButton icon="🛣️" label="Road" ... />
    <BuildButton icon="🏠" label="Settlement" ... />
    <BuildButton icon="🏙️" label="City" ... />
    <BuildButton icon="⚔️" label="Knight" ... />  // C&K only
    <BuildButton icon="🏰" label="Wall" ... />    // C&K only
</div>

// ⚠️ PITFALL: Only show Knight/Wall buttons in C&K mode
```

---

# 📱 MOBILE / TABLET CONSIDERATIONS

## Viewport Breakpoints

```css
/* Target: Desktop and Tablet Landscape */
/* Minimum viable width: 1024px */

/* For narrower viewports, consider: */
@media (max-width: 1023px) {
    /* Right sidebar: reduce width or collapse */
    /* Bottom controls: stack vertically */
    /* Barbarian overlay: reduce size or move */
}
```

## Touch Target Sizes

```tsx
// Minimum touch target: 44x44px (Apple HIG guideline)
// Current button sizes may be too small on tablet

// Improvement bar segments (8px) are too small for touch
// Solution: Entire bar is hover/click target, not individual segments

// Tab buttons should be at least 44px tall
className="min-h-[44px] ..."
```

## Potential Mobile Issues

| Issue | Current State | Mitigation |
|-------|---------------|------------|
| Player card density | 2 rows, lots of icons | Tooltips work on long-press |
| Improvement bars | 5 tiny segments | Tooltip shows level clearly |
| Tabs | May be too small | Use min-height 44px |
| Barbarian overlay | Fixed position | May need responsive positioning |

---

# 🚨 COMMON PITFALLS FOR JUNIOR DEVELOPERS

## 1. Type Safety

```typescript
// ❌ WRONG: Assuming properties exist
const count = player.progressCards.length;  // May crash if undefined

// ✅ RIGHT: Always use optional chaining
const count = player.progressCards?.length || 0;

// ❌ WRONG: Assuming gameMode
const isKnights = gameState.gameMode === 'cities_and_knights';

// ✅ RIGHT: Check for both base and C&K
const isCK = gameState.gameMode === 'cities_and_knights';
const isBase = gameState.gameMode === 'base' || !gameState.gameMode;
```

## 2. State Management

```typescript
// ❌ WRONG: Reading stale state in callbacks
const handleClick = () => {
    console.log(someState);  // May be stale
};

// ✅ RIGHT: Use functional updates
setActiveTab(prev => prev === 'log' ? 'stats' : 'log');
```

## 3. Tooltip Accessibility

```tsx
// ❌ WRONG: Tooltip only on hover (not accessible on touch)
<div onMouseEnter={showTooltip}>

// ✅ RIGHT: Use onClick for touch devices too
<Tooltip content="...">  // Our Tooltip component handles this
```

## 4. Existing Component Reuse

```tsx
// ✅ REUSE existing components where possible:

// Tooltip component: components/ui/tooltip.tsx
import { Tooltip } from '@/components/ui/tooltip';

// Game icons: components/ui/icons/GameIcon.tsx
import { GameIcon, ImprovementIcon } from '@/components/ui/icons/GameIcon';

// DiceStatsPanel: components/game/DiceStatsPanel.tsx
// GameLog: components/game/GameLog.tsx
```

## 5. CSS Positioning

```tsx
// ❌ WRONG: Using `fixed` for game UI elements
// Fixed elements don't scroll with the game board

// ✅ RIGHT: Use `absolute` within the game container
<div className="relative h-screen w-screen">
    <div className="absolute top-4 left-4">...</div>  // ✅ Positioned correctly
</div>
```

---

# 📊 DATA FLOW PATTERNS

## GameController → Components

```
GameController (state owner)
    │
    ├─→ GameStatus
    │       └─→ CompactPlayerCard (for each player)
    │               └─→ CompactImprovementBar (×3 for C&K)
    │
    ├─→ SidebarTabs
    │       ├─→ GameLog
    │       ├─→ ChatPlaceholder
    │       └─→ DiceStatsPanel
    │
    ├─→ BarbarianHexOverlay (C&K only)
    │
    ├─→ BuildControls
    ├─→ PlayerHand
    ├─→ ProgressCardHand (C&K only)
    └─→ ActionControls (Dice, Trade, End, Debug)
```

## Prop Threading Pattern

```tsx
// GameController.tsx
<GameStatus
    gameState={gameState}           // Full state
    currentPlayerId={playerId}      // Local player
    vpAckTimestamp={...}            // For VP card animation
/>

// GameStatus.tsx
{gameState.players.map(player => (
    <CompactPlayerCard
        key={player.id}
        player={player}
        gameState={gameState}
        isCurrentPlayer={player.id === currentPlayerId}
        isTurn={gameState.currentTurn === player.id}
    />
))}

// ⚠️ IMPORTANT: Don't pass entire gameState if only a few fields needed
// Extract needed fields in parent, pass only what's required
```

---

# ✅ IMPLEMENTATION CHECKLIST

## Phase 0: Environment Setup
- [x] `NEXT_PUBLIC_DEBUG_MODE` already exists in codebase
- [ ] Verify debug flag works in both dev and production

## Phase 1: Right Sidebar Restructure (HIGH PRIORITY)
- [x] Create `SidebarTabs.tsx` ✅ Created
- [x] Create `CompactPlayerCard.tsx` ✅ Created
- [x] Create `CompactImprovementBar.tsx` ✅ Created
- [x] Create `CompactGameStatus.tsx` ✅ Created (uses CompactPlayerCard)
- [ ] Integrate `CompactGameStatus` + `SidebarTabs` into `GameController.tsx`
- [ ] Remove `GameLog` from left sidebar
- [ ] Test: All player info accessible via tooltips
- [ ] Test: Tab switching instant (no animation)
- [ ] Test: Chat tab disabled with "Coming soon"

## Phase 2: Barbarian Hex Overlay (HIGH PRIORITY)
- [x] Create `BarbarianHexOverlay.tsx` ✅ Created
- [ ] Position in upper-left, avoiding ports
- [x] Display knight strength vs barbarian strength ✅ Implemented
- [x] Display track position (0-7) ✅ Implemented
- [x] Show danger state when defenders losing ✅ Implemented
- [ ] Integrate into `GameController.tsx`
- [ ] Remove `BarbarianTrack` from right sidebar
- [ ] Test: Hover shows detailed breakdown

## Phase 3: Bottom Layout Restructure (MEDIUM PRIORITY)
- [ ] Add `layout` prop to `BuildControls.tsx`
- [ ] Position Build controls bottom-left
- [ ] Keep Resources/PlayerHand bottom-center
- [ ] Keep ProgressCardHand with Resources
- [ ] Test: No overlap with game board
- [ ] Test: Works at various zoom levels

## Phase 4: Top-Left & Action Controls (MEDIUM PRIORITY)
- [ ] Simplify MapControls to `+ - 3D` only
- [ ] Add Debug toggle to ActionControls
- [ ] Test: All controls functional
- [ ] Test: Debug only visible when env flag set

## Phase 5: Polish & Testing (LOW PRIORITY)
- [ ] Test at 1920×1080 (desktop)
- [ ] Test at 1024×768 (tablet landscape)
- [ ] Test with 4 players (max sidebar)
- [ ] Test with max progress cards
- [ ] Keyboard navigation for tabs (optional)

---

## Changelog

### 2025-12-06 - Component Implementation (Session 2)
- Created `CompactPlayerCard.tsx` - 2-row dense player card with all C&K info
- Created `CompactGameStatus.tsx` - Uses CompactPlayerCard for player list
- Created `BarbarianHexOverlay.tsx` - On-board barbarian track display
- All components compile without TypeScript errors
- All detailed info accessible via tooltips

### 2025-12-06 - Comprehensive Implementation Guide (Session 1)
- **FINAL DECISION:** 2-row compact player cards
- **FINAL DECISION:** Instant tab switching (no animation)
- **FINAL DECISION:** Chat tab disabled placeholder
- Added detailed component specifications with TypeScript interfaces
- Added data flow patterns and prop threading examples
- Added mobile/tablet considerations
- Added common pitfalls section for junior developers
- Added implementation checklist with completion tracking
- Created `SidebarTabs.tsx` component
- Created `CompactImprovementBar.tsx` component

### 2025-12-01 - Initial Design
- Created original UI redesign document
- (Previous content preserved below)

---
---


## Table of Contents
1. [Overview](#overview)
2. [Layout Reconfiguration](#layout-reconfiguration)
3. [Component Changes](#component-changes)
4. [Visual Design System](#visual-design-system)
5. [Typography](#typography)
6. [Icon System](#icon-system)
7. [Color Palette](#color-palette)
8. [Motion & Animations](#motion--animations)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Design Philosophy
**"Rustic Medieval Strategy"** - Evoke the aesthetic of medieval trade routes, conquest, and civilization building through:
- Warm, earthy color palette (stone, wood, parchment)
- Classical serif typography (Crimson Pro)
- Hand-crafted iconography from game-icons.net
- Subtle textures and layered backgrounds
- Purposeful motion that enhances gameplay clarity

### Core Goals
1. **Maximize game board visibility** - Reduce UI clutter around the hex board
2. **Fix layout issues** - Resolve resource/progress card height mismatch
3. **Remove redundancy** - Consolidate Event Die display
4. **Integrate Barbarian Track** - Move from panel to on-board hex tiles
5. **Improve information hierarchy** - Critical info always visible, details on-demand
6. **Create distinctive aesthetic** - Avoid generic Material Design, embrace medieval theme

---

## Layout Reconfiguration

### Current Layout Problems
1. **Bottom Panel Height Issue:** Resources panel stretches to match Progress Cards height (up to 64 rows)
2. **Event Die Redundancy:** Shown both in upper-right panel AND lower-right dice display
3. **Barbarian Track:** Takes permanent screen space in upper-right
4. **Fixed Panels:** Game Log and Map Controls not collapsible
5. **Screen Competition:** Too many panels compete with game board

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Map Controls ▼]                    [GameStatus Panel]         │
│                                      [Player 1: 8 VP]           │
│  [Game Log ▼]                        [Player 2: 6 VP]           │
│  ├─ Recent action...                 [Player 3: 5 VP]           │
│  ├─ Trade completed                  [Player 4: 4 VP]           │
│  └─ ...                                                          │
│                                                                  │
│              ┌───────────────────────────┐                       │
│              │                           │                       │
│              │     HEX GAME BOARD        │    [Dice Display]    │
│              │                           │    [🎲 7] [🚢]       │
│              │      (Maximized)          │                       │
│              │                           │    [Trade 💱]        │
│              │   [🏴‍☠️][🏴‍☠️] Barbarian   │    [End Turn ⏭]     │
│              │    Track Hexes            │                       │
│              └───────────────────────────┘                       │
│                                                                  │
│         [Build: Road 🛣️][Settlement 🏠][City 🏙️][Knight ⚔️]    │
│                                                                  │
│         [Resources: 🌲2 🧱3 🐑1 🌾4 🪨2] (12)                   │
│                                                                  │
│         [Progress Cards: 🟢Alchemist | 🟡Merchant | ...]        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Bottom Center - Vertical Stack (Fixes Height Issue)
**Before:** Resources and Progress Cards in horizontal flex with `items-stretch`
**After:** Vertical stack with independent heights

```tsx
<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
  {/* Layer 1: Build Controls */}
  <BuildControls ... />

  {/* Layer 2: Resources & Commodities (Fixed height) */}
  <div className="flex gap-4 items-center">
    <PlayerHand ... />
  </div>

  {/* Layer 3: Progress Cards (Independent height) */}
  <div className="flex gap-4">
    <ProgressCardHand ... />
  </div>
</div>
```

**Impact:**
- Resources panel maintains compact height
- Progress Cards can expand to max-h-64 independently
- Clear visual separation between resource state and strategic cards

#### 2. Event Die - Tooltip Integration
**Before:** Separate EventDieDisplay panel in upper-right
**After:** Hover tooltip on Event Die in DiceDisplay (lower-right)

**Removed:**
```tsx
{/* DELETE - EventDieDisplay.tsx component */}
<EventDieDisplay gameState={gameState} />
```

**Added to DiceDisplay.tsx:**
```tsx
<Tooltip text={`${EVENT_DIE_LABELS[face]}\n${face === 'ship' ? '⚔️ Barbarian advances!' : '📜 Progress cards drawn'}`}>
  <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center">
    <span className="text-3xl">{EVENT_DIE_ICONS[face]}</span>
  </div>
</Tooltip>
```

**Impact:**
- Removes entire upper-right panel
- Consolidates dice information in one location
- Tooltip provides context on-demand

#### 3. Barbarian Track - On-Board Hex Integration
**Before:** BarbarianTrack panel (320px × 200px) in upper-right
**After:** 2 hex tiles on game board with hover tooltip

**Design Specs:**
- **Location:** Lower-right of game board
  - Hex 1: Between Tree Port (2:1 Wood) and 3:1 Harbor Port
  - Hex 2: Extended from Hex 1 (shared edge)
- **Visual:** Dark, ominous hex tiles (black/crimson gradient)
- **Progress Indicator:** 4 slots per hex (8 total positions)
- **Marker:** Barbarian ship icon 🏴‍☠️ positioned at current barbarianPosition
- **Hover:** Shows full BarbarianTrack panel as tooltip

**Component Structure:**
```tsx
// New component: components/board/BarbarianHexTiles.tsx
<g className="barbarian-track">
  {/* Hex 1 - Positions 0-3 */}
  <HexTile
    q={-2} r={3}
    className="barbarian-hex"
    onClick={() => setHoverDetails(true)}
  >
    {barbarianPosition >= 0 && barbarianPosition <= 3 && (
      <BarbarianMarker position={barbarianPosition} />
    )}
  </HexTile>

  {/* Hex 2 - Positions 4-7 */}
  <HexTile
    q={-1} r={3}
    className="barbarian-hex"
    onClick={() => setHoverDetails(true)}
  >
    {barbarianPosition >= 4 && barbarianPosition <= 7 && (
      <BarbarianMarker position={barbarianPosition - 4} />
    )}
  </HexTile>

  {/* Hover Tooltip */}
  {hoverDetails && (
    <ForeignObject>
      <BarbarianTrackTooltip gameState={gameState} />
    </ForeignObject>
  )}
</g>
```

**Hex Styling:**
```css
.barbarian-hex {
  fill: url(#barbarian-gradient);
  stroke: #7f1d1d; /* red-900 */
  stroke-width: 2;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
}

#barbarian-gradient {
  stop-color-1: #1e293b; /* slate-900 */
  stop-color-2: #450a0a; /* red-950 */
}
```

**Impact:**
- Removes 320×200px panel from upper-right
- Integrates thematically with game board (like physical game)
- Hover interaction reveals full stats (Cities vs Knights)
- More immersive and space-efficient

#### 4. Collapsible Panels
**Game Log:**
```tsx
const [logExpanded, setLogExpanded] = useState(true);

{logExpanded ? (
  <div className="w-80 flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <h3>Game Log</h3>
      <button onClick={() => setLogExpanded(false)}>✕</button>
    </div>
    <GameLog logs={gameState.logs} />
  </div>
) : (
  <button onClick={() => setLogExpanded(true)}>
    📜 Show Log
  </button>
)}
```

**Map Controls:**
```tsx
const [mapControlsExpanded, setMapControlsExpanded] = useState(false);

{mapControlsExpanded ? (
  <MapControls onClose={() => setMapControlsExpanded(false)} />
) : (
  <button onClick={() => setMapControlsExpanded(true)}>
    🗺️
  </button>
)}
```

**Impact:**
- Players can hide log/controls when focusing on board
- Recovers ~400px of left-side screen space
- Especially valuable on smaller screens (<1440px)

---

## Component Changes

### Modified Components

#### GameController.tsx
**Changes:**
1. Remove EventDieDisplay import and render (line 1765)
2. Update bottom panel layout (lines 1771-1814) to vertical stack
3. Add state for collapsible panels (logExpanded, mapControlsExpanded)
4. Remove BarbarianTrack panel render (line 1766)

#### DiceDisplay.tsx
**Changes:**
1. Add Tooltip wrapper around Event Die
2. Import EVENT_DIE_LABELS and EVENT_DIE_ICONS
3. Show roll explanation on hover

**New Code:**
```tsx
import { Tooltip } from '@/components/ui/tooltip';

export const DiceDisplay: React.FC<DiceDisplayProps> = ({ diceRoll, eventDieRoll }) => {
  return (
    <div className="flex gap-3 bg-slate-900/90 p-4 rounded-lg border border-slate-700">
      {/* Production Dice */}
      <div className="flex gap-2">
        {diceRoll.map((die, i) => (
          <Die key={i} value={die} />
        ))}
      </div>

      {/* Event Die (C&K) with tooltip */}
      {eventDieRoll && (
        <Tooltip
          text={`${EVENT_DIE_LABELS[eventDieRoll.face]}\n${
            eventDieRoll.face === 'ship'
              ? '⚔️ Barbarian advances one space!'
              : '📜 Progress cards drawn from this category'
          }`}
        >
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-yellow-500">
            <span className="text-3xl">{EVENT_DIE_ICONS[eventDieRoll.face]}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
};
```

#### Board.tsx
**Changes:**
1. Add BarbarianHexTiles component import
2. Render barbarian hexes with game board hexes
3. Position at specified coordinates (q: -2, r: 3) and (q: -1, r: 3)

**New Code:**
```tsx
{gameState.gameMode === 'cities_and_knights' && (
  <BarbarianHexTiles
    barbarianPosition={gameState.barbarianPosition ?? 0}
    gameState={gameState}
  />
)}
```

### New Components

#### components/board/BarbarianHexTiles.tsx
```tsx
import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { HexCoordinates } from '@/lib/hex';
import { BarbarianTrackTooltip } from './BarbarianTrackTooltip';

interface BarbarianHexTilesProps {
  barbarianPosition: number;
  gameState: GameState;
}

export const BarbarianHexTiles: React.FC<BarbarianHexTilesProps> = ({
  barbarianPosition,
  gameState
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const hex1: HexCoordinates = { q: -2, r: 3 };
  const hex2: HexCoordinates = { q: -1, r: 3 };

  const handleHexHover = (e: React.MouseEvent, hexNum: 1 | 2) => {
    setShowTooltip(true);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <g className="barbarian-track-hexes">
      {/* Hex 1: Positions 0-3 */}
      <BarbarianHex
        coord={hex1}
        positions={[0, 1, 2, 3]}
        currentPosition={barbarianPosition}
        onHover={(e) => handleHexHover(e, 1)}
        onLeave={() => setShowTooltip(false)}
      />

      {/* Hex 2: Positions 4-7 */}
      <BarbarianHex
        coord={hex2}
        positions={[4, 5, 6, 7]}
        currentPosition={barbarianPosition}
        onHover={(e) => handleHexHover(e, 2)}
        onLeave={() => setShowTooltip(false)}
      />

      {/* Tooltip */}
      {showTooltip && (
        <BarbarianTrackTooltip
          gameState={gameState}
          position={tooltipPosition}
        />
      )}
    </g>
  );
};
```

#### components/board/BarbarianHex.tsx
```tsx
import React from 'react';
import { HexCoordinates, hexToPixel } from '@/lib/hex';

interface BarbarianHexProps {
  coord: HexCoordinates;
  positions: number[];
  currentPosition: number;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
}

export const BarbarianHex: React.FC<BarbarianHexProps> = ({
  coord,
  positions,
  currentPosition,
  onHover,
  onLeave
}) => {
  const { x, y } = hexToPixel(coord.q, coord.r);
  const size = 50; // Hex size

  // Generate hex path
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    return `${px},${py}`;
  }).join(' ');

  const isActive = positions.includes(currentPosition);
  const relativePosition = currentPosition - positions[0];

  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      {/* Hex background */}
      <defs>
        <linearGradient id={`barbarian-gradient-${coord.q}-${coord.r}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#450a0a" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <polygon
        points={points}
        fill={`url(#barbarian-gradient-${coord.q}-${coord.r})`}
        stroke="#7f1d1d"
        strokeWidth="2"
        className="transition-all duration-300 hover:stroke-red-500"
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
        }}
      />

      {/* Position markers (4 dots) */}
      <g className="position-markers">
        {positions.map((pos, idx) => {
          const markerX = x + (idx % 2 === 0 ? -15 : 15);
          const markerY = y + (idx < 2 ? -15 : 15);
          const isCurrent = pos === currentPosition;

          return (
            <circle
              key={pos}
              cx={markerX}
              cy={markerY}
              r={isCurrent ? 8 : 5}
              fill={isCurrent ? '#ef4444' : '#475569'}
              stroke={isCurrent ? '#fca5a5' : '#64748b'}
              strokeWidth={isCurrent ? 2 : 1}
              className={isCurrent ? 'animate-pulse' : ''}
            />
          );
        })}
      </g>

      {/* Barbarian ship icon if active */}
      {isActive && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          className="pointer-events-none"
        >
          🏴‍☠️
        </text>
      )}

      {/* Position number */}
      <text
        x={x}
        y={y + 25}
        textAnchor="middle"
        fontSize="10"
        fill="#94a3b8"
        className="pointer-events-none font-mono"
      >
        {positions[0]}-{positions[3]}
      </text>
    </g>
  );
};
```

#### components/board/BarbarianTrackTooltip.tsx
```tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { GameState } from '@/lib/types';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

interface BarbarianTrackTooltipProps {
  gameState: GameState;
  position: { x: number; y: number };
}

export const BarbarianTrackTooltip: React.FC<BarbarianTrackTooltipProps> = ({
  gameState,
  position
}) => {
  const barbarianPosition = gameState.barbarianPosition ?? 0;

  const totalCities = gameState.players.reduce((sum, player) => {
    return sum + (4 - player.citiesRemaining);
  }, 0);

  const totalKnightStrength = gameState.players.reduce((sum, player) => {
    return sum + (player.activeKnightCount ?? 0);
  }, 0);

  const defendersWinning = totalKnightStrength >= totalCities;

  const tooltipContent = (
    <div
      className="fixed z-50 bg-slate-900/95 border-2 border-red-800 rounded-lg p-4 shadow-2xl pointer-events-none"
      style={{
        left: position.x + 20,
        top: position.y - 100,
        minWidth: '240px'
      }}
    >
      <div className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
        <span>⚔️</span>
        <span>Barbarian Attack</span>
      </div>

      <div className="text-xs text-slate-300 mb-3">
        Position: <span className="font-bold text-white">{barbarianPosition}/7</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400 mb-1">Cities</div>
          <div className="text-lg font-bold text-blue-400">{totalCities}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400 mb-1">Knights</div>
          <div className={`text-lg font-bold ${defendersWinning ? 'text-green-400' : 'text-red-400'}`}>
            {totalKnightStrength}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-xs">
        {barbarianPosition === CK_CONSTANTS.BARBARIAN_ATTACK_POSITION ? (
          <span className="text-red-400 font-bold">⚔️ Attack!</span>
        ) : defendersWinning ? (
          <span className="text-green-400">✓ Defenders ahead</span>
        ) : (
          <span className="text-red-400">✗ Defenders behind</span>
        )}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
};
```

#### components/ui/tooltip.tsx (if doesn't exist)
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [visible]);

  const tooltipContent = visible && (
    <div
      className="fixed z-[9999] bg-slate-950/90 border border-slate-700 rounded-md px-3 py-1 text-xs text-white shadow-lg pointer-events-none"
      style={{
        left: coords.x,
        top: coords.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="whitespace-pre-line">{text}</div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </div>
      {typeof window !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
};
```

---

## Visual Design System

### Design Tokens

```css
:root {
  /* Colors - Base */
  --board-primary: #1e293b;      /* Slate 900 - Dark stone */
  --board-secondary: #334155;    /* Slate 700 - Weathered wood */
  --board-tertiary: #475569;     /* Slate 600 - Aged metal */

  /* Colors - Accents */
  --accent-gold: #f59e0b;        /* Amber 500 - Medieval gold */
  --accent-crimson: #dc2626;     /* Red 600 - Barbarian danger */
  --accent-ocean: #0284c7;       /* Sky 600 - Trade routes */
  --accent-forest: #16a34a;      /* Green 600 - Resources */
  --accent-royal: #7c3aed;       /* Violet 600 - Politics */

  /* Colors - Category (C&K) */
  --category-science: #16a34a;   /* Green 600 */
  --category-trade: #eab308;     /* Yellow 600 */
  --category-politics: #3b82f6;  /* Blue 600 */

  /* Spacing */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */

  /* Border Radius */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Panel Component Pattern

**Base Panel Structure:**
```tsx
<div className="relative rounded-lg overflow-hidden shadow-xl border-2">
  {/* Background layer */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 to-slate-900/95" />

  {/* Texture overlay (optional) */}
  <div className="absolute inset-0 bg-[url('/textures/parchment.png')] opacity-10 mix-blend-overlay" />

  {/* Border glow */}
  <div className="absolute inset-0 border border-amber-900/40 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />

  {/* Content */}
  <div className="relative z-10 p-4">
    {children}
  </div>
</div>
```

### Button Component Variants

#### Primary Button (Build Controls)
```tsx
<button className="
  relative group overflow-hidden
  px-4 py-3 rounded-xl
  bg-gradient-to-br from-slate-700 to-slate-800
  hover:from-slate-600 hover:to-slate-700
  border-2 border-slate-600 hover:border-amber-500/50
  shadow-lg hover:shadow-xl
  transition-all duration-200
  hover:-translate-y-0.5
  disabled:opacity-40 disabled:cursor-not-allowed
">
  {/* Shine effect */}
  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

  <span className="relative z-10">{children}</span>
</button>
```

#### Active Button (Selected Build Mode)
```tsx
className="
  bg-gradient-to-br from-blue-600 to-blue-700
  border-2 border-blue-400
  ring-2 ring-blue-400/50
  shadow-[0_0_20px_rgba(59,130,246,0.3)]
  animate-pulse
"
```

#### Card Button (Progress Cards)
```tsx
<button className="
  relative group w-full
  px-4 py-3 rounded-lg
  bg-gradient-to-br from-green-800/30 to-green-950/60
  hover:from-green-700/40 hover:to-green-900/70
  border-2 border-green-600/50 hover:border-green-500
  shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]
  transition-all duration-200
">
  {/* Category glow */}
  <div className="absolute inset-0 shadow-[0_0_12px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-shadow" />

  {children}
</button>
```

---

## Typography

### Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

body {
  font-family: var(--font-body);
}

h1, h2, h3, .font-display {
  font-family: var(--font-display);
}

.font-mono, code {
  font-family: var(--font-mono);
}
```

### Typography Scale

```tsx
// Heading 1 - Modal Titles, Game Title
className="font-display text-4xl font-bold tracking-tight"

// Heading 2 - Panel Titles
className="font-display text-2xl font-semibold"

// Heading 3 - Section Headers
className="font-display text-lg font-semibold uppercase tracking-wider"

// Body Large - Player Names, VP Counts
className="font-body text-base font-medium"

// Body - Default UI Text
className="font-body text-sm"

// Body Small - Helper Text, Tooltips
className="font-body text-xs"

// Mono - Dice Values, Resource Counts
className="font-mono text-sm font-bold tabular-nums"
```

### Usage Examples

```tsx
// Game Status Panel Header
<h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">
  Players
</h3>

// Player Name
<span className="font-display text-lg font-semibold text-slate-100">
  {player.name}
</span>

// Victory Points
<span className="font-display text-2xl font-bold text-amber-400">
  {player.victoryPoints} VP
</span>

// Progress Card Name
<span className="font-display text-base font-semibold tracking-wide">
  Alchemist
</span>

// Build Button Label
<span className="font-body text-sm font-bold">
  Road 🛣️
</span>

// Resource Count
<span className="font-mono text-sm font-bold tabular-nums">
  {resources.wood}
</span>
```

---

## Icon System

### Resource & Commodity Icons

**Source:** [game-icons.net](https://game-icons.net)

**Selected Icons:**

| Resource | Current Emoji | New SVG Icon | Icon Name | URL |
|----------|---------------|--------------|-----------|-----|
| Wood | 🌲 | ![wood](https://game-icons.net/icons/ffffff/000000/1x1/lorc/wood-pile.svg) | wood-pile | [Link](https://game-icons.net/1x1/lorc/wood-pile.html) |
| Brick | 🧱 | ![brick](https://game-icons.net/icons/ffffff/000000/1x1/delapouite/stone-pile.svg) | stone-pile | [Link](https://game-icons.net/1x1/delapouite/stone-pile.html) |
| Sheep | 🐑 | ![sheep](https://game-icons.net/icons/ffffff/000000/1x1/delapouite/sheep.svg) | sheep | [Link](https://game-icons.net/1x1/delapouite/sheep.html) |
| Wheat | 🌾 | ![wheat](https://game-icons.net/icons/ffffff/000000/1x1/lorc/wheat.svg) | wheat | [Link](https://game-icons.net/1x1/lorc/wheat.html) |
| Ore | 🪨 | ![ore](https://game-icons.net/icons/ffffff/000000/1x1/lorc/stone-block.svg) | stone-block | [Link](https://game-icons.net/1x1/lorc/stone-block.html) |
| Paper | 📜 | ![paper](https://game-icons.net/icons/ffffff/000000/1x1/lorc/scroll-unfurled.svg) | scroll-unfurled | [Link](https://game-icons.net/1x1/lorc/scroll-unfurled.html) |
| Cloth | 🧵 | ![cloth](https://game-icons.net/icons/ffffff/000000/1x1/lorc/cloth-jar.svg) | cloth-jar | [Link](https://game-icons.net/1x1/lorc/cloth-jar.html) |
| Coin | 🪙 | ![coin](https://game-icons.net/icons/ffffff/000000/1x1/lorc/two-coins.svg) | two-coins | [Link](https://game-icons.net/1x1/lorc/two-coins.html) |

**Additional Game Icons:**

| Element | Icon | Icon Name | URL |
|---------|------|-----------|-----|
| Barbarian Ship | 🏴‍☠️ | ![ship](https://game-icons.net/icons/ffffff/000000/1x1/lorc/galleon.svg) | galleon | [Link](https://game-icons.net/1x1/lorc/galleon.html) |
| Knight | ⚔️ | ![knight](https://game-icons.net/icons/ffffff/000000/1x1/lorc/knight-banner.svg) | knight-banner | [Link](https://game-icons.net/1x1/lorc/knight-banner.html) |
| City | 🏙️ | ![city](https://game-icons.net/icons/ffffff/000000/1x1/delapouite/castle.svg) | castle | [Link](https://game-icons.net/1x1/delapouite/castle.html) |
| Settlement | 🏠 | ![settlement](https://game-icons.net/icons/ffffff/000000/1x1/delapouite/wooden-sign.svg) | wooden-sign | [Link](https://game-icons.net/1x1/delapouite/wooden-sign.html) |
| Road | 🛣️ | ![road](https://game-icons.net/icons/ffffff/000000/1x1/lorc/stone-path.svg) | stone-path | [Link](https://game-icons.net/1x1/lorc/stone-path.html) |
| City Wall | 🏰 | ![wall](https://game-icons.net/icons/ffffff/000000/1x1/lorc/castle-ruins.svg) | castle-ruins | [Link](https://game-icons.net/1x1/lorc/castle-ruins.html) |
| Trade | 💱 | ![trade](https://game-icons.net/icons/ffffff/000000/1x1/lorc/trade.svg) | trade | [Link](https://game-icons.net/1x1/lorc/trade.html) |
| Dice | 🎲 | ![dice](https://game-icons.net/icons/ffffff/000000/1x1/skoll/perspective-dice-six-faces-random.svg) | dice-six | [Link](https://game-icons.net/1x1/skoll/perspective-dice-six-faces-random.html) |

### Icon Implementation

**Component Structure:**
```tsx
// components/ui/icons/ResourceIcon.tsx
import React from 'react';
import { ResourceType } from '@/lib/types';

interface ResourceIconProps {
  type: ResourceType;
  size?: number;
  className?: string;
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({
  type,
  size = 24,
  className = ''
}) => {
  const iconPaths: Record<ResourceType, string> = {
    wood: '/icons/wood-pile.svg',
    brick: '/icons/stone-pile.svg',
    sheep: '/icons/sheep.svg',
    wheat: '/icons/wheat.svg',
    ore: '/icons/stone-block.svg'
  };

  return (
    <img
      src={iconPaths[type]}
      alt={type}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    />
  );
};
```

**SVG Sprite Sheet (Optimized):**
```tsx
// public/icons/resources.svg
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <defs>
    <symbol id="icon-wood" viewBox="0 0 512 512">
      <!-- Paste SVG path from game-icons.net -->
    </symbol>
    <symbol id="icon-brick" viewBox="0 0 512 512">
      <!-- ... -->
    </symbol>
    <!-- ... more icons -->
  </defs>
</svg>

// Usage in components
<svg className="w-6 h-6">
  <use href="/icons/resources.svg#icon-wood" />
</svg>
```

**PlayerHand.tsx Update:**
```tsx
const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  wood: <ResourceIcon type="wood" size={20} />,
  brick: <ResourceIcon type="brick" size={20} />,
  sheep: <ResourceIcon type="sheep" size={20} />,
  wheat: <ResourceIcon type="wheat" size={20} />,
  ore: <ResourceIcon type="ore" size={20} />
};

// Replace emoji with icon
<div className="flex items-center gap-1 px-2">
  {RESOURCE_ICONS[res]}
  <div className="font-bold">{player.resources[res] || 0}</div>
</div>
```

### Icon Download Script

```bash
# Create icons directory
mkdir -p public/icons

# Download icons (requires curl)
# Wood
curl -o public/icons/wood-pile.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/wood-pile.svg"

# Brick
curl -o public/icons/stone-pile.svg "https://game-icons.net/icons/ffffff/000000/1x1/delapouite/stone-pile.svg"

# Sheep
curl -o public/icons/sheep.svg "https://game-icons.net/icons/ffffff/000000/1x1/delapouite/sheep.svg"

# Wheat
curl -o public/icons/wheat.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/wheat.svg"

# Ore
curl -o public/icons/stone-block.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/stone-block.svg"

# Paper
curl -o public/icons/scroll-unfurled.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/scroll-unfurled.svg"

# Cloth
curl -o public/icons/cloth-jar.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/cloth-jar.svg"

# Coin
curl -o public/icons/two-coins.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/two-coins.svg"

# Barbarian Ship
curl -o public/icons/galleon.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/galleon.svg"

# Knight
curl -o public/icons/knight-banner.svg "https://game-icons.net/icons/ffffff/000000/1x1/lorc/knight-banner.svg"
```

---

## Color Palette

### Primary Palette

```css
/* Slate (Base UI) */
--slate-50:  #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-300: #cbd5e1;
--slate-400: #94a3b8;
--slate-500: #64748b;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1e293b;
--slate-900: #0f172a;
--slate-950: #020617;
```

### Accent Colors

```css
/* Amber (Gold, VP, Victory) */
--amber-400: #fbbf24;
--amber-500: #f59e0b;
--amber-600: #d97706;

/* Red (Danger, Barbarians, Negative) */
--red-400: #f87171;
--red-500: #ef4444;
--red-600: #dc2626;
--red-800: #991b1b;
--red-900: #7f1d1d;

/* Green (Success, Science, Resources) */
--green-400: #4ade80;
--green-500: #22c55e;
--green-600: #16a34a;
--green-800: #166534;

/* Blue (Info, Politics, Water) */
--blue-400: #60a5fa;
--blue-500: #3b82f6;
--blue-600: #2563eb;
--blue-700: #1d4ed8;

/* Yellow (Trade, Caution) */
--yellow-400: #facc15;
--yellow-500: #eab308;
--yellow-600: #ca8a04;
```

### Semantic Colors

```css
/* Player Turn Indicator */
--color-active-turn: #eab308; /* yellow-500 */
--color-active-turn-glow: rgba(234, 179, 8, 0.3);

/* Build Mode Active */
--color-build-active: #3b82f6; /* blue-500 */
--color-build-active-glow: rgba(59, 130, 246, 0.3);

/* Progress Card Categories */
--color-science: #16a34a; /* green-600 */
--color-trade: #eab308;   /* yellow-500 */
--color-politics: #3b82f6; /* blue-500 */

/* Resource Highlight (Theft) */
--color-theft-victim: rgba(239, 68, 68, 0.4);   /* red-500 with alpha */
--color-theft-thief: rgba(34, 197, 94, 0.4);    /* green-500 with alpha */
```

### Gradients

```css
/* Panel Backgrounds */
.panel-bg-primary {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.panel-bg-secondary {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
}

/* Category Backgrounds (Progress Cards) */
.card-bg-science {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.2) 0%, rgba(21, 128, 61, 0.3) 100%);
}

.card-bg-trade {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.3) 100%);
}

.card-bg-politics {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.3) 100%);
}

/* Barbarian Hex */
.barbarian-hex-bg {
  background: linear-gradient(135deg, #1e293b 0%, #450a0a 100%);
}

/* Button Shine Effect */
.button-shine {
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 60%,
    transparent 100%
  );
}
```

---

## Motion & Animations

### Animation Principles
1. **Purposeful:** Every animation should communicate state or provide feedback
2. **Subtle:** Avoid distracting from gameplay (duration: 150-300ms)
3. **Natural:** Use easing functions that feel organic (ease-out, ease-in-out)
4. **Performance:** Prefer CSS transforms/opacity over layout properties

### Key Animations

#### 1. Dice Roll
```css
@keyframes diceRoll {
  0% {
    transform: rotate(0deg) rotateX(0deg) rotateY(0deg);
  }
  25% {
    transform: rotate(180deg) rotateX(180deg) rotateY(90deg);
  }
  50% {
    transform: rotate(360deg) rotateX(360deg) rotateY(180deg);
  }
  75% {
    transform: rotate(540deg) rotateX(180deg) rotateY(270deg);
  }
  100% {
    transform: rotate(720deg) rotateX(0deg) rotateY(360deg);
  }
}

.dice-rolling {
  animation: diceRoll 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Implementation:**
```tsx
const [isRolling, setIsRolling] = useState(false);

useEffect(() => {
  if (diceRoll) {
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 800);
  }
}, [diceRoll]);

<div className={isRolling ? 'dice-rolling' : ''}>
  {/* Dice display */}
</div>
```

#### 2. Card Play/Draw
```css
@keyframes cardPlay {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-20px) scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-40px) scale(0.8);
    opacity: 0;
  }
}

@keyframes cardDraw {
  0% {
    transform: translateX(-100px) scale(0.8);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}
```

#### 3. Resource Gain
```css
@keyframes resourcePop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes resourceGlow {
  0%, 100% {
    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
  }
}
```

**Implementation:**
```tsx
const [gainedResources, setGainedResources] = useState<ResourceType[]>([]);

useEffect(() => {
  // Track resource changes
  const newResources = /* calculate diff */;
  setGainedResources(newResources);
  setTimeout(() => setGainedResources([]), 1000);
}, [player.resources]);

<div className={gainedResources.includes(res) ? 'animate-resourcePop' : ''}>
  {/* Resource icon */}
</div>
```

#### 4. Victory Point Count-Up
```tsx
import { useSpring, animated } from '@react-spring/web';

const VPDisplay: React.FC<{ value: number }> = ({ value }) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    config: { tension: 280, friction: 60 }
  });

  return (
    <animated.span className="font-display text-2xl font-bold text-amber-400">
      {number.to(n => Math.floor(n))} VP
    </animated.span>
  );
};
```

#### 5. Barbarian Advance
```css
@keyframes barbarianAdvance {
  0% {
    transform: translateX(0) scale(1);
  }
  50% {
    transform: translateX(10px) scale(1.2);
  }
  100% {
    transform: translateX(20px) scale(1);
  }
}

@keyframes dangerPulse {
  0%, 100% {
    stroke: #7f1d1d;
    filter: drop-shadow(0 0 0 rgba(220, 38, 38, 0));
  }
  50% {
    stroke: #ef4444;
    filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0.8));
  }
}
```

#### 6. Button Hover Shine
```css
.btn-shine {
  position: relative;
  overflow: hidden;
}

.btn-shine::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 60%,
    transparent 100%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.btn-shine:hover::before {
  transform: translateX(100%);
}
```

#### 7. Panel Collapse/Expand
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {logExpanded && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <GameLog logs={gameState.logs} />
    </motion.div>
  )}
</AnimatePresence>
```

### Transition Utilities

```css
/* Quick (UI feedback) */
.transition-quick {
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Normal (default) */
.transition-normal {
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Smooth (panels, modals) */
.transition-smooth {
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Bounce (playful interactions) */
.transition-bounce {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## Implementation Checklist

### Phase 1: Layout Fixes (Priority: HIGH)
- [ ] **GameController.tsx** - Remove EventDieDisplay import and render
- [ ] **GameController.tsx** - Restructure bottom panel to vertical stack
- [ ] **GameController.tsx** - Add state for collapsible panels (logExpanded, mapControlsExpanded)
- [ ] **DiceDisplay.tsx** - Add Tooltip component wrapper around Event Die
- [ ] **DiceDisplay.tsx** - Import EVENT_DIE_LABELS and create tooltip text
- [ ] **GameLog.tsx** - Add collapse/expand button and state
- [ ] Test: Verify resources maintain fixed height independent of progress cards

### Phase 2: Barbarian Track Integration (Priority: HIGH)
- [ ] **Create** `components/board/BarbarianHexTiles.tsx`
- [ ] **Create** `components/board/BarbarianHex.tsx`
- [ ] **Create** `components/board/BarbarianTrackTooltip.tsx`
- [ ] **Board.tsx** - Import and render BarbarianHexTiles
- [ ] **Board.tsx** - Position hexes at coordinates (q: -2, r: 3) and (q: -1, r: 3)
- [ ] **GameController.tsx** - Remove BarbarianTrack panel from upper-right
- [ ] **Add** barbarian hex gradient and styling to CSS
- [ ] Test: Verify hexes render at correct board location
- [ ] Test: Verify tooltip shows on hover with correct stats

### Phase 3: Typography (Priority: MEDIUM)
- [ ] **Install** Crimson Pro font via Google Fonts
- [ ] **Install** Inter font (if not already present)
- [ ] **Update** `tailwind.config.js` to include font families
- [ ] **Create** design tokens in CSS variables (`:root`)
- [ ] **Update** GameStatus.tsx to use `font-display` for headers
- [ ] **Update** ProgressCardHand.tsx to use `font-display` for card names
- [ ] **Update** BuildControls.tsx button labels with typography classes
- [ ] Test: Verify fonts load correctly across all panels

### Phase 4: Icon System (Priority: MEDIUM)
- [ ] **Download** SVG icons from game-icons.net (wood, brick, sheep, wheat, ore, paper, cloth, coin)
- [ ] **Download** Additional icons (galleon, knight-banner, castle, etc.)
- [ ] **Create** `public/icons/` directory
- [ ] **Save** all SVG files to `public/icons/`
- [ ] **Create** `components/ui/icons/ResourceIcon.tsx`
- [ ] **Create** `components/ui/icons/CommodityIcon.tsx`
- [ ] **Update** PlayerHand.tsx to use ResourceIcon/CommodityIcon components
- [ ] **Update** BuildControls.tsx to use new icons
- [ ] **Update** ProgressCardHand.tsx category icons (optional: keep emoji or use SVG)
- [ ] Test: Verify icons render correctly at all sizes
- [ ] Test: Verify icons have proper drop-shadow/styling

### Phase 5: Visual Design (Priority: MEDIUM)
- [ ] **Create** design token CSS variables in `globals.css`
- [ ] **Update** panel backgrounds with gradient patterns
- [ ] **Add** texture overlays (optional: parchment.png)
- [ ] **Update** button styles with shine effect
- [ ] **Update** progress card backgrounds with category gradients
- [ ] **Update** GameStatus improvement tracks to progress bars
- [ ] **Add** border glow effects to active elements
- [ ] Test: Visual consistency across all panels

### Phase 6: Animations (Priority: LOW)
- [ ] **Add** dice roll animation keyframes
- [ ] **Implement** dice rolling state in DiceDisplay
- [ ] **Add** resource gain pop animation
- [ ] **Add** card play/draw animations
- [ ] **Add** VP count-up effect (react-spring)
- [ ] **Add** barbarian advance animation
- [ ] **Add** button hover shine effect
- [ ] **Add** panel collapse/expand animation (framer-motion)
- [ ] Test: All animations smooth at 60fps

### Phase 7: Polish & Accessibility (Priority: LOW)
- [ ] **Add** keyboard navigation for progress cards (Tab, Enter)
- [ ] **Add** focus indicators for all interactive elements
- [ ] **Test** color contrast ratios (WCAG AA minimum)
- [ ] **Add** aria-labels to icon-only buttons
- [ ] **Test** screen reader compatibility
- [ ] **Add** reduced-motion media query support
- [ ] **Optimize** SVG file sizes
- [ ] **Add** loading skeletons for async panels

### Testing Checklist
- [ ] Test on 1920×1080 (primary)
- [ ] Test on 1440×900 (laptop)
- [ ] Test on 2560×1440 (large monitor)
- [ ] Test with 4 players (full GameStatus)
- [ ] Test with maximum progress cards (height overflow)
- [ ] Test all build modes (road, settlement, city, knight, city_wall)
- [ ] Test barbarian hex hover at different zoom levels
- [ ] Test collapsible panels (expand/collapse repeatedly)
- [ ] Test with all 3 progress card categories visible
- [ ] Test Event Die tooltip on all 4 faces (ship, green, yellow, blue)

---

## File Structure

```
src/
├── components/
│   ├── board/
│   │   ├── Board.tsx                      (MODIFIED)
│   │   ├── BarbarianHexTiles.tsx         (NEW)
│   │   ├── BarbarianHex.tsx              (NEW)
│   │   └── BarbarianTrackTooltip.tsx     (NEW)
│   ├── game/
│   │   ├── GameController.tsx            (MODIFIED)
│   │   ├── GameStatus.tsx                (MODIFIED - typography)
│   │   ├── DiceDisplay.tsx               (MODIFIED - tooltip)
│   │   ├── BuildControls.tsx             (MODIFIED - styling)
│   │   ├── PlayerHand.tsx                (MODIFIED - icons)
│   │   ├── ProgressCardHand.tsx          (MODIFIED - styling)
│   │   ├── GameLog.tsx                   (MODIFIED - collapsible)
│   │   ├── EventDieDisplay.tsx           (DELETED)
│   │   └── BarbarianTrack.tsx            (MODIFIED - used in tooltip)
│   └── ui/
│       ├── icons/
│       │   ├── ResourceIcon.tsx          (NEW)
│       │   ├── CommodityIcon.tsx         (NEW)
│       │   └── GameIcon.tsx              (NEW)
│       └── tooltip.tsx                   (NEW - if not exists)
├── public/
│   └── icons/
│       ├── wood-pile.svg                 (NEW)
│       ├── stone-pile.svg                (NEW)
│       ├── sheep.svg                     (NEW)
│       ├── wheat.svg                     (NEW)
│       ├── stone-block.svg               (NEW)
│       ├── scroll-unfurled.svg           (NEW)
│       ├── cloth-jar.svg                 (NEW)
│       ├── two-coins.svg                 (NEW)
│       ├── galleon.svg                   (NEW)
│       └── knight-banner.svg             (NEW)
└── styles/
    └── globals.css                       (MODIFIED - design tokens)
```

---

## Notes & Considerations

### Performance
- SVG sprites preferred over individual PNG/SVG files (faster loading)
- Use CSS transforms for animations (GPU-accelerated)
- Lazy-load panel components when collapsed
- Memoize expensive calculations (VP breakdown, longest road)

### Browser Compatibility
- Target: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- CSS Grid and Flexbox (widely supported)
- CSS custom properties (supported in all modern browsers)
- Framer Motion (requires polyfills for older browsers)

### Future Enhancements
1. **Themes:** Allow users to toggle between "Medieval", "Modern", "High Contrast"
2. **Sound Effects:** Dice roll, card play, resource gain
3. **Board Zoom:** Pinch-to-zoom on game board (especially for barbarian hexes)
4. **Mobile Layout:** Responsive redesign for tablet/phone screens
5. **Animations Toggle:** User preference to disable all animations
6. **Customizable Panels:** Drag-and-drop panel repositioning

---

## Changelog

### 2025-12-01 - Initial Design
- Created comprehensive UI redesign document
- Defined layout reconfiguration strategy
- Specified component changes and new components
- Established visual design system with Crimson Pro typography
- Selected game-icons.net icons for resources and game elements
- Documented animation patterns and motion principles
- Created implementation checklist with priorities

---

## References

- **Typography:** [Crimson Pro on Google Fonts](https://fonts.google.com/specimen/Crimson+Pro)
- **Icons:** [game-icons.net](https://game-icons.net)
- **Color System:** [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- **Animation Library:** [Framer Motion](https://www.framer.com/motion/)
- **Spring Animations:** [React Spring](https://www.react-spring.dev/)
- **Design Inspiration:** Settlers of Catan (physical board game), Age of Empires II UI, Civilization VI UI

---

**End of UI Redesign Documentation**
