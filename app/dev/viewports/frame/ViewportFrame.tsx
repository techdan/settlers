'use client';

import React from 'react';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { DiscardModal } from '@/components/game/modals/DiscardModal';
import { TradeModal } from '@/components/game/trade/TradeModal';
import { ProgressCardInteractionModal } from '@/components/game/modals/ProgressCardInteractionModal';
import { buildResourceOptions } from '@/core/engine/progress/utilities/InteractionBuilder';
import { DevCardModal } from '@/components/game/modals/DevCardModal';
import type { TradeController } from '@/lib/controllers/trade-controller';

/**
 * The contents of one simulated viewport — rendered inside an iframe by
 * /dev/viewports so `dvh`, media queries, and flex wrapping all evaluate against
 * a real viewport of that width rather than a CSS-less jsdom tree.
 *
 * Deliberately a worst case: a hand holding all eight card types, which is the
 * widest a token row can ever get.
 */

const FULL_HAND = createTestPlayer({
    resources: { wood: 3, brick: 2, sheep: 2, wheat: 3, ore: 2 },
    commodities: { paper: 2, cloth: 2, coin: 2 },
    improvements: { science: 0, trade: 3, politics: 0 },
});

const noopController: TradeController = {
    handleBankTrade: async () => {},
    handleOfferTrade: async () => {},
    handleAcceptTrade: async () => {},
    handleRejectTrade: async () => {},
    handleCancelTrade: async () => {},
};

export const ViewportFrame: React.FC<{ surface: string }> = ({ surface }) => {
    if (surface === 'discard') {
        const gameState = createTestGameState({ players: [FULL_HAND], phase: 'discarding' });
        return <DiscardModal gameState={gameState} playerId={FULL_HAND.id} />;
    }

    if (surface === 'picker') {
        // Resource Monopoly: the single-pick radiogroup, in a width="md" modal.
        const gameState = createTestGameState({ players: [FULL_HAND] });
        return (
            <ProgressCardInteractionModal
                interaction={{
                    type: 'select_resource',
                    cardName: 'Resource Monopoly',
                    prompt: 'Choose a resource to steal from all opponents (up to 2 from each)',
                    options: buildResourceOptions(),
                    minSelections: 1,
                    maxSelections: 1,
                    allowCancel: true,
                }}
                gameState={gameState}
                currentPlayer={FULL_HAND}
                onSubmit={() => {}}
                onCancel={() => {}}
            />
        );
    }

    if (surface === 'yop') {
        // Year of Plenty: a tally row that must clear the 72px card face.
        return (
            <DevCardModal
                isOpen
                onClose={() => {}}
                cardType="year_of_plenty"
                currentPlayer={FULL_HAND}
                onPlay={async () => {}}
            />
        );
    }

    const gameState = createTestGameState({ players: [FULL_HAND] });
    return (
        <TradeModal
            gameState={gameState}
            playerId={FULL_HAND.id}
            onClose={() => {}}
            tradeController={noopController}
        />
    );
};
