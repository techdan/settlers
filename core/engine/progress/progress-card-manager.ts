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
    // Build up to 2 city walls (not implemented in base game yet)
    // This is a placeholder - city walls would need to be added to the game state
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} can build up to 2 city walls (feature pending)`,
        playerId: player.id
    });
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
