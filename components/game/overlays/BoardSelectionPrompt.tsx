'use client';

import React, { memo } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { TabletopButton } from '@/components/game/ui/TabletopModal';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

interface BoardSelectionPromptProps {
    title: string;
    description: string;
    status?: string;
    onCancel?: () => void;
    onFinish?: () => void;
    finishLabel?: string;
    finishDisabled?: boolean;
    children?: React.ReactNode;
}

const BoardSelectionPromptComponent: React.FC<BoardSelectionPromptProps> = ({
    title,
    description,
    status,
    onCancel,
    onFinish,
    finishLabel = 'Finish',
    finishDisabled = false,
    children
}) => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3 text-[var(--ui-text)] shadow-lg backdrop-blur-sm">
                <TabletopStatusIcon type="info" size={24} />
                <div className="text-sm space-y-1">
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-[var(--ui-muted)]">{description}</div>
                    {status && <div className="text-xs text-[var(--ui-muted)]">{status}</div>}
                    {children}
                </div>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Tooltip content="Cancel" placement="top">
                            <TabletopButton
                                type="button"
                                variant="danger"
                                className="px-3"
                                onClick={onCancel}
                            >
                                Cancel
                            </TabletopButton>
                        </Tooltip>
                    )}
                    {onFinish && (
                        <Tooltip content={finishLabel} placement="top">
                            <TabletopButton
                                type="button"
                                variant="primary"
                                className="px-3 shadow"
                                onClick={onFinish}
                                disabled={finishDisabled}
                            >
                                {finishLabel}
                            </TabletopButton>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BoardSelectionPrompt: React.FC<BoardSelectionPromptProps> = memo(BoardSelectionPromptComponent);
