import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TabletopCommodityIcon, TabletopResourceIcon } from '@/themes/tabletop';

export type SelectionMap = Record<string, number>;

export type GuildSelectionItem = {
    type: 'resource' | 'commodity';
    value: ResourceType | CommodityType;
    available: number;
};

interface GuildSelectionListProps {
    items: GuildSelectionItem[];
    required: number;
    selections: SelectionMap;
    onChange: (next: SelectionMap) => void;
    emptyMessage?: string;
    summaryPrefix?: string;
}

export function getSelectionCount(selections: SelectionMap): number {
    return Object.values(selections).reduce((sum, n) => sum + n, 0);
}

export const GuildSelectionList: React.FC<GuildSelectionListProps> = ({
    items,
    required,
    selections,
    onChange,
    emptyMessage = 'No cards available.',
    summaryPrefix = 'Selected'
}) => {
    const selectedCount = getSelectionCount(selections);
    const atLimit = required <= 0 || selectedCount >= required;

    if (!items.length) {
        return <div className="py-3 text-center text-sm text-[var(--ui-muted)]">{emptyMessage}</div>;
    }

    return (
        <div className="space-y-2">
            {items.map(item => {
                const key = `${item.type}:${item.value}`;
                const selected = selections[key] || 0;
                const remaining = Math.max(0, item.available - selected);
                const disableMinus = selected === 0;
                const disablePlus = remaining === 0 || atLimit;

                return (
                    <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            {item.type === 'resource' ? (
                                <TabletopResourceIcon type={item.value as ResourceType} size={24} label={item.value} />
                            ) : (
                                <TabletopCommodityIcon type={item.value as CommodityType} size={24} label={item.value} />
                            )}
                            <span
                                className={`capitalize ${
                                    selected > 0 ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'
                                }`}
                            >
                                {item.value} ({remaining})
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                aria-label={`Remove one ${item.value}`}
                                className={`h-8 w-8 rounded border text-lg font-bold leading-none transition-colors ${
                                    disableMinus
                                        ? 'cursor-not-allowed border-[var(--ui-border)] text-[var(--ui-muted)] opacity-50'
                                        : 'cursor-pointer border-[var(--ui-border)] text-[var(--ui-text)] hover:border-[var(--ui-accent)] hover:bg-[var(--ui-panel-solid)]'
                                }`}
                                onClick={() => {
                                    if (disableMinus) return;
                                    const next = { ...selections };
                                    next[key] = Math.max(0, (next[key] || 0) - 1);
                                    if (next[key] === 0) delete next[key];
                                    onChange(next);
                                }}
                                disabled={disableMinus}
                            >
                                -
                            </button>
                            <span className="w-5 text-center text-sm text-[var(--ui-text)]">{selected}</span>
                            <button
                                type="button"
                                aria-label={`Add one ${item.value}`}
                                className={`h-8 w-8 rounded border text-lg font-bold leading-none transition-colors ${
                                    disablePlus
                                        ? 'cursor-not-allowed border-[var(--ui-border)] text-[var(--ui-muted)] opacity-50'
                                        : 'cursor-pointer border-[var(--ui-accent)] text-[var(--ui-text)] hover:bg-[color-mix(in_oklab,var(--ui-accent)_18%,var(--ui-panel-raised))]'
                                }`}
                                onClick={() => {
                                    if (disablePlus) return;
                                    const next = {
                                        ...selections,
                                        [key]: (selections[key] || 0) + 1
                                    };
                                    onChange(next);
                                }}
                                disabled={disablePlus}
                            >
                                +
                            </button>
                        </div>
                    </div>
                );
            })}
            {selectedCount > 0 && (
                <div className="text-xs text-[var(--ui-muted)]">
                    {summaryPrefix}:{' '}
                    {Object.entries(selections)
                        .map(([key, count]) => `${key.split(':')[1]} x${count}`)
                        .join(', ')}
                </div>
            )}
        </div>
    );
};
