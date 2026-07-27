import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProgressCardHand } from '../ProgressCardHand'
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils'
import type { ProgressCardType } from '@/lib/types'

function renderCard(cardType: ProgressCardType) {
    const player = createTestPlayer({
        id: 'p1',
        progressCards: [cardType],
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 2 },
        knights: [
            {
                id: 'knight-1',
                vertexId: 'knight',
                playerId: 'p1',
                level: 'basic',
                active: true,
            },
        ],
    })
    const gameState = createTestGameState({
        players: [player, createTestPlayer({ id: 'p2' })],
        currentTurn: 'p1',
        phase: 'main_phase',
        hasBarbariansAttacked: true,
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
    const handlers = {
        onStartHexSelection: vi.fn(),
        onStartEngineerSelection: vi.fn(),
        onStartSmithSelection: vi.fn(),
        onStartMedicineSelection: vi.fn(),
        onStartTreasonSelection: vi.fn(),
    }

    render(
        <ProgressCardHand
            player={player}
            roomId="room-1"
            gameState={gameState}
            isActiveTurn
            onPlayCard={vi.fn().mockResolvedValue(undefined)}
            {...handlers}
        />
    )

    return handlers
}

describe('ProgressCardHand board-flow routing', () => {
    it.each([
        ['Merchant', 'merchant'],
        ['Inventor', 'inventor'],
    ] as const)('routes %s to hex selection', async (name, cardType) => {
        const user = userEvent.setup()
        const handlers = renderCard(cardType)

        await user.click(screen.getByRole('button', { name }))

        expect(handlers.onStartHexSelection).toHaveBeenCalledWith(cardType)
    })

    it.each([
        ['Engineering', 'engineer', 'onStartEngineerSelection'],
        ['Smithing', 'smith', 'onStartSmithSelection'],
        ['Medicine', 'medicine', 'onStartMedicineSelection'],
        ['Treason', 'treason', 'onStartTreasonSelection'],
    ] as const)('routes %s to its custom selection flow', async (
        name,
        cardType,
        handlerName
    ) => {
        const user = userEvent.setup()
        const handlers = renderCard(cardType)

        await user.click(screen.getByRole('button', { name }))

        expect(handlers[handlerName]).toHaveBeenCalledOnce()
    })
})
