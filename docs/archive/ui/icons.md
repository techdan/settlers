# Icon Mapping Configuration (Archived)

**Status:** Archived — this mapping belongs to the retired `/public/icons` pipeline

This file maps SVG icons from `/public/icons` to game elements with their associated colors. Game icons come from https://game-icons.net/

## Instructions

Fill in the following columns:
- **Maps To**: What game element this icon represents (e.g., "resource-wood", "knight-basic", "improvement-science")
- **Color**: Hex color code for the icon (e.g., "#8B4513", "#FFD700")
- **Category**: Group the icon belongs to (Resources, Commodities, Knights, Improvements, Structures, Special)
- **Notes**: Any additional context or usage notes

## Icon Mappings

| SVG Filename | Maps To | Color | Category | Notes |
|--------------|---------|-------|----------|-------|
| backward-time.svg | More Time Button | | Action Button | |
| bandana.svg | | | | |
| bank.svg | | | | |
| barbarian-ship.svg | | | | |
| black-knight-helm.svg | strong knight | | | |
| brick-pile-colored.svg | brick | Pre-colored: bg=#ca7728, fg=#d35830, stroke=#891e21 | resource | Uses actual colors, no processing |
| cactus-colored.svg | desert | Pre-colored | hex tile | Uses actual colors, no processing |
| cactus.svg | desert (alternative) | | hex tile | Uncolored version |
| checked-shield.svg | | | | |
| city.svg | city | | | |
| city-wall.svg | | | | |
| cloth.svg | | |  | |
| coin.svg | coin | metallic blue / ore grey background | commodity | |
| cowled.svg | | | | |
| crown.svg | | | | |
| cultist.svg | | | | |
| dice-six-faces-five.svg | dice 5 | red, yellow | | |
| dice-six-faces-four.svg | dice 4 | red, yellow | | |
| dice-six-faces-one.svg | dice 1 | red, yellow | | |
| dice-six-faces-six.svg | dice 6 | red, yellow | | |
| dice-six-faces-three.svg | dice 3 | red, yellow | | |
| dice-six-faces-two.svg | dice 2 | red, yellow | | |
| desert.svg |  |  |  |  |
| drakkar.svg | Barbarian Ship |  | Event Die |  |
| folded-paper.svg |  |  |  | |
| knight-basic.svg | basic knight | | | |
| knight-mighty.svg | | | | |
| mad-scientist.svg | | | | |
| metropolis.svg | | | | |
| modern-city.svg | | | | |
| mounted-knight.svg | | | | |
| mustache.svg | merchant | | | |
| pilgrim-hat.svg | | | | |
| player-next.svg | End Turn Button | | Action Button | |
| ribbon-shield.svg | | | | |
| road.svg | cloth | off white (faded yellow?) / pasture green background | commodity | |
| robber.svg | robber | | | |
| robber-mask.svg | | | | |
| rolled-cloth.svg | | | | |
| rolling-dices.svg | Roll Dice | | Action Button | |
| scales.svg | Trade | | City Improvement / Event Die | |
| science.svg | | | | |
| scroll-unfurled.svg | paper | parchment color (faded yellow?) / forest green background  | commodity | |
| shaking-hands.svg | Politics | | City Improvement / Event Die | |
| sheep.svg | sheep | sheep white / pasture green background | resource | |
| shield.svg | | | | |
| spy.svg | | | | |
| stone-block.svg | | | | |
| stone-pile.svg | ore | stone grey / ore grey background | resource | make sure constrasts |
| time-trap.svg |  | | | |
| trade.svg | Trade Button | | Action Button | |
| trophy.svg | | | | |
| village.svg | settlement | | | |
| wheat.svg | wheat | wheat yellow / field yellwo background | resource | make sure contrasts |
| wizard-face.svg | | | | |
| wood-pile-colored.svg | wood | Pre-colored: bg=#006636, fg=#723921, stroke=#4b2619 | resource | Uses actual colors, no processing |

## Color Palette Reference

### Hex Tiles
- Hills (produce brick): #ca7728 ## #71140E  OPTIONS #ca7728 # #d74315 # #b22222
- Forest (produce wood): #06740E ## `#006636`
- Mountain (produce ore): `#666d63`
- Pasture (produce sheep): `#84b83f`
- Fields (produce wheat): `#f9e26f`
- Desert (produce nothing): #e4c27c

### Resources (Natural, Earthy)
- Wood: #E79108 `#723921` (foreground) + Stroke `#4b2619` # Extracted from wood-pile.svg
- Brick: #EEE4DA  #CA7728 # OTHER OPTIONS  #D74315   #d35830 (foreground) + Stroke #FFA648   #891e21
- Sheep: `#ded7bc` # Other (Beige)
- Wheat: `#db8b1f` # Other (Goldenrod)
- Ore: `#4f4a3c` # Other (Slate gray)

### Commodities (Refined, Valuable)
- Paper: `#e8c4a4` + Grey stroke `#4A4A4A`
- Cloth: `#ecd998`
- Coin: `#707c79`

### Knights (Martial Progression)
- Basic: `#CD7F32` (Bronze)
- Strong: `#C0C0C0` (Silver)
- Mighty: `#FFD700` (Gold)

### City Improvements
- Science: #729853  #6bb97f ## OTHER `#16a34a` (Green-600)
- Trade: #8dae54  #c6daa4 ## OTHER `#f59e0b` (Amber-500)
- Politics: #85949a  #d7dfd1 ## OTHER `#3b82f6` (Blue-500)

### Structures
- Settlement: `#8B4513` (Brown)
- City: `#708090` (Gray)
- Metropolis: `#FFD700` (Gold)
- Road: `#654321` (Dark brown)

### Special
- Robber: `#1a1a1a` (Near black)
- Barbarian: `#8B0000` (Dark red)
- Merchant: `#DAA520` (Gold)

## Example Mappings

Here are some example mappings to guide you:

| SVG Filename | Maps To | Color | Category | Notes |
|--------------|---------|-------|----------|-------|
| wood-pile.svg | resource-wood | #8B4513 | Resources | Primary wood resource icon |
| coin.svg | commodity-coin | #FFD700 | Commodities | Gold coin commodity |
| knight-basic.svg | knight-basic | #CD7F32 | Knights | Level 1 knight |
| science.svg | improvement-science | #16a34a | Improvements | Science track icon |

## Categories

- **Resources**: Wood, Brick, Sheep, Wheat, Ore
- **Commodities**: Paper, Cloth, Coin
- **Knights**: Basic, Strong, Mighty knight levels
- **Improvements**: Science, Trade, Politics tracks
- **Structures**: Settlement, City, Metropolis, Road, City Wall
- **Special**: Robber, Merchant, Barbarian Ship, Dice, Progress cards
