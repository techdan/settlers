import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPlayer } from '@/lib/test-utils';
import { DebugPanel } from '../DebugPanel';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    debugGiveResource: vi.fn(),
    debugGiveCommodity: vi.fn(),
    debugGiveProgressCard: vi.fn(),
    debugGiveDevCard: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/app/actions', () => ({
    debugGiveResource: mocks.debugGiveResource,
    debugGiveCommodity: mocks.debugGiveCommodity,
    debugGiveProgressCard: mocks.debugGiveProgressCard,
    debugGiveDevCard: mocks.debugGiveDevCard,
}));

describe('DebugPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.debugGiveResource.mockResolvedValue(undefined);
    });

    it('grants the selected resource and reports success', async () => {
        const user = userEvent.setup();
        const player = createTestPlayer({ id: 'player-qa' });

        render(<DebugPanel player={player} roomId="ROOM" />);

        const [, itemSelect] = screen.getAllByRole('combobox');
        await user.selectOptions(itemSelect, 'wood');
        await user.click(screen.getByRole('button', { name: 'Give' }));

        await waitFor(() => {
            expect(mocks.debugGiveResource).toHaveBeenCalledWith('ROOM', 'player-qa', 'wood');
        });
        expect(await screen.findByRole('status')).toHaveTextContent('Granted 1 wood');
        expect(mocks.refresh).toHaveBeenCalledOnce();
    });
});
