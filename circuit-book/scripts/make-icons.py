#!/usr/bin/env python3
"""
Generate the Circuit Book app icons.

The mark is the station strip from the session screen: a row of bars, the first
two filled because you are partway through the circuit. It is the same shape the
user watches fill during a workout, so the icon and the progress indicator are
the same idea at two sizes.
"""

from pathlib import Path
from PIL import Image, ImageDraw

BASE = "#0e1110"
LIME = "#c9ff46"
DIM = "#333b37"

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

SS = 4  # supersample factor, for clean corners at every output size


def rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def render(size: int, *, maskable: bool = False, transparent_bg: bool = False) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if not transparent_bg:
        if maskable:
            # A maskable icon gets cropped to whatever shape the OS wants, so the
            # background runs edge to edge and the mark sits inside the safe area.
            d.rectangle([0, 0, s, s], fill=BASE)
        else:
            rounded(d, [0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BASE)

    # Maskable icons must keep their content within the middle 80%; the visible
    # square can use more of the tile.
    content = 0.52 if maskable else 0.62
    bar_count = 4
    gap_ratio = 0.34

    total_w = s * content
    unit = total_w / (bar_count + (bar_count - 1) * gap_ratio)
    gap = unit * gap_ratio
    bar_h = total_w * 0.78

    x0 = (s - total_w) / 2
    y0 = (s - bar_h) / 2
    radius = max(1, int(unit * 0.22))

    for i in range(bar_count):
        x = x0 + i * (unit + gap)
        fill = LIME if i < 2 else DIM
        rounded(d, [x, y0, x + unit, y0 + bar_h], radius=radius, fill=fill)

    return img.resize((size, size), Image.LANCZOS)


def main():
    render(192).save(OUT / "icon-192.png")
    render(512).save(OUT / "icon-512.png")
    render(512, maskable=True).save(OUT / "icon-maskable-512.png")
    # iOS applies its own rounding and does not honour transparency, so the
    # apple icon keeps a filled square.
    render(180).save(OUT / "apple-touch-icon.png")
    render(32).save(OUT / "favicon-32.png")

    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Circuit Book">
  <rect width="64" height="64" rx="14" fill="#0e1110"/>
  <rect x="12" y="17" width="7.5" height="30" rx="1.8" fill="#c9ff46"/>
  <rect x="23.5" y="17" width="7.5" height="30" rx="1.8" fill="#c9ff46"/>
  <rect x="35" y="17" width="7.5" height="30" rx="1.8" fill="#333b37"/>
  <rect x="46.5" y="17" width="7.5" height="30" rx="1.8" fill="#333b37"/>
</svg>
"""
    (OUT / "icon.svg").write_text(svg)
    print("wrote icons to", OUT)


if __name__ == "__main__":
    main()
