import { rollEventDie } from '@/core/engine/dice/event-die-manager';
import { EventDieFace } from '@/core/rules/commodity-constants';

const EXPECTED_PROB: Record<EventDieFace, number> = {
    ship: 0.5,
    green: 1 / 6,
    yellow: 1 / 6,
    blue: 1 / 6,
};

const parseTrials = (argv: string[]): number => {
    const defaultTrials = 200_000;
    const trialsFlagIndex = argv.findIndex(arg => arg === '--trials' || arg === '-n');
    const directValue = trialsFlagIndex >= 0 ? argv[trialsFlagIndex + 1] : undefined;
    const equalsValue = argv.find(arg => arg.startsWith('--trials=') || arg.startsWith('-n='));
    const raw = directValue ?? equalsValue?.split('=')[1];

    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
    }
    return defaultTrials;
};

function main() {
    const trials = parseTrials(process.argv.slice(2));
    const faces: EventDieFace[] = ['ship', 'green', 'yellow', 'blue'];
    const counts: Record<EventDieFace, number> = {
        ship: 0,
        green: 0,
        yellow: 0,
        blue: 0,
    };

    for (let i = 0; i < trials; i++) {
        const face = rollEventDie();
        counts[face]++;
    }

    console.log(`Event die simulation (${trials.toLocaleString()} trials)`);
    console.log('Face    Obs     Exp     Obs%   Exp%   95% CI (count)        z-score');

    faces.forEach(face => {
        const p = EXPECTED_PROB[face];
        const expectedCount = trials * p;
        const variance = trials * p * (1 - p);
        const sd = Math.sqrt(variance);
        const ci95 = 1.96 * sd;
        const observed = counts[face];
        const z = (observed - expectedCount) / sd;
        const observedPct = (observed / trials) * 100;
        const expectedPct = p * 100;
        const lower = expectedCount - ci95;
        const upper = expectedCount + ci95;

        const padFace = face.padEnd(6, ' ');
        const fmt = (val: number, digits = 1) => val.toFixed(digits).padStart(6, ' ');
        const fmtZ = z.toFixed(2).padStart(6, ' ');

        console.log(
            `${padFace} ${String(observed).padStart(7, ' ')} ${fmt(expectedCount)} ` +
            `${fmt(observedPct, 2)} ${fmt(expectedPct, 2)} ` +
            `${fmt(lower)} - ${fmt(upper)} ${fmtZ}`
        );
    });

    const zScores = faces.map(face => {
        const p = EXPECTED_PROB[face];
        const expected = trials * p;
        const variance = trials * p * (1 - p);
        const sd = Math.sqrt(variance);
        return (counts[face] - expected) / sd;
    });

    const maxAbsZ = Math.max(...zScores.map(Math.abs));
    console.log(`Max |z| across faces: ${maxAbsZ.toFixed(2)} (|z| <= 2 is within ~95% CI)`);
}

main();
