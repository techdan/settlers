import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { buyDevCard } from '@/app/actions';
import { GameIcon } from '@/components/ui/icons/GameIcon';
import { Tooltip } from '@/components/ui/tooltip';

interface BuildControlsProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null;
    onSetBuildMode: (mode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null) => void;
}

export const BuildControls: React.FC<BuildControlsProps> = ({
    gameState,
    playerId,
    buildMode,
    onSetBuildMode
}) => {
    const isMyTurn = gameState.currentTurn === playerId;
    const [isPending, startTransition] = useTransition();
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';

    const player = gameState.players.find(p => p.id === playerId);
    const resources = player?.resources || { brick: 0, wood: 0, sheep: 0, wheat: 0, ore: 0 };

    const canAffordRoad = resources.brick >= 1 && resources.wood >= 1;
    const canAffordSettlement = resources.brick >= 1 && resources.wood >= 1 && resources.sheep >= 1 && resources.wheat >= 1;
    const canAffordCity = resources.ore >= 3 && resources.wheat >= 2;
    const canAffordDevCard = resources.sheep >= 1 && resources.wheat >= 1 && resources.ore >= 1;
    const canAffordKnight = resources.sheep >= 1 && resources.ore >= 1;
    const deckSize = gameState.devCardDeck?.length || 0;

    const handleBuyDevCard = () => {
        startTransition(async () => {
            try {
                await buyDevCard(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to buy dev card", e);
            }
        });
    };

    const MAX_KNIGHTS = 6;
    const MAX_WALLS = 3;

    const knightsCount = player?.knights?.length || 0;
    const knightsRemaining = Math.max(0, MAX_KNIGHTS - knightsCount);

    const playerVertices = Object.values(gameState.board.vertices);
    const wallsCount = playerVertices.filter(v => v.owner === playerId && v.hasCityWall).length;
    const wallsRemaining = Math.max(0, MAX_WALLS - wallsCount);
    const hasEligibleCityForWall = playerVertices.some(
        v => v.owner === playerId &&
            (v.structure === 'city' || v.structure === 'metropolis') &&
            !v.hasCityWall
    );

    const canBuildKnight = canAffordKnight && knightsRemaining > 0;
    const canBuildCityWall = resources.brick >= 2 && wallsRemaining > 0 && hasEligibleCityForWall;

    // Enable building only when it's the player's turn and in main phase
    const canInteract = isMyTurn && gameState.phase === 'main_phase';

    return (
        <div className="flex gap-2 bg-slate-800/80 p-2 rounded-xl backdrop-blur-sm border border-slate-700 pointer-events-auto">
            {/* ROAD */}
            <Tooltip
                content={`Build a Road (1 Brick, 1 Wood)\nConnects settlements and cities.\nRemaining: ${player?.roadsRemaining ?? 0}`}
                placement="top"
                tooltipClassName="whitespace-pre-line"
            >
                <button
                    onClick={() => canInteract && onSetBuildMode(buildMode === 'road' ? null : 'road')}
                    disabled={!canInteract || !canAffordRoad || (player?.roadsRemaining ?? 0) <= 0}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'road'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordRoad && (player?.roadsRemaining ?? 0) > 0
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <GameIcon type="road" size={18} playerColor={buildMode === 'road' ? 'var(--color-highlight-white)' : 'var(--color-highlight-muted)'} />
                        <span>Road ({player?.roadsRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-normal opacity-80 mt-1">
                        <GameIcon type="brick" size={14} />
                        <span>1</span>
                        <GameIcon type="wood" size={14} />
                        <span>1</span>
                    </div>
                </button>
            </Tooltip>

            {/* SETTLEMENT */}
            <Tooltip
                content={`Build a Settlement (1 Brick, 1 Wood, 1 Sheep, 1 Wheat)\nGathers 1 resource from adjacent hexes.\nRemaining: ${player?.settlementsRemaining ?? 0}`}
                placement="top"
                tooltipClassName="whitespace-pre-line"
            >
                <button
                    onClick={() => canInteract && onSetBuildMode(buildMode === 'settlement' ? null : 'settlement')}
                    disabled={!canInteract || !canAffordSettlement || (player?.settlementsRemaining ?? 0) <= 0}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'settlement'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordSettlement && (player?.settlementsRemaining ?? 0) > 0
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <img src="/icons/village.svg" alt="Settlement" className="w-[18px] h-[18px]" style={{ filter: buildMode === 'settlement' ? 'brightness(0) invert(1)' : 'brightness(0.8)' }} />
                        <span>Settlement ({player?.settlementsRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-normal opacity-80 mt-1">
                        <GameIcon type="brick" size={12} /><span>1</span>
                        <GameIcon type="wood" size={12} /><span>1</span>
                        <GameIcon type="sheep" size={12} /><span>1</span>
                        <GameIcon type="wheat" size={12} /><span>1</span>
                    </div>
                </button>
            </Tooltip>

            {/* CITY */}
            <Tooltip
                content={`Build a City (3 Ore, 2 Wheat)\nUpgrades a settlement. Gathers 2 resources/commodities.\nRemaining: ${player?.citiesRemaining ?? 0}`}
                placement="top"
                tooltipClassName="whitespace-pre-line"
            >
                <button
                    onClick={() => canInteract && onSetBuildMode(buildMode === 'city' ? null : 'city')}
                    disabled={!canInteract || !canAffordCity || (player?.citiesRemaining ?? 0) <= 0}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'city'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordCity && (player?.citiesRemaining ?? 0) > 0
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <GameIcon type="city" size={18} playerColor={buildMode === 'city' ? 'var(--color-highlight-white)' : 'var(--color-highlight-muted)'} />
                        <span>City ({player?.citiesRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-normal opacity-80 mt-1">
                        <GameIcon type="ore" size={14} />
                        <span>3</span>
                        <GameIcon type="wheat" size={14} />
                        <span>2</span>
                    </div>
                </button>
            </Tooltip>

            {/* DEV CARD (Base Game only) */}
            {!isCitiesAndKnights && (
                <Tooltip
                    content={`Buy a Development Card (1 Sheep, 1 Wheat, 1 Ore)\nGrants special abilities or VP.\nCards in deck: ${deckSize}`}
                    placement="top"
                    tooltipClassName="whitespace-pre-line"
                >
                    <button
                        onClick={() => canInteract && handleBuyDevCard()}
                        disabled={!canInteract || !canAffordDevCard || deckSize === 0 || isPending}
                        className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${canAffordDevCard && deckSize > 0
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <GameIcon type="paper" size={18} />
                            <span>Dev Card</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-xs font-normal opacity-80 mt-1">
                            <GameIcon type="sheep" size={12} /><span>1</span>
                            <GameIcon type="wheat" size={12} /><span>1</span>
                            <GameIcon type="ore" size={12} /><span>1</span>
                        </div>
                    </button>
                </Tooltip>
            )}

            {/* KNIGHT (Cities & Knights only) */}
            {isCitiesAndKnights && (
                <Tooltip
                    content={`Hire a Knight (1 Sheep, 1 Ore)\nDefends against barbarians and can displace opponents.\nRemaining: ${knightsRemaining}`}
                    placement="top"
                    tooltipClassName="whitespace-pre-line"
                >
                    <button
                        onClick={() => canInteract && onSetBuildMode(buildMode === 'knight' ? null : 'knight')}
                        disabled={!canInteract || !canBuildKnight}
                        className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'knight'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : canBuildKnight
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <img src="/icons/knight-basic.svg" alt="Knight" className="w-[18px] h-[18px]" style={{ filter: buildMode === 'knight' ? 'brightness(0) invert(1)' : 'brightness(0.8)' }} />
                            <span>Knight ({knightsRemaining})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-normal opacity-80 mt-1">
                            <GameIcon type="sheep" size={14} />
                            <span>1</span>
                            <GameIcon type="ore" size={14} />
                            <span>1</span>
                        </div>
                    </button>
                </Tooltip>
            )}

            {/* CITY WALL (Cities & Knights only) */}
            {isCitiesAndKnights && (
                <Tooltip
                    content={`Build a City Wall (2 Brick)\nIncreases hand limit by 2 and protects against robber.\nRemaining: ${wallsRemaining}`}
                    placement="top"
                    tooltipClassName="whitespace-pre-line"
                >
                    <button
                        onClick={() => canInteract && onSetBuildMode(buildMode === 'city_wall' ? null : 'city_wall')}
                        disabled={!canInteract || !canBuildCityWall}
                        className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'city_wall'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : canBuildCityWall
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' + (!canInteract ? ' cursor-not-allowed' : '')
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <GameIcon type="city-wall" size={18} playerColor={buildMode === 'city_wall' ? 'var(--color-highlight-white)' : 'var(--color-structure-wall-highlight)'} />
                            <span>City Wall ({wallsRemaining})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-normal opacity-80 mt-1">
                            <GameIcon type="brick" size={14} />
                            <span>2</span>
                        </div>
                    </button>
                </Tooltip>
            )}
        </div>
    );
};
