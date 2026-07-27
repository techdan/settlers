import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils';
import { CityManagementDialog } from '../CityManagementDialog';
import { KnightManagementDialog } from '../KnightManagementDialog';
import { SettlementManagementDialog } from '../SettlementManagementDialog';

vi.mock('@/lib/hooks/useTimerState', () => ({
    useTimerState: () => ({ isLocked: false }),
}));

vi.mock('@/core/validation/knight-validator', () => ({
    canAffordKnightActivation: () => true,
    canAffordKnightUpgrade: () => true,
    isKnightAdjacentToRobber: () => true,
}));

vi.mock('@/core/validation/building-validator', () => ({
    isValidMainPhaseCity: () => true,
}));

const playerId = 'player-1';
const vertexId = '0,0,0';

function cityGameState() {
    const player = createTestPlayer({
        id: playerId,
        resources: {
            wood: 0,
            brick: 2,
            sheep: 0,
            wheat: 0,
            ore: 0,
        },
        commodities: {
            paper: 5,
            cloth: 5,
            coin: 5,
        },
    });

    return createTestGameState({
        players: [player],
        currentTurn: playerId,
        phase: 'main_phase',
        board: createTestBoard({
            vertices: [{
                id: vertexId,
                owner: playerId,
                structure: 'city',
            }],
        }),
    });
}

function knightGameState(active: boolean) {
    const player = createTestPlayer({
        id: playerId,
        resources: {
            wood: 0,
            brick: 0,
            sheep: 1,
            wheat: 1,
            ore: 1,
        },
        knights: [{
            id: 'knight-1',
            vertexId,
            playerId,
            level: 'basic',
            active,
        }],
    });

    return createTestGameState({
        players: [player],
        currentTurn: playerId,
        phase: 'main_phase',
        hasBarbariansAttacked: true,
    });
}

function settlementGameState() {
    const player = createTestPlayer({
        id: playerId,
        resources: {
            wood: 0,
            brick: 0,
            sheep: 0,
            wheat: 2,
            ore: 3,
        },
    });

    return createTestGameState({
        players: [player],
        currentTurn: playerId,
        phase: 'main_phase',
        board: createTestBoard({
            vertices: [{
                id: vertexId,
                owner: playerId,
                structure: 'settlement',
            }],
        }),
    });
}

describe('management dialog error handling', () => {
    it('announces a city improvement error message', async () => {
        const user = userEvent.setup();
        const onUpgradeImprovement = vi.fn().mockRejectedValue(
            new Error('Improvement rejected')
        );

        render(
            <CityManagementDialog
                gameState={cityGameState()}
                playerId={playerId}
                vertexId={vertexId}
                onClose={vi.fn()}
                onUpgradeImprovement={onUpgradeImprovement}
            />
        );

        await user.click(screen.getAllByRole('button', { name: /^Upgrade/ })[0]);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Improvement rejected'
        );
    });

    it('uses a safe fallback when building a city wall rejects a non-Error', async () => {
        const user = userEvent.setup();
        const onBuildWall = vi.fn().mockRejectedValue({ reason: 'rejected' });

        render(
            <CityManagementDialog
                gameState={cityGameState()}
                playerId={playerId}
                vertexId={vertexId}
                onClose={vi.fn()}
                onBuildWall={onBuildWall}
            />
        );

        await user.click(screen.getByRole('button', { name: /Build Wall/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to build wall'
        );
    });

    it('announces a knight activation error message', async () => {
        const user = userEvent.setup();
        const onActivate = vi.fn().mockRejectedValue(
            new Error('Activation rejected')
        );

        render(
            <KnightManagementDialog
                gameState={knightGameState(false)}
                playerId={playerId}
                knightId="knight-1"
                onClose={vi.fn()}
                onActivate={onActivate}
                onUpgrade={vi.fn()}
                onMove={vi.fn()}
                onChaseRobber={vi.fn()}
            />
        );

        await user.click(screen.getByRole('button', { name: /^Activate/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Activation rejected'
        );
    });

    it('uses a safe fallback when knight upgrade rejects a non-Error', async () => {
        const user = userEvent.setup();
        const onUpgrade = vi.fn().mockRejectedValue(null);

        render(
            <KnightManagementDialog
                gameState={knightGameState(false)}
                playerId={playerId}
                knightId="knight-1"
                onClose={vi.fn()}
                onActivate={vi.fn()}
                onUpgrade={onUpgrade}
                onMove={vi.fn()}
                onChaseRobber={vi.fn()}
            />
        );

        await user.click(screen.getByRole('button', { name: /^Upgrade/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to upgrade knight'
        );
    });

    it('announces a chase-away error message', async () => {
        const user = userEvent.setup();
        const onChaseRobber = vi.fn().mockRejectedValue(
            new Error('Robber stayed put')
        );

        render(
            <KnightManagementDialog
                gameState={knightGameState(true)}
                playerId={playerId}
                knightId="knight-1"
                onClose={vi.fn()}
                onActivate={vi.fn()}
                onUpgrade={vi.fn()}
                onMove={vi.fn()}
                onChaseRobber={onChaseRobber}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Chase Away Robber' })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Robber stayed put'
        );
    });

    it('uses a safe fallback when settlement upgrade rejects a non-Error', async () => {
        const user = userEvent.setup();
        const onUpgradeToCity = vi.fn().mockRejectedValue('rejected');

        render(
            <SettlementManagementDialog
                gameState={settlementGameState()}
                playerId={playerId}
                vertexId={vertexId}
                onClose={vi.fn()}
                onUpgradeToCity={onUpgradeToCity}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /^Upgrade to City/ })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to upgrade to city'
        );
    });
});
