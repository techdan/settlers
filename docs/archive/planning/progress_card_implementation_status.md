# Progress Card Implementation Status

## Outstanding Items

### 1. Backend Logic Mismatches
The following cards have UI implemented but the backend logic in `core/engine/progress/progress-card-manager.ts` does not match the rules or the data sent by the frontend.

*   **Diplomat (Politics)**
    *   **Issue:** The backend currently implements logic to "Move 1 own knight" (expecting `knightId`, `targetVertexId`).
    *   **Requirement:** It must be updated to "Remove 1 open road" (expecting `edgeId`).
    *   **Frontend Status:** Sends `{ edgeId }`.

*   **Intrigue (Politics)**
    *   **Issue:** The backend implements a direct move of an opponent's knight (`opponentId`, `knightId`, `targetVertexId`).
    *   **Requirement:** It must implement "Displacement" rules:
        *   Identify opponent knight at the target vertex.
        *   Force opponent to move it to an adjacent empty spot or remove it if no spot is available.
    *   **Frontend Status:** Sends `{ knightId, targetVertexId }`.

### 2. Logic Refinement
*   **Diplomat "Open Road" Validation**
    *   **Issue:** The frontend `validEdges` calculation in `Board.tsx` currently allows selecting *any* opponent's road.
    *   **Requirement:** It must strictly enforce the "Open Road" rule (a road at the end of a network, not connecting two other road segments/buildings).

---

## Implemented Progress Card UI

### Board Interaction Cards
These cards trigger a specific selection mode on the board, allowing the user to click valid targets.

| Card Name | Category | Interaction Type | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Merchant** | Trade | **Hex Selection** | Highlights valid hexes (adjacent to player's settlement/city). API receives `{ hexId }`. |
| **Irrigation** | Science | **Hex Selection** | Highlights valid field hexes (with player settlement/city). API receives `{ hexId }`. |
| **Mining** | Science | **Hex Selection** | Highlights valid mountain hexes (with player settlement/city). API receives `{ hexId }`. |
| **Inventor** | Science | **Hex Selection (x2)** | Requires selecting two hexes sequentially. Highlights hexes with number tokens. API receives `{ hex1Id, hex2Id }`. |
| **Intrigue** | Politics | **Vertex Selection** | Highlights vertices containing opponent knights connected to the player's road network. API receives `{ knightId, targetVertexId }`. |
| **Diplomat** | Politics | **Edge Selection** | Highlights opponent roads. API receives `{ edgeId }`. |

### Modal Interaction Cards
These cards open a modal dialog (`ProgressCardModal`) for the user to select options (resources, players, commodities, etc.).

| Card Name | Category | Modal Inputs | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Alchemist** | Science | **Resource Swap** | Select 2 resources to give up and 1 resource to receive. |
| **Smith** | Science | **Knight Selection** | Select up to 2 knights to upgrade (logic simplified in current modal to generic "Upgrade"). |
| **Resource Monopoly** | Trade | **Resource Type** | Select one resource type to name. |
| **Trade Monopoly** | Trade | **Commodity Type** | Select one commodity type to name. |
| **Spy** | Politics | **Opponent & Card** | Select an opponent to view their hand and steal a progress card. |
| **Deserter** | Politics | **Opponent** | Select an opponent to force them to remove a knight. |
| **Saboteur** | Politics | **Opponent** | Select an opponent to force them to discard cards (if they have >7). |

### Direct Action Cards
These cards are played immediately without additional UI input (handled directly or via simple confirmation).

*   **Medicine** (Science)
*   **Printer** (Science)
*   **Road Building** (Science) - *Note: Currently implemented as a status effect, may need future UI for immediate placement.*
*   **Crane** (Science)
*   **Engineer** (Science)
*   **Commercial Harbor** (Trade)
*   **Master Merchant** (Trade)
*   **Merchant Fleet** (Trade)
*   **Bishop** (Politics)
*   **Constitution** (Politics)
*   **Warlord** (Politics)
*   **Wedding** (Politics)
