import React, { useEffect, useState } from 'react';
import { PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { CardStack, ResourceCardFace, CommodityCardFace } from '@/themes/tabletop';

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
        // De-paneled for the unified GameTray: the tray provides the warm chrome,
        // so no slate panel / player-color wash here. Theft highlight + the
        // resource↔commodity divider are preserved.
        <div className={`relative flex items-center pointer-events-auto ${!hasCommodities ? 'w-full' : ''}`}>
            {/* Resources and Commodities as card stacks in one row */}
            <div className={`relative flex items-start ${!hasCommodities ? 'w-full justify-evenly' : 'gap-2.5'}`}>
                {/* Resources */}
                {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => (
                    <div key={res} className={`px-1.5 py-1.5 rounded transition-all duration-300 ${getHighlightClass('resource', res)}`}>
                        <CardStack count={player.resources[res] || 0} width={46}>
                            <ResourceCardFace type={res} width={46} />
                        </CardStack>
                    </div>
                ))}

                {/* Commodities (if in C&K mode) */}
                {hasCommodities && (
                    <>
                        <div className="self-stretch w-px bg-white/15 mx-0.5" />
                        {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => (
                            <div key={commodity} className={`px-1.5 py-1.5 rounded transition-all duration-300 ${getHighlightClass('commodity', commodity)}`}>
                                <CardStack count={player.commodities![commodity] || 0} width={46}>
                                    <CommodityCardFace type={commodity} width={46} />
                                </CardStack>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
