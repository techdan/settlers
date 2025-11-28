# AGENTS.md

This file provides guidance to AI agents working with this codebase.

## Context

You are a very strong reasoner and planner. Use these critical instructions to structure your plans, thoughts, and responses.

Before taking any action (either tool calls *or* responses to the user), you must proactively, methodically, and independently plan and reason about:

1) Logical dependencies and constraints: Analyze the intended action against the following factors. Resolve conflicts in order of importance:
    1.1) Policy-based rules, mandatory prerequisites, and constraints.
    1.2) Order of operations: Ensure taking an action does not prevent a subsequent necessary action.
        1.2.1) The user may request actions in a random order, but you may need to reorder operations to maximize successful completion of the task.
    1.3) Other prerequisites (information and/or actions needed).
    1.4) Explicit user constraints or preferences.

2) Risk assessment: What are the consequences of taking the action? Will the new state cause any future issues?
    2.1) For exploratory tasks (like searches), missing *optional* parameters is a LOW risk. **Prefer calling the tool with the available information over asking the user, unless** your `Rule 1` (Logical Dependencies) reasoning determines that optional information is required for a later step in your plan.

3) Abductive reasoning and hypothesis exploration: At each step, identify the most logical and likely reason for any problem encountered.
    3.1) Look beyond immediate or obvious causes. The most likely reason may not be the simplest and may require deeper inference.
    3.2) Hypotheses may require additional research. Each hypothesis may take multiple steps to test.
    3.3) Prioritize hypotheses based on likelihood, but do not discard less likely ones prematurely. A low-probability event may still be the root cause.

4) Outcome evaluation and adaptability: Does the previous observation require any changes to your plan?
    4.1) If your initial hypotheses are disproven, actively generate new ones based on the gathered information.

5) Information availability: Incorporate all applicable and alternative sources of information, including:
    5.1) Using available tools and their capabilities
    5.2) All policies, rules, checklists, and constraints
    5.3) Previous observations and conversation history
    5.4) Information only available by asking the user

6) Precision and Grounding: Ensure your reasoning is extremely precise and relevant to each exact ongoing situation.
    6.1) Verify your claims by quoting the exact applicable information (including policies) when referring to them. 

7) Completeness: Ensure that all requirements, constraints, options, and preferences are exhaustively incorporated into your plan.
    7.1) Resolve conflicts using the order of importance in #1.
    7.2) Avoid premature conclusions: There may be multiple relevant options for a given situation.
        7.2.1) To check for whether an option is relevant, reason about all information sources from #5.
        7.2.2) You may need to consult the user to even know whether something is applicable. Do not assume it is not applicable without checking.
    7.3) Review applicable sources of information from #5 to confirm which are relevant to the current state.

8) Persistence and patience: Do not give up unless all the reasoning above is exhausted.
    8.1) Don't be dissuaded by time taken or user frustration.
    8.2) This persistence must be intelligent: On *transient* errors (e.g. please try again), you *must* retry **unless an explicit retry limit (e.g., max x tries) has been reached**. If such a limit is hit, you *must* stop. On *other* errors, you must change your strategy or arguments, not repeat the same failed call.

9) Inhibit your response: only take an action after all the above reasoning is completed. Once you've taken an action, you cannot take it back.

## General Rules

- Do not add to git without my permission
- Clean up temporary or backup files after they are no longer necessary. Double check for cleanup after finishing any task
- Be verbose as you carry out tasks. Provide output describing your understanding of the current task and how you are approaching it.
- Always use `bd` (beads) commands for task tracking and progress management. NEVER use TodoWrite or other task tracking tools. Use `bd create`, `bd update`, `bd close` etc. See [AGENTS.md](AGENTS.md) for full workflow.
- Send me a 1-2 sentence update every 4 steps or 6 tools calls. Tell me what you found or did, not just what's next.
- Anything in the system that is clickable (buttons, actions, etc) should have a pointer mouse pointer to indicate it's clickable.

## Tech Stack

### Core Technologies

