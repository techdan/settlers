import React from 'react';
import { ConnectionStatus as Status } from '@/lib/hooks/useConnectionStatus';
import { TabletopStatusIcon, TabletopStatusType } from '@/themes/tabletop/glyphs';

interface ConnectionStatusProps {
    status: Status;
    consecutiveFailures: number;
    lastError: Error | null;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({
    status,
    consecutiveFailures,
    lastError
}) => {
    // Don't show anything if online
    if (status === 'online' && consecutiveFailures === 0) {
        return null;
    }

    // Status-specific colors and messages
    const getStatusConfig = () => {
        switch (status) {
            case 'offline':
                return {
                    tone: 'border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_16%,var(--ui-panel-solid))]',
                    icon: 'cancel' as TabletopStatusType,
                    title: 'Offline',
                    message: 'No internet connection. Waiting to reconnect...'
                };
            case 'reconnecting':
                return {
                    tone: 'border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_16%,var(--ui-panel-solid))]',
                    icon: 'time' as TabletopStatusType,
                    title: 'Reconnecting',
                    message: `Attempting to reconnect... (${consecutiveFailures} failed attempts)`
                };
            case 'error':
                return {
                    tone: 'border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_16%,var(--ui-panel-solid))]',
                    icon: 'warning' as TabletopStatusType,
                    title: 'Connection Issue',
                    message: lastError?.message || 'Failed to fetch game state. Retrying...'
                };
            default:
                return null;
        }
    };

    const config = getStatusConfig();
    if (!config) return null;

    return (
        <div
            className={`fixed left-1/2 top-4 z-50 max-w-md -translate-x-1/2 rounded-lg border-2 px-4 py-3 shadow-lg backdrop-blur-sm ${config.tone}`}
        >
            <div className="flex items-center gap-3">
                <TabletopStatusIcon type={config.icon} size={26} />
                <div className="flex-1">
                    <div className="font-bold text-[var(--ui-text)]">{config.title}</div>
                    <div className="text-sm text-[var(--ui-muted)]">{config.message}</div>
                </div>
            </div>

            {status === 'reconnecting' && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--ui-panel-raised)]">
                    <div
                        className="h-1.5 animate-pulse rounded-full bg-[var(--ui-accent)]"
                        style={{ width: '60%' }}
                    />
                </div>
            )}
        </div>
    );
};
