import type { GameState, TheftEvent } from '@/lib/types/game';

const MAX_RECENT_THEFT_EVENTS = 20;

type NewTheftEvent = Omit<TheftEvent, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: number;
};

export function recordTheftEvent(
    gameState: GameState,
    theft: NewTheftEvent
): TheftEvent {
    const timestamp = theft.timestamp ?? Date.now();
    const event: TheftEvent = {
        ...theft,
        id: theft.id ?? `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
        timestamp,
    };

    gameState.lastTheft = event;
    gameState.theftEvents = [...(gameState.theftEvents ?? []), event]
        .slice(-MAX_RECENT_THEFT_EVENTS);

    return event;
}
