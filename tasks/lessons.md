# Lessons

## 2026-07-26 — HUD layout on low-resolution / high-zoom displays

**Correction:** A "low resolution screen" bug report turned out to be a 4K display
with Windows display scaling at 300%. OS zoom shrinks the *CSS-pixel* viewport,
so it presents exactly like a small screen — `window.innerHeight` already
accounts for it. Do not assume a resolution complaint means cheap hardware; ask
what the effective viewport is, and make the fix depend on viewport size rather
than on any assumption about the physical panel.

**Correction:** My first attempt made the right rail's status panel a shrinkable
flex item with `overflow-hidden` and no `min-height`. Flexbox shrank it to zero
and the player cards vanished, leaving only the `flex-shrink-0` phase header.

- Rule: any flex item that is allowed to shrink AND clips its overflow must have
  an explicit `min-h-*` floor. `min-h-0` unlocks shrinking; it does not bound it.

**Correction:** I assumed `transform: scale()` would shrink the bottom tray.
It shrank the painting but not the layout, so the tray's `flex-wrap` decision was
still made at the unscaled width and it kept wrapping to two rows.

- Rule: `transform` never affects layout. When scaling a container whose internal
  layout depends on its own size (wrapping, percentage children, container
  queries), compensate the layout box by `1 / scale` first.
- Corollary: measure scaled elements with `getBoundingClientRect()`, never
  `offsetHeight`/`offsetWidth` — only the former reflects transforms. And
  `ResizeObserver` will not fire on a scale change, since the layout box did not
  change; re-measure explicitly when the scale changes.

**Rule:** Absolutely-positioned HUD clusters reserve no space for each other.
When two of them can meet (the bottom tray vs. the right rail), one must be
bounded against the other's *measured* size — z-index only decides who wins the
collision, it does not prevent it.

**Rule:** The HUD had breakpoints for width only (`xl:`, `max-sm:`). Short
viewports are a distinct failure mode; check height as well as width when
reviewing responsive HUD work.
