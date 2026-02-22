#!/usr/bin/env python3
"""
publish.py — Article publishing helper for KiKi-Pi-One

Since Medium removed their API and WordPress is behind Mod_Security,
this script prepares the article for manual pasting:

  1. Converts Markdown → clean HTML
  2. Saves the HTML to articles/ (same name, .html extension)
  3. Copies the content to clipboard
  4. Opens the target editor in your browser

Usage:
    python tools/publish.py articles/00-isa-spec.md --target medium
    python tools/publish.py articles/01-registers.md --target wordpress
    python tools/publish.py articles/01-registers.md --target both

After running:
  - Medium:    paste into editor at medium.com/new-story
  - WordPress: paste into Gutenberg editor (it accepts formatted HTML)

Dependencies:
    pip install python-frontmatter markdown pygments wavedrom
"""

import argparse
import base64
import html as html_mod
import re
import subprocess
import sys
import webbrowser
from pathlib import Path

import frontmatter
import markdown
import wavedrom


EDITOR_URLS = {
    "medium": "https://medium.com/new-story",
    "wordpress": "https://sreejits.com/wp-admin/post-new.php",
}

HLJS_CSS = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/monokai.min.css">'
HLJS_JS = """\
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/languages/verilog.min.js"></script>
<script>hljs.highlightAll();</script>"""

WORDPRESS_STYLE = """\
<style>
  /* ID selector (#) beats any class-based theme rule */

  /* ── Layout ── */
  #kiki-article {
    font-family: inherit !important;
    line-height: 1.75 !important;
    color: inherit !important;
  }
  /* ── Headings ── */
  #kiki-article h2 {
    font-size: 1.5em !important;
    font-weight: 700 !important;
    margin: 2.5rem 0 1rem !important;
    color: inherit !important;
    line-height: 1.2 !important;
  }
  #kiki-article h3 {
    font-size: 1.2em !important;
    font-weight: 600 !important;
    margin: 2rem 0 0.75rem !important;
    color: inherit !important;
    line-height: 1.3 !important;
  }
  #kiki-article p {
    margin: 1rem 0 !important;
  }
  /* ── Links ── */
  #kiki-article a {
    color: #4338ca !important;
    text-decoration: underline !important;
    text-underline-offset: 2px !important;
  }
  #kiki-article a:hover {
    color: #3730a3 !important;
  }
  /* ── Horizontal rule ── */
  #kiki-article hr {
    border: none !important;
    border-top: 1px solid #999 !important;
    margin: 2.5rem auto !important;
    max-width: 80% !important;
  }
  /* ── Blockquotes ── */
  #kiki-article blockquote {
    border-left: 3px solid #4338ca !important;
    margin: 1.5rem 0 !important;
    padding: 0.5rem 0 0.5rem 1.25rem !important;
    color: #333 !important;
    font-style: italic !important;
  }
  #kiki-article blockquote p {
    margin: 0.5rem 0 !important;
  }
  /* ── Lists ── */
  #kiki-article ol, #kiki-article ul {
    margin: 1rem 0 !important;
    padding-left: 1.75rem !important;
  }
  #kiki-article li {
    margin: 0.4rem 0 !important;
  }
  /* ── Tables ── */
  #kiki-article table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 1.5rem 0 !important;
    font-size: 0.92em !important;
    background: #fff !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
  }
  #kiki-article th {
    background: #f0f0f0 !important;
    font-weight: 600 !important;
    text-align: left !important;
    padding: 10px 14px !important;
    border: 1px solid #ddd !important;
    color: #000 !important;
  }
  #kiki-article td {
    padding: 9px 14px !important;
    border: 1px solid #ddd !important;
    text-align: left !important;
    color: #000 !important;
  }
  #kiki-article tbody tr:nth-child(even) {
    background: #f7f7f7 !important;
  }
  /* ── Code blocks ── */
  #kiki-article pre {
    background: #272822 !important;
    color: #f8f8f2 !important;
    padding: 1.25rem !important;
    border-radius: 8px !important;
    overflow-x: auto !important;
    margin: 1.5rem 0 !important;
    font-size: 0.88em !important;
    line-height: 1.6 !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace !important;
    -webkit-font-smoothing: antialiased !important;
    white-space: pre !important;
    word-wrap: normal !important;
    letter-spacing: 0 !important;
    word-spacing: 0 !important;
  }
  #kiki-article pre code {
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    color: inherit !important;
    font-family: inherit !important;
    font-size: inherit !important;
    white-space: pre !important;
    word-wrap: normal !important;
    letter-spacing: 0 !important;
  }
  /* ── Inline code ── */
  #kiki-article p code,
  #kiki-article li code,
  #kiki-article td code,
  #kiki-article h2 code,
  #kiki-article h3 code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace !important;
    background: #e0e0e0 !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-size: 0.9em !important;
    color: #000 !important;
  }
  #kiki-article strong {
    font-weight: 700 !important;
    color: inherit !important;
  }
  /* ── Images ── */
  #kiki-article img {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 6px !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
    margin: 1rem 0 !important;
  }
  /* ── WaveDrom timing diagrams ── */
  #kiki-article .kiki-wavedrom {
    text-align: center !important;
    margin: 1.5rem 0 !important;
    background: #fff !important;
    padding: 1rem !important;
    border-radius: 8px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
    overflow-x: auto !important;
  }
  #kiki-article .kiki-wavedrom svg {
    max-width: 100% !important;
    height: auto !important;
  }
</style>"""


