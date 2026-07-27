# Player panel redesign — 2026-07-26

**Goal:** the right-rail player cards read as eight equal-weight 12px glyph pairs
(`CompactPlayerCard.tsx` row 2). Make the tactically urgent numbers scan first, and
adopt the shaped-chip language of the reference screenshots without leaving the rail.

**Approved design decisions (user, 2026-07-26):**
- Stay in the right rail. A 4-player top strip gives each player ~300px (same as the
  320px rail) while costing ~75px of board height — and the HUD already scales on
  height (`--hud-scale`, `GameLayoutPanels.tsx:19-24`).
- No avatars. Identity is carried by a color spine + background wash.
- Improvement tracks keep dots (they encode distance-to-unlock and host the
  metropolis piece, which a numeral cannot) but shed the `S`/`T`/`P` letters.
- All three stages, in order.

Net height target: unchanged. Cards grow ~3px each; moving the timer bar out of the
shared header reclaims ~12px.

## Stage 1 — chips, VP token, color spine

- [x] `themes/tabletop/glyphs.tsx`: add `CardBackGlyph`, `VictoryPointToken`,
      `RoadGlyph` + standalone icon wrappers. Plan §4.5.1 forbids one-off SVG inside
      consumers, and §3 already names "VP/knight/hand-size chips" as HUD assets.
- [x] `themes/tabletop/index.ts`: re-export them.
- [x] `CompactPlayerCard.tsx`: replace the eight hand-rolled 14×14 glyphs
      (lines 22-66) with the shared set; card-back chips for hand size; VP token;
      left color spine + `color-mix` wash; split resources/commodities in C&K.

## Stage 2 — awards cluster, zero-dimming, improvement glyphs

- [x] `CompactImprovementBar.tsx`: `dotSize` drives real pixels (5px dots), glyph-led,
      no external `scale-[0.85]` wrapper.
- [x] `CompactPlayerCard.tsx`: trophies (Largest Army / Defender / Merchant) leave the
      inline stat run for a right-aligned cluster, rendered only when held.
      Zero-valued stats drop to 40% opacity.

## Stage 3 — turn timer moves onto the active card

- [x] `CompactGameStatus.tsx`: keep the single `useTimerState` subscription, drop the
      header progress bar, pass `{ percentage, colorClass }` to the active card only.
- [x] `CompactPlayerCard.tsx`: render it as a 3px bar on the card's bottom edge.

## Verification

