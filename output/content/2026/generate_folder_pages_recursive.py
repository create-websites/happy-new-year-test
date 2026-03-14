# generate_folder_pages.py

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin


def slug_to_title(slug: str) -> str:
    words = re.split(r"[-_]+", slug)
    return " ".join(word.capitalize() for word in words if word)


def extract_match(content: str, pattern: str) -> str:
    match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def strip_html(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<!--[\s\S]*?-->", " ", html)
    html = re.sub(r"<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html).strip()
    return html


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_title(content: str, file_stem: str) -> str:
    return (
        extract_match(content, r"<title>(.*?)</title>")
        or extract_match(content, r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']')
        or extract_match(content, r'<meta\s+name=["\']title["\']\s+content=["\'](.*?)["\']')
        or slug_to_title(file_stem)
    )


def extract_description(content: str, title: str) -> str:
    meta_desc = (
        extract_match(content, r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']')
        or extract_match(content, r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']')
    )
    if meta_desc:
        return normalize_spaces(meta_desc)

    text = strip_html(content)
    if not text:
        return f"Explore {title} with useful information, ideas, and celebration tips."

    snippet = text[:160]
    if len(text) > 160:
        snippet = snippet.rsplit(" ", 1)[0] + "..."
    return normalize_spaces(snippet)


def extract_keywords(content: str, fallback_text: str, file_stem: str, max_keywords: int) -> list[str]:
    meta_keywords = extract_match(
        content,
        r'<meta\s+name=["\']keywords["\']\s+content=["\'](.*?)["\']'
    )
    if meta_keywords:
        return [k.strip() for k in meta_keywords.split(",") if k.strip()]

    stopwords = {
        "the", "and", "for", "with", "that", "this", "from", "have", "your", "you",
        "are", "was", "were", "will", "into", "about", "their", "they", "them",
        "how", "what", "when", "where", "why", "can", "all", "our", "but", "not",
        "has", "had", "more", "than", "use", "guide", "page", "home", "best",
        "top", "new", "get", "make", "also", "some", "any", "many", "over",
        "festival", "celebration"
    }

    words = re.findall(r"[a-zA-Z][a-zA-Z\-']+", fallback_text.lower())
    counts = Counter(word for word in words if len(word) > 2 and word not in stopwords)

    slug_words = [w.lower() for w in re.split(r"[-_]+", file_stem) if w]
    keywords = []

    for word in slug_words:
        if word not in keywords:
            keywords.append(word)

    for word, _ in counts.most_common(max_keywords * 3):
        if word not in keywords:
            keywords.append(word)
        if len(keywords) >= max_keywords:
            break

    return keywords[:max_keywords]


def infer_category(file_name: str, relative_path: str, content: str) -> str:
    meta_category = extract_match(
        content,
        r'<meta\s+name=["\']category["\']\s+content=["\'](.*?)["\']'
    )
    if meta_category:
        return meta_category

    target = f"{relative_path} {file_name}".lower()

    if "wishes" in target:
        return "Wishes"
    if "guide" in target:
        return "Festival Guide"
    if "ideas" in target:
        return "Celebration Ideas"
    if "significance" in target or "meaning" in target:
        return "Spiritual Festival"
    if "quotes" in target:
        return "Quotes"
    if "messages" in target:
        return "Messages"

    parts = Path(relative_path).parts
    if parts:
        return parts[0].replace("-", " ").replace("_", " ").title()

    return "General"


def extract_image(content: str) -> str:
    return (
        extract_match(content, r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']')
        or extract_match(content, r'<meta\s+name=["\']twitter:image["\']\s+content=["\'](.*?)["\']')
        or ""
    )


def infer_image(relative_html_path: Path, image_folder_name: str) -> str:
    stem = relative_html_path.stem
    parent = relative_html_path.parent

    candidates = [
        parent / image_folder_name / f"{stem}.jpg",
        parent / image_folder_name / f"{stem}.jpeg",
        parent / image_folder_name / f"{stem}.png",
        parent / image_folder_name / f"{stem}.webp",
        parent / f"{stem}.jpg",
        parent / f"{stem}.jpeg",
        parent / f"{stem}.png",
        parent / f"{stem}.webp",
    ]

    for candidate in candidates:
        return "/" + str(candidate).replace("\\", "/")

    return ""


def build_url(relative_html_path: Path, base_url: str | None) -> str:
    rel = str(relative_html_path).replace("\\", "/")
    rel_url = "/" + rel
    if base_url:
        return urljoin(base_url.rstrip("/") + "/", rel)
    return rel_url


def build_entry(file_path: Path, input_folder: Path, base_url: str | None, max_keywords: int, image_folder_name: str) -> dict:
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    relative_path = file_path.relative_to(input_folder)
    relative_parent = str(relative_path.parent).replace("\\", "/")
    file_stem = file_path.stem

    title = extract_title(content, file_stem)
    description = extract_description(content, title)
    text = strip_html(content)
    keywords = extract_keywords(content, text, file_stem, max_keywords)
    category = infer_category(file_path.name, relative_parent, content)

    image = extract_image(content)
    if not image:
        image = infer_image(relative_path, image_folder_name)

    entry = {
        "id": str(relative_path.with_suffix("")).replace("\\", "/"),
        "title": title,
        "url": build_url(relative_path, base_url),
        "category": category,
        "description": description,
        "keywords": keywords,
    }

    if image:
        entry["image"] = image

    return entry


def build_search_index(entries: list[dict]) -> list[dict]:
    search_index = []
    for entry in entries:
        search_index.append({
            "id": entry["id"],
            "title": entry["title"],
            "url": entry["url"],
            "category": entry.get("category", ""),
            "description": entry.get("description", ""),
            "keywords": entry.get("keywords", []),
        })
    return search_index


def build_category_index(entries: list[dict]) -> dict:
    categories = {}
    for entry in entries:
        category = entry.get("category", "General")
        categories.setdefault(category, []).append({
            "id": entry["id"],
            "title": entry["title"],
            "url": entry["url"],
        })

    for category in categories:
        categories[category] = sorted(categories[category], key=lambda x: x["title"].lower())

    return dict(sorted(categories.items(), key=lambda x: x[0].lower()))


def parse_args():
    parser = argparse.ArgumentParser(description="Generate folder-pages.json and search indexes from HTML files")
    parser.add_argument("--input_folder", required=True, help="Folder containing HTML files")
    parser.add_argument("--output_file", required=True, help="Output JSON file path")
    parser.add_argument("--base_url", default="", help="Optional base URL, e.g. https://example.com")
    parser.add_argument("--recursive", action="store_true", help="Scan subfolders recursively")
    parser.add_argument("--search_index_file", default="", help="Optional search index JSON output path")
    parser.add_argument("--category_index_file", default="", help="Optional category index JSON output path")
    parser.add_argument("--max_keywords", type=int, default=8, help="Maximum generated keywords")
    parser.add_argument("--image_folder_name", default="images", help="Folder name to check for matching images")
    return parser.parse_args()


def main():
    args = parse_args()

    input_folder = Path(args.input_folder)
    output_file = Path(args.output_file)
    base_url = args.base_url.strip() or None

    if not input_folder.exists() or not input_folder.is_dir():
        raise FileNotFoundError(f"Folder not found: {input_folder}")

    pattern = "**/*.html" if args.recursive else "*.html"
    html_files = sorted(input_folder.glob(pattern))

    entries = [
        build_entry(
            file_path=file_path,
            input_folder=input_folder,
            base_url=base_url,
            max_keywords=args.max_keywords,
            image_folder_name=args.image_folder_name,
        )
        for file_path in html_files
    ]

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")

    if args.search_index_file:
        search_index_file = Path(args.search_index_file)
        search_index_file.parent.mkdir(parents=True, exist_ok=True)
        search_index = build_search_index(entries)
        search_index_file.write_text(json.dumps(search_index, indent=2, ensure_ascii=False), encoding="utf-8")

    if args.category_index_file:
        category_index_file = Path(args.category_index_file)
        category_index_file.parent.mkdir(parents=True, exist_ok=True)
        category_index = build_category_index(entries)
        category_index_file.write_text(json.dumps(category_index, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Generated {output_file} with {len(entries)} pages.")
    if args.search_index_file:
        print(f"Generated {args.search_index_file}")
    if args.category_index_file:
        print(f"Generated {args.category_index_file}")


if __name__ == "__main__":
    main()