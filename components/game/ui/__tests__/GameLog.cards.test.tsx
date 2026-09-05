import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLog } from '../GameLog';
import { getLogCardDescription } from '@/lib/utils/log-card-description';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { DEV_CARD_DEFINITIONS } from '@/core/rules/dev-card-definitions';

describe('card explanations in the game log', () => {
    beforeEach(() => { Element.prototype.scrollTo = vi.fn(); });

    it('shows the card rules when hovering a saved play entry', async () => {
        render(<GameLog logs={[{ id: '1', timestamp: 1000, message: 'Pa played Alchemy' }]} />);
        fireEvent.mouseEnter(screen.getByText('Pa played Alchemy'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(PROGRESS_CARD_DEFINITIONS.alchemist.description);
    });

    it('recognizes every progress card and base development card play', () => {
        for (const card of Object.values(PROGRESS_CARD_DEFINITIONS)) {
            expect(getLogCardDescription(`Pa played ${card.name}`)?.description).toBe(card.description);
        }
        for (const [type, card] of Object.entries(DEV_CARD_DEFINITIONS)) {
            expect(getLogCardDescription(`Dash played a ${type.replaceAll('_', ' ')} card`)?.description).toBe(card.description);
        }
        expect(getLogCardDescription('Kaius played Road Building and placed 2 roads')?.name).toBe('Road Building');
        expect(getLogCardDescription('Pa revealed Printing for +1 VP!')?.name).toBe('Printing');
    });

    it('does not infer hidden cards or attach explanations to unrelated log entries', () => {
        expect(getLogCardDescription('Pa drew a science progress card')).toBeUndefined();
        expect(getLogCardDescription('Pa bought a development card')).toBeUndefined();
        expect(getLogCardDescription('Pa built a road')).toBeUndefined();
    });
});
