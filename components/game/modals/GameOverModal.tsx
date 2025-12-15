import React, { useMemo } from 'react';
import { GameState, PlayerState } from '@/lib/types';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { calculateMetropolisVP } from '@/core/engine/metropolis/metropolis-manager';

type CategoryKey =
    | 'settlements'
    | 'cities'
    | 'longestRoad'
    | 'largestArmy'
    | 'metropolis'
    | 'defenderTokens'
    | 'progressVP'
    | 'merchant'
    | 'devCards'
    | 'other';

interface CategoryConfig {
    key: CategoryKey;
    label: string;
    accent: string;
    hint?: string;
}

interface GameOverModalProps {
    gameState: GameState;
    winnerId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const categoryPalettes: Record<CategoryKey, string> = {
    settlements: 'from-amber-400/90 to-amber-500/90',
    cities: 'from-orange-400/90 to-orange-500/90',
    longestRoad: 'from-emerald-400/90 to-emerald-500/90',
    largestArmy: 'from-blue-400/90 to-blue-500/90',
    metropolis: 'from-purple-400/90 to-fuchsia-500/90',
    defenderTokens: 'from-teal-300/90 to-cyan-400/90',
    progressVP: 'from-lime-300/90 to-emerald-400/90',
    merchant: 'from-amber-300/90 to-amber-400/90',
    devCards: 'from-rose-300/90 to-pink-400/90',
    other: 'from-slate-400/90 to-slate-500/90',
};

const baseCategories: CategoryConfig[] = [
    { key: 'settlements', label: 'Settlements', accent: categoryPalettes.settlements },
    { key: 'cities', label: 'Cities', accent: categoryPalettes.cities },
    { key: 'longestRoad', label: 'Longest Road', accent: categoryPalettes.longestRoad },
    { key: 'largestArmy', label: 'Largest Army', accent: categoryPalettes.largestArmy },
    { key: 'devCards', label: 'VP Cards', accent: categoryPalettes.devCards, hint: 'Development card VPs' },
];

const citiesAndKnightsCategories: CategoryConfig[] = [
    { key: 'settlements', label: 'Settlements', accent: categoryPalettes.settlements },
    { key: 'cities', label: 'Cities', accent: categoryPalettes.cities },
    { key: 'longestRoad', label: 'Longest Road', accent: categoryPalettes.longestRoad },
    { key: 'metropolis', label: 'Metropolis', accent: categoryPalettes.metropolis },
    { key: 'defenderTokens', label: 'Defender', accent: categoryPalettes.defenderTokens },
    { key: 'progressVP', label: 'Progress VP', accent: categoryPalettes.progressVP, hint: 'Printer / Constitution' },
    { key: 'merchant', label: 'Merchant', accent: categoryPalettes.merchant },
    { key: 'other', label: 'Other', accent: categoryPalettes.other, hint: 'Misc bonuses' },
];

const getSettlementVP = (player: PlayerState) =>
    (5 - player.settlementsRemaining) * GAME_CONSTANTS.VP_FROM_SETTLEMENT;

const getCityVP = (player: PlayerState) =>
    (4 - player.citiesRemaining) * GAME_CONSTANTS.VP_FROM_CITY;

const getBreakdown = (player: PlayerState, gameState: GameState) => {
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
    const longestRoad = gameState.longestRoadOwner === player.id ? GAME_CONSTANTS.VP_FROM_LONGEST_ROAD : 0;
    const settlementVP = getSettlementVP(player);
    const cityVP = getCityVP(player);

    const baseTotals = {
        settlements: settlementVP,
        cities: cityVP,
        longestRoad,
    };

    if (!isCitiesAndKnights) {
        const largestArmy = gameState.largestArmyOwner === player.id ? GAME_CONSTANTS.VP_FROM_LARGEST_ARMY : 0;
        const devCards = Math.max(
            0,
            player.victoryPoints - (settlementVP + cityVP + longestRoad + largestArmy)
        );

        return {
            ...baseTotals,
            largestArmy,
            devCards,
            metropolis: 0,
            defenderTokens: 0,
            progressVP: 0,
            merchant: 0,
            other: 0,
        };
    }

    const metropolis = calculateMetropolisVP(player);
    const defenderTokens = player.defenderVPTokens || 0;
    const progressVP = player.revealedVPCards?.length || 0;
    const merchant = gameState.activeMerchant === player.id ? 1 : 0;
    const other = Math.max(
        0,
        player.victoryPoints - (
            settlementVP +
            cityVP +
            longestRoad +
            metropolis +
            defenderTokens +
            progressVP +
            merchant
        )
    );

    return {
        ...baseTotals,
        metropolis,
        defenderTokens,
        progressVP,
        merchant,
        other,
        largestArmy: 0,
        devCards: 0,
    };
};

export const GameOverModal: React.FC<GameOverModalProps> = ({ gameState, winnerId, isOpen, onClose }) => {
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
    const categories = isCitiesAndKnights ? citiesAndKnightsCategories : baseCategories;

    const { playersSorted, maxTotal, maxByCategory, winner } = useMemo(() => {
        const sorted = [...gameState.players].sort((a, b) => {
            if (b.victoryPoints === a.victoryPoints) return a.name.localeCompare(b.name);
            return b.victoryPoints - a.victoryPoints;
        });

        const totals = sorted.map(p => p.victoryPoints);
        const breakdowns = sorted.map(p => getBreakdown(p, gameState));

        const categoryMaximums = categories.reduce<Record<CategoryKey, number>>((acc, category) => {
            acc[category.key] = Math.max(...breakdowns.map(b => b[category.key] || 0), 0);
            return acc;
        }, {
            settlements: 0,
            cities: 0,
            longestRoad: 0,
            largestArmy: 0,
            metropolis: 0,
            defenderTokens: 0,
            progressVP: 0,
            merchant: 0,
            devCards: 0,
            other: 0,
        });

        const winningPlayer = sorted.find(p => p.id === winnerId) || sorted[0];

        return {
            playersSorted: sorted.map((player, index) => ({
                player,
                rank: index + 1,
                breakdown: breakdowns[index],
            })),
            maxTotal: Math.max(...totals, 0),
            maxByCategory: categoryMaximums,
            winner: winningPlayer,
        };
    }, [categories, gameState, winnerId]);

    if (!isOpen || !winner) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Celebration glow layers */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 left-10 h-48 w-48 bg-amber-400/20 blur-3xl" />
                <div className="absolute bottom-0 right-16 h-56 w-56 bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute top-12 right-1/4 h-32 w-32 bg-emerald-400/20 blur-3xl" />
            </div>

            <div className="relative w-[92vw] max-w-6xl bg-slate-950/95 border border-amber-300/60 rounded-3xl shadow-[0_0_80px_rgba(251,191,36,0.35)] p-8 text-white pointer-events-auto">
                <div className="absolute -top-10 right-10 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-pink-500 blur-2xl opacity-60" />

                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Game Over</div>
                        <div className="text-3xl sm:text-4xl font-black text-amber-100 drop-shadow">
                            {winner.name} wins!
                        </div>
                        <div className="text-sm text-slate-200/80 max-w-xl">
                            Victory secured with {winner.victoryPoints} VP. Here&apos;s how every player stacked up.
                        </div>
                    </div>
                    <button
                        className="relative z-10 px-4 py-3 rounded-lg border border-amber-300/70 text-amber-50 hover:bg-amber-400/20 transition-colors font-semibold cursor-pointer min-h-[44px]"
                        onClick={onClose}
                    >
                        View Board
                    </button>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-inner">
                    <div className="grid gap-3"
                        style={{ gridTemplateColumns: `1.1fr 0.75fr repeat(${categories.length}, minmax(0, 1fr))` }}
                    >
                        <div className="text-xs uppercase tracking-wide text-slate-400">Player</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Total VP</div>
                        {categories.map(category => (
                            <div key={category.key} className="text-xs uppercase tracking-wide text-slate-400 text-center">
                                <div>{category.label}</div>
                                {category.hint && <div className="text-[10px] text-slate-500">{category.hint}</div>}
                            </div>
                        ))}

                        {playersSorted.map(({ player, rank, breakdown }) => (
                            <React.Fragment key={player.id}>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-sm font-bold border border-slate-700">
                                        #{rank}
                                    </span>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: player.color }} />
                                            <span className="font-semibold text-base">{player.name}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">VP: {player.victoryPoints}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="text-lg font-bold">{player.victoryPoints}</div>
                                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500"
                                            style={{ width: `${maxTotal ? (player.victoryPoints / maxTotal) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {categories.map(category => {
                                    const value = breakdown[category.key] || 0;
                                    const maxValue = maxByCategory[category.key] || 0;
                                    const fill = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 0;
                                    return (
                                        <div key={category.key} className="flex flex-col gap-1">
                                            <div className="h-12 rounded-xl bg-slate-900/70 border border-slate-800 relative overflow-hidden">
                                                <div
                                                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${category.accent}`}
                                                    style={{ width: `${value === 0 ? 0 : fill}%` }}
                                                />
                                                <div className="relative z-10 flex items-center justify-center h-full px-2 text-sm font-semibold">
                                                    <span className={value === 0 ? 'text-slate-500' : 'text-white'}>
                                                        {value} VP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