def render_wavedrom(html_content: str) -> str:
    """Replace WaveDrom JSON code blocks with base64-encoded SVG images.

    Detects code blocks containing "signal" (HTML-escaped as &quot;signal&quot;)
    and renders them using the wavedrom Python library. The SVG is encoded as a
    base64 data URI in an <img> tag so WordPress won't strip the SVG internals.
    """
    pattern = re.compile(
        r'<pre><code[^>]*>([^<]*&quot;signal&quot;[^<]*)</code></pre>',
        re.DOTALL,
    )

    def _replace(match):
        raw = html_mod.unescape(match.group(1))
        # Strip the comment line (e.g. "// WaveDrom - paste at wavedrom.com")
        raw = re.sub(r'//.*\n', '', raw)
        try:
            svg = wavedrom.render(raw)
            svg_str = svg.tostring()
            b64 = base64.b64encode(svg_str.encode()).decode()
            img = f'<img src="data:image/svg+xml;base64,{b64}" alt="WaveDrom timing diagram" style="width:100%">'
            return f'<div class="kiki-wavedrom">{img}</div>'
        except Exception as e:
            print(f"  [WARN] WaveDrom render failed: {e}")
            return match.group(0)  # keep original on failure

    return pattern.sub(_replace, html_content)


def wrap_for_wordpress(html: str) -> str:
    """Wrap article HTML in a single Custom HTML block for WordPress.

    Uses an ID selector (#kiki-article) for maximum CSS specificity so our
    code block styles beat any theme rules. Adds highlight.js for syntax
    highlighting and renders WaveDrom timing diagrams as inline SVGs.
    """
    # Map systemverilog → verilog (highlight.js knows verilog, not systemverilog)
    html = html.replace('class="language-systemverilog"', 'class="language-verilog"')

    # Render WaveDrom JSON blocks as inline SVG
    html = render_wavedrom(html)

    return (
        f'<div id="kiki-article">\n'
        f'{WORDPRESS_STYLE}\n'
        f'{HLJS_CSS}\n'
        f'{html}\n'
        f'{HLJS_JS}\n'
        f'</div>'
    )


def load_article(path: str, target: str = "medium") -> tuple[frontmatter.Post, str]:
    """Load a markdown file, return (post, html_body).
    Strips the first H1 from the body — the platform title field handles it.

    For WordPress we skip codehilite (Pygments) because it can't parse HACK
    assembly or ASCII diagrams — fenced_code alone gives us clean <pre><code>.
    """
    post = frontmatter.load(path)
    content = re.sub(r'^\s*#\s+.+\n', '', post.content, count=1)

    if target == "wordpress":
        # Plain fenced code blocks — no syntax highlighting
        html = markdown.markdown(
            content,
            extensions=["tables", "fenced_code", "toc"],
        )
    else:
        html = markdown.markdown(
            content,
            extensions=["tables", "fenced_code", "codehilite", "toc"],
            extension_configs={
                "codehilite": {
                    "css_class": "codehilite",
                    "guess_lang": False,
                    "noclasses": False,
                }
            },
        )
    return post, html


