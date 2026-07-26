import React from 'react';
import { GameState } from '@/lib/types';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

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
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[var(--ui-accent)] bg-[var(--ui-panel)] px-4 py-3 text-[var(--ui-text)] shadow-lg backdrop-blur-sm">
                <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-amber-200/80">Game Over</div>
                    <div className="text-lg font-bold text-amber-100">{winner.name} wins!</div>
                    <div className="text-xs text-[var(--ui-muted)]">{winner.victoryPoints} victory points</div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <TabletopButton
                        onClick={onShowBreakdown}
                        variant="primary"
                        className="px-3 py-1.5 text-xs shadow-md"
                    >
                        Show Breakdown
                    </TabletopButton>
                </div>
            </div>
        </div>
    );
};