- **Framework**: Next.js 15 (App Router)
- **React**: Version 19
- **TypeScript**: Strict mode enabled
- **Database**: PostgreSQL (Supabase hosted for production, local for dev)
- **ORM**: Drizzle ORM with migrations
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **State Management**: TanStack Query (React Query v5)
- **Authentication**: Clerk

### Path Aliases

Use `@/*` imports mapped to the root directory:
```typescript
import { cn } from "@/lib/utils"
import Button from "@/components/ui/button"
```

### Styling System

- **Tailwind CSS v4** with PostCSS integration
- **Custom theme** using CSS custom properties (OKLCH color space)
- **Dark mode** via `.dark` class with custom variant
- **Animations** via `tw-animate-css` package

The design system uses CSS variables for theming. Light and dark color schemes are defined in [app/globals.css](app/globals.css).

### Authentication (Clerk)

- **Provider**: Clerk (clerk.com)
- **Environment Variables**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key for client-side
  - `CLERK_SECRET_KEY` - Secret key for server-side
- **Setup**:
  - ClerkProvider wraps the app in root layout
  - Middleware protects routes requiring authentication
  - User context available via `useUser()` hook
  - Sign-in/sign-up pages at `/sign-in` and `/sign-up`
- **User Association**:
  - Database tables include `userId` (from Clerk) for multi-tenancy
  - Row-level filtering ensures users only see their own data

### Database Configuration

- **Type**: PostgreSQL (configurable via `DATABASE_TYPE` env var)
- **Development**: Local PostgreSQL at `DATABASE_URL`
- **Production**: Supabase PostgreSQL at `PROD_DATABASE_URL`
- **ORM**: Drizzle with type-safe schema and migrations
- **Connection**: Pooled connections for production

### Development Commands

- **Development server**: `npm run dev` (uses Turbopack)
- **Production build**: `npm run build` (uses Turbopack)
- **Start production server**: `npm start`
- **Linting**: `npm run lint` (ESLint with Next.js config)
- **Database**:
  - `npm run db:generate` - Generate migrations
  - `npm run db:push` - Push schema to database
  - `npm run db:studio` - Open Drizzle Studio GUI

The dev server runs on http://localhost:3000 with hot module replacement.

## Architecture

This codebase follows a **layered architecture** established through a multi-phase refactoring (Phases 1-4, completed 2025-11-24). All future development MUST respect these architectural boundaries and patterns.

### Layer Overview

```
┌─────────────────────────────────────────┐
│   Actions Layer (app/actions.ts)        │
│   - Next.js Server Actions              │
│   - Thin wrappers (2-3 lines each)     │
│   - Parameter passing only              │
│   - NO business logic                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Service Layer (lib/services/)         │
│   - Business logic orchestration        │
│   - Transaction boundaries              │
│   - Coordinates managers/validators     │
│   - Returns updated game state          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Core Layer (core/)                    │
│   - Managers: Domain operations         │
│   - Validators: Pure validation funcs   │
│   - Rules: Pure rule functions          │
│   - Engine: Game mechanics              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Repository Layer (lib/repositories/)  │
│   - Data access abstraction             │
│   - Database operations only            │
│   - NO business logic                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Database (lib/db/)                    │
│   - PostgreSQL via Drizzle ORM          │
│   - Schema definitions                  │
└─────────────────────────────────────────┘
```

### Directory Structure

```
app/
  actions.ts              # Server actions (thin wrappers only)

lib/
  services/               # Business logic orchestration
    building-service.ts   # Building operations (roads, settlements, cities)
    game-service.ts       # Game flow (start, dice, turns)
    trading-service.ts    # Bank and player trading
    robber-service.ts     # Robber and discard mechanics
    devcard-service.ts    # Development card operations
    index.ts              # Barrel exports

  repositories/           # Data access layer
    game-repository.ts    # Game state CRUD
    room-repository.ts    # Room CRUD
    player-repository.ts  # Player CRUD
    index.ts              # Barrel exports

  types/                  # Type definitions
    game.ts               # GameState and related types
    player.ts             # PlayerState, DevCardType
    board.ts              # Board structure types

  db/                     # Database layer
    schema.ts             # Drizzle schema
    index.ts              # DB client

core/
  engine/                 # Game mechanics (pure functions)
    board/                # Board generation, ports
    resources/            # Resource distribution
    scoring/              # Victory points, longest road
    devcard/              # Dev card deck generation

  rules/                  # Game rules (pure functions)
    building-costs.ts     # Building costs and affordability
    constants.ts          # Game constants
    victory-conditions.ts # Win condition checks

  validation/             # Validation logic (pure functions)
    building-validator.ts # Main phase placement rules
    setup-validator.ts    # Setup phase placement rules
```

