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

// Cities & Knights components
import { CityImprovements } from './CityImprovements';
import { KnightControls } from './KnightControls';
import { BarbarianTrack } from './BarbarianTrack';
import { EventDieDisplay } from './EventDieDisplay';
import { ProgressCardHand } from './ProgressCardHand';
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

    // C&K action handlers (placeholder implementations)
    const handleUpgradeImprovement = async (improvement: 'science' | 'trade' | 'politics') => {
        try {
            const res = await fetch(`/api/game/${roomId}/improvement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'upgrade', improvement })
            });
            if (!res.ok) throw new Error('Failed to upgrade improvement');
        } catch (e) {
            console.error('Error upgrading improvement:', e);
        }
    };

    const handleBuildKnight = async () => {
        try {
            // This would need vertex selection logic similar to buildMode
            console.log('Build knight - vertex selection needed');
        } catch (e) {
            console.error('Error building knight:', e);
        }
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
            />

            <DiscardModal gameState={gameState} playerId={playerId} />

            {showTrade && (
                <TradeModal
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setShowTrade(false)}
                />
            )}

            <TradeOfferDisplay gameState={gameState} playerId={playerId} />

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
                            {currentPlayer && (
                                <CityImprovements
                                    player={currentPlayer}
                                    roomId={roomId}
                                    gameState={gameState}
                                    onUpgrade={handleUpgradeImprovement}
                                    onBuildMetropolis={handleBuildMetropolis}
                                />
                            )}
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
                        {currentPlayer && <PlayerHand player={currentPlayer} roomId={roomId} />}
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
                        {isCitiesAndKnights && currentPlayer && (
                            <KnightControls
                                player={currentPlayer}
                                roomId={roomId}
                                onBuildKnight={handleBuildKnight}
                                onActivateKnight={handleActivateKnight}
                                onMoveKnight={handleMoveKnight}
                                onUpgradeKnight={handleUpgradeKnight}
                            />
                        )}
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
