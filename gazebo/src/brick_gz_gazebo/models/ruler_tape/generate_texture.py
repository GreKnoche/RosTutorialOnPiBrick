#!/usr/bin/env python3
"""Paint a 1.2 m tape. World x = 0 is the 0 cm tick (axle start)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LENGTH_M = 1.2
WIDTH_M = 0.14
PX_PER_M = 2000
W = int(round(LENGTH_M * PX_PER_M))
H = int(round(WIDTH_M * PX_PER_M))
TARGET_M = 1.0

YELLOW = (245, 206, 48, 255)
YELLOW_EDGE = (228, 186, 28, 255)
INK = (28, 24, 20, 255)
ORANGE = (251, 146, 60, 255)
ORANGE_SOFT = (253, 186, 116, 255)
WHITE = (250, 248, 244, 255)

FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
)


def _font(size: int) -> ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _x(metres: float) -> int:
    return int(round(metres * PX_PER_M))


def main() -> None:
    img = Image.new("RGBA", (W, H), YELLOW)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W - 1, 10), fill=YELLOW_EDGE)
    draw.rectangle((0, H - 11, W - 1, H - 1), fill=YELLOW_EDGE)

    number = _font(36)
    unit = _font(22)
    metre = _font(32)

    x1 = _x(TARGET_M)
    draw.rectangle((x1 - 2, 0, x1 + 2, H - 1), fill=ORANGE_SOFT)

    for cm in range(0, int(LENGTH_M * 100) + 1):
        x = min(_x(cm / 100), W - 1)
        at_target = cm == int(TARGET_M * 100)
        if cm % 10 == 0:
            length = 64 if at_target else 46
            width = 6 if at_target else 3
            color = ORANGE if at_target else INK
        elif cm % 5 == 0:
            length, width, color = 32, 2, INK
        else:
            length, width, color = 18, 1, INK
        x0 = max(0, x - width // 2)
        x1_tick = min(W - 1, x0 + width)
        draw.rectangle((x0, 0, x1_tick, length), fill=color)
        draw.rectangle((x0, H - 1 - length, x1_tick, H - 1), fill=color)
        if cm % 10 != 0:
            continue
        label = "1 m" if at_target else str(cm)
        font = metre if at_target else number
        fill = ORANGE if at_target else INK
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = min(max(x - tw // 2, 4), W - tw - 4)
        if at_target:
            tx = min(max(x - tw - 10, 4), W - tw - 4)
        ty = (H - th) // 2 - 2
        draw.text((tx, ty), label, font=font, fill=fill)

    cm_label = "cm"
    cm_font = unit
    bbox = draw.textbbox((0, 0), cm_label, font=cm_font)
    tw = bbox[2] - bbox[0]
    draw.text((_x(1.12) - tw // 2, 12), cm_label, font=cm_font, fill=INK)

    draw.line((0, 0, 0, H - 1), fill=WHITE, width=6)
    draw.line((0, 0, 0, H - 1), fill=ORANGE, width=3)

    out = Path(__file__).with_name("materials") / "textures" / "ruler.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out, optimize=True)
    print(f"wrote {out}  {W}x{H}  0 cm at x=0, 100 cm at x={TARGET_M:.2f} m")


if __name__ == "__main__":
    main()
