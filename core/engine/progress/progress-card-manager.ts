import { GameState, PlayerState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { getCardMetadata, isCardImplemented } from './progress-card-definitions';
import { addResources, removeResources } from '@/core/engine/resources/resource-manager';
import { ResourceType } from '@/core/rules/board-constants';
import { displaceKnight } from '@/core/engine/knights/knight-manager';
import { getAdjacentEdgesForVertex, getEdgeEndpoints } from '@/lib/hex';

/**
 * Progress Card Manager (Cities & Knights Expansion)
 * Handles drawing and playing progress cards
 */

/**
 * Draw a progress card from a deck
 *
 * @param gameState - Current game state
 * @param playerId - Player drawing the card
 * @param category - Card category to draw from
 * @returns Drawn card type, or null if deck empty
 */
export function drawProgressCard(
    gameState: GameState,
    playerId: string,
    category: ProgressCardCategory
): ProgressCardType | null {
    if (!gameState.progressDecks) return null;

    const deck = gameState.progressDecks[category];
    if (deck.length === 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${category} progress card deck is empty!`
        });
        return null;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    // Draw card from top of deck
    const card = deck.shift()!;
    const cardMeta = getCardMetadata(card);

    // Check if this is a VP card (Printer or Constitution)
    const isVPCard = card === 'printer' || card === 'constitution';

    if (isVPCard) {
        // VP cards are auto-played immediately and revealed
        if (!player.revealedVPCards) {
            player.revealedVPCards = [];
        }
        player.revealedVPCards.push(card);

        // Log VP card reveal with special message
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} revealed ${cardMeta.name} for +1 VP!`,
            playerId
        });
    } else {
        // Regular progress cards go into hand
        if (!player.progressCards) {
            player.progressCards = [];
        }
        player.progressCards.push(card);

        // Log regular card draw
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} drew a ${category} progress card: ${cardMeta.name}`,
            playerId
        });
    }

    return card;
}

/**
 * Play a progress card
 *
 * @param gameState - Current game state
 * @param playerId - Player playing the card
 * @param cardType - Card to play
 * @param options - Card-specific options
 */
export function playProgressCard(
    gameState: GameState,
    playerId: string,
    cardType: ProgressCardType,
    options?: any
): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check player has the card
    if (!player.progressCards || !player.progressCards.includes(cardType)) {
        throw new Error('Player does not have this card');
    }

    // Remove card from hand
    const index = player.progressCards.indexOf(cardType);
    player.progressCards.splice(index, 1);

    const cardMeta = getCardMetadata(cardType);

    // Log card play
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} played ${cardMeta.name}`,
        playerId
    });

    // Execute card effect
    if (isCardImplemented(cardType)) {
        executeProgressCardEffect(gameState, playerId, cardType, options);
    } else {
        // Stub: card not yet implemented
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${cardMeta.name} effect not yet implemented`,
            playerId
        });
    }
}

/**
 * Execute a progress card's effect
 *
 * @param gameState - Current game state
 * @param playerId - Player playing the card
 * @param cardType - Card being played
 * @param options - Card-specific options
 */
function executeProgressCardEffect(
    gameState: GameState,
    playerId: string,
    cardType: ProgressCardType,
    options?: any
): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    switch (cardType) {
        // SCIENCE CARDS
        case 'alchemist':
            executeAlchemist(gameState, player, options);
            break;

        case 'crane':
            executeCrane(gameState, player, options);
            break;

        case 'engineer':
            executeEngineer(gameState, player, options);
            break;

        case 'road_building_progress':
            executeRoadBuilding(gameState, player);
            break;

        case 'smith':
            executeSmith(gameState, player, options);
            break;

        case 'inventor':
            executeInventor(gameState, player, options);
            break;

        case 'irrigation':
            executeIrrigation(gameState, player, options);
            break;

        case 'mining':
            executeMining(gameState, player, options);
            break;

        case 'medicine':
            executeMedicine(gameState, player);
            break;

        case 'printer':
            // Victory point card - no effect on play
            break;

        // TRADE CARDS
        case 'merchant':
            executeMerchant(gameState, player, options);
            break;

        case 'merchant_fleet':
            executeMerchantFleet(gameState, player);
            break;

        case 'resource_monopoly':
            executeResourceMonopoly(gameState, player, options);
            break;

        case 'trade_monopoly':
            executeTradeMonopoly(gameState, player, options);
            break;

        case 'commercial_harbor':
            executeCommercialHarbor(gameState, player, options);
            break;

        case 'guild_dues':
            executeGuildDues(gameState, player, options);
            break;

        // POLITICS CARDS
        case 'diplomat':
            executeDiplomat(gameState, player, options);
            break;

        case 'espionage':
            executeEspionage(gameState, player, options);
            break;

        case 'treason':
            executeTreason(gameState, player, options);
            break;

        case 'intrigue':
            executeIntrigue(gameState, player, options);
            break;

        case 'saboteur':
            executeSaboteur(gameState, player, options);
            break;

        case 'encouragement':
            executeEncouragement(gameState, player);
            break;

        case 'taxation':
            executeTaxation(gameState, player, options);
            break;

        case 'constitution':
            // Victory point card - no effect on play
            break;

        case 'wedding':
            executeWedding(gameState, player);
            break;

        default:
            // Should not reach here if properly stubbed
            break;
    }
}

// ===== SCIENCE CARD EFFECTS =====

function executeAlchemist(gameState: GameState, player: PlayerState, options?: any): void {
    // Choose the dice results before rolling
    // This card is played BEFORE the dice roll, not after
    // The implementation sets a flag that the dice roll handler will check
    // The actual dice manipulation happens in the rollDice action

    const { chosenDice1, chosenDice2 } = options || {};
    if (chosenDice1 === undefined || chosenDice2 === undefined) {
        throw new Error('Alchemist requires chosenDice1 and chosenDice2 (1-6 each)');
    }

    if (chosenDice1 < 1 || chosenDice1 > 6 || chosenDice2 < 1 || chosenDice2 > 6) {
        throw new Error('Dice values must be between 1 and 6');
    }

    // Set game state flag for the next dice roll
    if (!gameState.activeEffects) {
        gameState.activeEffects = [];
    }

    gameState.activeEffects.push({
        type: 'alchemist',
        playerId: player.id,
        chosenDice1,
        chosenDice2,
    });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} played Alchemist and chose the dice results`,
        playerId: player.id
    });
}

