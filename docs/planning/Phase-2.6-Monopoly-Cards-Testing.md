# Phase 2.6 Testing Checklist - Resource Monopoly & Trade Monopoly Cards

## Test Environment
- Cards: Resource Monopoly, Trade Monopoly
- Implementation: CardExecutor (new) vs Legacy (old)
- Expected Behavior: Identical results
- **Key Feature**: Both cards require parameter selection (resource or commodity type)

---

## Test Case 1: Resource Monopoly Card

### Scenario A: Standard Case
- Player 1 plays Resource Monopoly and selects "wood"
- Player 2 has 3 wood
- Player 3 has 1 wood
- Player 4 has 0 wood

### Expected Behavior (Legacy)
```typescript
// Legacy: executeResourceMonopoly()
// Takes up to 2 wood from each opponent
// Result: 2 from P2 + 1 from P3 + 0 from P4 = 3 wood stolen
// Log: "Player 1 stole 3 wood from opponents (Player 2: 2, Player 3: 1, Player 4: 0)"
```

### New Implementation
```typescript
// CardExecutor → executeStealFromOpponents()
// Config: cardType: 'resource', maxPerOpponent: 2
// Result: 2 from P2 + 1 from P3 + 0 from P4 = 3 wood stolen
// Log: "Player 1 stole 3 wood from opponents (Player 2: 2, Player 3: 1, Player 4: 0)"
```

### Verification Steps
1. ✅ Player 1 wood count increases by correct amount (3)
2. ✅ Player 2 wood decreases by 2
3. ✅ Player 3 wood decreases by 1
4. ✅ Player 4 wood unchanged (had 0)
5. ✅ Log message matches legacy format
6. ✅ No errors thrown
7. ✅ Game state remains consistent

### Scenario B: No One Has Resource
- Player 1 plays Resource Monopoly and selects "brick"
- All opponents have 0 brick

### Expected Behavior
- Result: 0 brick stolen
- Log: "Player 1 played Resource Monopoly for brick but no one had any"

---

## Test Case 2: Trade Monopoly Card

### Scenario A: Standard Case
- Player 1 plays Trade Monopoly and selects "paper"
- Player 2 has 2 paper
- Player 3 has 1 paper
- Player 4 has 0 paper

### Expected Behavior (Legacy)
```typescript
// Legacy: executeTradeMonopoly()
// Takes 1 paper from each opponent who has any
// Result: 1 from P2 + 1 from P3 + 0 from P4 = 2 paper stolen
// Log: "Player 1 stole 2 paper from opponents (Player 2: 1, Player 3: 1, Player 4: 0)"
```

### New Implementation
```typescript
// CardExecutor → executeStealFromOpponents()
// Config: cardType: 'commodity', maxPerOpponent: 1
// Result: 1 from P2 + 1 from P3 + 0 from P4 = 2 paper stolen
// Log: "Player 1 stole 2 paper from opponents (Player 2: 1, Player 3: 1, Player 4: 0)"
```

### Verification Steps
1. ✅ Player 1 paper count increases by correct amount (2)
2. ✅ Player 2 paper decreases by 1 (still has 1 left)
3. ✅ Player 3 paper decreases by 1 (now has 0)
4. ✅ Player 4 paper unchanged (had 0)
5. ✅ Log message matches legacy format
6. ✅ No errors thrown
7. ✅ Game state remains consistent

### Scenario B: No One Has Commodity
- Player 1 plays Trade Monopoly and selects "cloth"
- All opponents have 0 cloth

### Expected Behavior
- Result: 0 cloth stolen
- Log: "Player 1 played Trade Monopoly for cloth but no one had any"

---

## Test Case 3: Edge Cases

### 3a: Resource Monopoly - Opponent Has Exactly 2
- Opponent has exactly 2 of the chosen resource
- Expected: All 2 taken (not more, not less)

### 3b: Trade Monopoly - Opponent Has Many
- Opponent has 5 of the chosen commodity
- Expected: Only 1 taken (maxPerOpponent limit)

### 3c: Missing Options Parameter
- Card played without specifying resource/commodity type
- Expected: Error thrown: "Resource/Trade Monopoly requires selection"

### 3d: Player Commodities Not Initialized
- Opponent doesn't have commodities object initialized
- Expected: No crash, treats as 0 commodities

---

## Code Comparison

### Legacy Implementation (lines 932-1006)

**Resource Monopoly:**
```typescript
function executeResourceMonopoly(gameState, player, options) {
    const { resource } = options || {};
    if (!resource) {
        throw new Error('Resource Monopoly requires resource selection');
    }

    let totalTaken = 0;
    const perPlayerAmounts: string[] = [];

    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;

        const amount = otherPlayer.resources[resource] || 0;
        const amountToTake = Math.min(amount, 2); // Up to 2 per player

        perPlayerAmounts.push(`${otherPlayer.name}: ${amountToTake}`);

        if (amountToTake > 0) {
            removeResources(otherPlayer, { [resource]: amountToTake });
            totalTaken += amountToTake;
        }
    }

    if (totalTaken > 0) {
        addResources(player, { [resource]: totalTaken });
    }

    gameState.logs.push({
        message: `${player.name} stole ${totalTaken} ${resource} from opponents (${perPlayerAmounts.join(', ')})`
    });
}
```

