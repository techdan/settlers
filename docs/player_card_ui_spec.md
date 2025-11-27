# Player Card UI Specification for Cities & Knights

**Component**: `components/game/GameStatus.tsx` or `components/game/PlayerCard.tsx`
**Related Beads**: SettlersOfLanc-sof.1, SettlersOfLanc-sof.2

---

## Overview

The player card must adapt its display based on the current game mode (base game vs. Cities & Knights). This document specifies exactly what should be shown in each mode.

---

## Base Game Mode Display

### Army Section
- **Label**: "Army"
- **Value**: Total knights played from development cards (`player.knightsPlayed`)
- **Purpose**: Shows military strength for Largest Army achievement

### Achievement Badges
- **Largest Army**: Icon/badge shown if `gameState.largestArmyOwner === player.id`
  - Awards 2 VP
  - Purple/violet color scheme
  - Tooltip: "Largest Army (2 VP)"

### VP Sources
1. Settlements (1 VP each)
2. Cities (2 VP each)
3. Development cards (varies)
4. Longest Road (2 VP)
5. Largest Army (2 VP)

---

## Cities & Knights Mode Display

### Defense Section
- **Label**: "Defense"
- **Value**: Active knight strength (`calculateKnightStrength(player)`)
  - Sum of active knight levels: basic=1, strong=2, mighty=3
  - Only counts ACTIVE knights, not inactive ones
- **Purpose**: Shows military strength for Defender of Catan and barbarian defense

### Achievement Badges
- **Defender of Catan**: Icon/badge shown if `gameState.defenderOfCatan === player.id`
  - Awards 1 VP
  - Green color scheme
  - Tooltip: "Defender of Catan (1 VP)"
  - Can be lost if another player becomes defender

### VP Progress Cards
Display icons for each revealed VP card in `player.revealedVPCards`:

1. **Printer** (Science VP card)
   - Icon: 🖨️ or custom printer icon
   - Awards: +1 VP
   - Tooltip: "Printer (1 VP)"

2. **Constitution** (Politics VP card)
   - Icon: 📜 or custom constitution icon
   - Awards: +1 VP
   - Tooltip: "Constitution (1 VP)"

### Merchant Card
- **Display**: Icon/badge shown if `gameState.activeMerchant === player.id`
- **Icon**: 💼 or custom merchant icon
- **Awards**: +1 VP
- **Tooltip**: "Merchant (1 VP)"
- **Note**: Only one player can have active Merchant at a time

### VP Sources
1. Settlements (1 VP each)
2. Cities (2 VP each)
3. Metropolises (2 VP each - in addition to city's 2 VP)
4. Development cards (varies)
5. Longest Road (2 VP)
6. Defender of Catan (1 VP)
7. VP Progress Cards (1 VP each: Printer, Constitution)
8. Merchant (1 VP)

---

## Implementation Details

### Game Mode Detection
```typescript
const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
```

### Knight Strength vs Knights Played
```typescript
// Base game
const armyValue = player.knightsPlayed || 0;

// Cities & Knights
const defenseValue = calculateKnightStrength(player);
```

### VP Card Display
```typescript
{player.revealedVPCards?.map(cardType => (
    <div key={cardType} className="vp-card-icon" title={`${getCardName(cardType)} (1 VP)`}>
        <CardIcon type={cardType} />
    </div>
))}
```

### Merchant Display
```typescript
{gameState.activeMerchant === player.id && (
    <div className="merchant-icon" title="Merchant (1 VP)">
        <MerchantIcon />
    </div>
)}
```

### Achievement Badge Display
```typescript
// Defender of Catan (C&K)
{gameState.defenderOfCatan === player.id && (
    <div className="defender-badge" title="Defender of Catan (1 VP)">
        <DefenderIcon />
    </div>
)}

// Largest Army (Base game)
{gameState.largestArmyOwner === player.id && (
    <div className="largest-army-badge" title="Largest Army (2 VP)">
        <ArmyIcon />
    </div>
)}
```

---

## Data Model Requirements

### GameState Extensions
```typescript
interface GameState {
    // ... existing fields ...

    // C&K specific
    defenderOfCatan: string | null;  // Player ID who owns Defender
    activeMerchant: string | null;   // Player ID who has active Merchant
}
```

### PlayerState Extensions
```typescript
interface PlayerState {
    // ... existing fields ...

    // C&K specific
    revealedVPCards: ProgressCardType[];  // Printer, Constitution
}
```

---

## Visual Layout Suggestions

### Base Game Player Card
```
┌─────────────────────────┐
│ Player Name             │
│ ━━━━━━━━━━━━━━━━━━━━━  │
│ VP: 8                   │
│                         │
│ 🏘️  Settlements: 3      │
│ 🏙️  Cities: 2           │
│ 🛤️  Longest Road [2 VP] │
│ ⚔️  Army: 5             │
│ 👑 Largest Army [2 VP]  │
└─────────────────────────┘
```

### Cities & Knights Player Card
```
┌─────────────────────────┐
│ Player Name             │
│ ━━━━━━━━━━━━━━━━━━━━━  │
│ VP: 10                  │
│                         │
│ 🏘️  Settlements: 2      │
│ 🏙️  Cities: 1           │
│ 🏛️  Metropolises: 1 [2] │
│ 🛤️  Longest Road [2 VP] │
│ 🛡️  Defense: 6          │
│ 🏆 Defender [1 VP]      │
│ 🖨️  Printer [1 VP]      │
│ 💼 Merchant [1 VP]      │
└─────────────────────────┘
```

---

## Color Scheme Recommendations

- **Defender of Catan**: Green (#22c55e)
- **Largest Army**: Purple (#a855f7)
- **VP Cards**: Gold/yellow (#fbbf24)
- **Merchant**: Blue (#3b82f6)
- **Active (owned)**: Bright colors
- **Inactive (not owned)**: Muted/gray colors

---

## Accessibility Requirements

1. **Icons must have text alternatives** (aria-labels)
2. **Color is not the only indicator** (use icons + text + color)
3. **Tooltips provide full context** (keyboard accessible)
4. **Clear visual hierarchy** (VP sources grouped logically)

---

## Testing Checklist

- [ ] Base game shows "Army" with knights played count
- [ ] C&K shows "Defense" with active knight strength
- [ ] Largest Army badge shows in base game when owned
- [ ] Defender of Catan badge shows in C&K when owned
- [ ] Printer icon shows when revealed
- [ ] Constitution icon shows when revealed
- [ ] Merchant icon shows when player has active Merchant
- [ ] Tooltips show correct VP values
- [ ] Icons have proper colors and contrast
- [ ] Layout doesn't break with many VP sources
- [ ] Real-time updates when achievements change
- [ ] Mode switching works correctly (base ↔ C&K)

---

## References

- **Repair Plan**: `docs/cities_and_knights_repair_plan.md`
- **Feature 1 Bead**: SettlersOfLanc-sof.1 (Progress Cards, VP display)
- **Feature 2 Bead**: SettlersOfLanc-sof.2 (Victory Conditions, Defender)
- **Victory Conditions Code**: `core/rules/victory-conditions.ts`
- **Player Card Component**: `components/game/GameStatus.tsx` (to be updated)