function executeCrane(gameState: GameState, player: PlayerState, options?: any): void {
    // Reduce cost of next city improvement by 1 commodity
    // This flag can be checked by the improvement service
    if (!gameState.activeEffects) {
        gameState.activeEffects = [];
    }

    gameState.activeEffects.push({
        type: 'crane',
        playerId: player.id,
    });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can upgrade 1 city improvement with 1 less commodity`,
        playerId: player.id
    });
}

function executeEngineer(gameState: GameState, player: PlayerState, options?: any): void {
    // Build a city wall for free
    if (!gameState.activeEffects) {
        gameState.activeEffects = [];
    }

    gameState.activeEffects.push({
        type: 'engineer',
        playerId: player.id,
    });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can build a city wall for free`,
        playerId: player.id
    });
}

function executeRoadBuilding(gameState: GameState, player: PlayerState): void {
    // Player can build 2 roads for free
    // This should set a game state flag that the service layer checks
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can build 2 roads for free`,
        playerId: player.id
    });
}

function executeMedicine(gameState: GameState, player: PlayerState): void {
    // Reduce city upgrade cost to 2 ore + 1 grain (instead of 3 ore + 2 grain)
    if (!gameState.activeEffects) {
        gameState.activeEffects = [];
    }

    gameState.activeEffects.push({
        type: 'medicine',
        playerId: player.id,
    });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can upgrade a settlement to city with Medicine discount (2 ore + 1 grain)`,
        playerId: player.id
    });
}