### Key Principles

#### 1. **Actions Are Thin Wrappers**
Actions MUST be 2-3 lines max. They only call service methods:

```typescript
// ✅ CORRECT - Action delegates to service
export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    return buildingService.buildRoad(roomId, playerId, edgeId);
}

// ❌ WRONG - Business logic in action
export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    const game = await db.query.games.findFirst(...);
    // 50 lines of validation and logic...
}
```

#### 2. **Services Orchestrate Business Logic**
Services coordinate between repositories, validators, rules, and managers:

```typescript
// Service method structure
export async function buildRoad(
    roomId: string,
    playerId: string,
    edgeId: string
): Promise<GameState> {
    // 1. Get game state from repository
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate turn and phase
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // 3. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 4. Validate using validators
    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // 5. Check affordability using rules
    if (!canAfford(player.resources, BUILDING_COSTS.road)) {
        throw new Error('Insufficient resources');
    }

    // 6. Execute operation
    deductCost(player.resources, BUILDING_COSTS.road);
    player.roadsRemaining--;
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';

    // 7. Update side effects (using managers)
    updateLongestRoad(gameState);

    // 8. Check victory
    const winnerId = checkVictoryCondition(gameState);
    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';
    }

    // 9. Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} built a road`,
        playerId
    });

    // 10. Save to database via repository
    await updateGameState(gameState);

    return gameState;
}
```

#### 3. **Validators and Rules Are Pure Functions**
NO side effects, NO mutations, NO async:

```typescript
// ✅ CORRECT - Pure validator
export function isValidMainPhaseRoad(
    gameState: GameState,
    edgeId: string,
    playerId: string
): boolean {
    const edge = gameState.board.edges[edgeId];
    if (!edge || edge.owner !== null) return false;

    // Check adjacency to player's structures...
    return hasAdjacentStructure;
}

// ✅ CORRECT - Pure rule
export function canAfford(
    resources: Record<ResourceType, number>,
    cost: Record<ResourceType, number>
): boolean {
    return Object.entries(cost).every(
        ([res, amount]) => (resources[res as ResourceType] || 0) >= amount
    );
}
```

#### 4. **Repositories Abstract Database Operations**
Repositories ONLY talk to the database. NO business logic:

```typescript
// ✅ CORRECT - Repository fetches data
export async function getGameStateByRoomId(roomId: string): Promise<GameState | null> {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId)
    });

    if (!game) return null;
    return JSON.parse(game.state) as GameState;
}

