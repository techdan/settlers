import { PlayerState } from '@/lib/types';
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
 * Requires level 3 or higher
 *
 * @param player - Player state
 * @param improvement - Improvement type
 * @returns true if player can draw progress cards
 */
export function canDrawProgressCard(player: PlayerState, improvement: ImprovementType): boolean {
    const level = player.improvements?.[improvement] || 0;
    return level >= CK_CONSTANTS.MIN_LEVEL_FOR_CARD_DRAW;
}

/**
 * Get all players who qualify to draw a progress card for a specific category
 *
 * @param players - All players in the game
 * @param improvement - Improvement type
 * @returns Array of player IDs who qualify
 */
export function getPlayersEligibleForCardDraw(
    players: PlayerState[],
    improvement: ImprovementType
): string[] {
    return players
        .filter(player => canDrawProgressCard(player, improvement))
        .map(player => player.id);
}
