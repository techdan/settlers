# Settlers of Lanc -- Updated Phased Implementation Plan (Voxel Theme in Phase 2)

This implementation plan integrates the new requirement: **Phase 2 now
includes voxel-style board rendering + theme selector**, directly after
the modern flat board rendering.

------------------------------------------------------------------------

# PHASE 0 --- FOUNDATION & PROJECT SETUP

**Goal:** Establish repo structure, tooling, and base configuration.

## Tasks

-   Create repo structure (`/app`, `/engine`, `/themes`)
-   Initialize Next.js (App Router)
-   Install Tailwind, shadcn-ui
-   Install Supabase JS client
-   Configure TS strict mode + ESLint
-   Setup `.env`, Supabase project, and environment bindings
-   Add SVG helpers and hex coordinate utilities
-   Setup base state models and placeholder UI

## Deliverables

-   Running Next.js project
-   Connected Supabase backend
-   Base file/folder layout

## Acceptance Criteria

-   App builds and runs locally
-   Supabase connectivity confirmed

------------------------------------------------------------------------

# PHASE 1 --- BOARD GENERATION & MODERN FLAT SVG RENDERING

**Goal:** Render full board using the baseline "Modern Flat Minimalist"
theme.\
This ensures the coordinate system, board sizing, and tile spacing are
correct before introducing voxel complexity.

## Tasks

-   Implement axial (q, r) hex coordinate system
-   Implement axial → pixel conversion
-   Implement deterministic 19-hex board generator
-   Create `<HexTile />` component (flat theme)
-   Render:
    -   Flat terrain colors
    -   Flat SVG icons
    -   Number tokens
    -   Robber marker
    -   Large hex geometry (radius \~90px)
-   Add pinch-to-zoom and panning
-   Validate board positioning/responsiveness

## Deliverables

-   Fully rendered, functional board (flat theme)
-   Board generator + rules for tile positions

## Acceptance Criteria

-   All tiles render clearly with icon + number token + robber space
-   Works on mobile + desktop
-   Flat theme becomes the "baseline theme"

------------------------------------------------------------------------

# PHASE 2 --- VOXEL THEME + THEME SELECTOR (Updated)

**Goal:** Add voxel-style board rendering and implement a user theme
toggle between:\
- **Flat Theme**\
- **Voxel Theme**

This phase brings visual parity: both themes render the board
identically in structure, differing only in style.

## Tasks

### 2.1 Voxel Tile Rendering

-   Create voxel-style hexes:
    -   Large isometric top face
    -   Left and right shaded faces
    -   Voxel-style textures or flat-shaded faces
-   Add voxel-style:
    -   Resource icons
    -   Number tokens (blocky style optional)
    -   Robber marker (voxel-style mini figure)

### 2.2 Unified Board Renderer

-   Refactor `<HexTile />` to accept a `theme` prop:
    -   `"flat"` → modern flat minimalist
    -   `"voxel"` → voxel isometric theme
-   Adjust placement so icon/token/robber all fit comfortably

### 2.3 Theme State Management

-   Implement theme store:

    ``` ts
    type ThemeMode = "flat" | "voxel";
    ```

-   Provide context or Zustand store:\
    `useThemeStore()`

-   Allow live theme switching without reload

-   Persist theme choice in localStorage or URL param

### 2.4 UI Toggle

-   Add theme selector to:
    -   Player settings panel\
    -   Or floating toggle button\
-   Smoothly update board upon theme change

## Deliverables

-   Voxel-rendered board (full 19-hex map)
-   Live theme toggling system
-   All board elements (tiles, icons, tokens, robber) themed

## Acceptance Criteria

-   Switching themes instantly re-renders the board
-   Board styles match the GDD's visual definitions
-   Tile spacing identical across both themes
-   No logic changes required for theme switching
-   Voxel theme visually distinct and complete

------------------------------------------------------------------------

