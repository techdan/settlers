import { getCanonicalVertexId } from '@/lib/hex';
import type { TerrainType, ResourceType } from '@/core/rules/board-constants';
import type {
    ProgressCardControllerDeps,
    PlayProgressCard,
    ProgressCardInteractionHandlers,
} from './types';
import { controllerErrorMessage } from './types';

type HexFlowDeps = Pick<
    ProgressCardControllerDeps,
    | 'gameState'
    | 'playerId'
    | 'selectionManager'
    | 'merchantPrompt'
    | 'inventorPrompt'
    | 'taxationPrompt'
>;

function resourceForTerrain(terrain: TerrainType): ResourceType | null {
    const resources: Partial<Record<TerrainType, ResourceType>> = {
        forest: 'wood',
        hill: 'brick',
        pasture: 'sheep',
        field: 'wheat',
        mountain: 'ore',
    };
    return resources[terrain] ?? null;
}

export function createHexCardInteractions(
    deps: HexFlowDeps,
    playCard: PlayProgressCard
): ProgressCardInteractionHandlers {
    const {
        gameState,
        playerId,
        selectionManager,
        merchantPrompt,
        inventorPrompt,
        taxationPrompt,
    } = deps;

    const startSelection = (
        cardType: 'merchant' | 'inventor' | 'taxation',
        initialize: () => void
    ) => {
        if (selectionManager.selectingHexForCard === cardType) {
            selectionManager.clearAllSelections();
            return;
        }
        selectionManager.clearAllSelections();
        initialize();
        selectionManager.setBuildMode(null);
        selectionManager.setMovingKnightId(null);
        selectionManager.setBuildingMetropolisType(null);
    };

    return {
        merchant: {
            start: () =>
                startSelection('merchant', () => {
                    selectionManager.setSelectingHexForCard('merchant');
                    selectionManager.setIsMerchantModalOpen(true);
                    selectionManager.setSelectedMerchantHexId(null);
                    selectionManager.setMerchantError(null);
                    merchantPrompt.begin('Select a resource hex.');
                }),
            onBoardSelect: hexId => {
                selectionManager.setSelectedMerchantHexId(hexId);
                selectionManager.setMerchantError(null);
                const hex = gameState?.board.hexes.find(item => item.id === hexId);
                const resource = hex ? resourceForTerrain(hex.terrain) : null;
                merchantPrompt.setStatus(
                    resource ? `Selected ${resource}.` : 'Select a resource hex.'
                );
            },
            onConfirm: async () => {
                const hexId = selectionManager.selectedMerchantHexId;
                if (!hexId) return;
                selectionManager.setMerchantError(null);
                merchantPrompt.setStatus('Placing Merchant...');
                try {
                    await playCard('merchant', { hexId });
                    merchantPrompt.clear();
                    selectionManager.clearAllSelections();
                } catch (error: unknown) {
                    const message = controllerErrorMessage(
                        error,
                        'Failed to place Merchant'
                    );
                    selectionManager.setMerchantError(message);
                    merchantPrompt.setStatus(message);
                }
            },
        },
        inventor: {
            start: () =>
                startSelection('inventor', () => {
                    selectionManager.setSelectingHexForCard('inventor');
                    selectionManager.setInventorSelection({});
                    selectionManager.setInventorError(null);
                    selectionManager.setIsInventorConfirmOpen(false);
                    inventorPrompt.begin(
                        'Select first hex with a number token to swap.'
                    );
                }),
            onBoardSelect: hexId => {
                if (!gameState || selectionManager.isInventorConfirmOpen) return;
                const selectedHex = gameState.board.hexes.find(
                    item => item.id === hexId
                );
                const tokenValue = selectedHex?.numberToken;
                if (!selectedHex || !tokenValue) return;

                const current = selectionManager.inventorSelection;
                if (!current.firstHexId || current.firstHexId === hexId) {
                    selectionManager.setInventorSelection({
                        firstHexId: hexId,
                        firstValue: tokenValue,
                    });
                    selectionManager.setInventorError(null);
                    inventorPrompt.setStatus(
                        `Selected #${tokenValue}. Click another hex to swap.`
                    );
                    return;
                }

                selectionManager.setInventorSelection({
                    ...current,
                    secondHexId: hexId,
                    secondValue: tokenValue,
                });
                selectionManager.setInventorError(null);
                inventorPrompt.setStatus(
                    `Swapping #${current.firstValue} with #${tokenValue}`
                );
                selectionManager.setIsInventorConfirmOpen(true);
            },
            onConfirm: async () => {
                const { firstHexId, secondHexId } =
                    selectionManager.inventorSelection;
                if (!firstHexId || !secondHexId) return;
                try {
                    await playCard('inventor', {
                        hex1Id: firstHexId,
                        hex2Id: secondHexId,
                    });
                    selectionManager.clearAllSelections();
                } catch (error: unknown) {
                    selectionManager.setInventorError(
                        controllerErrorMessage(
                            error,
                            'Failed to swap number tokens'
                        )
                    );
                }
            },
        },
        taxation: {
            start: () =>
                startSelection('taxation', () => {
                    selectionManager.setSelectingHexForCard('taxation');
                    selectionManager.setIsTaxationModalOpen(true);
                    selectionManager.setSelectedTaxationHexId(null);
                    selectionManager.setTaxationError(null);
                    taxationPrompt.begin('Select a hex to move the robber.');
                }),
            onBoardSelect: hexId => {
                if (!gameState) return;
                selectionManager.setSelectedTaxationHexId(hexId);
                selectionManager.setTaxationError(null);
                const [q, r] = hexId.split(',').map(Number);
                const opponents = Array.from(
                    { length: 6 },
                    (_, direction) => getCanonicalVertexId(q, r, direction)
                )
                    .map(id => gameState.board.vertices[id])
                    .filter(
                        vertex =>
                            vertex?.owner &&
                            vertex.owner !== playerId &&
                            vertex.structure
                    );
                const names = Array.from(
                    new Set(
                        opponents
                            .map(vertex =>
                                gameState.players.find(
                                    player => player.id === vertex.owner
                                )?.name
                            )
                            .filter((name): name is string => Boolean(name))
                    )
                );
                taxationPrompt.setStatus(
                    names.length > 0
                        ? `Robber will target ${names.join(', ')}.`
                        : 'No opponent buildings on this hex.'
                );
            },
            onConfirm: async () => {
                const hexId = selectionManager.selectedTaxationHexId;
                if (!hexId) return;
                selectionManager.setTaxationError(null);
                taxationPrompt.setStatus('Moving robber and stealing...');
                try {
                    await playCard('taxation', { hexId });
                    taxationPrompt.clear();
                    selectionManager.clearAllSelections();
                } catch (error: unknown) {
                    const message = controllerErrorMessage(
                        error,
                        'Failed to resolve Taxation'
                    );
                    selectionManager.setTaxationError(message);
                    taxationPrompt.setStatus(message);
                }
            },
        },
    };
}
