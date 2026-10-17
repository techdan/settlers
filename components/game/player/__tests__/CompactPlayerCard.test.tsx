import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { CompactPlayerCard, type PlayerCardTimer } from '../CompactPlayerCard';
import { playerPieceColor } from '@/lib/presentation/piece-style';

const PLAYER_ID = 'player-1';
const PLAYER_COLOR = '#ff7a00';

function renderCard(options: {
    gameMode?: 'base' | 'cities_and_knights';
    player?: Parameters<typeof createTestPlayer>[0];
    state?: Parameters<typeof createTestGameState>[0];
    isTurn?: boolean;
    timer?: PlayerCardTimer | null;
    presentation?: 'classic' | 'three';
    isCurrentPlayer?: boolean;
    onOpenCityManagement?: () => void;
} = {}) {
    const player = createTestPlayer({
        id: PLAYER_ID,
        name: 'Kimble',
        color: PLAYER_COLOR,
        ...options.player,
    });

    const gameState = createTestGameState({
        players: [player],
        currentTurn: PLAYER_ID,
        gameMode: options.gameMode ?? 'cities_and_knights',
        board: createTestBoard(),
        ...options.state,
    });

    render(
        <CompactPlayerCard
            player={player}
            gameState={gameState}
            isCurrentPlayer={options.isCurrentPlayer ?? true}
            isTurn={options.isTurn ?? true}
            timer={options.timer ?? null}
            presentation={options.presentation}
            onOpenCityManagement={options.onOpenCityManagement}
        />
    );

    return screen.getByTestId(`player-card-${PLAYER_ID}`);
}

/** The number rendered next to a chip's icon. */
function chipValue(testId: string): string {
    return screen.getByTestId(testId).textContent ?? '';
}

