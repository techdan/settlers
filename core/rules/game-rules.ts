import { TerrainType, ResourceType } from './board-constants';

/**
 * Game Rules Interface
 *
 * Defines the rules for a game mode or expansion.
 * This allows different game modes to have different terrain-to-resource mappings.
 */
export interface GameRules {
    name: string;
    terrainToResource: Record<Exclude<TerrainType, 'desert'>, ResourceType>;
    // Future: Add more rule variations (port ratios, building costs, victory points, etc.)
}

/**
 * Base Game Rules
 *
 * Standard Catan terrain-to-resource mappings.
 * Used as the default for all games unless a different rule set is specified.
 */
export const BASE_GAME_RULES: GameRules = {
    name: 'base',
    terrainToResource: {
        forest: 'wood',
        hill: 'brick',
        pasture: 'sheep',
        field: 'wheat',
        mountain: 'ore',
    },
};

/**
 * Get resource type from terrain using game rules
 *
 * @param terrain - The terrain type of the hex
 * @param rules - Game rules to use (defaults to BASE_GAME_RULES)
 * @returns The resource type that terrain produces, or null for desert
 */
export function getResourceFromTerrain(
    terrain: TerrainType,
    rules: GameRules = BASE_GAME_RULES
): ResourceType | null {
    if (terrain === 'desert') return null;
    return rules.terrainToResource[terrain as Exclude<TerrainType, 'desert'>];
}

// Default export for backwards compatibility
export default BASE_GAME_RULES;
