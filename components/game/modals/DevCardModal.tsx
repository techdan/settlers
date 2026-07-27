import { useState, type FC } from 'react';
import type {
    DevCardPlayOptions,
    DevCardType,
    PlayerState
} from '@/lib/types/player';
import type { ResourceType } from '@/core/rules/board-constants';
import { DevCardFace } from '@/themes/tabletop/cards';
import { TabletopResourceIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '../ui/TabletopModal';

interface DevCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardType: DevCardType | null;
    currentPlayer: PlayerState;
    onPlay: (
        cardType: DevCardType,
        options?: DevCardPlayOptions
    ) => Promise<void>;
}

const DEV_CARD_DEFINITIONS: Record<DevCardType, { name: string; description: string }> = {
    knight: {
        name: 'Knight (Soldier)',
        description: 'Move the robber. Steal 1 random resource from a player with a settlement or city adjacent to the hex you move it to.'
    },
    victory_point: {
        name: 'Victory Point',
        description: 'Counts as 1 victory point toward the 10 needed to win. Reveal to claim your victory!'
    },
    road_building: {
        name: 'Road Building',
        description: 'Place 2 roads for free as if you had just built them.'
    },
    year_of_plenty: {
        name: 'Year of Plenty',
        description: 'Take any 2 resource cards from the bank (of your choice).'
    },
    monopoly: {
        name: 'Monopoly',
        description: 'Name a resource type. All other players give you all their cards of that type.'
    }
};

const RESOURCES = ['wood', 'brick', 'sheep', 'wheat', 'ore'] satisfies ResourceType[];

export const DevCardModal: FC<DevCardModalProps> = ({
    isOpen,
    onClose,
    cardType,
    currentPlayer,
    onPlay
}) => {
    const [resource1, setResource1] = useState<ResourceType>('wood');
    const [resource2, setResource2] = useState<ResourceType>('brick');
    const [monopolyRes, setMonopolyRes] = useState<ResourceType>('ore');
    const [error, setError] = useState<string>('');

    if (!isOpen || !cardType) return null;

    const cardMeta = DEV_CARD_DEFINITIONS[cardType];

    const resetState = () => {
        setResource1('wood');
        setResource2('brick');
        setMonopolyRes('ore');
        setError('');
    };

    const handlePlay = async () => {
        let options: DevCardPlayOptions | undefined;
        setError('');

        switch (cardType) {
            case 'year_of_plenty':
                options = { resource1, resource2 };
                break;

            case 'monopoly':
                options = { monopolyResource: monopolyRes };
                break;

            case 'knight':
            case 'road_building':
            case 'victory_point':
                // No options needed - these cards have follow-up actions or immediate effects
                break;
        }

        try {
            await onPlay(cardType, options);
            onClose();
            resetState();
        } catch (caught: unknown) {
            setError(caught instanceof Error && caught.message
                ? caught.message
                : 'Failed to play card');
        }
    };

    const renderCardForm = () => {
        switch (cardType) {
            case 'year_of_plenty':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">First Resource:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setResource1(r)}
                                        className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-xs capitalize transition ${tabletopOptionClass(resource1 === r)}`}
                                    >
                                        <TabletopResourceIcon type={r} size={24} />
                                        <span>{r}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-2">Second Resource:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setResource2(r)}
                                        className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-xs capitalize transition ${tabletopOptionClass(resource2 === r)}`}
                                    >
                                        <TabletopResourceIcon type={r} size={24} />
                                        <span>{r}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-[var(--ui-muted)]">
                            You will receive <span className="font-semibold text-emerald-300">1 {resource1}</span> and <span className="font-semibold text-emerald-300">1 {resource2}</span> from the bank.
                        </p>
                    </div>
                );

            case 'monopoly': {
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">Select Resource to Monopolize:</label>
                            <div className="grid grid-cols-5 gap-2">
                                {RESOURCES.map(r => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setMonopolyRes(r)}
                                        className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-xs capitalize transition ${tabletopOptionClass(monopolyRes === r)}`}
                                    >
                                        <TabletopResourceIcon type={r} size={24} />
                                        <span>{r}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-[var(--ui-text)]">
                            All other players must give you all of their <span className="font-semibold text-emerald-300">{monopolyRes}</span>.
                        </p>
                    </div>
                );
            }

            case 'knight':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Playing this card will move the robber. You must relocate it to a different hex and may steal a resource from an adjacent player.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            This counts toward the Largest Army bonus (3+ knights).
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            Your current knight count: <span className="font-semibold text-blue-300">{currentPlayer.knightsPlayed || 0}</span>
                        </p>
                    </div>
                );

            case 'victory_point':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Reveal this victory point card to claim <span className="font-semibold text-emerald-300">+1 Victory Point</span>!
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            Once revealed, this point is permanent and visible to all players.
                        </p>
                    </div>
                );

            case 'road_building':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Place <span className="font-semibold text-emerald-300">2 roads</span> for free as if you had just built them.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            After playing this card, select road locations on the board.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            Roads remaining: <span className="font-semibold text-blue-300">{currentPlayer.roadsRemaining}</span>
                        </p>
                        {currentPlayer.roadsRemaining < 2 && (
                            <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-600 rounded px-3 py-2">
                                You only have {currentPlayer.roadsRemaining} road{currentPlayer.roadsRemaining === 1 ? '' : 's'} remaining, so you will only place {currentPlayer.roadsRemaining}.
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <p className="text-sm text-[var(--ui-muted)]">
                        Click “Play Card” to use this card.
                    </p>
                );
        }
    };

    const getActionLabel = () => {
        switch (cardType) {
            case 'year_of_plenty':
                return 'Take Resources';
            case 'monopoly':
                return 'Monopolize';
            case 'knight':
                return 'Move Robber';
            case 'victory_point':
                return 'Reveal';
            case 'road_building':
                return 'Place Roads';
            default:
                return 'Play Card';
        }
    };

    return (
        <TabletopModal
            title={cardMeta.name}
            description={cardMeta.description}
            onClose={onClose}
            footer={(
                <>
                    <TabletopButton onClick={onClose}>Cancel</TabletopButton>
                    <TabletopButton variant="primary" onClick={handlePlay}>{getActionLabel()}</TabletopButton>
                </>
            )}
        >
                <div className="grid grid-cols-[72px_1fr] gap-5">
                    <DevCardFace type={cardType} width={72} />
                    <div>
                    {renderCardForm()}

                    {/* Error Message */}
                    {error && (
                        <div
                            role="alert"
                            className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm"
                        >
                            {error}
                        </div>
                    )}
                    </div>
                </div>
        </TabletopModal>
    );
};
