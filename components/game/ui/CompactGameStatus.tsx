'use client';

import React from 'react';
import { GameState } from '@/lib/types';
import { CompactPlayerCard } from '../player/CompactPlayerCard';

interface CompactGameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
    onOpenCityManagement?: () => void;
}

/**
 * Compact game status panel for the redesigned right sidebar.
 * Shows phase indicator and compact player cards.
 */
export const CompactGameStatus: React.FC<CompactGameStatusProps> = ({
    gameState,
    currentPlayerId,
    onOpenCityManagement,
}) => {
    return (
        <div className="bg-slate-900/90 p-3 rounded-lg text-white border border-slate-700 shadow-xl backdrop-blur-sm flex flex-col gap-3 overflow-visible">
            {/* Phase Header */}
            <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Phase</div>
                <div className="text-base font-bold capitalize text-blue-200">
                    {formatPhase(gameState.phase)}
                </div>
            </div>

            {/* Player Cards */}
            <div className="flex flex-col gap-1.5">
                {gameState.players.map(player => (
                    <CompactPlayerCard
                        key={player.id}
                        player={player}
                        gameState={gameState}
                        isCurrentPlayer={player.id === currentPlayerId}
                        isTurn={gameState.currentTurn === player.id}
                        onOpenCityManagement={onOpenCityManagement}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Format phase name for display
 */
function formatPhase(phase: string): string {
    // Handle common phase names
    const phaseLabels: Record<string, string> = {
        waiting_for_roll: 'Roll Dice',
        main_phase: 'Main Phase',
        robber_placement: 'Move Robber',
        theft_selection: 'Steal Resource',
        discard_phase: 'Discard Cards',
        setup_settlement_1: 'Setup: Settlement 1',
        setup_road_1: 'Setup: Road 1',
        setup_settlement_2: 'Setup: Settlement 2',
        setup_road_2: 'Setup: Road 2',
        knight_displacement: 'Knight Displaced',
        barbarian_city_selection: 'Barbarian Attack',
        aqueduct_selection: 'Aqueduct',
        game_over: 'Game Over',
    };

    return phaseLabels[phase] || phase.replace(/_/g, ' ');
}