function executeSmith(gameState: GameState, player: PlayerState, options?: any): void {
    // Upgrade 2 knights for free
    if (!gameState.activeEffects) {
        gameState.activeEffects = [];
    }

    gameState.activeEffects.push({
        type: 'smith',
        playerId: player.id,
        knightsRemaining: 2, // Can upgrade 2 knights
    });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can upgrade 2 knights for free`,
        playerId: player.id
    });
}

function executeInventor(gameState: GameState, player: PlayerState, options?: any): void {
    // Swap any two number tokens except 2, 6, 8, or 12
    const { hex1Id, hex2Id } = options || {};
    if (!hex1Id || !hex2Id) {
        throw new Error('Inventor requires hex1Id and hex2Id');
    }

    const hex1 = gameState.board.hexes.find(h => h.id === hex1Id);
    const hex2 = gameState.board.hexes.find(h => h.id === hex2Id);

    if (!hex1 || !hex2) {
        throw new Error('Invalid hex IDs');
    }

    if (!hex1.number || !hex2.number) {
        throw new Error('Cannot swap desert or ocean hexes');
    }

    // Check numbers are not restricted (2, 6, 8, 12)
    const restrictedNumbers = [2, 6, 8, 12];
    if (restrictedNumbers.includes(hex1.number) || restrictedNumbers.includes(hex2.number)) {
        throw new Error('Cannot swap number tokens 2, 6, 8, or 12');
    }

    // Swap the number tokens
    const tempNumber = hex1.number;
    hex1.number = hex2.number;
    hex2.number = tempNumber;

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} swapped number tokens between two hexes (${hex2.number} ↔ ${hex1.number})`,
        playerId: player.id
    });
}

function executeIrrigation(gameState: GameState, player: PlayerState, options?: any): void {
    // Take 2 wheat for each fields hex adjacent to one of your buildings
    let wheatGained = 0;

    // Find all field hexes
    const fieldHexes = gameState.board.hexes.filter(h => h.terrain === 'field');

    for (const hex of fieldHexes) {
        // Check if player has a building (settlement, city, or metropolis) on this hex
        const adjacentVertices = hex.vertices || [];
        const hasAdjacentBuilding = adjacentVertices.some((vertexId: string) => {
            const vertex = gameState.board.vertices[vertexId];
            return vertex && vertex.owner === player.id &&
                (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis');
        });

        if (hasAdjacentBuilding) {
            wheatGained += 2;
        }
    }

    if (wheatGained > 0) {
        addResources(player, { wheat: wheatGained });
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} received ${wheatGained} grain from Irrigation`,
        playerId: player.id
    });
}

function executeMining(gameState: GameState, player: PlayerState, options?: any): void {
    // Take 2 ore for each mountains hex adjacent to one of your buildings
    let oreGained = 0;

    // Find all mountain hexes
    const mountainHexes = gameState.board.hexes.filter(h => h.terrain === 'mountain');

    for (const hex of mountainHexes) {
        // Check if player has a building (settlement, city, or metropolis) on this hex
        const adjacentVertices = hex.vertices || [];
        const hasAdjacentBuilding = adjacentVertices.some((vertexId: string) => {
            const vertex = gameState.board.vertices[vertexId];
            return vertex && vertex.owner === player.id &&
                (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis');
        });

        if (hasAdjacentBuilding) {
            oreGained += 2;
        }
    }

    if (oreGained > 0) {
        addResources(player, { ore: oreGained });
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} received ${oreGained} ore from Mining`,
        playerId: player.id
    });
}

// ===== TRADE CARD EFFECTS =====

