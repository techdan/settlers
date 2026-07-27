import { useState } from 'react';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import { ProgressCardDialog } from './ProgressCardDialog';
import { COMMODITIES, RESOURCES } from './card-modal-helpers';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

type ChoiceCardType =
    | 'resource_monopoly'
    | 'trade_monopoly'
    | 'merchant_fleet';

interface ChoiceCardModalProps extends ProgressCardModalContentProps {
    cardType: ChoiceCardType;
}

export function ChoiceCardModal({
    cardType,
    onClose,
    onPlay,
}: ChoiceCardModalProps) {
    const [choice, setChoice] = useState<ResourceType | CommodityType | ''>('');
    const { error, setError, playAndClose } = useModalPlay(
        cardType,
        onPlay,
        onClose
    );
    const isMerchantFleet = cardType === 'merchant_fleet';

    const confirm = () => {
        if (!choice) {
            setError(
                cardType === 'resource_monopoly'
                    ? 'Please select a resource'
                    : cardType === 'trade_monopoly'
                      ? 'Please select a commodity'
                      : 'Please select a resource or commodity'
            );
            return;
        }

        const optionKey =
            cardType === 'resource_monopoly'
                ? 'resource'
                : cardType === 'trade_monopoly'
                  ? 'commodity'
                  : 'tradeItem';
        return playAndClose({ [optionKey]: choice });
    };

    const options: Array<ResourceType | CommodityType> =
        cardType === 'resource_monopoly'
            ? RESOURCES
            : cardType === 'trade_monopoly'
              ? COMMODITIES
              : [...RESOURCES, ...COMMODITIES];
    const label =
        cardType === 'resource_monopoly'
            ? 'Select resource:'
            : cardType === 'trade_monopoly'
              ? 'Select commodity:'
              : 'Select the type to trade at 2:1 this turn:';
    const placeholder =
        cardType === 'resource_monopoly'
            ? 'Select resource'
            : cardType === 'trade_monopoly'
              ? 'Select commodity'
              : 'Select resource or commodity';

    return (
        <ProgressCardDialog
            cardType={cardType}
            onCancel={onClose}
            onPrimary={confirm}
            primaryLabel={isMerchantFleet ? 'Select' : 'Play Card'}
            primaryDisabled={isMerchantFleet && !choice}
            primaryTooltip={
                isMerchantFleet && !choice
                    ? 'Select a resource or commodity'
                    : undefined
            }
            error={error}
        >
            <div className={isMerchantFleet ? 'space-y-3' : undefined}>
                <div>
                    <label className="mb-1 block text-sm font-medium">{label}</label>
                    <select
                        value={choice}
                        onChange={event =>
                            setChoice(
                                event.target.value as ResourceType | CommodityType
                            )
                        }
                        className="w-full cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
                    >
                        <option value="">{placeholder}</option>
                        {options.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
                {isMerchantFleet ? (
                    <p className="text-xs text-[var(--ui-muted)]">
                        The chosen type will trade with the bank at 2:1 for the rest
                        of your turn, including bank trades and port trades.
                    </p>
                ) : null}
            </div>
        </ProgressCardDialog>
    );
}
