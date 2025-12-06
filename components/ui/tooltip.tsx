'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    placement?: TooltipPlacement;
    className?: string;
    tooltipClassName?: string;
    longPressDelayMs?: number;
}

const DEFAULT_LONG_PRESS_DELAY = 550;
const POINTER_MOVE_THRESHOLD = 12; // px manhattan distance before cancelling long-press

export function Tooltip({
    content,
    children,
    placement = 'top',
    className,
    tooltipClassName,
    longPressDelayMs = DEFAULT_LONG_PRESS_DELAY,
}: TooltipProps) {
    const triggerRef = React.useRef<HTMLDivElement | null>(null);
    const tooltipRef = React.useRef<HTMLDivElement | null>(null);
    const longPressTimer = React.useRef<number | null>(null);
    const longPressArmed = React.useRef(false);
    const suppressClickFromLongPress = React.useRef(false);
    const longPressStart = React.useRef<{ x: number; y: number } | null>(null);
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
    const tooltipId = React.useId();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const updatePosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip) return;

        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip?.getBoundingClientRect();
        const margin = 10;
        const tooltipWidth = tooltipRect?.width ?? 260;
        const tooltipHeight = tooltipRect?.height ?? 60;

        let top = triggerRect.top - tooltipHeight - margin;
        let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;

        if (placement === 'bottom') {
            top = triggerRect.bottom + margin;
        } else if (placement === 'left') {
            top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
            left = triggerRect.left - tooltipWidth - margin;
        } else if (placement === 'right') {
            top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
            left = triggerRect.right + margin;
        }

        const maxLeft = Math.max(margin, window.innerWidth - tooltipWidth - margin);
        const maxTop = Math.max(margin, window.innerHeight - tooltipHeight - margin);
        setCoords({
            top: Math.min(Math.max(top, margin), maxTop),
            left: Math.min(Math.max(left, margin), maxLeft),
        });
    }, [placement]);

    const closeTooltip = React.useCallback(() => {
        setOpen(false);
        longPressArmed.current = false;
        suppressClickFromLongPress.current = false;
    }, []);

    const openTooltip = React.useCallback(() => {
        setOpen(true);
        requestAnimationFrame(updatePosition);
    }, [updatePosition]);

    React.useEffect(() => {
        if (!open) return;
        requestAnimationFrame(updatePosition);
    }, [open, updatePosition]);

    React.useEffect(() => {
        if (!open) return;

        const handleOutside = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
            closeTooltip();
        };

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeTooltip();
            }
        };

        document.addEventListener('pointerdown', handleOutside, true);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            document.removeEventListener('pointerdown', handleOutside, true);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, closeTooltip, updatePosition]);

    React.useEffect(() => {
        return () => {
            if (longPressTimer.current) {
                window.clearTimeout(longPressTimer.current);
            }
        };
    }, []);

    const armLongPress = (event: React.PointerEvent) => {
        if (event.pointerType === 'mouse') return;

        longPressStart.current = { x: event.clientX, y: event.clientY };
        longPressArmed.current = false;

        longPressTimer.current = window.setTimeout(() => {
            longPressArmed.current = true;
        }, longPressDelayMs);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            window.clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        longPressArmed.current = false;
        longPressStart.current = null;
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!longPressTimer.current || !longPressStart.current) return;

        const deltaX = Math.abs(event.clientX - longPressStart.current.x);
        const deltaY = Math.abs(event.clientY - longPressStart.current.y);
        if (deltaX + deltaY > POINTER_MOVE_THRESHOLD) {
            cancelLongPress();
        }
    };

    const handlePointerUp = (event: React.PointerEvent) => {
        if (longPressArmed.current) {
            event.preventDefault();
            suppressClickFromLongPress.current = true;
            openTooltip();
        }
        cancelLongPress();
    };

    const handleMouseEnter = () => {
        openTooltip();
    };

    const handleMouseLeave = () => {
        closeTooltip();
    };

    const handleFocus = () => openTooltip();
    const handleBlur = () => closeTooltip();

    const handleClickCapture = (event: React.MouseEvent) => {
        if (!suppressClickFromLongPress.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickFromLongPress.current = false;
    };

    const portalContent =
        mounted && open
            ? createPortal(
                  <div
                      id={tooltipId}
                      ref={tooltipRef}
                      role="tooltip"
                      style={{
                          position: 'fixed',
                          top: coords?.top ?? -9999,
                          left: coords?.left ?? -9999,
                          zIndex: 60,
                      }}
                      className={cn(
                          'pointer-events-auto rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs leading-snug text-slate-100 shadow-xl backdrop-blur-sm',
                          tooltipClassName
                      )}
                  >
                      {content}
                  </div>,
                  document.body
              )
            : null;

    return (
        <div
            ref={triggerRef}
            className={cn('relative inline-flex', className)}
            aria-describedby={open ? tooltipId : undefined}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPointerDown={armLongPress}
            onPointerUp={handlePointerUp}
            onPointerCancel={cancelLongPress}
            onPointerMove={handlePointerMove}
            onClickCapture={handleClickCapture}
            style={{ touchAction: 'manipulation' }}
        >
            {children}
            {portalContent}
        </div>
    );
}
