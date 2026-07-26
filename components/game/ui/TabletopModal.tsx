import React from 'react';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

type ModalWidth = 'sm' | 'md' | 'lg' | 'xl';

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
    className?: string;
    bodyClassName?: string;
    closeLabel?: string;
}

export const TabletopModal: React.FC<TabletopModalProps> = ({
    title,
    description,
    children,
    footer,
    onClose,
    width = 'md',
    className = '',
    bodyClassName = '',
    closeLabel = 'Close',
}) => (
    <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))]"
        onClick={onClose}
    >
        <section
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Game dialog'}
            className={`w-full ${WIDTH_CLASSES[width]} max-h-[92dvh] overflow-hidden overscroll-contain rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] text-[var(--ui-text)] shadow-2xl ${className}`}
            onClick={(event) => event.stopPropagation()}
        >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--ui-border)] px-6 py-5">
                <div className="min-w-0">
                    <h2 className="font-serif text-xl font-bold text-[var(--ui-text)]">{title}</h2>
                    {description ? <div className="mt-1 text-sm text-[var(--ui-muted)]">{description}</div> : null}
                </div>
                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel-raised)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                        aria-label={closeLabel}
                    >
                        <TabletopStatusIcon type="cancel" size={17} />
                    </button>
                ) : null}
            </header>
            <div className={`max-h-[68dvh] overflow-y-auto overscroll-contain px-6 py-5 ${bodyClassName}`}>{children}</div>
            {footer ? <footer className="flex flex-wrap justify-end gap-3 border-t border-[var(--ui-border)] px-6 py-4">{footer}</footer> : null}
        </section>
    </div>
);

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
