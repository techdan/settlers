import React from 'react';
import { GameState } from '@/lib/types';
import { BuildControls } from '../city/BuildControls';
import { PlayerHand } from '../player/PlayerHand';
import { PlayerDevCards } from '../player/PlayerDevCards';
import { ProgressCardHand } from '../progress/ProgressCardHand';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { ProgressCardType } from '@/lib/types/player';

interface GameTrayProps {
  gameState: GameState;
  playerId: string;
  isCitiesAndKnights: boolean;
  currentPlayer: any;
  selectionManager: any;
  promptBlocksUI: boolean;
  engineerSelectionActive: boolean;
  isActiveTurn: boolean;
  handleCancelFollowupCard: () => void;
  decorateCardHandler: <TArgs extends any[], TResult>(
    cardType: ProgressCardType,
    hasFollowupStep: boolean,
    handler: (...args: TArgs) => TResult
  ) => (...args: TArgs) => TResult;
  progressCardControllerHandlers: {
    handlePlayProgressCard: (type: ProgressCardType, options?: any) => Promise<void>;
    handleStartHexSelection: (type: any) => void;
    handleStartVertexSelection: (type: any) => void;
    handleStartEdgeSelection: (type: any) => void;
    handleStartEngineerSelection: () => void;
    handleStartMedicineSelection: () => void;
    handleStartTreasonSelection: () => void;
  };
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
  const gated = promptBlocksUI ? 'opacity-60 pointer-events-none' : 'pointer-events-auto';

  // Slot D only exists when there is something to show (dice rolled, or it's the
  // active player's un-submitted turn) — otherwise its leading divider dangles.
  const showDice = !!gameState.diceRoll;
  const showActions = isActiveTurn && !turnSubmitted;
  const showActionSlot = showDice || showActions;

  const slots: React.ReactNode[] = [];

  // (a) Build controls
  slots.push(
    <div key="build" className={gated}>
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
            activeFollowupCard={null}
            onCancelFollowupCard={handleCancelFollowupCard}
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

  // (d) Dice + turn actions
  if (showActionSlot) {
    slots.push(
      <div key="actions" className={`flex items-end gap-3 ${gated}`}>
        <DiceDisplay diceRoll={gameState.diceRoll} eventDieRoll={gameState.eventDieRoll} />
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
    <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-3 rounded-xl px-5 py-3 shadow-xl backdrop-blur-sm bg-[var(--ui-panel)] border border-[var(--ui-border)]">
      {slots.map((slot, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Divider />}
          {slot}
        </React.Fragment>
      ))}
    </div>
  );
};
