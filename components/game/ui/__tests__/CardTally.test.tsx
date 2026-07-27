import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardTally, cardCountsFrom, cardCountsTotal } from '../CardToken';

describe('cardCountsFrom', () => {
    it('folds the engine\'s split records into one tally, dropping zeroes', () => {
        const counts = cardCountsFrom(
            { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 1 },
            { paper: 1, cloth: 0, coin: 0 }
        );

        expect(counts).toEqual({ wood: 2, ore: 1, paper: 1 });
    });

    it('handles a missing commodity record', () => {
        expect(cardCountsFrom({ wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 }))
            .toEqual({ wood: 1 });
    });

    it('totals a tally', () => {
        expect(cardCountsTotal({ wood: 2, ore: 1 })).toBe(3);
        expect(cardCountsTotal({})).toBe(0);
    });
});

describe('CardTally', () => {
    it('writes a set of cards as counts, icons, and names', () => {
        render(<CardTally counts={{ wood: 2, ore: 1 }} />);

        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Wood')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Ore')).toBeInTheDocument();
    });

    it('names resources and commodities the same way', () => {
        render(<CardTally counts={{ sheep: 1, paper: 3 }} />);

        expect(screen.getByText('Sheep')).toBeInTheDocument();
        expect(screen.getByText('Paper')).toBeInTheDocument();
    });

    it('says nothing rather than rendering an empty strip', () => {
        render(<CardTally counts={{}} />);

        expect(screen.getByText('nothing')).toBeInTheDocument();
    });

    it('takes a caller-supplied empty label', () => {
        render(<CardTally counts={{}} emptyLabel="No cards" />);

        expect(screen.getByText('No cards')).toBeInTheDocument();
    });

    it('omits cards whose count is zero', () => {
        render(<CardTally counts={{ wood: 1, ore: 0 }} />);

        expect(screen.getByText('Wood')).toBeInTheDocument();
        expect(screen.queryByText('Ore')).not.toBeInTheDocument();
    });
});
