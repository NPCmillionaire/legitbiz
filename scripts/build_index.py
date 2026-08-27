#!/usr/bin/env python3
"""Build search.db: an FTS5 full-text index of this Zola site's content."""

import re
import sqlite3
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DB_PATH = ROOT / "search.db"
BASE_URL = "http://legitbiz.xyz"


def parse_frontmatter(text):
    m = re.match(r"^\+\+\+\n(.*?\n)\+\+\+\n?(.*)$", text, re.DOTALL)
    if not m:
        return {}, text
    front, body = m.group(1), m.group(2)
    return tomllib.loads(front), body.strip()


def strip_markdown(body):
    body = re.sub(r"```.*?```", " ", body, flags=re.DOTALL)
    body = re.sub(r"`([^`]*)`", r"\1", body)
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", body)
    body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)
    body = re.sub(r"^#+\s*", "", body, flags=re.MULTILINE)
    body = re.sub(r"[*_>#-]", " ", body)
    return re.sub(r"\s+", " ", body).strip()


def collect_docs():
    docs = []

    for path in sorted((CONTENT / "posts").glob("*.md")):
        if path.name == "_index.md":
            continue
        meta, body = parse_frontmatter(path.read_text())
        slug = path.stem
        docs.append({
            "type": "post",
            "source_path": str(path.relative_to(ROOT)),
            "title": meta.get("title", slug),
            "date": str(meta.get("date", "")),
            "url": f"{BASE_URL}/posts/{slug}/",
            "body": strip_markdown(body),
        })

    for path in sorted(CONTENT.glob("*.md")):
        if path.name in ("_index.md", "status.md"):
            continue
        meta, body = parse_frontmatter(path.read_text())
        url_path = meta.get("path", path.stem)
        docs.append({
            "type": "page",
            "source_path": str(path.relative_to(ROOT)),
            "title": meta.get("title", path.stem),
            "date": "",
            "url": f"{BASE_URL}/{url_path}/",
            "body": strip_markdown(body),
        })

    return docs


def build(docs):
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE documents (
            id INTEGER PRIMARY KEY,
            type TEXT NOT NULL,
            source_path TEXT NOT NULL,
            title TEXT NOT NULL,
            date TEXT,
            url TEXT NOT NULL,
            body TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE VIRTUAL TABLE documents_fts USING fts5(
            title, body, content='documents', content_rowid='id'
        )
    """)
    conn.executescript("""
        CREATE TRIGGER documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
        END;
        CREATE TRIGGER documents_ad AFTER DELETE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
        END;
        CREATE TRIGGER documents_au AFTER UPDATE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
            INSERT INTO documents_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
        END;
    """)

    for d in docs:
        conn.execute(
            "INSERT INTO documents (type, source_path, title, date, url, body) VALUES (?, ?, ?, ?, ?, ?)",
            (d["type"], d["source_path"], d["title"], d["date"], d["url"], d["body"]),
        )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    docs = collect_docs()
    build(docs)
    print(f"indexed {len(docs)} documents -> {DB_PATH}")
