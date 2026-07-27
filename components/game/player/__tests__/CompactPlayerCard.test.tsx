import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { CompactPlayerCard } from '../CompactPlayerCard';

const PLAYER_ID = 'player-1';
const PLAYER_COLOR = '#ff7a00';

function renderCard(options: {
    gameMode?: 'base' | 'cities_and_knights';
    player?: Parameters<typeof createTestPlayer>[0];
    state?: Parameters<typeof createTestGameState>[0];
    isTurn?: boolean;
    timer?: { percentage: number; colorClass: string } | null;
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
            isCurrentPlayer
            isTurn={options.isTurn ?? true}
            timer={options.timer ?? null}
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
        it('splits resources and commodities in Cities & Knights', () => {
            renderCard({
                player: {
                    resources: { wood: 3, brick: 1, sheep: 0, wheat: 0, ore: 0 },
                    commodities: { paper: 2, cloth: 1, coin: 0 },
                },
            });

            expect(chipValue('chip-resources')).toBe('4');
            expect(chipValue('chip-commodities')).toBe('3');
        });

        it('omits the commodity chip in the base game', () => {
            renderCard({ gameMode: 'base' });

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
            expect(screen.getByTestId('chip-resources')).toHaveAttribute('data-danger', 'true');
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
            expect(screen.getByTestId('chip-resources')).toHaveAttribute('data-danger', 'false');
        });

        it('dims a chip that is at zero', () => {
            renderCard();

            expect(screen.getByTestId('chip-resources').className).toContain('opacity-40');
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
