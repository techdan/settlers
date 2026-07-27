import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TradeController } from '@/lib/controllers/trade-controller';
import {
    ALL_TRADE_ITEMS,
    TRADE_RESOURCES,
    getBankTradeRatios,
    isCommodity,
    type TradeItem,
} from '@/lib/trade/bank-ratios';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { CARD_LABELS, CardRow, CardTally, CardToken } from '@/components/game/ui/CardToken';

interface TradeModalProps {
    gameState: GameState;
    playerId: string;
    onClose: () => void;
    tradeController: TradeController;
}

type ItemCounts = Partial<Record<TradeItem, number>>;

/** How long a trade receipt stays on screen before fading out. */
const RECEIPT_MS = 2600;

const splitByKind = (counts: ItemCounts) => {
    const resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } as Record<ResourceType, number>;
    const commodities = { paper: 0, cloth: 0, coin: 0 } as Record<CommodityType, number>;
    for (const [item, amount] of Object.entries(counts)) {
        if (!amount) continue;
        if (isCommodity(item)) commodities[item as CommodityType] = amount;
        else resources[item as ResourceType] = amount;
    }
    return { resources, commodities };
};

const totalOf = (counts: ItemCounts) => Object.values(counts).reduce<number>((sum, n) => sum + (n || 0), 0);

const RowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">{children}</div>
);

