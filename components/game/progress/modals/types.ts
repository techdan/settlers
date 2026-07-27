import type { GameState } from '@/lib/types/game';
import type { PlayerState, ProgressCardType } from '@/lib/types/player';

export type ProgressCardPlayOptions = Record<string, unknown>;

export interface ProgressCardModalContentProps {
    gameState: GameState;
    currentPlayer: PlayerState;
    onClose: () => void;
    onPlay: (
        cardType: ProgressCardType,
        options: ProgressCardPlayOptions
    ) => Promise<void>;
}
