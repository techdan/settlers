import { GameState, PlayerState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { getCardMetadata, isCardImplemented } from './progress-card-definitions';
import { addResources, removeResources } from '@/core/engine/resources/resource-manager';
import { ResourceType } from '@/core/rules/board-constants';

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

    // Initialize progress cards if needed
    if (!player.progressCards) {
        player.progressCards = [];
    }

    // Draw card from top of deck
    const card = deck.shift()!;
    player.progressCards.push(card);

    const cardMeta = getCardMetadata(card);
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} drew a ${category} progress card: ${cardMeta.name}`,
        playerId
    });

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
        case 'printer':
            // Victory point cards - no effect on play
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
        case 'master_merchant':
            // Victory point cards - no effect on play
            break;

        // POLITICS CARDS
        case 'diplomat':
            executeDiplomat(gameState, player, options);
            break;

        case 'spy':
            executeSpy(gameState, player, options);
            break;

        case 'deserter':
            executeDeserter(gameState, player, options);
            break;

        case 'intrigue':
            executeIntrigue(gameState, player, options);
            break;

        case 'saboteur':
            executeSaboteur(gameState, player, options);
            break;

        case 'warlord':
            executeWarlord(gameState, player);
            break;

        case 'bishop':
        case 'constitution':
        case 'wedding':
            // Victory point cards - no effect on play
            break;

        default:
            // Should not reach here if properly stubbed
            break;
    }
}

// ===== SCIENCE CARD EFFECTS =====

function executeAlchemist(gameState: GameState, player: PlayerState, options?: any): void {
    // Convert 2 of same resource into 1 of chosen resource
    const { fromResource, toResource } = options || {};
    if (!fromResource || !toResource) {
        throw new Error('Alchemist requires fromResource and toResource');
    }

    if (player.resources[fromResource as ResourceType] < 2) {
        throw new Error('Not enough resources');
    }

    removeResources(player, { [fromResource]: 2 });
    addResources(player, { [toResource]: 1 });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} converted 2 ${fromResource} into 1 ${toResource}`,
        playerId: player.id
    });
}

function executeCrane(gameState: GameState, player: PlayerState, options?: any): void {
    // Crane is a victory point card - no effect on play
    // (Already counted in victory points)
}

function executeEngineer(gameState: GameState, player: PlayerState, options?: any): void {
    // Build 1 city improvement at discount
    // This flag can be checked by the improvement service
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can upgrade 1 improvement at discount`,
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

function executeSmith(gameState: GameState, player: PlayerState, options?: any): void {
    // Upgrade 1 knight for free
    const { knightId } = options || {};
    if (!knightId) {
        throw new Error('Smith requires knightId');
    }

    // Knight upgrade will be handled by service layer
    // This just logs that the effect was triggered
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can upgrade 1 knight for free`,
        playerId: player.id
    });
}

function executeInventor(gameState: GameState, player: PlayerState, options?: any): void {
    // Swap number tokens of any 2 terrain hexes
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

    // Swap the number tokens
    const tempNumber = hex1.number;
    hex1.number = hex2.number;
    hex2.number = tempNumber;

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} swapped number tokens between two hexes`,
        playerId: player.id
    });
}

function executeIrrigation(gameState: GameState, player: PlayerState, options?: any): void {
    // Get resources from 1 field hex regardless of roll
    const { hexId } = options || {};
    if (!hexId) {
        throw new Error('Irrigation requires hexId');
    }

    const hex = gameState.board.hexes.find(h => h.id === hexId);
    if (!hex || hex.terrain !== 'field') {
        throw new Error('Must choose a field hex');
    }

    // Give wheat from the chosen hex
    addResources(player, { wheat: 1 });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} received wheat from irrigation`,
        playerId: player.id
    });
}

