import React from 'react';
import { GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { Tooltip } from '@/components/ui/tooltip';
import { ColoredSvgIcon } from '@/components/ui/icons/ColoredSvgIcon';

interface DiceDisplayProps {
    diceRoll: GameState['diceRoll'];
    eventDieRoll?: GameState['eventDieRoll'];
}

const EVENT_DIE_COLORS: Record<EventDieFace, { bg: string; iconColor: string; label: string }> = {
    ship: { bg: 'bg-slate-700', iconColor: '#ffffff', label: 'Barbarian Ship' },
    green: { bg: 'bg-green-600', iconColor: '#ffffff', label: 'Science' },
    yellow: { bg: 'bg-yellow-500', iconColor: '#0f172a', label: 'Trade' },
    blue: { bg: 'bg-blue-600', iconColor: '#ffffff', label: 'Politics' }
};

const EVENT_DIE_TEXT: Record<EventDieFace, { title: string; description: string }> = {
    ship: { title: 'Barbarian Advance', description: 'Barbarian moves forward one space' },
    green: { title: 'Science', description: 'Progress cards drawn from Science' },
    yellow: { title: 'Trade', description: 'Progress cards drawn from Trade' },
    blue: { title: 'Politics', description: 'Progress cards drawn from Politics' }
};

const DICE_FACE_SVGS: Record<number, string> = {
    1: '/icons/dice-six-faces-one.svg',
    2: '/icons/dice-six-faces-two.svg',
    3: '/icons/dice-six-faces-three.svg',
    4: '/icons/dice-six-faces-four.svg',
    5: '/icons/dice-six-faces-five.svg',
    6: '/icons/dice-six-faces-six.svg',
};

const EVENT_DIE_SVGS: Record<EventDieFace, string> = {
    ship: '/icons/drakkar.svg',
    green: '/icons/freemasonry.svg',
    yellow: '/icons/scales.svg',
    blue: '/icons/shaking-hands.svg',
};

const DIE_OUTER_STYLE =
    'inline-flex h-14 w-14 rounded-2xl border-2 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl p-0 cursor-default';

const DIE_INNER_STYLE = 'flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] shadow-inner';

function DieFrame({
    outerClassName,
    innerClassName,
    children,
}: {
    outerClassName: string;
    innerClassName?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`${DIE_OUTER_STYLE} ${outerClassName}`} style={{ padding: 2 }}>
            <div className={`${DIE_INNER_STYLE} ${innerClassName ?? ''}`}>{children}</div>
        </div>
    );
}

function RegularDie({
    value,
    label,
    backgroundColor,
    pipColor,
}: {
    value: number;
    label: string;
    backgroundColor: string;
    pipColor: string;
}) {
    const src = DICE_FACE_SVGS[value] ?? DICE_FACE_SVGS[1];

    return (
        <Tooltip content={label} placement="top">
            <div aria-label={label}>
                <DieFrame
                    outerClassName="border-white/30"
                    innerClassName="bg-transparent"
                >
                    <ColoredSvgIcon
                        src={src}
                        // Dice SVGs are structured as: full-bleed background + foreground path with "pip holes".
                        // To get "background die with pip color showing through", we set:
                        // - backgroundColor = pip color (fills the full-bleed background)
                        // - color = die body color (fills the foreground path)
                        color={backgroundColor}
                        backgroundColor={pipColor}
                        size={52}
                        alt={label}
                    />
                </DieFrame>
            </div>
        </Tooltip>
    );
}

export const DiceDisplay: React.FC<DiceDisplayProps> = ({ diceRoll, eventDieRoll }) => {
    if (!diceRoll) return null;

    return (
        <div className="bg-black/60 p-3 rounded-lg text-white flex items-center gap-4 backdrop-blur-sm border border-white/10 pointer-events-auto">
            {/* Regular Dice */}
            <div className="flex gap-2">
                <RegularDie
                    value={diceRoll.d1}
                    label="Red Die"
                    // Bright red die background, bright yellow pips (inverse of yellow die)
                    backgroundColor="#dc2626"
                    pipColor="#fbbf24"
                />
                <RegularDie
                    value={diceRoll.d2}
                    label="Yellow Die"
                    // Yellow die background, bright red pips
                    backgroundColor="#fbbf24"
                    pipColor="#dc2626"
                />
            </div>

            {/* Event Die (Cities & Knights) */}
            {eventDieRoll && (
                <>
                    <div className="w-px h-8 bg-white/20" />
                    <Tooltip
                        content={(
                            <div className="flex flex-col text-left">
                                <span className="font-semibold text-white">{EVENT_DIE_TEXT[eventDieRoll.face].title}</span>
                                <span className="text-slate-200">{EVENT_DIE_TEXT[eventDieRoll.face].description}</span>
                            </div>
                        )}
                        placement="top"
                    >
                        <div aria-label={`Event die: ${EVENT_DIE_TEXT[eventDieRoll.face].title}`}>
                            <DieFrame
                                outerClassName={`${EVENT_DIE_COLORS[eventDieRoll.face].bg} border-white/20 cursor-pointer`}
                            >
                                <ColoredSvgIcon
                                    src={EVENT_DIE_SVGS[eventDieRoll.face]}
                                    color={EVENT_DIE_COLORS[eventDieRoll.face].iconColor}
                                    size={52}
                                    alt={EVENT_DIE_COLORS[eventDieRoll.face].label}
                                />
                            </DieFrame>
                        </div>
                    </Tooltip>
                </>
            )}
        </div>
    );
};
