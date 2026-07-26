'use client';

import React, { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { GameState, DevCardType } from '@/lib/types';
import { playDevCard } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { DevCardModal } from '@/components/game/modals/DevCardModal';
import { CardStack, DevCardFace } from '@/themes/tabletop';

interface PlayerDevCardsProps {
    gameState: GameState;
    playerId: string;
}

const DEV_CARD_TOOLTIP_TEXT: Record<DevCardType, { title: string; description: string }> = {
    road_building: {
        title: 'Road Building',
        description:
            'Place 2 roads for free as if you had just built them. You may play this card at any time during your turn.',
    },
    year_of_plenty: {
        title: 'Year of Plenty',
        description:
            'Take any 2 resource cards from the bank (of your choice). You may play this card at any time during your turn.',
    },
    monopoly: {
        title: 'Monopoly',
        description:
            'Name a resource type. All other players give you all their cards of that type. You may play this card at any time during your turn.',
    },
    knight: {
        title: 'Knight (Soldier)',
        description:
            'Move the robber. Steal 1 random resource from a player with a settlement or city adjacent to the hex you move it to. You must move the robber.',
    },
    victory_point: {
        title: 'Victory Point',
        description:
            'Counts as 1 victory point toward the 10 needed to win. Reveal to claim your victory!',
    },
};

const devCardTooltipContent = (type: DevCardType, canPlay: boolean, timerLocked: boolean, notPlayerTurn: boolean) => {
    const parts: string[] = [DEV_CARD_TOOLTIP_TEXT[type].description];

    if (timerLocked) {
        parts.push('\nTime expired - cannot play cards');
    } else if (notPlayerTurn) {
        parts.push('\nCan only play on your turn');
    } else if (!canPlay) {
        parts.push('\nYou can only play one development card per turn');
    }

    return (
        <div className="space-y-1 whitespace-pre-line">
            <div className="font-semibold text-[var(--ui-text)]">{DEV_CARD_TOOLTIP_TEXT[type].title}</div>
            <div className="text-[var(--ui-muted)]">{parts.join('')}</div>
        </div>
    );
};

export const PlayerDevCards: React.FC<PlayerDevCardsProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [isPending, startTransition] = useTransition();
    const [modalCard, setModalCard] = useState<DevCardType | null>(null);

    const timerStatus = useTimerState(gameState);

    if (!player) return null;

    const handlePlayCard = async (cardType: DevCardType, options: any) => {
        await playDevCard(gameState.roomId, playerId, cardType, options);
    };

    const handleCardClick = (type: DevCardType) => {
        // Open modal for all cards
        setModalCard(type);
    };

    // Cards render as stacks grouped by type (one stack per type, count badge)
    const heldTypes = (Object.keys(player.devCards) as DevCardType[]).filter(
        type => player.devCards[type] > 0
    );
    const newCounts = (player.devCardsBoughtThisTurn ?? []).reduce<Partial<Record<DevCardType, number>>>(
        (acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }),
        {}
    );

    const notPlayerTurn = gameState.currentTurn !== playerId;
    const wrongPhase = gameState.phase !== 'main_phase' && gameState.phase !== 'waiting_for_roll';

    return (
        <>
            {/* De-paneled for the unified GameTray: the tray provides the warm
                chrome, so the w-64 slate panel + player wash are gone. A compact
                label + the card-stack row remain; the New section keeps its divider. */}
            <div className="relative pointer-events-auto flex flex-col">
                <h3 className="text-[10px] font-bold text-[var(--ui-muted)] uppercase tracking-wider mb-1.5">Dev Cards</h3>

                <div>
                    {heldTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-3 pt-1">
                            {heldTypes.map(type => {
                                const canPlay = type === 'victory_point' || !player.hasPlayedDevCard;
                                const isDisabled = isPending || timerStatus.isLocked || notPlayerTurn || wrongPhase || !canPlay;

                                return (
                                    <Tooltip
                                        key={type}
                                        placement="left"
                                        content={devCardTooltipContent(type, canPlay, timerStatus.isLocked, notPlayerTurn)}
                                    >
                                        <button
                                            onClick={() => handleCardClick(type)}
                                            disabled={isDisabled}
                                            className={`p-1 transition-transform ${
                                                isDisabled
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'cursor-pointer hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <CardStack count={player.devCards[type]} width={52}>
                                                <DevCardFace type={type} width={52} />
                                            </CardStack>
                                        </button>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-[var(--ui-muted)] text-xs italic py-2">No cards</div>
                    )}

                    {player.devCardsBoughtThisTurn && player.devCardsBoughtThisTurn.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--ui-border)]">
                            <h4 className="text-[10px] font-bold text-[var(--ui-muted)] uppercase mb-1.5">New (Wait 1 Turn)</h4>
                            <div className="flex flex-wrap gap-3">
                                {(Object.keys(newCounts) as DevCardType[]).map(type => (
                                    <Tooltip
                                        key={`new-${type}`}
                                        placement="left"
                                        content={
                                            <div className="space-y-1">
                                                <div className="font-semibold text-[var(--ui-text)]">{DEV_CARD_TOOLTIP_TEXT[type].title}</div>
                                                <div className="text-[var(--ui-muted)]">{DEV_CARD_TOOLTIP_TEXT[type].description}</div>
                                                <div className="text-amber-200 mt-1">Cannot be played until next turn.</div>
                                            </div>
                                        }
                                    >
                                        <div className="p-1 opacity-60">
                                            <CardStack count={newCounts[type] ?? 0} width={52}>
                                                <DevCardFace type={type} width={52} />
                                            </CardStack>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {modalCard && typeof window !== 'undefined' && createPortal(
                <DevCardModal
                    cardType={modalCard}
                    isOpen={!!modalCard}
                    onClose={() => setModalCard(null)}
                    onPlay={async (cardType, options) => {
                        await handlePlayCard(cardType, options);
                        setModalCard(null);
                    }}
                    gameState={gameState}
                    currentPlayer={player}
                />,
                document.body
            )}
        </>
    );
};
