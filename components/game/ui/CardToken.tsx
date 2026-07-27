import React from 'react';
import { TabletopCommodityIcon, TabletopResourceIcon } from '@/themes/tabletop/glyphs';
import { isCommodity, type TradeItem } from '@/lib/trade/bank-ratios';
import type { CommodityType } from '@/core/rules/commodity-constants';
import type { ResourceType } from '@/core/rules/board-constants';

/**
 * A resource/commodity card, face-up and clickable.
 *
 * Shared by every surface that asks "which cards?" — the trade counter, the robber
 * discard, and (next) the progress-card selectors. Everything that decides the
 * choice lives on the token itself: what it is, how many you hold, and whatever
 * rate or tally the surface needs to print on its shoulder.
 */

export type CardTokenItem = TradeItem;

/**
 * Row geometry, in pixels, kept here rather than as Tailwind classes on each
 * consumer — because the numbers have to satisfy a constraint no single file can
 * check. A hand can hold all eight card types, and `TabletopModal` at width="lg"
 * gives a 624px content box (672px panel − 2×24px body padding). Eight tokens
 * must fit that on one row:
 *
 *     8 × 68 + 7 × 8 = 600px  ≤ 624px  ✓
 *
 * At a 12px gap it comes to 628px and strands a lonely eighth token on its own
 * row. `CardToken.fit.test.tsx` pins this; change a number and it fails.
 */
export const CARD_TOKEN_WIDTH = 68;
export const CARD_TOKEN_HEIGHT = 76;
export const CARD_TOKEN_GAP = 8;
/** The most card types a hand can hold: five resources + three commodities. */
export const MAX_CARD_TYPES = 8;
/** Content width of a width="lg" TabletopModal body (672 − 2×24 padding). */
export const MODAL_LG_CONTENT_WIDTH = 624;
/** Content width of a width="md" body — where the progress-card pickers live. */
export const MODAL_MD_CONTENT_WIDTH = 400;

export type CardCounts = Partial<Record<CardTokenItem, number>>;

/** Fold the engine's split resource/commodity records into one tally. */
export const cardCountsFrom = (
    resources?: Partial<Record<ResourceType, number>>,
    commodities?: Partial<Record<CommodityType, number>>
): CardCounts => {
    const counts: CardCounts = {};
    for (const [item, amount] of Object.entries({ ...resources, ...commodities })) {
        if (amount && amount > 0) counts[item as CardTokenItem] = amount;
    }
    return counts;
};

export const cardCountsTotal = (counts: CardCounts) =>
    Object.values(counts).reduce<number>((sum, n) => sum + (n || 0), 0);

/**
 * `2 Wood + 1 Ore` — one way of writing a set of cards.
 *
 * Read-only counterpart to `CardToken`. Composer, recipient, and receipt all
 * render the same deal through this, so a trade cannot look like two different
 * offers depending on which side of it you are standing.
 */
export const CardTally: React.FC<{
    counts: CardCounts;
    emptyLabel?: string;
    iconSize?: number;
    className?: string;
}> = ({ counts, emptyLabel = 'nothing', iconSize = 18, className = '' }) => {
    const entries = (Object.entries(counts) as [CardTokenItem, number][])
        .filter(([, amount]) => amount > 0);

    if (entries.length === 0) {
        return <span className={`text-[var(--ui-muted)] ${className}`}>{emptyLabel}</span>;
    }

    return (
        <span className={`inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${className}`}>
            {entries.map(([item, amount], index) => (
                <span key={item} className="inline-flex items-center gap-1">
                    {index > 0 && <span className="text-[var(--ui-muted)]" aria-hidden="true">+</span>}
                    <span className="font-bold tabular-nums text-[var(--ui-text)]">{amount}</span>
                    <CardIcon type={item} size={iconSize} />
                    <span className="text-[var(--ui-text)]">{CARD_LABELS[item]}</span>
                </span>
            ))}
        </span>
    );
};

