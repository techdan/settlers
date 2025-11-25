'use client';

import React, { useEffect, useState } from 'react';
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
import { OptimisticGameStateProvider, useOptimisticGameState } from '@/lib/hooks/useOptimisticGameState';
import { useConnectionStatus, useFetchWithRetry } from '@/lib/hooks/useConnectionStatus';
import { ConnectionStatusIndicator } from './ConnectionStatus';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
    const [etag, setEtag] = useState<string | null>(null);
    const router = useRouter();
    const { getOptimisticState } = useOptimisticGameState();
    const connectionStatus = useConnectionStatus();
    const { fetchWithRetry } = useFetchWithRetry(connectionStatus);

    useEffect(() => {
        const fetchState = async () => {
            try {
                // Send ETag if we have one for cache validation
                const headers: HeadersInit = {};
                if (etag) {
                    headers['If-None-Match'] = etag;
                }

                // Use fetchWithRetry for automatic retry with exponential backoff
                const data = await fetchWithRetry<GameState>(
                    `/api/game/${roomId}`,
                    { headers },
                    {
                        maxRetries: 5,
                        onRetry: (attempt, delay) => {
                            console.log(`Retrying game state fetch (attempt ${attempt}, delay ${delay}ms)`);
                        }
                    }
                );

                if (data) {
                    setBaseGameState(data);

                    // Store ETag for next request (from response headers)
                    // Note: We'd need to modify fetchWithRetry to return headers
                    // For now, we'll rely on the server sending new ETag each time
                }
            } catch (e) {
                console.error("Failed to fetch game state after retries", e);
                // Don't update state on error - keep showing last known state
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 2000);
        return () => clearInterval(interval);
    }, [roomId, etag, fetchWithRetry]);

    if (!baseGameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    // Apply optimistic updates on top of base state
    const gameState = getOptimisticState(baseGameState);

    const currentPlayer = gameState.players.find(p => p.id === playerId);

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
                onCancelBuild={() => setBuildMode(null)}
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

                {/* Left Sidebar: Game Log */}
                {/* Positioned below Map Controls (approx top-20) */}
                <div className="absolute top-48 left-4 bottom-24 w-80 flex flex-col gap-4 pointer-events-auto">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <GameLog logs={gameState.logs || []} />
                    </div>
                </div>

                {/* Right Sidebar: Status */}
                <div className="absolute top-4 right-4 w-80 flex flex-col gap-4 pointer-events-auto">
                    <GameStatus gameState={gameState} currentPlayerId={playerId} />
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

                    {/* Resources & Dev Cards */}
                    <div className="flex gap-4 items-stretch h-48">
                        {currentPlayer && <PlayerHand player={currentPlayer} roomId={roomId} />}
                        <PlayerDevCards gameState={gameState} playerId={playerId} />
                    </div>
                </div>

                {/* Bottom Right: Dice & Actions */}
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-4 pointer-events-auto">
                    <DiceDisplay diceRoll={gameState.diceRoll} />
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
