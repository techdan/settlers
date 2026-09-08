import { DICE_TOTALS, EVENT_DIE_FACES, type GameState } from '@/lib/types/game';

/** Completed authoritative roll identity, shared by presentation and metadata. */
export function getResolvedDiceRollId(game: GameState): string | null {
    if (!game.diceRoll) return null;
    if (game.gameMode === 'cities_and_knights') {
        if (!game.eventDieStats) return null;
        const count = EVENT_DIE_FACES.reduce((sum, face) => sum + (game.eventDieStats?.[face] ?? 0), 0);
        return count > 0 ? `${game.id}:event-roll:${count}` : null;
    }
    if (!game.diceStats) return null;
    const count = DICE_TOTALS.reduce((sum, total) => sum + (game.diceStats?.[total] ?? 0), 0);
    return count > 0 ? `${game.id}:production-roll:${count}` : null;
}
