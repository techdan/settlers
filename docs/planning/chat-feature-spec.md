# Chat Feature Specification (Game Log Panel → Chat Tab)

This document specifies a room-scoped, real-time chat feature to be implemented on the **Chat** tab within the existing right-sidebar panel (see `components/game/ui/SidebarTabs.tsx`).

## 1) Goals / Non-Goals

### Goals
- Provide **room-scoped, real-time text chat** for players in a game room.
- Fit into the existing tab panel (same size constraints, scrolling behavior, and styling conventions as the Log tab).
- Work with the project’s “no auth / ephemeral sessions” model: sender identity derives from the existing `roomId` + `playerId` context.
- Use **Supabase Realtime** when configured; provide a **polling fallback** when Realtime is unavailable (mirrors existing patterns like `lib/hooks/useGameSubscription.ts`).

### Non-Goals (MVP exclusions)
- No DMs, no channels beyond “room chat”.
- No message editing/deleting/moderation tooling (future iteration).
- No attachments, images, reactions, voice, or rich text/Markdown rendering.
- No typing indicators (optional later).

## 2) User Stories

1. **Send a message**: a player can send a message to the room.
2. **Receive messages live**: messages appear without manual refresh.
3. **Identify sender**: display sender name + color dot consistent with the Game Log UI.
4. **Unread awareness**: show an unread count badge on the Chat tab when user is not on the Chat tab.
5. **Resilience**: chat still works without Realtime (polling + server send).

## 3) UI/UX Specification

### 3.1 Tab Button (SidebarTabs)
- Enable the Chat tab (remove `disabled: true`) in `components/game/ui/SidebarTabs.tsx`.
- Add optional **unread badge** on the Chat tab button:
  - Count of messages received since Chat was last active.
  - Display `99+` when count exceeds 99.
- Clickable elements must show a pointer cursor:
  - Tab buttons, send button, and “jump to latest”/“new messages” pill must use `cursor-pointer`.
  - Disabled UI uses `cursor-not-allowed`.

### 3.2 Layout Within Chat Tab
- **Message list** (scrollable):
  - Chronological order: oldest at top, newest at bottom.
  - Default scroll position is bottom (latest messages visible).
- **Composer** (fixed at bottom):
  - Input (textarea recommended) with placeholder “Message the table…”.
  - Send button “Send”.
  - Keyboard:
    - `Enter` sends (when non-empty).
    - `Shift+Enter` inserts newline (if multiline supported).
  - Send disabled if input is empty/whitespace or while sending.

### 3.3 Message Row Visuals
Each message row displays:
- Sender color dot (reuse same mapping logic used by Game Log; see `components/game/ui/GameLog.tsx` and `PLAYER_COLOR_VAR_MAP`).
- Sender name (strong emphasis).
- Message text rendered as **plain text** (preserve newlines if multiline allowed).
- Timestamp:
  - Hidden by default; shown via tooltip on hover (same pattern as Game Log tooltips).

### 3.4 New Message / Scroll Behavior
- If user is near bottom (within ~40px), new messages auto-scroll to bottom.
- If user scrolled up, do not force scroll; instead show a “New messages” pill/button:
  - Clicking scrolls to bottom.
  - Visually clickable via `cursor-pointer`.

### 3.5 Empty / Loading / Error States
- Empty state: “No messages yet. Say hello.”
- If Realtime disabled (Supabase env vars missing), show subtle indicator: “Realtime off (polling)”.
- Send failure:
  - Inline error: “Failed to send. Try again.”
  - Keep input content so user can resend.

## 4) Data Model (Database)

Add a new table to persist chat messages.

### 4.1 `chat_messages` (proposed)
Fields:
- `id` (text/uuid) primary key
- `room_id` (text) not null, FK → `rooms.id`
- `player_id` (text) nullable, FK → `players.id`
  - Nullable to allow future system messages where sender is “system”.
- `message` (text) not null
- `message_type` (text) not null default `'player'`
  - Allowed values (enum-like): `'player' | 'system'`
