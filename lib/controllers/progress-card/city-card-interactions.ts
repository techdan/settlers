import { MEDICINE_COST } from '@/core/rules/commodity-constants';
import { getEligibleCityWallVertices } from '@/core/utils/city-wall-utils';
import type {
    ProgressCardControllerDeps,
    PlayProgressCard,
    ProgressCardInteractionHandlers,
} from './types';
import { controllerErrorMessage } from './types';

type CityFlowDeps = Pick<
    ProgressCardControllerDeps,
    | 'gameState'
    | 'playerId'
    | 'selectionManager'
    | 'engineeringPrompt'
    | 'medicinePrompt'
    | 'getOptimisticState'
    | 'clearSelectedCard'
    | 'isActiveTurn'
>;

export function createCityCardInteractions(
    deps: CityFlowDeps,
    playCard: PlayProgressCard
): ProgressCardInteractionHandlers {
    const {
        gameState,
        playerId,
        selectionManager,
        engineeringPrompt,
        medicinePrompt,
        getOptimisticState,
        clearSelectedCard,
        isActiveTurn,
    } = deps;

    return {
        engineer: {
            start: () => {
                if (!gameState || !isActiveTurn) return;
                const effectiveState = getOptimisticState(gameState);
                const eligible = getEligibleCityWallVertices(
                    effectiveState,
                    playerId,
                    { ignoreCost: true }
                );
                if (eligible.length === 0) return;
                if (selectionManager.selectingCityForEngineer) {
                    selectionManager.clearAllSelections();
                    return;
                }
                selectionManager.clearAllSelections();
                selectionManager.setSelectedEngineerCityId(null);
                engineeringPrompt.begin(
                    'Select a city without a wall for Engineering'
                );
                selectionManager.setSelectingCityForEngineer(true);
            },
            onBoardSelect: vertexId => {
                if (selectionManager.isEngineerSubmitting) return;
                if (selectionManager.selectedEngineerCityId === vertexId) {
                    selectionManager.setSelectedEngineerCityId(null);
                    engineeringPrompt.setStatus(
                        'Select a city without a wall for Engineering'
                    );
                    return;
                }
                selectionManager.setSelectedEngineerCityId(vertexId);
                engineeringPrompt.setStatus(
                    'City selected. Click Build to confirm.'
                );
            },
            onConfirm: async () => {
                const vertexId = selectionManager.selectedEngineerCityId;
                if (!vertexId) return;
                selectionManager.setIsEngineerSubmitting(true);
                engineeringPrompt.setStatus('Building city wall...');
                try {
                    await playCard('engineer', { vertexId });
                    selectionManager.setSelectingCityForEngineer(false);
                    selectionManager.setSelectedEngineerCityId(null);
                    engineeringPrompt.clear();
                    clearSelectedCard();
                } catch (error: unknown) {
                    const message = controllerErrorMessage(
                        error,
                        'Failed to build city wall with Engineering'
                    );
                    engineeringPrompt.setStatus(message);
                    console.error(
                        'Failed to build city wall with Engineering',
                        error
                    );
                } finally {
                    selectionManager.setIsEngineerSubmitting(false);
                }
            },
        },
        medicine: {
            start: () => {
                if (!gameState) return;
                const effectiveState = getOptimisticState(gameState);
                const player = effectiveState.players.find(
                    candidate => candidate.id === playerId
                );
                const hasResources =
                    Boolean(player) &&
                    (player?.resources.ore ?? 0) >= MEDICINE_COST.ore &&
                    (player?.resources.wheat ?? 0) >= MEDICINE_COST.wheat;
                const hasCityToken = (player?.citiesRemaining ?? 0) > 0;
                const hasSettlement = Object.values(
                    gameState.board.vertices
                ).some(
                    vertex =>
                        vertex.owner === playerId &&
                        vertex.structure === 'settlement'
                );
                if (!hasResources || !hasCityToken || !hasSettlement) return;
                if (selectionManager.selectingCityForMedicine) {
                    selectionManager.clearAllSelections();
                    return;
                }
                selectionManager.clearAllSelections();
                selectionManager.setSelectedMedicineCityId(null);
                medicinePrompt.begin(
                    'Select a settlement to upgrade to a city.'
                );
                selectionManager.setSelectingCityForMedicine(true);
            },
            onBoardSelect: vertexId => {
                if (selectionManager.isSubmittingMedicine) return;
                if (selectionManager.selectedMedicineCityId === vertexId) {
                    selectionManager.setSelectedMedicineCityId(null);
                    medicinePrompt.setStatus(
                        'Select a settlement to upgrade to a city.'
                    );
                    return;
                }
                selectionManager.setSelectedMedicineCityId(vertexId);
                medicinePrompt.setStatus(
                    'Settlement selected. Click Upgrade to confirm.'
                );
            },
            onConfirm: async () => {
                const vertexId = selectionManager.selectedMedicineCityId;
                if (!vertexId) return;
                selectionManager.setIsSubmittingMedicine(true);
                medicinePrompt.setStatus(
                    'Upgrading settlement to city...'
                );
                try {
                    await playCard('medicine', { vertexId });
                    selectionManager.setSelectingCityForMedicine(false);
                    selectionManager.setSelectedMedicineCityId(null);
                    medicinePrompt.clear();
                    clearSelectedCard();
                } catch (error: unknown) {
                    const message = controllerErrorMessage(
                        error,
                        'Failed to upgrade settlement with Medicine'
                    );
                    medicinePrompt.setStatus(message);
                    console.error(
                        'Failed to upgrade settlement with Medicine',
                        error
                    );
                } finally {
                    selectionManager.setIsSubmittingMedicine(false);
                }
            },
        },
    };
}
