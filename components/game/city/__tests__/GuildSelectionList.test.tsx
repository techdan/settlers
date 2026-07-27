import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    GuildSelectionList,
    getSelectionCount,
    type GuildSelectionItem,
    type SelectionMap,
} from '../GuildSelectionList';

const HAND: GuildSelectionItem[] = [
    { type: 'resource', value: 'wood', available: 3 },
    { type: 'resource', value: 'ore', available: 1 },
    { type: 'commodity', value: 'paper', available: 2 },
];

function renderList(overrides: {
    selections?: SelectionMap;
    required?: number;
    intent?: 'give' | 'take';
    items?: GuildSelectionItem[];
} = {}) {
    const onChange = vi.fn();
    render(
        <GuildSelectionList
            items={overrides.items ?? HAND}
            required={overrides.required ?? 2}
            selections={overrides.selections ?? {}}
            onChange={onChange}
            intent={overrides.intent}
            label="Cards"
        />
    );
    return onChange;
}

const row = () => screen.getByRole('group', { name: 'Cards' });

describe('GuildSelectionList', () => {
    it('draws resources and commodities from one hand together', () => {
        renderList();

        expect(within(row()).getAllByRole('button')).toHaveLength(3);
        expect(within(row()).getByRole('button', { name: /Add one Paper/ })).toBeInTheDocument();
    });

    it('keeps the composite key both callers decode into their payloads', async () => {
        const user = userEvent.setup();
        const onChange = renderList();

        await user.click(within(row()).getByRole('button', { name: /Add one Paper/ }));

        expect(onChange).toHaveBeenCalledWith({ 'commodity:paper': 1 });
    });

    it('counts down what is left of each card', () => {
        renderList({ selections: { 'resource:wood': 2 } });

        expect(
            within(row()).getByRole('button', { name: 'Add one Wood, chosen 2 of 3' })
        ).toBeInTheDocument();
    });

    it('closes cards once the required number is chosen', () => {
        renderList({ selections: { 'resource:wood': 2 }, required: 2 });

        const ore = within(row()).getByRole('button', { name: /Add one Ore/ });
        expect(ore).toBeDisabled();
        expect(ore).toHaveAttribute('title', 'You have already chosen 2');
    });

    it('closes a card once its stock is exhausted', () => {
        renderList({ selections: { 'resource:ore': 1 }, required: 2 });

        const ore = within(row()).getByRole('button', { name: /Add one Ore/ });
        expect(ore).toBeDisabled();
        expect(ore).toHaveAttribute('title', 'No more Ore available');
    });

    it('removes a card and drops the key rather than leaving a zero', async () => {
        const user = userEvent.setup();
        const onChange = renderList({ selections: { 'resource:wood': 1 } });

        await user.click(within(row()).getByRole('button', { name: 'Remove one Wood' }));

        expect(onChange).toHaveBeenCalledWith({});
    });

    it('reads as loss when giving and as gain when taking', () => {
        const { unmount } = render(
            <GuildSelectionList
                items={HAND}
                required={2}
                selections={{ 'resource:wood': 1 }}
                onChange={vi.fn()}
                intent="give"
                label="Cards"
            />
        );
        expect(screen.getByText('−1')).toBeInTheDocument();
        unmount();

        render(
            <GuildSelectionList
                items={HAND}
                required={2}
                selections={{ 'resource:wood': 1 }}
                onChange={vi.fn()}
                intent="take"
                label="Cards"
            />
        );
        expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('says so when there is nothing to choose from', () => {
        renderList({ items: [] });

        expect(screen.getByText('No cards available.')).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Cards' })).not.toBeInTheDocument();
    });

    it('summarises the tally with proper card names', () => {
        renderList({ selections: { 'resource:wood': 2 } });

        expect(screen.getByText(/Selected: Wood x2/)).toBeInTheDocument();
    });
});

describe('getSelectionCount', () => {
    it('totals every card in the tally', () => {
        expect(getSelectionCount({ 'resource:wood': 2, 'commodity:paper': 1 })).toBe(3);
        expect(getSelectionCount({})).toBe(0);
    });
});
