import React from 'react';
import { GameState } from '@/lib/game-types';

interface DiceDisplayProps {
    diceRoll: GameState['diceRoll'];
}

export const DiceDisplay: React.FC<DiceDisplayProps> = ({ diceRoll }) => {
    if (!diceRoll) return null;

    return (
        <div className="bg-black/60 p-3 rounded-lg text-white flex items-center gap-4 backdrop-blur-sm border border-white/10 pointer-events-auto">
            <div className="flex gap-2">
                <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                    {diceRoll.d1}
                </div>
                <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                    {diceRoll.d2}
                </div>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
                {diceRoll.total}
            </div>
        </div>
    );
};
