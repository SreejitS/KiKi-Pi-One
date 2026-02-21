# Architectural Decisions

## 2026-02-21 - ADR-001: Use canvas for screen memory preview in web demos

**Context:** The screen buffer is 8K words (131,072 pixels). Rendering each pixel as a DOM element would create performance issues. Needed a way to visualize screen memory writes in the web demo.

**Decision:** Use an HTML `<canvas>` element with pixel-scale rendering. Made it interactive (click-to-toggle pixels) which directly updates screen memory state and auto-jumps the address input to the corresponding word.

**Consequences:** Canvas rendering is fast even for large pixel counts. Click detection requires manual coordinate-to-pixel math. The `imageRendering: pixelated` CSS property is needed for crisp scaling. This pattern should be reused when the full computer demo (Part 6) renders the complete 256x512 screen.
