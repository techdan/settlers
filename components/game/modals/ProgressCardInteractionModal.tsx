import React, { useState } from 'react';
import { CardInteraction, CardInteractionResponse } from '@/core/engine/progress/types/CardInteraction';
import { CardPicker } from './selectors/CardPicker';
import { KnightSelector } from './selectors/KnightSelector';
import { GameState } from '@/lib/types/game';
import { PlayerState } from '@/lib/types';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

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
      // One picker for both: the options already say which cards are on offer,
      // and CardToken draws the right face for each.
      case 'select_resource':
      case 'select_commodity':
        return (
          <CardPicker
            options={interaction.options || []}
            selections={selections}
            onSelectionsChange={setSelections}
            label={interaction.prompt || 'Choose a card'}
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
          <div className="text-sm text-[var(--ui-text)]">
            {interaction.context?.message || 'Are you sure you want to proceed?'}
          </div>
        );

      case 'notification':
        return (
          <div className="text-sm text-[var(--ui-text)]">
            {interaction.context?.message || 'Action completed successfully'}
          </div>
        );

      default:
        return (
          <div className="text-sm text-[var(--ui-muted)]">
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
    <TabletopModal
      title={interaction.cardName}
      description={interaction.prompt}
      onClose={interaction.allowCancel !== false ? onCancel : undefined}
      footer={(
        <>
          {interaction.allowCancel !== false ? <TabletopButton onClick={onCancel}>Cancel</TabletopButton> : null}
          <TabletopButton variant="primary" onClick={handleSubmit} disabled={!canSubmit()}>
            {getActionLabel()}
          </TabletopButton>
        </>
      )}
    >
          {renderSelector()}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2 text-sm text-[var(--ui-text)]"
            >
              {error}
            </div>
          )}
    </TabletopModal>
  );
};
