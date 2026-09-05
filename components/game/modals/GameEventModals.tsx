import React from 'react';
import { GameState } from '@/lib/types';
import { TradeModal } from '../trade/TradeModal';
import { AqueductModal } from '../progress/AqueductModal';
import { DefenderRewardModal } from '../progress/DefenderRewardModal';
import { CommercialHarborModal } from '../progress/CommercialHarborModal';
import { WeddingGiftModal } from '../progress/WeddingGiftModal';
import { TradeController } from '@/lib/controllers/trade-controller';

interface GameEventModalsProps {
  gameState: GameState;
  playerId: string;
  roomId: string;
  showTrade: boolean;
  onCloseTrade: () => void;
  tradeController: TradeController;
}

export const GameEventModals: React.FC<GameEventModalsProps> = ({
  gameState,
  playerId,
  roomId,
  showTrade,
  onCloseTrade,
  tradeController,
}) => {
  if (gameState.phase !== 'game_over' && gameState.pendingDefenderCardDraws?.includes(playerId)) {
    return <DefenderRewardModal key={gameState.pendingDefenderCardDraws.length} gameState={gameState} playerId={playerId} />;
  }

  return (
    <>
      {showTrade && (
        <TradeModal
          gameState={gameState}
          playerId={playerId}
          tradeController={tradeController}
          onClose={onCloseTrade}
        />
      )}

      {gameState.pendingAqueduct?.includes(playerId) && (
        <AqueductModal gameState={gameState} playerId={playerId} />
      )}

      {gameState.pendingCommercialHarbor && (
        <CommercialHarborModal gameState={gameState} playerId={playerId} roomId={roomId} />
      )}

      {gameState.pendingWedding && (
        <WeddingGiftModal gameState={gameState} playerId={playerId} roomId={roomId} />
      )}
    </>
  );
};
