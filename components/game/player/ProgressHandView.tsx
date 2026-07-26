'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { ProgressCardFace, TT } from '@/themes/tabletop';
import { Tooltip } from '@/components/ui/tooltip';

/**
 * Presentational progress-card hand (user-approved UX, graphics plan Phase 3):
 *
 * - 1–3 cards on a wide viewport: inline faces at 58px, hover-lift.
 * - 4+ cards, or any count on a narrow viewport: a compact drawer trigger
 *   (category-edge chips + count pill); clicking opens a shelf above the tray
 *   with every card full-size (82px) — up to 7 fit without overlap.
 * - A card that is mid-followup (`active`) is ringed in brass; when the drawer
 *   is collapsed the active card is surfaced inline beside the trigger so a
 *   pending selection is never hidden.
 *
 * No game logic lives here: the parent decides playability and handles clicks
 * (ProgressCardHand routes per-card behavior exactly as before).
 */

export interface ProgressHandCard {
    type: ProgressCardType;
    /** Card cannot be played right now (wrong turn, timer lock, already played…) */
    disabled?: boolean;
    /** Shown in the tooltip under the rules text when disabled */
    disabledReason?: string;
    /** Mid-followup/selection: highlighted, click cancels (parent handles) */
    active?: boolean;
}

interface ProgressHandViewProps {
    cards: ProgressHandCard[];
    onCardClick: (type: ProgressCardType) => void;
    className?: string;
}

const INLINE_MAX = 3;
const INLINE_WIDTH = 58;
const SHELF_WIDTH = 82;

function cardTooltip(card: ProgressHandCard): React.ReactNode {
    const def = PROGRESS_CARD_DEFINITIONS[card.type];
    return (
        <div className="space-y-1 max-w-[16rem]">
            <div className="font-semibold text-[var(--ui-text)]">{def.name}</div>
            <div className="text-[var(--ui-muted)]">{def.description}</div>
            {card.disabled && card.disabledReason && (
                <div className="text-amber-200">{card.disabledReason}</div>
            )}
            {card.active && <div className="text-amber-200">Selecting… click again to cancel.</div>}
        </div>
    );
}

const FaceButton: React.FC<{
    card: ProgressHandCard;
    width: number;
    onClick: () => void;
}> = ({ card, width, onClick }) => (
    <Tooltip content={cardTooltip(card)} placement="top">
        <button
            onClick={onClick}
            disabled={card.disabled && !card.active}
            className={`relative rounded-md transition-transform ${
                card.disabled && !card.active
                    ? 'opacity-55 cursor-not-allowed'
                    : 'cursor-pointer hover:-translate-y-1.5'
            }`}
            style={card.active ? { outline: `2.5px solid ${TT.highlight.primary}`, outlineOffset: 2, borderRadius: 6 } : undefined}
            aria-label={`${PROGRESS_CARD_DEFINITIONS[card.type].name}${card.active ? ' (selecting)' : ''}`}
        >
            <ProgressCardFace type={card.type} width={width} />
        </button>
    </Tooltip>
);

/** Compact drawer trigger: category-edged chips + count pill */
const DrawerTrigger: React.FC<{
    cards: ProgressHandCard[];
    open: boolean;
    onToggle: () => void;
}> = ({ cards, open, onToggle }) => (
    <button
        onClick={onToggle}
        className="flex items-center gap-2 cursor-pointer rounded-md p-1 hover:brightness-110 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
        aria-expanded={open}
        aria-label={`Progress cards: ${cards.length} in hand`}
    >
        <div className="relative" style={{ width: 34 + Math.min(cards.length - 1, 5) * 6, height: 44 }}>
            {cards.slice(0, 6).map((c, i) => (
                <div
                    key={i}
                    className="absolute rounded"
                    style={{
                        left: i * 6,
                        top: (i % 2) * 2,
                        width: 26,
                        height: 38,
                        background: TT.token.face,
                        border: `1px solid ${TT.token.ring}`,
                        borderTop: `5px solid ${TT.category[PROGRESS_CARD_DEFINITIONS[c.type].category]}`,
                        transform: `rotate(${(i - 2.5) * 2}deg)`,
                    }}
                />
            ))}
        </div>
        <span
            className="font-extrabold text-xs rounded-full px-2.5 py-1"
            style={{ background: TT.highlight.primary, color: '#211a13' }}
        >
            ×{cards.length}
        </span>
    </button>
);

export const ProgressHandView: React.FC<ProgressHandViewProps> = ({ cards, onCardClick, className }) => {
    const [shelfOpen, setShelfOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const useDrawer = cards.length > INLINE_MAX;
    const activeCard = cards.find(c => c.active);

    // Esc / click-away close the shelf
    useEffect(() => {
        if (!shelfOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShelfOpen(false);
        };
        const onPointer = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setShelfOpen(false);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onPointer);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onPointer);
        };
    }, [shelfOpen]);

    if (cards.length === 0) return null;

    const handleClick = (type: ProgressCardType) => {
        onCardClick(type);
        setShelfOpen(false);
    };

    return (
        <div ref={rootRef} className={`relative ${className ?? ''}`}>
            {/* Inline mode: wide viewports with a small hand */}
            {!useDrawer && (
                <div className="hidden xl:flex items-end gap-2.5 px-1 pt-2">
                    {cards.map((c, i) => (
                        <FaceButton key={`${c.type}-${i}`} card={c} width={INLINE_WIDTH} onClick={() => handleClick(c.type)} />
                    ))}
                </div>
            )}

            {/* Drawer mode: big hands always; small hands on narrow viewports */}
            <div className={useDrawer ? 'flex items-center gap-2' : 'flex xl:hidden items-center gap-2'}>
                <DrawerTrigger cards={cards} open={shelfOpen} onToggle={() => setShelfOpen(o => !o)} />
                {/* a pending selection stays visible even with the shelf closed */}
                {activeCard && !shelfOpen && (
                    <FaceButton card={activeCard} width={INLINE_WIDTH} onClick={() => handleClick(activeCard.type)} />
                )}
            </div>

            {/* The shelf */}
            {shelfOpen && (
                <div
                    className="absolute bottom-full left-0 z-40 mb-3 flex items-end gap-3 rounded-xl p-4 shadow-2xl max-xl:fixed max-xl:bottom-auto max-xl:left-1/2 max-xl:top-1/2 max-xl:max-h-[70dvh] max-xl:max-w-[calc(100vw-1rem)] max-xl:-translate-x-1/2 max-xl:-translate-y-1/2 max-xl:flex-wrap max-xl:justify-center max-xl:overflow-y-auto max-xl:overscroll-contain"
                    style={{ background: '#1a1410', border: '1px solid #3d3226' }}
                    role="dialog"
                    aria-label="Progress cards"
                >
                    {cards.map((c, i) => (
                        <FaceButton key={`${c.type}-${i}`} card={c} width={SHELF_WIDTH} onClick={() => handleClick(c.type)} />
                    ))}
                </div>
            )}
        </div>
    );
};
