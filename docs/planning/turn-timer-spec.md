# Turn Timer Specification (Lobby-Configured)

## Goals

- Limit the amount of time a player can spend actively taking their turn.
- Preserve the current “stop anytime, resume days later” workflow.
- Track total gameplay time as the sum of players’ active turn times (excluding between-turn time).
- Avoid auto-resolving player decisions on timeout; players retain full control.
- Prevent “next turn starts” until all outstanding obligations are resolved (global gating on `Roll Dice`).

Non-goals (v1):
- No real-time “host moderation” tools (kick, admin extend others, etc.).
- No authentication assumptions (room is still ephemeral).

## Lobby Configuration

Timer settings are configured in the lobby before `Start Game` when the timer feature is enabled.

### Turn Time Presets

- Presets: `60s`, `90s`, `120s`, `180s` (default), `300s`, `Custom`.
- Default: `180s`.

### Extension / Time Bank Defaults

- Per-player time bank (per game): `300s` (5 minutes).
- Extension increment button: `+60s`.
- Maximum extensions per turn: `2`.
- Maximum extra time per turn: `180s`.

### Enablement

- Timer is opt-in per room in the lobby.
- If disabled, all timer UI is hidden and no timing rules apply.

## Turn Timing Model (Behavior)

### When Turn Time Runs

- Turn timer **starts** when the active player clicks `Roll Dice`.
- Turn timer **stops** when the active player successfully clicks `End Turn`.
- The game is treated as **paused between turns**:
  - From `End Turn` → next player’s `Roll Dice`.
  - This time is excluded from all timing totals.
  - This is the primary “pause/resume” mechanic: players can stop after `End Turn` and resume later without any timer loss.

### Total Gameplay Time

- Total Gameplay Time = **sum of all players’ recorded turn time** (i.e., total time between each `Roll Dice` and `End Turn`, per turn, per player).
- Display:
  - Stats panel: Total Gameplay Time.
  - Player cards: each player’s “Time Played” total.

## Global Gating Rule (Blocking `Roll Dice`)

### Rule

A player cannot click `Roll Dice` if there are **any unresolved obligations**, even if those obligations belong to other players.

### UX on Blocked Roll

If the rolling player attempts `Roll Dice` while blocked:

- The rolling player sees a notification over the game board:
  - `Waiting on: <Player A>, <Player B>…`
- Each blocking player receives a notification:
  - `Everyone is waiting on you to finish: <Obligation summary>`

Any clickable elements (buttons, action links) use a pointer cursor.

## Obligation Classes (Dependency Rules)

### Terminology

- **Obligation**: a required player action that must be completed to allow the game to advance (at minimum, to allow the next `Roll Dice`).
- **Dependency**: an obligation that can change the current player’s available decisions/outcomes *right now*.

### General Rule

- If another player’s obligation creates **no meaningful dependency** on the current player’s current decisions, it should run **asynchronously**:
  - It does not pause or disrupt the current player’s turn.
  - It still blocks the next `Roll Dice` globally until resolved.
- If an obligation is a **dependency**, it blocks the current player only at the specific decision point that depends on it.

## List of Blocking Obligations (and Handling)

The following obligations must be considered “unresolved obligations” for the global `Roll Dice` gate.

Each item below also specifies whether it is a dependency on the current player’s decisions (and therefore blocks some in-turn step), or is fully async.

### 1) Robber Discard After Rolling a 7 (Dependency)

- Trigger: a 7 is rolled and one or more players must discard.
- Who must act: each player above the discard threshold.
- Handling:
  - This obligation is a **dependency** for robber placement + stealing.
  - The current player **cannot place the robber or steal** until all required discards are completed.
  - Discarding itself is not treated as a “pause”; it should not stop the current player’s timer.
  - After discards resolve, the current player continues to robber placement/steal as normal.
- Global gate: blocks any `Roll Dice` until complete.
- UX: notify discarding players that “everyone is waiting”, since it blocks progress.

### 2) Sabotage-Style Discard (Async)

- Trigger: effects that force one or more target players to discard/select cards, where the outcome does not change the current player’s immediate decision tree.
- Who must act: the targeted player(s).
- Handling:
  - Fully **async**: does not pause or disrupt the current player’s turn.
  - The current player may continue taking normal turn actions.
  - The obligation must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 3) Aqueduct / “Choose a Resource” / “Gain a Card” Prompts (Async)

- Trigger: prompts that require a player to choose a resource/commodity/card gain, where it does not affect the current player’s immediate decisions.
- Who must act: each eligible player.
- Handling:
  - Fully **async**: does not pause or disrupt the current player’s turn.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 4) Commercial Harbor Responses (Async)

