import React from 'react';
import { GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface DiceDisplayProps {
    diceRoll: GameState['diceRoll'];
    eventDieRoll?: GameState['eventDieRoll'];
}

const EVENT_DIE_COLORS: Record<EventDieFace, { bg: string; text: string; label: string }> = {
    ship: { bg: 'bg-gray-700', text: 'text-white', label: 'Barbarian Ship' },
    green: { bg: 'bg-green-600', text: 'text-white', label: 'Science' },
    yellow: { bg: 'bg-yellow-500', text: 'text-black', label: 'Trade' },
    blue: { bg: 'bg-blue-600', text: 'text-white', label: 'Politics' }
};

// Map event die faces to improvement types or special icons
const getIconType = (face: EventDieFace) => {
    switch (face) {
        case 'green': return 'science';
        case 'yellow': return 'trade';
        case 'blue': return 'politics';
        case 'ship': return 'barbarian-ship';
    }
};

export const DiceDisplay: React.FC<DiceDisplayProps> = ({ diceRoll, eventDieRoll }) => {
    if (!diceRoll) return null;

    return (
        <div className="bg-black/60 p-3 rounded-lg text-white flex items-center gap-4 backdrop-blur-sm border border-white/10 pointer-events-auto">
            {/* Regular Dice */}
            <div className="flex gap-2">
                {/* Red Die */}
                <div
                    className="w-10 h-10 bg-red-600 text-white rounded flex items-center justify-center font-bold text-xl shadow-lg cursor-help transition-transform hover:scale-110"
                    title="Red Die"
                >
                    {diceRoll.d1}
                </div>
                {/* Yellow Die */}
                <div
                    className="w-10 h-10 bg-yellow-500 text-black rounded flex items-center justify-center font-bold text-xl shadow-lg cursor-help transition-transform hover:scale-110"
                    title="Yellow Die"
                >
                    {diceRoll.d2}
                </div>
            </div>

            {/* Total */}
            <div
                className="text-2xl font-bold text-yellow-400 cursor-help"
                title={`Total: ${diceRoll.total}`}
            >
                {diceRoll.total}
            </div>

            {/* Event Die (Cities & Knights) */}
            {eventDieRoll && (
                <>
                    <div className="w-px h-8 bg-white/20" />
                    <div
                        className={`w-10 h-10 ${EVENT_DIE_COLORS[eventDieRoll.face].bg} ${EVENT_DIE_COLORS[eventDieRoll.face].text} rounded flex items-center justify-center shadow-lg cursor-help transition-transform hover:scale-110`}
                        title={EVENT_DIE_COLORS[eventDieRoll.face].label}
                    >
                        {eventDieRoll.face === 'ship' ? (
                            <img src="/icons/drakkar.svg" alt="Barbarian Ship" style={{ width: '32px', height: '32px' }} />
                        ) : (
                            <GameIcon type={getIconType(eventDieRoll.face)} size={32} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
