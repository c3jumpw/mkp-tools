"""
Signage-style exercise pictograms for the guide's demo data.

They stand in for the camera-roll photos a real user adds, so screenshots show
thumbnails and photo sequences rather than empty tiles. They are plainly
illustrations, drawn in the app's own chalk-on-charcoal.

    python3 guide-capture/draw-illustrations.py   # rewrites guide-capture/illustrations/*.svg
"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "illustrations")
os.makedirs(OUT, exist_ok=True)

W, H = 400, 300
FLOOR = 262
BG = "#1a1f1d"
FLOOR_C = "#2f3633"
NEAR = "#ecf1ee"
FAR = "#7f8883"
GEAR = "#5d6661"
GEAR_LIGHT = "#8b948f"
LIMB = 13
TORSO = 17


def line(points, color, width):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return (f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')


def head(c, r=17, color=NEAR):
    return f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="{color}"/>'


def svg(body):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
             f'<rect width="{W}" height="{H}" fill="{BG}"/>',
             f'<line x1="24" y1="{FLOOR + 2}" x2="{W - 24}" y2="{FLOOR + 2}" stroke="{FLOOR_C}" '
             f'stroke-width="4" stroke-linecap="round"/>']
    parts += body
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


def write(name, body):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(svg(body))


def kettlebell(c, r=15):
    x, y = c
    return (f'<path d="M{x - 9} {y - r + 2} q 9 -16 18 0" fill="none" stroke="{GEAR_LIGHT}" stroke-width="5" '
            f'stroke-linecap="round"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{GEAR_LIGHT}"/>')


# --- Goblet squat: three frames, standing to the bottom of the squat -------
goblet = [
    dict(head=(204, 56), neck=(200, 84), hip=(196, 148), knee=(198, 202), ankle=(196, 256), toe=(222, 260),
         elbow=(213, 120), hand=(232, 92), bell=(240, 106)),
    dict(head=(203, 94), neck=(193, 120), hip=(170, 182), knee=(218, 208), ankle=(198, 256), toe=(224, 260),
         elbow=(208, 154), hand=(229, 125), bell=(236, 137)),
    dict(head=(208, 136), neck=(196, 158), hip=(168, 216), knee=(222, 212), ankle=(200, 256), toe=(226, 260),
         elbow=(209, 193), hand=(230, 164), bell=(236, 176)),
]
for i, p in enumerate(goblet, 1):
    far_leg = [(x - 11, y) for x, y in (p["hip"], p["knee"], p["ankle"], p["toe"])]
    write(f"goblet-{i}.svg", [
        line(far_leg, FAR, LIMB),
        line([p["hip"], p["neck"]], NEAR, TORSO),
        line([p["hip"], p["knee"], p["ankle"], p["toe"]], NEAR, LIMB),
        head(p["head"]),
        kettlebell(p["bell"]),
        line([p["neck"], p["elbow"], p["hand"]], NEAR, LIMB),
    ])

# --- Bench press: lying on a bench, bar locked out --------------------------
write("bench-1.svg", [
    f'<rect x="112" y="200" width="196" height="14" rx="5" fill="{GEAR}"/>',
    f'<line x1="134" y1="214" x2="134" y2="{FLOOR}" stroke="{GEAR}" stroke-width="9" stroke-linecap="round"/>',
    f'<line x1="286" y1="214" x2="286" y2="{FLOOR}" stroke="{GEAR}" stroke-width="9" stroke-linecap="round"/>',
    line([(262, 190), (304, 196), (320, 254), (344, 258)], FAR, LIMB),
    line([(160, 188), (262, 190)], NEAR, TORSO),
    line([(262, 190), (312, 198), (326, 254), (350, 258)], NEAR, LIMB),
    head((138, 182)),
    line([(178, 186), (182, 146), (184, 112)], NEAR, LIMB),
    f'<circle cx="184" cy="98" r="30" fill="none" stroke="{GEAR_LIGHT}" stroke-width="9"/>',
    f'<circle cx="184" cy="98" r="7" fill="{GEAR_LIGHT}"/>',
])

# --- Mountain climbers: plank on the hands, near knee driven in -------------
write("mountain-1.svg", [
    line([(204, 196), (148, 226), (102, 248), (94, 262)], FAR, LIMB),
    line([(282, 176), (288, 220), (292, 262)], FAR, LIMB),
    line([(204, 196), (282, 176)], NEAR, TORSO),
    line([(204, 196), (252, 222), (212, 244), (204, 260)], NEAR, LIMB),
    line([(282, 176), (294, 218), (300, 262)], NEAR, LIMB),
    head((304, 160)),
])

# --- Plank hold: forearms down, body in one line ----------------------------
write("plank-1.svg", [
    line([(194, 212), (146, 228), (102, 246), (94, 262)], FAR, LIMB),
    line([(276, 202), (268, 254), (306, 258)], FAR, LIMB),
    line([(194, 212), (276, 202)], NEAR, TORSO),
    line([(194, 212), (150, 230), (106, 248), (100, 262)], NEAR, LIMB),
    line([(280, 202), (278, 256), (318, 258)], NEAR, LIMB),
    head((302, 186)),
])

# --- Box jumps: landing on the box, the arc of the jump behind --------------
write("boxjump-1.svg", [
    f'<path d="M96 254 Q 150 96 236 196" fill="none" stroke="{FAR}" stroke-width="5" '
    f'stroke-dasharray="2 14" stroke-linecap="round"/>',
    f'<rect x="196" y="212" width="132" height="50" rx="6" fill="{GEAR}"/>',
    line([(229, 140), (273, 166), (247, 206), (271, 210)], FAR, LIMB),
    line([(262, 80), (282, 112), (306, 98)], FAR, LIMB),
    line([(240, 140), (262, 80)], NEAR, TORSO),
    line([(240, 140), (284, 166), (258, 206), (282, 210)], NEAR, LIMB),
    line([(262, 80), (290, 108), (318, 96)], NEAR, LIMB),
    head((272, 54)),
])

# --- Lateral shuffles: front view, athletic stance, between two cones -------
shuffle = []
for cx in (74, 326):
    shuffle.append(f'<path d="M{cx - 14} {FLOOR} L{cx} {FLOOR - 34} L{cx + 14} {FLOOR} Z" fill="{GEAR_LIGHT}"/>')
shuffle += [
    line([(200, 104), (164, 140), (152, 172)], NEAR, LIMB),
    line([(200, 104), (236, 140), (248, 172)], NEAR, LIMB),
    line([(200, 94), (200, 162)], NEAR, TORSO),
    line([(200, 162), (166, 202), (150, 254), (136, 258)], NEAR, LIMB),
    line([(200, 162), (234, 202), (250, 254), (264, 258)], NEAR, LIMB),
    head((200, 68)),
]
for x, d in ((116, -1), (284, 1)):
    for k in (0, 16):
        xx = x + d * k
        shuffle.append(f'<polyline points="{xx - 6 * d},150 {xx + 6 * d},162 {xx - 6 * d},174" fill="none" '
                       f'stroke="{FAR}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>')
write("shuffle-1.svg", shuffle)

print("\n".join(sorted(os.listdir(OUT))))
