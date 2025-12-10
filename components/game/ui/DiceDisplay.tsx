import React from 'react';
import { GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';
import { Tooltip } from '@/components/ui/tooltip';

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

const EVENT_DIE_TEXT: Record<EventDieFace, { title: string; description: string }> = {
    ship: { title: 'Barbarian Advance', description: 'Barbarian moves forward one space' },
    green: { title: 'Science', description: 'Progress cards drawn from Science' },
    yellow: { title: 'Trade', description: 'Progress cards drawn from Trade' },
    blue: { title: 'Politics', description: 'Progress cards drawn from Politics' }
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
                <Tooltip content="Red Die" placement="top">
                    <div
                        className="w-10 h-10 bg-red-600 text-white rounded flex items-center justify-center font-bold text-xl shadow-lg cursor-default transition-transform hover:scale-110"
                    >
                        {diceRoll.d1}
                    </div>
                </Tooltip>
                {/* Yellow Die */}
                <Tooltip content="Yellow Die" placement="top">
                    <div
                        className="w-10 h-10 bg-yellow-500 text-black rounded flex items-center justify-center font-bold text-xl shadow-lg cursor-default transition-transform hover:scale-110"
                    >
                        {diceRoll.d2}
                    </div>
                </Tooltip>
            </div>

            {/* Total */}
            <Tooltip content={`Total: ${diceRoll.total}`} placement="top">
                <div
                    className="text-2xl font-bold text-yellow-400 cursor-default"
                >
                    {diceRoll.total}
                </div>
            </Tooltip>

            {/* Event Die (Cities & Knights) */}
            {eventDieRoll && (
                <>
                    <div className="w-px h-8 bg-white/20" />
                    <Tooltip
                        content={(
                            <div className="flex flex-col text-left">
                                <span className="font-semibold text-white">{EVENT_DIE_TEXT[eventDieRoll.face].title}</span>
                                <span className="text-slate-200">{EVENT_DIE_TEXT[eventDieRoll.face].description}</span>
                            </div>
                        )}
                        placement="top"
                    >
                        <div
                            className={`w-10 h-10 ${EVENT_DIE_COLORS[eventDieRoll.face].bg} ${EVENT_DIE_COLORS[eventDieRoll.face].text} rounded flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110`}
                            aria-label={`Event die: ${EVENT_DIE_TEXT[eventDieRoll.face].title}`}
                        >
                            {eventDieRoll.face === 'ship' ? (
                                <img src="/icons/drakkar.svg" alt="Barbarian Ship" style={{ width: '32px', height: '32px' }} />
                            ) : (
                                <GameIcon type={getIconType(eventDieRoll.face)} size={32} />
                            )}
                        </div>
                    </Tooltip>
                </>
            )}
        </div>
    );
};
