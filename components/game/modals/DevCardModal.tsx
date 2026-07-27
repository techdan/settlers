import { useState, type FC } from 'react';
import type {
    DevCardPlayOptions,
    DevCardType,
    PlayerState
} from '@/lib/types/player';
import type { ResourceType } from '@/core/rules/board-constants';
import { DevCardFace } from '@/themes/tabletop/cards';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '../ui/TabletopModal';
import { CARD_LABELS, CardIcon, CardRow, CardToken, CardTokenGroup } from '../ui/CardToken';

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

/** Year of Plenty takes two cards, and they are allowed to be the same one. */
const YEAR_OF_PLENTY_PICKS = 2;

type ResourceTally = Partial<Record<ResourceType, number>>;

const tallyTotal = (tally: ResourceTally) =>
    Object.values(tally).reduce<number>((sum, n) => sum + (n || 0), 0);

/** `{ ore: 2 }` → `['ore', 'ore']`, which is what the play options expect. */
const expandTally = (tally: ResourceTally): ResourceType[] =>
    (Object.entries(tally) as [ResourceType, number][])
        .flatMap(([resource, count]) => Array<ResourceType>(count).fill(resource));

export const DevCardModal: FC<DevCardModalProps> = ({
    isOpen,
    onClose,
    cardType,
    currentPlayer,
    onPlay
}) => {
    // Year of Plenty is a tally, not two separate picks: "two ore" is a normal
    // play, and expressing it as resource1=ore, resource2=ore made the player
    // set the same control twice to say one thing.
    const [plentyPicks, setPlentyPicks] = useState<ResourceTally>({});
    const [monopolyRes, setMonopolyRes] = useState<ResourceType | null>(null);
    const [error, setError] = useState<string>('');

    if (!isOpen || !cardType) return null;

    const cardMeta = DEV_CARD_DEFINITIONS[cardType];
    const plentyTotal = tallyTotal(plentyPicks);

    const resetState = () => {
        setPlentyPicks({});
        setMonopolyRes(null);
        setError('');
    };

    const adjustPlenty = (resource: ResourceType, delta: number) => {
        setError('');
        setPlentyPicks(prev => {
            const next = (prev[resource] || 0) + delta;
            if (next < 0 || tallyTotal(prev) + delta > YEAR_OF_PLENTY_PICKS) return prev;
            return { ...prev, [resource]: next };
        });
    };

    // Nothing is pre-selected, so a stray click on the action button can no
    // longer spend a card on resources the player never chose.
    const canPlay = () => {
        if (cardType === 'year_of_plenty') return plentyTotal === YEAR_OF_PLENTY_PICKS;
        if (cardType === 'monopoly') return monopolyRes !== null;
        return true;
    };

    const handlePlay = async () => {
        let options: DevCardPlayOptions | undefined;
        setError('');

        switch (cardType) {
            case 'year_of_plenty': {
                const [resource1, resource2] = expandTally(plentyPicks);
                options = { resource1, resource2 };
                break;
            }

            case 'monopoly':
                options = { monopolyResource: monopolyRes ?? undefined };
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

    /**
     * The card face and its blurb sit side by side; anything the player has to
     * *pick* is rendered full-width below by `renderCardPicker`, because five
     * tokens need 372px and the column beside the 72px card face is only 308px.
     */
    const renderCardForm = () => {
        switch (cardType) {
            case 'year_of_plenty':
                return (
                    <p className="text-sm text-[var(--ui-text)]">
                        Take any two resource cards from the bank — including two of the same.
                    </p>
                );

            case 'monopoly':
                return (
                    <p className="text-sm text-[var(--ui-text)]">
                        Name a resource, and every other player hands you all of theirs.
                    </p>
                );

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
                            Your current knight count: <span className="font-semibold text-[var(--ui-accent)]">{currentPlayer.knightsPlayed || 0}</span>
                        </p>
                    </div>
                );

            case 'victory_point':
                return (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--ui-text)]">
                            Reveal this victory point card to claim <span className="font-semibold text-[var(--ui-success)]">+1 Victory Point</span>!
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
                            Place <span className="font-semibold text-[var(--ui-success)]">2 roads</span> for free as if you had just built them.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            After playing this card, select road locations on the board.
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">
                            Roads remaining: <span className="font-semibold text-[var(--ui-accent)]">{currentPlayer.roadsRemaining}</span>
                        </p>
                        {currentPlayer.roadsRemaining < 2 && (
                            <div className="rounded-lg border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] px-3 py-2 text-xs text-[var(--ui-text)]">
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

    /** Full-width picker for the two cards that need one. */
    const renderCardPicker = () => {
        if (cardType === 'year_of_plenty') {
            const taken = expandTally(plentyPicks);
            return (
                <div className="mt-5 space-y-3">
                    <p className="text-sm font-medium text-[var(--ui-muted)]">
                        Choose {YEAR_OF_PLENTY_PICKS} cards — click one twice to take two of it:
                    </p>
                    <CardRow label="Resources to take">
                        {RESOURCES.map(resource => {
                            const picked = plentyPicks[resource] || 0;
                            const atLimit = plentyTotal >= YEAR_OF_PLENTY_PICKS;
                            return (
                                <CardToken
                                    key={resource}
                                    type={resource}
                                    badge={picked > 0 ? `+${picked}` : undefined}
                                    badgeTone="good"
                                    selected={picked > 0}
                                    disabled={atLimit && picked === 0}
                                    disabledReason={`You have already chosen ${YEAR_OF_PLENTY_PICKS} cards`}
                                    trend={picked > 0 ? 'up' : null}
                                    onClick={() => adjustPlenty(resource, 1)}
                                    onRemove={picked > 0 ? () => adjustPlenty(resource, -1) : undefined}
                                    removeLabel={`Take one fewer ${CARD_LABELS[resource]}`}
                                    ariaLabel={`Take one more ${CARD_LABELS[resource]}, taking ${picked} of ${YEAR_OF_PLENTY_PICKS}`}
                                />
                            );
                        })}
                    </CardRow>
                    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--ui-muted)]" aria-live="polite">
                        {taken.length === 0
                            ? `Choose ${YEAR_OF_PLENTY_PICKS} cards to continue.`
                            : (
                                <>
                                    <span>You will receive</span>
                                    {taken.map((resource, index) => (
                                        <span key={`${resource}-${index}`} className="inline-flex items-center gap-1">
                                            <CardIcon type={resource} size={16} />
                                            <span className="text-[var(--ui-text)]">{CARD_LABELS[resource]}</span>
                                        </span>
                                    ))}
                                    <span>from the bank.</span>
                                </>
                            )}
                    </p>
                </div>
            );
        }

        if (cardType === 'monopoly') {
            return (
                <div className="mt-5 space-y-3">
                    <p className="text-sm font-medium text-[var(--ui-muted)]">Resource to monopolize:</p>
                    <CardTokenGroup
                        label="Resource to monopolize"
                        items={RESOURCES.map(resource => ({
                            type: resource,
                            ariaLabel: `Monopolize ${CARD_LABELS[resource]}`,
                        }))}
                        selected={monopolyRes}
                        onSelect={type => { setMonopolyRes(type as ResourceType); setError(''); }}
                    />
                    <p className="text-center text-sm text-[var(--ui-muted)]" aria-live="polite">
                        {monopolyRes
                            ? <>All other players must give you all of their{' '}
                                <span className="font-semibold text-[var(--ui-success)]">{CARD_LABELS[monopolyRes]}</span>.</>
                            : 'Choose a resource to continue.'}
                    </p>
                </div>
            );
        }

        return null;
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
                    <TabletopButton variant="primary" onClick={handlePlay} disabled={!canPlay()}>
                        {getActionLabel()}
                    </TabletopButton>
                </>
            )}
        >
                <div className="grid grid-cols-[72px_1fr] items-start gap-5">
                    <DevCardFace type={cardType} width={72} />
                    <div>{renderCardForm()}</div>
                </div>

                {renderCardPicker()}

                {error && (
                    <div
                        role="alert"
                        className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2"
                    >
                        <TabletopStatusIcon type="cancel" size={16} className="mt-0.5 shrink-0" />
                        <span className="text-sm text-[var(--ui-text)]">{error}</span>
                    </div>
                )}
        </TabletopModal>
    );
};
