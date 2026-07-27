import type { GameState } from '@/lib/types/game';
import type { ProgressCardType } from '@/lib/types/player';
import type { SelectionState } from '@/lib/hooks/useSelectionManager';
import type { ProgressPrompt } from '../improvement-controller';

export type PlayProgressCard = (
    cardType: ProgressCardType,
    options?: unknown
) => Promise<void>;

export interface CardInteractionHandlers {
    start?: () => void;
    onBoardSelect?: (targetId: string) => void | Promise<void>;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void | Promise<void>;
}

export type ProgressCardInteractionHandlers = Partial<
    Record<ProgressCardType, CardInteractionHandlers>
>;

export interface ProgressCardControllerDeps {
    roomId: string;
    playerId: string;
    gameState: GameState | null;
    selectionManager: SelectionState;
    merchantPrompt: ProgressPrompt;
    inventorPrompt: ProgressPrompt;
    taxationPrompt: ProgressPrompt;
    engineeringPrompt: ProgressPrompt;
    medicinePrompt: ProgressPrompt;
    roadBuildingPrompt: ProgressPrompt & { hide: () => void };
    getOptimisticState: (state: GameState) => GameState;
    clearSelectedCard: () => void;
    isActiveTurn: boolean;
    isTreasonTarget: boolean;
    resetTreasonLocalState: (keepModal?: boolean) => void;
    isRoadBuildingProgressActive: boolean;
    progressDiscardContext: 'own_turn' | 'other_turn';
    setShowProgressCardDiscard: (show: boolean) => void;
    setProgressDiscardContext: (context: 'own_turn' | 'other_turn') => void;
    onGameStateUpdated: (state: GameState) => void;
}

export interface ProgressCardController {
    handlePlayProgressCard: PlayProgressCard;
    handleStartHexSelection: (
        cardType: 'merchant' | 'inventor' | 'taxation'
    ) => void;
    handleHexSelected: (hexId: string) => Promise<void>;
    handleConfirmInventorSwap: () => Promise<void>;
    handleConfirmMerchantPlacement: () => Promise<void>;
    handleConfirmTaxationPlacement: () => Promise<void>;
    handleStartVertexSelection: (cardType: 'intrigue') => void;
    handleVertexSelected: (vertexId: string) => Promise<void>;
    handleConfirmIntrigueDisplacement: () => Promise<void>;
    handleStartEdgeSelection: (cardType: 'diplomat') => void;
    handleEdgeSelected: (edgeId: string) => void;
    handleConfirmDiplomatRemove: () => Promise<void>;
    handleConfirmDiplomatRebuild: () => Promise<void>;
    handleStartEngineerSelection: () => void;
    handleEngineerCitySelected: (vertexId: string) => void;
    handleConfirmEngineerBuild: () => Promise<void>;
    handleStartMedicineSelection: () => void;
    handleMedicineCitySelected: (vertexId: string) => void;
    handleConfirmMedicineBuild: () => Promise<void>;
    handleStartTreasonSelection: () => void;
    handleConfirmTreasonOpponent: () => Promise<void>;
    handleConfirmTreasonKnightRemoval: () => Promise<void>;
    handleConfirmTreasonPlacement: () => Promise<void>;
    handleCancelTreasonPlacement: () => Promise<void>;
    handleCancelRoadBuildingProgress: () => Promise<void>;
    handleFinalizeRoadBuildingProgress: () => Promise<void>;
    handleCancelFollowupCard: () => void;
    handleDiscardProgressCards: (
        cardsToDiscard: ProgressCardType[]
    ) => Promise<void>;
}

export function controllerErrorMessage(
    error: unknown,
    fallback: string
): string {
    return error instanceof Error && error.message ? error.message : fallback;
}
