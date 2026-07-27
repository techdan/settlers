import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InteractionOption } from '@/core/engine/progress/types/CardInteraction';
import { CardPicker } from '../CardPicker';

const RESOURCE_OPTIONS: InteractionOption[] = [
    { id: 'wood', label: 'Wood' },
    { id: 'brick', label: 'Brick' },
    { id: 'sheep', label: 'Sheep' },
    { id: 'wheat', label: 'Wheat' },
    { id: 'ore', label: 'Ore' },
];

const COMMODITY_OPTIONS: InteractionOption[] = [
    { id: 'paper', label: 'Paper' },
    { id: 'cloth', label: 'Cloth' },
    { id: 'coin', label: 'Coin' },
];

const group = () => screen.getByRole('radiogroup', { name: 'Choose a card' });

describe('CardPicker — single pick', () => {
    it('draws resource and commodity options through the same component', () => {
        const { rerender } = render(
            <CardPicker options={RESOURCE_OPTIONS} selections={[]} onSelectionsChange={vi.fn()} />
        );
        expect(within(group()).getAllByRole('radio')).toHaveLength(5);

        rerender(
            <CardPicker options={COMMODITY_OPTIONS} selections={[]} onSelectionsChange={vi.fn()} />
        );
        expect(within(group()).getAllByRole('radio')).toHaveLength(3);
        expect(within(group()).getByRole('radio', { name: 'Paper' })).toBeInTheDocument();
    });

    it('reports the chosen card as a single selection', async () => {
        const user = userEvent.setup();
        const onSelectionsChange = vi.fn();
        render(
            <CardPicker options={RESOURCE_OPTIONS} selections={[]} onSelectionsChange={onSelectionsChange} />
        );

        await user.click(within(group()).getByRole('radio', { name: 'Ore' }));

        expect(onSelectionsChange).toHaveBeenCalledWith(['ore']);
    });

    it('marks exactly one radio as checked', () => {
        render(
            <CardPicker options={RESOURCE_OPTIONS} selections={['wheat']} onSelectionsChange={vi.fn()} />
        );

        expect(within(group()).getByRole('radio', { name: 'Wheat' })).toBeChecked();
        expect(within(group()).getByRole('radio', { name: 'Wood' })).not.toBeChecked();
    });

    it('is a single tab stop that lands on the current choice', async () => {
        const user = userEvent.setup();
        render(
            <CardPicker options={RESOURCE_OPTIONS} selections={['sheep']} onSelectionsChange={vi.fn()} />
        );

        await user.tab();

        expect(within(group()).getByRole('radio', { name: 'Sheep' })).toHaveFocus();
        // The other four are out of the tab order — the group is one stop, not five.
        expect(within(group()).getByRole('radio', { name: 'Wood' })).toHaveAttribute('tabindex', '-1');
    });

    it('moves selection with the arrow keys, wrapping at the ends', async () => {
        const user = userEvent.setup();
        const onSelectionsChange = vi.fn();
        render(
            <CardPicker options={RESOURCE_OPTIONS} selections={['wood']} onSelectionsChange={onSelectionsChange} />
        );

        await user.tab();
        await user.keyboard('{ArrowRight}');
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['brick']);

        // wood is first, so ArrowLeft wraps to the last card
        await user.keyboard('{ArrowLeft}');
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['ore']);
    });

    it('jumps to the ends with Home and End', async () => {
        const user = userEvent.setup();
        const onSelectionsChange = vi.fn();
        render(
            <CardPicker options={RESOURCE_OPTIONS} selections={['sheep']} onSelectionsChange={onSelectionsChange} />
        );

        await user.tab();
        await user.keyboard('{End}');
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['ore']);

        await user.keyboard('{Home}');
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['wood']);
    });

    it('skips disabled cards when arrowing and explains why they are out', async () => {
        const user = userEvent.setup();
        const onSelectionsChange = vi.fn();
        const options: InteractionOption[] = [
            { id: 'wood', label: 'Wood' },
            { id: 'brick', label: 'Brick', disabled: true, disabledReason: 'No opponent holds Brick' },
            { id: 'sheep', label: 'Sheep' },
        ];
        render(<CardPicker options={options} selections={['wood']} onSelectionsChange={onSelectionsChange} />);

        expect(within(group()).getByRole('radio', { name: 'Brick' })).toBeDisabled();
        expect(within(group()).getByRole('radio', { name: 'Brick' }))
            .toHaveAttribute('title', 'No opponent holds Brick');

        await user.tab();
        await user.keyboard('{ArrowRight}');

        expect(onSelectionsChange).toHaveBeenLastCalledWith(['sheep']);
    });

    it('ignores options that are not cards', () => {
        render(
            <CardPicker
                options={[...RESOURCE_OPTIONS, { id: 'nothing', label: 'Decline' }]}
                selections={[]}
                onSelectionsChange={vi.fn()}
            />
        );

        expect(within(group()).getAllByRole('radio')).toHaveLength(5);
        expect(screen.queryByRole('radio', { name: 'Decline' })).not.toBeInTheDocument();
    });

    it('says so when a card definition offers nothing pickable', () => {
        render(<CardPicker options={[]} selections={[]} onSelectionsChange={vi.fn()} />);

        expect(screen.getByText('No cards available.')).toBeInTheDocument();
    });
});

describe('CardPicker — multiple picks', () => {
    it('toggles independently and stops at the limit', async () => {
        const user = userEvent.setup();
        const onSelectionsChange = vi.fn();
        const { rerender } = render(
            <CardPicker
                options={RESOURCE_OPTIONS}
                selections={[]}
                onSelectionsChange={onSelectionsChange}
                maxSelections={2}
            />
        );

        // Toggles, not radios — several can be on at once.
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Wood' }));
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['wood']);

        rerender(
            <CardPicker
                options={RESOURCE_OPTIONS}
                selections={['wood', 'ore']}
                onSelectionsChange={onSelectionsChange}
                maxSelections={2}
            />
        );

        expect(screen.getByText('Selected: 2 / 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Brick' })).toBeDisabled();
        // An already-chosen card stays clickable so it can be taken back off.
        expect(screen.getByRole('button', { name: 'Wood' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Wood' }));
        expect(onSelectionsChange).toHaveBeenLastCalledWith(['ore']);
    });
});
