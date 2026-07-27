import { ProgressCardDialog } from './ProgressCardDialog';
import { calculateProductionGain } from './card-modal-helpers';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

interface ProductionConfirmationModalProps
    extends ProgressCardModalContentProps {
    cardType: 'irrigation' | 'mining';
}

export function ProductionConfirmationModal({
    cardType,
    gameState,
    currentPlayer,
    onClose,
    onPlay,
}: ProductionConfirmationModalProps) {
    const isIrrigation = cardType === 'irrigation';
    const { adjacentHexes, cardsGained } = calculateProductionGain(
        gameState,
        currentPlayer.id,
        isIrrigation ? 'field' : 'mountain'
    );
    const { error, playAndClose } = useModalPlay(cardType, onPlay, onClose);
    const resource = isIrrigation ? 'wheat' : 'ore';
    const terrain = isIrrigation ? 'field' : 'mountain';

    return (
        <ProgressCardDialog
            cardType={cardType}
            onCancel={onClose}
            onPrimary={() => playAndClose({})}
            primaryLabel="Confirm"
            error={error}
        >
            <div className="space-y-3">
                <p className="text-sm text-[var(--ui-text)]">
                    You will receive{' '}
                    <span className="font-semibold text-emerald-300">
                        {cardsGained}
                    </span>{' '}
                    {resource} for the{' '}
                    <span className="font-semibold text-amber-200">
                        {adjacentHexes}
                    </span>{' '}
                    {terrain}
                    {adjacentHexes === 1 ? '' : 's'} adjacent to your buildings.
                </p>
                {adjacentHexes === 0 ? (
                    <div className="rounded border border-amber-600 bg-amber-900/40 px-3 py-2 text-xs text-amber-200">
                        You have no adjacent {terrain}s, so playing{' '}
                        {isIrrigation ? 'Irrigation' : 'Mining'} will not add any{' '}
                        {resource}.
                    </div>
                ) : null}
            </div>
        </ProgressCardDialog>
    );
}
