import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    cancelRoadBuildingProgress,
    cancelTreason,
    discardProgressCards,
    endTurn,
    finalizeRoadBuildingProgress,
    placeTreasonKnight,
    playProgressCard,
    selectTreasonKnight,
} from '@/app/actions'
import { createProgressCardController } from '@/lib/controllers/progress-card-controller'
import { useSelectionManager } from '@/lib/hooks/useSelectionManager'
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils/test-helpers'
import { createHex } from '@/lib/hex'
import type { GameState } from '@/lib/types'
import type { ProgressCardControllerDeps } from '../types'

vi.mock('@/app/actions', () => ({
    cancelRoadBuildingProgress: vi.fn(),
    cancelTreason: vi.fn(),
    discardProgressCards: vi.fn(),
    endTurn: vi.fn(),
    finalizeRoadBuildingProgress: vi.fn(),
    placeTreasonKnight: vi.fn(),
    playProgressCard: vi.fn(),
    selectTreasonKnight: vi.fn(),
}))

const actionMocks = {
    cancelRoadBuildingProgress: vi.mocked(cancelRoadBuildingProgress),
    cancelTreason: vi.mocked(cancelTreason),
    discardProgressCards: vi.mocked(discardProgressCards),
    endTurn: vi.mocked(endTurn),
    finalizeRoadBuildingProgress: vi.mocked(finalizeRoadBuildingProgress),
    placeTreasonKnight: vi.mocked(placeTreasonKnight),
    playProgressCard: vi.mocked(playProgressCard),
    selectTreasonKnight: vi.mocked(selectTreasonKnight),
}

function createPrompt() {
    return {
        begin: vi.fn(),
        setStatus: vi.fn(),
        clear: vi.fn(),
    }
}

function createControllerHarness(
    gameState: GameState,
    overrides: Partial<ProgressCardControllerDeps> = {}
) {
    const selection = renderHook(() => useSelectionManager())
    const merchantPrompt = createPrompt()
    const inventorPrompt = createPrompt()
    const taxationPrompt = createPrompt()
    const engineeringPrompt = createPrompt()
    const medicinePrompt = createPrompt()
    const roadBuildingPrompt = { ...createPrompt(), hide: vi.fn() }
    const onGameStateUpdated = vi.fn()
    const clearSelectedCard = vi.fn()

    const controller = () =>
        createProgressCardController({
            roomId: 'room-1',
            playerId: 'p1',
            gameState,
            selectionManager: selection.result.current,
            merchantPrompt,
            inventorPrompt,
            taxationPrompt,
            engineeringPrompt,
            medicinePrompt,
            roadBuildingPrompt,
            getOptimisticState: (state) => state,
            clearSelectedCard,
            isActiveTurn: true,
            isTreasonTarget: false,
            resetTreasonLocalState: vi.fn(),
            isRoadBuildingProgressActive: false,
            progressDiscardContext: 'own_turn',
            setShowProgressCardDiscard: vi.fn(),
            setProgressDiscardContext: vi.fn(),
            onGameStateUpdated,
            ...overrides,
        })

    return {
        selection,
        controller,
        merchantPrompt,
        inventorPrompt,
        engineeringPrompt,
        medicinePrompt,
        roadBuildingPrompt,
        onGameStateUpdated,
        clearSelectedCard,
    }
}

