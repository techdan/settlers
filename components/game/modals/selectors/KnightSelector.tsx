import React from 'react';
import { GameState } from '@/lib/types/game';
import { PlayerState } from '@/lib/types';

interface KnightSelectorProps {
  gameState: GameState;
  currentPlayer: PlayerState;
  selections: string[];
  onSelectionsChange: (selections: string[]) => void;
  minSelections: number;
  maxSelections: number;
}

/**
 * Selector component for choosing knights to promote/activate
 * Used by Smith (Smithing) card and other knight-related cards
 */
export const KnightSelector: React.FC<KnightSelectorProps> = ({
  gameState,
  currentPlayer,
  selections,
  onSelectionsChange,
  minSelections,
  maxSelections,
}) => {
  const knights = currentPlayer.knights || [];

  const handleToggle = (knightId: string) => {
    if (selections.includes(knightId)) {
      onSelectionsChange(selections.filter((id) => id !== knightId));
    } else if (selections.length < maxSelections) {
      onSelectionsChange([...selections, knightId]);
    }
  };

  const getKnightLevelDisplay = (level: string) => {
    switch (level) {
      case 'basic':
        return { label: 'Basic', strength: 1, color: 'text-slate-300' };
      case 'strong':
        return { label: 'Strong', strength: 2, color: 'text-blue-300' };
      case 'mighty':
        return { label: 'Mighty', strength: 3, color: 'text-purple-300' };
      default:
        return { label: 'Unknown', strength: 0, color: 'text-slate-500' };
    }
  };

  const canPromote = (knight: any) => {
    // Basic check - real implementation would check politics level
    if (knight.level === 'mighty') return false;
    if (knight.level === 'strong') {
      // Would need politics level 3 check here
      return true;
    }
    return true;
  };

  if (knights.length === 0) {
    return (
      <div className="text-sm text-slate-400 text-center py-8">
        You have no knights to select
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {knights.map((knight) => {
          const isSelected = selections.includes(knight.id);
          const levelInfo = getKnightLevelDisplay(knight.level);
          const promotable = canPromote(knight);

          return (
            <button
              key={knight.id}
              onClick={() => promotable && handleToggle(knight.id)}
              disabled={!promotable}
              className={`
                w-full p-3 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-900/30'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                }
                ${!promotable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${levelInfo.color}`}>
                      {levelInfo.label} Knight
                    </span>
                    <span className="text-xs text-slate-400">
                      (Strength: {levelInfo.strength})
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {knight.active ? '✓ Active' : '○ Inactive'}
                    {' • '}
                    Vertex: {knight.vertexId}
                  </div>
                </div>
                {!promotable && (
                  <div className="text-xs text-amber-300">
                    Cannot promote
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 text-center">
        Selected: {selections.length} / {maxSelections}
        {selections.length < minSelections && (
          <span className="text-amber-300 ml-2">
            (Select at least {minSelections})
          </span>
        )}
      </div>
    </div>
  );
};
