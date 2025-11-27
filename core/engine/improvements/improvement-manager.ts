import { PlayerState, GameState } from '@/lib/types';
import { ImprovementType, IMPROVEMENT_UPGRADE_COSTS, CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { getCommodityForImprovement, hasCommodities, removeCommodities } from '@/core/engine/resources/commodity-manager';

/**
 * Improvement Manager (Cities & Knights Expansion)
 * Handles city improvement mechanics
 *
 * Key rules:
 * - Three improvement tracks: science, trade, politics
 * - Each track has 5 levels (0-5)
 * - Costs to upgrade: 1, 1, 2, 3, 4 commodities for levels 0→1, 1→2, 2→3, 3→4, 4→5
 * - Each track uses a specific commodity: science→paper, trade→cloth, politics→coin
 * - Level 3+ allows drawing progress cards when event die matches the category
 * - Level 4 allows building a metropolis for that category
 */

/**
 * Initialize improvement tracks for a player (C&K mode)
 *
 * @param player - Player state
 */
export function initializeImprovements(player: PlayerState): void {
    if (!player.improvements) {
        player.improvements = {
            science: 0,
            trade: 0,
            politics: 0,
        };
    }
}

/**
 * Get the cost to upgrade an improvement from current level to next level
 *
 * @param currentLevel - Current improvement level (0-4)
 * @returns Number of commodities required
 */
export function getUpgradeCost(currentLevel: number): number {
    if (currentLevel < 0 || currentLevel >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL) {
        return 0; // Already at max level or invalid
    }
    return IMPROVEMENT_UPGRADE_COSTS[currentLevel] || 0;
}

/**
 * Check if player can afford to upgrade an improvement
 *
 * @param player - Player state
 * @param improvement - Improvement type to upgrade
 * @returns true if player has enough commodities
 */
export function canAffordImprovement(player: PlayerState, improvement: ImprovementType): boolean {
    if (!player.improvements || !player.commodities) return false;

    const currentLevel = player.improvements[improvement] || 0;
    if (currentLevel >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL) return false;

    const cost = getUpgradeCost(currentLevel);
    const commodity = getCommodityForImprovement(improvement);

    return hasCommodities(player, { [commodity]: cost });
}

/**
 * Upgrade a player's improvement track
 * Deducts commodities and increments level
 *
 * @param player - Player state
 * @param improvement - Improvement type to upgrade
 * @returns New improvement level, or -1 if upgrade failed
 */
export function upgradeImprovement(player: PlayerState, improvement: ImprovementType): number {
    // Initialize if needed
    initializeImprovements(player);

    if (!player.improvements || !player.commodities) return -1;

    const currentLevel = player.improvements[improvement] || 0;

    // Check if already at max level
    if (currentLevel >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL) {
        return -1;
    }

    // Check affordability
    if (!canAffordImprovement(player, improvement)) {
        return -1;
    }

    const cost = getUpgradeCost(currentLevel);
    const commodity = getCommodityForImprovement(improvement);

    // Deduct commodities
    removeCommodities(player, { [commodity]: cost });

    // Increment level
    player.improvements[improvement] = currentLevel + 1;

    return player.improvements[improvement];
}

/**
 * Try to award metropolis to player who just reached level 4
 * v2.0: Metropolis is automatically awarded at level 4 if unclaimed
 *
 * @param gameState - Current game state
 * @param player - Player who just upgraded
 * @param improvement - Improvement type
 * @returns true if metropolis was awarded
 */
export function tryAwardMetropolis(
    gameState: GameState,
    player: PlayerState,
    improvement: ImprovementType
): boolean {
    const playerLevel = player.improvements?.[improvement] || 0;

    // Only award at level 4
    if (playerLevel !== 4) return false;

    // Check if metropolis is already owned
    const metropolisType = getMetropolisType(improvement);
    const currentOwner = gameState.players.find(p =>
        p.metropolisOwned?.includes(metropolisType)
    );

    // If already owned, can't auto-award (need level 5 to steal)
    if (currentOwner) return false;

    // Find player's first city to upgrade to metropolis
    const playerCity = Object.values(gameState.board.vertices).find(v =>
        v.owner === player.id && v.structure === 'city'
    );

    if (!playerCity) {
        // Player has no cities - can't claim metropolis
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} reached level 4 ${improvement} but has no cities to claim the ${metropolisType} Metropolis!`,
            playerId: player.id
        });
        return false;
    }

    // Award metropolis
    playerCity.structure = 'metropolis';
    if (!player.metropolisOwned) player.metropolisOwned = [];
    player.metropolisOwned.push(metropolisType);

    // Store metropolis type in game state
    if (!gameState.metropolises) gameState.metropolises = {};
    gameState.metropolises[metropolisType] = {
        type: metropolisType,
        owner: player.id,
        vertexId: playerCity.id
    };

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} automatically claimed the ${metropolisType} Metropolis! (+2 VP)`,
        playerId: player.id
    });

    return true;
}

/**
 * Try to steal metropolis from another player who just reached level 5
 * v2.0: At level 5, you steal the metropolis from a level 4 holder
 *
 * @param gameState - Current game state
 * @param player - Player who just upgraded to level 5
 * @param improvement - Improvement type
 * @returns true if metropolis was stolen
 */
