import React from 'react';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

type ModalWidth = 'sm' | 'md' | 'lg' | 'xl';

/**
 * How the dialog relates to the board underneath it.
 *
 * - `blocking` — dims and blurs the whole app. Correct when every fact needed to
 *   decide is printed inside the dialog (hand/trade choices, opponent tables), or
 *   when the choice is irreversible and the block is the warning.
 * - `board-visible` — anchored above the board with no scrim, so hexes, number
 *   tokens and the bottom tray stay readable and clickable. Correct whenever the
 *   decision is *about* the board (Alchemy's dice, Inventor's token swap) — you
 *   cannot pick a number token you cannot see. Matches the placement prompts
 *   (MerchantPlacementModal, TaxationPlacementModal, TreasonPlacementModal).
 */
type ModalSurface = 'blocking' | 'board-visible';

const WIDTH_CLASSES: Record<ModalWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
};

interface TabletopModalProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    onClose?: () => void;
    width?: ModalWidth;
    surface?: ModalSurface;
    backdropBlur?: boolean;
    className?: string;
    bodyClassName?: string;
    closeLabel?: string;
    headerAction?: React.ReactNode;
    collapsed?: boolean;
    expanded?: boolean;
}

export const TabletopModal: React.FC<TabletopModalProps> = ({
    title,
    description,
    children,
    footer,
    onClose,
    width = 'md',
    surface = 'blocking',
    backdropBlur = true,
    className = '',
    bodyClassName = '',
    closeLabel = 'Close',
    headerAction,
    collapsed = false,
    expanded = false,
}) => {
    const isBoardVisible = surface === 'board-visible';

    // The wrapper is pointer-events-none when board-visible so clicks pass
    // through to the hexes; only the panel itself takes input. It also sits
    // below the blocking band (z-[9999]) so a true modal always wins, and clears
    // the tablet HUD (top-0, xl:hidden) on narrow viewports.
    const wrapperClass = isBoardVisible
        ? 'fixed inset-x-0 top-4 z-[60] flex justify-center pointer-events-none px-[max(1rem,env(safe-area-inset-left))] max-xl:top-24'
        : `fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 pointer-events-auto px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))] ${onClose ? 'cursor-pointer' : ''} ${backdropBlur ? 'backdrop-blur-sm' : ''}`;

    // Board-visible panels stay short so they cover as few hexes as possible.
    const panelClass = isBoardVisible
        ? `${expanded ? 'pointer-events-auto max-h-[calc(100dvh-2rem)]' : 'pointer-events-auto max-h-[60dvh]'} shadow-xl`
        : 'max-h-[92dvh] shadow-2xl';
    const bodyMaxHeight = isBoardVisible
        ? expanded
            ? 'max-h-[calc(100dvh-9rem)]'
            : 'max-h-[38dvh]'
        : 'max-h-[68dvh]';

    // Tighter chrome when floating over the board; full padding when blocking.
    const headerPad = isBoardVisible ? 'px-4 py-3' : 'px-6 py-5';
    const bodyPad = isBoardVisible ? 'px-4 py-3' : 'px-6 py-5';
    const footerPad = isBoardVisible ? 'px-4 py-3' : 'px-6 py-4';

    return (
        <div
            className={wrapperClass}
            onClick={isBoardVisible ? undefined : onClose}
        >
            <section
                role="dialog"
                aria-modal={!isBoardVisible}
                aria-label={typeof title === 'string' ? title : 'Game dialog'}
                className={`w-full ${WIDTH_CLASSES[width]} cursor-default overflow-hidden overscroll-contain rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] text-[var(--ui-text)] ${panelClass} ${className}`}
                onClick={(event) => event.stopPropagation()}
            >
                <header className={`flex items-start justify-between gap-4 border-b border-[var(--ui-border)] ${headerPad}`}>
                    <div className="min-w-0">
                        <h2 className={`font-serif font-bold text-[var(--ui-text)] ${isBoardVisible ? 'text-base' : 'text-xl'}`}>{title}</h2>
                        {description ? <div className={`mt-1 text-[var(--ui-muted)] ${isBoardVisible ? 'text-xs' : 'text-sm'}`}>{description}</div> : null}
                    </div>
                    {headerAction || onClose ? (
                        <div className="flex flex-shrink-0 items-center gap-2">
                            {headerAction}
                            {onClose ? (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-transparent text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel-raised)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                                    aria-label={closeLabel}
                                >
                                    <TabletopStatusIcon type="cancel" size={17} />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </header>
                {!collapsed ? (
                    <>
                        <div className={`${bodyMaxHeight} overflow-y-auto overscroll-contain ${bodyPad} ${bodyClassName}`}>{children}</div>
                        {footer ? <footer className={`flex flex-wrap justify-end gap-3 border-t border-[var(--ui-border)] ${footerPad}`}>{footer}</footer> : null}
                    </>
                ) : null}
            </section>
        </div>
    );
};

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)] hover:brightness-110',
    secondary: 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-text)] hover:brightness-110',
    danger: 'border-[var(--ui-danger)] bg-[var(--ui-danger)] text-white hover:brightness-110',
    ghost: 'border-transparent bg-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel-raised)] hover:text-[var(--ui-text)]',
};

export interface TabletopButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export const TabletopButton: React.FC<TabletopButtonProps> = ({ variant = 'secondary', className = '', disabled, type = 'button', ...props }) => (
    <button
        type={type}
        disabled={disabled}
        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${disabled ? 'cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] opacity-60' : `cursor-pointer ${BUTTON_VARIANTS[variant]}`} ${className}`}
        {...props}
    />
);

export const tabletopOptionClass = (selected: boolean, disabled = false): string => {
    if (disabled) {
        return 'cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-panel-solid)] text-[var(--ui-muted)] opacity-50';
    }
    if (selected) {
        return 'cursor-pointer border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_18%,var(--ui-panel-raised))] text-[var(--ui-text)]';
    }
    return 'cursor-pointer border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-text)] hover:border-[var(--ui-accent)] hover:brightness-110';
};