- `client_message_id` (text) nullable
  - Used to dedupe client retries / optimistic sends if implemented.
- `created_at` (timestamp) default now, not null

Indexes:
- `(room_id, created_at)` for fast room history retrieval.
- Optional uniqueness: `(room_id, player_id, client_message_id)` to prevent duplicates on retry.

Retention:
- Default: retained while the room/game exists (consistent with ephemeral sessions).
- Optional later: prune to last N messages or last X days per room.

## 5) Architecture / Responsibilities (Layered)

### 5.1 Server Action (thin wrapper)
Add a new action in `app/actions.ts`:
- `sendChatMessage(roomId: string, playerId: string, message: string, clientMessageId?: string)`
- Must be a thin wrapper that delegates to the service layer (no business logic).

### 5.2 Service Layer
Add `lib/services/chat-service.ts`:
Responsibilities:
- Validate player belongs to the room.
- Enforce message constraints (Section 6).
- Persist via repository.
- Return the inserted message DTO (recommended) for client confirmation.

### 5.3 Repository Layer
Add `lib/repositories/chat-repository.ts`:
- `insertChatMessage(...)`
- `getRecentChatMessages(roomId, limit, beforeTimestamp?)`
- Database operations only (no business rules).

### 5.4 API Route (Polling Fallback)
Add `app/api/chat/[roomId]/route.ts`:
- `GET` returns last N messages (e.g., 50).
- Support ETag caching similarly to `app/api/game/[roomId]/route.ts`.
- Optional query params:
  - `?limit=50`
  - `?before=<iso>` for pagination/backfill.

### 5.5 Client Subscription Hook
Add `lib/hooks/useChatSubscription.ts`:
- If Supabase client is available:
  - Subscribe to `postgres_changes` `INSERT` on `chat_messages` filtered by `room_id=eq.${roomId}`.
  - On connect, fetch recent messages once to avoid race gaps.
- If Supabase client is null:
  - Poll `/api/chat/${roomId}` every 2–3 seconds, using ETag to minimize payloads.

### 5.6 Client State (Unread Counts)
If unread needs to persist across component lifecycles, implement a small Zustand store under `lib/stores/`:
- Track `lastSeenChatTimestampByRoom` and `unreadCountByRoom`.
Otherwise, keep unread state local to `SidebarTabs` (acceptable for MVP if sidebar remains mounted).

## 6) Validation & Safety Rules

### 6.1 Message Constraints (server enforced)
- Trim whitespace.
- Reject empty/whitespace-only messages.
- Max length: choose and enforce one value (recommended: **280**; alternative: **500**).
- Normalize line endings; optionally limit to max 4 lines if multiline supported.

### 6.2 Sender Identity
- Never trust client-provided display name or color in message records.
- Resolve sender display from `players` data using `player_id`.

### 6.3 XSS / Injection
- Treat message as **plain text**:
  - Do not render HTML.
  - Do not use `dangerouslySetInnerHTML`.
- Optionally strip control characters.

### 6.4 Rate Limiting (pragmatic MVP)
- Prevent spam server-side (example): max 5 messages per 10 seconds per player per room.
- Implement via a DB query counting recent messages (server-side enforcement).

## 7) Ordering & Realtime Semantics
- Canonical order: `created_at`, then `id` as tie-breaker.
- Client should handle minor out-of-order delivery:
  - Insert into list by `(created_at, id)` ordering, or append then stable-sort (small lists only).

## 8) Acceptance Criteria (Definition of Done)
- Chat tab is enabled and shows message list + composer.
- Sending persists message; all connected clients in the room receive it (Realtime or polling).
- Rows show sender color dot + sender name + message text; timestamp available via tooltip.
- Scroll behavior matches spec (auto-scroll only when near bottom; otherwise show “New messages” pill).
- Unread badge increments when receiving messages while not on Chat tab; clears when opening Chat tab.
- Server rejects invalid messages (empty/too long/not-in-room) and client shows failure feedback.