- Trigger: players must respond with a commodity choice / no-trade response.
- Who must act: each receiving player with an outstanding response.
- Handling:
  - **Async** for current turn flow.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 5) Wedding Gifts / Opponent Selections (Async)

- Trigger: players must provide required gifts/selections.
- Who must act: the requested players.
- Handling:
  - **Async** for current turn flow.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 6) Barbarian “Choose City to Lose” (Async)

- Trigger: barbarian attack causes one or more players to lose a city and requires them to choose which city.
- Who must act: each victim player.
- Handling:
  - Explicitly **async**: another player’s city choice has no meaningful impact on the current player’s decisions.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 7) Knight Displacement Resolution (Async by Default)

- Trigger: a displaced player must move/remove a knight due to displacement rules.
- Who must act: the displaced player.
- Handling:
  - Default **async**: does not pause or disrupt the current player’s turn unless the displacement rules create a direct dependency (rare).
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 8) Defender Card Draws / Tied Defender Prompts (Async)

- Trigger: multiple players must draw/resolve defender progress card draws.
- Who must act: listed players.
- Handling:
  - **Async**.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

### 9) Treason (and Similar Multi-Stage Effects) Prompts (Classify Per Stage)

- Trigger: multi-stage effect sequences requiring the target to choose a knight, then choose placement (or similar).
- Who must act: target player and/or initiator depending on stage.
- Handling:
  - Default **async** unless the current player’s next required step depends on the outcome.
  - Must be resolved before the next `Roll Dice` globally.
- Global gate: blocks any `Roll Dice` until complete.

## Timeout Behavior (No Auto-Resolve)

### Rule

When the active player’s turn timer reaches 0, the turn enters **Timed Out (Locked)**.

### Locked State Effects

- The timed-out player cannot initiate **new optional gameplay actions** (build, trade, play optional cards, etc.).
- The timed-out player **can** complete any **required** steps that are necessary to legally end the turn (e.g., robber placement + stealing after a 7 once discards are complete).
- Other players can complete their own obligations as usual.
- Once the game reaches a legally endable state, the timed-out player may `End Turn`.

No discards, choices, steals, or other decisions are auto-executed by the system.

## Extensions / Time Bank (Including Refund of Unused Borrowed Time)

### Requesting More Time

- The active player can request `+60s` (consuming from their time bank), subject to lobby caps.

### Refund Rule

Borrowed time is only “spent” if it is actually used.

Example:
- Turn timer is 180s.
- Player requests `+60s` (bank −60).
- Player ends their turn with 50s still remaining past the original 180s baseline.
- Refund 50s to the bank (net cost = 10s).

### Constraints

- A player cannot exceed `maxExtensionsPerTurn` or `maxExtraSecondsPerTurn`.
- If a player has insufficient bank remaining, the request is rejected (no voting flow in v1).

## Timeout Enforcement (Client-Side Optimistic)

### Implementation Approach

- **Client-side calculation**: Timer countdown is calculated in real-time on each client using `(Date.now() - turnStartTime)`.
- **Optimistic locking**: When timer reaches 0, client immediately shows locked state UI (disabled buttons, warning banner) without waiting for server confirmation.
- **Server lazy enforcement**: The `timerLocked` flag is set server-side when the player attempts any action after timeout.
- **Check-on-action**: Every game action checks `checkTimeout(gameState)` before executing and sets `timerLocked` if expired.
- **No background cron**: Timer enforcement happens naturally when players interact with the game.

### UX Behavior

When the timer reaches 0:
1. Client immediately disables all optional action buttons (build, trade, dev cards)
2. Timer displays `0:00` in red with pulsing animation
3. "Time expired" warning banner appears
4. "End Turn" button remains enabled (required action)
5. If player attempts an optional action, server rejects with "Turn time expired" error
6. When player clicks "End Turn", turn ends normally and next player's turn begins

This approach provides identical UX to a background cron job while being simpler and working on all deployment tiers.

## UI Requirements (High Level)

- Lobby: timer preset selector + time bank settings.
- In-game:
  - **All players** see active player's countdown timer (not just the active player).
  - Timer shows warning colors: green → yellow (60s) → orange (30s) → red pulsing (10s).
  - Each player card shows total "Time Played" and remaining time bank.
  - Extension request button shows confirmation tooltip with bank balance.
  - Stats panel shows Total Gameplay Time.
  - When `Roll Dice` is blocked, show the over-board "Waiting on…" message and notify the blocking player(s).