// ❌ WRONG - Business logic in repository
export async function getGameStateByRoomId(roomId: string): Promise<GameState | null> {
    const game = await db.query.games.findFirst(...);

    // Don't validate, transform, or apply business rules here!
    if (game.currentTurn !== playerId) throw new Error('Not your turn');

    return game;
}
```

### Service Responsibilities

| Service | Domain | Methods |
|---------|--------|---------|
| **BuildingService** | Building placement | buildRoad, buildSettlement, buildCity, placeInitialSettlement, placeInitialRoad |
| **GameService** | Game flow | startGame, rollDice, endTurn |
| **TradingService** | Trading | tradeWithBank, offerTrade, acceptTrade, cancelTrade |
| **RobberService** | Robber mechanics | moveRobber, discardCards |
| **DevCardService** | Dev cards | buyDevCard, playDevCard, placeBonusRoad |

### Adding New Features

#### New Action
1. Add service method first (lib/services/)
2. Add thin wrapper in app/actions.ts
3. Never put business logic in actions

#### New Game Rule
1. Add pure function to core/rules/
2. Use from service layer
3. Add unit tests

#### New Validation
1. Add pure function to core/validation/
2. Use from service layer
3. Add unit tests

#### New Database Operation
1. Add method to appropriate repository
2. Use from service layer
3. Never query database from services directly

### Testing Strategy

- **Actions**: Integration tests (call service)
- **Services**: Integration tests (mock repositories)
- **Validators/Rules**: Unit tests (pure functions)
- **Repositories**: Integration tests (real database)

### Migration Notes

This architecture was established in Phase 4 (completed 2025-11-24):
- **actions.ts reduced from 1345 → 160 lines (88% reduction)**
- All 19 game actions refactored
- 1185 lines moved to service layer
- Zero duplicated business logic

See `docs/phase4-refactoring-summary.md` for complete details.

### Known Issues

#### ResourceType vs TileType (Phase 5)
- **Current**: `ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert'`
- **Issue**: Desert is not a resource, it's a tile type
- **Impact**: Player resources have unused `desert: 0` field
- **Plan**: Phase 5 will split into proper types:
  - `ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'`
  - `TileType = ResourceType | 'desert'`
- **Files affected**: ~20 files, 115 occurrences

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**
```bash
bd ready --json
```

**Create new issues:**
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Bug Fix Tracking

**IMPORTANT**: All bug fixes should be tracked under the Bug Fix Tracker epic (toodle-136).

When the user asks you to:
- "Add a task" for a bug fix
- "Log a task" for a bug fix
- Report any bug or issue

Always:
1. Create the bug with priority 1 and type `bug`
2. Link it to the Bug Fix Tracker epic using `--deps blocks:toodle-136`
3. Use `--json` flag for programmatic output

**Example:**
```bash
bd create "Fix null pointer in task list" -t bug -p 1 --deps blocks:toodle-136 --json
```

This ensures all bugs are:
- Priority 1 (high visibility)
- Tracked under one epic for monitoring
- Easy to find and triage

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and QUICKSTART.md.

## Git Rules (from gist.github.com/steipete/d3b9db3fa8eb1d1a692b7656217d8655)

- Delete unused or obsolete files when your changes make them irrelevant (refactors, feature removals, etc.), and revert files only when the change is yours or explicitly requested. If a git operation leaves you unsure about other agents' in-flight work, stop and coordinate instead of deleting.
- **Before attempting to delete a file to resolve a local type/lint failure, stop and ask the user.** Other agents are often editing adjacent files; deleting their work to silence an error is never acceptable without explicit approval.
- NEVER edit `.env` or any environment variable files—only the user may change them.
- Coordinate with other agents before removing their in-progress edits—don't revert or delete work you didn't author unless everyone agrees.
- Moving/renaming and restoring files is allowed.
- ABSOLUTELY NEVER run destructive git operations (e.g., `git reset --hard`, `rm`, `git checkout`/`git restore` to an older commit) unless the user gives an explicit, written instruction in this conversation. Treat these commands as catastrophic; if you are even slightly unsure, stop and ask before touching them. *(When working within Cursor or Codex Web, these git limitations do not apply; use the tooling's capabilities as needed.)*
- Never use `git restore` (or similar commands) to revert files you didn't author—coordinate with other agents instead so their in-progress work stays intact.
- Always double-check git status before any commit
- Keep commits atomic: commit only the files you touched and list each path explicitly. For tracked files run `git commit -m "<scoped message>" -- path/to/file1 path/to/file2`. For brand-new files, use the one-liner `git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2`.
- Quote any git paths containing brackets or parentheses (e.g., `src/app/[candidate]/**`) when staging or committing so the shell does not treat them as globs or subshells.
- When running `git rebase`, avoid opening editors—export `GIT_EDITOR=:` and `GIT_SEQUENCE_EDITOR=:` (or pass `--no-edit`) so the default messages are used automatically.
- Never amend commits unless you have explicit written approval in the task thread.
