import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventorSwapNotification } from '../InventorSwapNotification';

describe('InventorSwapNotification', () => {
    it('shows resource squares and directs players to the dashed outlines', () => {
        render(
            <InventorSwapNotification
                event={{
                    id: 'inventor-1',
                    playerId: 'player-1',
                    hexes: [
                        { id: 'forest-5', resource: 'wood', before: 5, after: 9 },
                        { id: 'field-9', resource: 'wheat', before: 9, after: 5 },
                    ],
                    timestamp: 1,
                }}
                playerName="Ada"
                onDismiss={vi.fn()}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Inventor: Resource Squares Swapped' })).toBeInTheDocument();
        expect(screen.getByText('Wood square')).toBeInTheDocument();
        expect(screen.getByText('Wheat square')).toBeInTheDocument();
        expect(screen.getByText(/dashed outlines mark/i)).toBeInTheDocument();
        expect(screen.queryByText(/\(0, 0\)/)).not.toBeInTheDocument();
    });
});
