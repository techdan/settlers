# Settlers of Lanc -- Updated Phased Implementation Plan (Flat First, Voxel Second, Env Setup Later)

This phased plan reflects the updated workflow: - **No initial setup
required.** - **First deliverable: two working local game boards**
(flat + voxel). - **Environment/database setup happens *after* these
visual phases.**

------------------------------------------------------------------------

# PHASE 1 --- Modern Flat Theme Game Board (Immediate Priority)

**Goal:**\
Render a complete Settlers of Lanc board using the **Modern Flat
Minimalist Theme**, with no backend dependencies.

**Requirements:** - Runs locally in-browser - No Supabase - No
networking - No environment variables

**Tasks:** - Implement axial hex coordinate system (q, r) - Implement
axial → pixel projection - Implement deterministic Catan-style 19-hex
map generator - Implement `<HexTile />` (flat theme) - Implement
`<Board />` - Render: - Large flat hexes (\~90px radius) - Resource
icons (SVG) - Number tokens - Robber marker - Add pinch-to-zoom and
panning - Place result under:\
`app/board/flat/page.tsx`

**Deliverables:** - Fully interactive flat-theme board in standalone
Next.js page

**Acceptance Criteria:** - Icons, numbers, robber all fit and display
correctly - Loads instantly, fully local-only

------------------------------------------------------------------------

# PHASE 2 --- Voxel Theme + Theme Selector (Immediate, After Phase 1)

**Goal:**\
Add voxel-style board rendering plus a UI toggle for selecting `"flat"`
vs `"voxel"` themes.

**Requirements:** - Still no backend - Still fully local rendering

**Tasks:** \### 2.1 Voxel Rendering - Implement voxel-style hex (top
face + side shading) - Create voxel icon set - Create voxel-style number
tokens - Create voxel-style robber - Place assets under `/themes/voxel`

### 2.2 Unified Renderer

-   Refactor `<HexTile />` to accept a `theme` prop
-   Ensure tile spacing is identical in both themes

### 2.3 Theme Store + Toggle

-   State: `theme = "flat" | "voxel"`
-   Store in Zustand or context
-   Theme switcher UI component
-   Live swapping with no reload

**Deliverables:** - `app/board/voxel/page.tsx` - Optional unified page
with theme toggle

**Acceptance Criteria:** - One-click theme switching - Both boards
visually correct

------------------------------------------------------------------------

# PHASE 0.2 --- Environment Setup (After Phases 1 & 2)

**Goal:**\
Only after both visual boards work, set up the real project environment.

**Includes:** - Repository structure cleanup - Supabase configuration -
Database schema creation - Environment variable wiring -
CI/config/tooling - Global React providers - Supabase client wrapper

**Tasks:** - Set up Supabase project (auth optional) - Install
dependencies cleanly - Add `.env.local.example` - Add project-wide
linting/formatting - Prepare server actions or edge functions for next
phases

**Deliverables:** - Fully configured repo - Ready for multiplayer + game
logic

**Acceptance Criteria:** - Both board pages still load correctly -
Environment setup does NOT break rendering

------------------------------------------------------------------------

# PHASE 3 --- Room System & Multiplayer Lobby

**Goal:**\
Implement room creation / join / presence after visuals + environment
are in place.

**Tasks:** - Supabase tables - `createRoom`, `joinRoom`, `leaveRoom` -
Realtime presence subscription - Lobby UI (player list, color picker,
start game)

**Deliverables:** - Full multiplayer lobby

------------------------------------------------------------------------

# PHASE 4 --- Initial Placement Phase

**Goal:**\
Implement snake-order setup logic.

**Tasks:** - Settlement/road hotspot mapping - Placement validation -
Initial resource distribution

------------------------------------------------------------------------

# PHASE 5 --- Core Turn Loop (Dice + Production)

------------------------------------------------------------------------

# PHASE 6 --- Building System (Roads, Settlements, Cities)

------------------------------------------------------------------------

# PHASE 7 --- Trade System (Bank + Player)

------------------------------------------------------------------------

# PHASE 8 --- Development Cards

------------------------------------------------------------------------

# PHASE 9 --- Endgame & Victory Logic

------------------------------------------------------------------------

# PHASE 10 --- Polish & UX Enhancements

------------------------------------------------------------------------

# PHASE 11 --- Optional Expansions

------------------------------------------------------------------------

# Agent Execution Instructions

When used with an AI coding agent, instruct it to:

1.  **Start with Phase 1**\
2.  After completing Phase 1, stop and ask:\
    \> *"Phase 1 complete. Should I begin Phase 2?"*\
3.  After Phase 2, stop and ask:\
    \> *"Phase 2 complete. Should I begin Phase 0.2?"*\
4.  Continue through phases only with explicit user confirmation\
5.  Follow `AGENTS.md` rules\
6.  Never skip or merge phases\
7.  Automatically install any local dependencies required for rendering

------------------------------------------------------------------------

# END OF DOCUMENT
