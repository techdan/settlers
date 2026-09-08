import type { GameState } from '@/lib/types/game';
import { getResolvedDiceRollId } from '@/core/engine/dice/dice-event-identity';
import { isPresentationEventFresh } from './event-freshness';

/**
 * Identity of an accepted roll, independent of its faces and of unrelated logs.
 * The ordinary roll service increments diceStats; processEventDieRoll increments
 * eventDieStats for both ordinary C&K rolls and completed Alchemist selections.
 * The separate Alchemist reveal is authoritative but has not incremented either
 * counter yet. Never animate old eventDieRoll data retained after endTurn.
 */
export function getDiceRollKey(game: GameState): string | null {
    if (game.pendingAlchemy) {
        return `${game.id}:alchemy-reveal:${game.pendingAlchemy.revealedAt}`;
    }
    return getResolvedDiceRollId(game);
}

/** Read timing only from the event associated with this accepted roll. */
export function getDiceRollTimestamp(game: GameState): number | null {
    if (game.pendingAlchemy) return game.pendingAlchemy.revealedAt;
    const rollId = getResolvedDiceRollId(game);
    if (!rollId) return null;
    if (game.lastProduction?.id === rollId) return game.lastProduction.timestamp;
    // Older C&K snapshots carry event-die timing; base DiceRoll has no timestamp.
    return game.gameMode === 'cities_and_knights' ? game.eventDieRoll?.timestamp ?? null : null;
}

interface DiceEventTiming { timestamp?: number | null; serverTime?: number; clientNow?: number }

/** The caller retains the latest non-null key; mounting establishes its baseline. */
export function shouldAnimateDiceRoll(previousKey: string | null, nextKey: string | null, reducedMotion: boolean, timing: DiceEventTiming): boolean {
    return nextKey !== null && nextKey !== previousKey && !reducedMotion
        && isPresentationEventFresh(timing.timestamp, timing.serverTime, timing.clientNow);
}
