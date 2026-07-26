import React from 'react';
import { GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { Tooltip } from '@/components/ui/tooltip';
import { PipDie, EventDie } from '@/themes/tabletop';

interface DiceDisplayProps {
    diceRoll: GameState['diceRoll'];
    eventDieRoll?: GameState['eventDieRoll'];
}

/** Tabletop die colors (art direction: warm red/gold, cream or ink pips) */
const RED_DIE = { body: '#b3352c', pip: '#f3e9cf' };
const YELLOW_DIE = { body: '#d9a72e', pip: '#3a3020' };

const EVENT_DIE_TEXT: Record<EventDieFace, { title: string; description: string }> = {
    ship: { title: 'Barbarian Advance', description: 'Barbarian moves forward one space' },
    science: { title: 'Science', description: 'Progress cards drawn from Science' },
    trade: { title: 'Trade', description: 'Progress cards drawn from Trade' },
    politics: { title: 'Politics', description: 'Progress cards drawn from Politics' },
};

export const DiceDisplay: React.FC<DiceDisplayProps> = ({ diceRoll, eventDieRoll }) => {
    if (!diceRoll) return null;

    return (
        <div className="flex items-center gap-3 pointer-events-auto">
            {/* Production dice */}
            <div className="flex gap-2">
                <Tooltip content="Red Die" placement="top">
                    <div className="transition hover:-translate-y-0.5">
                        <PipDie value={diceRoll.d1} body={RED_DIE.body} pip={RED_DIE.pip} size={48} title="Red Die" />
                    </div>
                </Tooltip>
                <Tooltip content="Yellow Die" placement="top">
                    <div className="transition hover:-translate-y-0.5">
                        <PipDie value={diceRoll.d2} body={YELLOW_DIE.body} pip={YELLOW_DIE.pip} size={48} title="Yellow Die" />
                    </div>
                </Tooltip>
            </div>

            {/* Event die (Cities & Knights) */}
            {eventDieRoll && (
                <>
                    <div className="w-px h-8 bg-[var(--ui-text)]/20" />
                    <Tooltip
                        content={(
                            <div className="flex flex-col text-left">
                                <span className="font-semibold text-[var(--ui-text)]">{EVENT_DIE_TEXT[eventDieRoll.face].title}</span>
                                <span className="text-[var(--ui-muted)]">{EVENT_DIE_TEXT[eventDieRoll.face].description}</span>
                            </div>
                        )}
                        placement="top"
                    >
                        <div className="cursor-pointer transition hover:-translate-y-0.5">
                            <EventDie
                                face={eventDieRoll.face}
                                size={48}
                                title={EVENT_DIE_TEXT[eventDieRoll.face].title}
                            />
                        </div>
                    </Tooltip>
                </>
            )}
        </div>
    );
};
