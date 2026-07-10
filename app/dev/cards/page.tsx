import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ProgressCardType, DevCardType } from '@/lib/types/player';
import {
    ResourceCardFace,
    CommodityCardFace,
    ProgressCardFace,
    ProgressDeckBack,
    DevCardFace,
    PROGRESS_ICONS,
} from '@/themes/tabletop';

/**
 * Dev-only visual review page for the tabletop card set (not linked from the
 * game). Renders every face straight from the real components, so what you
 * approve here is exactly what ships. http://localhost:3000/dev/cards
 */

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITIES: CommodityType[] = ['paper', 'cloth', 'coin'];
const DEV_CARDS: DevCardType[] = ['knight', 'victory_point', 'road_building', 'year_of_plenty', 'monopoly'];
const PROGRESS = Object.keys(PROGRESS_ICONS) as ProgressCardType[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">{title}</h2>
            <div className="flex flex-wrap gap-4">{children}</div>
        </section>
    );
}

export default function CardGalleryPage() {
    return (
        <main className="min-h-screen bg-slate-900 p-10">
            <h1 className="text-xl font-bold text-slate-200 mb-8">
                Tabletop card set — dev review page
            </h1>
            <Section title="Resources & commodities (shipped)">
                {RESOURCES.map(t => <ResourceCardFace key={t} type={t} width={104} />)}
                {COMMODITIES.map(t => <CommodityCardFace key={t} type={t} width={104} />)}
            </Section>
            <Section title="Progress deck backs (shipped)">
                {(['science', 'trade', 'politics'] as const).map(c => (
                    <ProgressDeckBack key={c} category={c} width={104} />
                ))}
            </Section>
            <Section title="Progress card fronts — all 25">
                {PROGRESS.map(t => <ProgressCardFace key={t} type={t} width={104} />)}
            </Section>
            <Section title="Development cards (base game)">
                {DEV_CARDS.map(t => <DevCardFace key={t} type={t} width={104} />)}
            </Section>
        </main>
    );
}