describe('CompactPlayerCard', () => {
    describe('identity', () => {
        it('carries the player color as a surface wash rather than only a dot', () => {
            const card = renderCard();

            expect(card).toHaveStyle({
                background: `color-mix(in oklab, ${PLAYER_COLOR} 18%, var(--ui-panel-raised))`,
            });
            // The spine is the same color, painted as its own element.
            const spine = card.querySelector('span[aria-hidden="true"]');
            expect(spine).toHaveStyle({ backgroundColor: PLAYER_COLOR });
        });

        it('uses a dimmer wash and drops the accent ring when it is not the turn', () => {
            const card = renderCard({ isTurn: false });

            expect(card).toHaveStyle({
                background: `color-mix(in oklab, ${PLAYER_COLOR} 9%, var(--ui-panel-solid))`,
            });
            expect(card.className).not.toContain('ring-[var(--ui-accent)]');
        });

        it('renders public victory points as a labelled token', () => {
            renderCard({
                player: { settlementsRemaining: 3, citiesRemaining: 3 },
            });

            // 2 settlements (2 VP) + 1 city (2 VP) = 4
            expect(screen.getByLabelText('4 victory points')).toBeInTheDocument();
        });
    });

    describe('hand-size chips', () => {
        it('shows one combined hand count in Cities & Knights', () => {
            renderCard({
                player: {
                    resources: { wood: 3, brick: 1, sheep: 0, wheat: 0, ore: 0 },
                    commodities: { paper: 2, cloth: 1, coin: 0 },
                },
            });

            expect(chipValue('chip-hand')).toBe('7');
            expect(screen.queryByTestId('chip-resources')).not.toBeInTheDocument();
            expect(screen.queryByTestId('chip-commodities')).not.toBeInTheDocument();
        });

        it('uses the same combined hand count in the base game', () => {
            renderCard({ gameMode: 'base' });

            expect(screen.getByTestId('chip-hand')).toBeInTheDocument();
            expect(screen.queryByTestId('chip-commodities')).not.toBeInTheDocument();
        });

        it('flags a hand over the discard limit on the resource chip', () => {
            renderCard({
                player: {
                    resources: { wood: 5, brick: 3, sheep: 0, wheat: 0, ore: 0 },
                    commodities: { paper: 0, cloth: 0, coin: 0 },
                },
            });

            // 8 cards against the wall-less safe limit of 7.
            expect(screen.getByTestId('chip-hand')).toHaveAttribute('data-danger', 'true');
        });

        it('does not flag a hand raised above 7 by city walls', () => {
            const board = createTestBoard({
                vertices: [
                    { id: '0,0,0', owner: PLAYER_ID, structure: 'city', hasCityWall: true },
                ],
            });

            renderCard({
                player: {
                    resources: { wood: 5, brick: 3, sheep: 0, wheat: 0, ore: 0 },
                },
                state: { board },
            });

            // Safe limit is 7 + 2 = 9, so 8 cards is fine.
            expect(screen.getByTestId('chip-hand')).toHaveAttribute('data-danger', 'false');
        });

        it('dims a chip that is at zero', () => {
            renderCard();

            expect(screen.getByTestId('chip-hand').className).toContain('opacity-40');
        });

        it('counts progress cards on the deck chip in C&K', () => {
            renderCard({ player: { progressCards: ['alchemist', 'crane'] } });

            expect(chipValue('chip-deck')).toBe('2');
        });

        it('counts development cards on the deck chip in the base game', () => {
            renderCard({
                gameMode: 'base',
                player: {
                    devCards: { knight: 2, victory_point: 0, road_building: 1, year_of_plenty: 0, monopoly: 0 },
                },
            });

            expect(chipValue('chip-deck')).toBe('3');
        });
    });

    describe('improvement tracks', () => {
        it('labels each track for assistive tech in C&K', () => {
            renderCard();

            expect(screen.getByLabelText('science improvements')).toBeInTheDocument();
            expect(screen.getByLabelText('trade improvements')).toBeInTheDocument();
            expect(screen.getByLabelText('politics improvements')).toBeInTheDocument();
        });

        it('omits the tracks entirely in the base game', () => {
            renderCard({ gameMode: 'base' });

            expect(screen.queryByLabelText('science improvements')).not.toBeInTheDocument();
        });

        it('replaces the dot at the earned level with the metropolis piece', () => {
            renderCard({
                player: {
                    improvements: { science: 4, trade: 0, politics: 0 },
                    metropolisOwned: ['science'],
                },
            });

            const track = screen.getByLabelText('science improvements');
            expect(within(track).getByRole('img', { name: 'Metropolis' })).toBeInTheDocument();
        });
    });

    describe('trophies', () => {
        it('renders no award badges when the player holds nothing', () => {
            renderCard();

            expect(screen.queryByTestId('award-defender')).not.toBeInTheDocument();
            expect(screen.queryByTestId('award-merchant')).not.toBeInTheDocument();
            expect(screen.queryByTestId('award-largest-army')).not.toBeInTheDocument();
        });

        it('shows the Defender badge with its token count', () => {
            renderCard({ player: { defenderVPTokens: 2 } });

            expect(screen.getByTestId('award-defender')).toHaveTextContent('2');
        });

        it('does not reuse the knight-strength shield for the Defender badge', () => {
            renderCard({ player: { defenderVPTokens: 1, activeKnightCount: 3 } });

            // The shield means one thing on this card: active knight strength.
            // The trophy is crossed swords, so the two never read as the same stat.
            const badge = screen.getByTestId('award-defender');
            expect(within(badge).getByRole('img', { name: 'Defender of Catan' })).toBeInTheDocument();
        });

        it('shows the Merchant badge only to its holder, drawn as the board piece', () => {
            renderCard({ state: { activeMerchant: PLAYER_ID } });

            const badge = screen.getByTestId('award-merchant');
            // The piece, not the trade-improvement scales — those mean the track.
            expect(within(badge).getByRole('img', { name: 'Merchant' })).toBeInTheDocument();
        });

        it('shows Largest Army in the base game only', () => {
            renderCard({ gameMode: 'base', state: { largestArmyOwner: PLAYER_ID } });

            expect(screen.getByTestId('award-largest-army')).toBeInTheDocument();
        });
    });

    describe('turn clock', () => {
        it('renders nothing when no timer is supplied', () => {
            renderCard({ timer: null });

            expect(screen.queryByTestId('turn-timer-bar')).not.toBeInTheDocument();
        });

        it('renders the supplied progress and urgency tint', () => {
            renderCard({ timer: { percentage: 64, colorClass: 'bg-orange-500' } });

            const bar = screen.getByTestId('turn-timer-bar');
            expect(bar).toHaveStyle({ width: '64%' });
            expect(bar.className).toContain('bg-orange-500');
        });
    });
});

