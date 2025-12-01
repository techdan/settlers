import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';

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
        return <div className="text-sm text-amber-200">{emptyMessage}</div>;
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
                        className="flex items-center justify-between px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className={`capitalize ${
                                    selected > 0 ? 'text-red-200' : 'text-slate-100'
                                }`}
                            >
                                {item.value} ({remaining})
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className={`w-8 h-8 rounded border text-lg leading-none font-bold transition-colors ${
                                    disableMinus
                                        ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                        : 'border-slate-500 text-white hover:bg-slate-700 cursor-pointer'
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
                            <span className="text-sm text-slate-200 w-5 text-center">{selected}</span>
                            <button
                                type="button"
                                className={`w-8 h-8 rounded border text-lg leading-none font-bold transition-colors ${
                                    disablePlus
                                        ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                        : 'border-emerald-400 text-white hover:bg-emerald-600 cursor-pointer'
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
                <div className="text-xs text-slate-300">
                    {summaryPrefix}:{' '}
                    {Object.entries(selections)
                        .map(([key, count]) => `${key.split(':')[1]} x${count}`)
                        .join(', ')}
                </div>
            )}
        </div>
    );
};
