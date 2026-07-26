import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { GameState, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { getCanonicalVertexId } from '@/lib/hex';
import { GuildSelectionList, SelectionMap, getSelectionCount } from '../city/GuildSelectionList';
import { Tooltip } from '@/components/ui/tooltip';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '@/components/game/ui/TabletopModal';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { EventDie, PipDie } from '@/themes/tabletop';

/**
 * Cards whose decision is about the board or your visible hand, so the dialog
 * floats above the board instead of blurring it out:
 *
 * - alchemist      — you pick both dice; you need the number tokens.
 * - resource/trade monopoly — you judge what opponents hold from their production.
 * - merchant_fleet — you pick the 2:1 type against your own hand in the tray.
 * - irrigation / mining — lets you verify which hexes the printed total counted.
 *
 * Everything else (saboteur, wedding, espionage, guild_dues, encouragement)
 * prints its own opponent/card table, so blocking is correct there.
 */
const BOARD_VISIBLE_CARDS: ProgressCardType[] = [
    'alchemist',
    'resource_monopoly',
    'trade_monopoly',
    'merchant_fleet',
    'irrigation',
    'mining',
];

// Same tabletop die colors as DiceDisplay so the picker matches the real roll.
const RED_DIE = { body: '#b3352c', pip: '#f3e9cf' };
const YELLOW_DIE = { body: '#d9a72e', pip: '#3a3020' };

const DIE_FACES = [1, 2, 3, 4, 5, 6];

/** One row of six clickable dice faces — faster and smaller than a <select>. */
const DiePicker: React.FC<{
    label: string;
    colors: { body: string; pip: string };
    value: number;
    onChange: (value: number) => void;
}> = ({ label, colors, value, onChange }) => (
    <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">{label}</div>
        <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
            {DIE_FACES.map(face => (
                <button
                    key={face}
                    type="button"
                    role="radio"
                    aria-checked={value === face}
                    aria-label={`${label} ${face}`}
                    onClick={() => onChange(face)}
                    className={`rounded-lg border p-1 transition ${tabletopOptionClass(value === face)}`}
                >
                    <PipDie value={face} body={colors.body} pip={colors.pip} size={32} title={`${face}`} />
                </button>
            ))}
        </div>
    </div>
);

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
    const [opponentId, setOpponentId] = useState<string>('');
    const [stolenCard, setStolenCard] = useState<ProgressCardType | ''>('');
    const [error, setError] = useState<string>('');
    const [guildSelections, setGuildSelections] = useState<SelectionMap>({});
    const [espionageCommitted, setEspionageCommitted] = useState<boolean>(false);
    const [guildDuesCommitted, setGuildDuesCommitted] = useState<boolean>(false);
    const [isRevealingAlchemy, setIsRevealingAlchemy] = useState(false);

    if (!isOpen || !cardType) return null;

    const cardMeta = PROGRESS_CARD_DEFINITIONS[cardType];
    const resources: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    const commodities: CommodityType[] = ['paper', 'cloth', 'coin'];
    const alchemyLocked = cardType === 'alchemist' && gameState.phase !== 'waiting_for_roll';
    const pendingAlchemy =
        cardType === 'alchemist' && gameState.pendingAlchemy?.playerId === currentPlayer.id
            ? gameState.pendingAlchemy
            : null;
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

            // Confirm-only cards: the dialog is a summary, there is nothing to pick.
            case 'saboteur':
            case 'wedding':
            case 'encouragement':
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

            default:
                // ProgressCardHand only opens this dialog for the cards above
                // (CARDS_REQUIRING_PARAMETERS + CONFIRMATION_MODAL_CARDS);
                // board-selection cards go straight to the board. Reaching here
                // means a routing bug, so refuse rather than play with no options.
                setError('This card is played on the board, not from this dialog.');
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

    const handleRevealAlchemy = async () => {
        if (isRevealingAlchemy) return;
        setError('');
        setIsRevealingAlchemy(true);
        try {
            await onPlay('alchemist', { revealEventDie: true });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to reveal the event die');
        } finally {
            setIsRevealingAlchemy(false);
        }
    };

    const resetState = () => {
        setChosenDice1(0);
        setChosenDice2(0);
        setResource('');
        setCommodity('');
        setMerchantFleetChoice('');
        setOpponentId('');
        setStolenCard('');
        setGuildSelections({});
        setError('');
        setEspionageCommitted(false);
        setGuildDuesCommitted(false);
    };

    const getOpponents = () => gameState.players.filter(p => p.id !== currentPlayer.id);
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
    const getOpponentHandSize = (oppId: string) =>
        getOpponentHandCounts(oppId).reduce((sum, item) => sum + item.available, 0);
    const getOpponentResourceCount = (oppId: string) => {
        const opponent = gameState.players.find(p => p.id === oppId);
        if (!opponent) return 0;
        return resources.reduce((sum, res) => sum + (opponent.resources?.[res] ?? 0), 0);
    };
    const eligibleGuildOpponents = gameState.players.filter(
        p => p.id !== currentPlayer.id && p.victoryPoints > currentPlayer.victoryPoints
    );
    const guildSelectedCount = getSelectionCount(guildSelections);
    const higherVPOpponents = gameState.players.filter(
        p => p.id !== currentPlayer.id && (p.victoryPoints ?? 0) >= (currentPlayer.victoryPoints ?? 0)
    );

    const renderCardForm = () => {
        switch (cardType) {
            case 'alchemist': {
                const bothChosen = chosenDice1 > 0 && chosenDice2 > 0;
                const total = chosenDice1 + chosenDice2;
                if (!pendingAlchemy) {
                    return (
                        <div className="space-y-3 text-sm text-[var(--ui-text)]">
                            <p>Roll the event die first. After its result is revealed, Alchemy is committed and you must choose both production dice.</p>
                            <p className="text-xs text-[var(--ui-muted)]">You can cancel now, before revealing the event die.</p>
                        </div>
                    );
                }
                return (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2">
                            <EventDie face={pendingAlchemy.eventDieFace} size={48} title="Alchemy event die result" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">Event die</div>
                                <div className="font-semibold capitalize text-[var(--ui-text)]">{pendingAlchemy.eventDieFace}</div>
                                <div className="text-xs text-amber-200">Result locked — choose both production dice.</div>
                            </div>
                        </div>
                        <DiePicker label="Red Die" colors={RED_DIE} value={chosenDice1} onChange={setChosenDice1} />
                        <DiePicker label="Yellow Die" colors={YELLOW_DIE} value={chosenDice2} onChange={setChosenDice2} />
                        {bothChosen && (
                            <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-sm">
                                Production roll: <span className="font-semibold text-emerald-300">{total}</span>
                                {total === 7 && (
                                    <span className="ml-2 text-amber-200">— a 7 moves the robber instead of producing.</span>
                                )}
                            </div>
                        )}
                    </div>
                );
            }


            case 'resource_monopoly':
                return (
                    <div>
                        <label className="text-sm font-medium block mb-1">Select resource:</label>
                        <select
                            value={resource}
                            onChange={(e) => setResource(e.target.value as ResourceType)}
                            className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
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
                            className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
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
                                className="w-full cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
                            >
                                <option value="">Select resource or commodity</option>
                                {resources.map(r => <option key={r} value={r}>{r}</option>)}
                                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-[var(--ui-muted)]">
                            The chosen type will trade with the bank at 2:1 for the rest of your turn, including bank trades and port trades.
                        </p>
                    </div>
                );

            case 'saboteur':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            All opponents with equal or more victory points must discard half of their <span className="font-semibold text-emerald-300">resource cards</span> (rounded down), just like a 7 roll.
                        </p>
                        <div className="space-y-2">
                            {gameState.players
                                .filter(p => p.id !== currentPlayer.id)
                                .map(p => {
                                    const hasMoreVP = (p.victoryPoints ?? 0) >= (currentPlayer.victoryPoints ?? 0);
                                    const resourceCount = getOpponentResourceCount(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white">{p.name}</span>
                                                <span className="text-xs text-[var(--ui-muted)]">{p.victoryPoints} VP</span>
                                            </div>
                                            <div className="text-right text-sm">
                                                {hasMoreVP ? (
                                                    resourceCount > 0 ? (
                                                        <span className="text-emerald-300 font-semibold">
                                                            Discards {Math.floor(resourceCount / 2)} / {resourceCount} resources
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-200">Ahead of you but has no resources</span>
                                                    )
                                                ) : (
                                                    <span className="text-[var(--ui-muted)]">Not affected</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        {higherVPOpponents.length === 0 && (
                            <div className="text-xs text-amber-300 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                                No opponents currently have equal or more victory points. Playing Saboteur will have no effect.
                            </div>
                        )}
                    </div>
                );

            case 'espionage':
                const CATEGORY_ICONS = {
                    science: '🟢',
                    trade: '🟡',
                    politics: '🔵'
                };
                return (
                    <div className="space-y-4">
                        {!espionageCommitted ? (
                            <>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Select opponent:</label>
                                    <select
                                        value={opponentId}
                                        onChange={(e) => setOpponentId(e.target.value)}
                                        className="w-full rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
                                    >
                                        <option value="">Select opponent</option>
                                        {getOpponents().map(p => {
                                            const cardCount = (p.progressCards || []).length;
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({cardCount} card{cardCount === 1 ? '' : 's'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="text-xs text-amber-200 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                                    <TabletopStatusIcon type="warning" size={16} /> Once you click "Select", you cannot cancel and must steal a progress card from this opponent.
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-2 text-sm text-[var(--ui-text)]">
                                    Stealing from: <span className="font-semibold text-emerald-300">{gameState.players.find(p => p.id === opponentId)?.name}</span>
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-2">Select card to steal:</label>
                                    {getOpponentCards(opponentId).length === 0 ? (
                                        <div className="text-sm text-amber-200 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                                            This opponent has no progress cards to steal.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {getOpponentCards(opponentId).map((c, index) => {
                                                const meta = PROGRESS_CARD_DEFINITIONS[c];
                                                const icon = CATEGORY_ICONS[meta.category];
                                                const isSelected = stolenCard === c;
                                                return (
                                                    <Tooltip key={`${c}-${index}`} content={meta.description} placement="left" tooltipClassName="whitespace-pre-line">
                                                        <button
                                                            onClick={() => setStolenCard(c)}
                                                            className={`w-full text-left px-4 py-3 rounded border transition-colors cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-blue-600/60 border-blue-400 ring-2 ring-blue-400'
                                                                    : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] hover:border-[var(--ui-accent)] hover:brightness-110'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">{icon}</span>
                                                                <span className="font-semibold text-white">
                                                                    {meta.name}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'irrigation':
                if (!irrigationStats) return null;
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
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
                        <p className="text-sm text-[var(--ui-text)]">
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
                const grouped = opponentId && guildDuesCommitted ? getOpponentHandCounts(opponentId) : [];
                const totalAvailable = opponentId && guildDuesCommitted ? getOpponentHandSize(opponentId) : 0;
                const requiredPicks = totalAvailable === 0 ? 0 : Math.min(2, totalAvailable);
                return (
                    <div className="space-y-4">
                        {!guildDuesCommitted ? (
                            <>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Select opponent (must have more VPs than you):</label>
                                    <select
                                        value={opponentId}
                                        onChange={(e) => {
                                            setOpponentId(e.target.value);
                                            setGuildSelections({});
                                            setError('');
                                        }}
                                        className="w-full cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
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
                                <div className="text-xs text-amber-200 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                                    <TabletopStatusIcon type="warning" size={16} /> Once you click "Select", you cannot cancel and must take cards from this opponent's hand.
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-2 text-sm text-[var(--ui-text)]">
                                    Taking from: <span className="font-semibold text-emerald-300">{gameState.players.find(p => p.id === opponentId)?.name}</span>
                                </div>
                                <div className="space-y-3">
                                    {requiredPicks > 0 ? (
                                        <div className="text-sm text-[var(--ui-text)]">
                                            Choose {requiredPicks === 2 ? 'any 2 cards' : 'the only card available'} from {gameState.players.find(p => p.id === opponentId)?.name}'s hand.
                                        </div>
                                    ) : (
                                        <div className="text-sm text-amber-200">This opponent has no cards to take.</div>
                                    )}
                                    <GuildSelectionList
                                        items={grouped}
                                        required={requiredPicks}
                                        selections={guildSelections}
                                        onChange={(next) => {
                                            setGuildSelections(next);
                                            setError('');
                                        }}
                                        emptyMessage="Opponent has no resources or commodities to take."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                );
            }

            case 'wedding': {
                const otherPlayers = gameState.players.filter(p => p.id !== currentPlayer.id);
                const higherVPPlayers = otherPlayers.filter(p => (p.victoryPoints ?? 0) > (currentPlayer.victoryPoints ?? 0));
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Each opponent with more victory points chooses <span className="font-semibold text-emerald-300">two cards</span>{' '}
                            (resources or commodities) to give you. They will make their selection right after you play this card.
                        </p>
                        <div className="space-y-2">
                            {otherPlayers.map(p => {
                                const hasMoreVP = (p.victoryPoints ?? 0) > (currentPlayer.victoryPoints ?? 0);
                                const totalCards = getOpponentHandSize(p.id);
                                const owed = hasMoreVP ? Math.min(2, totalCards) : 0;
                                return (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{p.name}</span>
                                            <span className="text-xs text-[var(--ui-muted)]">{p.victoryPoints} VP</span>
                                        </div>
                                        <div className="text-right text-sm">
                                            {hasMoreVP ? (
                                                owed > 0 ? (
                                                    <span className="text-emerald-300 font-semibold">
                                                        Will give {owed} card{owed === 1 ? '' : 's'} ({totalCards} in hand)
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-200">Ahead of you but has no cards</span>
                                                )
                                            ) : (
                                                <span className="text-[var(--ui-muted)]">No cards owed</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {higherVPPlayers.length === 0 && (
                            <div className="text-xs text-amber-300 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                                No opponents currently have more victory points. Playing Wedding will have no effect.
                            </div>
                        )}
                    </div>
                );
            }

            case 'encouragement':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Activate all of your knights for free. This immediately boosts your defense strength
                            against the barbarians and lets those knights move or displace as usual.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            Knights that are already active stay active. No wheat is spent.
                        </p>
                    </div>
                );

            default:
                return (
                    <p className="text-sm text-[var(--ui-muted)]">
                        This card does not require any parameters. Click "Play Card" to use it.
                    </p>
                );
        }
    };

    const isGuildDues = cardType === 'guild_dues';
    const isEspionage = cardType === 'espionage';
    const requiresMerchantFleetSelection = cardType === 'merchant_fleet';
    const merchantFleetReady = !requiresMerchantFleetSelection || !!merchantFleetChoice;
    const higherVPBlocked = (cardType === 'wedding' || cardType === 'saboteur') && higherVPOpponents.length === 0;

    // Two-step commitment for Espionage and Guild Dues
    const showSelectButton = (isEspionage && !espionageCommitted) || (isGuildDues && !guildDuesCommitted);
    const canCommit = opponentId !== '';

    const guildRequiredPicks =
        isGuildDues && opponentId && guildDuesCommitted
            ? (() => {
                const size = getOpponentHandSize(opponentId);
                if (size === 0) return 0;
                return Math.min(2, size);
            })()
            : 0;
    const guildReady = !isGuildDues || (guildDuesCommitted && opponentId && guildRequiredPicks > 0 && guildSelectedCount === guildRequiredPicks);
    const espionageReady = !isEspionage || (espionageCommitted && opponentId && stolenCard !== '');
    const alchemyDiceReady =
        cardType !== 'alchemist' || (!!pendingAlchemy && chosenDice1 > 0 && chosenDice2 > 0);
    const disablePlay = alchemyLocked || !alchemyDiceReady || !guildReady || !espionageReady || !merchantFleetReady || higherVPBlocked;

    const playTooltip =
        !guildReady && isGuildDues
            ? guildRequiredPicks === 0
                ? 'Opponent has no cards to take'
                : guildRequiredPicks === 1
                    ? 'Select 1 resource or commodity'
                    : 'Select 2 resources or commodities'
            : !espionageReady && isEspionage
                ? 'Select a progress card to steal'
                : !merchantFleetReady && requiresMerchantFleetSelection
                    ? 'Select a resource or commodity'
                    : higherVPBlocked
                        ? 'No opponents have more victory points'
                        : undefined;

    const handleSelectOpponent = () => {
        if (!opponentId) {
            setError('Please select an opponent');
            return;
        }
        if (isEspionage) {
            const opponent = gameState.players.find(p => p.id === opponentId);
            if (!opponent || (opponent.progressCards || []).length === 0) {
                setError('Selected opponent has no progress cards');
                return;
            }
            setEspionageCommitted(true);
        } else if (isGuildDues) {
            const opponent = gameState.players.find(p => p.id === opponentId);
            if (!opponent || getOpponentHandSize(opponentId) === 0) {
                setError('Selected opponent has no cards');
                return;
            }
            setGuildDuesCommitted(true);
        }
        setError('');
    };

    const actionLabel =
        cardType === 'alchemist'
            ? pendingAlchemy ? 'Resolve Alchemy' : 'Roll Event Die'
            : cardType === 'guild_dues'
            ? 'Take Cards'
            : cardType === 'espionage'
                ? 'Steal Card'
                : cardType === 'irrigation' || cardType === 'mining'
                    ? 'Confirm'
                    : cardType === 'encouragement'
                        ? 'Activate'
                        : cardType === 'merchant_fleet'
                            ? 'Select'
                            : 'Play Card';

    const footer = (
        <>
            {!pendingAlchemy && !isRevealingAlchemy && (
                <TabletopButton onClick={onClose} disabled={espionageCommitted || guildDuesCommitted}>Cancel</TabletopButton>
            )}
            {cardType === 'alchemist' && !pendingAlchemy ? (
                <TabletopButton
                    variant="primary"
                    onClick={handleRevealAlchemy}
                    disabled={alchemyLocked || isRevealingAlchemy}
                >
                    {isRevealingAlchemy ? 'Rolling…' : actionLabel}
                </TabletopButton>
            ) : showSelectButton ? (
                <TabletopButton variant="primary" onClick={handleSelectOpponent} disabled={!canCommit}>Select</TabletopButton>
            ) : playTooltip ? (
                <Tooltip content={playTooltip} placement="top" tooltipClassName="whitespace-pre-line">
                    <TabletopButton variant="primary" onClick={handlePlay} disabled={disablePlay}>{actionLabel}</TabletopButton>
                </Tooltip>
            ) : (
                <TabletopButton variant="primary" onClick={handlePlay} disabled={disablePlay}>{actionLabel}</TabletopButton>
            )}
        </>
    );

    const boardVisible = BOARD_VISIBLE_CARDS.includes(cardType);

    return (
        <TabletopModal
            title={cardMeta.name}
            description={cardMeta.description}
            surface={boardVisible ? 'board-visible' : 'blocking'}
            width={boardVisible ? 'sm' : 'md'}
            onClose={!pendingAlchemy && !isRevealingAlchemy && !espionageCommitted && !guildDuesCommitted ? onClose : undefined}
            footer={footer}
        >
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
        </TabletopModal>
    );
};
