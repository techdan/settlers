import React from 'react';
import { GameState } from '@/lib/types';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';

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
    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
      <h3 className="text-xl font-bold">Your Knight Was Displaced!</h3>
      <p className="text-center max-w-md">
        {hasValidTargets
          ? 'One of your knights was displaced by a stronger opponent. Click on any empty intersection connected by your roads to relocate it.'
          : 'No valid intersections available to relocate your knight. You must remove it from the board.'}
      </p>
      {!hasValidTargets && (
        <div className="flex gap-4">
          <button
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition-colors cursor-pointer"
            onClick={() => onRemoveDisplacedKnight(displacement.knightId)}
          >
            Remove Knight
          </button>
        </div>
      )}
    </div>
  );
};
