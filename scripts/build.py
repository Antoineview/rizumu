"""Package the dependency-free website into a portable ZIP."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
output = root / "dist" / "rizumu.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for name in ("index.html", "style.css", "script.js"):
        archive.write(root / name, arcname=name)
with ZipFile(output) as archive:
    assert archive.testzip() is None, "ZIP integrity check failed"
print(f"Built {output}")
