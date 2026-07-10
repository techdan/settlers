import { GameState } from '@/lib/types';

/**
 * Barbarian battle math (C&K): barbarian strength = total cities on the board,
 * defender strength = total active knight levels.
 *
 * Single source for the numbers shown on the board's barbarian route (and any
 * future HUD summary) — previously duplicated inside BarbarianTrack.
 */
export function getBarbarianForces(gameState: GameState): { cities: number; knights: number } {
    const cities = gameState.players.reduce((sum, p) => sum + (4 - p.citiesRemaining), 0);
    const knights = gameState.players.reduce((sum, p) => sum + (p.activeKnightCount ?? 0), 0);
    return { cities, knights };
}
