import React from 'react';
import { GameState } from '@/lib/types';

interface GameOverOverlayProps {
    gameState: GameState;
    onShowBreakdown: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
    gameState,
    onShowBreakdown,
}) => {
    const winner = gameState.winner
        ? gameState.players.find(p => p.id === gameState.winner)
        : null;

    if (!winner) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="pointer-events-auto bg-slate-900/95 border border-amber-300/60 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 text-white">
                <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-amber-200/80">Game Over</div>
                    <div className="text-lg font-bold text-amber-100">{winner.name} wins!</div>
                    <div className="text-xs text-slate-200/80">{winner.victoryPoints} victory points</div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <button
                        onClick={onShowBreakdown}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-md transition-colors cursor-pointer text-xs"
                    >
                        Show Breakdown
                    </button>
                </div>
            </div>
        </div>
    );
};
