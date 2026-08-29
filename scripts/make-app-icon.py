"""Empaqueta los PNG de scripts/_iconbuild/ en favicon.ico + tray-icon.ico.
Correr después de `electron scripts/make-app-icon.js`. Ver npm run make-icon."""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
BUILD = os.path.join(os.path.dirname(__file__), "_iconbuild")
SIZES = [16, 24, 32, 48, 64, 128, 256]

imgs = [Image.open(os.path.join(BUILD, f"icon-{s}.png")).convert("RGBA") for s in SIZES]
base = imgs[-1]
for name in ("favicon.ico", "tray-icon.ico"):
    p = os.path.join(ROOT, name)
    base.save(p, format="ICO", sizes=[(s, s) for s in SIZES], append_images=imgs[:-1])
    print(name, os.path.getsize(p), "bytes")

# copia servible
import shutil
shutil.copy(os.path.join(ROOT, "favicon.ico"), os.path.join(ROOT, "public", "favicon.ico"))
print("public/favicon.ico copiado")
