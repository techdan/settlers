import { describe, expect, it } from 'vitest';
import { EMPTY_DICE_STATS, EMPTY_EVENT_DIE_STATS } from '@/lib/types/game';
import { createTestGameState } from '@/lib/test-utils/test-helpers';
import { getDiceRollKey, getDiceRollTimestamp, shouldAnimateDiceRoll } from './dice-events';

const freshTiming = { timestamp: 99_000, serverTime: 100_000 };

describe('accepted dice event identity', () => {
    it('deduplicates responses, realtime echoes, and unrelated log updates', () => {
        const game = createTestGameState({ diceRoll: { d1: 4, d2: 4, total: 8 }, diceStats: { ...EMPTY_DICE_STATS, 8: 1 }, gameMode: 'base' });
        const key = getDiceRollKey(game);
        expect(key).not.toBeNull();
        const echo = structuredClone(game);
        echo.logs.push({ id: 'unrelated', timestamp: 111, message: 'Some unrelated accepted action' });
        expect(getDiceRollKey(echo)).toBe(key);
        expect(shouldAnimateDiceRoll(key, getDiceRollKey(echo), false, freshTiming)).toBe(false);
    });

    it('animates a consecutive identical result once and establishes a mount baseline', () => {
        const game = createTestGameState({ diceRoll: { d1: 3, d2: 4, total: 7 }, diceStats: { ...EMPTY_DICE_STATS, 7: 1 }, gameMode: 'base' });
        const previous = getDiceRollKey(game);
        game.diceStats![7]++;
        const next = getDiceRollKey(game);
        expect(next).not.toBe(previous);
        expect(shouldAnimateDiceRoll(previous, next, false, freshTiming)).toBe(true);
        expect(shouldAnimateDiceRoll(next, next, false, freshTiming)).toBe(false);
        expect(shouldAnimateDiceRoll(previous, next, true, freshTiming)).toBe(false);
    });

    it('recognizes the Alchemist reveal and selected production dice as separate events', () => {
        const game = createTestGameState({ gameMode: 'cities_and_knights', diceRoll: undefined, diceStats: { ...EMPTY_DICE_STATS }, eventDieStats: { ...EMPTY_EVENT_DIE_STATS, science: 2 } });
        game.pendingAlchemy = { playerId: game.currentTurn, eventDieFace: 'science', revealedAt: 1234 };
        game.eventDieRoll = { face: 'science', timestamp: 1234 };
        const revealed = getDiceRollKey(game);
        expect(revealed).toContain('alchemy-reveal:1234');
        game.pendingAlchemy = undefined;
        game.diceRoll = { d1: 5, d2: 6, total: 11 };
        game.eventDieStats!.science++;
        const selected = getDiceRollKey(game);
        expect(selected).toContain('event-roll:3');
        expect(shouldAnimateDiceRoll(revealed, selected, false, freshTiming)).toBe(true);
    });

    it('does not treat old retained event results or missing historical counters as new rolls', () => {
        const game = createTestGameState({ gameMode: 'cities_and_knights', diceRoll: undefined, eventDieRoll: { face: 'ship', timestamp: 123 }, eventDieStats: { ...EMPTY_EVENT_DIE_STATS, ship: 3 } });
        expect(getDiceRollKey(game)).toBeNull();
        game.diceRoll = { d1: 1, d2: 1, total: 2 };
        game.eventDieStats = undefined;
        expect(getDiceRollKey(game)).toBeNull();
        game.gameMode = 'base';
        game.diceStats = undefined;
        expect(getDiceRollKey(game)).toBeNull();
        expect(shouldAnimateDiceRoll('accepted', null, false, freshTiming)).toBe(false);
    });

    it('suppresses stale snapshot rolls and keeps their baseline deduplicated', () => {
        expect(shouldAnimateDiceRoll('roll-1', 'roll-2', false, { timestamp: 90_000, serverTime: 100_000 })).toBe(false);
        // The scene records roll-2 even when skipped; a later echo cannot replay it.
        expect(shouldAnimateDiceRoll('roll-2', 'roll-2', false, freshTiming)).toBe(false);
        expect(shouldAnimateDiceRoll('roll-2', 'roll-3', false, freshTiming)).toBe(true);
    });

    it('uses a matching production timestamp for base rolls and settles untimed legacy rolls', () => {
        const game = createTestGameState({ gameMode: 'base', diceRoll: { d1: 3, d2: 4, total: 7 }, diceStats: { ...EMPTY_DICE_STATS, 7: 1 } });
        const key = getDiceRollKey(game)!;
        expect(getDiceRollTimestamp(game)).toBeNull();
        expect(shouldAnimateDiceRoll('previous', key, false, { timestamp: getDiceRollTimestamp(game), serverTime: 100_000 })).toBe(false);
        game.lastProduction = { id: key, timestamp: 99_000, diceTotal: 7, gains: [], sources: [] };
        expect(getDiceRollTimestamp(game)).toBe(99_000);
        game.lastProduction.id = 'an-older-roll';
        expect(getDiceRollTimestamp(game)).toBeNull();
    });

    it('distinguishes an old Alchemist reveal time from freshly selected production dice', () => {
        const game = createTestGameState({ gameMode: 'cities_and_knights', diceRoll: undefined, eventDieStats: { ...EMPTY_EVENT_DIE_STATS, science: 1 }, eventDieRoll: { face: 'science', timestamp: 1_000 } });
        game.pendingAlchemy = { playerId: game.currentTurn, eventDieFace: 'science', revealedAt: 1_000 };
        expect(getDiceRollTimestamp(game)).toBe(1_000);
        expect(shouldAnimateDiceRoll('previous', getDiceRollKey(game), false, { timestamp: getDiceRollTimestamp(game), serverTime: 100_000 })).toBe(false);
        game.pendingAlchemy = undefined;
        game.diceRoll = { d1: 4, d2: 4, total: 8 };
        game.eventDieStats!.science++;
        const key = getDiceRollKey(game)!;
        game.lastProduction = { id: key, timestamp: 99_000, diceTotal: 8, gains: [], sources: [] };
        expect(getDiceRollTimestamp(game)).toBe(99_000);
        expect(shouldAnimateDiceRoll('reveal', key, false, { timestamp: getDiceRollTimestamp(game), serverTime: 100_000 })).toBe(true);
    });

    it('uses the event die timestamp for legacy C&K rolls but ignores retained results after end turn', () => {
        const game = createTestGameState({ gameMode: 'cities_and_knights', diceRoll: { d1: 3, d2: 3, total: 6 }, eventDieStats: { ...EMPTY_EVENT_DIE_STATS, ship: 1 }, eventDieRoll: { face: 'ship', timestamp: 99_000 } });
        expect(getDiceRollTimestamp(game)).toBe(99_000);
        game.diceRoll = undefined;
        expect(getDiceRollTimestamp(game)).toBeNull();
    });
});
