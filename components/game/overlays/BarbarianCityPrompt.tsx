import React from 'react';
import { GameState } from '@/lib/types';

interface BarbarianCityPromptProps {
  gameState: GameState;
  playerId: string;
}

/**
 * Overlay shown during barbarian city loss selection.
 */
export const BarbarianCityPrompt: React.FC<BarbarianCityPromptProps> = ({ gameState, playerId }) => {
  if (gameState.phase !== 'barbarian_city_selection') return null;
  if (!gameState.pendingBarbarianVictims?.includes(playerId)) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
      <h3 className="text-xl font-bold">Barbarians Attacked!</h3>
      <p className="text-center">
        The barbarians have sacked your lands!
        <br />
        <span className="font-bold text-red-300">Click on a city to destroy it.</span>
      </p>
    </div>
  );
};
