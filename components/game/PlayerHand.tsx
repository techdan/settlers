import React, { useEffect, useState } from 'react';
import { PlayerState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ResourceIcon, CommodityIcon } from '@/components/ui/icons/GameIcon';
import type { ResourceType as IconResourceType, CommodityType as IconCommodityType } from '@/components/ui/icons/GameIcon';

interface PlayerHandProps {
    player: PlayerState;
    roomId: string;
    lastTheft?: {
        victimId?: string;
        thiefId: string;
        items?: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; count: number }[];
        victims?: {
            victimId: string;
            items: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; count: number }[];
        }[];
        timestamp: number;
    };
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, roomId, lastTheft }) => {
    const [visibleTheft, setVisibleTheft] = useState<PlayerHandProps['lastTheft']>();

    // Track the active theft highlight locally so it auto-clears after 5 seconds even if game state doesn't refresh
    useEffect(() => {
        if (!lastTheft) {
            setVisibleTheft(undefined);
            return;
        }

        const elapsed = Date.now() - lastTheft.timestamp;
        const remaining = 5000 - elapsed;
        if (remaining <= 0) {
            setVisibleTheft(undefined);
            return;
        }

        setVisibleTheft(lastTheft);
        const timeout = setTimeout(() => setVisibleTheft(undefined), remaining);
        return () => clearTimeout(timeout);
    }, [lastTheft]);

    const hasCommodities = !!player.commodities;
    const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
    const totalCommodities = player.commodities
        ? Object.values(player.commodities).reduce((a, b) => a + b, 0)
        : 0;
    const theftVictims = visibleTheft?.victims ?? (
        visibleTheft?.victimId
            ? [{ victimId: visibleTheft.victimId, items: visibleTheft.items ?? [] }]
            : []
    );
    const thiefItems = visibleTheft
        ? (visibleTheft.victims ? visibleTheft.victims.flatMap(v => v.items) : visibleTheft.items ?? [])
        : [];

    // Check for active theft highlight
    const getHighlightClass = (type: 'resource' | 'commodity', value: string) => {
        if (!visibleTheft) return '';

        const victimEntry = theftVictims.find(v => v.victimId === player.id);
        const victimItemHit = victimEntry?.items.some(item => item.type === type && item.value === value);
        if (victimEntry && victimItemHit) {
            return 'bg-red-500/40 animate-pulse rounded ring-2 ring-red-500';
        }
        const thiefItemHit = thiefItems.some(item => item.type === type && item.value === value);
        if (visibleTheft.thiefId === player.id && thiefItemHit) {
            return 'bg-green-500/40 animate-pulse rounded ring-2 ring-green-500';
        }
        return '';
    };

    return (
        <div className="relative px-6 py-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto flex items-center gap-2 overflow-hidden">
            <div className="absolute inset-0 opacity-90 bg-slate-800"></div>
            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: player.color }}></div>

            {/* Resources and Commodities in one row */}
            <div className="relative z-10 flex items-center gap-3">
                {/* Resources */}
                {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => (
                    <div key={res} className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition-all duration-300 ${getHighlightClass('resource', res)}`}>
                        <ResourceIcon type={res as IconResourceType} size={44} />
                        <div className="font-mono font-bold text-white text-sm tabular-nums">{player.resources[res] || 0}</div>
                    </div>
                ))}

                {/* Commodities (if in C&K mode) */}
                {hasCommodities && (
                    <>
                        {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => (
                            <div key={commodity} className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition-all duration-300 ${getHighlightClass('commodity', commodity)}`}>
                                <CommodityIcon type={commodity as IconCommodityType} size={44} />
                                <div className="font-mono font-bold text-white text-sm tabular-nums">{player.commodities![commodity] || 0}</div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
