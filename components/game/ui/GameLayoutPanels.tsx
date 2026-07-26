'use client';

import React, { useState } from 'react';
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
  const [tabletPanel, setTabletPanel] = useState<'status' | 'activity' | 'decks' | 'debug' | null>(null);
  const activePlayerName = gameState.players.find(player => player.id === gameState.currentTurn)?.name ?? 'Waiting';
  const phaseLabel = gameState.phase.replaceAll('_', ' ');

  const toggleTabletPanel = (panel: NonNullable<typeof tabletPanel>) => {
    setTabletPanel(current => current === panel ? null : panel);
  };

  const tabletButtonClass = (panel: NonNullable<typeof tabletPanel>) =>
    `min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${
      tabletPanel === panel
        ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]'
        : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-text)] hover:brightness-110'
    }`;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 max-xl:p-0">
      {/* Timer expired notification at top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-auto px-4">
        <TurnTimerExpiredNotification gameState={gameState} currentPlayerId={playerId} />
      </div>

      {/* Right rail: game status with the collapsible log/chat/stats directly beneath it */}
      <div className="absolute top-4 right-4 hidden w-80 flex-col gap-3 overflow-x-visible pointer-events-auto xl:flex">
        <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={handleOpenPlayerCityManagement} />
        <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
      </div>

      {/* Barbarian status lives on the board itself now (BarbarianRoute in BoardCanvas) */}
      {isCitiesAndKnights && (
        <div className="absolute left-4 z-20 hidden flex-col gap-3 pointer-events-auto xl:flex" style={{ top: '4.25rem' }}>
          <ProgressDecksPanel gameState={gameState} />
        </div>
      )}

      {/* Debug panel (dev-only) sits above the tray. Keeping it above the tray's
          z-index prevents the tray from intercepting the rightmost Give button
          at medium desktop widths. */}
      {isDebugMode && currentPlayer && (
        <div className="absolute bottom-28 left-3 z-40 hidden max-w-[calc(100vw-1.5rem)] pointer-events-auto xl:block">
          <DebugPanel player={currentPlayer} roomId={gameState.roomId} />
        </div>
      )}

      {/* Tablet HUD: iPad portrait/landscape keeps the board clear and exposes
          desktop side panels through touch-sized, mutually exclusive drawers. */}
      <div className="absolute inset-x-0 top-0 z-50 px-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-auto xl:hidden">
        <div className="mx-auto max-w-4xl rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain">
            <button
              type="button"
              className={`${tabletButtonClass('status')} min-w-max text-left`}
              aria-expanded={tabletPanel === 'status'}
              onClick={() => toggleTabletPanel('status')}
            >
              <span className="block text-[10px] font-medium uppercase tracking-wider opacity-70">{phaseLabel}</span>
              <span className="block">{activePlayerName}</span>
            </button>
            <button type="button" className={tabletButtonClass('activity')} aria-expanded={tabletPanel === 'activity'} onClick={() => toggleTabletPanel('activity')}>
              Log & Chat
            </button>
            {isCitiesAndKnights ? (
              <button type="button" className={tabletButtonClass('decks')} aria-expanded={tabletPanel === 'decks'} onClick={() => toggleTabletPanel('decks')}>
                Decks
              </button>
            ) : null}
            {isDebugMode && currentPlayer ? (
              <button type="button" className={tabletButtonClass('debug')} aria-expanded={tabletPanel === 'debug'} onClick={() => toggleTabletPanel('debug')}>
                Debug
              </button>
            ) : null}
          </div>

          {tabletPanel ? (
            <div className="mt-2 max-h-[min(52dvh,32rem)] overflow-y-auto overscroll-contain rounded-lg" data-tablet-panel={tabletPanel}>
              {tabletPanel === 'status' ? (
                <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={handleOpenPlayerCityManagement} />
              ) : null}
              {tabletPanel === 'activity' ? (
                <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
              ) : null}
              {tabletPanel === 'decks' ? <ProgressDecksPanel gameState={gameState} /> : null}
              {tabletPanel === 'debug' && currentPlayer ? <DebugPanel player={currentPlayer} roomId={gameState.roomId} /> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Unified bottom tray (Phase 4). No overflow clipping in this chain so the
          progress-card shelf can escape upward; z-index sits above board layers. */}
      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-full max-w-[min(96vw,1400px)] -translate-x-1/2 justify-center px-2 pointer-events-none max-xl:max-w-none max-xl:px-[max(0.5rem,env(safe-area-inset-left))]">
        <div className="pointer-events-auto max-xl:w-full max-xl:max-h-[40dvh] max-xl:overflow-x-auto max-xl:overflow-y-auto max-xl:overscroll-contain">
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