/** A wrapping, centered row of tokens with the gap the geometry above assumes. */
export const CardRow: React.FC<{
    label?: string;
    className?: string;
    children: React.ReactNode;
}> = ({ label, className = '', children }) => (
    <div
        role={label ? 'group' : undefined}
        aria-label={label}
        className={`flex flex-wrap justify-center ${className}`}
        style={{ gap: CARD_TOKEN_GAP }}
    >
        {children}
    </div>
);

export const CARD_LABELS: Record<CardTokenItem, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore',
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin',
};

export const CardIcon: React.FC<{ type: CardTokenItem; size?: number; label?: string }> = ({ type, size = 24, label }) =>
    isCommodity(type)
        ? <TabletopCommodityIcon type={type as CommodityType} size={size} label={label} />
        : <TabletopResourceIcon type={type as ResourceType} size={size} label={label} />;

/**
 * What the shoulder badge means, since the same chip carries good news (a port
 * discount) and bad (cards you are about to throw away).
 */
export type BadgeTone = 'muted' | 'accent' | 'good' | 'bad';

const BADGE_TONES: Record<BadgeTone, string> = {
    muted: 'border-[var(--ui-border)] bg-[var(--ui-panel-solid)] text-[var(--ui-muted)]',
    accent: 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]',
    good: 'border-[var(--ui-success)] bg-[var(--ui-success)] text-[var(--ui-bg)]',
    bad: 'border-[var(--ui-danger)] bg-[var(--ui-danger)] text-white',
};

interface CardTokenProps {
    type: CardTokenItem;
    /** How many of this card the player holds. Omit to hide the count. */
    count?: number;
    /** Shoulder chip — a bank rate ("3:1") or a staged amount ("+2"). */
    badge?: string;
    badgeTone?: BadgeTone;
    /** One line under the name: why it is unusable, or what it costs. */
    hint?: string;
    selected?: boolean;
    disabled?: boolean;
    /** Shown on hover for a disabled token — the reason it cannot be picked. */
    disabledReason?: string;
    /** Tints the count: down for cards leaving your hand, up for cards arriving. */
    trend?: 'up' | 'down' | null;
    onClick: () => void;
    /** Corner action for tallies — take one back off the pile. */
    onRemove?: () => void;
    removeLabel?: string;
    ariaLabel: string;
    /**
     * Renders as a radio rather than a toggle button. Only valid inside a
     * `CardTokenGroup`, which supplies the radiogroup and the arrow-key
     * navigation that role obliges us to provide.
     */
    radio?: boolean;
    tabIndex?: number;
}

export const CardToken = React.forwardRef<HTMLButtonElement, CardTokenProps>(({
    type,
    count,
    badge,
    badgeTone = 'muted',
    hint,
    selected = false,
    disabled = false,
    disabledReason,
    trend = null,
    onClick,
    onRemove,
    removeLabel,
    ariaLabel,
    radio = false,
    tabIndex,
}, ref) => {
    const stateClass = disabled
        ? 'cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-panel-solid)] opacity-45'
        : selected
            ? 'cursor-pointer border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_18%,var(--ui-panel-raised))] shadow-[0_0_0_1px_var(--ui-accent)]'
            : 'cursor-pointer border-[var(--ui-border)] bg-[var(--ui-panel-raised)] hover:border-[var(--ui-accent)] hover:brightness-110';

    const countClass = trend === 'down'
        ? 'text-[var(--ui-danger)]'
        : trend === 'up'
            ? 'text-[var(--ui-success)]'
            : 'text-[var(--ui-text)]';

    return (
        <div className="relative">
            <button
                ref={ref}
                type="button"
                onClick={onClick}
                disabled={disabled}
                role={radio ? 'radio' : undefined}
                aria-checked={radio ? selected : undefined}
                aria-pressed={radio ? undefined : selected}
                tabIndex={tabIndex}
                aria-label={ariaLabel}
                title={disabled ? disabledReason : undefined}
                style={{ width: CARD_TOKEN_WIDTH, height: CARD_TOKEN_HEIGHT }}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${stateClass}`}
            >
                <CardIcon type={type} size={26} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                    {CARD_LABELS[type]}
                </span>
                {count !== undefined && (
                    <span className={`text-sm font-bold leading-none tabular-nums ${countClass}`}>{count}</span>
                )}
                {hint && (
                    <span className="text-[9px] leading-none text-[var(--ui-muted)]">{hint}</span>
                )}
            </button>

            {badge && (
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -right-1 -top-1 rounded-full border px-1.5 py-px text-[10px] font-bold tabular-nums ${BADGE_TONES[badgeTone]}`}
                >
                    {badge}
                </span>
            )}

            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={removeLabel}
                    className="absolute -left-1 -top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] text-sm font-bold leading-none text-[var(--ui-text)] transition hover:border-[var(--ui-danger)] hover:text-[var(--ui-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                >
                    −
                </button>
            )}
        </div>
    );
});

