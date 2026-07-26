import React from 'react';
import { GameState } from '@/lib/types';
import { RobberVictimSelectionModal } from './RobberVictimSelectionModal';
import { RobberTheftNotification } from './RobberTheftNotification';

interface RobberModalsProps {
  gameState: GameState;
  playerId: string;
  isOpen: boolean;
  potentialVictims: string[];
  onSelectVictim: (victimId: string | null) => void;
  onCancelVictim: () => void;
  theftNotification: NonNullable<GameState['lastTheft']> | null;
  onDismissTheft: () => void;
}

export const RobberModals: React.FC<RobberModalsProps> = ({
  gameState,
  playerId,
  isOpen,
  potentialVictims,
  onSelectVictim,
  onCancelVictim,
  theftNotification,
  onDismissTheft,
}) => {
  return (
    <>
      <RobberVictimSelectionModal
        isOpen={isOpen}
        gameState={gameState}
        potentialVictims={potentialVictims}
        onSelectVictim={onSelectVictim}
        onCancel={onCancelVictim}
      />

      {theftNotification && (() => {
        const theft = theftNotification;
        const isThief = theft.thiefId === playerId;

        let stolenItems = null;
        if (isThief) {
          stolenItems = theft.items || null;
        } else {
          const victimData = theft.victims?.find(v => v.victimId === playerId);
          stolenItems =
            victimData?.items ||
            (theft.victimId === playerId ? theft.items : null) ||
            null;
        }

        const thief = gameState.players.find(p => p.id === theft.thiefId);
        const victim =
          gameState.players.find(p => p.id === theft.victimId) ||
          gameState.players.find(p => theft.victims?.some(v => v.victimId === p.id));

        return (
          <RobberTheftNotification
            isOpen
            stolenItem={stolenItems?.[0] || null}
            stolenItems={stolenItems || undefined}
            wasVictim={!isThief}
            thiefName={thief?.name}
            victimName={victim?.name}
            source={theft.source}
            onDismiss={onDismissTheft}
          />
        );
      })()}
    </>
  );
};
