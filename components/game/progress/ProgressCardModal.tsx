import type { GameState } from '@/lib/types/game';
import type { PlayerState, ProgressCardType } from '@/lib/types/player';
import { AlchemyModal } from './modals/AlchemyModal';
import { ChoiceCardModal } from './modals/ChoiceCardModal';
import { EncouragementModal } from './modals/EncouragementModal';
import { EspionageModal } from './modals/EspionageModal';
import { GuildDuesModal } from './modals/GuildDuesModal';
import { OpponentConfirmationModal } from './modals/OpponentConfirmationModal';
import { ProductionConfirmationModal } from './modals/ProductionConfirmationModal';
import { UnsupportedProgressCardModal } from './modals/UnsupportedProgressCardModal';
import type { ProgressCardPlayOptions } from './modals/types';

interface ProgressCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardType: ProgressCardType | null;
    gameState: GameState;
    currentPlayer: PlayerState;
    onPlay: (
        cardType: ProgressCardType,
        options: ProgressCardPlayOptions
    ) => Promise<void>;
}

export function ProgressCardModal({
    isOpen,
    onClose,
    cardType,
    gameState,
    currentPlayer,
    onPlay,
}: ProgressCardModalProps) {
    if (!isOpen || !cardType) return null;

    const sharedProps = { gameState, currentPlayer, onClose, onPlay };

    switch (cardType) {
        case 'alchemist':
            return <AlchemyModal {...sharedProps} />;
        case 'resource_monopoly':
        case 'trade_monopoly':
        case 'merchant_fleet':
            return <ChoiceCardModal {...sharedProps} cardType={cardType} />;
        case 'espionage':
            return <EspionageModal {...sharedProps} />;
        case 'guild_dues':
            return <GuildDuesModal {...sharedProps} />;
        case 'irrigation':
        case 'mining':
            return (
                <ProductionConfirmationModal
                    {...sharedProps}
                    cardType={cardType}
                />
            );
        case 'saboteur':
        case 'wedding':
            return (
                <OpponentConfirmationModal
                    {...sharedProps}
                    cardType={cardType}
                />
            );
        case 'encouragement':
            return <EncouragementModal {...sharedProps} />;
        default:
            return (
                <UnsupportedProgressCardModal
                    {...sharedProps}
                    cardType={cardType}
                />
            );
    }
}
