import { useCallback, useState } from 'react';
import { moveRobber } from '@/app/actions';

interface UseRobberInteractionsParams {
  roomId: string;
  playerId: string;
}

export function useRobberInteractions({ roomId, playerId }: UseRobberInteractionsParams) {
  const [robberVictimSelectionOpen, setRobberVictimSelectionOpen] = useState(false);
  const [robberHexId, setRobberHexId] = useState<string | null>(null);
  const [robberPotentialVictims, setRobberPotentialVictims] = useState<string[]>([]);

  const handleRobberVictimRequest = useCallback((hexId: string, potentialVictims: string[]) => {
    setRobberHexId(hexId);
    setRobberPotentialVictims(potentialVictims);
    setRobberVictimSelectionOpen(true);
  }, []);

  const handleRobberVictimSelected = useCallback(
    async (victimId: string | null) => {
      if (!robberHexId) return;

      try {
        await moveRobber(roomId, playerId, robberHexId, victimId ?? undefined);
        setRobberVictimSelectionOpen(false);
        setRobberHexId(null);
        setRobberPotentialVictims([]);
      } catch (e) {
        console.error('Failed to move robber with victim', e);
      }
    },
    [playerId, robberHexId, roomId]
  );

  const handleRobberVictimCancel = useCallback(() => {
    setRobberVictimSelectionOpen(false);
    setRobberHexId(null);
    setRobberPotentialVictims([]);
  }, []);

  return {
    robberVictimSelectionOpen,
    robberHexId,
    robberPotentialVictims,
    handleRobberVictimRequest,
    handleRobberVictimSelected,
    handleRobberVictimCancel,
    resetRobberSelection: handleRobberVictimCancel,
  };
}
