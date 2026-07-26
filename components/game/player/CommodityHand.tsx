import React from 'react';
import { PlayerState } from '@/lib/types';
import { CommodityType } from '@/core/rules/commodity-constants';
import { CommodityCardFace } from '@/themes/tabletop/cards';

interface CommodityHandProps {
    player: PlayerState;
}

const COMMODITY_NAMES: Record<CommodityType, string> = {
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin'
};

export const CommodityHand: React.FC<CommodityHandProps> = ({ player }) => {
    // Early return if not in C&K mode (no commodities)
    if (!player.commodities) {
        return null;
    }

    const totalCommodities = Object.values(player.commodities).reduce((a, b) => a + b, 0);

    return (
        <div className="pointer-events-auto rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-4 text-[var(--ui-text)] shadow-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ui-text)]">
                    Your Commodities
                </h3>
                <div className="text-xs text-[var(--ui-muted)]">
                    Total: <span className="font-bold text-[var(--ui-text)]">{totalCommodities}</span>
                </div>
            </div>
            <div className="flex gap-4">
                {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => (
                    <div key={commodity} className="flex flex-col items-center flex-1">
                        <CommodityCardFace type={commodity} width={42} />
                        <div className="mt-1 text-lg font-bold">{player.commodities![commodity] || 0}</div>
                        <div className="text-xs text-[var(--ui-muted)]">{COMMODITY_NAMES[commodity]}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
