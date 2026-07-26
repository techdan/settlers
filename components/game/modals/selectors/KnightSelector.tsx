import React from 'react';
import { GameState } from '@/lib/types/game';
import { PlayerState } from '@/lib/types';
import { KnightPiece, TabletopStatusIcon } from '@/themes/tabletop';
import { tabletopOptionClass } from '@/components/game/ui/TabletopModal';

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
        return { label: 'Basic', strength: 1 };
      case 'strong':
        return { label: 'Strong', strength: 2 };
      case 'mighty':
        return { label: 'Mighty', strength: 3 };
      default:
        return { label: 'Unknown', strength: 0 };
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
      <div className="py-8 text-center text-sm text-[var(--ui-muted)]">
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
              className={`w-full rounded-lg border-2 p-3 text-left transition-all ${tabletopOptionClass(isSelected, !promotable)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <svg viewBox="-16 -16 32 32" width="42" height="42" aria-hidden="true">
                    <KnightPiece color={currentPlayer.color} level={knight.level} active={knight.active} />
                  </svg>
                  <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--ui-text)]">
                      {levelInfo.label} Knight
                    </span>
                    <span className="text-xs text-[var(--ui-muted)]">
                      (Strength: {levelInfo.strength})
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--ui-muted)]">
                    <TabletopStatusIcon type={knight.active ? 'active' : 'inactive'} size={15} />
                    <span>{knight.active ? 'Active' : 'Inactive'} · Vertex: {knight.vertexId}</span>
                  </div>
                  </div>
                </div>
                {!promotable && (
                  <div className="text-xs text-[var(--ui-muted)]">
                    Cannot promote
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-[var(--ui-muted)]">
        Selected: {selections.length} / {maxSelections}
        {selections.length < minSelections && (
          <span className="ml-2 text-[var(--ui-accent)]">
            (Select at least {minSelections})
          </span>
        )}
      </div>
    </div>
  );
};
