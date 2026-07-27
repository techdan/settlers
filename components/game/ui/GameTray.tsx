import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { BuildControls } from '../city/BuildControls';
import { PlayerHand } from '../player/PlayerHand';
import { PlayerDevCards } from '../player/PlayerDevCards';
import { ProgressCardHand } from '../progress/ProgressCardHand';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { PlayerState, ProgressCardType } from '@/lib/types/player';
import type {
  EdgeSelectionType,
  HexSelectionType,
  SelectionState,
} from '@/lib/hooks/useSelectionManager';
import type { ProgressCardHandlerDecorator } from '@/lib/hooks/useProgressCardSelectionDecorator';

type GameTraySelectionState = Pick<
  SelectionState,
  'buildMode' | 'setBuildMode' | 'selectingKnightsForSmith' | 'selectingCityForMedicine'
>;

interface GameTrayProgressCardHandlers {
  handlePlayProgressCard: (type: ProgressCardType, options?: unknown) => Promise<void>;
  handleStartHexSelection: (type: HexSelectionType) => void;
  handleStartVertexSelection: (type: 'intrigue') => void;
  handleStartEdgeSelection: (type: EdgeSelectionType) => void;
  handleStartEngineerSelection: () => void;
  handleStartMedicineSelection: () => void;
  handleStartTreasonSelection: () => void;
}

export interface GameTrayProps {
  gameState: GameState;
  playerId: string;
  isCitiesAndKnights: boolean;
  currentPlayer: PlayerState | undefined;
  selectionManager: GameTraySelectionState;
  promptBlocksUI: boolean;
  engineerSelectionActive: boolean;
  isActiveTurn: boolean;
  handleCancelFollowupCard: () => void;
  decorateCardHandler: ProgressCardHandlerDecorator;
  progressCardControllerHandlers: GameTrayProgressCardHandlers;
  improvementControllerHandlers: {
    handleStartCraneDialog: () => void;
  };
  knightControllerHandlers: {
    handleStartSmithSelection: () => void;
  };
  onRollDice: () => void;
  onEndTurn: () => void;
  onOpenTrade: () => void;
  turnSubmitted: boolean;
  hasOptimisticUpdates: boolean;
}

/**
 * Thin vertical divider between tray slots. Uses the HUD text token at low
 * opacity so it reads on the warm panel without a hard line.
 */
const Divider: React.FC = () => (
  <div className="self-stretch w-px my-1 bg-[var(--ui-text)]/15" aria-hidden="true" />
);

/**
 * Unified bottom dock (graphics overhaul Phase 4). A single warm-chrome panel
 * that hosts, left -> right: build controls, the resource/commodity hand,
 * progress cards (C&K) or dev cards (base), and dice + turn actions.
 *
 * The panel deliberately carries NO overflow clipping: ProgressCardHand's shelf
 * renders `absolute bottom-full` and must escape upward over the board. The
 * promptBlocksUI dimming/pointer-events gating is preserved exactly as the old
 * bottom clusters had it: BuildControls and the dice/actions cluster are gated;
 * the hand and card slots are not.
 */
