import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RobberTheftNotification } from '../RobberTheftNotification';

describe('RobberTheftNotification', () => {
    it('describes a Wedding transfer as a gift rather than theft', () => {
        render(
            <RobberTheftNotification
                isOpen
                source="wedding"
                stolenItem={{ type: 'resource', value: 'sheep', count: 2 }}
                wasVictim
                thiefName="QA Guest"
                onDismiss={vi.fn()}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Wedding Gift Sent' })).toBeInTheDocument();
        expect(screen.getByText(/You gave/)).toBeInTheDocument();
        expect(screen.queryByText(/stole/i)).not.toBeInTheDocument();
    });
});
