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

## Tasks

-   Settlement/road hotspots
-   Placement validation
-   Snake order logic
-   Initial resource distribution

------------------------------------------------------------------------

# PHASE 5 --- CORE TURN LOOP

## Tasks

-   Dice roll (crypto secure)
-   Resource production
-   Robber logic
-   Event log

------------------------------------------------------------------------

# PHASE 6 --- BUILDING SYSTEM

## Tasks

-   Road/settlement/city building rules
-   Costs + VP update
-   Themed structure rendering

------------------------------------------------------------------------

# PHASE 7 --- TRADE SYSTEM

## Tasks

-   Bank trades
-   Player trades
-   Port rules

------------------------------------------------------------------------

# PHASE 8 --- DEVELOPMENT CARDS

## Tasks

-   Dev deck
-   Card effects
-   Largest Army / Longest Road

------------------------------------------------------------------------

# PHASE 9 --- ENDGAME

## Tasks

-   Victory detection
-   Endgame summary
-   Lock UI

------------------------------------------------------------------------

# PHASE 10 --- POLISH & UX IMPROVEMENTS

## Tasks

-   Animations
-   Haptics
-   Reconnect/resync
-   Sound design

------------------------------------------------------------------------

# PHASE 11 --- OPTIONAL EXPANSIONS

## Ideas

-   AI Bots
-   Fog of War
-   Campaign mode
-   Custom maps

------------------------------------------------------------------------

# END OF DOCUMENT
