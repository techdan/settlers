import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestPlayer } from '@/lib/test-utils';
import type { TheftEvent } from '@/lib/types';
import { PlayerHand } from '../PlayerHand';

vi.mock('@/themes/tabletop', () => ({
    CardStack: ({ children }: { children: ReactNode }) => (
        <div data-testid="card-stack">{children}</div>
    ),
    ResourceCardFace: ({ type }: { type: string }) => (
        <span data-testid={`resource-${type}`} />
    ),
    CommodityCardFace: ({ type }: { type: string }) => (
        <span data-testid={`commodity-${type}`} />
    ),
}));

const player = createTestPlayer({
    id: 'victim',
    resources: {
        wood: 1,
        brick: 0,
        sheep: 0,
        wheat: 0,
        ore: 0,
    },
});

function theft(timestamp: number): TheftEvent {
    return {
        id: `theft-${timestamp}`,
        thiefId: 'thief',
        victimId: player.id,
        items: [{ type: 'resource', value: 'wood', count: 1 }],
        timestamp,
    };
}

function woodHighlight(): HTMLElement {
    const card = screen.getByTestId('resource-wood');
    const highlight = card.parentElement?.parentElement;
    if (!highlight) throw new Error('Wood highlight wrapper not found');
    return highlight;
}

describe('PlayerHand theft highlight', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts immediately for a new theft and expires without a prop refresh', () => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);

        render(
            <PlayerHand
                player={player}
                roomId="room-1"
                lastTheft={theft(10_000)}
            />
        );

        expect(woodHighlight()).toHaveClass('bg-red-500/40');

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(woodHighlight()).not.toHaveClass('bg-red-500/40');
    });

    it('remounts the timer when a distinct theft arrives', () => {
        vi.useFakeTimers();
        vi.setSystemTime(20_000);

        const { rerender } = render(
            <PlayerHand
                player={player}
                roomId="room-1"
                lastTheft={theft(20_000)}
            />
        );

        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(woodHighlight()).not.toHaveClass('bg-red-500/40');

        rerender(
            <PlayerHand
                player={player}
                roomId="room-1"
                lastTheft={theft(25_000)}
            />
        );

        expect(woodHighlight()).toHaveClass('bg-red-500/40');
    });
});
