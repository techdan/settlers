import React from 'react';
import { GameState } from '@/lib/types';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

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
    <div className="pointer-events-auto absolute left-1/2 top-20 z-50 flex -translate-x-1/2 flex-col items-center gap-4 rounded-lg border border-[var(--ui-danger)] bg-[var(--ui-panel)] p-6 text-[var(--ui-text)] shadow-xl backdrop-blur-sm">
      <TabletopStatusIcon type="warning" size={36} label="Barbarian attack warning" />
      <h3 className="text-xl font-bold">Barbarians Attacked!</h3>
      <p className="text-center">
        The barbarians have sacked your lands!
        <br />
        <span className="font-bold text-[var(--ui-danger)]">Click on a city to destroy it.</span>
      </p>
    </div>
  );
};
