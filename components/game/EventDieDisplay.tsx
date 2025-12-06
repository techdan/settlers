import React from 'react';
import { GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface EventDieDisplayProps {
    gameState: GameState;
}

const EVENT_DIE_LABELS: Record<EventDieFace, string> = {
    ship: 'Barbarian Advance',
    green: 'Science',
    yellow: 'Trade',
    blue: 'Politics'
};

export const EventDieDisplay: React.FC<EventDieDisplayProps> = ({ gameState }) => {
    // Only show in C&K mode
    if (gameState.gameMode !== 'cities_and_knights' || !gameState.eventDieRoll) {
        return null;
    }

    const { face } = gameState.eventDieRoll;

    // Map event die faces to improvement types or special icons
    const getIconType = (face: EventDieFace) => {
        switch (face) {
            case 'green': return 'science';
            case 'yellow': return 'trade';
            case 'blue': return 'politics';
            case 'ship': return 'barbarian-ship';
        }
    };

    const iconType = getIconType(face);

    return (
        <div className="bg-slate-800/90 p-3 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex items-center gap-3">
                <div className="text-xs text-slate-400 uppercase tracking-wider">
                    Event Die:
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                        {face === 'ship' ? (
                            <img src="/icons/drakkar.svg" alt="Barbarian Ship" style={{ width: '32px', height: '32px' }} />
                        ) : (
                            <GameIcon type={iconType} size={32} />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">{EVENT_DIE_LABELS[face]}</span>
                        {face === 'ship' && (
                            <span className="text-xs text-red-400">Barbarian moves forward!</span>
                        )}
                        {face !== 'ship' && (
                            <span className="text-xs text-slate-400">Progress cards drawn</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
