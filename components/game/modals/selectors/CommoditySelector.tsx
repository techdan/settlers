import React from 'react';
import { InteractionOption } from '@/core/engine/progress/types/CardInteraction';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TabletopCommodityIcon } from '@/themes/tabletop/glyphs';
import { tabletopOptionClass } from '@/components/game/ui/TabletopModal';

const COMMODITY_TYPES = new Set<string>(['paper', 'cloth', 'coin']);

interface CommoditySelectorProps {
  options: InteractionOption[];
  selections: string[];
  onSelectionsChange: (selections: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Selector component for choosing commodity types
 * Used by Trade Monopoly and other cards requiring commodity selection
 */
export const CommoditySelector: React.FC<CommoditySelectorProps> = ({
  options,
  selections,
  onSelectionsChange,
  maxSelections = 1,
}) => {
  const handleSelect = (optionId: string) => {
    if (maxSelections === 1) {
      // Single selection mode
      onSelectionsChange([optionId]);
    } else {
      // Multi-selection mode
      if (selections.includes(optionId)) {
        onSelectionsChange(selections.filter((id) => id !== optionId));
      } else if (selections.length < maxSelections) {
        onSelectionsChange([...selections, optionId]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = selections.includes(option.id);
          const isDisabled = option.disabled || false;

          return (
            <button
              key={option.id}
              onClick={() => !isDisabled && handleSelect(option.id)}
              disabled={isDisabled}
              className={`rounded-lg border-2 p-4 transition-all ${tabletopOptionClass(isSelected, isDisabled)}`}
              title={isDisabled ? option.disabledReason : undefined}
            >
              <div className="flex flex-col items-center gap-2">
                {COMMODITY_TYPES.has(option.id) ? (
                  <TabletopCommodityIcon type={option.id as CommodityType} size={36} label={option.label} />
                ) : null}
                <span className="text-sm font-medium capitalize">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-[var(--ui-muted)]">{option.description}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {maxSelections > 1 && (
        <div className="text-center text-xs text-[var(--ui-muted)]">
          Selected: {selections.length} / {maxSelections}
        </div>
      )}
    </div>
  );
};
