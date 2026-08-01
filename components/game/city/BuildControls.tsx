import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { buyDevCard } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { Road, Settlement, City, CityWall, KnightPiece, ResourceGlyph, TT } from '@/themes/tabletop';

interface BuildControlsProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null;
    onSetBuildMode: (mode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null) => void;
}

/* Tabletop menu icons: the buttons show the actual board pieces in a neutral
 * warm tone (white when the build mode is selected on blue), and costs use the
 * same mini resource glyphs as ports and cards. */
const menuTone = (active: boolean) => (active ? '#f8f6f0' : 'var(--ui-text)');

const CostChip: React.FC<{ type: ResourceType; n: number }> = ({ type, n }) => (
    <span className="inline-flex items-center gap-0.5">
        <svg viewBox="-10 -11 20 22" width={13} height={14} aria-hidden="true">
            <ResourceGlyph type={type} size={17} />
        </svg>
        <span>{n}</span>
    </span>
);

const RoadMenuIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg viewBox="-7 -13 14 26" width={11} height={20} aria-hidden="true">
        <Road color={menuTone(active)} length={22} />
    </svg>
);
const SettlementMenuIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg viewBox="-11 -11 22 24" width={19} height={20} aria-hidden="true">
        <Settlement color={menuTone(active)} />
    </svg>
);
const CityMenuIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg viewBox="-13 -19 26 33" width={17} height={21} aria-hidden="true">
        <City color={menuTone(active)} />
    </svg>
);
const KnightMenuIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg viewBox="-11 -12 22 26" width={17} height={20} aria-hidden="true">
        <KnightPiece color={active ? '#f8f6f0' : 'var(--ui-muted)'} level="basic" active={false} />
    </svg>
);
const WallMenuIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg viewBox="-17 -3 34 17" width={24} height={12} aria-hidden="true">
        <CityWall color={menuTone(active)} />
    </svg>
);
const DevCardMenuIcon: React.FC = () => (
    <svg viewBox="0 0 14 19" width={14} height={19} aria-hidden="true">
        <rect x={0.75} y={0.75} width={12.5} height={17.5} rx={2} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1.2} />
        <rect x={2.8} y={2.8} width={8.4} height={7} rx={1} fill={TT.token.ringInner} opacity={0.7} />
        <rect x={2.8} y={11.6} width={8.4} height={1.6} rx={0.8} fill={TT.token.ring} opacity={0.7} />
        <rect x={2.8} y={14.4} width={5.5} height={1.6} rx={0.8} fill={TT.token.ring} opacity={0.5} />
    </svg>
);

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

    // Check timer status
    const timerStatus = useTimerState(gameState);

    // Enable building only when it's the player's turn, in main phase, and timer not locked
    const canInteract = isMyTurn && gameState.phase === 'main_phase' && !timerStatus.isLocked;

    return (
        <div className="flex gap-2 pointer-events-auto">
            {/* ROAD */}
            <Tooltip
                content={`Build a Road (1 Brick, 1 Wood)\nConnects settlements and cities.\nRemaining: ${player?.roadsRemaining ?? 0}`}
                placement="top"
                tooltipClassName="whitespace-pre-line"
            >
                <button
                    onClick={() => canInteract && onSetBuildMode(buildMode === 'road' ? null : 'road')}
                    disabled={!canInteract || !canAffordRoad || (player?.roadsRemaining ?? 0) <= 0}
                    className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${buildMode === 'road'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordRoad && (player?.roadsRemaining ?? 0) > 0
                            ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <RoadMenuIcon active={buildMode === 'road'} />
                        <span>Road ({player?.roadsRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-normal opacity-90 mt-1">
                        <CostChip type="brick" n={1} />
                        <CostChip type="wood" n={1} />
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
                    className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${buildMode === 'settlement'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordSettlement && (player?.settlementsRemaining ?? 0) > 0
                            ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <SettlementMenuIcon active={buildMode === 'settlement'} />
                        <span>Settlement ({player?.settlementsRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-normal opacity-90 mt-1">
                        <CostChip type="brick" n={1} />
                        <CostChip type="wood" n={1} />
                        <CostChip type="sheep" n={1} />
                        <CostChip type="wheat" n={1} />
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
                    className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${buildMode === 'city'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordCity && (player?.citiesRemaining ?? 0) > 0
                            ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <CityMenuIcon active={buildMode === 'city'} />
                        <span>City ({player?.citiesRemaining ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-normal opacity-90 mt-1">
                        <CostChip type="ore" n={3} />
                        <CostChip type="wheat" n={2} />
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
                        className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${canAffordDevCard && deckSize > 0
                            ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                            : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <DevCardMenuIcon />
                            <span>Dev Card</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-normal opacity-90 mt-1">
                            <CostChip type="sheep" n={1} />
                            <CostChip type="wheat" n={1} />
                            <CostChip type="ore" n={1} />
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
                        className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${buildMode === 'knight'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : canBuildKnight
                                ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                                : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <KnightMenuIcon active={buildMode === 'knight'} />
                            <span>Knight ({knightsRemaining})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-normal opacity-90 mt-1">
                            <CostChip type="sheep" n={1} />
                            <CostChip type="ore" n={1} />
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
                        className={`flex cursor-pointer flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:cursor-not-allowed ${buildMode === 'city_wall'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : canBuildCityWall
                                ? 'bg-[color-mix(in_oklab,var(--ui-accent)_20%,var(--ui-panel-raised))] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)] hover:brightness-110' + (!canInteract ? ' cursor-not-allowed' : '')
                                : 'bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <WallMenuIcon active={buildMode === 'city_wall'} />
                            <span>City Wall ({wallsRemaining})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-normal opacity-90 mt-1">
                            <CostChip type="brick" n={2} />
                        </div>
                    </button>
                </Tooltip>
            )}
        </div>
    );
};
