import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HexTileData } from '@/core/engine/board/board-generator';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import { setBoardPresentation } from '@/lib/hooks/useBoardPresentation';
import { BoardPreview } from '../BoardPreview';

vi.mock('next/dynamic', () => ({
    default: () => function Scene({ gameState, validation, onUnavailable }: BoardRendererProps & { onUnavailable: () => void }) {
        return <div data-testid="three-preview">
            {gameState.board.hexes.map(tile => <span key={tile.id}>{tile.terrain} {tile.numberToken}</span>)}
            <span>Legal targets: {validation.validHexes.size + validation.validEdges.size + validation.validVertices.size}</span>
            <button onClick={onUnavailable}>Lose WebGL context</button>
        </div>;
    },
}));
vi.mock('react-zoom-pan-pinch', () => ({
    TransformWrapper: ({ children }: { children: (controls: { zoomIn: () => void; zoomOut: () => void }) => ReactNode }) => <>{children({ zoomIn: vi.fn(), zoomOut: vi.fn() })}</>,
    TransformComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/board/BoardControls', () => ({ BoardControls: () => null }));
vi.mock('@/themes/tabletop', () => ({
    HexTile: () => <g data-testid="preview-tile" />,
    Port: () => <g />,
    SeaFrame: () => <g />,
    BOARD_VIEWBOX: '-580 -560 1160 1120',
    TT: { sea: '#2f6472' },
}));
const generatedBoard: HexTileData[] = [{
    id: '0,0', hex: { q: 0, r: 0, s: 0 }, terrain: 'forest', numberToken: 5,
}];
beforeEach(() => setBoardPresentation('three'));
afterEach(cleanup);

describe('BoardPreview', () => {
    it('moves between empty and regenerated 3D islands without exposing game actions', () => {
        const { rerender } = render(<BoardPreview board={[]} />);
        expect(screen.getByText('No board generated yet')).toBeInTheDocument();
        rerender(<BoardPreview board={generatedBoard} />);
        expect(screen.getByTestId('three-preview')).toBeInTheDocument();
        expect(screen.getByText('forest 5')).toBeInTheDocument();
        expect(screen.getByText('Legal targets: 0')).toBeInTheDocument();
        expect(screen.queryByTestId('preview-tile')).not.toBeInTheDocument();
        rerender(<BoardPreview board={[{ ...generatedBoard[0], terrain: 'hill', numberToken: 9 }]} />);
        expect(screen.getByText('hill 9')).toBeInTheDocument();
        expect(screen.queryByText('forest 5')).not.toBeInTheDocument();
        rerender(<BoardPreview board={[]} />);
        expect(screen.getByText('No board generated yet')).toBeInTheDocument();
    });

    it('keeps the retained flat preview usable after a graphics failure', () => {
        render(<BoardPreview board={generatedBoard} />);
        fireEvent.click(screen.getByRole('button', { name: 'Lose WebGL context' }));
        expect(screen.getByTestId('preview-tile')).toBeInTheDocument();
        expect(screen.queryByTestId('three-preview')).not.toBeInTheDocument();
    });
});
