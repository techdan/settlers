import React from 'react';
import { GameState } from '@/lib/types';
import { DebugPanel } from './DebugPanel';
import { GameTray } from './GameTray';
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

      {/* Right rail: game status with the collapsible log/chat/stats directly beneath it */}
      <div className="absolute top-4 right-4 w-80 flex flex-col gap-3 pointer-events-auto overflow-x-visible">
        <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={handleOpenPlayerCityManagement} />
        <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
      </div>

      {/* Barbarian status lives on the board itself now (BarbarianRoute in BoardCanvas) */}
      {isCitiesAndKnights && (
        <div className="absolute left-4 pointer-events-auto z-20 flex flex-col gap-3" style={{ top: '4.25rem' }}>
          <ProgressDecksPanel gameState={gameState} />
        </div>
      )}

      {/* Debug panel (dev-only) tucked bottom-left, clear of the centered tray */}
      {isDebugMode && currentPlayer && (
        <div className="absolute bottom-3 left-3 pointer-events-auto z-20">
          <DebugPanel player={currentPlayer} roomId={gameState.roomId} />
        </div>
      )}

      {/* Unified bottom tray (Phase 4). No overflow clipping in this chain so the
          progress-card shelf can escape upward; z-index sits above board layers. */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(96vw,1400px)] flex justify-center px-2 pointer-events-none">
        <div className="pointer-events-auto">
          <GameTray
            gameState={gameState}
            playerId={playerId}
            isCitiesAndKnights={isCitiesAndKnights}
            currentPlayer={currentPlayer}
            selectionManager={selectionManager}
            promptBlocksUI={promptBlocksUI}
            engineerSelectionActive={engineerSelectionActive}
            isActiveTurn={isActiveTurn}
            handleCancelFollowupCard={handleCancelFollowupCard}
            decorateCardHandler={decorateCardHandler}
            progressCardControllerHandlers={progressCardControllerHandlers}
            improvementControllerHandlers={improvementControllerHandlers}
            knightControllerHandlers={knightControllerHandlers}
            onRollDice={onRollDice}
            onEndTurn={onEndTurn}
            onOpenTrade={onOpenTrade}
            turnSubmitted={turnSubmitted}
            hasOptimisticUpdates={hasOptimisticUpdates}
          />
        </div>
      </div>
    </div>
  );
};