describe('3D player-card presentation', () => {
    const showModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    beforeAll(() => {
        // jsdom has no native top layer. Browser QA covers its focus containment;
        // these shims let the test verify our open, close, and focus restoration.
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
        Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } });
    });
    afterAll(() => {
        if (showModalDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
        if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    });

    it('uses miniature ownership paint and public points even when a private total differs', () => {
        const card = renderCard({ presentation: 'three', gameMode: 'base', player: {
            victoryPoints: 99, settlementsRemaining: 3, citiesRemaining: 3,
            devCards: { knight: 0, victory_point: 3, road_building: 0, year_of_plenty: 0, monopoly: 0 },
        } });
        expect(card).toHaveAttribute('data-presentation', 'three');
        expect(card.querySelector('span[aria-hidden="true"]')).toHaveStyle({ backgroundColor: playerPieceColor(PLAYER_COLOR) });
        expect(within(card).getByLabelText('4 victory points')).toBeInTheDocument();
        expect(within(card).queryByText('99')).not.toBeInTheDocument();
    });

    it('shows the wall-adjusted hand limit and a textual over-limit cue with combined commodities', () => {
        const board = createTestBoard({ vertices: [{ id: 'city', owner: PLAYER_ID, structure: 'city', hasCityWall: true }] });
        renderCard({ presentation: 'three', state: { board }, player: {
            resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 }, commodities: { paper: 2, cloth: 0, coin: 0 },
        } });
        const hand = screen.getByTestId('chip-hand');
        expect(hand).toHaveAttribute('data-danger', 'true');
        expect(hand).toHaveTextContent('Over limit');
        expect(hand).toHaveTextContent('10/9');
        expect(hand).toHaveAccessibleName('Hand: 10 cards, safe limit 9, over discard limit');
    });

    it('keeps C&K strength, improvement levels, metropolis and held honors visible without opponent action buttons', () => {
        renderCard({ presentation: 'three', isCurrentPlayer: false, onOpenCityManagement: vi.fn(), player: {
            activeKnightCount: 3, progressCards: ['alchemist', 'crane'], defenderVPTokens: 2,
            improvements: { science: 4, trade: 1, politics: 2 }, metropolisOwned: ['science'],
        }, state: { activeMerchant: PLAYER_ID } });
        expect(screen.getByTestId('chip-military')).toHaveAccessibleName('Defense: 3');
        expect(screen.getByTestId('chip-deck')).toHaveAccessibleName('Progress: 2');
        expect(screen.getByRole('img', { name: 'science level 4 of 5, Metropolis' })).toBeInTheDocument();
        expect(screen.getByTestId('award-defender')).toHaveTextContent('2');
        expect(screen.getByTestId('award-merchant')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Manage cities/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /improvements/ })).not.toBeInTheDocument();
        expect(screen.getByText('Active turn')).toBeInTheDocument();
        expect(screen.queryByText('Your turn')).not.toBeInTheDocument();
    });

    it('keeps local city management as its own action', async () => {
        const openManagement = vi.fn();
        renderCard({ presentation: 'three', onOpenCityManagement: openManagement });
        await userEvent.click(screen.getByRole('button', { name: 'Manage cities for Kimble' }));
        expect(openManagement).toHaveBeenCalledOnce();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('uses base-game army and development-card counts and omits C&K tracks', () => {
        renderCard({ presentation: 'three', gameMode: 'base', onOpenCityManagement: vi.fn(), player: {
            knightsPlayed: 2, activeKnightCount: 7, devCardsBoughtThisTurn: ['knight'],
            devCards: { knight: 1, victory_point: 1, road_building: 0, year_of_plenty: 0, monopoly: 0 },
        } });
        expect(screen.getByTestId('chip-military')).toHaveAccessibleName('Army: 2');
        expect(screen.getByTestId('chip-deck')).toHaveAccessibleName('Dev cards: 3');
        expect(screen.queryByLabelText('City improvements')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Manage cities/ })).not.toBeInTheDocument();
    });

    it('shows a numeric active-turn timer and avoids a duplicate You marker', () => {
        const card = renderCard({ presentation: 'three', player: { name: 'You' }, timer: { percentage: 42, colorClass: 'bg-orange-500', remainingLabel: '1:24 · Paused' } });
        expect(within(card).getAllByText('You')).toHaveLength(1);
        expect(screen.getByTestId('turn-timer-label')).toHaveTextContent('1:24 · Paused');
        expect(screen.getByTestId('turn-timer-bar')).toHaveStyle({ width: '42%' });
    });

    it('opens public details from the keyboard, closes on Escape, and restores the trigger focus', async () => {
        renderCard({ presentation: 'three', isCurrentPlayer: false, player: { progressCards: ['alchemist', 'crane'] } });
        const user = userEvent.setup();
        const trigger = screen.getByRole('button', { name: 'Details for Kimble' });
        trigger.focus();
        await user.keyboard('{Enter}');
        const dialog = screen.getByRole('dialog', { name: 'Kimble' });
        expect(within(dialog).getByText('Progress cards: 2')).toBeInTheDocument();
        expect(within(dialog).queryByText(/alchemist|crane/i)).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Close player details' })).toHaveFocus();
        fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('also opens and closes details with explicit pointer actions', async () => {
        renderCard({ presentation: 'three' });
        const trigger = screen.getByRole('button', { name: 'Details for Kimble' });
        await userEvent.click(trigger);
        await userEvent.click(screen.getByRole('button', { name: 'Close player details' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });
});
