'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { TabletopImprovementIcon, TabletopVictoryPointIcon } from '@/themes/tabletop';
import { playerPieceColor } from '@/lib/presentation/piece-style';
import { CompactImprovementBar } from './CompactImprovementBar';
import type { PlayerCardTimer } from './CompactPlayerCard';

export interface PlayerCardStat {
    id: string;
    label: string;
    value: number;
    detail: string;
    icon: ReactNode;
    limit?: number;
    danger?: boolean;
    held?: boolean;
}

export interface PlayerCardImprovement {
    type: 'science' | 'trade' | 'politics';
    level: number;
    hasMetropolis: boolean;
    detail: string;
}

export interface PlayerCardAward {
    id: string;
    label: string;
    detail: string;
    icon: ReactNode;
    count?: number;
}

interface ThreePlayerCardProps {
    id: string;
    name: string;
    color: string;
    isCurrentPlayer: boolean;
    isTurn: boolean;
    publicVictoryPoints: number;
    victoryBreakdown: string;
    stats: PlayerCardStat[];
    improvements: PlayerCardImprovement[];
    awards: PlayerCardAward[];
    timer?: PlayerCardTimer | null;
    onOpenCityManagement?: () => void;
}

const ACTION_CLASS = 'cursor-pointer rounded-md px-2 text-[11px] font-semibold text-[#d9c79d] transition-colors hover:bg-[#f3e9cf]/10 hover:text-[#fff4d7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0bc6b]';

