import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { RobberModals } from '../RobberModals';

const thief = createTestPlayer({ id: 'thief', name: 'Alice' });
const victim = createTestPlayer({ id: 'victim', name: 'Bob' });
const theft = {
    source: 'robber' as const,
    victimId: victim.id,
    thiefId: thief.id,
    items: [{ type: 'resource' as const, value: 'ore' as const, count: 1 }],
    victims: [{
        victimId: victim.id,
        items: [{ type: 'resource' as const, value: 'ore' as const, count: 1 }],
    }],
    timestamp: Date.now(),
};
const gameState = createTestGameState({
    players: [thief, victim],
    currentTurn: thief.id,
    turnOrder: [thief.id, victim.id],
    lastTheft: theft,
});

function renderRobberModals(playerId: string) {
    render(
        <RobberModals
            gameState={gameState}
            playerId={playerId}
            isOpen={false}
            potentialVictims={[]}
            onSelectVictim={vi.fn()}
            onCancelVictim={vi.fn()}
            theftNotification={theft}
            onDismissTheft={vi.fn()}
        />
    );
}

describe('RobberModals theft result', () => {
    it('notifies the stealing player which resource they received', () => {
        renderRobberModals(thief.id);

        expect(screen.getByRole('dialog', { name: 'Resources Stolen' })).toBeInTheDocument();
        expect(screen.getByText(/You stole/)).toBeInTheDocument();
        expect(screen.getAllByText('Ore')).toHaveLength(2);
        expect(screen.getByText(victim.name)).toBeInTheDocument();
    });

    it('notifies the robbed player which resource was taken', () => {
        renderRobberModals(victim.id);

        expect(screen.getByRole('dialog', { name: 'Resources Stolen!' })).toBeInTheDocument();
        expect(screen.getByText(/stole/)).toBeInTheDocument();
        expect(screen.getAllByText('Ore')).toHaveLength(2);
        expect(screen.getByText(thief.name)).toBeInTheDocument();
        expect(screen.getByText(/from you/)).toBeInTheDocument();
    });
});
