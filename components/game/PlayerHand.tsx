import React from 'react';
import { PlayerState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { CommodityType } from '@/core/rules/commodity-constants';

interface PlayerHandProps {
    player: PlayerState;
    roomId: string;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: '🌲',
    brick: '🧱',
    sheep: '🐑',
    wheat: '🌾',
    ore: '🪨'
};

const COMMODITY_ICONS: Record<CommodityType, string> = {
    paper: '📜',
    cloth: '🧵',
    coin: '🪙'
};

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, roomId }) => {
    const hasCommodities = !!player.commodities;
    const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
    const totalCommodities = player.commodities
        ? Object.values(player.commodities).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <div className="bg-slate-800/90 px-6 py-3 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto flex items-center gap-3">
            {/* Resources */}
            <div className="flex items-center gap-1">
                {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => (
                    <div key={res} className="flex items-center gap-1 px-2">
                        <div className="text-xl">{RESOURCE_ICONS[res]}</div>
                        <div className="font-bold">{player.resources[res] || 0}</div>
                    </div>
                ))}
                <div className="text-xs text-slate-400 ml-1">
                    ({totalResources})
                </div>
            </div>

            {/* Commodities (if in C&K mode) */}
            {hasCommodities && (
                <>
                    <div className="h-8 border-l border-slate-600"></div>
                    <div className="flex items-center gap-1">
                        {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => (
                            <div key={commodity} className="flex items-center gap-1 px-2">
                                <div className="text-xl">{COMMODITY_ICONS[commodity]}</div>
                                <div className="font-bold">{player.commodities![commodity] || 0}</div>
                            </div>
                        ))}
                        <div className="text-xs text-slate-400 ml-1">
                            ({totalCommodities})
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