export const TradeModal: React.FC<TradeModalProps> = ({ gameState, playerId, onClose, tradeController }) => {
    const player = gameState.players.find(p => p.id === playerId);

    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<'bank' | 'domestic'>('bank');
    const [error, setError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<{ id: number; text: string } | null>(null);
    const receiptId = useRef(0);

    // Bank: one item per side, chosen by clicking a token.
    const [giveItem, setGiveItem] = useState<TradeItem | null>(null);
    const [getItem, setGetItem] = useState<TradeItem | null>(null);

    // Players: a running tally per side, built one click at a time.
    const [offerGive, setOfferGive] = useState<ItemCounts>({});
    const [offerGet, setOfferGet] = useState<ItemCounts>({});

    const ratios = useMemo(() => getBankTradeRatios(gameState, playerId), [gameState, playerId]);

    // The receipt replaces the old blocking "Trade Complete!" dialog, so repeat trades
    // never wait on an OK click. Keyed by id so two identical trades re-arm the timer.
    useEffect(() => {
        if (!receipt) return;
        const timer = setTimeout(() => setReceipt(null), RECEIPT_MS);
        return () => clearTimeout(timer);
    }, [receipt]);

    if (!player) return null;

    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
    const tradeItems: readonly TradeItem[] = isCitiesAndKnights ? ALL_TRADE_ITEMS : TRADE_RESOURCES;

    const heldOf = (item: TradeItem): number =>
        isCommodity(item) ? (player.commodities?.[item] || 0) : (player.resources[item] || 0);

    const showReceipt = (text: string) => {
        receiptId.current += 1;
        setReceipt({ id: receiptId.current, text });
    };

    /* ---------------- bank ---------------- */

    const giveRatio = giveItem ? ratios[giveItem] : 0;
    const canAffordBank = giveItem !== null && heldOf(giveItem) >= giveRatio;
    const bankReady = giveItem !== null && getItem !== null && canAffordBank && !isPending;

    const handleSelectGive = (item: TradeItem) => {
        setError(null);
        setGiveItem(item);
        if (getItem === item) setGetItem(null);
    };

    const handleBankTrade = () => {
        if (!giveItem || !getItem) return;
        const give = giveItem;
        const get = getItem;
        const cost = ratios[give];
        setError(null);
        startTransition(async () => {
            try {
                await tradeController.handleBankTrade(give, get);
                showReceipt(`Traded ${cost} ${CARD_LABELS[give]} → 1 ${CARD_LABELS[get]}`);
            } catch (e) {
                console.error('Failed to trade', e);
                setError(e instanceof Error ? e.message : 'Trade failed');
            }
        });
    };

    /* ---------------- players ---------------- */

    const stagedGive = (item: TradeItem) => offerGive[item] || 0;
    const stagedGet = (item: TradeItem) => offerGet[item] || 0;
    const projectedOf = (item: TradeItem) => heldOf(item) - stagedGive(item) + stagedGet(item);

    const adjust = (side: 'give' | 'get', item: TradeItem, delta: number) => {
        setError(null);
        const setter = side === 'give' ? setOfferGive : setOfferGet;
        setter(prev => {
            const next = (prev[item] || 0) + delta;
            if (next < 0) return prev;
            if (side === 'give' && next > heldOf(item)) return prev;
            return { ...prev, [item]: next };
        });
    };

    const clearOffer = () => {
        setOfferGive({});
        setOfferGet({});
        setError(null);
    };

    const offerReady = (totalOf(offerGive) > 0 || totalOf(offerGet) > 0) && !isPending;

    const handleOfferTrade = () => {
        setError(null);
        const give = splitByKind(offerGive);
        const get = splitByKind(offerGet);
        startTransition(async () => {
            try {
                await tradeController.handleOfferTrade(
                    give.resources,
                    get.resources,
                    give.commodities,
                    get.commodities
                );
                clearOffer();
                onClose();
            } catch (e) {
                // Keep the modal open so the composed offer survives and the
                // player can correct it — closing would discard their work.
                console.error('Failed to offer trade', e);
                setError(e instanceof Error ? e.message : 'Could not offer that trade');
            }
        });
    };

    /* ---------------- render ---------------- */

    const tabClass = (active: boolean) =>
        `min-h-11 cursor-pointer rounded-full border px-5 py-1 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${
            active
                ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]'
                : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] hover:text-[var(--ui-text)]'
        }`;

    const bankHeadline = !giveItem
        ? 'Pick what you want to give the bank'
        : !getItem
            ? `Giving ${giveRatio} ${CARD_LABELS[giveItem]} — now pick what you receive`
            : `${giveRatio} ${CARD_LABELS[giveItem]} for 1 ${CARD_LABELS[getItem]}`;

    return (
        <TabletopModal
            title="Trade"
            description="Exchange with the bank or propose a deal to the other players."
            onClose={onClose}
            width="lg"
        >
            <div className="mb-5 flex justify-center">
                <div className="flex gap-2" role="group" aria-label="Trade mode">
                    <button onClick={() => { setMode('bank'); setError(null); }} className={tabClass(mode === 'bank')}>Bank</button>
                    <button onClick={() => { setMode('domestic'); setError(null); }} className={tabClass(mode === 'domestic')}>Players</button>
                </div>
            </div>

            {mode === 'bank' ? (
                <>
                    <div role="group" aria-label="Item to give">
                        <RowLabel>You give — badge shows your rate</RowLabel>
                        <CardRow>
                            {tradeItems.map(item => {
                                const held = heldOf(item);
                                const ratio = ratios[item];
                                const affordable = held >= ratio;
                                return (
                                    <CardToken
                                        key={item}
                                        type={item}
                                        count={held}
                                        badge={`${ratio}:1`}
                                        badgeTone={ratio < 4 ? 'good' : 'muted'}
                                        hint={affordable ? undefined : `need ${ratio}`}
                                        selected={giveItem === item}
                                        disabled={!affordable}
                                        onClick={() => handleSelectGive(item)}
                                        ariaLabel={`Give ${CARD_LABELS[item]}, you have ${held}, rate ${ratio} to 1${affordable ? '' : `, need ${ratio}`}`}
                                    />
                                );
                            })}
                        </CardRow>
                    </div>

                    <div className="my-4 flex items-center justify-center gap-2 text-sm text-[var(--ui-muted)]">
                        <TabletopStatusIcon type="trade" size={20} />
                        <span className={giveItem && getItem ? 'font-semibold text-[var(--ui-text)]' : undefined}>{bankHeadline}</span>
                    </div>

                    <div role="group" aria-label="Item to receive">
                        <RowLabel>You get</RowLabel>
                        <CardRow>
                            {tradeItems.filter(item => item !== giveItem).map(item => (
                                <CardToken
                                    key={item}
                                    type={item}
                                    count={heldOf(item)}
                                    selected={getItem === item}
                                    onClick={() => { setError(null); setGetItem(item); }}
                                    ariaLabel={`Receive ${CARD_LABELS[item]}, you have ${heldOf(item)}`}
                                />
                            ))}
                        </CardRow>
                    </div>

                    <TabletopButton
                        onClick={handleBankTrade}
                        disabled={!bankReady}
                        variant="primary"
                        className="mt-5 w-full py-3"
                    >
                        {isPending
                            ? 'Trading...'
                            : giveItem && getItem
                                ? `Trade ${giveRatio} ${CARD_LABELS[giveItem]} → 1 ${CARD_LABELS[getItem]}`
                                : 'Trade'}
                    </TabletopButton>
                </>
            ) : (
                <>
                    <div role="group" aria-label="Items you offer">
                        <RowLabel>You give — counts show your hand after the trade</RowLabel>
                        <CardRow>
                            {tradeItems.filter(item => heldOf(item) > 0 || stagedGive(item) > 0).map(item => {
                                const staged = stagedGive(item);
                                return (
                                    <CardToken
                                        key={item}
                                        type={item}
                                        count={projectedOf(item)}
                                        badge={staged > 0 ? `+${staged}` : undefined}
                                        badgeTone="accent"
                                        selected={staged > 0}
                                        disabled={staged >= heldOf(item)}
                                        trend={staged > 0 ? 'down' : null}
                                        onClick={() => adjust('give', item, 1)}
                                        onRemove={staged > 0 ? () => adjust('give', item, -1) : undefined}
                                        removeLabel={`Offer one fewer ${CARD_LABELS[item]}`}
                                        ariaLabel={`Offer one more ${CARD_LABELS[item]}, offering ${staged} of ${heldOf(item)}`}
                                    />
                                );
                            })}
                            {tradeItems.every(item => heldOf(item) === 0) && (
                                <p className="py-4 text-sm text-[var(--ui-muted)]">You have nothing to offer yet.</p>
                            )}
                        </CardRow>
                    </div>

                    <div className="my-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-sm">
                        <CardTally counts={offerGive} />
                        <TabletopStatusIcon type="trade" size={18} label="in exchange for" />
                        <CardTally counts={offerGet} />
                    </div>

                    <div role="group" aria-label="Items you request">
                        <RowLabel>You want</RowLabel>
                        <CardRow>
                            {tradeItems.map(item => {
                                const staged = stagedGet(item);
                                return (
                                    <CardToken
                                        key={item}
                                        type={item}
                                        count={projectedOf(item)}
                                        badge={staged > 0 ? `+${staged}` : undefined}
                                        badgeTone="accent"
                                        selected={staged > 0}
                                        trend={staged > 0 ? 'up' : null}
                                        onClick={() => adjust('get', item, 1)}
                                        onRemove={staged > 0 ? () => adjust('get', item, -1) : undefined}
                                        removeLabel={`Request one fewer ${CARD_LABELS[item]}`}
                                        ariaLabel={`Request one more ${CARD_LABELS[item]}, requesting ${staged}`}
                                    />
                                );
                            })}
                        </CardRow>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <TabletopButton
                            onClick={clearOffer}
                            disabled={totalOf(offerGive) + totalOf(offerGet) === 0}
                            className="py-3"
                        >
                            Clear
                        </TabletopButton>
                        <TabletopButton
                            onClick={handleOfferTrade}
                            disabled={!offerReady}
                            variant="primary"
                            className="flex flex-1 items-center justify-center gap-2 py-3"
                        >
                            {!isPending && <TabletopStatusIcon type="trade" size={18} />}
                            {isPending ? 'Offering...' : 'Offer Trade'}
                        </TabletopButton>
                    </div>
                </>
            )}

            <div aria-live="polite" role="status" className="min-h-0">
                {receipt && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--ui-success)] bg-[color-mix(in_oklab,var(--ui-success)_14%,var(--ui-panel-solid))] px-3 py-2 duration-300 animate-in fade-in">
                        <TabletopStatusIcon type="confirm" size={16} />
                        <span className="text-sm font-semibold text-[var(--ui-text)]">{receipt.text}</span>
                    </div>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2"
                >
                    <TabletopStatusIcon type="cancel" size={16} className="mt-0.5 shrink-0" />
                    <span className="text-sm text-[var(--ui-text)]">{error}</span>
                </div>
            )}
        </TabletopModal>
    );
};