- [x] New `components/game/player/__tests__/CompactPlayerCard.test.tsx` — 19 tests.
- [x] `npx tsc --noEmit` clean for these files (the one repo error is in the parallel
      card-token workstream's untracked `DiscardModal.selection.test.tsx`).
- [x] `npm run test:run` — 86 files, 443/443.
- [x] Phase 4.5 slate gate holds: `[^a-z]slate-` over `components/game` returns 0.
      (A bare `slate-` returns 26 — every one is `-translate-x-*`, the false positive
      the plan already documents in §4.5.)

## Review

**Landed as designed, with two deviations worth recording.**

- **Longest Road and Largest Army did not become trophy badges in C&K.** Both were
  already expressible by tinting the stat they belong to (the road chip goes brass;
  the army shield goes politics-blue). A separate badge would have shown the same fact
  twice. Largest Army *does* get a badge in the base game, because there the shield
  chip counts knights played, which is not the same fact as holding the award.
- **`revealedVPCards` / `revealedDevCardVictoryPoints` lost their dedicated stats.**
  They were near-always zero, and both are already summed into the VP token and
  itemised in its breakdown tooltip. Two of the eight original stats were redundant
  with the number sitting six pixels away.

**Net height:** C&K card ~81px → ~84px; base-game card drops row 3 entirely (the road
and army stats moved up into the chip row), so it goes ~63px → ~62px. Removing the
header progress bar returns 12px. The rail budget is unchanged.

**What could break, and what covers it:**

| Risk | Cover |
| --- | --- |
| `color-mix()` support | Tailwind v4 + `oklch(from …)` already in `globals.css:167` set the same baseline; jsdom parses it in the identity tests. |
| Hand-size danger threshold regressed | Two tests pin it: 8 cards flags at the bare limit, and does not flag with a city wall (limit 9). |
| Metropolis marker lost in the smaller dots | Test asserts the `Metropolis` `role="img"` still replaces the dot at the earned level. |
| Timer detached from the active player | `CompactGameStatus` passes `timer` only when `currentTurn === player.id`; card tests cover present/absent and the width/tint mapping. |
| Four one-second render loops | Avoided — `useTimerState` stays subscribed once in `CompactGameStatus`; the card is pure props. |

**Two glyph collisions found in review (user, 2026-07-26) and fixed:**

- **Merchant** was the trade-improvement scales — which label the *trade track*, a
  different thing. Now the `Merchant` board piece itself (hat, sash in the player's
  colour), wrapped at HUD size the way `CompactImprovementBar` wraps `Metropolis`.
- **Defender of Catan** was `ShieldGlyph`, but the shield is already the C&K
  knight-strength stat chip on the same card — one silhouette, two meanings, 12px
  apart. Now `CrossedSwords`. Largest Army (gated `!isCK`) and Defender (gated `isCK`)
  can never co-occur, so the one glyph means "the military honour" in either mode and
  the shield is unambiguous again. Both award icons carry `aria-label`s now, and a
  test pins Defender to crossed swords.

The general rule these two violated: **a glyph may mean exactly one thing per card.**
Reusing an existing glyph is right; reusing one that is already spoken for is not.

**Tray dice grouping (user, 2026-07-26).** The bottom row ran three separation
conventions left to right: the tray's full-height `Divider`, then a `w-px h-8` rule
inside `DiceDisplay` splitting the production dice from the event die, then nothing at
all before the action buttons. The middle rule was a false grouping — all three dice
come from one roll — and the missing one sat exactly where a real boundary is (dice
report what happened; buttons are what you can do). Removed the inner rule so all
three dice share one `gap-2`, and widened the dice→actions gap to `gap-6`
(`max-xl:gap-4`). Both clusters space their own children at `gap-2`, so the grouping
now reads off a 3:1 ratio instead of a third line style.

**Not covered — needs your eyes:** the actual look at 1280×720 and 1920×1080 with 3–4
players, and whether the `#ff0000` player's 18%-wash active card reads as warm or as
alarming next to the `--ui-danger` hand-size ring.

---

# Card-selection token rollout — 2026-07-26

`CardToken` (`components/game/ui/CardToken.tsx`) is the shared face-up card control:
icon, held count, shoulder badge, optional corner "take one back". Adopted by the
trade composer and the robber discard.

## Done

- [x] Trade modal redesign (bank rows + domestic tally + inline receipt), backed by
      `lib/trade/bank-ratios.ts` — one ratio source for client and server.
- [x] Promote `TradeItemToken` → `components/game/ui/CardToken.tsx`; add
      `disabledReason` (hover explanation) and `badgeTone`
      (`muted`/`accent`/`good`/`bad`, since the same chip carries a port discount
      and a card you are throwing away).
- [x] Rebuild `DiscardModal` on it — 8 stepper cards → one token row; also retired
      its leftover `text-red-300` / `text-green-400` / `text-yellow-400` /
      `text-white` literals.
- [x] **Row geometry centralised after a real 4px bug.** The discard row shipped at
      `gap-3`: eight tokens need 8×68 + 7×12 = 628px against a 624px content box, so
      a full hand stranded one token on a second row. Fixed to 8px, and the numbers
      now live once in `CardToken.tsx` (`CARD_TOKEN_WIDTH/HEIGHT/GAP`,
      `MAX_CARD_TYPES`, `MODAL_LG_CONTENT_WIDTH`) behind a shared `<CardRow>` that
      both modals use. `CardToken.fit.test.tsx` fails if the arithmetic stops
      working. Lesson: per-consumer Tailwind spacing cannot express a constraint
      that spans consumers.
- [x] **Responsive harness:** `/dev/viewports` renders the real modals in iframes at
      320/390/768/1024 with a worst-case hand of all eight card types. Iframes give
      the components a genuine viewport (`dvh`, safe-area insets, media queries,
      wrapping) — jsdom has no layout engine and can never show this. Follows the
      existing `/dev/cards` convention; delete both routes freely if unwanted.

- [x] **Selector twins collapsed.** `ResourceSelector.tsx` + `CommoditySelector.tsx`
      → one `selectors/CardPicker.tsx`; both files deleted. The split existed only
      because each hard-coded its own icon component, and `CardToken` already picks
      the right face from the item id. `ProgressCardInteractionModal` now handles
      `select_resource` and `select_commodity` in one case arm.
- [x] **`CardTokenGroup` with roving tabindex.** Single-pick rows are a real
      `role="radiogroup"`: one tab stop, arrows move focus *and* selection with
      wraparound, Home/End jump to the ends, disabled cards are skipped. The role
      and the keyboard handling ship together — a `role="radio"` that ignores arrow
      keys promises a screen-reader user something that does not work.
- [x] **Two more Phase 4.5 leaks retired**, both invisible to the original sweep
      because they sit outside `components/game`: `InteractionBuilder.ts` built
      emoji maps (`🪵`/`🧱`/`📜`…) into an `InteractionOption.icon` field **no
      component has ever read** — builders, field, and helpers all deleted; and
      `ProgressCardInteractionModal`'s error box was raw `bg-red-900/30` with no
      `role="alert"`.
- [x] `/dev/viewports` gained a `picker` surface, and its frame became a server
      shell reading `searchParams` — previously the surface was chosen in a client
      effect, so every iframe rendered the discard modal first and swapped after
      hydration.

- [x] **`AqueductModal` + `CommercialHarborModal` on `CardTokenGroup`.** Both were
      hand-rolled `grid-cols-*` button walls; both are now keyboard-navigable
      radiogroups. The harbor keeps its two behaviours — auto-selecting when only
      one commodity is holdable, and the "no commodities, return the resource"
      branch — and arrowing now skips commodities you hold none of.
      - Aqueduct also **stopped swallowing failures**: a rejected claim un-pressed
        the button and said nothing. It now shows the server message
        (the §5.9 pattern already applied to trade).
      - Three more raw-palette leaks retired: the harbor's `bg-orange-900/30`
        notice and `bg-red-900/30` error, plus Aqueduct's new alert built on
        `--ui-danger` from the start.

- [x] **`DevCardModal`** — three hand-rolled grids gone. Monopoly is a
      `CardTokenGroup`; **Year of Plenty is now a tally of 2** instead of two
      independent single-picks, so "two ore" is one card clicked twice rather than
      setting the same control twice to say one thing. The `{resource1, resource2}`
      server contract is unchanged — the tally expands to it at submit
      (`devcard-service.ts:164` increments each independently, so duplicates were
      always legal).
      - **Behaviour change:** neither card is pre-selected any more, and the action
        button is disabled until the choice is complete. Previously Year of Plenty
        defaulted to wood+brick and Monopoly to ore, so a single stray click spent
        the card on resources nobody picked. The old test asserted exactly that
        default submitting; it now asserts the button is disabled instead.
      - **Layout fix:** the picker had to leave the `grid-cols-[72px_1fr]` column
        beside the card face — five tokens need 372px and that column is 308px.
        Card face and blurb stay side by side; anything you *pick* is full-width
        below.
      - Five more palette literals retired (`text-emerald-300`, `text-blue-300`,
        the `bg-amber-900/40` warning, the `bg-red-900/30` error).

- [x] **`GuildSelectionList.tsx`** — the last `±` stepper is gone; both consumers
      (`WeddingGiftModal`, `GuildDuesModal`) got the token row without either
      submit path changing. The composite `type:value` key was **kept on purpose**:
      the card kind is derivable from the value, but both callers decode that key
      when building payloads, so changing it would ripple into two submit paths for
      no user-visible gain.
      - New `intent` prop (`give` | `take`). Same tally, opposite meaning: Wedding
        hands *your* cards away (red `−N`, count trending down), Guild Dues takes
        from an *opponent's* hand (green `+N`, trending up). The old component
        rendered both identically.
      - Five more palette literals retired across the two consumers.

- [x] **Display-only surfaces.** `DealSide` left `TradeModal` and became
      `CardTally` in `CardToken.tsx`, alongside `cardCountsFrom()` which folds the
      engine's split resource/commodity records into one map. Adopted by
      `TradeOfferDisplay`, `TradeCompletedNotification`, and — found during the
      sweep, not on the original list — `TradeProgressModal`, which had a *fourth*
      copy of `TRADE_ITEM_LABELS` + icon dispatcher + `formatItems`.
      - `DealConsistency.test.tsx` compares the rendered strings **across**
        surfaces rather than against literals, so the assertion is the consistency
        itself: what the recipient sees and what the receipt says are the same text.
      - **`RobberTheftNotification` is only a partial fit, deliberately.**
        `TheftItem` includes `progress_card` (Espionage), which has no card face.
        It delegates the resource/commodity cases to `CardIcon` and keeps its own
        branch for the third kind — better than teaching `CardTally` about a
        concept it has no business knowing.

## Rollout complete

Every card-selection and card-display surface in the game now goes through
`CardToken` / `CardTokenGroup` / `CardTally`. Four independent `±` steppers, four
"pick one" grids, and four chip layouts became one component family. There is now
exactly one `isCommodity` predicate, one `CARD_LABELS` map, and one place that
decides how a resource icon is chosen.

Remaining direct `TabletopResourceIcon` uses are single fixed icons in build costs
("2 wheat"), not dispatchers — those are correct as they are.

**Not candidates:** `RobberVictimSelectionModal` picks a *player* (the stolen card is
random, chosen by the engine); `ProgressCardDiscardDialog` and `KnightSelector` use
different atoms (`ProgressCardFace`, knight pieces).

## Open work — raw Tailwind palette literals (surveyed 2026-07-26)

**Status:** not started. Independent of the card-token rollout; pick up any time.

### Why this exists

Phase 4.5's acceptance criterion was `rg "slate-" components/game` → 0, and that still
holds. But **no gate ever checked the rest of the palette**, so literals accumulated
while the criterion read green. An earlier note in this file said "~55 hits across 17
files" — that was measured with a regex missing `amber`, `emerald`, opacity suffixes
(`/30`), and `ring-`/`from-`/`to-`. The corrected survey:

**157 hits across 24 files.** By family: amber 57, red 44, blue 22, emerald 16,
yellow 4, orange 4, green 3, and 7 stragglers (pink/cyan/teal/purple/lime).

Reproduce with:

```
rg -noE "(bg|text|border|from|to|via|ring|divide)-(red|orange|green|yellow|blue|emerald|amber|purple|pink|indigo|teal|cyan|lime)-[0-9]+(/[0-9]+)?"    components/game --glob '!**/__tests__/**'
```

### This is three jobs, not one

**A — mechanical token swaps (~100 hits, 15 files). ~1 batch, low risk.**
Error boxes, warning notices, semantic text. The exact idiom already replaced by hand
six times during the card-token rollout, so the target form is settled:

```tsx
// before
className="p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm"
// after
role="alert"
className="flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2 text-sm text-[var(--ui-text)]"
```

Mapping: `red-*` → `--ui-danger`; `emerald-*`/`green-*` → `--ui-success`;
`amber-*`/`yellow-*` warnings → `--ui-accent` at 12% mix; `blue-*` informational →
`--ui-accent`. Several also want a `role="alert"` they never had.

**B — selection states that should not be tokens at all (~25 hits, 3 files).
~1 batch, medium risk — needs a visual pass.**
`bg-blue-600 text-white ring-2 ring-blue-400` appears 5× in `BuildControls.tsx` alone,
plus `EspionageModal.tsx`. The right fix is not a colour swap: it is
`tabletopOptionClass(selected, disabled)` from `components/game/ui/TabletopModal.tsx`,
which already encodes selected/disabled/hover and is what every migrated surface uses.
This changes how the build tray *looks*, so add a `/dev/viewports` surface for it and
get eyes on it before merging.

**C — decorative, and deliberately exempt (32 hits, mostly `GameOverModal.tsx`).**
These are victory-screen effects, not semantics:

```
bg-amber-400/20 blur-3xl                          ← ambient glow
bg-gradient-to-br from-amber-400 to-pink-500      ← celebration burst
bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500
text-amber-100 drop-shadow                        ← winner nameplate
```

Nothing here is danger or success, and `--ui-*` has no "celebration gradient".
Converting them mechanically would flatten the one intentionally loud screen in the
game into brass-on-brown. **Decide the victory-screen palette first, or exempt it
permanently** — do not sweep it.

### Suggested gate once A and B are done

Add alongside the slate check, with the decorative file exempted:

```
rg -oE "(bg|text|border|ring|from|to|via)-(red|amber|emerald|blue|green|yellow|orange)-[0-9]+"    components/game --glob '!**/__tests__/**' --glob '!**/GameOverModal.tsx'
```

### Per-file counts (highest first)

```
25 modals/GameOverModal.tsx          ← category C, exempt
12 ui/ActionControls.tsx             10 progress/modals/EspionageModal.tsx    (B + A)
10 progress/TreasonPlacementModal.tsx    10 modals/WaitingOverlay.tsx
10 city/BuildControls.tsx            ← category B
 8 player/PlayerHand.tsx              7 progress/modals/OpponentConfirmationModal.tsx
 6 ui/CompactGameStatus.tsx           6 progress/modals/AlchemyModal.tsx
 6 progress/TaxationPlacementModal.tsx   6 progress/ProgressCardDiscardDialog.tsx
 6 progress/MerchantPlacementModal.tsx   5 ui/ChatPanel.tsx
 5 progress/modals/ProductionConfirmationModal.tsx  5 progress/ProgressCardPrompts.tsx
 5 GameController.tsx                 3 progress/modals/ProgressCardDialog.tsx
 3 progress/ProgressCardHand.tsx      3 progress/CommercialHarborInitiatorDialog.tsx
 2 player/ProgressHandView.tsx        2 overlays/GameOverOverlay.tsx
 1 player/PlayerDevCards.tsx          1 player/CompactImprovementBar.tsx
```

**Recommended order:** A first (safe, unblocks the gate), then B behind a visual pass,
then leave C alone until the victory screen gets a deliberate design decision.

## Unrelated flaky test found and fixed (2026-07-26)

`core/engine/progress/__tests__/progress-card-manager.test.ts` → "lazily creates
missing legacy decks before drawing" failed **~1 run in 18**, and it had nothing to do
with the card-token work — it surfaced during a routine full-suite run.

The science deck holds exactly one `printer` among 18 cards, `createProgressDecks()`
shuffles (`progress-card-definitions.ts:287`), and `drawProgressCard` auto-plays VP
cards into `revealedVPCards` instead of the hand. The test asserted only
`progressCards).toContain(card)`, so it failed whenever the shuffle put `printer` on
top. Now branches on the card being a VP card. Confirmed by forcing a `printer`-only
deck, then 25 consecutive clean runs of the file.

**Worth noting:** any other test that draws from a shuffled deck and asserts on the
hand has the same latent hole.
