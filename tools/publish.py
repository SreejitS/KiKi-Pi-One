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
    pip install python-frontmatter markdown
"""

import argparse
import subprocess
import sys
import tempfile
import webbrowser
from pathlib import Path

import frontmatter
import markdown


EDITOR_URLS = {
    "medium": "https://medium.com/new-story",
    "wordpress": "https://sreejits.com/wp-admin/post-new.php",
}


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
        extensions=["tables", "fenced_code", "toc"],
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

    print(f"\n── {target.upper()} ─────────────────────────────")
    print(f"  Title : {title}")
    print(f"  Tags  : {', '.join(tags)}")

    # Save HTML to temp file
    html_path = save_html(html, title)
    print(f"  HTML  : {html_path}")

    # Copy to clipboard
    copied = copy_to_clipboard(html)
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
