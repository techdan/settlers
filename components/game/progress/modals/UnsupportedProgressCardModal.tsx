import { useState } from 'react';
import type { ProgressCardType } from '@/lib/types/player';
import { ProgressCardDialog } from './ProgressCardDialog';
import type { ProgressCardModalContentProps } from './types';

interface UnsupportedProgressCardModalProps
    extends ProgressCardModalContentProps {
    cardType: ProgressCardType;
}

export function UnsupportedProgressCardModal({
    cardType,
    onClose,
}: UnsupportedProgressCardModalProps) {
    const [error, setError] = useState('');

    return (
        <ProgressCardDialog
            cardType={cardType}
            onCancel={onClose}
            onPrimary={() =>
                setError(
                    'This card is played on the board, not from this dialog.'
                )
            }
            primaryLabel="Play Card"
            error={error}
        >
            <p className="text-sm text-[var(--ui-muted)]">
                This card does not require any parameters. Click &quot;Play
                Card&quot; to use it.
            </p>
        </ProgressCardDialog>
    );
}