# PHASE 3 --- ROOM SYSTEM & MULTIPLAYER LOBBY

**Goal:** Build the multiplayer room system after verifying that both
visual themes render correctly.

## Tasks

-   Supabase tables for rooms & presence
-   Implement `createRoom`, `joinRoom`, `leaveRoom`
-   Realtime player list updates
-   Lobby UI:
    -   Player list
    -   Color selection
    -   Room code display
    -   "Start Game"
-   Transition to setup phase

## Deliverables

-   Room creation & join flow
-   Fully synchronized lobby

## Acceptance Criteria

-   Multiple devices join same room
-   Host can start the game
-   Board loads correctly in chosen theme

------------------------------------------------------------------------

# PHASE 4 --- INITIAL SETTLEMENT PLACEMENT

**Goal:** Implement the "Snake Order" setup phase where players place their first two settlements and roads.

## Architecture & State Machine

-   **Game Phases:**
    -   `setup_round_1`: Players 1 -> N place 1 settlement + 1 road.
    -   `setup_round_2`: Players N -> 1 place 1 settlement + 1 road.
    -   Transition to `main_game` after Player 1 places second set.

-   **Server Actions:**
    -   `placeSettlement(vertexId)`:
        -   Validates: `isValidSetupPlacement` (distance rule > 1 edge away from any other building).
        -   Updates: `gameState.board.vertices`, `gameState.players[p].settlementsRemaining`, `gameState.players[p].victoryPoints`.
    -   `placeRoad(edgeId)`:
        -   Validates: Must connect to the just-placed settlement.
        -   Updates: `gameState.board.edges`.
    -   `endTurn()`:
        -   Calculates next player based on snake order logic.
        -   If Round 2 ends, distributes initial resources based on 2nd settlement's adjacent hexes.

## Tasks

-   [x] Implement `isValidSetupPlacement` logic (Distance Rule).
-   [x] Implement `placeSettlement` action for Setup Phase (free cost).
-   [x] Implement `placeRoad` action for Setup Phase (must connect to last placed settlement).
-   [x] Implement Snake Order turn switching.
-   [x] Implement Initial Resource Distribution (Round 2 logic).

------------------------------------------------------------------------

# PHASE 5 --- CORE TURN LOOP

**Goal:** Implement the main game loop: Roll Dice -> Trade -> Build.

## Architecture

-   **Turn State (`gameState.turnPhase`):**
    -   `waiting_for_roll`: Only valid action is `rollDice`.
    -   `main_phase`: Can trade, build, play dev cards, or end turn.
    -   `discarding`: If 7 is rolled and players have >7 cards.
    -   `robber_placement`: Active player must move robber.
    -   `stealing`: Active player picks a victim.

-   **Server Actions:**
    -   `rollDice()`:
        -   Uses `crypto.randomInt` for secure RNG.
        -   If != 7: Calls `distributeResources(roll)`.
        -   If == 7: Triggers `discarding` or `robber_placement`.
    -   `endTurn()`:
        -   Passes turn to `(currentIndex + 1) % numPlayers`.
        -   Resets per-turn flags (e.g., `hasPlayedDevCard`).

## Tasks

- [x] Implement `rollDice` server action (RNG, resource distribution)
- [x] Implement `endTurn` rotation
- [x] Implement Robber logic (discarding, moving, stealing)
- [x] Wire up UI for Dice Roll and Turn Controls
- [x] Implement `PlayerHand` and `GameLog` UI

------------------------------------------------------------------------

# PHASE 6 --- BUILDING SYSTEM (Completed)

**Goal:** Allow players to build roads, settlements, and cities during the main phase.

## Architecture

-   **Validation Logic:**
    -   **Road:** Must connect to own road or settlement/city. Not through opponent settlement.
    -   **Settlement:** Distance rule (no neighbors). Must connect to own road.
    -   **City:** Must replace own settlement.