/** Only already-public summaries cross this presentation boundary. */
export function ThreePlayerCard({ id, name, color, isCurrentPlayer, isTurn, publicVictoryPoints, victoryBreakdown, stats, improvements, awards, timer, onOpenCityManagement }: ThreePlayerCardProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const paint = playerPieceColor(color);
    const activeTimer = isTurn ? timer : null;
    const showYouMarker = isCurrentPlayer && name.trim().toLowerCase() !== 'you';

    return <article data-testid={`player-card-${id}`} data-presentation="three" data-turn={isTurn ? 'true' : 'false'}
        aria-label={`${name}${showYouMarker ? ', you' : ''}${isTurn ? ', active turn' : ''}`}
        className="relative min-w-0 overflow-hidden rounded-xl border text-[#f3e9cf] shadow-sm"
        style={{ borderColor: isTurn ? '#ae965c' : '#53635b', background: `linear-gradient(105deg, color-mix(in srgb, ${paint} 10%, #213333), #213333 60%)` }}>
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: paint }} />
        <div className="space-y-1 py-1.5 pl-3 pr-2">
            <div className="flex min-h-8 min-w-0 items-center gap-2">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 font-serif text-sm font-bold"
                    style={{ backgroundColor: paint, color: paint === playerPieceColor('white') || paint === playerPieceColor('orange') ? '#26322e' : '#fff8e9' }}>{name.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-1.5"><span className="truncate text-sm font-semibold" title={name}>{name}</span>{showYouMarker && <span className="shrink-0 text-[10px] text-[#b9c8bd]">You</span>}</div>
                    {isTurn && <div className="flex items-center gap-2 text-[11px] leading-4 text-[#e7c981]">
                        <span>{isCurrentPlayer ? 'Your turn' : 'Active turn'}</span>
                        {activeTimer?.remainingLabel && <span data-testid="turn-timer-label" className="font-semibold tabular-nums" aria-label={`Turn clock: ${activeTimer.remainingLabel}`}>{activeTimer.remainingLabel}</span>}
                    </div>}
                </div>
                <TabletopVictoryPointIcon value={publicVictoryPoints} ring={paint} size={30} label={`${publicVictoryPoints} victory points`} />
                <button type="button" aria-label={`Details for ${name}`} aria-haspopup="dialog" onClick={() => setDetailsOpen(true)}
                    className={`${ACTION_CLASS} flex min-h-8 shrink-0 items-center gap-0.5 [@media(pointer:coarse)]:min-h-11`}>Details<ChevronRight aria-hidden="true" size={12} /></button>
            </div>

            <dl className="grid grid-cols-4 gap-1 border-t border-[#c0b28b]/15 pt-1">
                {stats.map(stat => <div key={stat.id} role="group" title={stat.detail} data-testid={stat.id} data-danger={stat.danger ? 'true' : 'false'}
                    className={`min-w-0 rounded-md px-1 ${stat.danger ? 'bg-[#713f32]/55 text-[#ffd6b7]' : 'text-[#e5eadb]'}`}
                    aria-label={`${stat.label}: ${stat.value}${stat.limit !== undefined ? ` cards, safe limit ${stat.limit}${stat.danger ? ', over discard limit' : ''}` : ''}`}>
                    <dt className={`truncate text-[10px] leading-3 ${stat.danger ? 'font-semibold text-[#ffd6b7]' : 'text-[#b5c4b9]'}`}>{stat.danger ? 'Over limit' : stat.label}</dt>
                    <dd className="flex items-center gap-1 text-[14px] font-semibold leading-4 tabular-nums">
                        <span aria-hidden="true" className="shrink-0">{stat.icon}</span>
                        <span>{stat.value}{stat.limit !== undefined && <span className="text-[11px] font-normal opacity-80">/{stat.limit}</span>}</span>
                        {stat.held && <span className="text-[10px] text-[#e7c981]" aria-label="Award held">★</span>}
                    </dd>
                </div>)}
            </dl>

            {(improvements.length > 0 || awards.length > 0 || onOpenCityManagement) && <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#c0b28b]/15 pt-1">
                {improvements.length > 0 && <div className="flex flex-1 items-center gap-2" aria-label="City improvements">
                    {improvements.map(track => <div key={track.type} className="flex items-center gap-1" role="img"
                        aria-label={`${track.type} level ${track.level} of 5${track.hasMetropolis ? ', Metropolis' : ''}`}>
                        <TabletopImprovementIcon type={track.type} size={13} />
                        <CompactImprovementBar type={track.type} level={track.level} hasMetropolis={track.hasMetropolis} dotSize={4} />
                    </div>)}
                </div>}
                {awards.map(award => <span key={award.id} data-testid={award.id} title={award.label} aria-label={award.label}
                    className="flex items-center gap-0.5 rounded bg-[#b89b5c]/15 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-[#e7c981]">{award.icon}{award.count ?? null}</span>)}
                {onOpenCityManagement && <button type="button" className={`${ACTION_CLASS} min-h-6 border border-[#ad9764]/30 [@media(pointer:coarse)]:min-h-11`}
                    aria-label={`Manage cities for ${name}`} onClick={onOpenCityManagement}>Cities</button>}
            </div>}
        </div>
        {activeTimer && <div className="h-0.5 bg-[#162728]" aria-hidden="true"><div data-testid="turn-timer-bar"
            className={`h-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none motion-reduce:animate-none ${activeTimer.colorClass}`} style={{ width: `${activeTimer.percentage}%` }} /></div>}
        {detailsOpen && <PlayerDetails name={name} score={publicVictoryPoints} victoryBreakdown={victoryBreakdown}
            stats={stats} improvements={improvements} awards={awards} onClose={() => setDetailsOpen(false)} />}
    </article>;
}

function PlayerDetails({ name, score, victoryBreakdown, stats, improvements, awards, onClose }: {
    name: string; score: number; victoryBreakdown: string; stats: PlayerCardStat[];
    improvements: PlayerCardImprovement[]; awards: PlayerCardAward[]; onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    useEffect(() => {
        const node = dialog.current;
        if (!node) return;
        const previousFocus = document.activeElement;
        node.showModal();
        closeButton.current?.focus();
        return () => {
            if (node.open) node.close();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, []);

    return createPortal(<dialog ref={dialog} aria-labelledby={titleId}
        onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
        className="fixed inset-0 m-auto max-h-[min(85dvh,44rem)] w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-[#b39c67]/50 bg-[#243734] p-0 text-[#f3e9cf] shadow-2xl backdrop:bg-[#071a1d]/60">
        <div className="flex max-h-[min(85dvh,44rem)] flex-col">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#b39c67]/25 px-5 py-4">
                <div className="min-w-0"><h2 id={titleId} className="break-words font-serif text-xl">{name}</h2><p className="mt-1 text-xs text-[#b8c9ba]">Player details · public information</p></div>
                <button ref={closeButton} type="button" onClick={onClose} aria-label="Close player details"
                    className={`${ACTION_CLASS} flex size-11 shrink-0 items-center justify-center`}><X aria-hidden="true" size={20} /></button>
            </header>
            <div tabIndex={0} aria-label="Public player information" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#e0bc6b]">
                <section><h3 className="text-sm font-semibold text-[#ecd397]">{score} public victory points</h3><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#cbd6c8]">{victoryBreakdown}</p></section>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">{stats.map(stat => <div key={stat.id}><dt className="text-sm font-semibold text-[#ecd397]">{stat.label}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#cbd6c8]">{stat.detail}</dd></div>)}</dl>
                {improvements.length > 0 && <section><h3 className="text-sm font-semibold text-[#ecd397]">City improvements</h3><ul className="mt-2 space-y-3">{improvements.map(track => <li key={track.type}><p className="text-sm font-semibold capitalize">{track.type} · {track.level}/5{track.hasMetropolis ? ' · Metropolis' : ''}</p><p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#cbd6c8]">{track.detail}</p></li>)}</ul></section>}
                {awards.length > 0 && <section><h3 className="text-sm font-semibold text-[#ecd397]">Awards held</h3><ul className="mt-2 space-y-3">{awards.map(award => <li key={award.id}><p className="text-sm font-semibold">{award.label}</p><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#cbd6c8]">{award.detail}</p></li>)}</ul></section>}
            </div>
        </div>
    </dialog>, document.body);
}
