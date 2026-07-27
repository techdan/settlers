import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { TradeController } from '@/lib/controllers/trade-controller';
import { TradeModal } from '../TradeModal';

function createController(overrides: Partial<TradeController> = {}): TradeController {
    return {
        handleBankTrade: vi.fn().mockResolvedValue(undefined),
        handleOfferTrade: vi.fn().mockResolvedValue(undefined),
        handleAcceptTrade: vi.fn().mockResolvedValue(undefined),
        handleRejectTrade: vi.fn().mockResolvedValue(undefined),
        handleCancelTrade: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

const giveRow = () => screen.getByRole('group', { name: 'Item to give' });
const getRow = () => screen.getByRole('group', { name: 'Item to receive' });
const offerRow = () => screen.getByRole('group', { name: 'Items you offer' });
const requestRow = () => screen.getByRole('group', { name: 'Items you request' });

function renderModal(options: {
    resources?: Partial<Record<'wood' | 'brick' | 'sheep' | 'wheat' | 'ore', number>>;
    commodities?: Partial<Record<'paper' | 'cloth' | 'coin', number>>;
    improvements?: { science: number; trade: number; politics: number };
    gameMode?: 'base' | 'cities_and_knights';
    controller?: TradeController;
} = {}) {
    const player = createTestPlayer({
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, ...options.resources },
        commodities: { paper: 0, cloth: 0, coin: 0, ...options.commodities },
        improvements: options.improvements ?? { science: 0, trade: 0, politics: 0 },
    });
    const gameState = createTestGameState({
        players: [player],
        gameMode: options.gameMode ?? 'cities_and_knights',
    });
    const tradeController = options.controller ?? createController();
    const onClose = vi.fn();

    render(
        <TradeModal
            gameState={gameState}
            playerId={player.id}
            onClose={onClose}
            tradeController={tradeController}
        />
    );

    return { tradeController, onClose, player };
}

describe('TradeModal — bank', () => {
    it('shows every item face-up with its own rate instead of a dropdown', () => {
        renderModal({ resources: { wood: 5 } });

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(
            within(giveRow()).getByRole('button', { name: /Give Wood, you have 5, rate 4 to 1/ })
        ).toBeInTheDocument();
        expect(within(giveRow()).getAllByRole('button')).toHaveLength(8);
    });

    it('hides commodities outside Cities & Knights', () => {
        renderModal({ resources: { wood: 5 }, gameMode: 'base' });

        expect(within(giveRow()).getAllByRole('button')).toHaveLength(5);
        expect(within(giveRow()).queryByRole('button', { name: /Give Paper/ })).not.toBeInTheDocument();
    });

    it('prints the Trading House rate on commodities', () => {
        renderModal({ commodities: { cloth: 3 }, improvements: { science: 0, trade: 3, politics: 0 } });

        expect(
            within(giveRow()).getByRole('button', { name: /Give Cloth, you have 3, rate 2 to 1/ })
        ).toBeInTheDocument();
    });

    it('disables items the player cannot afford and says what is missing', () => {
        renderModal({ resources: { wood: 5, ore: 1 } });

        const ore = within(giveRow()).getByRole('button', { name: /Give Ore/ });
        expect(ore).toBeDisabled();
        expect(ore).toHaveAccessibleName(/need 4/);
        expect(within(giveRow()).getByRole('button', { name: /Give Wood/ })).toBeEnabled();
    });

    it('takes three clicks to trade and drops the give item from the receive row', async () => {
        const user = userEvent.setup();
        const { tradeController } = renderModal({ resources: { wood: 5 } });

        const trade = screen.getByRole('button', { name: 'Trade' });
        expect(trade).toBeDisabled();

        await user.click(within(giveRow()).getByRole('button', { name: /Give Wood/ }));
        expect(within(getRow()).queryByRole('button', { name: /Receive Wood/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Giving 4 Wood/)).toBeInTheDocument();

        await user.click(within(getRow()).getByRole('button', { name: /Receive Ore/ }));
        const confirm = screen.getByRole('button', { name: 'Trade 4 Wood → 1 Ore' });
        expect(confirm).toBeEnabled();

        await user.click(confirm);
        expect(tradeController.handleBankTrade).toHaveBeenCalledWith('wood', 'ore');
    });

    it('reports a completed trade inline rather than blocking on an OK button', async () => {
        const user = userEvent.setup();
        renderModal({ resources: { wood: 5 } });

        await user.click(within(giveRow()).getByRole('button', { name: /Give Wood/ }));
        await user.click(within(getRow()).getByRole('button', { name: /Receive Brick/ }));
        await user.click(screen.getByRole('button', { name: 'Trade 4 Wood → 1 Brick' }));

        expect(await screen.findByText('Traded 4 Wood → 1 Brick')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
        expect(screen.queryByText('Trade Complete!')).not.toBeInTheDocument();
    });

    it('surfaces a failed bank trade without clearing the selection', async () => {
        const user = userEvent.setup();
        renderModal({
            resources: { wood: 5 },
            controller: createController({
                handleBankTrade: vi.fn().mockRejectedValue(new Error('Not your turn')),
            }),
        });

        await user.click(within(giveRow()).getByRole('button', { name: /Give Wood/ }));
        await user.click(within(getRow()).getByRole('button', { name: /Receive Ore/ }));
        await user.click(screen.getByRole('button', { name: 'Trade 4 Wood → 1 Ore' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Not your turn');
        // The selection survives the failure, so the player can retry or adjust.
        expect(await screen.findByRole('button', { name: 'Trade 4 Wood → 1 Ore' })).toBeEnabled();
    });
});

describe('TradeModal — players', () => {
    const openPlayersTab = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'Players' }));
    };

    it('only offers items the player actually holds', async () => {
        const user = userEvent.setup();
        renderModal({ resources: { wood: 2, brick: 1 }, commodities: { paper: 1 } });
        await openPlayersTab(user);

        expect(within(offerRow()).getAllByRole('button')).toHaveLength(3);
        expect(within(requestRow()).getAllByRole('button')).toHaveLength(8);
    });

    it('builds the deal one click at a time and lets it be undone', async () => {
        const user = userEvent.setup();
        renderModal({ resources: { wood: 3 } });
        await openPlayersTab(user);

        const wood = within(offerRow()).getByRole('button', { name: /Offer one more Wood/ });
        await user.click(wood);
        await user.click(within(offerRow()).getByRole('button', { name: /Offer one more Wood/ }));

        expect(
            within(offerRow()).getByRole('button', { name: 'Offer one more Wood, offering 2 of 3' })
        ).toBeInTheDocument();

        await user.click(within(offerRow()).getByRole('button', { name: 'Offer one fewer Wood' }));
        expect(
            within(offerRow()).getByRole('button', { name: 'Offer one more Wood, offering 1 of 3' })
        ).toBeInTheDocument();
    });

    it('cannot stage more of an item than the player holds', async () => {
        const user = userEvent.setup();
        renderModal({ resources: { brick: 1 } });
        await openPlayersTab(user);

        await user.click(within(offerRow()).getByRole('button', { name: /Offer one more Brick/ }));
        expect(within(offerRow()).getByRole('button', { name: /Offer one more Brick/ })).toBeDisabled();
    });

    it('sends resources and commodities on the correct sides of the offer', async () => {
        const user = userEvent.setup();
        const { tradeController, onClose } = renderModal({
            resources: { wood: 2 },
            commodities: { paper: 1 },
        });
        await openPlayersTab(user);

        expect(screen.getByRole('button', { name: /Offer Trade/ })).toBeDisabled();

        await user.click(within(offerRow()).getByRole('button', { name: /Offer one more Wood/ }));
        await user.click(within(offerRow()).getByRole('button', { name: /Offer one more Paper/ }));
        await user.click(within(requestRow()).getByRole('button', { name: /Request one more Ore/ }));
        await user.click(within(requestRow()).getByRole('button', { name: /Request one more Coin/ }));

        await user.click(screen.getByRole('button', { name: /Offer Trade/ }));

        expect(tradeController.handleOfferTrade).toHaveBeenCalledWith(
            { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 1 },
            { paper: 1, cloth: 0, coin: 0 },
            { paper: 0, cloth: 0, coin: 1 }
        );
        expect(onClose).toHaveBeenCalled();
    });

    it('clears a composed offer', async () => {
        const user = userEvent.setup();
        renderModal({ resources: { wheat: 2 } });
        await openPlayersTab(user);

        expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

        await user.click(within(offerRow()).getByRole('button', { name: /Offer one more Wheat/ }));
        await user.click(screen.getByRole('button', { name: 'Clear' }));

        expect(
            within(offerRow()).getByRole('button', { name: 'Offer one more Wheat, offering 0 of 2' })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Offer Trade/ })).toBeDisabled();
    });
});