function executeMerchant(gameState: GameState, player: PlayerState, options?: any): void {
    // Place merchant on a hex adjacent to player's settlement/city
    const { hexId } = options || {};
    if (!hexId) {
        throw new Error('Merchant requires hexId selection');
    }

    const hex = gameState.board.hexes.find(h => h.id === hexId);
    if (!hex) {
        throw new Error('Invalid hex ID');
    }

    // Validate hex is adjacent to player's settlement/city
    const adjacentVertices = hex.vertices || [];
    const hasAdjacentSettlement = adjacentVertices.some((vertexId: string) => {
        const vertex = gameState.board.vertices[vertexId];
        return vertex && vertex.owner === player.id && (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis');
    });

    if (!hasAdjacentSettlement) {
        throw new Error('Merchant must be placed on a hex adjacent to your settlement or city');
    }

    // Place the merchant
    gameState.merchantHexId = hexId;
    gameState.activeMerchant = player.id; // Track who has active Merchant (grants 1 VP)

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} placed the merchant on a ${hex.terrain} hex (2:1 trade + 1 VP)`,
        playerId: player.id
    });
}

function executeMerchantFleet(gameState: GameState, player: PlayerState): void {
    // Trade any resources at 2:1 ratio this turn
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can trade any resources at 2:1 ratio this turn`,
        playerId: player.id
    });
}

function executeResourceMonopoly(gameState: GameState, player: PlayerState, options?: any): void {
    // Take up to 2 of chosen resource from each player
    const { resource } = options || {};
    if (!resource) {
        throw new Error('Resource Monopoly requires resource selection');
    }

    let totalTaken = 0;
    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;

        const amount = otherPlayer.resources[resource as ResourceType] || 0;
        if (amount > 0) {
            // Take up to 2 cards per player (2 if ≥2, 1 if =1, 0 if =0)
            const amountToTake = Math.min(amount, 2);
            removeResources(otherPlayer, { [resource]: amountToTake });
            totalTaken += amountToTake;
        }
    }

    if (totalTaken > 0) {
        addResources(player, { [resource]: totalTaken });
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} took ${totalTaken} ${resource} from other players (up to 2 per player)`,
        playerId: player.id
    });
}

function executeTradeMonopoly(gameState: GameState, player: PlayerState, options?: any): void {
    // Take 1 of chosen commodity from each player who has any
    const { commodity } = options || {};
    if (!commodity) {
        throw new Error('Commercial Monopoly requires commodity selection');
    }

    let totalTaken = 0;
    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;

        if (!otherPlayer.commodities) continue;

        const amount = otherPlayer.commodities[commodity as 'paper' | 'cloth' | 'coin'] || 0;
        if (amount > 0) {
            // Only take 1 commodity per player, not all
            otherPlayer.commodities[commodity as 'paper' | 'cloth' | 'coin'] -= 1;
            totalTaken += 1;
        }
    }

    if (totalTaken > 0) {
        if (!player.commodities) {
            player.commodities = { paper: 0, cloth: 0, coin: 0 };
        }
        player.commodities[commodity as 'paper' | 'cloth' | 'coin'] += totalTaken;
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} took ${totalTaken} ${commodity} from other players (1 per player)`,
        playerId: player.id
    });
}

