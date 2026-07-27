import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import type { TradeController } from '@/lib/controllers/trade-controller';
import { TradeOfferDisplay } from '../TradeOfferDisplay';
import { TradeCompletedNotification } from '../../overlays/TradeCompletedNotification';

/**
 * One deal, three surfaces: composer, recipient popup, completion receipt. Before
 * `CardTally` each hand-rolled its own chip layout, so the same trade could read
 * differently depending on which side of it you were standing. These tests compare
 * the rendered strings against each other rather than against a literal, so the
 * claim being made is the consistency itself.
 */

const GIVE_RESOURCES = { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 1 };
const GIVE_COMMODITIES = { paper: 1, cloth: 0, coin: 0 };
const GET_RESOURCES = { wood: 0, brick: 0, sheep: 0, wheat: 3, ore: 0 };
const GET_COMMODITIES = { paper: 0, cloth: 0, coin: 0 };

const controller: TradeController = {
    handleBankTrade: vi.fn(),
    handleOfferTrade: vi.fn(),
    handleAcceptTrade: vi.fn(),
    handleRejectTrade: vi.fn(),
    handleCancelTrade: vi.fn(),
};

/** The tally rendered under a panel heading, e.g. `2Wood+1Ore`. */
const tallyUnder = (heading: string) =>
    screen.getByText(heading).parentElement!.lastElementChild!.textContent!;

function renderOffer(playerId: string, players = [
    createTestPlayer({ id: 'initiator', name: 'Initiator' }),
    createTestPlayer({
        id: 'responder',
        name: 'Responder',
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 5, ore: 0 },
    }),
]) {
    render(
        <TradeOfferDisplay
            gameState={createTestGameState({
                players,
                tradeOffer: {
                    id: 'offer-1',
                    initiator: 'initiator',
                    give: GIVE_RESOURCES,
                    get: GET_RESOURCES,
                    giveCommodities: GIVE_COMMODITIES,
                    getCommodities: GET_COMMODITIES,
                    status: 'open',
                },
            })}
            playerId={playerId}
            tradeController={controller}
        />
    );
}

function renderReceipt(wasInitiator: boolean) {
    const mine = wasInitiator
        ? { resources: GIVE_RESOURCES, commodities: GIVE_COMMODITIES }
        : { resources: GET_RESOURCES, commodities: GET_COMMODITIES };
    const theirs = wasInitiator
        ? { resources: GET_RESOURCES, commodities: GET_COMMODITIES }
        : { resources: GIVE_RESOURCES, commodities: GIVE_COMMODITIES };

    render(
        <TradeCompletedNotification
            isOpen
            wasInitiator={wasInitiator}
            partnerName="Partner"
            gave={mine}
            received={theirs}
            onDismiss={vi.fn()}
        />
    );
}

describe('one deal, described the same way everywhere', () => {
    it('writes the offered cards the same on the popup and the receipt', () => {
        renderOffer('responder');
        const offeredToRecipient = tallyUnder('They Give');
        const wantedFromRecipient = tallyUnder('They Want');
        screen.getByRole('button', { name: 'Accept Trade' });

        // Same panel text, rendered by a different component on a different surface.
        renderReceipt(true);
        expect(tallyUnder('You Gave')).toBe(offeredToRecipient);
        expect(tallyUnder('You Received')).toBe(wantedFromRecipient);
    });

    it('mirrors cleanly for the player on the other side of the deal', () => {
        renderOffer('responder');
        const theyGive = tallyUnder('They Give');
        const theyWant = tallyUnder('They Want');

        renderReceipt(false);
        expect(tallyUnder('You Received')).toBe(theyGive);
        expect(tallyUnder('You Gave')).toBe(theyWant);
    });

    it('lists every card in the deal, resources and commodities together', () => {
        renderOffer('responder');

        expect(tallyUnder('They Give')).toBe('2Wood+1Ore+1Paper');
        expect(tallyUnder('They Want')).toBe('3Wheat');
    });

    it('shows the initiator their own offer with a cancel action', () => {
        renderOffer('initiator', [createTestPlayer({ id: 'initiator', name: 'Initiator' })]);

        expect(tallyUnder('You Give')).toBe('2Wood+1Ore+1Paper');
        expect(tallyUnder('You Get')).toBe('3Wheat');
        expect(screen.getByRole('button', { name: 'Cancel Offer' })).toBeInTheDocument();
    });

    it('tells a recipient who cannot cover the request', () => {
        renderOffer('broke', [
            createTestPlayer({ id: 'initiator', name: 'Initiator' }),
            createTestPlayer({ id: 'broke', name: 'Broke' }),
        ]);

        expect(screen.getByRole('button', { name: 'Cannot Afford' })).toBeDisabled();
    });
});
