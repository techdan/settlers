# Cities & Knights of Catan — Comprehensive Game Design Document

## 1. Overview
Cities & Knights expands Settlers of Catan with deeper strategy, city improvements, commodities, knights, the barbarian fleet, and metropolises. This GDD defines rules, systems, components, and digital adaptation behaviors.

## 2. Core Additions
- Commodities (paper, cloth, coin)
- City Improvements (Science, Trade, Politics)
- Knights (basic/strong/mighty)
- Barbarian track + invasion resolution
- Metropolises
- Progress Cards (green, yellow, blue)
- Events Dice + Barbarian marker

## 3. Resources & Commodities
Standard resources: lumber, brick, wool, grain, ore  
Commodities:  
- **Paper** (from forest)  
- **Cloth** (from pasture)  
- **Coin** (from mountain)

Production remains tied to hex numbers.

## 4. City Improvements
Three improvement tracks:
- **Science (Green)** → paper  
- **Trade (Yellow)** → cloth  
- **Politics (Blue)** → coin  

Leveling costs:  
1→2: 1 commodity  
2→3: 2 commodities  
3→4: 3 commodities  
4→5: 4 commodities

Reaching level 3 unlocks Progress Cards.  
Reaching level 4 unlocks ability to build a Metropolis.

## 5. Knights
Knights are pieces placed on intersections:
- Basic → Strong → Mighty upgrades  
- States: active/inactive  
- Cost: wool + ore  
- Movement along roads (one edge per activation)  
- Can chase robber, block, or support barbarian defense.

## 6. Barbarian Mechanics
- Barbarian marker moves when event die shows “ship”.  
- Reaches island → invasion happens.  
- Total city strength = # of cities + metropolises  
- Total knight strength = active knight values  
- If knights >= cities → barbarian defeated  
- If cities > knights → weakest player loses a city → settlement  

## 7. Progress Cards
Triggered by event die showing city-gate color: green/yellow/blue.  
Player with improvement ≥3 draws corresponding deck card.  
Each deck has ~20 unique abilities (in digital version implement all).  
Cards include trade advantages, construction boosts, resources, steals, road building, diplomacy, etc.

## 8. Metropolises
Created when reaching level 4 in a branch.  
Three metropolises exist, each permanently tied to a single branch per game.  
Provide:
- +2 victory points  
- City immunity from barbarians  
- Exclusive: only one player can hold each metropolis

## 9. Turn Structure
1. Roll dice (production + event)  
2. Resolve event die:  
   - Ship → barbarian advances  
   - City gate color → progress card  
   - Barbarian icon (in some variants)  
3. Player actions:  
   - Trade (maritime, domestic)  
   - Build (roads, knights, city walls, upgrades, city improvements)  
   - Activate knights  
   - Chase robber  
4. End turn

## 10. Victory Conditions
Victory threshold changes:
- Base game: 10 points  
- Cities & Knights: **13 points**

Points include:
- Settlements (1)  
- Cities (2)  
- Metropolises (+2)  
- Largest army of active knights (2)  
- Special cards / achievements  

## 11. Digital Adaptation Rules
### Board Layout
Use core 19-hex Catan map with spiral token rules.

### UI Panels
- Knight panel: activation / upgrade / movement  
- City improvement panel: tracks and costs  
- Progress card viewer  
- Barbarian tracker  
- Metropolis display

### Realtime Sync
- All board changes broadcast via Supabase Realtime  
- Knight states, progress cards, improvements updated instantly  
- Barbarian track updated for all players  

### Lobby Rules
- Host selects “Cities & Knights Mode”  
- Board generation per Catan rules  
- All players view preview board  
- Game begins only when all players ready

## 12. Data Model
### Player
- resources: dict  
- commodities: dict  
- knights: list  
- improvements: {science, trade, politics}  
- progressCards: []  
- metropolisClaimed: []  
- victoryPoints: int  

### Board
- hexes: terrain, token, coords  
- roads  
- intersections: buildings, knights  
- barbarianIndex  

### Game State
- currentPlayer  
- diceHistory  
- progressDecks  
- barbarianPosition  
- largestArmyOwner  

## 13. AI (Optional)
- Barbarian prediction logic  
- Knight deployment priorities  
- Trade heuristics  
- Improvement investment model  

## 14. Edge Cases
- Multiple players tied for weakest during invasion  
- Progress card overflow  
- Knight displacement  
- Invasion converting metropolis-protected city  
- Simultaneous metropolis claims (first-come)

## 15. Multiplayer Rules
- All actions validated server-side  
- RLS ensures players only move their knights/resources  
- A host-only panel controls game start  
- Realtime updates for all state changes
