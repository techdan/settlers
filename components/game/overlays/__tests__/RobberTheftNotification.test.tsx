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

    it('shows both cards collected with Guild Dues', () => {
        render(
            <RobberTheftNotification
                isOpen
                source="guild_dues"
                stolenItem={null}
                stolenItems={[
                    { type: 'resource', value: 'wood', count: 1 },
                    { type: 'commodity', value: 'cloth', count: 1 },
                ]}
                wasVictim={false}
                victimNames={['Morgan']}
                onDismiss={vi.fn()}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Guild Dues Collected' })).toBeInTheDocument();
        expect(screen.getByText('Wood')).toBeInTheDocument();
        expect(screen.getByText('Cloth')).toBeInTheDocument();
        expect(screen.getByText(/You stole/)).toHaveTextContent('You stole 2 cards from Morgan');
    });

    it('tells a robbed player who stole their card and requires dismissal', () => {
        const onDismiss = vi.fn();
        render(
            <RobberTheftNotification
                isOpen
                source="robber"
                stolenItem={{ type: 'resource', value: 'wheat', count: 1 }}
                wasVictim
                thiefName="Morgan"
                onDismiss={onDismiss}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Resources Stolen!' })).toBeInTheDocument();
        expect(screen.getByText(/Morgan/)?.parentElement).toHaveTextContent('Morgan stole Wheat from you');
        screen.getByRole('button', { name: 'OK' }).click();
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('names a progress card stolen with Espionage', () => {
        render(
            <RobberTheftNotification
                isOpen
                source="espionage"
                stolenItem={{ type: 'progress_card', value: 'road_building_progress', count: 1 }}
                wasVictim
                thiefName="Morgan"
                onDismiss={vi.fn()}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Progress Card Stolen!' })).toBeInTheDocument();
        expect(screen.getAllByText('Road Building')).toHaveLength(2);
    });
});
