# Settlers of Lanc Codebase Audit (2025-12-06)

**Author:** Claude Opus 4.5 via Antigravity (Google DeepMind)  
**Date:** December 6, 2025  
**Scope:** Repository-wide audit of architecture, code quality, maintainability, performance, and technical debt. Incorporates findings from GPT-5 audit (2025-12-04).

---

## Executive Summary

Settlers of Lanc is a **Next.js 16** web implementation of Settlers of Catan including the **Cities & Knights** expansion. The codebase exhibits a well-documented layered architecture with mostly clean separation of concerns. The application is functional with solid game logic but has **maintainability concerns** and **technical debt** that should be addressed.

### Key Metrics
| Metric | Count |
|--------|-------|
| Lines of Code (est.) | ~35,000 |
| React Components | ~47 |
| Services | 12 |
| Core Engine Modules | 14 |
| API Routes | 12 endpoints |
| Server Actions | 42+ |
| Test Files | **0** (project-level) |

### Overall Assessment: **B+ (Good with Notable Gaps)**

**Strengths:**
- Clean layered architecture (actions → services → core → repositories)
- Comprehensive Cities & Knights expansion implementation  
- Good TypeScript usage with strict mode
- Well-documented architectural decisions (AGENTS.md)
- Functional real-time game sync via Supabase

**Key Issues (Maintainability Focus):**
- Large monolithic components (`GameController.tsx`: 2,015 lines)
- Dual mutation pathways (actions + API routes) against documented architecture
- Type import fragmentation (`ResourceType` from 4 different sources)
- `lobby-service.ts` bypasses repository layer
- Legacy engine folder outside modular boundary

---

## Table of Contents

