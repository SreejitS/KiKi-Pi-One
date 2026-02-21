---
task: "Make article HTML output for WordPress beautiful, elegant, and well-aligned - clean tables, styled code blocks, good typography - and verify by rendering"
created: "2026-02-21 21:17"
status: implemented
---

## Problem

The `publish.py` script converts article markdown to raw, unstyled HTML. When pasted into WordPress as a Custom HTML block, tables have no borders or padding (misaligned), code blocks have no visual distinction from body text, and the overall reading experience is plain browser defaults. The articles deserve better presentation.

## Hard constraints

- **WordPress Custom HTML blocks** support `<style>` tags and inline styles. Styling must be self-contained in the pasted HTML (no external stylesheets).
- **Medium strips all CSS** - styling only applies to the WordPress target. Medium output must remain plain HTML (it already works fine there since Medium applies its own formatting).
- **publish.py currently produces identical HTML for both targets** - we need to split behaviour: styled wrapper for WordPress, plain for Medium.
- **No JavaScript** - WordPress blocks don't reliably run JS. CSS only.
- **Must not break existing workflow** - the user still runs `python tools/publish.py article.md --target wordpress`, copies to clipboard, pastes into Custom HTML block.
- **Scoped styles** - wrap in a `.kiki-article` class to avoid conflicts with the WordPress theme's own CSS.

## Design

### What elements need styling

From reading both published articles (01-registers, 02-alu), the full inventory of HTML elements produced by the markdown converter:

1. **`<table>`** (interface tables, control-bit tables) - the biggest pain point. Currently unstyled = invisible borders, no cell padding, misaligned columns.
2. **`<pre><code>`** (fenced code blocks with language classes like `language-systemverilog`, `language-typescript`, `language-bash`) - need dark/contrast background, monospace font, padding.
3. **`<code>`** (inline code in paragraphs, e.g. `always_comb`, `zr`) - needs subtle background pill.
4. **`<h2>`, `<h3>`** (section headings) - need consistent spacing and weight.
5. **`<hr>`** (section dividers between every major section) - need subtle, elegant divider instead of browser default.
6. **`<ol>`, `<ul>`** (numbered steps, lists) - need proper indentation and spacing.
7. **`<blockquote>`** (used in register article for the flip-flop contract) - needs left border accent.
8. **`<p>` with `<strong>`, `<em>`, `<a>`** - body text typography, link color.
9. **`<pre><code>` without language class** (ASCII diagrams, test output) - same styling as code but maybe slightly different feel.

### Approach: embedded `<style>` block

Add a `<style>` block scoped under `.kiki-article` to the WordPress HTML output. The approach:

```
<div class="kiki-article">
<style>
  .kiki-article { ... }
  .kiki-article table { ... }
  .kiki-article pre { ... }
  /* etc. */
</style>
[article HTML here]
</div>
```

**Why not inline styles on every element?** An embedded `<style>` block is:
- Cleaner to maintain (one place to edit)
- Smaller output (no repeated `style="..."` on every `<td>`)
- Supported by WordPress Custom HTML blocks

**Why not a separate CSS file?** WordPress won't load external CSS from a pasted block. Self-contained is the only option.

### Style choices

Keeping it minimal and elegant (no flashy colors, no heavy design):

- **Typography**: `system-ui, -apple-system, sans-serif` for body. `'SF Mono', 'Fira Code', 'Consolas', monospace` for code. Line-height 1.7 for readability. Max-width 720px centered.
- **Tables**: Thin 1px border in light gray (#e2e8f0). Padding 10px 14px. Header row with subtle background (#f8fafc) and bold text. Left-align all cells. Monospace font for cells containing code (first column in interface tables). Even row zebra striping with very light gray.
- **Code blocks**: Background #1e1e2e (dark, but not black). Text #cdd6f4 (soft white). Padding 1.25rem. Border-radius 8px. Overflow-x auto for wide code. Font-size 0.9em.
- **Inline code**: Background #f1f5f9. Padding 2px 6px. Border-radius 4px. Font-size 0.9em.
- **Section dividers (`<hr>`)**: Thin 1px line in #e2e8f0. Margin 2.5rem auto. Max-width 80%.
- **Blockquotes**: Left border 3px solid #6366f1 (indigo accent). Padding-left 1rem. Italic.
- **Links**: Color #6366f1 (indigo). No underline by default, underline on hover.
- **H2**: 1.6em, slight top margin (2.5rem), bottom margin (1rem). No extra decoration.
- **H3**: 1.2em, margin-top 2rem.

### Changes to `publish.py`

The `save_html()` function currently wraps HTML in a bare `<html>` shell. Add a new function `wrap_for_wordpress(html)` that:
1. Wraps the article HTML in `<div class="kiki-article">...</div>`
2. Prepends the `<style>` block inside the wrapper

The `prepare_for()` function then uses:
- `wrap_for_wordpress(html)` when target is `"wordpress"`
- Plain `html` when target is `"medium"`

The `<style>` block lives as a Python constant string in `publish.py` (not a separate file). This keeps the tool self-contained.

### What was considered and ruled out

- **Separate CSS template file** (`tools/article.css`): Adds a file dependency for no real benefit. The style block is ~60 lines; it fits fine as a string constant in publish.py.
- **Inline styles on every element**: Bloats the HTML, hard to maintain, harder to iterate on.
- **Syntax highlighting** (e.g. Pygments): Adds a dependency, increases complexity significantly. The dark background with monospace is enough visual distinction. WordPress code block plugins can add highlighting if desired later. Out of scope.
- **Responsive breakpoints**: WordPress themes already handle mobile layout. The max-width + percentage-based padding is sufficient.

## Correctness argument

This is a styling task, not a logic task. Correctness = "it looks right when rendered." The verification step (Step 3 below) generates an HTML file and opens it for visual inspection. If a table looks wrong, adjust the CSS and re-render. No truth tables needed.

## Highest-risk assumption

WordPress Custom HTML blocks might strip or override `<style>` tags in some themes. Mitigation: test by pasting into WordPress first with the ALU article. If `<style>` is stripped, fall back to inline styles on key elements (tables + code blocks only). This is the first thing to verify.

## Files to create or modify

| File | Action | Reason |
|------|--------|--------|
| `tools/publish.py` | modify | Add WordPress CSS wrapper, split styled/plain output per target |

## Steps

1. **Add the CSS constant** to `publish.py` - a `WORDPRESS_STYLE` string containing the full `<style>` block scoped under `.kiki-article`
2. **Add `wrap_for_wordpress(html)` function** - wraps HTML in `<div class="kiki-article"><style>...</style>{html}</div>`
3. **Modify `prepare_for()`** - use `wrap_for_wordpress(html)` for WordPress target, plain `html` for Medium
4. **Modify `save_html()`** - pass the target-appropriate HTML (so the preview file also reflects the styling)
5. **Test visually** - run `publish.py articles/02-alu.md --target wordpress`, open the saved HTML preview file, verify tables are clean, code blocks have contrast, overall typography is elegant
6. **Iterate** - if anything looks off, adjust CSS values and re-render until satisfied

## Out of scope

- Syntax highlighting for code blocks (would require Pygments or similar)
- Dark mode / theme toggle
- Custom fonts (system fonts only, for zero load time)
- Changing the article markdown content itself
- Medium-specific styling (Medium applies its own)
- WordPress theme CSS changes (we scope under `.kiki-article` to be theme-agnostic)
