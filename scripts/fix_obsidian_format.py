"""Fix Obsidian markdown formatting issues in B2 speaking-material notes.

Fixes:
1. tags JSON array -> YAML list format
2. [[../../B2高频词/...] -> [[B2高频词/...] (absolute from vault root)
"""
import io
import os
import re
import sys

# Fix Windows GBK encoding issue
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VAULT_ROOT = r"D:\MyStudySpace\俄语笔记库"
B2_DIR = os.path.join(VAULT_ROOT, "B2口语素材")

dry_run = "--dry-run" in sys.argv


def fix_tags_yaml(content: str) -> str:
    """Convert tags: ["a", "b", "c"] to YAML list format."""
    def replacer(match):
        items_str = match.group(1)
        items = re.findall(r'"([^"]*)"', items_str)
        if not items:
            return match.group(0)
        yaml_tags = "tags:\n"
        for item in items:
            yaml_tags += f"  - {item}\n"
        return yaml_tags.rstrip("\n")

    return re.sub(r'^tags:\s*\[([^\]]+)\]', replacer, content, flags=re.MULTILINE)


def fix_wikilinks(content: str) -> str:
    """Fix [[../../B2高频词/xxx|yyy]] -> [[B2高频词/xxx|yyy]]."""
    return content.replace("[[../../B2高频词/", "[[B2高频词/")


def process_file(filepath: str) -> tuple:
    changes = []
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    content = original

    fixed_tags = fix_tags_yaml(content)
    if fixed_tags != content:
        changes.append("tags")
        content = fixed_tags

    fixed_links = fix_wikilinks(content)
    if fixed_links != content:
        changes.append("wikilinks")
        content = fixed_links

    if changes and not dry_run:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    return bool(changes), changes


def main():
    file_count = 0
    tag_fix_count = 0
    link_fix_count = 0

    for root, dirs, files in os.walk(B2_DIR):
        for filename in files:
            if not filename.endswith(".md"):
                continue
            filepath = os.path.join(root, filename)
            file_count += 1
            changed, material = process_file(filepath)

            if changed:
                rel = os.path.relpath(filepath, VAULT_ROOT)
                if "tags" in material:
                    tag_fix_count += 1
                if "wikilinks" in material:
                    link_fix_count += 1
                if dry_run:
                    name = rel.encode('ascii', 'replace').decode('ascii')
                    print(f"  [DRY RUN] {name}: {', '.join(material)}")

    mode = "DRY RUN -- would fix" if dry_run else "Fixed"
    print(f"\n{mode}:")
    print(f"  Total files scanned: {file_count}")
    print(f"  Tags JSON->YAML:     {tag_fix_count}")
    print(f"  Wikilink fix:        {link_fix_count}")


if __name__ == "__main__":
    main()
