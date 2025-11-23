import React from 'react';
import { PlayerState } from '@/lib/game-types';
import { ResourceType } from '@/lib/board-data';

interface PlayerHandProps {
    player: PlayerState;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: '🌲',
    brick: '🧱',
    sheep: '🐑',
    wheat: '🌾',
    ore: '🪨',
    desert: '🌵',
};

export const PlayerHand: React.FC<PlayerHandProps> = ({ player }) => {
    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700">
            <h3 className="text-sm font-bold mb-2 text-slate-300 uppercase tracking-wider">Your Resources</h3>
            <div className="flex gap-4">
                {(Object.keys(player.resources) as ResourceType[]).map(res => {
                    if (res === 'desert') return null;
                    return (
                        <div key={res} className="flex flex-col items-center">
                            <div className="text-2xl mb-1">{RESOURCE_ICONS[res]}</div>
                            <div className="font-bold text-lg">{player.resources[res]}</div>
                            <div className="text-xs text-slate-400 capitalize">{res}</div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-2 border-t border-slate-700 flex justify-between text-sm text-slate-400">
                <div>VP: <span className="text-white font-bold">{player.victoryPoints}</span></div>
                <div>Roads: <span className="text-white font-bold">{player.roadsRemaining}</span></div>
                <div>Settlements: <span className="text-white font-bold">{player.settlementsRemaining}</span></div>
                <div>Cities: <span className="text-white font-bold">{player.citiesRemaining}</span></div>
            </div>
        </div>
    );
};
