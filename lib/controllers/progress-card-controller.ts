import {
    cancelRoadBuildingProgress,
    discardProgressCards,
    endTurn,
    finalizeRoadBuildingProgress,
    playProgressCard,
} from '@/app/actions'
import type { ProgressCardType } from '@/lib/types'
import { createCityCardInteractions } from './progress-card/city-card-interactions'
import { createHexCardInteractions } from './progress-card/hex-card-interactions'
import { createTreasonCardInteraction } from './progress-card/treason-card-interaction'
import type {
    PlayProgressCard,
    ProgressCardController,
    ProgressCardControllerDeps,
    ProgressCardInteractionHandlers,
} from './progress-card/types'
import { createVertexEdgeInteractions } from './progress-card/vertex-edge-interactions'

export type {
    ProgressCardController,
    ProgressCardControllerDeps,
} from './progress-card/types'

export function createProgressCardController(
    deps: ProgressCardControllerDeps
): ProgressCardController {
    const {
        roomId,
        playerId,
        selectionManager,
        roadBuildingPrompt,
        isRoadBuildingProgressActive,
        progressDiscardContext,
        setShowProgressCardDiscard,
        setProgressDiscardContext,
        onGameStateUpdated,
        clearSelectedCard,
    } = deps

    const handlePlayProgressCard: PlayProgressCard = async (cardType, options = {}) => {
        try {
            if (cardType === 'road_building_progress') {
                roadBuildingPrompt.begin()
            }

            const playOptions =
                typeof options === 'object' &&
                options !== null &&
                !Array.isArray(options)
                    ? (options as Record<string, unknown>)
                    : {}
            const updatedGameState = await playProgressCard(
                roomId,
                playerId,
                cardType,
                playOptions
            )
            onGameStateUpdated(updatedGameState)
        } catch (error: unknown) {
            if (cardType === 'road_building_progress') {
                roadBuildingPrompt.clear()
            }
            console.error('Error playing progress card:', error)
            throw error
        }
    }

    const hexInteractions = createHexCardInteractions(deps, handlePlayProgressCard)
    const vertexEdgeInteractions = createVertexEdgeInteractions(
        deps,
        handlePlayProgressCard
    )
    const cityInteractions = createCityCardInteractions(deps, handlePlayProgressCard)
    const treasonInteraction = createTreasonCardInteraction(deps, handlePlayProgressCard)

    const interactions: ProgressCardInteractionHandlers = {
        ...hexInteractions,
        ...vertexEdgeInteractions.interactions,
        ...cityInteractions,
        treason: treasonInteraction.interaction,
    }

    const startInteraction = (cardType: ProgressCardType) => {
        interactions[cardType]?.start?.()
    }

    const confirmInteraction = async (cardType: ProgressCardType) => {
        await interactions[cardType]?.onConfirm?.()
    }

    const handleHexSelected = async (hexId: string) => {
        const cardType = selectionManager.selectingHexForCard
        if (!cardType || !deps.gameState) return
        await interactions[cardType]?.onBoardSelect?.(hexId)
    }

    const handleVertexSelected = async (vertexId: string) => {
        const cardType =
            selectionManager.selectingVertexForCard === 'intrigue'
                ? 'intrigue'
                : selectionManager.selectingVertexForCard === 'treason_remove' ||
                    selectionManager.selectingVertexForCard === 'treason_place'
                  ? 'treason'
                  : undefined

        if (!cardType) return
        await interactions[cardType]?.onBoardSelect?.(vertexId)
    }

    const handleEdgeSelected = (edgeId: string) => {
        const cardType = selectionManager.selectingEdgeForCard
        if (!cardType) return
        void interactions[cardType]?.onBoardSelect?.(edgeId)
    }

    const handleCancelRoadBuildingProgress = async () => {
        roadBuildingPrompt.hide()
        try {
            await cancelRoadBuildingProgress(roomId, playerId)
            clearSelectedCard()
            roadBuildingPrompt.clear()
        } catch (error: unknown) {
            console.error('Failed to cancel Road Building progress card', error)
            roadBuildingPrompt.clear()
        }
    }

    const handleFinalizeRoadBuildingProgress = async () => {
        roadBuildingPrompt.hide()
        try {
            await finalizeRoadBuildingProgress(roomId, playerId)
            clearSelectedCard()
            roadBuildingPrompt.clear()
        } catch (error: unknown) {
            console.error('Failed to finalize Road Building progress card', error)
            roadBuildingPrompt.clear()
        }
    }

    const handleCancelFollowupCard = () => {
        if (isRoadBuildingProgressActive) {
            void handleCancelRoadBuildingProgress()
            return
        }

        selectionManager.clearAllSelections()
    }

    const handleDiscardProgressCards = async (cardTypes: ProgressCardType[]) => {
        const shouldAutoEndTurn = progressDiscardContext === 'own_turn'
        try {
            await discardProgressCards(roomId, playerId, cardTypes)
            if (shouldAutoEndTurn) {
                await endTurn(roomId, playerId)
            }
            setShowProgressCardDiscard(false)
            setProgressDiscardContext('own_turn')
        } catch (error: unknown) {
            console.error('Error discarding progress cards:', error)
            throw error
        }
    }

    return {
        handlePlayProgressCard,
        handleStartHexSelection: (cardType) => startInteraction(cardType),
        handleHexSelected,
        handleConfirmInventorSwap: () => confirmInteraction('inventor'),
        handleConfirmMerchantPlacement: () => confirmInteraction('merchant'),
        handleConfirmTaxationPlacement: () => confirmInteraction('taxation'),
        handleStartVertexSelection: (cardType) => startInteraction(cardType),
        handleVertexSelected,
        handleConfirmIntrigueDisplacement: () => confirmInteraction('intrigue'),
        handleStartEdgeSelection: (cardType) => startInteraction(cardType),
        handleEdgeSelected,
        handleConfirmDiplomatRemove: vertexEdgeInteractions.confirmDiplomatRemove,
        handleConfirmDiplomatRebuild: vertexEdgeInteractions.confirmDiplomatRebuild,
        handleStartEngineerSelection: () => startInteraction('engineer'),
        handleEngineerCitySelected: (vertexId) => {
            void interactions.engineer?.onBoardSelect?.(vertexId)
        },
        handleConfirmEngineerBuild: () => confirmInteraction('engineer'),
        handleStartMedicineSelection: () => startInteraction('medicine'),
        handleMedicineCitySelected: (vertexId) => {
            void interactions.medicine?.onBoardSelect?.(vertexId)
        },
        handleConfirmMedicineBuild: () => confirmInteraction('medicine'),
        handleStartTreasonSelection: () => startInteraction('treason'),
        handleConfirmTreasonOpponent: treasonInteraction.confirmOpponent,
        handleConfirmTreasonKnightRemoval:
            treasonInteraction.confirmKnightRemoval,
        handleConfirmTreasonPlacement: treasonInteraction.confirmPlacement,
        handleCancelTreasonPlacement: treasonInteraction.cancelPlacement,
        handleCancelRoadBuildingProgress,
        handleFinalizeRoadBuildingProgress,
        handleCancelFollowupCard,
        handleDiscardProgressCards,
    }
}
