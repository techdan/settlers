import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HexTileData } from '@/core/engine/board/board-generator';
import { BoardPreview } from '../BoardPreview';

type TransformControls = {
    zoomIn: (step?: number) => void;
    zoomOut: (step?: number) => void;
};

type TransformWrapperProps = {
    children: ReactNode | ((controls: TransformControls) => ReactNode);
};

vi.mock('react-zoom-pan-pinch', () => ({
    TransformWrapper: ({ children }: TransformWrapperProps) => (
        <>
            {typeof children === 'function'
                ? children({ zoomIn: vi.fn(), zoomOut: vi.fn() })
                : children}
        </>
    ),
    TransformComponent: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/components/board/BoardControls', () => ({
    BoardControls: () => null
}));

vi.mock('@/themes/tabletop', () => ({
    HexTile: () => <g data-testid="preview-tile" />,
    Port: () => <g data-testid="preview-port" />,
    SeaFrame: () => <g data-testid="preview-sea-frame" />,
    BOARD_VIEWBOX: '-580 -560 1160 1120',
    TT: { sea: '#2f6472' },
}));

const generatedBoard: HexTileData[] = [{
    id: '0,0',
    hex: { q: 0, r: 0, s: 0 },
    terrain: 'forest',
    numberToken: 5
}];

describe('BoardPreview', () => {
    it('switches between empty and generated states without changing hook order', () => {
        const { rerender } = render(<BoardPreview board={[]} />);

        expect(screen.getByText('No board generated yet')).toBeInTheDocument();

        expect(() => {
            rerender(<BoardPreview board={generatedBoard} />);
        }).not.toThrow();
        expect(screen.getByText('Preview Mode')).toBeInTheDocument();
        expect(screen.getByTestId('preview-tile')).toBeInTheDocument();
        expect(screen.getByTestId('preview-sea-frame')).toBeInTheDocument();

        expect(() => {
            rerender(<BoardPreview board={[]} />);
        }).not.toThrow();
        expect(screen.getByText('No board generated yet')).toBeInTheDocument();
    });
});
