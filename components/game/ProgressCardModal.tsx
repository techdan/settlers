import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { GameState, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';

interface ProgressCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardType: ProgressCardType | null;
    gameState: GameState;
    currentPlayer: PlayerState;
    onPlay: (cardType: ProgressCardType, options: any) => Promise<void>;
}

export const ProgressCardModal: React.FC<ProgressCardModalProps> = ({
    isOpen,
    onClose,
    cardType,
    gameState,
    currentPlayer,
    onPlay
}) => {
    // State for various card parameters
    const [chosenDice1, setChosenDice1] = useState<number>(0);
    const [chosenDice2, setChosenDice2] = useState<number>(0);
    const [resource, setResource] = useState<ResourceType | ''>('');
    const [commodity, setCommodity] = useState<CommodityType | ''>('');
    const [knightId, setKnightId] = useState<string>('');
    const [opponentId, setOpponentId] = useState<string>('');
    const [stolenCard, setStolenCard] = useState<ProgressCardType | ''>('');
    const [error, setError] = useState<string>('');

    if (!isOpen || !cardType) return null;

    const cardMeta = PROGRESS_CARD_DEFINITIONS[cardType];
    const resources: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    const commodities: CommodityType[] = ['paper', 'cloth', 'coin'];
    const alchemyLocked = cardType === 'alchemist' && gameState.phase !== 'waiting_for_roll';

    const handlePlay = async () => {
        let options: any = {};
        setError(''); // Clear previous errors

        if (alchemyLocked) {
            setError('Alchemy can only be played before rolling dice.');
            return;
        }

        switch (cardType) {
            case 'alchemist':
                if (chosenDice1 === 0 || chosenDice2 === 0) {
                    setError('Please select both dice values (1-6)');
                    return;
                }
                options = { chosenDice1, chosenDice2 };
                break;

            case 'resource_monopoly':
                if (!resource) {
                    setError('Please select a resource');
                    return;
                }
                options = { resource };
                break;

            case 'trade_monopoly':
                if (!commodity) {
                    setError('Please select a commodity');
                    return;
                }
                options = { commodity };
                break;

            case 'smith':
                if (!knightId) {
                    setError('Please select a knight');
                    return;
                }
                options = { knightId };
                break;

            case 'treason':
                if (!opponentId || !knightId) {
                    setError('Please select an opponent and their knight');
                    return;
                }
                options = { opponentId, knightId };
                break;

            case 'saboteur':
                if (!opponentId) {
                    setError('Please select an opponent');
                    return;
                }
                options = { opponentId };
                break;

            case 'espionage':
                if (!opponentId || !stolenCard) {
                    setError('Please select an opponent and a card to steal');
                    return;
                }
                options = { opponentId, stolenCard };
                break;

            // For board-selection cards, show message
            case 'inventor':
            case 'irrigation':
            case 'mining':
            case 'merchant':
            case 'diplomat':
            case 'intrigue':
                setError('This card requires board interaction. Close this dialog and click on the board to select the target. Feature coming soon!');
                return;
        }

        try {
            await onPlay(cardType, options);
            onClose();
            resetState();
        } catch (e: any) {
            setError(e.message || 'Failed to play card');
        }
    };

    const resetState = () => {
        setChosenDice1(0);
        setChosenDice2(0);
        setResource('');
        setCommodity('');
        setKnightId('');
        setOpponentId('');
        setStolenCard('');
        setError('');
    };

    const getOwnKnights = () => currentPlayer.knights || [];
    const getOpponents = () => gameState.players.filter(p => p.id !== currentPlayer.id);
    const getOpponentKnights = (oppId: string) => {
        const opponent = gameState.players.find(p => p.id === oppId);
        return opponent?.knights || [];
    };
    const getOpponentCards = (oppId: string) => {
        const opponent = gameState.players.find(p => p.id === oppId);
        return opponent?.progressCards || [];
    };

    const renderCardForm = () => {
        switch (cardType) {
            case 'alchemist':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Red Die (1-6):</label>
                            <select
                                value={chosenDice1}
                                onChange={(e) => setChosenDice1(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                            >
                                <option value="0">Select value</option>
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Yellow Die (1-6):</label>
                            <select
                                value={chosenDice2}
                                onChange={(e) => setChosenDice2(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                            >
                                <option value="0">Select value</option>
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                );


            case 'resource_monopoly':
                return (
                    <div>
                        <label className="text-sm font-medium block mb-1">Select resource:</label>
                        <select
                            value={resource}
                            onChange={(e) => setResource(e.target.value as ResourceType)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value="">Select resource</option>
                            {resources.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                );

            case 'trade_monopoly':
                return (
                    <div>
                        <label className="text-sm font-medium block mb-1">Select commodity:</label>
                        <select
                            value={commodity}
                            onChange={(e) => setCommodity(e.target.value as CommodityType)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value="">Select commodity</option>
                            {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                );

            case 'smith':
                return (
                    <div>
                        <label className="text-sm font-medium block mb-1">Select knight to upgrade:</label>
                        <select
                            value={knightId}
                            onChange={(e) => setKnightId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value="">Select knight</option>
                            {getOwnKnights().map(k => (
                                <option key={k.id} value={k.id}>
                                    {k.level} knight (vertex {k.vertexId})
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'saboteur':
                return (
                    <div>
                        <label className="text-sm font-medium block mb-1">Select opponent (must have 4+ resources):</label>
                        <select
                            value={opponentId}
                            onChange={(e) => setOpponentId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value="">Select opponent</option>
                            {getOpponents().map(p => {
                                const totalRes = Object.values(p.resources).reduce((sum, count) => sum + count, 0);
                                return (
                                    <option key={p.id} value={p.id} disabled={totalRes < 4}>
                                        {p.name} ({totalRes} resources)
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                );

            case 'treason':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Select opponent:</label>
                            <select
                                value={opponentId}
                                onChange={(e) => setOpponentId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                            >
                                <option value="">Select opponent</option>
                                {getOpponents().map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        {opponentId && (
                            <div>
                                <label className="text-sm font-medium block mb-1">Select knight to remove:</label>
                                <select
                                    value={knightId}
                                    onChange={(e) => setKnightId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                >
                                    <option value="">Select knight</option>
                                    {getOpponentKnights(opponentId)
                                        .map(k => (
                                            <option key={k.id} value={k.id}>
                                                {k.level} knight (vertex {k.vertexId})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>
                );

            case 'espionage':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Select opponent:</label>
                            <select
                                value={opponentId}
                                onChange={(e) => setOpponentId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                            >
                                <option value="">Select opponent</option>
                                {getOpponents().map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        {opponentId && (
                            <div>
                                <label className="text-sm font-medium block mb-1">Select card to steal:</label>
                                <select
                                    value={stolenCard}
                                    onChange={(e) => setStolenCard(e.target.value as ProgressCardType)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                >
                                    <option value="">Select card</option>
                                    {getOpponentCards(opponentId).map(c => {
                                        const meta = PROGRESS_CARD_DEFINITIONS[c];
                                        return <option key={c} value={c}>{meta.name}</option>;
                                    })}
                                </select>
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <p className="text-sm text-slate-300">
                        This card does not require any parameters. Click "Play Card" to use it.
                    </p>
                );
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
                        className="ml-4 text-slate-400 hover:text-white transition-colors text-2xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {renderCardForm()}

                    {alchemyLocked && (
                        <div className="mt-4 p-3 bg-amber-900/30 border border-amber-500 rounded text-amber-200 text-sm">
                            Alchemy can only be played before rolling dice. Wait until the start of your turn.
                        </div>
                    )}

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
                        disabled={alchemyLocked}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                            alchemyLocked
                                ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-70'
                                : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                        }`}
                    >
                        Play Card
                    </button>
                </div>
            </div>
        </div>
    );
};