def copy_to_clipboard(text: str):
    """Copy text to system clipboard (macOS/Linux)."""
    try:
        subprocess.run("pbcopy", input=text.encode(), check=True)   # macOS
        return True
    except FileNotFoundError:
        try:
            subprocess.run(["xclip", "-selection", "clipboard"],
                           input=text.encode(), check=True)          # Linux
            return True
        except FileNotFoundError:
            return False


def save_html(html: str, title: str, article_path: Path, target: str = "medium") -> str:
    """Save HTML alongside the source .md file and return its path."""
    out_path = article_path.with_suffix(".html")
    head_extra = f"\n{HLJS_CSS}" if target == "wordpress" else ""
    full_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>{head_extra}</head>
<body>
{html}
</body></html>"""
    out_path.write_text(full_html)
    return str(out_path)


def update_frontmatter_status(path: str):
    """Mark article as 'ready' in frontmatter."""
    post = frontmatter.load(path)
    if post.get("status") == "draft":
        post["status"] = "ready"
        with open(path, "wb") as f:
            frontmatter.dump(post, f)
        print(f"  Marked as 'ready' in frontmatter")


def prepare_for(target: str, post: frontmatter.Post, html: str, article_path: Path):
    """Prepare and open a single target."""
    title = post.get("title", "Untitled")
    tags  = post.get("tags", [])

    # WordPress gets styled wrapper; Medium gets plain HTML
    output_html = wrap_for_wordpress(html) if target == "wordpress" else html

    print(f"\n── {target.upper()} ─────────────────────────────")
    print(f"  Title : {title}")
    print(f"  Tags  : {', '.join(tags)}")

    # Save HTML alongside the source markdown
    html_path = save_html(output_html, title, article_path, target=target)
    print(f"  HTML  : {html_path}")

    # Copy to clipboard
    copied = copy_to_clipboard(output_html)
    if copied:
        print("  ✓ HTML copied to clipboard — ready to paste")
    else:
        print("  ✗ Clipboard copy failed — open the HTML file manually")

    # Open editor in browser
    url = EDITOR_URLS.get(target)
    if url:
        webbrowser.open(url)
        print(f"  ✓ Opened {url}")

    # Target-specific instructions
    if target == "medium":
        print("""
  Paste steps (Medium):
    1. Editor is now open in your browser
    2. Click the title area → type/paste the title
    3. Click the body → Cmd+V to paste
    4. Add the tags shown above manually
    5. Click Publish when ready
""")
    elif target == "wordpress":
        print("""
  Paste steps (WordPress):
    1. Editor is now open in your browser
    2. Click the title field → type/paste the title
    3. In the body: click + → Custom HTML block → paste
    4. Add tags in the right sidebar
    5. Click Publish / Save Draft when ready
""")


def main():
    parser = argparse.ArgumentParser(
        description="Prepare a KiKi-Pi-One article for publishing"
    )
    parser.add_argument("article", help="Path to the article markdown file")
    parser.add_argument(
        "--target",
        choices=["medium", "wordpress", "both"],
        default="both",
        help="Publishing target (default: both)",
    )
    args = parser.parse_args()

    path = Path(args.article)
    if not path.exists():
        print(f"[ERROR] File not found: {path}")
        sys.exit(1)

    print(f"Loading {path}...")
    targets = ["medium", "wordpress"] if args.target == "both" else [args.target]
    for target in targets:
        post, html = load_article(str(path), target=target)
        prepare_for(target, post, html, path)

    update_frontmatter_status(str(path))
    print("\nDone. Paste the content and publish!")


if __name__ == "__main__":
    main()