function executeCommercialHarbor(gameState: GameState, player: PlayerState, options?: any): void {
    // Offer 1 resource to each player; each must give you 1 commodity if they have one. Otherwise, you take your resource back.
    const { offeredResource } = options || {};
    if (!offeredResource) {
        throw new Error('Commercial Harbor requires offeredResource');
    }

    // Check player has the resource to offer
    if (!player.resources[offeredResource as ResourceType] ||
        player.resources[offeredResource as ResourceType] < gameState.players.length - 1) {
        throw new Error(`You need ${gameState.players.length - 1} ${offeredResource} to offer to all other players`);
    }

    let totalCommoditiesReceived = 0;
    let resourcesReturned = 0;

    for (const opponent of gameState.players) {
        if (opponent.id === player.id) continue;

        // Check if opponent has any commodity
        const hasCommodity = opponent.commodities &&
            (opponent.commodities.paper > 0 || opponent.commodities.cloth > 0 || opponent.commodities.coin > 0);

        if (hasCommodity) {
            // Opponent must give 1 commodity (they choose which one)
            // For simplicity, take first available commodity
            const commodityTypes: ('paper' | 'cloth' | 'coin')[] = ['paper', 'cloth', 'coin'];
            for (const commodityType of commodityTypes) {
                if (opponent.commodities && opponent.commodities[commodityType] > 0) {
                    // Execute trade: player gives resource, receives commodity
                    removeResources(player, { [offeredResource]: 1 });
                    opponent.commodities[commodityType] -= 1;
                    addResources(opponent, { [offeredResource]: 1 });
                    if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
                    player.commodities[commodityType] += 1;
                    totalCommoditiesReceived++;
                    break;
                }
            }
        } else {
            // Opponent has no commodities, resource is returned (do nothing)
            resourcesReturned++;
        }
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} offered ${offeredResource} to all players with Commercial Harbor: received ${totalCommoditiesReceived} commodities (${resourcesReturned} returned)`,
        playerId: player.id
    });
}

function executeGuildDues(gameState: GameState, player: PlayerState, options?: any): void {
    // Take 2 cards from opponent with more VP
    const { opponentId, card1Type, card1Value, card2Type, card2Value } = options || {};
    if (!opponentId || !card1Type || !card2Type) {
        throw new Error('Guild Dues requires opponentId, card1Type, card2Type, and their values');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    // Check opponent has more VP (validation should be in service layer)
    // For now we'll trust the input

    // Take cards from opponent
    if (card1Type === 'resource') {
        if (opponent.resources[card1Value as ResourceType] < 1) {
            throw new Error('Opponent does not have that resource');
        }
        removeResources(opponent, { [card1Value]: 1 });
        addResources(player, { [card1Value]: 1 });
    } else if (card1Type === 'commodity') {
        if (!opponent.commodities || opponent.commodities[card1Value as 'paper' | 'cloth' | 'coin'] < 1) {
            throw new Error('Opponent does not have that commodity');
        }
        opponent.commodities[card1Value as 'paper' | 'cloth' | 'coin'] -= 1;
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        player.commodities[card1Value as 'paper' | 'cloth' | 'coin'] += 1;
    }

    if (card2Type === 'resource') {
        if (opponent.resources[card2Value as ResourceType] < 1) {
            throw new Error('Opponent does not have that resource');
        }
        removeResources(opponent, { [card2Value]: 1 });
        addResources(player, { [card2Value]: 1 });
    } else if (card2Type === 'commodity') {
        if (!opponent.commodities || opponent.commodities[card2Value as 'paper' | 'cloth' | 'coin'] < 1) {
            throw new Error('Opponent does not have that commodity');
        }
        opponent.commodities[card2Value as 'paper' | 'cloth' | 'coin'] -= 1;
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        player.commodities[card2Value as 'paper' | 'cloth' | 'coin'] += 1;
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} took 2 cards from ${opponent.name}'s hand`,
        playerId: player.id
    });
}

