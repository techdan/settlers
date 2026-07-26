import { cleanup, render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GameLayoutPanels } from '../GameLayoutPanels';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';

/**
 * Low-resolution HUD regression guard.
 *
 * The right rail and the bottom tray are both absolutely positioned, so neither
 * reserves space for the other. Before this guard, on a 1366x768 laptop the rail
 * ran past the tray and the tray (z-30) painted over the log. Two invariants
 * keep that from coming back:
 *
 *   1. the rail's height is derived from the *measured* tray height, so it can
 *      never reach the tray however tall the tray grows (wrapped rows, debug
 *      panel, progress-card shelf);
 *   2. every desktop cluster is scaled by --hud-scale, which short-viewport
 *      media queries turn down — the HUD is full of hardcoded pixel sizes that
 *      cannot shrink on their own.
 */

vi.mock('@/lib/hooks/useChatSubscription', () => ({
    useChatSubscription: () => ({
        messages: [],
        isLoading: false,
        error: null,
        isRealtimeEnabled: false,
        addMessage: vi.fn(),
    }),
}));

const TRAY_RENDERED_HEIGHT = 148;

class StubResizeObserver {
    constructor(private readonly callback: () => void) { }
    observe() { this.callback(); }
    disconnect() { }
    unobserve() { }
}

const renderPanels = () => {
    const players = [
        createTestPlayer({ id: 'p1', name: 'Pa' }),
        createTestPlayer({ id: 'p2', name: 'Pb' }),
    ];
    const gameState = createTestGameState({ players, currentTurn: 'p1', phase: 'main_phase' });

    return render(
        <GameLayoutPanels
            gameState={gameState}
            playerId="p1"
            isCitiesAndKnights={false}
            isDebugMode={false}
            currentPlayer={players[0]}
            selectionManager={{ buildMode: null, setBuildMode: vi.fn(), selectingKnightsForSmith: false, selectingCityForMedicine: false }}
            promptBlocksUI={false}
            engineerSelectionActive={false}
            isActiveTurn
            handleOpenPlayerCityManagement={vi.fn()}
            handleCancelFollowupCard={vi.fn()}
            decorateCardHandler={(_cardType, _hasFollowupStep, handler) => handler}
            progressCardControllerHandlers={{
                handlePlayProgressCard: vi.fn(),
                handleStartHexSelection: vi.fn(),
                handleStartVertexSelection: vi.fn(),
                handleStartEdgeSelection: vi.fn(),
                handleStartEngineerSelection: vi.fn(),
                handleStartMedicineSelection: vi.fn(),
                handleStartTreasonSelection: vi.fn(),
            }}
            improvementControllerHandlers={{ handleStartCraneDialog: vi.fn() }}
            knightControllerHandlers={{ handleStartSmithSelection: vi.fn() }}
            onRollDice={vi.fn()}
            onEndTurn={vi.fn()}
            onOpenTrade={vi.fn()}
            turnSubmitted={false}
            hasOptimisticUpdates={false}
        />
    );
};

describe('GameLayoutPanels low-resolution layout', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
        // jsdom does not implement Element.scrollTo at all (so it cannot be
        // spied on) and GameLog auto-scrolls on mount.
        Element.prototype.scrollTo = vi.fn();
        // A 1366x768 laptop, minus browser chrome.
        vi.stubGlobal('innerWidth', 1366);
        vi.stubGlobal('innerHeight', 660);
        // getBoundingClientRect (not offsetHeight) is what reflects the
        // --hud-scale transform, so the measurement has to go through it.
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            height: TRAY_RENDERED_HEIGHT,
            width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
            toJSON: () => ({}),
        } as DOMRect);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('publishes the measured tray height so the rail can clear it', () => {
        const { container } = renderPanels();

        const root = container.firstElementChild as HTMLElement;
        expect(root.style.getPropertyValue('--tray-h')).toBe(`${TRAY_RENDERED_HEIGHT}px`);
    });

    it('bounds the rail against the tray instead of letting it slide underneath', () => {
        const { container } = renderPanels();

        const rail = container.querySelector('[data-hud="rail"]') as HTMLElement;
        // Laid out at 1/scale, then scaled back down, so the *rendered* rail
        // stops exactly where the tray starts.
        expect(rail.style.height).toContain('var(--tray-h');
        expect(rail.style.height).toContain('var(--hud-scale');
        expect(rail.style.transform).toContain('var(--hud-scale');
    });

    it('scales the tray from its bottom edge so it stays anchored and centred', () => {
        const { container } = renderPanels();

        const tray = container.querySelector('[data-hud="tray"]') as HTMLElement;
        expect(tray.style.transform).toContain('var(--hud-scale');
        // The centring translate must survive alongside the scale.
        expect(tray.style.transform).toContain('translateX(-50%)');
        expect(tray.style.transformOrigin).toBe('bottom center');
    });

    it('turns --hud-scale down on a short viewport and back up on a tall one', () => {
        const { container } = renderPanels();
        const root = container.firstElementChild as HTMLElement;

        // 660px of viewport sits on the ramp between 620 (0.72) and 920 (1.0).
        const shortScale = Number(root.style.getPropertyValue('--hud-scale'));
        expect(shortScale).toBeGreaterThan(0.72);
        expect(shortScale).toBeLessThan(0.8);

        cleanup();
        vi.stubGlobal('innerHeight', 1080);
        const tall = renderPanels();
        expect(Number((tall.container.firstElementChild as HTMLElement).style.getPropertyValue('--hud-scale'))).toBe(1);
    });

    it('leaves the tablet HUD unscaled below the xl breakpoint', () => {
        cleanup();
        vi.stubGlobal('innerWidth', 1024);
        const { container } = renderPanels();

        const root = container.firstElementChild as HTMLElement;
        expect(Number(root.style.getPropertyValue('--hud-scale'))).toBe(1);
    });

    it('widens the tray layout box by 1/scale so it does not wrap to two rows', () => {
        const { container } = renderPanels();

        const tray = container.querySelector('[data-hud="tray"]') as HTMLElement;
        // Painting is scaled down, so the layout box has to be scaled up to
        // keep the flex-wrap decision on a single row. (The CSSOM folds the
        // calc, so assert on the resolved percentage: 100 / 0.757 = 132.1%.)
        const widthPercent = Number(tray.style.width.match(/([\d.]+)%/)?.[1]);
        expect(widthPercent).toBeGreaterThan(100);
        expect(tray.style.maxWidth).toContain('1400px');
    });

    it('keeps a floor under the player list so it cannot collapse to nothing', () => {
        const { container } = renderPanels();

        const rail = container.querySelector('[data-hud="rail"]') as HTMLElement;
        const statusSlot = rail.firstElementChild as HTMLElement;
        expect(statusSlot.className).toContain('min-h-[9rem]');
        expect(container.textContent).toContain('Pa');
        expect(container.textContent).toContain('Pb');
    });

    it('lets the player list scroll rather than pushing the log off-screen', () => {
        const { container } = renderPanels();

        const rail = container.querySelector('[data-hud="rail"]') as HTMLElement;
        const scroller = rail.querySelector('.overflow-y-auto');
        expect(scroller).not.toBeNull();
        expect(scroller!.className).toContain('min-h-0');
    });
});
