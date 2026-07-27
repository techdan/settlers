import {
    cancelTreason,
    placeTreasonKnight,
    selectTreasonKnight,
} from '@/app/actions';
import type {
    ProgressCardControllerDeps,
    PlayProgressCard,
    CardInteractionHandlers,
} from './types';
import { controllerErrorMessage } from './types';

type TreasonFlowDeps = Pick<
    ProgressCardControllerDeps,
    | 'roomId'
    | 'playerId'
    | 'gameState'
    | 'selectionManager'
    | 'isTreasonTarget'
    | 'resetTreasonLocalState'
>;

export function createTreasonCardInteraction(
    deps: TreasonFlowDeps,
    playCard: PlayProgressCard
): {
    interaction: CardInteractionHandlers;
    confirmOpponent: () => Promise<void>;
    confirmKnightRemoval: () => Promise<void>;
    confirmPlacement: () => Promise<void>;
    cancelPlacement: () => Promise<void>;
} {
    const {
        roomId,
        playerId,
        gameState,
        selectionManager,
        isTreasonTarget,
        resetTreasonLocalState,
    } = deps;

    const confirmOpponent = async () => {
        const opponentId = selectionManager.treasonSelectedOpponentId;
        if (!opponentId) {
            selectionManager.setTreasonError(
                'Select an opponent with at least one knight.'
            );
            return;
        }
        selectionManager.setIsSubmittingTreason(true);
        selectionManager.setTreasonError(null);
        try {
            await playCard('treason', { opponentId });
            selectionManager.setTreasonMode('waiting_for_knight');
        } catch (error: unknown) {
            selectionManager.setTreasonError(
                controllerErrorMessage(error, 'Failed to start Treason')
            );
        } finally {
            selectionManager.setIsSubmittingTreason(false);
        }
    };

    const confirmKnightRemoval = async () => {
        const knightId = selectionManager.treasonSelectedKnightId;
        if (!knightId) {
            selectionManager.setTreasonError('Select a knight to remove.');
            return;
        }
        selectionManager.setIsSubmittingTreason(true);
        selectionManager.setTreasonError(null);
        try {
            await selectTreasonKnight(roomId, playerId, knightId);
            if (isTreasonTarget) {
                resetTreasonLocalState();
                if (
                    selectionManager.selectingVertexForCard ===
                    'treason_remove'
                ) {
                    selectionManager.setSelectingVertexForCard(null);
                }
            }
        } catch (error: unknown) {
            selectionManager.setTreasonError(
                controllerErrorMessage(error, 'Failed to remove knight')
            );
        } finally {
            selectionManager.setIsSubmittingTreason(false);
        }
    };

    const confirmPlacement = async () => {
        selectionManager.setIsSubmittingTreason(true);
        selectionManager.setTreasonError(null);
        try {
            await placeTreasonKnight(
                roomId,
                playerId,
                selectionManager.treasonSelectedPlacementVertexId ?? null
            );
            resetTreasonLocalState();
            if (
                selectionManager.selectingVertexForCard === 'treason_place'
            ) {
                selectionManager.setSelectingVertexForCard(null);
            }
        } catch (error: unknown) {
            selectionManager.setTreasonError(
                controllerErrorMessage(error, 'Failed to place knight')
            );
        } finally {
            selectionManager.setIsSubmittingTreason(false);
        }
    };

    const cancelPlacement = async () => {
        if (selectionManager.treasonMode !== 'place_knight') {
            selectionManager.clearAllSelections();
            return;
        }
        selectionManager.setIsSubmittingTreason(true);
        selectionManager.setTreasonError(null);
        try {
            await cancelTreason(roomId, playerId);
            selectionManager.clearAllSelections();
        } catch (error: unknown) {
            selectionManager.setTreasonError(
                controllerErrorMessage(error, 'Failed to cancel Treason')
            );
        } finally {
            selectionManager.setIsSubmittingTreason(false);
        }
    };

    const interaction: CardInteractionHandlers = {
        start: () => {
            selectionManager.setIsTreasonModalOpen(true);
            selectionManager.setTreasonMode('select_opponent');
            selectionManager.setTreasonSelectedOpponentId(null);
            selectionManager.setTreasonSelectedKnightId(null);
            selectionManager.setTreasonSelectedPlacementVertexId(null);
            selectionManager.setTreasonError(null);
        },
        onBoardSelect: vertexId => {
            if (selectionManager.selectingVertexForCard === 'treason_remove') {
                const knight = gameState?.players
                    .flatMap(player => player.knights ?? [])
                    .find(candidate => candidate.vertexId === vertexId);
                if (!knight || knight.playerId !== playerId) {
                    selectionManager.setTreasonError(
                        'Select one of your knights to remove.'
                    );
                    selectionManager.setTreasonSelectedKnightId(null);
                    return;
                }
                selectionManager.setTreasonError(null);
                selectionManager.setTreasonSelectedKnightId(
                    selectionManager.treasonSelectedKnightId === knight.id
                        ? null
                        : knight.id
                );
                return;
            }
            if (selectionManager.selectingVertexForCard === 'treason_place') {
                selectionManager.setTreasonError(null);
                selectionManager.setTreasonSelectedPlacementVertexId(
                    selectionManager.treasonSelectedPlacementVertexId ===
                        vertexId
                        ? null
                        : vertexId
                );
            }
        },
        onConfirm: () => {
            switch (selectionManager.treasonMode) {
                case 'select_opponent':
                    return confirmOpponent();
                case 'select_knight':
                    return confirmKnightRemoval();
                case 'place_knight':
                    return confirmPlacement();
                default:
                    return Promise.resolve();
            }
        },
        onCancel: cancelPlacement,
    };

    return {
        interaction,
        confirmOpponent,
        confirmKnightRemoval,
        confirmPlacement,
        cancelPlacement,
    };
}