describe('progress card controller composition', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('routes Merchant board selection through confirmation', async () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1' })],
            board: createTestBoard({
                hexes: [
                    {
                        id: '0,0',
                        hex: createHex(0, 0),
                        terrain: 'forest',
                        numberToken: 8,
                    },
                ],
            }),
        })
        actionMocks.playProgressCard.mockResolvedValue(gameState)
        const harness = createControllerHarness(gameState)

        act(() => harness.controller().handleStartHexSelection('merchant'))
        expect(harness.selection.result.current.selectingHexForCard).toBe(
            'merchant'
        )

        await act(async () => {
            await harness.controller().handleHexSelected('0,0')
        })
        expect(harness.selection.result.current.selectedMerchantHexId).toBe(
            '0,0'
        )
        expect(harness.merchantPrompt.setStatus).toHaveBeenCalledWith(
            'Selected wood.'
        )

        await act(async () => {
            await harness.controller().handleConfirmMerchantPlacement()
        })
        expect(actionMocks.playProgressCard).toHaveBeenCalledWith(
            'room-1',
            'p1',
            'merchant',
            { hexId: '0,0' }
        )
        expect(harness.onGameStateUpdated).toHaveBeenCalledWith(gameState)
        expect(harness.selection.result.current.selectingHexForCard).toBeNull()
    })

    it('collects both Inventor hexes before committing the swap', async () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1' })],
            board: createTestBoard({
                hexes: [
                    { id: '0,0', hex: createHex(0, 0), terrain: 'forest', numberToken: 5 },
                    { id: '1,0', hex: createHex(1, 0), terrain: 'hill', numberToken: 9 },
                ],
            }),
        })
        actionMocks.playProgressCard.mockResolvedValue(gameState)
        const harness = createControllerHarness(gameState)

        act(() => harness.controller().handleStartHexSelection('inventor'))
        await act(async () => {
            await harness.controller().handleHexSelected('0,0')
        })
        await act(async () => {
            await harness.controller().handleHexSelected('1,0')
        })

        expect(harness.selection.result.current.inventorSelection).toEqual({
            firstHexId: '0,0',
            firstValue: 5,
            secondHexId: '1,0',
            secondValue: 9,
        })
        expect(harness.selection.result.current.isInventorConfirmOpen).toBe(true)

        await act(async () => {
            await harness.controller().handleConfirmInventorSwap()
        })
        expect(actionMocks.playProgressCard).toHaveBeenCalledWith(
            'room-1',
            'p1',
            'inventor',
            { hex1Id: '0,0', hex2Id: '1,0' }
        )
    })

    it('keeps Engineer and Medicine as explicit board-confirm flows', async () => {
        const player = createTestPlayer({
            id: 'p1',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 2 },
        })
        const gameState = createTestGameState({
            players: [player],
            currentTurn: 'p1',
            board: createTestBoard({
                vertices: [
                    {
                        id: 'city',
                        owner: 'p1',
                        structure: 'city',
                        hasCityWall: false,
                    },
                    {
                        id: 'settlement',
                        owner: 'p1',
                        structure: 'settlement',
                    },
                ],
            }),
        })
        actionMocks.playProgressCard.mockResolvedValue(gameState)
        const harness = createControllerHarness(gameState)

        act(() => harness.controller().handleStartEngineerSelection())
        expect(harness.selection.result.current.selectingCityForEngineer).toBe(
            true
        )
        act(() => harness.controller().handleEngineerCitySelected('city'))
        await act(async () => {
            await harness.controller().handleConfirmEngineerBuild()
        })
        expect(actionMocks.playProgressCard).toHaveBeenCalledWith(
            'room-1',
            'p1',
            'engineer',
            { vertexId: 'city' }
        )

        act(() => harness.controller().handleStartMedicineSelection())
        expect(harness.selection.result.current.selectingCityForMedicine).toBe(
            true
        )
        act(() =>
            harness.controller().handleMedicineCitySelected('settlement')
        )
        await act(async () => {
            await harness.controller().handleConfirmMedicineBuild()
        })
        expect(actionMocks.playProgressCard).toHaveBeenCalledWith(
            'room-1',
            'p1',
            'medicine',
            { vertexId: 'settlement' }
        )
        expect(harness.clearSelectedCard).toHaveBeenCalledTimes(2)
    })

    it('starts Treason and commits the selected opponent', async () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1' }),
                createTestPlayer({ id: 'p2' }),
            ],
        })
        actionMocks.playProgressCard.mockResolvedValue(gameState)
        const harness = createControllerHarness(gameState)

        act(() => harness.controller().handleStartTreasonSelection())
        expect(harness.selection.result.current.treasonMode).toBe(
            'select_opponent'
        )

        act(() =>
            harness.selection.result.current.setTreasonSelectedOpponentId('p2')
        )
        await act(async () => {
            await harness.controller().handleConfirmTreasonOpponent()
        })

        expect(actionMocks.playProgressCard).toHaveBeenCalledWith(
            'room-1',
            'p1',
            'treason',
            { opponentId: 'p2' }
        )
        expect(harness.selection.result.current.treasonMode).toBe(
            'waiting_for_knight'
        )
    })

    it('preserves Road Building prompt and own-turn discard behavior', async () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1' })],
        })
        actionMocks.playProgressCard.mockResolvedValue(gameState)
        actionMocks.discardProgressCards.mockResolvedValue(gameState)
        actionMocks.endTurn.mockResolvedValue(gameState)
        const setShowProgressCardDiscard = vi.fn()
        const setProgressDiscardContext = vi.fn()
        const harness = createControllerHarness(gameState, {
            setShowProgressCardDiscard,
            setProgressDiscardContext,
        })

        await act(async () => {
            await harness
                .controller()
                .handlePlayProgressCard('road_building_progress')
        })
        expect(harness.roadBuildingPrompt.begin).toHaveBeenCalled()

        await act(async () => {
            await harness.controller().handleDiscardProgressCards(['merchant'])
        })
        expect(actionMocks.discardProgressCards).toHaveBeenCalledWith(
            'room-1',
            'p1',
            ['merchant']
        )
        expect(actionMocks.endTurn).toHaveBeenCalledWith('room-1', 'p1')
        expect(setShowProgressCardDiscard).toHaveBeenCalledWith(false)
        expect(setProgressDiscardContext).toHaveBeenCalledWith('own_turn')
    })
})
