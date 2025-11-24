import React, { useTransition } from 'react';
import { PlayerState } from '@/lib/game-types';
import { ResourceType } from '@/lib/board-data';
import { debugGiveResource } from '@/app/actions';

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

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, roomId }) => {
    const [isPending, startTransition] = useTransition();

    const handleDebugAdd = (res: ResourceType) => {
        startTransition(async () => {
            try {
                await debugGiveResource(roomId, player.id, res);
            } catch (e) {
                console.error("Failed to add resource", e);
            }
        });
    };

    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Your Resources</h3>
                <div className="flex gap-1">
                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => (
                        <button
                            key={res}
                            onClick={() => handleDebugAdd(res)}
                            disabled={isPending}
                            className="bg-slate-700 hover:bg-slate-600 text-xs px-1 rounded border border-slate-600"
                            title={`Debug: Add 1 ${res}`}
                        >
                            +{RESOURCE_ICONS[res]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex gap-4">
                {(Object.keys(player.resources) as ResourceType[]).map(res => (
                    <div key={res} className="flex flex-col items-center">
                        <div className="text-2xl mb-1">{RESOURCE_ICONS[res]}</div>
                        <div className="font-bold text-lg">{player.resources[res]}</div>
                        <div className="text-xs text-slate-400 capitalize">{res}</div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-2 border-t border-slate-700 flex justify-between text-sm text-slate-400 gap-4">
                <div>VP: <span className="text-white font-bold">{player.victoryPoints}</span></div>
                <div>Roads: <span className="text-white font-bold">{player.roadsRemaining}</span></div>
                <div>Settlements: <span className="text-white font-bold">{player.settlementsRemaining}</span></div>
                <div>Cities: <span className="text-white font-bold">{player.citiesRemaining}</span></div>
            </div>
        </div>
    );
};
