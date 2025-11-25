import React from 'react';
import { ConnectionStatus as Status } from '@/lib/hooks/useConnectionStatus';

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
                    bg: 'bg-red-900/90',
                    border: 'border-red-500',
                    icon: '🔴',
                    title: 'Offline',
                    message: 'No internet connection. Waiting to reconnect...'
                };
            case 'reconnecting':
                return {
                    bg: 'bg-yellow-900/90',
                    border: 'border-yellow-500',
                    icon: '🔄',
                    title: 'Reconnecting',
                    message: `Attempting to reconnect... (${consecutiveFailures} failed attempts)`
                };
            case 'error':
                return {
                    bg: 'bg-orange-900/90',
                    border: 'border-orange-500',
                    icon: '⚠️',
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
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${config.bg} ${config.border} border-2 rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm max-w-md`}
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1">
                    <div className="font-bold text-white">{config.title}</div>
                    <div className="text-sm text-white/90">{config.message}</div>
                </div>
            </div>

            {status === 'reconnecting' && (
                <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
                    <div
                        className="bg-yellow-400 h-1.5 rounded-full animate-pulse"
                        style={{ width: '60%' }}
                    />
                </div>
            )}
        </div>
    );
};
