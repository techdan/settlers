import React, { useState } from 'react';
import { CardInteraction, CardInteractionResponse } from '@/core/engine/progress/types/CardInteraction';
import { ResourceSelector } from './selectors/ResourceSelector';
import { CommoditySelector } from './selectors/CommoditySelector';
import { KnightSelector } from './selectors/KnightSelector';
import { GameState } from '@/lib/types/game';
import { PlayerState } from '@/lib/types';

interface ProgressCardInteractionModalProps {
  interaction: CardInteraction;
  gameState: GameState;
  currentPlayer: PlayerState;
  onSubmit: (response: CardInteractionResponse) => void;
  onCancel: () => void;
}

/**
 * Standardized modal for all progress card interactions
 * Routes to appropriate selector component based on interaction type
 */
export const ProgressCardInteractionModal: React.FC<ProgressCardInteractionModalProps> = ({
  interaction,
  gameState,
  currentPlayer,
  onSubmit,
  onCancel,
}) => {
  const [selections, setSelections] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const handleSubmit = () => {
    // Validate selection count
    const min = interaction.minSelections || 0;
    const max = interaction.maxSelections || Infinity;

    if (selections.length < min) {
      setError(`Please select at least ${min} option${min !== 1 ? 's' : ''}`);
      return;
    }

    if (selections.length > max) {
      setError(`Please select at most ${max} option${max !== 1 ? 's' : ''}`);
      return;
    }

    // Submit response
    onSubmit({
      type: interaction.type,
      selections,
    });
  };

  const renderSelector = () => {
    switch (interaction.type) {
      case 'select_resource':
        return (
          <ResourceSelector
            options={interaction.options || []}
            selections={selections}
            onSelectionsChange={setSelections}
            minSelections={interaction.minSelections}
            maxSelections={interaction.maxSelections}
          />
        );

      case 'select_commodity':
        return (
          <CommoditySelector
            options={interaction.options || []}
            selections={selections}
            onSelectionsChange={setSelections}
            minSelections={interaction.minSelections}
            maxSelections={interaction.maxSelections}
          />
        );

      case 'select_knights':
        return (
          <KnightSelector
            gameState={gameState}
            currentPlayer={currentPlayer}
            selections={selections}
            onSelectionsChange={setSelections}
            minSelections={interaction.minSelections || 1}
            maxSelections={interaction.maxSelections || 2}
          />
        );

      case 'confirmation':
        return (
          <div className="text-sm text-slate-200">
            {interaction.context?.message || 'Are you sure you want to proceed?'}
          </div>
        );

      case 'notification':
        return (
          <div className="text-sm text-slate-200">
            {interaction.context?.message || 'Action completed successfully'}
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-300">
            Interaction type not yet implemented: {interaction.type}
          </div>
        );
    }
  };

  const getActionLabel = () => {
    switch (interaction.type) {
      case 'select_resource':
      case 'select_commodity':
        return 'Select';
      case 'select_knights':
        return 'Promote';
      case 'confirmation':
        return 'Confirm';
      case 'notification':
        return 'OK';
      default:
        return 'Submit';
    }
  };

  const canSubmit = () => {
    const min = interaction.minSelections || 0;
    return selections.length >= min;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 pointer-events-auto">
      <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full mx-4 text-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{interaction.cardName}</h2>
            <p className="text-sm text-slate-300 mt-1">{interaction.prompt}</p>
          </div>
          {interaction.allowCancel !== false && (
            <button
              onClick={onCancel}
              className="ml-4 text-slate-400 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {renderSelector()}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          {interaction.allowCancel !== false && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              !canSubmit()
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-70'
                : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
            }`}
          >
            {getActionLabel()}
          </button>
        </div>
      </div>
    </div>
  );
};
