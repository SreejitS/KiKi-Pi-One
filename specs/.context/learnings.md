# Learnings

## 2026-02-21 - session: 21-30

- [web-demo] Dev server `.next` cache must be cleared (`rm -rf .next`) when adding new routes — Tailwind CSS may not load on the new page otherwise
- [web-demo] Vertical flow with simple `lg:grid-cols-2` works much better than complex nested grids (`grid-cols-[1fr_auto]`) for hardware demo pages
- [web-demo] Clickable canvas with crosshair cursor + address auto-jump is the best way to teach memory-mapped I/O interactively
- [memory] Highlighting address decode bits (14, 13) in amber on the bit grid visually teaches how hardware routes addresses
- [web-demo] `Uint16Array` works well for memory state in React — copy with `new Uint16Array(state.arr)` for immutable updates
- [web-demo] Screen pixel canvas: use `scale - 1` for pixel fill to leave 1px gap between pixels for grid visibility
- [memory] Address decoding: bit[14]=0 → RAM, bit[14]=1 & bit[13]=0 → Screen, bit[14]=1 & bit[13]=1 → Keyboard
