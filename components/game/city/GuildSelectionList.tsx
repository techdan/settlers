import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { CARD_LABELS, CardRow, CardToken, type CardTokenItem } from '@/components/game/ui/CardToken';

export type SelectionMap = Record<string, number>;

export type GuildSelectionItem = {
    type: 'resource' | 'commodity';
    value: ResourceType | CommodityType;
    available: number;
};

/**
 * Whose hand the cards are leaving.
 *
 * `give` — your own cards, on their way out (Wedding). `take` — an opponent's
 * cards, on their way to you (Guild Dues). Same tally, opposite feeling, so the
 * badge and the count tint have to differ.
 */
export type SelectionIntent = 'give' | 'take';

interface GuildSelectionListProps {
    items: GuildSelectionItem[];
    required: number;
    selections: SelectionMap;
    onChange: (next: SelectionMap) => void;
    emptyMessage?: string;
    summaryPrefix?: string;
    intent?: SelectionIntent;
    label?: string;
}

export function getSelectionCount(selections: SelectionMap): number {
    return Object.values(selections).reduce((sum, n) => sum + n, 0);
}

/**
 * Tally a fixed number of cards out of a hand.
 *
 * The composite `type:value` key is kept because both callers decode it when
 * building their payloads — the card kind is derivable from the value, but
 * changing the shape would ripple into two submit paths for no user-visible gain.
 */
export const GuildSelectionList: React.FC<GuildSelectionListProps> = ({
    items,
    required,
    selections,
    onChange,
    emptyMessage = 'No cards available.',
    summaryPrefix = 'Selected',
    intent = 'give',
    label = 'Cards to select'
}) => {
    const selectedCount = getSelectionCount(selections);
    const atLimit = required <= 0 || selectedCount >= required;

    if (!items.length) {
        return <div className="py-3 text-center text-sm text-[var(--ui-muted)]">{emptyMessage}</div>;
    }

    const adjust = (key: string, delta: number) => {
        const next = { ...selections };
        const value = (next[key] || 0) + delta;
        if (value <= 0) delete next[key];
        else next[key] = value;
        onChange(next);
    };

    return (
        <div className="space-y-2">
            <CardRow label={label}>
                {items.map(item => {
                    const key = `${item.type}:${item.value}`;
                    const cardType = item.value as CardTokenItem;
                    const selected = selections[key] || 0;
                    const remaining = Math.max(0, item.available - selected);
                    const exhausted = remaining === 0;

                    return (
                        <CardToken
                            key={key}
                            type={cardType}
                            count={remaining}
                            badge={selected > 0 ? `${intent === 'give' ? '−' : '+'}${selected}` : undefined}
                            badgeTone={intent === 'give' ? 'bad' : 'good'}
                            selected={selected > 0}
                            disabled={exhausted || atLimit}
                            disabledReason={exhausted
                                ? `No more ${CARD_LABELS[cardType]} available`
                                : `You have already chosen ${required}`}
                            trend={selected > 0 ? (intent === 'give' ? 'down' : 'up') : null}
                            onClick={() => adjust(key, 1)}
                            onRemove={selected > 0 ? () => adjust(key, -1) : undefined}
                            removeLabel={`Remove one ${CARD_LABELS[cardType]}`}
                            ariaLabel={`Add one ${CARD_LABELS[cardType]}, chosen ${selected} of ${item.available}`}
                        />
                    );
                })}
            </CardRow>

            {selectedCount > 0 && (
                <div className="text-center text-xs text-[var(--ui-muted)]" aria-live="polite">
                    {summaryPrefix}:{' '}
                    {Object.entries(selections)
                        .map(([key, count]) => `${CARD_LABELS[key.split(':')[1] as CardTokenItem]} x${count}`)
                        .join(', ')}
                </div>
            )}
        </div>
    );
};