-   **Server Actions:**
    -   `buildStructure(type, location)`:
        -   Checks resources:
            -   Road: 1 Brick, 1 Wood
            -   Settlement: 1 Brick, 1 Wood, 1 Sheep, 1 Wheat
            -   City: 3 Ore, 2 Wheat
        -   Deducts resources.
        -   Updates board state.
        -   Recalculates Longest Road (DFS/BFS on road network).

## Tasks

-   [x] Implement resource cost deduction.
-   [x] Implement `isValidBuildPlacement` for Main Phase.
-   [x] Implement City upgrade logic.
-   [x] Implement Longest Road algorithm.

------------------------------------------------------------------------

# PHASE 7 --- TRADE SYSTEM (Completed)

**Goal:** Enable resource exchange between players and with the bank.

## Architecture

-   **Bank Trade:**
    -   Action: `tradeWithBank(give: Resource, get: Resource)`.
    -   Logic: Checks for 2:1 or 3:1 ports. Default 4:1.

-   **Player Trade:**
    -   State: `gameState.tradeOffer` (nullable).
    -   Actions:
        -   `offerTrade(offer, request)`: Broadcasts to room.
        -   `acceptTrade(tradeId)`: Executes transfer.
        -   `cancelTrade(tradeId)`: Closes offer.

## Tasks

-   [x] Implement Port detection for Bank Trades.
-   [x] Implement Player Trade UI (Offer/Request selector).
-   [x] Implement atomic resource swap transaction.

------------------------------------------------------------------------

# PHASE 8 --- DEVELOPMENT CARDS (Completed)

**Goal:** Implement the Development Card deck and effects.

## Architecture

-   **State:**
    -   `gameState.devCardDeck`: Array of card types (shuffled).
    -   `player.devCards`: Hidden from others.
    -   `player.playedDevCards`: Visible (Knights, etc.).

-   **Card Types:**
    -   Knight (14): Move robber.
    -   Victory Point (5): +1 VP (hidden until end).
    -   Road Building (2): 2 free roads.
    -   Year of Plenty (2): 2 free resources.
    -   Monopoly (2): Steal all of one type.

-   **Rules:**
    -   Max 1 play per turn.
    -   Cannot play turn it was bought (unless VP).

## Tasks

-   [x] Implement `buyDevCard` action.
-   [x] Implement `playDevCard` action with specific logic for each type.
-   [ ] Implement Largest Army tracking (>2 knights).

------------------------------------------------------------------------

# PHASE 9 --- ENDGAME

**Goal:** Detect victory conditions and handle game completion.

## Architecture

-   **Win Condition:**
    -   Check `player.victoryPoints` >= 10 at end of every action.
    -   VPs = Settlements (1) + Cities (2) + Longest Road (2) + Largest Army (2) + VP Cards.

-   **Game Over State:**
    -   `gameState.phase = 'game_over'`.
    -   `gameState.winner = playerId`.
    -   Lock all actions except "Return to Lobby".

## Tasks

-   [ ] Implement `checkWinCondition` helper.
-   [ ] Create Game Over modal/screen.

------------------------------------------------------------------------

# PHASE 10 --- POLISH & UX IMPROVEMENTS

**Goal:** Enhance the "Game Feel" and usability.

## Tasks

-   [ ] **Animations:**
    -   Dice roll animation (3D or sprite).
    -   Resource card fly-in/out.
    -   Building placement "plop" effect.
-   [ ] **Sound Design:**
    -   Click, Build, Dice, Turn Notification sounds.
-   [ ] **Reconnect/Resync:**
    -   Handle stale state gracefully.
    -   Toast notifications for game events.

------------------------------------------------------------------------

# PHASE 11 --- OPTIONAL EXPANSIONS

## Ideas

-   AI Bots (Simple heuristics).
-   Fog of War (Hexes revealed on exploration).
-   Campaign mode (Persistent stats).
-   Custom maps (Map editor).

------------------------------------------------------------------------

# END OF DOCUMENT