function executeDiplomat(gameState: GameState, player: PlayerState, options?: any): void {
    // Remove an open road and optionally place it as your own
    const { edgeId, newEdgeId } = options || {};
    if (!edgeId) {
        throw new Error('Diplomat requires edgeId (road to remove)');
    }

    const edge = gameState.board.edges[edgeId];
    if (!edge || !edge.owner || edge.structure !== 'road') {
        throw new Error('Invalid edge or no road present');
    }

    const roadOwner = edge.owner;

    // Validate the road is "open" (at least one endpoint has no same-color piece)
    const [q, r, d] = edgeId.split(',').map(Number);
    const endpoints = getEdgeEndpoints(q, r, d);
    if (!endpoints || endpoints.length !== 2) {
        throw new Error('Invalid edge endpoints');
    }

    const [vertex1Id, vertex2Id] = endpoints;

    const isEndOpen = (vertexId: string): boolean => {
        const vertex = gameState.board.vertices[vertexId];
        if (!vertex) return false;

        // Same-color building/metropolis blocks the end
        if (vertex.owner === roadOwner && vertex.structure) {
            return false;
        }

        // Same-color knight blocks the end
        const knight = gameState.players
            .flatMap(p => p.knights || [])
            .find(k => k.vertexId === vertexId);
        if (knight && knight.playerId === roadOwner) {
            return false;
        }

        // Same-color roads on other adjacent edges block the end
        const [q, r, d] = vertexId.split(',').map(Number);
        const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);
        const otherRoads = adjacentEdges.filter(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const e = gameState.board.edges[adjEdgeId];
            return e && e.owner === roadOwner && e.structure === 'road';
        });

        return otherRoads.length === 0;
    };

    const end1Open = isEndOpen(vertex1Id);
    const end2Open = isEndOpen(vertex2Id);

    if (!end1Open && !end2Open) {
        throw new Error('Road is not \"open\" - must be at the end of a road chain with no same-color pieces at that end');
    }

    // Remove the road
    edge.owner = null;
    edge.structure = null;

    // Optionally place it as player's own road (if newEdgeId provided)
    if (newEdgeId) {
        const newEdge = gameState.board.edges[newEdgeId];
        if (!newEdge || newEdge.owner !== null) {
            throw new Error('Invalid new edge location');
        }

        newEdge.owner = player.id;
        newEdge.structure = 'road';

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} removed a road from another player and placed it elsewhere`,
            playerId: player.id
        });
    } else {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} removed a road (did not replace)`,
            playerId: player.id
        });
    }
}

function executeEspionage(gameState: GameState, player: PlayerState, options?: any): void {
    // Look at opponent's progress cards and steal 1
    const { opponentId, stolenCard } = options || {};
    if (!opponentId || !stolenCard) {
        throw new Error('Espionage requires opponentId and stolenCard');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    // Remove card from opponent
    if (!opponent.progressCards) return;
    const index = opponent.progressCards.indexOf(stolenCard as ProgressCardType);
    if (index === -1) throw new Error('Opponent does not have this card');

    opponent.progressCards.splice(index, 1);

    // Add to player's hand
    if (!player.progressCards) player.progressCards = [];
    player.progressCards.push(stolenCard as ProgressCardType);

    const cardMeta = getCardMetadata(stolenCard as ProgressCardType);
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} stole ${cardMeta.name} from ${opponent.name}`,
        playerId: player.id
    });
}

function executeTreason(gameState: GameState, player: PlayerState, options?: any): void {
    // Choose a player; they remove a knight. You place a knight of equal or lower strength with same status
    const { opponentId, knightId, newKnightLevel, newKnightVertexId } = options || {};
    if (!opponentId || !knightId) {
        throw new Error('Treason requires opponentId and knightId');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    if (!opponent.knights) throw new Error('Opponent has no knights');

    const knightIndex = opponent.knights.findIndex(k => k.id === knightId);
    if (knightIndex === -1) throw new Error('Knight not found');

    const knight = opponent.knights[knightIndex];

    // Remove knight from opponent
    opponent.knights.splice(knightIndex, 1);

    // Add knight to player's army (equal or lower strength, same active status)
    if (!player.knights) player.knights = [];

    // Determine knight level (use provided level or default to same level)
    const levelMap = { basic: 0, strong: 1, mighty: 2 };
    const levelNames: ('basic' | 'strong' | 'mighty')[] = ['basic', 'strong', 'mighty'];
    const targetLevel = newKnightLevel || knight.level;

    // Validate level is equal or lower
    if (levelMap[targetLevel as 'basic' | 'strong' | 'mighty'] > levelMap[knight.level]) {
        throw new Error('New knight must be equal or lower strength');
    }

    // Create new knight for player with same active status
    const newKnight = {
        id: `${Date.now()}-${Math.random()}`,
        playerId: player.id,
        level: targetLevel as 'basic' | 'strong' | 'mighty',
        active: knight.active, // Preserve active/inactive status
        vertexId: newKnightVertexId || knight.vertexId,
    };

    player.knights.push(newKnight);

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} used Treason: removed ${opponent.name}'s ${knight.level} knight and placed a ${targetLevel} knight (${knight.active ? 'active' : 'inactive'})`,
        playerId: player.id
    });
}

