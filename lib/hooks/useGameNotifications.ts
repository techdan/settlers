import { useCallback, useRef, useState } from 'react';
import type { GameState, TheftEvent } from '@/lib/types';
import {
    useInventorSwapNotificationEffect,
    useTheftNotificationEffect,
    useTradeCompletionEffect,
    useVPCardModalEffect,
} from './useGameControllerEffects';

type VPCardModalType = 'printer' | 'constitution';

export function getTheftEventKey(theft: TheftEvent): string {
    return theft.id ?? [
        theft.timestamp,
        theft.thiefId,
        theft.victimId ?? '',
        theft.source ?? '',
        theft.victims?.map(victim => victim.victimId).join(',') ?? '',
    ].join(':');
}

export function useGameNotifications(
    gameState: GameState | null,
    playerId: string
) {
    const [vpCardModalType, setVpCardModalType] =
        useState<VPCardModalType | null>(null);
    const lastVPCardSeenRef = useRef(0);
    const [theftNotifications, setTheftNotifications] =
        useState<TheftEvent[]>([]);
    const seenTheftIdsRef = useRef(new Set<string>());
    const [showTradeCompletion, setShowTradeCompletion] = useState(false);
    const lastTradeSeenRef = useRef(0);
    const [inventorSwapNotification, setInventorSwapNotification] =
        useState<NonNullable<GameState['lastInventorSwap']> | null>(null);
    const lastInventorSwapSeenRef = useRef<string | null>(null);

    useVPCardModalEffect(
        gameState,
        playerId,
        lastVPCardSeenRef,
        setVpCardModalType
    );
    useTheftNotificationEffect(
        gameState,
        playerId,
        seenTheftIdsRef,
        setTheftNotifications
    );
    useTradeCompletionEffect(
        gameState,
        playerId,
        lastTradeSeenRef,
        setShowTradeCompletion
    );
    useInventorSwapNotificationEffect(
        gameState,
        lastInventorSwapSeenRef,
        setInventorSwapNotification
    );

    const acknowledgeVPCard = useCallback(() => {
        setVpCardModalType(null);
    }, []);

    const dismissTheftNotification = useCallback(() => {
        setTheftNotifications(current => {
            const dismissed = current[0];
            if (dismissed) {
                seenTheftIdsRef.current.add(getTheftEventKey(dismissed));
            }
            return current.slice(1);
        });
    }, []);

    const dismissTradeCompletion = useCallback(() => {
        setShowTradeCompletion(false);
    }, []);

    const dismissInventorSwapNotification = useCallback(() => {
        setInventorSwapNotification(null);
    }, []);

    return {
        vpCardModalType,
        acknowledgeVPCard,
        theftNotification: theftNotifications[0] ?? null,
        dismissTheftNotification,
        showTradeCompletion,
        dismissTradeCompletion,
        inventorSwapNotification,
        dismissInventorSwapNotification,
    };
}
