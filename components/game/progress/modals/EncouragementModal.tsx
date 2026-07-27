import { ProgressCardDialog } from './ProgressCardDialog';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

export function EncouragementModal({
    onClose,
    onPlay,
}: ProgressCardModalContentProps) {
    const { error, playAndClose } = useModalPlay(
        'encouragement',
        onPlay,
        onClose
    );

    return (
        <ProgressCardDialog
            cardType="encouragement"
            onCancel={onClose}
            onPrimary={() => playAndClose({})}
            primaryLabel="Activate"
            error={error}
        >
            <div className="space-y-3">
                <p className="text-sm text-[var(--ui-text)]">
                    Activate all of your knights for free. This immediately boosts
                    your defense strength against the barbarians and lets those
                    knights move or displace as usual.
                </p>
                <p className="text-xs text-[var(--ui-muted)]">
                    Knights that are already active stay active. No wheat is spent.
                </p>
            </div>
        </ProgressCardDialog>
    );
}
