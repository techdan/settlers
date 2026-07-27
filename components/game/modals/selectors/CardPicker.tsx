import React from 'react';
import { InteractionOption } from '@/core/engine/progress/types/CardInteraction';
import { ALL_TRADE_ITEMS, type TradeItem } from '@/lib/trade/bank-ratios';
import {
    CARD_LABELS,
    CardRow,
    CardToken,
    CardTokenGroup,
    type CardTokenGroupItem,
} from '@/components/game/ui/CardToken';

/**
 * Picks resource or commodity cards for a progress-card interaction.
 *
 * This replaces `ResourceSelector` and `CommoditySelector`, which were the same
 * file: normalize "commodity"→"resource" in one and they differed only by an
 * import path, the item list, and a doc comment. The card type is already
 * decided by the options the card definition supplies, and `CardToken` picks the
 * right glyph on its own — so nothing was gained by splitting them.
 *
 * Drives Resource Monopoly (`select_resource`) and Trade Monopoly
 * (`select_commodity`).
 */

interface CardPickerProps {
    options: InteractionOption[];
    selections: string[];
    onSelectionsChange: (selections: string[]) => void;
    /** Label for the group; screen readers announce it before the cards. */
    label?: string;
    minSelections?: number;
    maxSelections?: number;
}

const isCardOption = (id: string): id is TradeItem =>
    (ALL_TRADE_ITEMS as readonly string[]).includes(id);

export const CardPicker: React.FC<CardPickerProps> = ({
    options,
    selections,
    onSelectionsChange,
    label = 'Choose a card',
    maxSelections = 1,
}) => {
    // Options come from card definitions; anything that is not a resource or
    // commodity has no card face to draw and does not belong in this picker.
    const cards = options.filter(option => isCardOption(option.id));

    const toItem = (option: InteractionOption): CardTokenGroupItem => {
        const type = option.id as TradeItem;
        return {
            type,
            hint: option.description,
            disabled: option.disabled || false,
            disabledReason: option.disabledReason,
            ariaLabel: option.label || CARD_LABELS[type],
        };
    };

    if (cards.length === 0) {
        return <p className="py-3 text-center text-sm text-[var(--ui-muted)]">No cards available.</p>;
    }

    // Exactly one → a real radiogroup with arrow-key navigation.
    if (maxSelections === 1) {
        const selected = cards.find(option => selections.includes(option.id));
        return (
            <CardTokenGroup
                label={label}
                items={cards.map(toItem)}
                selected={selected ? (selected.id as TradeItem) : null}
                onSelect={type => onSelectionsChange([type])}
            />
        );
    }

    // Several → independent toggles, which need no roving tabindex.
    const toggle = (id: string) => {
        if (selections.includes(id)) {
            onSelectionsChange(selections.filter(entry => entry !== id));
        } else if (selections.length < maxSelections) {
            onSelectionsChange([...selections, id]);
        }
    };

    return (
        <div className="space-y-3">
            <CardRow label={label}>
                {cards.map(option => {
                    const item = toItem(option);
                    const chosen = selections.includes(option.id);
                    const atLimit = !chosen && selections.length >= maxSelections;
                    return (
                        <CardToken
                            key={option.id}
                            {...item}
                            selected={chosen}
                            disabled={item.disabled || atLimit}
                            disabledReason={item.disabled
                                ? item.disabledReason
                                : `You have already chosen ${maxSelections}`}
                            onClick={() => toggle(option.id)}
                        />
                    );
                })}
            </CardRow>
            <div className="text-center text-xs text-[var(--ui-muted)]" aria-live="polite">
                Selected: {selections.length} / {maxSelections}
            </div>
        </div>
    );
};
