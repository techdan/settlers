import React from 'react';
import { GameState } from '@/lib/types';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

interface KnightDisplacementOverlayProps {
  gameState: GameState;
  playerId: string;
  onRemoveDisplacedKnight: (knightId: string) => Promise<void>;
}

/**
 * Overlay shown when a knight is displaced and must be relocated or removed.
 */
export const KnightDisplacementOverlay: React.FC<KnightDisplacementOverlayProps> = ({
  gameState,
  playerId,
  onRemoveDisplacedKnight,
}) => {
  if (gameState.phase !== 'knight_displacement') return null;
  if (gameState.pendingDisplacement?.playerId !== playerId) return null;

  const displacement = gameState.pendingDisplacement!;
  const validTargets = getValidRelocationTargets(gameState, playerId, displacement.originVertexId);
  const hasValidTargets = validTargets.length > 0;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-20 z-50 flex -translate-x-1/2 flex-col items-center gap-4 rounded-lg border border-[var(--ui-danger)] bg-[var(--ui-panel)] p-6 text-[var(--ui-text)] shadow-xl backdrop-blur-sm">
      <TabletopStatusIcon type="warning" size={36} label="Knight displaced warning" />
      <h3 className="text-xl font-bold">Your Knight Was Displaced!</h3>
      <p className="text-center max-w-md">
        {hasValidTargets
          ? 'One of your knights was displaced by a stronger opponent. Click on any empty intersection connected by your roads to relocate it.'
          : 'No valid intersections available to relocate your knight. You must remove it from the board.'}
      </p>
      {!hasValidTargets && (
        <div className="flex gap-4">
          <TabletopButton
            variant="danger"
            onClick={() => onRemoveDisplacedKnight(displacement.knightId)}
          >
            Remove Knight
          </TabletopButton>
        </div>
      )}
    </div>
  );
};