CardToken.displayName = 'CardToken';

export interface CardTokenGroupItem {
    type: CardTokenItem;
    count?: number;
    badge?: string;
    badgeTone?: BadgeTone;
    hint?: string;
    disabled?: boolean;
    disabledReason?: string;
    ariaLabel: string;
}

/** Move to the next enabled item, wrapping, or return -1 if there is none. */
function nextEnabled(items: CardTokenGroupItem[], from: number, step: number): number {
    for (let i = 1; i <= items.length; i++) {
        const index = (from + step * i + items.length * i) % items.length;
        if (!items[index].disabled) return index;
    }
    return -1;
}

function firstEnabled(items: CardTokenGroupItem[], fromEnd = false): number {
    const order = fromEnd ? [...items.keys()].reverse() : [...items.keys()];
    return order.find(index => !items[index].disabled) ?? -1;
}

/**
 * "Choose exactly one card" as a real radiogroup.
 *
 * A `role="radio"` without arrow-key navigation is worse than a plain toggle
 * button, because screen-reader users are told to expect arrows that do nothing.
 * So the role and the keyboard handling ship together, here, once — rather than
 * being re-derived (or forgotten) by each dialog that needs to pick a card.
 *
 * Roving tabindex: the group is a single tab stop; arrows move both focus and
 * selection, skipping disabled cards, and Home/End jump to the ends.
 */
export const CardTokenGroup: React.FC<{
    label: string;
    items: CardTokenGroupItem[];
    selected: CardTokenItem | null;
    onSelect: (type: CardTokenItem) => void;
    className?: string;
}> = ({ label, items, selected, onSelect, className = '' }) => {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const selectedIndex = items.findIndex(item => item.type === selected && !item.disabled);
    // The group must always offer exactly one tab stop, even with nothing chosen.
    const focusableIndex = selectedIndex >= 0 ? selectedIndex : firstEnabled(items);

    const moveTo = (index: number) => {
        if (index < 0) return;
        onSelect(items[index].type);
        refs.current[index]?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const from = selectedIndex >= 0 ? selectedIndex : focusableIndex;
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                moveTo(nextEnabled(items, from, 1));
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                moveTo(nextEnabled(items, from, -1));
                break;
            case 'Home':
                event.preventDefault();
                moveTo(firstEnabled(items));
                break;
            case 'End':
                event.preventDefault();
                moveTo(firstEnabled(items, true));
                break;
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label={label}
            onKeyDown={handleKeyDown}
            className={`flex flex-wrap justify-center ${className}`}
            style={{ gap: CARD_TOKEN_GAP }}
        >
            {items.map((item, index) => (
                <CardToken
                    key={item.type}
                    {...item}
                    ref={element => { refs.current[index] = element; }}
                    radio
                    tabIndex={index === focusableIndex ? 0 : -1}
                    selected={item.type === selected}
                    onClick={() => onSelect(item.type)}
                />
            ))}
        </div>
    );
};
