import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameTray } from '../GameTray';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';

/**
 * Alchemy is playable only in `waiting_for_roll` — the same phase where the Roll
 * button is live — and playing it *is* the roll. Its panel is board-visible, so
 * there is no scrim to absorb a stray Roll click; the tray has to gate itself.
 */
describe('GameTray roll guard', () => {
    const renderTray = () => {
        const player = createTestPlayer({ id: 'p1', name: 'Pa', progressCards: ['alchemist'] });
        const gameState = createTestGameState({
            players: [player],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
        });

        return render(
            <GameTray
                gameState={gameState}
                playerId="p1"
                isCitiesAndKnights
                currentPlayer={player}
                selectionManager={{ buildMode: null, setBuildMode: vi.fn(), selectingKnightsForSmith: false, selectingCityForMedicine: false }}
                promptBlocksUI={false}
                engineerSelectionActive={false}
                isActiveTurn
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

    it('gates the dice/actions slot while a card panel is open, and restores it on cancel', async () => {
        const user = userEvent.setup();
        const { container } = renderTray();

        const actionsSlot = () => container.querySelector('[data-tray-slot="actions"]')!;
        expect(actionsSlot().className).toContain('pointer-events-auto');

        // Open Alchemy from the hand.
        const card = screen.getAllByRole('button', { name: /Alchemy/i })[0];
        await user.click(card);
        expect(screen.getByRole('dialog', { name: 'Alchemy' })).toBeInTheDocument();
        expect(actionsSlot().className).toContain('pointer-events-none');

        // Clicking the card again cancels — the card slot is never gated, so this
        // escape hatch always works.
        await user.click(card);
        expect(screen.queryByRole('dialog', { name: 'Alchemy' })).not.toBeInTheDocument();
        expect(actionsSlot().className).toContain('pointer-events-auto');
    });
});