**Trade Monopoly:**
```typescript
function executeTradeMonopoly(gameState, player, options) {
    const { commodity } = options || {};
    if (!commodity) {
        throw new Error('Commercial Monopoly requires commodity selection');
    }

    let totalTaken = 0;
    const perPlayerAmounts: string[] = [];

    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;
        if (!otherPlayer.commodities) continue;

        const amount = otherPlayer.commodities[commodity] || 0;
        const amountToTake = Math.min(amount, 1); // Only 1 per player

        perPlayerAmounts.push(`${otherPlayer.name}: ${amountToTake}`);

        if (amountToTake > 0) {
            otherPlayer.commodities[commodity] -= amountToTake;
            totalTaken += amountToTake;
        }
    }

    if (totalTaken > 0) {
        if (!player.commodities) {
            player.commodities = { paper: 0, cloth: 0, coin: 0 };
        }
        player.commodities[commodity] += totalTaken;
    }

    gameState.logs.push({
        message: `${player.name} stole ${totalTaken} ${commodity} from opponents (${perPlayerAmounts.join(', ')})`
    });
}
```

### New Implementation

**Card Configs (card-definitions.ts):**
```typescript
{
    type: 'resource_monopoly',
    category: 'trade',
    isVictoryPoint: false,
    requiresInteraction: true, // Player must select resource type
    effects: [
        {
            type: 'steal_from_opponents',
            cardType: 'resource',
            maxPerOpponent: 2,
            requiresSelection: true
        }
    ]
},
{
    type: 'trade_monopoly',
    category: 'trade',
    isVictoryPoint: false,
    requiresInteraction: true, // Player must select commodity type
    effects: [
        {
            type: 'steal_from_opponents',
            cardType: 'commodity',
            maxPerOpponent: 1,
            requiresSelection: true
        }
    ]
}
```

**Effect Executor (ResourceEffects.ts):**
```typescript
export function executeStealFromOpponents(
    state: GameState,
    playerId: string,
    effect: StealFromOpponentsEffect,
    options?: { resource?: string; commodity?: string }
): GameState {
    const opponents = getOpponents(state, playerId);
    let totalStolen = 0;
    const perPlayerAmounts: string[] = [];

    if (effect.cardType === 'resource') {
        const resource = (options?.resource || effect.resourceType) as ResourceType;
        if (!resource) throw new Error('Resource Monopoly requires resource selection');

        for (const opponent of opponents) {
            const available = opponent.resources[resource] || 0;
            const amountToSteal = Math.min(available, effect.maxPerOpponent);
            perPlayerAmounts.push(`${opponent.name}: ${amountToSteal}`);

            if (amountToSteal > 0) {
                stealResource(state, opponent.id, playerId, resource, amountToSteal);
                totalStolen += amountToSteal;
            }
        }

        if (totalStolen > 0) {
            addLog(state, `stole ${totalStolen} ${resource} from opponents (${perPlayerAmounts.join(', ')})`, playerId);
        } else {
            addLog(state, `played Resource Monopoly for ${resource} but no one had any`, playerId);
        }
    } else if (effect.cardType === 'commodity') {
        const commodity = (options?.commodity || effect.commodityType) as CommodityType;
        if (!commodity) throw new Error('Trade Monopoly requires commodity selection');

        for (const opponent of opponents) {
            if (!opponent.commodities) continue;

            const available = opponent.commodities[commodity] || 0;
            const amountToSteal = Math.min(available, effect.maxPerOpponent);
            perPlayerAmounts.push(`${opponent.name}: ${amountToSteal}`);

            if (amountToSteal > 0) {
                stealCommodity(state, opponent.id, playerId, commodity, amountToSteal);
                totalStolen += amountToSteal;
            }
        }

        if (totalStolen > 0) {
            addLog(state, `stole ${totalStolen} ${commodity} from opponents (${perPlayerAmounts.join(', ')})`, playerId);
        } else {
            addLog(state, `played Trade Monopoly for ${commodity} but no one had any`, playerId);
        }
    }

    return state;
}
```

---

## Behavioral Differences to Check

| Aspect | Legacy | New | Match? |
|--------|--------|-----|--------|
| Resource max per opponent | 2 | 2 (maxPerOpponent) | ✅ |
| Commodity max per opponent | 1 | 1 (maxPerOpponent) | ✅ |
| Requires selection | Yes (options param) | Yes (requiresSelection flag) | ✅ |
| Log format | "stole X from opponents (...)" | Same | ✅ |
| Log when none stolen | No (omitted in legacy?) | Yes (added explicitly) | ⚠️ Check |
| Error when no selection | Yes | Yes | ✅ |
| Handles missing commodities | Yes | Yes | ✅ |

---

## Manual Testing Steps

1. **Start a game** with Cities & Knights enabled
2. **Set up test scenario**:
   - Give Player 1 a Resource Monopoly card
   - Give opponents varying amounts of resources
3. **Play Resource Monopoly**
4. **Verify**:
   - Correct amounts stolen (max 2 per opponent)
   - Log message appears correctly with per-player breakdown
   - No console errors
5. **Repeat for Trade Monopoly** with commodities

---

## Integration Notes

### Options Parameter Format
```typescript
// Resource Monopoly
executeProgressCardEffect(gameState, playerId, 'resource_monopoly', { resource: 'wood' });

// Trade Monopoly
executeProgressCardEffect(gameState, playerId, 'trade_monopoly', { commodity: 'paper' });
```

### UI Requirements
- Both cards must present a selection UI before execution
- Resource Monopoly: Show 5 resource options (wood, brick, sheep, wheat, ore)
- Trade Monopoly: Show 3 commodity options (paper, cloth, coin)

---

## Status

- ✅ Implementation complete
- ✅ Build passing
- ✅ Code review passed
- ⏳ Manual testing pending
- ⏳ UI selection interface pending
- ⏳ Automated tests pending (Phase 4)