function executeIntrigue(gameState: GameState, player: PlayerState, options?: any): void {
    // Intrigue: Displace any opponent's knight adjacent to one of your roads
    // Unlike normal knight displacement, Intrigue can displace ANY knight (basic, strong, OR mighty)
    const { opponentId, knightId } = options || {};
    if (!opponentId || !knightId) {
        throw new Error('Intrigue requires opponentId and knightId');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    if (!opponent.knights) throw new Error('Opponent has no knights');

    const knight = opponent.knights.find(k => k.id === knightId);
    if (!knight) throw new Error('Knight not found');

    // Validate the knight is on an intersection connected to one of player's roads
    const knightVertexId = knight.vertexId;
    const [q, r, d] = knightVertexId.split(',').map(Number);

    // Get all edges adjacent to the knight's vertex
    const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);

    // Check if any of these edges are owned by the player
    let hasAdjacentRoute = false;
    for (const edgeId of adjacentEdges) {
        const edge = gameState.board.edges[edgeId];
        if (edge && edge.owner === player.id && edge.structure === 'road') {
            hasAdjacentRoute = true;
            break;
        }
    }

    if (!hasAdjacentRoute) {
        throw new Error('Knight must be on an intersection connected to one of your routes');
    }

    // Use the proper displacement logic
    // This will set the game into 'knight_displacement' phase
    // The displaced knight owner must relocate it via their road network
    displaceKnight(gameState, knight, 'main_phase');

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} displaced ${opponent.name}'s ${knight.level} knight with Intrigue`,
        playerId: player.id
    });
}

function executeTaxation(gameState: GameState, player: PlayerState, options?: any): void {
    // Move robber and steal 1 random resource from each opponent on the hex
    const { hexId } = options || {};
    if (!hexId) {
        throw new Error('Taxation requires hexId (where to move robber)');
    }

    // C&K Rule: Robber cannot move before first barbarian attack
    if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
        throw new Error('Cannot move the robber before the first barbarian attack');
    }

    const hex = gameState.board.hexes.find(h => h.id === hexId);
    if (!hex) throw new Error('Invalid hex');

    // Move robber
    gameState.robberHexId = hexId;

    // Find all opponents with settlements/cities on this hex
    const adjacentVertices = hex.vertices || [];
    const opponentsOnHex = new Set<string>();

    for (const vertexId of adjacentVertices) {
        const vertex = gameState.board.vertices[vertexId];
        if (vertex && vertex.owner && vertex.owner !== player.id && vertex.structure) {
            opponentsOnHex.add(vertex.owner);
        }
    }

    // Each opponent gives 1 random resource
    let totalStolen = 0;
    for (const opponentId of opponentsOnHex) {
        const opponent = gameState.players.find(p => p.id === opponentId);
        if (!opponent) continue;

        // Get all available resources
        const resourceTypes: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
        const availableResources: ResourceType[] = [];
        for (const resourceType of resourceTypes) {
            if (opponent.resources[resourceType] > 0) {
                availableResources.push(resourceType);
            }
        }

        if (availableResources.length > 0) {
            // Pick a random resource
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const resourceType = availableResources[randomIndex];
            removeResources(opponent, { [resourceType]: 1 });
            addResources(player, { [resourceType]: 1 });
            totalStolen++;
        }
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} moved the robber and stole ${totalStolen} resources`,
        playerId: player.id
    });
}

function executeSaboteur(gameState: GameState, player: PlayerState, options?: any): void {
    // Players with equal or more VPs discard half their cards (resources AND commodities)
    let totalDiscarded = 0;

    for (const opponent of gameState.players) {
        if (opponent.id === player.id) continue;

        // Check if opponent has equal or more VP (should calculate VP here)
        // For now, we'll trust validation is done in service layer

        // Count total cards (resources + commodities)
        const totalResources = Object.values(opponent.resources).reduce((sum, count) => sum + count, 0);
        const totalCommodities = opponent.commodities ?
            Object.values(opponent.commodities).reduce((sum, count) => sum + count, 0) : 0;
        const totalCards = totalResources + totalCommodities;

        if (totalCards === 0) continue;

        // Calculate how many to discard (half, rounded down)
        const discardCount = Math.floor(totalCards / 2);

        // For simplicity, discard proportionally
        // In real game, opponent chooses which cards to discard
        const resourcesToDiscard: Partial<Record<ResourceType, number>> = {};
        let remaining = discardCount;

        const resourceTypes: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
        for (const resourceType of resourceTypes) {
            const count = opponent.resources[resourceType];
            const proportion = count / totalCards;
            const toDiscard = Math.min(Math.floor(proportion * discardCount), remaining, count);

            if (toDiscard > 0) {
                resourcesToDiscard[resourceType] = toDiscard;
                remaining -= toDiscard;
            }
        }

        // Discard commodities if needed
        if (remaining > 0 && opponent.commodities) {
            const commodityTypes: ('paper' | 'cloth' | 'coin')[] = ['paper', 'cloth', 'coin'];
            for (const commodityType of commodityTypes) {
                const count = opponent.commodities[commodityType];
                const toDiscard = Math.min(remaining, count);

                if (toDiscard > 0) {
                    opponent.commodities[commodityType] -= toDiscard;
                    remaining -= toDiscard;
                }
            }
        }

        // Remove resources
        if (Object.keys(resourcesToDiscard).length > 0) {
            removeResources(opponent, resourcesToDiscard);
        }

        totalDiscarded += discardCount;
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} forced opponents to discard ${totalDiscarded} total cards`,
        playerId: player.id
    });
}