function executeMining(gameState: GameState, player: PlayerState, options?: any): void {
    // Get resources from 1 mountain hex regardless of roll
    const { hexId } = options || {};
    if (!hexId) {
        throw new Error('Mining requires hexId');
    }

    const hex = gameState.board.hexes.find(h => h.id === hexId);
    if (!hex || hex.terrain !== 'mountain') {
        throw new Error('Must choose a mountain hex');
    }

    // Give ore from the chosen hex
    addResources(player, { ore: 1 });

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} received ore from mining`,
        playerId: player.id
    });
}

// ===== TRADE CARD EFFECTS =====

function executeMerchant(gameState: GameState, player: PlayerState, options?: any): void {
    // Choose 1 resource for 2:1 trading this turn
    const { resource } = options || {};
    if (!resource) {
        throw new Error('Merchant requires resource selection');
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can trade ${resource} at 2:1 ratio this turn`,
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
    // Take all of chosen resource from all other players
    const { resource } = options || {};
    if (!resource) {
        throw new Error('Resource Monopoly requires resource selection');
    }

    let totalTaken = 0;
    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;

        const amount = otherPlayer.resources[resource as ResourceType] || 0;
        if (amount > 0) {
            removeResources(otherPlayer, { [resource]: amount });
            totalTaken += amount;
        }
    }

    if (totalTaken > 0) {
        addResources(player, { [resource]: totalTaken });
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} took ${totalTaken} ${resource} from other players`,
        playerId: player.id
    });
}

function executeTradeMonopoly(gameState: GameState, player: PlayerState, options?: any): void {
    // Take all of chosen commodity from all other players
    const { commodity } = options || {};
    if (!commodity) {
        throw new Error('Trade Monopoly requires commodity selection');
    }

    let totalTaken = 0;
    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue;

        if (!otherPlayer.commodities) continue;

        const amount = otherPlayer.commodities[commodity as 'paper' | 'cloth' | 'coin'] || 0;
        if (amount > 0) {
            otherPlayer.commodities[commodity as 'paper' | 'cloth' | 'coin'] -= amount;
            totalTaken += amount;
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
        message: `${player.name} took ${totalTaken} ${commodity} from other players`,
        playerId: player.id
    });
}

// ===== POLITICS CARD EFFECTS =====

function executeDiplomat(gameState: GameState, player: PlayerState, options?: any): void {
    // Move 1 own knight to any own settlement/city
    const { knightId, targetVertexId } = options || {};
    if (!knightId || !targetVertexId) {
        throw new Error('Diplomat requires knightId and targetVertexId');
    }

    // Knight movement will be handled by service layer
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can move a knight via Diplomat`,
        playerId: player.id
    });
}

function executeSpy(gameState: GameState, player: PlayerState, options?: any): void {
    // Look at opponent's progress cards and steal 1
    const { opponentId, stolenCard } = options || {};
    if (!opponentId || !stolenCard) {
        throw new Error('Spy requires opponentId and stolenCard');
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

function executeDeserter(gameState: GameState, player: PlayerState, options?: any): void {
    // Deactivate 1 of opponent's knights
    const { opponentId, knightId } = options || {};
    if (!opponentId || !knightId) {
        throw new Error('Deserter requires opponentId and knightId');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    if (!opponent.knights) throw new Error('Opponent has no knights');

    const knight = opponent.knights.find(k => k.id === knightId);
    if (!knight) throw new Error('Knight not found');

    if (!knight.active) {
        throw new Error('Knight is already inactive');
    }

    // Deactivate the knight
    knight.active = false;

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} deactivated ${opponent.name}'s knight`,
        playerId: player.id
    });
}

function executeIntrigue(gameState: GameState, player: PlayerState, options?: any): void {
    // Move 1 of opponent's knights to any location
    const { opponentId, knightId, targetVertexId } = options || {};
    if (!opponentId || !knightId || !targetVertexId) {
        throw new Error('Intrigue requires opponentId, knightId, and targetVertexId');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    if (!opponent.knights) throw new Error('Opponent has no knights');

    const knight = opponent.knights.find(k => k.id === knightId);
    if (!knight) throw new Error('Knight not found');

    // Validate target vertex exists
    const vertex = gameState.board.vertices[targetVertexId];
    if (!vertex) throw new Error('Invalid target vertex');

    // Move the knight
    knight.vertexId = targetVertexId;

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} moved ${opponent.name}'s knight with intrigue`,
        playerId: player.id
    });
}

function executeSaboteur(gameState: GameState, player: PlayerState, options?: any): void {
    // Choose opponent with at least 4 resources, they discard half
    const { opponentId } = options || {};
    if (!opponentId) {
        throw new Error('Saboteur requires opponentId');
    }

    const opponent = gameState.players.find(p => p.id === opponentId);
    if (!opponent) throw new Error('Opponent not found');

    // Count total resources
    const totalResources = Object.values(opponent.resources).reduce((sum, count) => sum + count, 0);

    if (totalResources < 4) {
        throw new Error('Opponent must have at least 4 resource cards');
    }

    // Calculate how many to discard (half, rounded down)
    const discardCount = Math.floor(totalResources / 2);

    // For simplicity, discard proportionally from each resource type
    // In the real game, the opponent would choose which cards to discard
    const resourcesToDiscard: Partial<Record<ResourceType, number>> = {};
    let remaining = discardCount;

    const resourceTypes: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    for (const resourceType of resourceTypes) {
        const count = opponent.resources[resourceType];
        const proportion = count / totalResources;
        const toDiscard = Math.min(Math.floor(proportion * discardCount), remaining);

        if (toDiscard > 0) {
            resourcesToDiscard[resourceType] = toDiscard;
            remaining -= toDiscard;
        }
    }

    // If we haven't discarded enough due to rounding, discard more
    while (remaining > 0) {
        for (const resourceType of resourceTypes) {
            if (opponent.resources[resourceType] > 0 && remaining > 0) {
                resourcesToDiscard[resourceType] = (resourcesToDiscard[resourceType] || 0) + 1;
                remaining--;
            }
        }
    }

    removeResources(opponent, resourcesToDiscard);

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} forced ${opponent.name} to discard ${discardCount} resources`,
        playerId: player.id
    });
}

function executeWarlord(gameState: GameState, player: PlayerState): void {
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
        message: `${player.name} activated ${activatedCount} knights with Warlord`,
        playerId: player.id
    });
}
