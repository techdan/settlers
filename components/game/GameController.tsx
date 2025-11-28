'use client';

import React, { useState, useEffect } from 'react';
import { Board } from '@/components/board/Board';
import { GameState } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { PlayerHand } from './PlayerHand';
import { GameLog } from './GameLog';
import { PlayerDevCards } from './PlayerDevCards';

import { GameStatus } from './GameStatus';
import { BuildControls } from './BuildControls';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { DiscardModal } from './DiscardModal';
import { TradeModal } from './TradeModal';
import { TradeOfferDisplay } from './TradeOfferDisplay';
import { buildCityWall } from '@/app/actions';
import { AqueductModal } from './AqueductModal';

// Cities & Knights components
import { CityManagementDialog } from './CityManagementDialog';
import { KnightManagementDialog } from './KnightManagementDialog';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';

import { BarbarianTrack } from './BarbarianTrack';
import { EventDieDisplay } from './EventDieDisplay';
import { ProgressCardHand } from './ProgressCardHand';
import { ProgressCardDiscardDialog } from './ProgressCardDiscardDialog';
import { DebugPanel } from './DebugPanel';
import { OptimisticGameStateProvider, useOptimisticGameState } from '@/lib/hooks/useOptimisticGameState';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';
import { useGameSubscription } from '@/lib/hooks/useGameSubscription';
import { ConnectionStatusIndicator } from './ConnectionStatus';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null>(null);
    const [movingKnightId, setMovingKnightId] = useState<string | null>(null);
    const [buildingMetropolisType, setBuildingMetropolisType] = useState<'science' | 'trade' | 'politics' | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
    const [selectedKnightId, setSelectedKnightId] = useState<string | null>(null);

    // Progress card board selection states
    const [selectingHexForCard, setSelectingHexForCard] = useState<'merchant' | 'irrigation' | 'mining' | 'inventor' | null>(null);
    const [selectingVertexForCard, setSelectingVertexForCard] = useState<'intrigue' | 'diplomat' | null>(null);
    const [selectingEdgeForCard, setSelectingEdgeForCard] = useState<null>(null);
    const [cardSelectionData, setCardSelectionData] = useState<any>(null); // Stores partial data (e.g., selected hexes for inventor)

    const router = useRouter();
    const { getOptimisticState } = useOptimisticGameState();
    const connectionStatus = useConnectionStatus();

    // Debug mode: enabled by default in development or via NEXT_PUBLIC_DEBUG_MODE env var
    const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    // C&K action handlers
    const handleCityClick = (vertexId: string) => {
        setSelectedCityId(vertexId);
        setBuildMode(null);
    };

    const handleKnightClick = (knightId: string) => {
        setSelectedKnightId(knightId);
        setBuildMode(null);
    };

    const handleUpgradeImprovement = async (improvement: 'science' | 'trade' | 'politics') => {
        const res = await fetch(`/api/game/${roomId}/improvement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, action: 'upgrade', improvement })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to upgrade improvement');
        }
    };

    const handleBuildCityWall = async (vertexId: string) => {
        await buildCityWall(roomId, playerId, vertexId);
    };



    const handleActivateKnight = async (knightId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/knight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'activate', knightId })
            });
            if (!res.ok) throw new Error('Failed to activate knight');
        } catch (e) {
            console.error('Error activating knight:', e);
        }
    };

    const handleMoveKnight = async (knightId: string) => {
        // Enter knight movement mode - player will click target vertex
        setMovingKnightId(knightId);
        setBuildMode(null); // Clear any other build mode
    };

    const handleUpgradeKnight = async (knightId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/knight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'upgrade', knightId })
            });
            if (!res.ok) throw new Error('Failed to upgrade knight');
        } catch (e) {
            console.error('Error upgrading knight:', e);
        }
    };

    const handleBuildMetropolis = (metropolisType: 'science' | 'trade' | 'politics') => {
        // Enter metropolis building mode - player will click a city vertex
        setBuildingMetropolisType(metropolisType);
        setBuildMode(null); // Clear any other build mode
        setMovingKnightId(null); // Clear knight movement mode
    };

    const handlePlayProgressCard = async (cardType: any, options?: any) => {
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, cardType, options: options || {} })
            });
            if (!res.ok) throw new Error('Failed to play progress card');
        } catch (e) {
            console.error('Error playing progress card:', e);
        }
    };

    const handleStartHexSelection = (cardType: 'merchant' | 'irrigation' | 'mining' | 'inventor') => {
        setSelectingHexForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setCardSelectionData(null);
    };

    const handleHexSelected = async (hexId: string) => {
        if (!selectingHexForCard) return;

        // Handle multi-step selection (e.g. Inventor needs 2 hexes)
        if (selectingHexForCard === 'inventor') {
            if (!cardSelectionData) {
                // First hex selected
                setCardSelectionData({ hex1Id: hexId });
                return;
            } else {
                // Second hex selected
                await handlePlayProgressCard('inventor', { hex1Id: cardSelectionData.hex1Id, hex2Id: hexId });
                setSelectingHexForCard(null);
                setCardSelectionData(null);
                return;
            }
        }

        // Single hex selection cards
        await handlePlayProgressCard(selectingHexForCard, { hexId });
        setSelectingHexForCard(null);
    };

    const handleStartVertexSelection = (cardType: 'intrigue' | 'diplomat') => {
        setSelectingVertexForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setCardSelectionData(null);
    };

    const handleVertexSelected = async (vertexId: string) => {
        if (!selectingVertexForCard) return;

        if (selectingVertexForCard === 'intrigue') {
            // Intrigue: Move opponent's knight to this location
            const targetKnight = baseGameState?.players
                .flatMap(p => p.knights || [])
                .find(k => k.vertexId === vertexId);

            if (targetKnight) {
                await handlePlayProgressCard(selectingVertexForCard, {
                    knightId: targetKnight.id,
                    targetVertexId: vertexId
                });
            }
        } else if (selectingVertexForCard === 'diplomat') {
            // Diplomat: Move own knight to this location (own settlement/city)
            // Backend expects knightId and targetVertexId
            // TODO: Add UI to select which knight to move
            await handlePlayProgressCard(selectingVertexForCard, {
                targetVertexId: vertexId
            });
        }

        setSelectingVertexForCard(null);
    };


    const handleCancelSelection = () => {
        setSelectingHexForCard(null);
        setSelectingVertexForCard(null);
        setCardSelectionData(null);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
    };

    const handleDiscardProgressCards = async (cardsToDiscard: any[]) => {
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/discard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, cardsToDiscard })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to discard cards');
            }
        } catch (e) {
            console.error('Error discarding progress cards:', e);
            throw e; // Re-throw to let dialog handle it
        }
    };

    const handleLoseCityToBarbarians = async (vertexId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/barbarian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'lose_city', playerId, vertexId })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to lose city');
            }
        } catch (e) {
            console.error('Error losing city to barbarians:', e);
            throw e;
        }
    };

    // Initial fetch to ensure we have data before subscription kicks in
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await fetch(`/api/game/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBaseGameState(data);
                }
            } catch (e) {
                console.error("Failed to fetch initial game state", e);
            }
        };
        fetchInitialState();
    }, [roomId]);

    // Auto-resolve stuck barbarian_attack phase (cleanup for old games)
    useEffect(() => {
        if (baseGameState?.phase === 'barbarian_attack') {
            const resolveStuckAttack = async () => {
                try {
                    console.log('Auto-resolving stuck barbarian attack...');
                    const res = await fetch(`/api/game/${roomId}/barbarian`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'resolve' })
                    });
                    if (!res.ok) {
                        console.error('Failed to auto-resolve barbarian attack');
                    }
                } catch (e) {
                    console.error('Error auto-resolving barbarian attack:', e);
                }
            };
            resolveStuckAttack();
        }
    }, [baseGameState?.phase, roomId]);

    // Realtime subscription
    const subscribedGameState = useGameSubscription(roomId, baseGameState);

    // Update local state when subscription updates
    useEffect(() => {
        if (subscribedGameState) {
            setBaseGameState(subscribedGameState);
        }
    }, [subscribedGameState]);

    if (!baseGameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    // Apply optimistic updates on top of base state
    const gameState = getOptimisticState(baseGameState);

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Connection Status Indicator */}
            <ConnectionStatusIndicator
                status={connectionStatus.status}
                consecutiveFailures={connectionStatus.consecutiveFailures}
                lastError={connectionStatus.lastError}
            />

            <Board
                gameState={gameState}
                playerId={playerId}
                buildMode={buildMode}
                onCancelBuild={handleCancelSelection}
                movingKnightId={movingKnightId}
                buildingMetropolisType={buildingMetropolisType}
                selectingHexForCard={selectingHexForCard}
                selectingVertexForCard={selectingVertexForCard}
                selectingEdgeForCard={null}
                onHexSelected={handleHexSelected}
                onVertexSelectedForCard={handleVertexSelected}
                onCityClick={handleCityClick}
                onKnightClick={handleKnightClick}
                onBarbarianCitySelect={handleLoseCityToBarbarians}
            />

            <DiscardModal gameState={gameState} playerId={playerId} />

            {/* City Management Dialog (C&K) */}
            {selectedCityId && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    vertexId={selectedCityId}
                    onClose={() => setSelectedCityId(null)}
                    onUpgradeImprovement={handleUpgradeImprovement}
                    onBuildWall={handleBuildCityWall}
                />
            )}

            {/* Knight Management Dialog (C&K) */}
            {selectedKnightId && (
                <KnightManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    knightId={selectedKnightId}
                    onClose={() => setSelectedKnightId(null)}
                    onActivate={handleActivateKnight}
                    onUpgrade={handleUpgradeKnight}
                    onMove={handleMoveKnight}
                />
            )}

            {/* Progress Card Discard Dialog (C&K) */}
            {isCitiesAndKnights && currentPlayer && currentPlayer.progressCards && currentPlayer.progressCards.length > 4 && (
                <ProgressCardDiscardDialog
                    cards={currentPlayer.progressCards}
                    maxCards={4}
                    onDiscard={handleDiscardProgressCards}
                    onClose={() => {/* Dialog closes automatically after successful discard */ }}
                />
            )}

            {showTrade && (
                <TradeModal
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setShowTrade(false)}
                />
            )}

            {/* Aqueduct Modal */}
            {gameState.phase === 'aqueduct_selection' && gameState.pendingAqueduct?.includes(playerId) && (
                <AqueductModal gameState={gameState} playerId={playerId} />
            )}

            {/* Barbarian City Selection UI */}
            {gameState.phase === 'barbarian_city_selection' && gameState.pendingBarbarianVictims?.includes(playerId) && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
                    <h3 className="text-xl font-bold">⚔️ Barbarians Attacked!</h3>
                    <p className="text-center">
                        The barbarians have sacked your lands!<br />
                        <span className="font-bold text-red-300">Click on a city to destroy it.</span>
                    </p>
                </div>
            )}

            <TradeOfferDisplay gameState={gameState} playerId={playerId} />

            {/* Knight Displacement UI */}
            {gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
                    <h3 className="text-xl font-bold">Your Knight Was Displaced!</h3>
                    {(() => {
                        const validTargets = getValidRelocationTargets(
                            gameState,
                            playerId,
                            gameState.pendingDisplacement!.originVertexId
                        );
                        const hasValidTargets = validTargets.length > 0;

                        return (
                            <>
                                <p className="text-center max-w-md">
                                    {hasValidTargets
                                        ? "One of your knights was displaced by a stronger opponent. Click on any empty intersection connected by your roads to relocate it."
                                        : "No valid intersections available to relocate your knight. You must remove it from the board."
                                    }
                                </p>
                                {!hasValidTargets && (
                                    <div className="flex gap-4">
                                        <button
                                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition-colors"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/game/${roomId}/knight`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            playerId,
                                                            action: 'relocate',
                                                            knightId: gameState.pendingDisplacement!.knightId,
                                                            targetVertexId: null // Remove
                                                        })
                                                    });
                                                    if (!res.ok) throw new Error('Failed to remove knight');
                                                } catch (e) {
                                                    console.error('Error removing knight:', e);
                                                }
                                            }}
                                        >
                                            Remove Knight
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4">

                {/* Left Sidebar: Game Log & Debug Panel */}
                {/* Positioned below Map Controls (approx top-20) */}
                <div className="absolute top-48 left-4 bottom-24 w-80 flex flex-col gap-4 pointer-events-auto">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <GameLog logs={gameState.logs || []} />
                    </div>
                    {/* Debug Panel */}
                    {isDebugMode && currentPlayer && (
                        <DebugPanel player={currentPlayer} roomId={roomId} />
                    )}
                </div>

                {/* Right Sidebar: Status + C&K Components */}
                <div className="absolute top-4 right-4 w-80 flex flex-col gap-4 pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <GameStatus gameState={gameState} currentPlayerId={playerId} />
                    {isCitiesAndKnights && (
                        <>
                            <EventDieDisplay gameState={gameState} />
                            <BarbarianTrack gameState={gameState} />
                        </>
                    )}
                </div>

                {/* Bottom Center: Build Controls & Resources */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-auto max-w-[90vw]">
                    {/* Build Controls */}
                    <BuildControls
                        gameState={gameState}
                        playerId={playerId}
                        buildMode={buildMode}
                        onSetBuildMode={setBuildMode}
                    />

                    {/* Resources, Commodities & Dev Cards / Progress Cards */}
                    <div className="flex gap-4 items-stretch max-w-full overflow-x-auto">
                        {currentPlayer && <PlayerHand player={currentPlayer} roomId={roomId} lastTheft={gameState.lastTheft} />}
                        {isCitiesAndKnights && currentPlayer && (
                            <>
                                <ProgressCardHand
                                    player={currentPlayer}
                                    roomId={roomId}
                                    gameState={gameState}
                                    onPlayCard={handlePlayProgressCard}
                                    onStartHexSelection={handleStartHexSelection}
                                    onStartVertexSelection={handleStartVertexSelection}
                                />
                            </>
                        )}
                        {!isCitiesAndKnights && <PlayerDevCards gameState={gameState} playerId={playerId} />}

                    </div>
                </div>

                {/* Bottom Right: Dice & Actions */}
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-4 pointer-events-auto">
                    <DiceDisplay diceRoll={gameState.diceRoll} eventDieRoll={gameState.eventDieRoll} />
                    <ActionControls
                        gameState={gameState}
                        playerId={playerId}
                        onOpenTrade={() => setShowTrade(true)}
                    />
                </div>
            </div>
        </div>
    );
};

// Export wrapped with OptimisticGameStateProvider
export const GameController: React.FC<GameControllerProps> = (props) => {
    return (
        <OptimisticGameStateProvider>
            <GameControllerInner {...props} />
        </OptimisticGameStateProvider>
    );
};
