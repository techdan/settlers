import React from 'react';
import { PlayerState } from '@/lib/types';
import { CommodityType } from '@/core/rules/commodity-constants';

interface CommodityHandProps {
    player: PlayerState;
}

const COMMODITY_ICONS: Record<CommodityType, string> = {
    paper: '📜',
    cloth: '🧵',
    coin: '🪙'
};

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
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Your Commodities
                </h3>
                <div className="text-xs text-slate-400">
                    Total: <span className="text-white font-bold">{totalCommodities}</span>
                </div>
            </div>
            <div className="flex gap-4">
                {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => (
                    <div key={commodity} className="flex flex-col items-center flex-1">
                        <div className="text-2xl mb-1">{COMMODITY_ICONS[commodity]}</div>
                        <div className="font-bold text-lg">{player.commodities![commodity] || 0}</div>
                        <div className="text-xs text-slate-400">{COMMODITY_NAMES[commodity]}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
