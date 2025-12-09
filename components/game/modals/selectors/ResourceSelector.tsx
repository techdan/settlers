import React from 'react';
import { InteractionOption } from '@/core/engine/progress/types/CardInteraction';

interface ResourceSelectorProps {
  options: InteractionOption[];
  selections: string[];
  onSelectionsChange: (selections: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Selector component for choosing resource types
 * Used by Resource Monopoly and other cards requiring resource selection
 */
export const ResourceSelector: React.FC<ResourceSelectorProps> = ({
  options,
  selections,
  onSelectionsChange,
  minSelections = 1,
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
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = selections.includes(option.id);
          const isDisabled = option.disabled || false;

          return (
            <button
              key={option.id}
              onClick={() => !isDisabled && handleSelect(option.id)}
              disabled={isDisabled}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-900/30'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={isDisabled ? option.disabledReason : undefined}
            >
              <div className="flex flex-col items-center gap-2">
                {option.icon && <span className="text-3xl">{option.icon}</span>}
                <span className="text-sm font-medium capitalize">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-slate-400">{option.description}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {maxSelections > 1 && (
        <div className="text-xs text-slate-400 text-center">
          Selected: {selections.length} / {maxSelections}
        </div>
      )}
    </div>
  );
};
