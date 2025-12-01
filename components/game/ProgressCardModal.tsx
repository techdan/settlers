import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { GameState, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { getCanonicalVertexId } from '@/lib/hex';

function calculateIrrigationGain(gameState: GameState, playerId: string) {
    let fieldCount = 0;
    const fieldHexes = (gameState.board.hexes || []).filter((hex: any) => hex.terrain === 'field');

    for (const hex of fieldHexes) {
        const [q, r] = (hex.id || '').split(',').map(Number);
        if (Number.isNaN(q) || Number.isNaN(r)) continue;
        const adjacentVertices = Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));

        const hasAdjacentBuilding = adjacentVertices.some((vertexId: string) => {
            const vertex = gameState.board.vertices[vertexId];
            return (
                vertex &&
                vertex.owner === playerId &&
                (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis')
            );
        });

        if (hasAdjacentBuilding) {
            fieldCount += 1;
        }
    }

    return { fieldCount, wheatGained: fieldCount * 2 };
}

function calculateMiningGain(gameState: GameState, playerId: string) {
    let mountainCount = 0;
    const mountainHexes = (gameState.board.hexes || []).filter((hex: any) => hex.terrain === 'mountain');

    for (const hex of mountainHexes) {
        const [q, r] = (hex.id || '').split(',').map(Number);
        if (Number.isNaN(q) || Number.isNaN(r)) continue;
        const adjacentVertices = Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));

        const hasAdjacentBuilding = adjacentVertices.some((vertexId: string) => {
            const vertex = gameState.board.vertices[vertexId];
            return (
                vertex &&
                vertex.owner === playerId &&
                (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis')
            );
        });

        if (hasAdjacentBuilding) {
            mountainCount += 1;
        }
    }

    return { mountainCount, oreGained: mountainCount * 2 };
}

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
    const [merchantFleetChoice, setMerchantFleetChoice] = useState<ResourceType | CommodityType | ''>('');
    const [knightId, setKnightId] = useState<string>('');
    const [opponentId, setOpponentId] = useState<string>('');
    const [stolenCard, setStolenCard] = useState<ProgressCardType | ''>('');
    const [error, setError] = useState<string>('');
    const [guildSelections, setGuildSelections] = useState<Record<string, number>>({});

    if (!isOpen || !cardType) return null;

    const cardMeta = PROGRESS_CARD_DEFINITIONS[cardType];
    const resources: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    const commodities: CommodityType[] = ['paper', 'cloth', 'coin'];
    const alchemyLocked = cardType === 'alchemist' && gameState.phase !== 'waiting_for_roll';
    const irrigationStats = cardType === 'irrigation' ? calculateIrrigationGain(gameState, currentPlayer.id) : null;
    const miningStats = cardType === 'mining' ? calculateMiningGain(gameState, currentPlayer.id) : null;

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

            case 'merchant_fleet':
                if (!merchantFleetChoice) {
                    setError('Please select a resource or commodity');
                    return;
                }
                options = { tradeItem: merchantFleetChoice };
                break;

            case 'smith':
                setError('Select knights directly on the board to use Smithing.');
                return;

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

            case 'guild_dues':
                if (!opponentId) {
                    setError('Please select an opponent with more VPs than you.');
                    return;
                }
                {
                    const totalAvailable = getOpponentHandSize(opponentId);
                    if (totalAvailable === 0) {
                        setError('Opponent has no cards to take.');
                        return;
                    }
                    const required = Math.min(2, Math.max(1, totalAvailable));
                    const selectionsArray = Object.entries(guildSelections).flatMap(([key, count]) => {
                        const [type, value] = key.split(':');
                        return Array.from({ length: count }, () => ({ type, value }));
                    });
                    if (selectionsArray.length !== required) {
                        setError(required === 1 ? 'Select 1 card to take.' : 'Select 2 cards to take.');
                        return;
                    }
                    options = {
                        opponentId,
                        card1Type: selectionsArray[0].type,
                        card1Value: selectionsArray[0].value,
                        ...(selectionsArray[1]
                            ? { card2Type: selectionsArray[1].type, card2Value: selectionsArray[1].value }
                            : {})
                    };
                }
                break;

            case 'irrigation':
                options = {};
                break;

            case 'mining':
                options = {};
                break;

            // For board-selection cards, show message
            case 'inventor':
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
        setMerchantFleetChoice('');
        setKnightId('');
        setOpponentId('');
        setStolenCard('');
        setGuildSelections({});
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
    const getOpponentHandCounts = (oppId: string) => {
        const opponent = gameState.players.find(p => p.id === oppId);
        if (!opponent) return [];

        const entries: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; available: number }[] = [];
        Object.entries(opponent.resources || {}).forEach(([res, count]) => {
            if ((count || 0) > 0) {
                entries.push({ type: 'resource', value: res as ResourceType, available: count || 0 });
            }
        });
        Object.entries(opponent.commodities || {}).forEach(([com, count]) => {
            if ((count || 0) > 0) {
                entries.push({ type: 'commodity', value: com as CommodityType, available: count || 0 });
            }
        });
        return entries;
    };
    const getAvailableCount = (oppId: string, type: 'resource' | 'commodity', value: ResourceType | CommodityType) => {
        const opponent = gameState.players.find(p => p.id === oppId);
        if (!opponent) return 0;
        if (type === 'resource') {
            return opponent.resources?.[value as ResourceType] ?? 0;
        }
        return opponent.commodities?.[value as CommodityType] ?? 0;
    };
    const getOpponentHandSize = (oppId: string) =>
        getOpponentHandCounts(oppId).reduce((sum, item) => sum + item.available, 0);
    const eligibleGuildOpponents = gameState.players.filter(
        p => p.id !== currentPlayer.id && p.victoryPoints > currentPlayer.victoryPoints
    );
    const guildSelectedCount = Object.values(guildSelections).reduce((sum, n) => sum + n, 0);

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

            case 'merchant_fleet':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium block mb-1">Select the type to trade at 2:1 this turn:</label>
                            <select
                                value={merchantFleetChoice}
                                onChange={(e) => setMerchantFleetChoice(e.target.value as ResourceType | CommodityType)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white cursor-pointer"
                            >
                                <option value="">Select resource or commodity</option>
                                {resources.map(r => <option key={r} value={r}>{r}</option>)}
                                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-slate-300">
                            The chosen type will trade with the bank at 2:1 for the rest of your turn, including bank trades and port trades.
                        </p>
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

            case 'irrigation':
                if (!irrigationStats) return null;
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            You will receive{' '}
                            <span className="font-semibold text-emerald-300">{irrigationStats.wheatGained}</span>{' '}
                            wheat for the{' '}
                            <span className="font-semibold text-amber-200">{irrigationStats.fieldCount}</span>{' '}
                            field{irrigationStats.fieldCount === 1 ? '' : 's'} adjacent to your buildings.
                        </p>
                        {irrigationStats.fieldCount === 0 && (
                            <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-600 rounded px-3 py-2">
                                You have no adjacent fields, so playing Irrigation will not add any wheat.
                            </div>
                        )}
                    </div>
                );

            case 'mining':
                if (!miningStats) return null;
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            You will receive{' '}
                            <span className="font-semibold text-emerald-300">{miningStats.oreGained}</span>{' '}
                            ore for the{' '}
                            <span className="font-semibold text-amber-200">{miningStats.mountainCount}</span>{' '}
                            mountain{miningStats.mountainCount === 1 ? '' : 's'} adjacent to your buildings.
                        </p>
                        {miningStats.mountainCount === 0 && (
                            <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-600 rounded px-3 py-2">
                                You have no adjacent mountains, so playing Mining will not add any ore.
                            </div>
                        )}
                    </div>
                );

            case 'guild_dues': {
                const grouped = opponentId
                    ? getOpponentHandCounts(opponentId).map(item => ({
                        ...item,
                        selected: guildSelections[`${item.type}:${item.value}`] || 0
                    }))
                    : [];
                const totalAvailable = opponentId ? getOpponentHandSize(opponentId) : 0;
                const requiredPicks = totalAvailable === 0 ? 0 : Math.min(2, totalAvailable);
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Select opponent (must have more VPs than you):</label>
                            <select
                                value={opponentId}
                                onChange={(e) => {
                                    setOpponentId(e.target.value);
                                    setGuildSelections({});
                                    setError('');
                                }}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white cursor-pointer"
                            >
                                <option value="">Select opponent</option>
                                {eligibleGuildOpponents.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.victoryPoints} VP, {getOpponentHandSize(p.id)} cards)
                                    </option>
                                ))}
                            </select>
                            {eligibleGuildOpponents.length === 0 && (
                                <p className="text-xs text-amber-300 mt-1">No opponents have more victory points than you.</p>
                            )}
                        </div>

                        {opponentId && (
                            <div className="space-y-3">
                                {requiredPicks > 0 ? (
                                    <div className="text-sm text-slate-200">
                                        Choose {requiredPicks === 2 ? 'any 2 cards' : 'the only card available'} from {gameState.players.find(p => p.id === opponentId)?.name}'s hand.
                                    </div>
                                ) : (
                                    <div className="text-sm text-amber-200">This opponent has no cards to take.</div>
                                )}
                                <div className="space-y-2">
                                    {grouped.map(item => {
                                        const key = `${item.type}:${item.value}`;
                                        const selected = guildSelections[key] || 0;
                                        const remaining = item.available - selected;
                                        const disableMinus = selected === 0;
                                        const disablePlus = remaining === 0 || guildSelectedCount >= requiredPicks;
                                        return (
                                            <div
                                                key={key}
                                                className="flex items-center justify-between px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`capitalize ${
                                                            selected > 0 ? 'text-red-200' : 'text-slate-100'
                                                        }`}
                                                    >
                                                        {item.value} ({remaining})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className={`w-8 h-8 rounded border text-lg leading-none font-bold transition-colors ${
                                                            disableMinus
                                                                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                                                : 'border-slate-500 text-white hover:bg-slate-700 cursor-pointer'
                                                        }`}
                                                        onClick={() => {
                                                            if (disableMinus) return;
                                                            setGuildSelections(prev => {
                                                                const next = { ...prev };
                                                                next[key] = Math.max(0, (next[key] || 0) - 1);
                                                                if (next[key] === 0) delete next[key];
                                                                return next;
                                                            });
                                                            setError('');
                                                        }}
                                                        disabled={disableMinus}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-sm text-slate-200 w-5 text-center">{selected}</span>
                                                    <button
                                                        type="button"
                                                        className={`w-8 h-8 rounded border text-lg leading-none font-bold transition-colors ${
                                                            disablePlus
                                                                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                                                : 'border-emerald-400 text-white hover:bg-emerald-600 cursor-pointer'
                                                        }`}
                                                        onClick={() => {
                                                            if (disablePlus) return;
                                                            setGuildSelections(prev => ({
                                                                ...prev,
                                                                [key]: (prev[key] || 0) + 1
                                                            }));
                                                            setError('');
                                                        }}
                                                        disabled={disablePlus}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {guildSelectedCount > 0 && (
                                    <div className="text-xs text-slate-300">
                                        Selected: {Object.entries(guildSelections)
                                            .map(([key, count]) => `${key.split(':')[1]} x${count}`)
                                            .join(', ')}
                                    </div>
                                )}
                                {totalAvailable === 0 && (
                                    <div className="text-xs text-amber-300">Opponent has no resources or commodities to take.</div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return (
                    <p className="text-sm text-slate-300">
                        This card does not require any parameters. Click "Play Card" to use it.
                    </p>
                );
        }
    };

    const isGuildDues = cardType === 'guild_dues';
    const requiresMerchantFleetSelection = cardType === 'merchant_fleet';
    const merchantFleetReady = !requiresMerchantFleetSelection || !!merchantFleetChoice;
    const guildRequiredPicks =
        isGuildDues && opponentId
            ? (() => {
                const size = getOpponentHandSize(opponentId);
                if (size === 0) return 0;
                return Math.min(2, size);
            })()
            : 0;
    const guildReady = !isGuildDues || (opponentId && guildRequiredPicks > 0 && guildSelectedCount === guildRequiredPicks);
    const disablePlay = alchemyLocked || !guildReady || !merchantFleetReady;
    const playTooltip =
        !guildReady && isGuildDues
            ? guildRequiredPicks === 0
                ? 'Opponent has no cards to take'
                : guildRequiredPicks === 1
                    ? 'Select 1 resource or commodity'
                    : 'Select 2 resources or commodities'
        : !merchantFleetReady && requiresMerchantFleetSelection
            ? 'Select a resource or commodity'
            : undefined;

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
                        disabled={disablePlay}
                        title={playTooltip}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                            disablePlay
                                ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-70'
                                : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                        }`}
                    >
                        {cardType === 'guild_dues'
                            ? 'Take Cards'
                            : cardType === 'irrigation' || cardType === 'mining'
                                ? 'Confirm'
                                : cardType === 'merchant_fleet'
                                    ? 'Select'
                                    : 'Play Card'}
                    </button>
                </div>
            </div>
        </div>
    );
};
