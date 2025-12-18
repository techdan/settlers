'use client';

import React, { useState, useTransition } from 'react';
import { GameState, DevCardType } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { playDevCard } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';

interface PlayerDevCardsProps {
    gameState: GameState;
    playerId: string;
}

const DEV_CARD_LABELS: Record<DevCardType, string> = {
    knight: 'Knight (Soldier)',
    victory_point: 'Victory Point',
    road_building: 'Road Building',
    year_of_plenty: 'Year of Plenty',
    monopoly: 'Monopoly',
};

const DEV_CARD_DESCRIPTIONS: Record<DevCardType, string> = {
    knight: 'Move the robber.',
    victory_point: '+1 Victory Point.',
    road_building: 'Place 2 roads.',
    year_of_plenty: 'Take 2 resources.',
    monopoly: 'Steal all of one resource.',
};

const DEV_CARD_TOOLTIP_TEXT: Record<DevCardType, { title: string; description: string }> = {
    road_building: {
        title: 'Road Building',
        description:
            'Place 2 roads for free as if you had just built them. You may play this card at any time during your turn.',
    },
    year_of_plenty: {
        title: 'Year of Plenty',
        description:
            'Take any 2 resource cards from the bank (of your choice). You may play this card at any time during your turn.',
    },
    monopoly: {
        title: 'Monopoly',
        description:
            'Name a resource type. All other players give you all their cards of that type. You may play this card at any time during your turn.',
    },
    knight: {
        title: 'Knight (Soldier)',
        description:
            'Move the robber. Steal 1 random resource from a player with a settlement or city adjacent to the hex you move it to. You must move the robber.',
    },
    victory_point: {
        title: 'Victory Point',
        description:
            'Counts as 1 victory point toward the 10 needed to win. Reveal only at game end (keep face down until then)',
    },
};

const devCardTooltipContent = (type: DevCardType) => (
    <div className="space-y-1">
        <div className="font-semibold text-slate-100">{DEV_CARD_TOOLTIP_TEXT[type].title}</div>
        <div className="text-slate-200">{DEV_CARD_TOOLTIP_TEXT[type].description}</div>
    </div>
);

export const PlayerDevCards: React.FC<PlayerDevCardsProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [isPending, startTransition] = useTransition();
    const [selectedCard, setSelectedCard] = useState<DevCardType | null>(null);

    const [resource1, setResource1] = useState<ResourceType>('wood');
    const [resource2, setResource2] = useState<ResourceType>('brick');
    const [monopolyRes, setMonopolyRes] = useState<ResourceType>('ore');

    const timerStatus = useTimerState(gameState);

    if (!player) return null;

    const handlePlay = () => {
        if (!selectedCard) return;
        startTransition(async () => {
            try {
                await playDevCard(gameState.roomId, playerId, selectedCard, {
                    resource1,
                    resource2,
                    monopolyResource: monopolyRes
                });
                setSelectedCard(null);
            } catch (e) {
                console.error("Failed to play dev card", e);
            }
        });
    };

    return (
        <div className="relative p-4 rounded-lg shadow-lg text-white border border-slate-700 w-64 pointer-events-auto flex flex-col h-full overflow-hidden">
            <div className="absolute inset-0 opacity-90 bg-slate-800"></div>
            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: player.color }}></div>

            <h3 className="relative z-10 text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Dev Cards</h3>

            <div className="relative z-10 space-y-2 flex-1 overflow-y-auto max-h-[300px]">
                {(Object.keys(player.devCards) as DevCardType[]).map(type => {
                    const count = player.devCards[type];
                    if (count === 0) return null;
                    const canPlay = type === 'victory_point' || !player.hasPlayedDevCard;

                    return (
                        <div key={type} className="bg-slate-700/50 p-2 rounded border border-slate-600">
                            <Tooltip className="w-full" placement="top" content={devCardTooltipContent(type)}>
                                <div
                                    className={`flex justify-between items-center cursor-pointer ${selectedCard === type ? 'text-blue-400' : ''}`}
                                    onClick={() => setSelectedCard(selectedCard === type ? null : type)}
                                >
                                    <span className="font-bold text-sm">{DEV_CARD_LABELS[type]}</span>
                                    <span className="font-bold">x{count}</span>
                                </div>
                            </Tooltip>

                            {selectedCard === type && (
                                <div className="mt-2 text-xs">
                                    <p className="text-slate-400 mb-2">{DEV_CARD_DESCRIPTIONS[type]}</p>

                                    {type === 'year_of_plenty' && (
                                        <div className="mb-2 space-y-1">
                                            <select value={resource1} onChange={e => setResource1(e.target.value as ResourceType)} className="bg-slate-600 text-white rounded p-1 w-full cursor-pointer">
                                                {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <select value={resource2} onChange={e => setResource2(e.target.value as ResourceType)} className="bg-slate-600 text-white rounded p-1 w-full cursor-pointer">
                                                {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {type === 'monopoly' && (
                                        <div className="mb-2">
                                            <select value={monopolyRes} onChange={e => setMonopolyRes(e.target.value as ResourceType)} className="bg-slate-600 text-white rounded p-1 w-full cursor-pointer">
                                                {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <Tooltip
                                        content={
                                            timerStatus.isLocked
                                                ? "Time expired - cannot play cards"
                                                : !canPlay
                                                    ? "You can only play one development card per turn"
                                                    : "Play"
                                        }
                                        placement="top"
                                    >
                                        <button
                                            onClick={handlePlay}
                                            disabled={isPending || gameState.currentTurn !== playerId || !canPlay || timerStatus.isLocked}
                                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold py-1 px-2 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            {isPending ? 'Playing...' : 'Play'}
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    );
                })}

                {player.devCardsBoughtThisTurn && player.devCardsBoughtThisTurn.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">New (Wait 1 Turn)</h4>
                        <div className="space-y-1">
                            {player.devCardsBoughtThisTurn.map((type, i) => (
                                <Tooltip key={`${type}-${i}`} className="w-full" placement="top" content={devCardTooltipContent(type)}>
                                    <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-slate-400 flex justify-between items-center">
                                        <span className="text-sm">{DEV_CARD_LABELS[type]}</span>
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                )}

                {Object.values(player.devCards).every(c => c === 0) && (!player.devCardsBoughtThisTurn || player.devCardsBoughtThisTurn.length === 0) && (
                    <div className="text-slate-500 text-xs italic">No cards</div>
                )}
            </div>
        </div>
    );
};

