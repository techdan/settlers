import type { ReactNode } from 'react';
import { getProgressCardInteraction } from '@/core/engine/progress/config/card-definitions';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { Tooltip } from '@/components/ui/tooltip';
import type { ProgressCardType } from '@/lib/types/player';

interface ProgressCardDialogProps {
    cardType: ProgressCardType;
    children: ReactNode;
    onCancel: () => void;
    onPrimary: () => void | Promise<void>;
    primaryLabel: string;
    primaryDisabled?: boolean;
    primaryTooltip?: string;
    closeEnabled?: boolean;
    showCancel?: boolean;
    error?: string;
}

export function ProgressCardDialog({
    cardType,
    children,
    onCancel,
    onPrimary,
    primaryLabel,
    primaryDisabled = false,
    primaryTooltip,
    closeEnabled = true,
    showCancel = true,
    error,
}: ProgressCardDialogProps) {
    const metadata = PROGRESS_CARD_DEFINITIONS[cardType];
    const interaction = getProgressCardInteraction(cardType);
    const surface =
        interaction.mode === 'modal' ? interaction.surface : 'blocking';
    const primaryButton = (
        <TabletopButton
            variant="primary"
            onClick={onPrimary}
            disabled={primaryDisabled}
        >
            {primaryLabel}
        </TabletopButton>
    );

    const footer = (
        <>
            {showCancel ? (
                <TabletopButton onClick={onCancel} disabled={!closeEnabled}>
                    Cancel
                </TabletopButton>
            ) : null}
            {primaryTooltip ? (
                <Tooltip
                    content={primaryTooltip}
                    placement="top"
                    tooltipClassName="whitespace-pre-line"
                >
                    {primaryButton}
                </Tooltip>
            ) : (
                primaryButton
            )}
        </>
    );

    return (
        <TabletopModal
            title={metadata.name}
            description={metadata.description}
            surface={surface}
            width={surface === 'board-visible' ? 'sm' : 'md'}
            onClose={closeEnabled ? onCancel : undefined}
            footer={footer}
        >
            {children}
            {error ? (
                <div className="mt-4 rounded border border-red-500 bg-red-900/30 p-3 text-sm text-red-200">
                    {error}
                </div>
            ) : null}
        </TabletopModal>
    );
}
