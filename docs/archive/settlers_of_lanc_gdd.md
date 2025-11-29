# Settlers of Lanc -- Game Design Document (Updated with Ports)

This is the full GDD including the newly added **Ports Specification**,
aligned with: - Modern Flat Theme - Voxel Theme - Theme selector -
Updated Phased Plan (Flat Board → Voxel Board → Env Setup)

------------------------------------------------------------------------

# 1. High‑Level Summary

Settlers of Lanc is a Catan‑inspired multiplayer strategy game. Players
interact with a synced board and private hands. Visual rendering comes
first (flat + voxel), backend later.

------------------------------------------------------------------------

# 2. Platform & Tech Requirements

-   **Frontend:** Next.js, React, Tailwind, shadcn
-   **Rendering:** React + SVG
-   **Backend:** Supabase (added in Phase 0.2)
-   **State:** Server‑authoritative
-   **No backend required** for Phase 1 & 2 board rendering.

------------------------------------------------------------------------

# 3. Rendering Engine and Visual Specification

## 3.1 Rendering Engine

**React + SVG** (chosen for clarity, simplicity, and agent-friendliness)

## 3.2 Themes

-   **Modern Flat Minimalist** (primary)
-   **Voxel Isometric Theme** (secondary)
-   **Theme selector** allows runtime switching

------------------------------------------------------------------------

# 4. Hex Grid Layout & Coordinates

-   Axial coordinates (q, r)
-   Axial → Pixel conversion
-   Catan-style 3--4--5--4--3 map
-   Large hex tiles (\~90px radius)

------------------------------------------------------------------------

# 5. Terrain Styles

## 5.1 Flat Theme Colors

-   Ironstone: `#b7410e`
-   Timberwood: `#2e8b57`
-   Wool: `#c3e671`
-   Wheat: `#f5d061`
-   Ore: `#9ea7b8`
-   Dustlands: `#e0d3c2`

## 5.2 Flat Icons

Simple line-icons representing resources.

## 5.3 Voxel Theme

Voxel-style: - top face - side shading (left/right) - voxel resource
icons - voxel tokens - voxel robber

------------------------------------------------------------------------

# 6. Robber

-   Represented as:
    -   Flat theme: black circle with symbol
    -   Voxel theme: blocky shaded marker
-   Positioned on tile center
-   Starts on Dustlands

------------------------------------------------------------------------

# 7. Ports Specification (UPDATED)

## 7.1 Port Purpose

Ports allow improved trade rates: - **3:1 Generic Port** - **2:1
Resource Ports**: - Timberwood - Ironstone - Feldon Wool - Wheat -
Arcsteel Ore

## 7.2 Port Placement

Standardized Catan port layout: - Around outer ring of hexes - Nine port
locations (edges between outer hexes) - Each port assigned: - Edge
midpoint (pixel) - Orientation angle (points inward)

Deterministic generation required so all players see identical maps.

## 7.3 Port Data Model

``` ts
export type PortType = 
  | "generic" 
  | "timberwood"
  | "ironstone"
  | "wool"
  | "wheat"
  | "ore";

export interface Port {
  id: string;
  type: PortType;
  position: { x: number; y: number };
  angle: number; // facing center
}
```

## 7.4 Port Rendering

### Flat Theme Port Rendering

-   Triangular wedge pointing toward center
-   Minimal flat shading
-   Resource icon centered
-   Black outline
-   Scales proportionally with hex radius

### Voxel Theme Port Rendering

-   Triangular prism (top + left/right shaded faces)
-   Voxel resource icon
-   Consistent voxel lighting

## 7.5 Integration

Ports appear: - Required in Phase 2 flat and voxel boards - Included in
`<Board />` render pipeline - Styled through theme-based components

Interaction (trading) added later in Phase 6.

------------------------------------------------------------------------

# 8. Game Rules (Catan-compatible)

Players gather resources, build, trade, use ports, move robber. Victory
at 10 VP.

------------------------------------------------------------------------

# 9. UI Layout & Interactions

-   Mobile-first UI
-   Pan/zoom board
-   Tap vertices & edges (later phases)
-   Theme toggle for flat ↔ voxel

------------------------------------------------------------------------

# 10. Data Models

Includes: - HexTile - Vertex / Edge - PlayerState - GameState - **Port
(new)**

------------------------------------------------------------------------

# 11. Phased Implementation Plan (Short Version)

1.  **Phase 1:** Flat theme board\
2.  **Phase 2:** Voxel board + theme toggle + ports\
3.  **Phase 0.2:** Environment setup\
4.  Phase 3+: Gameplay logic

------------------------------------------------------------------------

# End of Document
