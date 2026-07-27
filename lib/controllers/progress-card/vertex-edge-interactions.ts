import type {
    ProgressCardControllerDeps,
    PlayProgressCard,
    ProgressCardInteractionHandlers,
} from './types';
import { controllerErrorMessage } from './types';

type VertexEdgeDeps = Pick<
    ProgressCardControllerDeps,
    'gameState' | 'playerId' | 'selectionManager'
>;

export function createVertexEdgeInteractions(
    deps: VertexEdgeDeps,
    playCard: PlayProgressCard
): {
    interactions: ProgressCardInteractionHandlers;
    confirmDiplomatRemove: () => Promise<void>;
    confirmDiplomatRebuild: () => Promise<void>;
} {
    const { gameState, playerId, selectionManager } = deps;

    const confirmDiplomatRemove = async () => {
        const edgeId = selectionManager.diplomatSelectedEdgeId;
        if (!edgeId || selectionManager.diplomatStage !== 'remove') return;
        selectionManager.setIsSubmittingDiplomat(true);
        try {
            const owner = selectionManager.diplomatSelectedEdgeOwner;
            if (owner && owner !== playerId) {
                await playCard('diplomat', { edgeId });
                selectionManager.clearAllSelections();
                return;
            }
            if (owner === playerId) {
                selectionManager.setDiplomatStage('rebuild');
                selectionManager.setDiplomatRelocateEdgeId(null);
                selectionManager.setDiplomatError(null);
                return;
            }
            selectionManager.setDiplomatError(
                'Select an open road to remove.'
            );
        } catch (error: unknown) {
            selectionManager.setDiplomatError(
                controllerErrorMessage(error, 'Failed to resolve Diplomat')
            );
        } finally {
            selectionManager.setIsSubmittingDiplomat(false);
        }
    };

    const confirmDiplomatRebuild = async () => {
        const removedEdgeId = selectionManager.diplomatSelectedEdgeId;
        const newEdgeId = selectionManager.diplomatRelocateEdgeId;
        if (
            selectionManager.diplomatStage !== 'rebuild' ||
            !removedEdgeId ||
            !newEdgeId
        ) {
            return;
        }
        selectionManager.setIsSubmittingDiplomat(true);
        try {
            await playCard('diplomat', {
                edgeId: removedEdgeId,
                newEdgeId,
            });
            selectionManager.clearAllSelections();
        } catch (error: unknown) {
            selectionManager.setDiplomatError(
                controllerErrorMessage(
                    error,
                    'Failed to rebuild road with Diplomat'
                )
            );
        } finally {
            selectionManager.setIsSubmittingDiplomat(false);
        }
    };

    return {
        interactions: {
            intrigue: {
                start: () => {
                    if (
                        selectionManager.selectingVertexForCard === 'intrigue'
                    ) {
                        selectionManager.clearAllSelections();
                        return;
                    }
                    selectionManager.clearAllSelections();
                    selectionManager.setSelectingVertexForCard('intrigue');
                    selectionManager.setBuildMode(null);
                    selectionManager.setMovingKnightId(null);
                    selectionManager.setBuildingMetropolisType(null);
                },
                onBoardSelect: vertexId => {
                    const targetPlayer = gameState?.players.find(player =>
                        player.knights?.some(
                            knight => knight.vertexId === vertexId
                        )
                    );
                    const targetKnight = targetPlayer?.knights?.find(
                        knight => knight.vertexId === vertexId
                    );
                    if (
                        !targetPlayer ||
                        !targetKnight ||
                        targetPlayer.id === playerId
                    ) {
                        selectionManager.setIntrigueError(
                            'Select an opponent knight adjacent to your roads.'
                        );
                        selectionManager.setIntrigueTarget(null);
                        return;
                    }
                    selectionManager.setIntrigueError(null);
                    const current = selectionManager.intrigueTarget;
                    selectionManager.setIntrigueTarget(
                        current?.knightId === targetKnight.id
                            ? null
                            : {
                                  knightId: targetKnight.id,
                                  opponentId: targetPlayer.id,
                                  vertexId,
                              }
                    );
                },
                onConfirm: async () => {
                    const target = selectionManager.intrigueTarget;
                    if (!target) return;
                    selectionManager.setIsSubmittingIntrigue(true);
                    try {
                        await playCard('intrigue', {
                            opponentId: target.opponentId,
                            knightId: target.knightId,
                        });
                        selectionManager.clearAllSelections();
                    } catch (error: unknown) {
                        selectionManager.setIntrigueError(
                            controllerErrorMessage(
                                error,
                                'Failed to displace knight'
                            )
                        );
                    } finally {
                        selectionManager.setIsSubmittingIntrigue(false);
                    }
                },
            },
            diplomat: {
                start: () => {
                    if (
                        selectionManager.selectingEdgeForCard === 'diplomat'
                    ) {
                        selectionManager.clearAllSelections();
                        return;
                    }
                    selectionManager.clearAllSelections();
                    selectionManager.setSelectingEdgeForCard('diplomat');
                    selectionManager.setDiplomatStage('remove');
                    selectionManager.setBuildMode(null);
                    selectionManager.setMovingKnightId(null);
                    selectionManager.setBuildingMetropolisType(null);
                },
                onBoardSelect: edgeId => {
                    if (selectionManager.diplomatStage === 'rebuild') {
                        selectionManager.setDiplomatRelocateEdgeId(edgeId);
                    } else {
                        const edge = gameState?.board.edges[edgeId];
                        selectionManager.setDiplomatSelectedEdgeId(edgeId);
                        selectionManager.setDiplomatSelectedEdgeOwner(
                            edge?.owner ?? null
                        );
                    }
                    selectionManager.setDiplomatError(null);
                },
                onConfirm: () =>
                    selectionManager.diplomatStage === 'rebuild'
                        ? confirmDiplomatRebuild()
                        : confirmDiplomatRemove(),
            },
        },
        confirmDiplomatRemove,
        confirmDiplomatRebuild,
    };
}
