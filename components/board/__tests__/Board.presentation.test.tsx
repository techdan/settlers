import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import type { GameState } from '@/lib/types/game';
import { createTestBoard, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { setBoardPresentation } from '@/lib/hooks/useBoardPresentation';
import * as actions from '@/app/actions';
import { Board } from '@/components/board/Board';

const rendered = vi.hoisted(() => ({ classic: vi.fn(), three: vi.fn() }));

// Keep the real parent, state, validation, action hook, presentation preference,
// and error boundary. Only replace the two expensive visual renderers.
function RendererHarness({ mode, onUnavailable, ...props }: BoardRendererProps & {
    mode: 'classic' | 'three';
    onUnavailable?: () => void;
}) {
    return (
        <div data-testid={`${mode}-renderer`}>
            <span data-testid="pending-target">{props.pendingPlacement?.id ?? 'none'}</span>
            <span data-testid="placement-busy">{String(props.placementBusy)}</span>
            {props.vertices.map(vertex => (
                <button key={vertex.id} onClick={() => props.onVertexClick(vertex.id)}>
                    Select vertex {vertex.id}
                </button>
            ))}
            {/* Deliberately enabled: exercise the real hook's duplicate guard. */}
            <button onClick={props.onConfirmPlacement}>Confirm placement</button>
            {onUnavailable ? <button onClick={onUnavailable}>Lose WebGL context</button> : null}
        </div>
    );
}

vi.mock('@/components/board/BoardCanvas', () => ({
    BoardCanvas: (props: BoardRendererProps) => {
        rendered.classic(props);
        return <RendererHarness {...props} mode="classic" />;
    },
}));

vi.mock('next/dynamic', () => ({
    default: () => function LazyScene(props: BoardRendererProps & { onUnavailable: () => void }) {
        rendered.three(props);
        return <RendererHarness {...props} mode="three" />;
    },
}));

vi.mock('@/app/actions', () => ({
    placeSettlement: vi.fn(),
    placeRoad: vi.fn(),
    moveRobber: vi.fn(),
    buildRoad: vi.fn(),
    buildSettlement: vi.fn(),
    buildCity: vi.fn(),
    placeBonusRoad: vi.fn(),
    buildKnight: vi.fn(),
    buildCityWall: vi.fn(),
    relocateKnight: vi.fn(),
    moveKnight: vi.fn(),
    placeMetropolis: vi.fn(),
}));

function fixture() {
    const target = createTestVertex({ q: 0, r: 0, d: 0 });
    const other = createTestVertex({ q: 2, r: 0, d: 1 });
    const player = createTestPlayer({ id: 'player-one' });
    const gameState = createTestGameState({
        roomId: 'presentation-room',
        phase: 'setup_round_1_settlement',
        gameMode: 'base',
        players: [player],
        currentTurn: player.id,
        board: createTestBoard({
            vertices: [target, other],
            edges: [{ q: 0, r: 0, d: 0 }],
            hexes: [{ id: '0,0', hex: { q: 0, r: 0, s: 0 }, terrain: 'forest', numberToken: 6 }],
        }),
    });
    const onCancelBuild = vi.fn();
    render(
        <Board gameState={gameState} authoritativeState={gameState} playerId={player.id}
            selectionState={{ buildMode: null }} callbacks={{ onCancelBuild }} />
    );
    return { gameState, target, other, player, onCancelBuild };
}

function latest(mode: 'classic' | 'three'): BoardRendererProps {
    return rendered[mode].mock.calls.at(-1)![0] as BoardRendererProps;
}

function expectNoActions() {
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
}

beforeEach(() => {
    vi.clearAllMocks();
    setBoardPresentation('three');
});

afterEach(cleanup);

describe('Board presentation boundary', { timeout: 15_000 }, () => {
    it('opens in 3D and hides the retired appearance switch', () => {
        fixture();
        expect(screen.getByTestId('three-renderer')).toBeInTheDocument();
        expect(rendered.classic).not.toHaveBeenCalled();
        expect(screen.queryByRole('group', { name: 'Board appearance' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Classic' })).not.toBeInTheDocument();
        expectNoActions();
    });

    it('preserves pending placement and canonical board IDs through a renderer round trip', () => {
        setBoardPresentation('classic');
        const { gameState, target, player, onCancelBuild } = fixture();
        fireEvent.click(screen.getByRole('button', { name: `Select vertex ${target.id}` }));
        const classic = latest('classic');
        expect(classic.pendingPlacement).toEqual({ type: 'settlement', id: target.id, phase: 'setup' });

        act(() => setBoardPresentation('three'));
        const three = latest('three');
        expect(screen.getByTestId('pending-target')).toHaveTextContent(target.id);
        expect(three.pendingPlacement).toBe(classic.pendingPlacement);
        expect(three.gameState).toBe(gameState);
        expect(three.authoritativeState).toBe(gameState);
        expect(three.vertices.map(vertex => vertex.id)).toEqual(classic.vertices.map(vertex => vertex.id));
        expect(three.renderEdges.map(edge => edge.id)).toEqual(classic.renderEdges.map(edge => edge.id));
        expect(three.gameState.board.hexes.map(hex => hex.id)).toEqual(['0,0']);
        expect(three.validation.validVertices).toEqual(classic.validation.validVertices);
        expect(three.vertices.find(vertex => vertex.id === target.id)).toMatchObject({ owner: player.id, structure: 'settlement' });

        act(() => setBoardPresentation('classic'));
        expect(screen.getByTestId('pending-target')).toHaveTextContent(target.id);
        expect(latest('classic').pendingPlacement).toBe(classic.pendingPlacement);
        expect(onCancelBuild).not.toHaveBeenCalled();
        expectNoActions();
    });

    it('falls back to Classic after context loss without discarding the selected placement', () => {
        const { target, onCancelBuild } = fixture();
        fireEvent.click(screen.getByRole('button', { name: `Select vertex ${target.id}` }));
        act(() => setBoardPresentation('three'));
        fireEvent.click(screen.getByRole('button', { name: 'Lose WebGL context' }));

        expect(screen.getByTestId('classic-renderer')).toBeInTheDocument();
        expect(screen.getByTestId('pending-target')).toHaveTextContent(target.id);
        expect(screen.getByRole('status')).toHaveTextContent('Your game continues in compatibility mode');
        expect(onCancelBuild).not.toHaveBeenCalled();
        expectNoActions();
    });

    it('keeps confirmation busy across a renderer switch and submits the canonical target only once', async () => {
        setBoardPresentation('classic');
        const { gameState, target, other, player } = fixture();
        let resolveAction!: (state: GameState) => void;
        vi.mocked(actions.placeSettlement).mockReturnValueOnce(new Promise<GameState>(resolve => {
            resolveAction = resolve;
        }));
        fireEvent.click(screen.getByRole('button', { name: `Select vertex ${target.id}` }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }));
        await waitFor(() => expect(screen.getByTestId('placement-busy')).toHaveTextContent('true'));

        act(() => setBoardPresentation('three'));
        expect(screen.getByTestId('placement-busy')).toHaveTextContent('true');
        fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }));
        fireEvent.click(screen.getByRole('button', { name: `Select vertex ${other.id}` }));
        expect(screen.getByTestId('pending-target')).toHaveTextContent(target.id);
        expect(actions.placeSettlement).toHaveBeenCalledExactlyOnceWith(gameState.roomId, player.id, target.id);

        await act(async () => { resolveAction(gameState); });
        await waitFor(() => expect(screen.getByTestId('pending-target')).toHaveTextContent('none'));
        expect(screen.getByTestId('placement-busy')).toHaveTextContent('false');
        expect(actions.placeSettlement).toHaveBeenCalledTimes(1);
    });
});
