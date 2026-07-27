import { useState } from 'react';
import type { ProgressCardType } from '@/lib/types/player';
import type {
    ProgressCardModalContentProps,
    ProgressCardPlayOptions,
} from './types';

function errorMessage(error: unknown): string {
    return error instanceof Error && error.message
        ? error.message
        : 'Failed to play card';
}

export function useModalPlay(
    cardType: ProgressCardType,
    onPlay: ProgressCardModalContentProps['onPlay'],
    onClose: () => void
) {
    const [error, setError] = useState('');

    const playAndClose = async (
        options: ProgressCardPlayOptions = {}
    ): Promise<void> => {
        setError('');
        try {
            await onPlay(cardType, options);
            onClose();
        } catch (playError: unknown) {
            setError(errorMessage(playError));
        }
    };

    return { error, setError, playAndClose };
}
