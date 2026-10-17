#!/usr/bin/env python3
"""Subset Fusion Pixel 12px (zh_hans, OFL) to the characters the site actually renders.

Run after changing any UI copy:  python3 scripts/subset-pixel-font.py
Source:  assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2 (full font, not shipped)
Output:  src/styles/fonts/fusion-pixel-12-subset.woff2 (bundled by Next via tokens.css)
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2"
OUT = ROOT / "src/styles/fonts/fusion-pixel-12-subset.woff2"

chars = set(chr(c) for c in range(0x20, 0x7F))  # printable ASCII
chars |= set("·—–…“”‘’「」『』《》、。，：；！？（）【】￥×▸▾▶◀■□●○✓✗→←↑↓¥%")
for path in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
    text = path.read_text(encoding="utf-8")
    chars |= {ch for ch in text if ord(ch) > 0x7F and not ch.isspace()}
chars = {ch for ch in chars if not re.match(r"[\U0001F000-\U0001FFFF]", ch)}

text_file = ROOT / "node_modules/.cache/pixel-font-chars.txt"
text_file.parent.mkdir(parents=True, exist_ok=True)
text_file.write_text("".join(sorted(chars)), encoding="utf-8")
subprocess.run(
    [
        "pyftsubset",
        str(SRC),
        f"--text-file={text_file}",
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
        f"--output-file={OUT}",
    ],
    check=True,
)
print(f"{len(chars)} glyph candidates -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)", file=sys.stderr)