export const GameTray: React.FC<GameTrayProps> = ({
  gameState,
  playerId,
  isCitiesAndKnights,
  currentPlayer,
  selectionManager,
  promptBlocksUI,
  engineerSelectionActive,
  isActiveTurn,
  handleCancelFollowupCard,
  decorateCardHandler,
  progressCardControllerHandlers,
  improvementControllerHandlers,
  knightControllerHandlers,
  onRollDice,
  onEndTurn,
  onOpenTrade,
  turnSubmitted,
  hasOptimisticUpdates,
}) => {
  // A progress-card panel is open. Board-visible panels (Alchemy, the
  // monopolies) intentionally have no scrim, so nothing else stops a Roll or
  // End Turn click from discarding the choice — gate them here instead. The
  // card slot stays live so clicking the card again still cancels.
  const [openCardPanel, setOpenCardPanel] = useState<ProgressCardType | null>(null);

  const gated = promptBlocksUI || openCardPanel ? 'opacity-60 pointer-events-none' : 'pointer-events-auto';

  // Slot D only exists when there is something to show (dice rolled, or it's the
  // active player's un-submitted turn) — otherwise its leading divider dangles.
  const visibleEventDieRoll =
    gameState.diceRoll || gameState.pendingAlchemy ? gameState.eventDieRoll : undefined;
  const showDice = !!gameState.diceRoll || !!visibleEventDieRoll;
  const showActions = isActiveTurn && !turnSubmitted;
  const showActionSlot = showDice || showActions;

  const slots: React.ReactNode[] = [];

  // (a) Build controls
  slots.push(
    <div key="build" data-tray-slot="build" className={gated}>
      <BuildControls
        gameState={gameState}
        playerId={playerId}
        buildMode={selectionManager.buildMode}
        onSetBuildMode={selectionManager.setBuildMode}
      />
    </div>
  );

  // (b) Resource / commodity hand
  if (currentPlayer) {
    slots.push(
      <div key="hand" className="pointer-events-auto">
        <PlayerHand player={currentPlayer} roomId={gameState.roomId} lastTheft={gameState.lastTheft} />
      </div>
    );
  }

  // (c) Progress cards (C&K) or dev cards (base game)
  if (currentPlayer) {
    slots.push(
      isCitiesAndKnights ? (
        <div key="cards" className="pointer-events-auto">
          <ProgressCardHand
            player={currentPlayer}
            roomId={gameState.roomId}
            gameState={gameState}
            onPlayCard={progressCardControllerHandlers.handlePlayProgressCard}
            onStartHexSelection={progressCardControllerHandlers.handleStartHexSelection}
            onStartVertexSelection={progressCardControllerHandlers.handleStartVertexSelection}
            onStartEdgeSelection={progressCardControllerHandlers.handleStartEdgeSelection}
            onStartCrane={improvementControllerHandlers.handleStartCraneDialog}
            onStartEngineerSelection={progressCardControllerHandlers.handleStartEngineerSelection}
            onStartSmithSelection={knightControllerHandlers.handleStartSmithSelection}
            onStartMedicineSelection={progressCardControllerHandlers.handleStartMedicineSelection}
            onStartTreasonSelection={progressCardControllerHandlers.handleStartTreasonSelection}
            isActiveTurn={isActiveTurn}
            isEngineerSelecting={engineerSelectionActive}
            isSmithSelecting={selectionManager.selectingKnightsForSmith}
            isMedicineSelecting={selectionManager.selectingCityForMedicine}
            onCancelFollowupCard={handleCancelFollowupCard}
            onOpenPanelChange={setOpenCardPanel}
            decorateCardHandler={decorateCardHandler}
          />
        </div>
      ) : (
        <div key="cards" className="pointer-events-auto">
          <PlayerDevCards gameState={gameState} playerId={playerId} />
        </div>
      )
    );
  }

  // (d) Dice + turn actions. They share a slot but are not the same kind of
  // thing — one reports the roll, the other is what you can do about it. Both
  // clusters space their own children at gap-2, so the boundary between them is
  // drawn at 3x that rather than with a third style of divider line.
  if (showActionSlot) {
    slots.push(
      <div key="actions" data-tray-slot="actions" className={`flex items-end gap-6 max-xl:gap-4 ${gated}`}>
        <DiceDisplay diceRoll={gameState.diceRoll} eventDieRoll={visibleEventDieRoll} />
        <ActionControls
          gameState={gameState}
          playerId={playerId}
          onOpenTrade={onOpenTrade}
          onRollDice={onRollDice}
          onEndTurn={onEndTurn}
          turnSubmitted={turnSubmitted}
          hasOptimisticUpdates={hasOptimisticUpdates}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-3 rounded-xl px-5 py-3 shadow-xl backdrop-blur-sm bg-[var(--ui-panel)] border border-[var(--ui-border)] max-xl:w-full max-xl:gap-x-3 max-xl:gap-y-2 max-xl:px-3 max-xl:py-2 max-sm:w-max max-sm:min-w-full max-sm:flex-nowrap max-sm:justify-start">
      {slots.map((slot, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Divider />}
          {slot}
        </React.Fragment>
      ))}
    </div>
  );
};
