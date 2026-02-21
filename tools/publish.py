#!/usr/bin/env python3
"""
publish.py — Article publishing helper for KiKi-Pi-One

Since Medium removed their API and WordPress is behind Mod_Security,
this script prepares the article for manual pasting:

  1. Converts Markdown → clean HTML
  2. Saves the HTML to a temp file
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
    pip install python-frontmatter markdown pygments
"""

import argparse
import subprocess
import sys
import tempfile
import webbrowser
from pathlib import Path

import frontmatter
import markdown
from pygments.formatters import HtmlFormatter


EDITOR_URLS = {
    "medium": "https://medium.com/new-story",
    "wordpress": "https://sreejits.com/wp-admin/post-new.php",
}

# Generate Pygments syntax highlighting CSS (monokai theme, scoped)
_PYGMENTS_CSS = HtmlFormatter(style='monokai').get_style_defs('.kiki-article .codehilite')

WORDPRESS_STYLE = """\
<style>
  .kiki-article {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    line-height: 1.75;
    color: #1a1a2e;
    max-width: 720px;
    margin: 0 auto;
  }
  .kiki-article h2 {
    font-size: 1.6em;
    font-weight: 700;
    margin: 2.5rem 0 1rem;
    color: #1a1a2e;
  }
  .kiki-article h3 {
    font-size: 1.2em;
    font-weight: 600;
    margin: 2rem 0 0.75rem;
    color: #1a1a2e;
  }
  .kiki-article p {
    margin: 1rem 0;
  }
  .kiki-article a {
    color: #6366f1;
    text-decoration: none;
  }
  .kiki-article a:hover {
    text-decoration: underline;
  }
  .kiki-article hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 2.5rem auto;
    max-width: 80%;
  }
  .kiki-article blockquote {
    border-left: 3px solid #6366f1;
    margin: 1.5rem 0;
    padding: 0.5rem 0 0.5rem 1.25rem;
    color: #475569;
    font-style: italic;
  }
  .kiki-article blockquote p {
    margin: 0.5rem 0;
  }
  .kiki-article ol, .kiki-article ul {
    margin: 1rem 0;
    padding-left: 1.75rem;
  }
  .kiki-article li {
    margin: 0.4rem 0;
  }
  /* --- Tables --- */
  .kiki-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.92em;
  }
  .kiki-article th {
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
  }
  .kiki-article td {
    padding: 9px 14px;
    border: 1px solid #e2e8f0;
    text-align: left;
  }
  .kiki-article tbody tr:nth-child(even) {
    background: #f8fafc;
  }
  /* --- Code blocks (codehilite wrapper from Pygments) --- */
  .kiki-article .codehilite {
    margin: 1.5rem 0;
    border-radius: 8px;
    overflow: hidden;
  }
  .kiki-article .codehilite pre {
    margin: 0;
    padding: 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.88em;
    line-height: 1.6;
    font-family: 'SF Mono', 'Fira Code', Consolas, 'Courier New', monospace;
    font-variant-ligatures: none;
    -webkit-font-smoothing: antialiased;
  }
  .kiki-article .codehilite pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
  }
  /* Fallback for any <pre> not inside codehilite */
  .kiki-article pre {
    background: #272822;
    color: #F8F8F2;
    padding: 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5rem 0;
    font-size: 0.88em;
    line-height: 1.6;
    font-family: 'SF Mono', 'Fira Code', Consolas, 'Courier New', monospace;
    font-variant-ligatures: none;
    -webkit-font-smoothing: antialiased;
  }
  .kiki-article pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    color: inherit;
    font-family: inherit;
  }
  /* Inline code */
  .kiki-article code {
    font-family: 'SF Mono', 'Fira Code', Consolas, 'Courier New', monospace;
    font-variant-ligatures: none;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    color: #1e293b;
  }
  .kiki-article strong {
    font-weight: 600;
    color: #0f172a;
  }
  /* --- Pygments syntax highlighting --- */
  """ + _PYGMENTS_CSS + """
</style>"""


def wrap_for_wordpress(html: str) -> str:
    """Wrap article HTML in a styled container for WordPress Custom HTML blocks."""
    return f'<div class="kiki-article">\n{WORDPRESS_STYLE}\n{html}\n</div>'


def load_article(path: str) -> tuple[frontmatter.Post, str]:
    """Load a markdown file, return (post, html_body).
    Strips the first H1 from the body — the platform title field handles it."""
    import re
    post = frontmatter.load(path)
    # Remove the first H1 line from markdown before converting
    # (WordPress/Medium show the title from frontmatter, so H1 in body duplicates it)
    content = re.sub(r'^\s*#\s+.+\n', '', post.content, count=1)
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


def save_html(html: str, title: str) -> str:
    """Save HTML to a temp file and return its path."""
    safe_title = title.lower().replace(" ", "-").replace("/", "-")[:40]
    path = Path(tempfile.gettempdir()) / f"kiki-pi-one-{safe_title}.html"
    full_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title></head>
<body>
{html}
</body></html>"""
    path.write_text(full_html)
    return str(path)


def update_frontmatter_status(path: str):
    """Mark article as 'ready' in frontmatter."""
    post = frontmatter.load(path)
    if post.get("status") == "draft":
        post["status"] = "ready"
        with open(path, "wb") as f:
            frontmatter.dump(post, f)
        print(f"  Marked as 'ready' in frontmatter")


def prepare_for(target: str, post: frontmatter.Post, html: str):
    """Prepare and open a single target."""
    title = post.get("title", "Untitled")
    tags  = post.get("tags", [])

    # WordPress gets styled wrapper; Medium gets plain HTML
    output_html = wrap_for_wordpress(html) if target == "wordpress" else html

    print(f"\n── {target.upper()} ─────────────────────────────")
    print(f"  Title : {title}")
    print(f"  Tags  : {', '.join(tags)}")

    # Save HTML to temp file (preview reflects target styling)
    html_path = save_html(output_html, title)
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
    3. In the body: click the + block → choose "Custom HTML" block → paste
       (or switch to Code Editor view: Ctrl+Shift+Alt+M)
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
    post, html = load_article(str(path))

    targets = ["medium", "wordpress"] if args.target == "both" else [args.target]
    for target in targets:
        prepare_for(target, post, html)

    update_frontmatter_status(str(path))
    print("\nDone. Paste the content and publish!")


if __name__ == "__main__":
    main()
