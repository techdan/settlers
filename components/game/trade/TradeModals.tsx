import React from 'react';
import { GameState } from '@/lib/types';
import { TradeProgressModal } from '../overlays/TradeProgressModal';
import { TradeCompletedNotification } from '../overlays/TradeCompletedNotification';
import { TradeController } from '@/lib/controllers/trade-controller';

interface TradeModalsProps {
  gameState: GameState;
  playerId: string;
  tradeController: TradeController;
  showTradeCompletion: boolean;
  onDismissTradeCompletion: () => void;
}

export const TradeModals: React.FC<TradeModalsProps> = ({
  gameState,
  playerId,
  tradeController,
  showTradeCompletion,
  onDismissTradeCompletion,
}) => {
  return (
    <>
      {/* Trade Progress Modal - shown to initiator when trade is offered */}
      <TradeProgressModal
        gameState={gameState}
        playerId={playerId}
        onCancel={() => tradeController.handleCancelTrade()}
      />

      {/* Trade Completed Notification - shown to both players after trade is accepted */}
      {showTradeCompletion && gameState.lastTrade && (() => {
        const trade = gameState.lastTrade;
        const isInitiator = trade.initiatorId === playerId;
        const isAcceptor = trade.acceptorId === playerId;

        if (!isInitiator && !isAcceptor) return null;

        const partner = isInitiator
          ? gameState.players.find(p => p.id === trade.acceptorId)
          : gameState.players.find(p => p.id === trade.initiatorId);

        if (!partner) return null;

        // What did THIS player give and receive?
        const gave = isInitiator ? trade.initiatorGave : trade.initiatorReceived;
        const received = isInitiator ? trade.initiatorReceived : trade.initiatorGave;

        return (
          <TradeCompletedNotification
            isOpen={showTradeCompletion}
            wasInitiator={isInitiator}
            partnerName={partner.name}
            gave={gave}
            received={received}
            onDismiss={onDismissTradeCompletion}
          />
        );
      })()}
    </>
  );
};
