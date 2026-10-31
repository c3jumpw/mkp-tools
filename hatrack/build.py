#!/usr/bin/env python3
"""Bundle src/ into a single index.html (no build tools needed to run the app)."""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
css = (src / "styles.css").read_text()
js = "\n".join((p.read_text()) for p in sorted((src / "js").glob("*.js")))
shell = (src / "shell.html").read_text()
out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
(root / "index.html").write_text(out)
print(f"index.html  {len(out)/1024:.1f} KB")