export function tryStealMetropolis(
    gameState: GameState,
    player: PlayerState,
    improvement: ImprovementType
): boolean {
    const playerLevel = player.improvements?.[improvement] || 0;

    // Only steal at level 5
    if (playerLevel !== 5) return false;

    const metropolisType = getMetropolisType(improvement);

    // Check if another player owns it at level 4
    const currentOwner = gameState.players.find(p =>
        p.id !== player.id && p.metropolisOwned?.includes(metropolisType)
    );

    if (!currentOwner) {
        // No one else owns it - try to claim it
        return tryAwardMetropolis(gameState, player, improvement);
    }

    // Check if current owner is at level 5 (can't steal)
    const ownerLevel = currentOwner.improvements?.[improvement] || 0;
    if (ownerLevel >= 5) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} reached level 5 ${improvement}, but ${currentOwner.name} has secured the ${metropolisType} Metropolis at level 5.`,
            playerId: player.id
        });
        return false;
    }

    // Find player's city to upgrade
    const playerCity = Object.values(gameState.board.vertices).find(v =>
        v.owner === player.id && v.structure === 'city'
    );

    if (!playerCity) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} reached level 5 ${improvement} but has no cities to claim the ${metropolisType} Metropolis!`,
            playerId: player.id
        });
        return false;
    }

    // Find current owner's metropolis vertex
    const ownerMetropolis = Object.values(gameState.board.vertices).find(v =>
        v.owner === currentOwner.id && v.structure === 'metropolis'
    );

    // Downgrade previous owner's metropolis to city
    if (ownerMetropolis) {
        ownerMetropolis.structure = 'city';
    }

    // Remove from previous owner
    if (currentOwner.metropolisOwned) {
        currentOwner.metropolisOwned = currentOwner.metropolisOwned.filter(m => m !== metropolisType);
    }

    // Award to new owner
    playerCity.structure = 'metropolis';
    if (!player.metropolisOwned) player.metropolisOwned = [];
    player.metropolisOwned.push(metropolisType);

    // Update game state
    if (!gameState.metropolises) gameState.metropolises = {};
    gameState.metropolises[metropolisType] = {
        type: metropolisType,
        owner: player.id,
        vertexId: playerCity.id
    };

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} stole the ${metropolisType} Metropolis from ${currentOwner.name}!`,
        playerId: player.id
    });

    return true;
}

/**
 * Get metropolis type from improvement type
 */
function getMetropolisType(improvement: ImprovementType): 'science' | 'trade' | 'politics' {
    return improvement as 'science' | 'trade' | 'politics';
}

/**
 * Get the highest improvement level among all players for a specific category
 * Used to determine metropolis ownership
 *
 * @param players - All players in the game
 * @param improvement - Improvement type
 * @returns Object with playerId and level of the leader
 */
export function getImprovementLeader(
    players: PlayerState[],
    improvement: ImprovementType
): { playerId: string; level: number } | null {
    let leader: { playerId: string; level: number } | null = null;

    for (const player of players) {
        const level = player.improvements?.[improvement] || 0;

        if (!leader || level > leader.level) {
            leader = { playerId: player.id, level };
        } else if (leader && level === leader.level) {
            // Tie - no clear leader
            leader = null;
        }
    }

    return leader;
}

/**
 * Check if player qualifies to build/own a metropolis for an improvement
 * Requires level 4 and must have the highest level (or tied with current owner)
 *
 * @param player - Player state
 * @param improvement - Improvement type
 * @param allPlayers - All players in the game
 * @param currentMetropolisOwner - Current owner of the metropolis (if any)
 * @returns true if player qualifies
 */
export function canBuildMetropolis(
    player: PlayerState,
    improvement: ImprovementType,
    allPlayers: PlayerState[],
    currentMetropolisOwner: string | null
): boolean {
    const playerLevel = player.improvements?.[improvement] || 0;

    // Must be at level 4 or 5
    if (playerLevel < CK_CONSTANTS.METROPOLIS_REQUIREMENT) {
        return false;
    }

    // If unclaimed, player just needs level 4
    if (!currentMetropolisOwner) {
        return true;
    }

    // If player already owns it, they keep it
    if (currentMetropolisOwner === player.id) {
        return true;
    }

    // To steal from another player, must have HIGHER level
    const currentOwner = allPlayers.find(p => p.id === currentMetropolisOwner);
    if (!currentOwner) return true; // Owner not found, allow claim

    const ownerLevel = currentOwner.improvements?.[improvement] || 0;
    return playerLevel > ownerLevel;
}

/**
 * Check if player qualifies to draw progress cards for an improvement category
 *
 * Requirements:
 * 1. Player must have improvement level ≥ 1
 * 2. Red die value must be ≤ (improvement level + 1)
 *
 * Red Die Thresholds:
 * - Level 1: Red die 1-2 (2 symbols)
 * - Level 2: Red die 1-3 (3 symbols)
 * - Level 3: Red die 1-4 (4 symbols)
 * - Level 4: Red die 1-5 (5 symbols)
 * - Level 5: Red die 1-6 (6 symbols, always qualifies)
 *
 * @param player - Player state
 * @param improvement - Improvement type
 * @param redDieValue - Value of the red production die (1-6)
 * @returns true if player can draw a progress card
 */
export function canDrawProgressCard(
    player: PlayerState,
    improvement: ImprovementType,
    redDieValue: number
): boolean {
    const level = player.improvements?.[improvement] || 0;

    // Must have at least level 1
    if (level < 1) return false;

    // Red die must be ≤ number of red-die symbols (level + 1)
    const redDieThreshold = level + 1;
    return redDieValue <= redDieThreshold;
}

/**
 * Get all players who qualify to draw a progress card for a specific category
 *
 * @param players - All players in the game
 * @param improvement - Improvement type
 * @param redDieValue - Value of the red production die (1-6)
 * @returns Array of player IDs who qualify
 */
export function getPlayersEligibleForCardDraw(
    players: PlayerState[],
    improvement: ImprovementType,
    redDieValue: number
): string[] {
    return players
        .filter(player => canDrawProgressCard(player, improvement, redDieValue))
        .map(player => player.id);
}
