import React from 'react';
import { GameState } from '@/lib/types';
import { DebugPanel } from './DebugPanel';
import { BuildControls } from '../city/BuildControls';
import { PlayerHand } from '../player/PlayerHand';
import { PlayerDevCards } from '../player/PlayerDevCards';
import { ProgressCardHand } from '../progress/ProgressCardHand';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { SidebarTabs } from './SidebarTabs';
import { CompactGameStatus } from './CompactGameStatus';
import { TurnTimerExpiredNotification } from './TurnTimerExpiredNotification';
import { ProgressDecksPanel } from '../overlays/ProgressDecksPanel';
import { ProgressCardType } from '@/lib/types/player';

interface GameLayoutPanelsProps {
  gameState: GameState;
  playerId: string;
  isCitiesAndKnights: boolean;
  isDebugMode: boolean;
  currentPlayer: any;
  selectionManager: any;
  promptBlocksUI: boolean;
  engineerSelectionActive: boolean;
  isActiveTurn: boolean;
  handleOpenPlayerCityManagement: () => void;
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

export const GameLayoutPanels: React.FC<GameLayoutPanelsProps> = ({
  gameState,
  playerId,
  isCitiesAndKnights,
  isDebugMode,
  currentPlayer,
  selectionManager,
  promptBlocksUI,
  engineerSelectionActive,
  isActiveTurn,
  handleOpenPlayerCityManagement,
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
  return (
    <div className="absolute inset-0 pointer-events-none p-4">
      {/* Timer expired notification at top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-auto px-4">
        <TurnTimerExpiredNotification gameState={gameState} currentPlayerId={playerId} />
      </div>

      <div className="absolute top-4 right-4 w-80 pointer-events-auto overflow-x-visible">
        <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={handleOpenPlayerCityManagement} />
      </div>

      {/* Barbarian status lives on the board itself now (BarbarianRoute in BoardCanvas) */}
      {isCitiesAndKnights && (
        <div className="absolute left-4 pointer-events-auto z-20 flex flex-col gap-3" style={{ top: '4.25rem' }}>
          <ProgressDecksPanel gameState={gameState} />
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex items-end gap-4 pointer-events-none origin-bottom-left transition-transform duration-300 scale-75 xl:scale-85 2xl:scale-100">
        <div className="flex flex-col items-end gap-2">
          {isDebugMode && currentPlayer && (
            <div className="self-start pointer-events-auto">
              <DebugPanel player={currentPlayer} roomId={gameState.roomId} />
            </div>
          )}

          {/* Base game: stack Build above Resources, Dev Cards span both rows */}
          {!isCitiesAndKnights && (
            <div className="flex items-end gap-4 max-w-full overflow-x-auto pointer-events-auto">
              {/* Left column: Build stacked above Resources (same width) */}
              <div className="flex flex-col gap-0">
                <div className={promptBlocksUI ? 'opacity-60 pointer-events-none w-full' : 'pointer-events-auto w-full'}>
                  <BuildControls
                    gameState={gameState}
                    playerId={playerId}
                    buildMode={selectionManager.buildMode}
                    onSetBuildMode={selectionManager.setBuildMode}
                  />
                </div>

                {currentPlayer && (
                  <div className="w-full mt-2.5">
                    <PlayerHand player={currentPlayer} roomId={gameState.roomId} lastTheft={gameState.lastTheft} />
                  </div>
                )}
              </div>

              {/* Right column: Dev Cards natural height (no stretching) */}
              {currentPlayer && (
                <div className="self-end">
                  <PlayerDevCards gameState={gameState} playerId={playerId} />
                </div>
              )}
            </div>
          )}

          {/* Cities & Knights: keep Progress Cards layout */}
          {isCitiesAndKnights && (
            <>
              <div className={promptBlocksUI ? 'opacity-60 pointer-events-none' : 'pointer-events-auto'}>
                <BuildControls
                  gameState={gameState}
                  playerId={playerId}
                  buildMode={selectionManager.buildMode}
                  onSetBuildMode={selectionManager.setBuildMode}
                />
              </div>
              <div className="flex items-center gap-4 max-w-full overflow-x-auto pointer-events-auto">
                {currentPlayer && <PlayerHand player={currentPlayer} roomId={gameState.roomId} lastTheft={gameState.lastTheft} />}
              </div>
            </>
          )}
        </div>

        {isCitiesAndKnights && currentPlayer && (
          <div className="flex-shrink-0 pointer-events-auto">
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
              activeFollowupCard={selectionManager.selectingCityForMetropolis ? null : null}
              onCancelFollowupCard={handleCancelFollowupCard}
              decorateCardHandler={decorateCardHandler}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex items-end gap-4 pointer-events-none">
        <div className={`flex flex-col items-center gap-2 ${promptBlocksUI ? 'opacity-60 pointer-events-none' : 'pointer-events-auto'} origin-bottom-right transition-transform duration-300 scale-75 xl:scale-85 2xl:scale-100`}>
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

        <div className="w-80 pointer-events-auto">
          <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
        </div>
      </div>
    </div>
  );
};
