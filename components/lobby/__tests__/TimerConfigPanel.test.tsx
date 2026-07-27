import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMER_CONFIG } from '@/lib/types/timer';
import { TimerConfigPanel } from '../TimerConfigPanel';

describe('TimerConfigPanel', () => {
    it('refreshes its editable draft when authoritative config changes', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <TimerConfigPanel
                config={DEFAULT_TIMER_CONFIG}
                isHost
                onChange={onChange}
            />
        );

        expect(screen.queryAllByRole('slider')).toHaveLength(0);

        rerender(
            <TimerConfigPanel
                config={{
                    ...DEFAULT_TIMER_CONFIG,
                    enabled: true,
                    turnTimeLimit: 150,
                    timeBank: 450,
                }}
                isHost
                onChange={onChange}
            />
        );

        const sliders = screen.getAllByRole('slider');
        expect(sliders).toHaveLength(2);
        expect(sliders[0]).toHaveValue('150');
        expect(sliders[1]).toHaveValue('450');
    });
});