function executeWedding(gameState: GameState, player: PlayerState): void {
    // Each opponent with more VP gives 2 cards of their choice (or as many as they have)
    let totalReceived = 0;

    for (const opponent of gameState.players) {
        if (opponent.id === player.id) continue;

        // Check if opponent has more VP (should calculate VP here)
        // For now, we'll trust validation is done in service layer

        // Opponent gives up to 2 cards (they choose)
        // For simplicity, take first 2 available resources/commodities
        const resourceTypes: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
        let cardsGiven = 0;

        // Try to give 2 cards total
        for (const resourceType of resourceTypes) {
            while (cardsGiven < 2 && opponent.resources[resourceType] > 0) {
                removeResources(opponent, { [resourceType]: 1 });
                addResources(player, { [resourceType]: 1 });
                totalReceived++;
                cardsGiven++;
            }
            if (cardsGiven >= 2) break;
        }

        // If still need cards and opponent has commodities
        if (cardsGiven < 2 && opponent.commodities) {
            const commodityTypes: ('paper' | 'cloth' | 'coin')[] = ['paper', 'cloth', 'coin'];
            for (const commodityType of commodityTypes) {
                while (cardsGiven < 2 && opponent.commodities[commodityType] > 0) {
                    opponent.commodities[commodityType] -= 1;
                    if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
                    player.commodities[commodityType] += 1;
                    totalReceived++;
                    cardsGiven++;
                }
                if (cardsGiven >= 2) break;
            }
        }
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} received ${totalReceived} cards from Wedding (2 per opponent with more VP)`,
        playerId: player.id
    });
}

function executeEncouragement(gameState: GameState, player: PlayerState): void {
    // Activate all of your knights for free
    if (!player.knights || player.knights.length === 0) {
        throw new Error('You have no knights to activate');
    }

    let activatedCount = 0;
    for (const knight of player.knights) {
        if (!knight.active) {
            knight.active = true;
            activatedCount++;
        }
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} activated ${activatedCount} knights with Encouragement`,
        playerId: player.id
    });
}
