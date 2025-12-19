import React, { useState } from 'react';
import { DevCardType } from '@/lib/types/player';
import { GameState, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { Tooltip } from '@/components/ui/tooltip';

interface DevCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardType: DevCardType | null;
    gameState: GameState;
    currentPlayer: PlayerState;
    onPlay: (cardType: DevCardType, options: any) => Promise<void>;
}

const DEV_CARD_DEFINITIONS: Record<DevCardType, { name: string; description: string }> = {
    knight: {
        name: 'Knight (Soldier)',
        description: 'Move the robber. Steal 1 random resource from a player with a settlement or city adjacent to the hex you move it to.'
    },
    victory_point: {
        name: 'Victory Point',
        description: 'Counts as 1 victory point toward the 10 needed to win. Reveal to claim your victory!'
    },
    road_building: {
        name: 'Road Building',
        description: 'Place 2 roads for free as if you had just built them.'
    },
    year_of_plenty: {
        name: 'Year of Plenty',
        description: 'Take any 2 resource cards from the bank (of your choice).'
    },
    monopoly: {
        name: 'Monopoly',
        description: 'Name a resource type. All other players give you all their cards of that type.'
    }
};

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

const RESOURCE_COLORS: Record<ResourceType, string> = {
    wood: 'bg-green-700 border-green-500',
    brick: 'bg-red-700 border-red-500',
    sheep: 'bg-lime-600 border-lime-400',
    wheat: 'bg-yellow-600 border-yellow-400',
    ore: 'bg-gray-600 border-gray-400'
};

export const DevCardModal: React.FC<DevCardModalProps> = ({
    isOpen,
    onClose,
    cardType,
    gameState,
    currentPlayer,
    onPlay
}) => {
    const [resource1, setResource1] = useState<ResourceType>('wood');
    const [resource2, setResource2] = useState<ResourceType>('brick');
    const [monopolyRes, setMonopolyRes] = useState<ResourceType>('ore');
    const [error, setError] = useState<string>('');

    if (!isOpen || !cardType) return null;

    const cardMeta = DEV_CARD_DEFINITIONS[cardType];

    const resetState = () => {
        setResource1('wood');
        setResource2('brick');
        setMonopolyRes('ore');
        setError('');
    };

    const handlePlay = async () => {
        let options: any = {};
        setError('');

        switch (cardType) {
            case 'year_of_plenty':
                options = { resource1, resource2 };
                break;

            case 'monopoly':
                options = { monopolyResource: monopolyRes };
                break;

            case 'knight':
            case 'road_building':
            case 'victory_point':
                // No options needed - these cards have follow-up actions or immediate effects
                break;
        }

        try {
            await onPlay(cardType, options);
            onClose();
            resetState();
        } catch (e: any) {
            setError(e.message || 'Failed to play card');
        }
    };

    const renderCardForm = () => {
        switch (cardType) {
            case 'year_of_plenty':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">First Resource:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setResource1(r)}
                                        className={`px-3 py-2 rounded border-2 transition-all capitalize text-sm cursor-pointer ${
                                            resource1 === r
                                                ? `${RESOURCE_COLORS[r]} ring-2 ring-white`
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-2">Second Resource:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setResource2(r)}
                                        className={`px-3 py-2 rounded border-2 transition-all capitalize text-sm cursor-pointer ${
                                            resource2 === r
                                                ? `${RESOURCE_COLORS[r]} ring-2 ring-white`
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-slate-300 mt-2">
                            You will receive <span className="font-semibold text-emerald-300">1 {resource1}</span> and <span className="font-semibold text-emerald-300">1 {resource2}</span> from the bank.
                        </p>
                    </div>
                );

            case 'monopoly': {
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">Select Resource to Monopolize:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setMonopolyRes(r)}
                                        className={`px-3 py-2 rounded border-2 transition-all capitalize text-sm cursor-pointer ${
                                            monopolyRes === r
                                                ? `${RESOURCE_COLORS[r]} ring-2 ring-white`
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-200">
                            All other players must give you all of their <span className="font-semibold text-emerald-300">{monopolyRes}</span>.
                        </p>
                    </div>
                );
            }

            case 'knight':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            Playing this card will move the robber. You must relocate it to a different hex and may steal a resource from an adjacent player.
                        </p>
                        <p className="text-xs text-slate-300">
                            This counts toward the Largest Army bonus (3+ knights).
                        </p>
                        <p className="text-xs text-slate-300">
                            Your current knight count: <span className="font-semibold text-blue-300">{currentPlayer.knightsPlayed || 0}</span>
                        </p>
                    </div>
                );

            case 'victory_point':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            Reveal this victory point card to claim <span className="font-semibold text-emerald-300">+1 Victory Point</span>!
                        </p>
                        <p className="text-xs text-slate-300">
                            Once revealed, this point is permanent and visible to all players.
                        </p>
                    </div>
                );

            case 'road_building':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            Place <span className="font-semibold text-emerald-300">2 roads</span> for free as if you had just built them.
                        </p>
                        <p className="text-xs text-slate-300">
                            After playing this card, select road locations on the board.
                        </p>
                        <p className="text-xs text-slate-300">
                            Roads remaining: <span className="font-semibold text-blue-300">{currentPlayer.roadsRemaining}</span>
                        </p>
                        {currentPlayer.roadsRemaining < 2 && (
                            <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-600 rounded px-3 py-2">
                                You only have {currentPlayer.roadsRemaining} road{currentPlayer.roadsRemaining === 1 ? '' : 's'} remaining, so you will only place {currentPlayer.roadsRemaining}.
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <p className="text-sm text-slate-300">
                        Click "Play Card" to use this card.
                    </p>
                );
        }
    };

    const getActionLabel = () => {
        switch (cardType) {
            case 'year_of_plenty':
                return 'Take Resources';
            case 'monopoly':
                return 'Monopolize';
            case 'knight':
                return 'Move Robber';
            case 'victory_point':
                return 'Reveal';
            case 'road_building':
                return 'Place Roads';
            default:
                return 'Play Card';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full mx-4 text-white">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{cardMeta.name}</h2>
                        <p className="text-sm text-slate-300 mt-1">{cardMeta.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 text-slate-400 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {renderCardForm()}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePlay}
                        className="px-4 py-2 rounded font-medium transition-colors bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                    >
                        {getActionLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
};
