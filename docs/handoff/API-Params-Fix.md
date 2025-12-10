# API Route Params Fix

## Files to Update
- [x] app/api/game/[roomId]/route.ts
- [x] app/api/room/[id]/route.ts
- [x] app/room/[id]/page.tsx

## Pattern

**Before:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  // ...
}
```

**After:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }
  // ...
}
```

For pages, validate with `notFound()` when the param is missing.
