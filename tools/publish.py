#!/usr/bin/env python3
"""
publish.py — Dual-publish Markdown articles to Medium and WordPress

Usage:
    python tools/publish.py articles/00-isa-spec.md --target medium
    python tools/publish.py articles/01-registers.md --target wordpress
    python tools/publish.py articles/01-registers.md --target both
    python tools/publish.py articles/01-registers.md --target both --dry-run

Environment variables (store in .env, never commit):
    MEDIUM_TOKEN        — Medium integration token
                          Get from: https://medium.com/me/settings → Integration tokens
    WP_URL              — WordPress site URL, e.g. https://sreejits.com
    WP_USER             — WordPress username
    WP_APP_PASSWORD     — WordPress Application Password
                          Get from: WP Admin → Users → Profile → Application Passwords

Dependencies:
    pip install python-frontmatter requests markdown python-dotenv
"""

import argparse
import json
import os
import sys
from pathlib import Path

import frontmatter
import markdown
import requests
from dotenv import load_dotenv

load_dotenv()


# ── Helpers ──────────────────────────────────────────────────────────────────

def load_article(path: str) -> tuple[frontmatter.Post, str]:
    """Load a markdown file, return (post, html_body)."""
    post = frontmatter.load(path)
    html = markdown.markdown(
        post.content,
        extensions=["tables", "fenced_code", "codehilite", "toc"],
    )
    return post, html


def update_frontmatter(path: str, key: str, value: str):
    """Write a URL back into the article frontmatter after publishing."""
    post = frontmatter.load(path)
    post[key] = value
    with open(path, "wb") as f:
        frontmatter.dump(post, f)
    print(f"  Updated {key} in {path}")


# ── Medium ───────────────────────────────────────────────────────────────────

def publish_to_medium(post: frontmatter.Post, html: str, dry_run: bool) -> str | None:
    """Publish to Medium via the v1 API. Returns the published URL."""
    token = os.getenv("MEDIUM_TOKEN")
    if not token:
        print("[ERROR] MEDIUM_TOKEN not set in environment")
        sys.exit(1)

    # Get the author's user ID
    me = requests.get(
        "https://api.medium.com/v1/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    me.raise_for_status()
    author_id = me.json()["data"]["id"]

    payload = {
        "title": post.get("title", "Untitled"),
        "contentFormat": "html",
        "content": html,
        "tags": post.get("tags", [])[:5],  # Medium allows max 5 tags
        "publishStatus": "draft",  # always draft first — review before publishing
    }

    if dry_run:
        print("[DRY RUN] Medium payload:")
        print(json.dumps(payload, indent=2))
        return None

    resp = requests.post(
        f"https://api.medium.com/v1/users/{author_id}/posts",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    url = resp.json()["data"]["url"]
    print(f"[Medium] Draft created: {url}")
    return url


# ── WordPress ─────────────────────────────────────────────────────────────────

def publish_to_wordpress(post: frontmatter.Post, html: str, dry_run: bool) -> str | None:
    """Publish to WordPress via the REST API. Returns the post URL."""
    wp_url = os.getenv("WP_URL", "").rstrip("/")
    wp_user = os.getenv("WP_USER")
    wp_password = os.getenv("WP_APP_PASSWORD")

    if not all([wp_url, wp_user, wp_password]):
        print("[ERROR] WP_URL, WP_USER, WP_APP_PASSWORD must all be set")
        sys.exit(1)

    payload = {
        "title": post.get("title", "Untitled"),
        "content": html,
        "status": "draft",  # always draft first
        "tags": _get_wp_tag_ids(wp_url, wp_user, wp_password, post.get("tags", [])),
    }

    if dry_run:
        print("[DRY RUN] WordPress payload:")
        print(json.dumps({**payload, "tags": post.get("tags", [])}, indent=2))
        return None

    resp = requests.post(
        f"{wp_url}/wp-json/wp/v2/posts",
        auth=(wp_user, wp_password),
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    url = resp.json()["link"]
    print(f"[WordPress] Draft created: {url}")
    return url


def _get_wp_tag_ids(wp_url: str, user: str, password: str, tag_names: list[str]) -> list[int]:
    """Resolve tag names to WordPress tag IDs, creating tags that don't exist."""
    ids = []
    for name in tag_names:
        # Search for existing tag
        search = requests.get(
            f"{wp_url}/wp-json/wp/v2/tags",
            auth=(user, password),
            params={"search": name},
            timeout=10,
        )
        results = search.json()
        if results:
            ids.append(results[0]["id"])
        else:
            # Create it
            create = requests.post(
                f"{wp_url}/wp-json/wp/v2/tags",
                auth=(user, password),
                json={"name": name},
                timeout=10,
            )
            ids.append(create.json()["id"])
    return ids


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Publish article to Medium and/or WordPress")
    parser.add_argument("article", help="Path to the article markdown file")
    parser.add_argument(
        "--target",
        choices=["medium", "wordpress", "both"],
        required=True,
        help="Publishing target",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the payload without actually publishing",
    )
    args = parser.parse_args()

    path = Path(args.article)
    if not path.exists():
        print(f"[ERROR] File not found: {path}")
        sys.exit(1)

    print(f"Loading {path}...")
    post, html = load_article(str(path))

    print(f"Title: {post.get('title', '(no title)')}")
    print(f"Status in file: {post.get('status', 'draft')}")

    if args.target in ("medium", "both"):
        url = publish_to_medium(post, html, args.dry_run)
        if url and not args.dry_run:
            update_frontmatter(str(path), "medium_url", url)

    if args.target in ("wordpress", "both"):
        url = publish_to_wordpress(post, html, args.dry_run)
        if url and not args.dry_run:
            update_frontmatter(str(path), "wordpress_url", url)

    print("Done.")


if __name__ == "__main__":
    main()
