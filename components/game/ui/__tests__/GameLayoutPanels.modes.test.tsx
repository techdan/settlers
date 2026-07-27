import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { GameLayoutPanels } from '../GameLayoutPanels';

vi.mock('../CompactGameStatus', () => ({
    CompactGameStatus: () => <div data-testid="compact-status">Status</div>,
}));

vi.mock('../SidebarTabs', () => ({
    SidebarTabs: () => <div data-testid="sidebar-tabs">Activity</div>,
}));

vi.mock('../DebugPanel', () => ({
    DebugPanel: ({ defaultOpen }: { defaultOpen?: boolean }) => (
        <div data-testid="debug-panel" data-default-open={String(Boolean(defaultOpen))}>
            Debug panel
        </div>
    ),
}));

vi.mock('../TurnTimerExpiredNotification', () => ({
    TurnTimerExpiredNotification: () => <div data-testid="timer-notification" />,
}));

vi.mock('../../overlays/ProgressDecksPanel', () => ({
    ProgressDecksPanel: () => <div data-testid="progress-decks">Progress decks</div>,
}));

class StubResizeObserver {
    constructor(private readonly callback: () => void) {}
    observe() {
        this.callback();
    }
    disconnect() {}
    unobserve() {}
}

function renderMode(
    gameMode: 'base' | 'cities_and_knights',
    options: { isDebugMode?: boolean; playerId?: string } = {}
) {
    const players = [
        createTestPlayer({ id: 'p1', name: 'Pa' }),
        createTestPlayer({ id: 'p2', name: 'Pb' }),
    ];
    const gameState = createTestGameState({
        players,
        currentTurn: 'p1',
        phase: 'main_phase',
        gameMode,
    });

    return render(
        <GameLayoutPanels
            gameState={gameState}
            playerId={options.playerId ?? 'p1'}
            isDebugMode={options.isDebugMode ?? false}
            onOpenPlayerCityManagement={vi.fn()}
            tray={<div data-testid="composed-tray">Tray</div>}
        />
    );
}

function modeManifest() {
    return {
        statusExpanded: screen
            .getByRole('button', { name: /main phase pa/i })
            .getAttribute('aria-expanded'),
        activityExpanded: screen
            .getByRole('button', { name: 'Log & Chat' })
            .getAttribute('aria-expanded'),
        hasDecksAction: Boolean(screen.queryByRole('button', { name: 'Decks' })),
        progressDeckPanels: screen.queryAllByTestId('progress-decks').length,
        hasDebugAction: Boolean(screen.queryByRole('button', { name: 'Debug' })),
        debugPanels: screen.queryAllByTestId('debug-panel').length,
        tray: screen.getByTestId('composed-tray').textContent,
    };
}

describe('GameLayoutPanels game-mode surfaces', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
        vi.stubGlobal('innerWidth', 1024);
        vi.stubGlobal('innerHeight', 768);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders the base-game panel manifest without C&K controls', () => {
        renderMode('base');

        expect(modeManifest()).toMatchInlineSnapshot(`
          {
            "activityExpanded": "false",
            "debugPanels": 0,
            "hasDebugAction": false,
            "hasDecksAction": false,
            "progressDeckPanels": 0,
            "statusExpanded": "false",
            "tray": "Tray",
          }
        `);
    });

    it('renders the Cities and Knights panel manifest with progress decks', () => {
        renderMode('cities_and_knights');

        expect(modeManifest()).toMatchInlineSnapshot(`
          {
            "activityExpanded": "false",
            "debugPanels": 0,
            "hasDebugAction": false,
            "hasDecksAction": true,
            "progressDeckPanels": 1,
            "statusExpanded": "false",
            "tray": "Tray",
          }
        `);
    });

    it('opens and closes the C&K decks drawer without removing the desktop panel', () => {
        renderMode('cities_and_knights');
        const decksButton = screen.getByRole('button', { name: 'Decks' });

        fireEvent.click(decksButton);

        expect(decksButton).toHaveAttribute('aria-expanded', 'true');
        expect(
            document.querySelector('[data-tablet-panel="decks"]')
        ).not.toBeNull();
        expect(screen.getAllByTestId('progress-decks')).toHaveLength(2);

        fireEvent.click(decksButton);

        expect(decksButton).toHaveAttribute('aria-expanded', 'false');
        expect(document.querySelector('[data-tablet-panel="decks"]')).toBeNull();
        expect(screen.getAllByTestId('progress-decks')).toHaveLength(1);
    });

    it('offers debug surfaces only for a current player in debug mode', () => {
        renderMode('cities_and_knights', { isDebugMode: true });

        expect(screen.getAllByTestId('debug-panel')).toHaveLength(1);
        const debugButton = screen.getByRole('button', { name: 'Debug' });
        fireEvent.click(debugButton);

        expect(document.querySelector('[data-tablet-panel="debug"]')).not.toBeNull();
        expect(screen.getAllByTestId('debug-panel')).toHaveLength(2);
        expect(
            document.querySelector('[data-testid="debug-panel"][data-default-open="true"]')
        ).not.toBeNull();

        cleanup();
        renderMode('cities_and_knights', {
            isDebugMode: true,
            playerId: 'missing-player',
        });

        expect(screen.queryByRole('button', { name: 'Debug' })).toBeNull();
        expect(screen.queryByTestId('debug-panel')).toBeNull();
    });
});
