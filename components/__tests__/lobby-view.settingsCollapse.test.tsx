import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The lobby sidebar is a fixed-height flex column: header, player list
 * (`flex-1`), settings footer. The footer is a flex item with the default
 * `min-height: auto`, so it refuses to shrink below its content height — and
 * with C&K plus the timer panel that content runs past 500px. On a 768p screen
 * the player list was squeezed to near-nothing. The settings block is therefore
 * collapsible, and starts collapsed on short viewports.
 */

const mockPush = vi.fn();
const mockRouter = { push: mockPush };
const { setLobbyPlayerOrderMock } = vi.hoisted(() => ({
    setLobbyPlayerOrderMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
}));

vi.mock('@/app/actions', () => ({
    setLobbyPlayerColor: vi.fn(),
    setLobbyGameMode: vi.fn(),
    setLobbyPlayerOrder: setLobbyPlayerOrderMock,
    startGame: vi.fn(),
    setLobbyTimerConfig: vi.fn(),
    kickPlayerFromLobby: vi.fn(),
    toggleLobbySkipFirstBarbarianAttack: vi.fn(),
}));

vi.mock('@/lib/hooks/useConnectionStatus', () => ({
    useConnectionStatus: () => ({ status: 'connected', consecutiveFailures: 0, lastError: null }),
    useFetchWithRetry: () => ({ fetchWithRetry: vi.fn().mockResolvedValue(null) }),
}));

// Realtime path avoids the 5s polling interval entirely.
vi.mock('@/lib/hooks/useLobbySubscription', () => ({
    useLobbySubscription: (_roomId: string, initialRoom: unknown, initialPlayers: unknown) => ({
        room: initialRoom,
        players: initialPlayers,
        isRealtime: true,
    }),
}));

vi.mock('@/components/lobby/BoardPreview', () => ({
    BoardPreview: () => <div data-testid="board-preview" />,
}));

vi.mock('@/components/lobby/GeneratorControls', () => ({
    GeneratorControls: () => <div data-testid="generator-controls" />,
}));

import { LobbyView } from '@/components/lobby-view';

const HOST_ID = 'host-1';

const renderLobby = () =>
    render(
        <LobbyView
            initialRoom={{
                id: 'ROOM1',
                status: 'waiting',
                metadata: JSON.stringify({
                    boardPreview: [],
                    fairMode: false,
                    gameMode: 'cities_and_knights',
                    pendingRequests: [],
                    timerConfig: { enabled: true, turnTimeLimit: 120, timeBank: 300 },
                    skipFirstBarbarianAttack: false,
                }),
            }}
            initialPlayers={[
                { id: HOST_ID, name: 'Ada', isHost: true, color: '#ff0000', joinedAt: '2026-01-01T00:00:00Z' },
                { id: 'p2', name: 'Grace', isHost: false, color: '#0000ff', joinedAt: '2026-01-01T00:01:00Z' },
            ]}
            roomId="ROOM1"
            currentPlayerId={HOST_ID}
        />
    );

const settingsToggle = () => screen.getByRole('button', { name: /game settings/i });
const settingsPanel = () => document.getElementById('lobby-game-settings')!;

const originalHeight = window.innerHeight;

const setViewportHeight = (height: number) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

afterEach(() => {
    setViewportHeight(originalHeight);
    vi.clearAllMocks();
});

describe('LobbyView game settings panel', () => {
    describe('on a short viewport', () => {
        beforeEach(() => setViewportHeight(720));

        it('starts collapsed so the player list keeps its space', () => {
            renderLobby();

            expect(settingsToggle()).toHaveAttribute('aria-expanded', 'false');
            expect(settingsPanel()).not.toBeVisible();
            // Players remain readable — the whole point of the fix.
            expect(screen.getByText(/Ada/)).toBeVisible();
            expect(screen.getByText(/Grace/)).toBeVisible();
        });

        it('summarises the hidden settings in the header', () => {
            renderLobby();

            expect(screen.getByText(/Cities & Knights · Timer 2:00/)).toBeVisible();
        });

        it('keeps the Start Game button outside the collapsible region', () => {
            renderLobby();

            expect(screen.getByRole('button', { name: /start game/i })).toBeVisible();
        });

        it('expands on click and drops the summary line', async () => {
            const user = userEvent.setup();
            renderLobby();

            await user.click(settingsToggle());

            expect(settingsToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(settingsPanel()).toBeVisible();
            expect(screen.queryByText(/Cities & Knights · Timer 2:00/)).not.toBeInTheDocument();
        });
    });

    describe('on a tall viewport', () => {
        beforeEach(() => setViewportHeight(1200));

        it('starts expanded', () => {
            renderLobby();

            expect(settingsToggle()).toHaveAttribute('aria-expanded', 'true');
            expect(settingsPanel()).toBeVisible();
        });

        it('collapses on click', async () => {
            const user = userEvent.setup();
            renderLobby();

            await user.click(settingsToggle());

            expect(settingsPanel()).not.toBeVisible();
        });

        it('lets the host move a player and updates the visible order', async () => {
            const user = userEvent.setup();
            renderLobby();

            await user.click(screen.getByRole('button', { name: 'Move Grace up' }));
            expect(setLobbyPlayerOrderMock).toHaveBeenCalledWith('ROOM1', HOST_ID, ['p2', HOST_ID]);

            await waitFor(() => {
                const playerCards = screen.getAllByRole('listitem');
                expect(playerCards[0]).toHaveTextContent('Grace');
                expect(playerCards[1]).toHaveTextContent('Ada');
            });
        });
    });
});
