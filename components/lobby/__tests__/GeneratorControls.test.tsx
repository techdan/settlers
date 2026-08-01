import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GeneratorControls } from '../GeneratorControls';

const toggleLobbyFairMode = vi.hoisted(() => vi.fn());

vi.mock('@/app/actions', () => ({
    generateLobbyBoard: vi.fn(),
    requestNewLobbyBoard: vi.fn(),
    toggleLobbyFairMode,
}));

const renderControls = (fairMode = false) => render(
    <GeneratorControls
        roomId="ROOM1"
        hostId="host-1"
        currentPlayerId="host-1"
        isHost
        fairMode={fairMode}
        pendingRequests={[]}
        players={[{ id: 'host-1', name: 'Ada' }]}
    />
);

describe('GeneratorControls fairness toggle', () => {
    it('updates immediately without waiting for the server action', async () => {
        let resolveToggle: () => void = () => undefined;
        toggleLobbyFairMode.mockImplementation(() => new Promise<void>(resolve => {
            resolveToggle = resolve;
        }));

        const user = userEvent.setup();
        renderControls();

        const checkbox = screen.getByRole('checkbox', { name: /enable fairness/i });
        await user.click(checkbox);

        expect(checkbox).toBeChecked();
        expect(toggleLobbyFairMode).toHaveBeenCalledWith('ROOM1', 'host-1', true);

        await act(async () => {
            resolveToggle();
        });
    });
});