1. [Architecture Review](#architecture-review)
2. [Code Quality Assessment](#code-quality-assessment)
3. [Type System Issues](#type-system-issues)
4. [Performance Considerations](#performance-considerations)
5. [UI/CSS Architecture Review](#uicss-architecture-review)
6. [Technical Debt Inventory](#technical-debt-inventory)
7. [Files of Concern](#files-of-concern)
8. [Recommendations & Prioritization](#recommendations--prioritization)
9. [Comparison with Previous Audit](#comparison-with-previous-audit)

---

## Architecture Review

### Layered Architecture (As Documented)

```
┌─────────────────────────────────────────┐
│   Actions Layer (app/actions.ts)        │  ← Thin wrappers (2-3 lines)
│   - 42+ server actions                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   Service Layer (lib/services/)         │  ← Business logic orchestration
│   - 12 services                         │
│   - building, game, trading, knight...  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   Core Layer (core/)                    │  ← Pure domain logic
│   - engine/: 10 modules                 │
│   - rules/: 6 modules                   │
│   - validation/: 6 modules              │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   Repository Layer (lib/repositories/)  │  ← Data access abstraction
│   - game, room, player repositories     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   Database (lib/db/)                    │  ← PostgreSQL via Drizzle ORM
│   - 4 tables: users, rooms, players,    │
│     games                               │
└─────────────────────────────────────────┘
```

### Architecture Conformance

| Layer | Documented Behavior | Actual Behavior | Conformance |
|-------|-------------------|-----------------|-------------|
| Actions | 2-3 line delegates | Most comply; debug helpers contain ~85 lines of logic | ⚠️ Partial |
| Services | Orchestrate via repos | 11/12 good; `lobby-service.ts` imports `db` directly | ⚠️ Partial |
| Core | Pure functions, no I/O | Clean separation; properly isolated | ✅ Good |
| Repositories | DB access only | Clean implementation | ✅ Good |
| API Routes | Read-only per docs | Still handling POST mutations | ❌ Divergent |

### High Severity: Dual Mutation Pathways

**Finding (from GPT-5):** The documented architecture states mutations should use Server Actions only, but several API routes still handle POST operations:

```
app/api/game/[roomId]/
├── barbarian/route.ts     (POST - barbarian actions)
├── commercial-harbor/     (POST - commercial harbor responses)
├── improvement/route.ts   (POST - improvement upgrades)
├── knight/route.ts        (POST - knight actions)
├── metropolis/route.ts    (POST - metropolis placement)
└── progress-card/         (5 routes - various card actions)
```

**Impact:** Logic duplication, inconsistent validation, unclear cache invalidation, harder auditing.

**Recommendation:** Consolidate all POST operations through server actions; convert API routes to read-only or remove.

### Medium Severity: Service Layer Bypass

**Finding (from GPT-5):** `lib/services/lobby-service.ts` imports `db` directly at line 1:
```typescript
import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
```

**Impact:** Bypasses repository abstraction, complicates testing, violates documented layering.

**Recommendation:** Create lobby repository (`lib/repositories/lobby-repository.ts`) and refactor service.

### Low Severity: Legacy Engine Folder

**Finding (from GPT-5, verified):** `components/board/Board.tsx` imports `generatePorts` from `engine/generatePorts.ts` (108 lines) instead of from `core/engine/board/port-generator`.

**Verification:** The `engine/` directory contains only this single file. It should be moved to maintain proper modular boundaries.

**Impact:** Violates modular boundaries, complicates future refactors.

**Recommendation:**
1. Move `engine/generatePorts.ts` → `core/engine/board/port-generator.ts`
2. Update import in `components/board/Board.tsx`
3. Delete empty `engine/` directory

---

## Code Quality Assessment

### Component Size Analysis

| Component | Lines | Complexity | Status |
|-----------|-------|------------|--------|
| `GameController.tsx` | **2,015** | Very High | ⚠️ God component |
| `progress-card-manager.ts` | **1,767** | Very High | ⚠️ Split by category |
| `Board.tsx` | **932** | Very High | ⚠️ **Requires decomposition** |
| `ProgressCardModal.tsx` | 820 | High | Acceptable |
| `knight-manager.ts` | 539 | Medium | Acceptable |
| `lobby-view.tsx` | 365 | Medium | Good |

**High Priority Decomposition Targets:**

### 1. GameController.tsx (2,015 lines)
Handles all game orchestration with ~55 handler functions. Should decompose into:
- `KnightController` - Knight-related handlers
- `ProgressCardController` - Card play/selection handlers
- `TradeController` - Trading flow handlers
- `SelectionManager` - Board selection state management

### 2. Board.tsx (932 lines) - **CRITICAL: Corruption Risk**

**Issue:** Another agent repeatedly corrupts this file when attempting edits. Root cause: excessive complexity makes targeted edits extremely fragile.

**Complexity Analysis:**
- **40+ props** in BoardProps interface (lines 28-67) - massive prop drilling
- **176-line validation function** (`validVertices` useMemo, lines 176-352)
- **207-line click handler** (`handleVertexClick`, lines 481-687)
- **8 useMemo hooks** with complex dependencies
- **Mixed concerns:** Rendering + validation + interaction + state + API calls
- **Still uses API routes:** Knight movement (line 554), metropolis (line 580)

**Internal Structure:**
```
Board.tsx (932 lines)
├── Imports (23 lines)
├── BoardProps interface (40 props!)
├── Component body:
│   ├── State/Memos (8 useMemo, 2 useState)
│   ├── validVertices (176 lines) ← God function
│   ├── validEdges (49 lines)
│   ├── validHexes (51 lines)
│   ├── handleVertexClick (207 lines) ← God function
│   ├── handleEdgeClick (54 lines)
│   ├── handleHexClick (23 lines)
│   └── Render (160 lines JSX)
```

**Why It Breaks During Edits:**
1. **Complex dependency chains:** Changing one prop affects multiple memos
2. **Nested conditionals:** 10+ levels deep in validation logic
3. **Phase-specific logic:** Different behavior for 8+ game phases
4. **Progress card states:** 15+ different card selection modes
5. **No clear module boundaries:** Everything tightly coupled

**Recommended Decomposition:**

Create **5 new files** to replace Board.tsx:

**1. `BoardCanvas.tsx` (pure rendering, ~200 lines)**
```typescript
// ONLY renders hexes, vertices, edges, ports
// NO click handlers, NO validation logic
// Props: gameState, theme, hexSize, onClick handlers (passed through)
```

**2. `hooks/useBoardValidation.ts` (~300 lines)**
```typescript
// Extract ALL useMemo validation logic:
// - validVertices (176 lines)
// - validEdges (49 lines)
// - validHexes (51 lines)
// Returns: { validVertices, validEdges, validHexes }
```

**3. `hooks/useBoardActions.ts` (~400 lines)**
```typescript
// Extract ALL click handlers:
// - handleVertexClick (207 lines)
// - handleEdgeClick (54 lines)
// - handleHexClick (23 lines)
// Returns: { onVertexClick, onEdgeClick, onHexClick }
```

**4. `types/board-selection-state.ts` (~50 lines)**
```typescript
// Consolidate 40 props into structured types:
interface BoardSelectionState {
  buildMode: BuildMode | null;
  movingKnightId?: string;
  cardSelection?: CardSelectionState;
  specialPhase?: SpecialPhaseState;
}
// Reduces 40 props to ~5 props
```

**5. `Board.tsx` (orchestrator, ~100 lines)**
```typescript
// Thin wrapper that:
// 1. Uses useBoardValidation hook
// 2. Uses useBoardActions hook
// 3. Renders BoardCanvas with props
// 4. Handles zoom controls
```

**Migration Strategy:**
- **Do NOT attempt to edit current Board.tsx** - too fragile
- **Create new files first**, then delete old Board.tsx
- **Extract in order:** types → validation hook → actions hook → canvas → orchestrator
- **Test after each extraction** to ensure behavior unchanged

**Benefits:**
- ✅ Eliminates corruption risk (smaller, focused files)
- ✅ Easier to edit (clear module boundaries)
- ✅ Better testability (hooks can be tested independently)
- ✅ Removes prop drilling (consolidate state)
- ✅ Clearer separation of concerns

### Code Smells Inventory

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| God component | `GameController.tsx` | High | Decompose urgently |
| God component | `Board.tsx` | High | **Corruption risk** - recreate, don't edit |
| Prop explosion | `Board.tsx` (40+ props) | High | Consolidate into selection state object |
| God function | `Board.tsx:validVertices` (176 lines) | High | Extract to validation hook |
| God function | `Board.tsx:handleVertexClick` (207 lines) | High | Extract to actions hook |
| API routes in component | `Board.tsx` (lines 554, 580) | High | Use server actions instead |
| Business logic in action | `debugGiveProgressCard` (~85 lines) | Medium | Extract to service |
| Console.log debugging | 5 files (scripts, components) | Low | Remove for production |
| TODO comments | `metropolis-validator.ts` (2) | Low | Complete or track |
| `any` usage | 5+ service files | Medium | Replace with proper types |

### Good Patterns Observed

1. **Safe State Returns:** Services return updated `GameState` for proper propagation
2. **Mutation Logging:** All game actions properly log to `gameState.logs`
3. **Validation Separation:** Pure validators in `core/validation/` properly isolated
4. **Constants Centralization:** `core/rules/constants.ts`, `commodity-constants.ts`

---

## Type System Issues

### High Priority: ResourceType Import Fragmentation

**Finding (from GPT-5, expanded):** `ResourceType` is imported from **4 different sources** across ~29 files:

| Source | Files Importing | Definition |
|--------|-----------------|------------|
| `@/lib/board-data` | 12 | Re-exports from board-generator |
| `@/core/rules/board-constants` | 8 | ✅ **Canonical:** `'wood' \| 'brick' \| 'sheep' \| 'wheat' \| 'ore'` |
| `@/core/engine/board/board-generator` | 2 | Re-exports from board-constants |
| `@/components/ui/icons/GameIcon` | 2 | Likely duplicate definition |

**Current State:**
- `lib/board-data.ts` is correctly marked `@deprecated`
- `board-generator.ts` properly defines `TileType = ResourceType | 'desert'` (line 20)
- BUT: Imports are inconsistent across codebase

**Impact:** Type confusion, potential type mismatches, duplicate definitions.

**Recommendation:** 
1. Standardize all imports to `@/core/rules/board-constants`
2. Replace legacy imports in all ~29 affected files
3. Remove deprecated `lib/board-data.ts` after migration

### Medium Priority: API Route Params Typed as Promise

**Finding (from GPT-5):** Routes like `app/board/flat/page.tsx` and `app/room/[id]/page.tsx` type params as:
```typescript
{ params }: { params: Promise<{ roomId: string }> }
```

**Impact:** Unusual Next.js pattern, breaks static analysis expectations.

**Recommendation:** Use standard signatures: `{ params: { roomId: string } }`, validate presence, use `redirect`/`notFound`.

### Medium Priority: `any` Usage in Services

**Files with `any` typing:**
- `trading-service.ts`
- `progress-card-service.ts`
- `lobby-service.ts`
- `game-service.ts`
- `devcard-service.ts`

**Recommendation:** Replace with proper generics or concrete types.

---

## Performance Considerations

### Current Optimizations (Good)

1. **Longest Road:** Incremental recalculation per affected player only
2. **Supabase Realtime:** WebSocket for game state sync (low latency)
3. **ETag Polling:** Lobby uses conditional requests with 304 short-circuit
4. **Optimistic Updates:** Client-side optimistic state for better UX
5. **Supabase Lazy Init:** Now gracefully returns null when env vars missing (fixed since GPT-5 audit)

### Performance Concerns

| Issue | Impact | Severity |
|-------|--------|----------|
| Full state serialization per mutation | ~30-50KB JSON blob per update | Medium |
| Global VP recalculation | O(players × VP sources) per mutation | Low |
| No memoization in Board components | Potential unnecessary re-renders | Low |
| No optimistic locking | Concurrent mutation conflicts possible | Low |

### Recommendations

1. Consider partial state updates for high-frequency mutations
2. Add React.memo to expensive Board/Hex components
3. Implement state versioning if concurrent play becomes an issue

---

## UI/CSS Architecture Review

### Tailwind v4 Implementation (Good)

The project correctly uses **Tailwind CSS v4** with modern best practices:

1. **Configuration-less Setup**: No `tailwind.config.js` file (v4 approach)
2. **PostCSS Integration**: `@tailwindcss/postcss` plugin properly configured
3. **CSS Custom Properties**: Extensive use of CSS variables for theming
4. **OKLCH Color Space**: Modern color format for better perceptual uniformity
5. **Dark Mode**: Properly implemented using `.dark` class with `@custom-variant`
6. **Animation Library**: `tw-animate-css` package integrated

### Theme System (Good)

**globals.css:122** demonstrates proper layering with `@apply` directives:
```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Color tokens**: 18 semantic color variables properly defined for light/dark modes using OKLCH.

### Styling Patterns Analysis

| Pattern | Usage | Assessment |
|---------|-------|------------|
| Tailwind utility classes | ~687 `className` instances in game components | ✅ Primary approach |
| `cn()` utility | Standard `clsx` + `tailwind-merge` | ✅ Best practice |
| Inline styles | 45 occurrences in 25 files | ⚠️ Acceptable for dynamic SVG/positioning |
| Template literals in className | 71 occurrences in 32 files | ⚠️ Acceptable for conditional styles |
| Hardcoded hex colors | 100+ occurrences in 9 files | ⚠️ Needs consolidation |
| RGB/RGBA colors | 15 occurrences in 5 files | ⚠️ Minor issue |

### Medium Priority: Hardcoded Color Values

**Finding:** Game-specific colors (resources, commodities, knight levels, etc.) are hardcoded as hex values throughout components instead of using CSS custom properties.

**Affected Files:**
- `components/ui/icons/GameIcon.tsx:45-67` - Resource colors (`#634336`, `#ea7955`, etc.)
- `components/board/VertexRenderer.tsx:35` - Knight ring colors (`#FFD700`, `#000000`)
- `components/board/BarbarianHexOverlay.tsx` - Barbarian UI colors
- `components/lobby-view.tsx` - Player colors
- `components/ui/icons/CompactImprovementBar.tsx` - Improvement colors

**Impact:**
- Inconsistent color usage across components
- Harder to maintain/modify game color scheme
- No central color palette for game-specific elements

**Recommendation:**
Create game-specific CSS custom properties in `globals.css`:
```css
:root {
  /* Resource colors */
  --color-resource-wood: oklch(0.42 0.08 35);
  --color-resource-brick: oklch(0.65 0.15 30);
  --color-resource-sheep: oklch(0.87 0.02 90);
  /* ... etc */
}
```

Then replace hardcoded values with `var(--color-resource-wood)` or Tailwind classes.

### Low Priority: Component Library Usage

**Finding:** Minimal use of shadcn/ui components despite being listed as UI framework.

**Current shadcn/ui components:**
- `components/ui/button.tsx`
- `components/ui/tooltip.tsx`
- Icon components (custom, not from shadcn/ui)

**Impact:**
- Most UI is custom-built, which increases maintenance burden
- Inconsistent button/input styling patterns across modals
- No reusable form components despite heavy modal usage

**Recommendation:** Low priority; custom UI is acceptable for a game. Consider extracting common modal patterns if time permits.

### Documentation Drift (Medium Priority)

**Finding:** AGENTS.md contains incorrect tech stack information:

| Claimed in AGENTS.md | Actual Implementation | Issue |
|---------------------|----------------------|-------|
| Next.js 15 | Next.js 16.0.3 (package.json:18) | ❌ Wrong version |
| TanStack Query (React Query v5) | NOT IMPLEMENTED | ❌ Not used |
| Clerk authentication | NOT IMPLEMENTED | ❌ Not used |

**Impact:** Misleading for new developers, AI agents may make incorrect assumptions.

**Recommendation:** Update AGENTS.md to reflect actual stack:
- Next.js 16 (App Router)
- Zustand for state management (not TanStack Query)
- No authentication (throwaway game context)

---

## Technical Debt Inventory

### High Priority (Maintainability Impact)

| Issue | Impact | Effort | Files Affected |
|-------|--------|--------|----------------|
| Board.tsx corruption risk (932 lines) | **Blocks development** - agent edits fail | High | 1 file + GameController |
| Dual mutation paths (API + Actions) | Logic duplication, maintenance burden | Medium | ~12 API routes + Board.tsx |
| GameController size (2,015 lines) | Unmaintainable, hard to reason about | High | 1 file |
| Board.tsx prop explosion (40+ props) | Prop drilling hell, tight coupling | Medium | Board.tsx + GameController |
| ResourceType fragmentation | Type confusion, import inconsistency | Low | ~29 files |
| lobby-service bypasses repos | Architecture violation | Low | 1 file |

### Medium Priority

| Issue | Impact | Effort |
|-------|--------|--------|
| No automated tests | Regression risk for game logic | High |
| Hardcoded game colors | Inconsistent styling, harder maintenance | Low |
| `any` usage in services | Type safety gaps | Low |
| Progress-card-manager size (1,767 lines) | Complex to maintain | Medium |
| API route Promise<params> pattern | Non-standard Next.js | Low |
| Documentation drift (Next.js 16, TanStack Query, Clerk) | Onboarding confusion, AI agent errors | Low |

### Low Priority

| Issue | Impact | Effort |
|-------|--------|--------|
| No authentication | Future feature (not needed for throwaway games) | Medium |
| Console.log statements | Production noise | Low |
| Legacy `engine/` folder | Minor boundary violation | Low |
| Room code collision risk | Extremely low probability | Low |
| TODO comments in validators | Incomplete edge cases | Low |

---

## Files of Concern

### Immediate Attention (High Priority)

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| `Board.tsx` | 932 | **God component, corruption risk, 40+ props** | **RECREATE** (don't edit) - decompose into 5 files |
| `GameController.tsx` | 2,015 | God component, 55+ handlers | Decompose into sub-controllers |
| `app/actions.ts` | 325 | Debug helpers contain business logic | Extract to debug-service |
| `lobby-service.ts` | 347 | Imports `db` directly | Create lobby-repository |

### Short-term Cleanup

| File | Issue | Action |
|------|-------|--------|
| `progress-card-manager.ts` (1,767 lines) | Very large | Split by card category (science, trade, politics) |
| `Board.tsx` (932 lines) | Complex render logic | Add React.memo, consider splitting |
| `lib/board-data.ts` | Deprecated shim | Remove after import migration |
| `engine/generatePorts.ts` | Outside modular boundary | Move to `core/engine/board/` |

### Resolved Since Last Audit

| File | Previous Issue | Current Status |
|------|----------------|----------------|
| `lib/supabase.ts` | Crashed on missing env vars | ✅ Fixed - lazy initialization with null fallback |
| `app/actions.ts` | Was ~12k lines | ✅ Fixed - now 325 lines (97% reduction) |

---

## Recommendations & Prioritization

### Phase 1: Architecture Cleanup (Week 1-2) — HIGH PRIORITY

1. **Decompose Board.tsx (CRITICAL - Blocking Issue)**
   - **WHY FIRST:** Currently blocking development due to corruption risk
   - Create 5 new files: types, validation hook, actions hook, canvas, orchestrator
   - **DO NOT EDIT** existing Board.tsx - recreate from scratch
   - Remove API route calls (knight movement, metropolis) → use server actions
   - Test after each file extraction

2. **Consolidate Mutation Pathways**
   - Convert C&K API routes to read-only or remove
   - Move all POST mutations through server actions (includes Board.tsx fixes)
   - Ensure single orchestration path per operation

3. **Fix Service Layer Bypass**
   - Create `lib/repositories/lobby-repository.ts`
   - Refactor `lobby-service.ts` to use repository
   - Remove direct `db` import

4. **Cleanup Legacy Code**
   - Move `engine/generatePorts.ts` to `core/engine/board/port-generator.ts`
   - Update Board.tsx (or new BoardCanvas.tsx) import
   - Delete empty `engine/` directory

### Phase 2: Component Decomposition (Week 2-4) — HIGH PRIORITY

1. **Decompose GameController**
   - Extract `KnightController` (~15 handlers)
   - Extract `ProgressCardController` (~20 handlers)
   - Extract `TradeController` (~5 handlers)
   - Keep GameController as thin orchestrator

2. **Split Progress Card Manager**
   - Create `science-card-effects.ts`
   - Create `trade-card-effects.ts`
   - Create `politics-card-effects.ts`
   - Keep `progress-card-manager.ts` as dispatcher

### Phase 3: Type System Cleanup (Week 4-5) — MEDIUM PRIORITY

1. **Standardize ResourceType Imports**
   - Update all 29 files to import from `@/core/rules/board-constants`
   - Remove `lib/board-data.ts` deprecated shim
   - Update icons component if it has duplicate types

2. **Fix API Route Params**
   - Use standard Next.js param signatures
   - Remove Promise wrapper pattern

3. **Eliminate `any` Usage**
   - Replace with proper types in 5 service files
   - Focus on public function signatures

### Phase 4: CSS & Documentation Cleanup (Week 5) — MEDIUM PRIORITY

1. **Consolidate Hardcoded Colors**
   - Add game-specific CSS custom properties to `app/globals.css`
   - Define resource colors: wood, brick, sheep, wheat, ore
   - Define commodity colors: paper, cloth, coin
   - Define card type colors: science, trade, politics
   - Define knight level colors: basic, strong, mighty
   - Replace 100+ hardcoded hex values with CSS variables
   - Focus on: `GameIcon.tsx`, `VertexRenderer.tsx`, `BarbarianHexOverlay.tsx`

2. **Update Documentation**
   - **AGENTS.md** corrections:
     - Next.js 15 → 16
     - Remove TanStack Query (not implemented)
     - Remove Clerk auth (not implemented)
     - Add Zustand for state management
   - Update README.md with project-specific information

### Phase 5: Testing (Week 6) — MEDIUM PRIORITY

1. **Add Testing Framework**
   ```bash
   npm install -D vitest @testing-library/react
   ```

2. **Priority Test Coverage:**
   - `core/rules/victory-conditions.ts`
   - `core/engine/scoring/longest-road.ts`
   - `core/engine/barbarian/barbarian-manager.ts`
   - All validators in `core/validation/`

### Phase 6: Performance & Polish (Week 7+) — LOW PRIORITY

1. **Add React.memo to Board components**
2. **Consider partial state updates** for frequently changed fields
3. **Add structured logging** (Pino)
4. **Implement rate limiting** if needed

---

## Comparison with Previous Audit

Comparing with **GPT-5 Audit (2025-12-04)**:

| Issue | GPT-5 Severity | Current Status | Resolution |
|-------|----------------|----------------|------------|
| Supabase client crash on missing env | High | ✅ **Fixed** | Lazy init with null fallback |
| actions.ts was ~12k lines | High | ✅ **Fixed** | Now 325 lines (97% reduction) |
| Layering drift in actions | High | ⚠️ Partial | Most thin; debug helpers remain |
| lobby-service bypasses repos | High | ❌ Not fixed | Needs lobby-repository |
| API route mutations | High | ❌ Not fixed | Still handling POST |
| ResourceType fragmentation | High | ❌ Not fixed | 4 sources, 29 files affected |
| Route params as Promise | Medium | ❌ Not fixed | Non-standard pattern still present |
| Documentation drift | Medium | ⚠️ Partial | AGENTS.md has 3 major inaccuracies (see UI/CSS section) |
| No automated tests | Medium | ❌ Not fixed | Still zero coverage |
| Legacy engine folder | Low | ❌ Not fixed | Still outside boundary |
| Room code collision | Low | ⚠️ Acknowledged | Extremely low risk |

### Key Progress
- **Major win:** actions.ts refactored from ~12k to 325 lines
- **Major win:** Supabase client hardened with graceful fallback

### Remaining from GPT-5
- API route mutation consolidation
- lobby-service repository refactor  
- ResourceType standardization
- Route param typing fix

---

## Appendix A: Directory Structure

```
settlers-of-lanc/
├── app/
│   ├── actions.ts          # 42+ server actions (refactored from ~12k to 325 lines)
│   ├── api/                 # 12 API routes (6+ for C&K - should be read-only)
│   │   ├── game/[roomId]/   # Game-related endpoints
│   │   └── room/            # Room-related endpoints
│   ├── board/               # Board preview pages
│   ├── room/[id]/           # Game room pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home - create/join room
├── components/
│   ├── board/               # Board components (6 files)
│   ├── game/                # Game UI (33 files) - GameController needs decomposition
│   ├── lobby/               # Lobby components (2 files)
│   └── ui/                  # shadcn/ui components (5 files)
├── core/
│   ├── engine/              # Game mechanics (10 modules)
│   │   ├── barbarian/       # Barbarian system
│   │   ├── board/           # Board generation
│   │   ├── development/     # Dev cards
│   │   ├── knights/         # Knight management
│   │   ├── metropolis/      # Metropolis system
│   │   ├── progress/        # Progress cards (2 files, 73K - needs split)
│   │   ├── resources/       # Resource distribution
│   │   └── scoring/         # Victory calculations
│   ├── rules/               # Game rules (6 files) - canonical ResourceType here
│   ├── utils/               # Utility functions (3 files)
│   └── validation/          # Validators (6 files)
├── lib/
│   ├── db/                  # Database layer (2 files)
│   ├── hooks/               # React hooks (6 files)
│   ├── repositories/        # Data access (4 files) - needs lobby-repository
│   ├── services/            # Business logic (12 files)
│   ├── types/               # Type definitions (5 files)
│   ├── board-data.ts        # DEPRECATED - remove after import migration
│   └── supabase.ts          # ✅ Fixed: lazy init
├── themes/
│   ├── flat/                # 2D theme (6 components)
│   └── voxel/               # 3D theme (7 components)
├── engine/                  # LEGACY - should remove after migration
│   └── generatePorts.ts     # Move to core/engine/board/
├── docs/
│   ├── audits/              # Audit history
│   ├── archive/             # Historical docs
│   └── ui/                  # UI documentation
└── scripts/                 # Utility scripts (3 files)
```

---

## Appendix B: ResourceType Import Locations

Files importing ResourceType and their source (for standardization effort):

| Import Source | Files |
|---------------|-------|
| `@/lib/board-data` (deprecated) | player.ts, game.ts, trading-service.ts, robber-service.ts, game-service.ts, devcard-service.ts, building-costs.ts, actions.ts, TradeOfferDisplay.tsx, PlayerDevCards.tsx, PlayerHand.tsx, DiscardModal.tsx, DebugPanel.tsx, AqueductModal.tsx |
| `@/core/rules/board-constants` (canonical) | game-rules.ts, progress-card-manager.ts, GuildSelectionList.tsx, WeddingGiftModal.tsx, ProgressCardModal.tsx, MerchantPlacementModal.tsx, GameController.tsx, CommercialHarborInitiatorDialog.tsx |
| `@/core/engine/board/board-generator` | resource-manager.ts, port-generator.ts |
| `@/components/ui/icons/GameIcon` | Port.tsx, HexTile.tsx |

**Recommended standard:** `@/core/rules/board-constants`

---

*End of Audit*
