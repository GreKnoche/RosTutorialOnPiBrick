#!/usr/bin/env python3
"""Generate a 10x10 m grass + curvy-loop texture for brick_relief.sdf.

No painted center strip. The 3D kerbs stay in the world. The loop is an
elongated circuit with extra corners so it is not a stadium oval.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt

SIZE_M = 10.0
CX, CY = 1.15, 0.0
RES = 2048
TRACK_W = 0.72
LINE_W = 0.035
N_PATH = 480


def _noise(shape, rng, scale, octaves=4):
    acc = np.zeros(shape, dtype=np.float32)
    amp = 1.0
    total = 0.0
    h, w = shape
    for o in range(octaves):
        ny = max(2, h // (16 * (2**o)))
        nx = max(2, w // (16 * (2**o)))
        grid = rng.random((ny, nx), dtype=np.float32)
        sampled = np.array(
            Image.fromarray(grid, mode="F").resize((w, h), Image.BILINEAR)
        )
        acc += sampled * amp
        total += amp
        amp *= 0.5
    return (acc / total) * scale


def _world_to_px(xw, yw):
    u = (xw - (CX - SIZE_M / 2)) / SIZE_M * (RES - 1)
    v = ((CY + SIZE_M / 2) - yw) / SIZE_M * (RES - 1)
    return float(u), float(v)


def _path_xy():
    theta = np.linspace(0.0, 2.0 * np.pi, N_PATH, endpoint=True)
    a_ex, b_ex = 1.45, 0.62
    r_ex = (a_ex * b_ex) / np.sqrt(
        (b_ex * np.cos(theta)) ** 2 + (a_ex * np.sin(theta)) ** 2
    )
    r = (
        1.68
        + 0.40 * (0.5 + 0.5 * np.cos(2.0 * theta))
        + 0.28 * np.sin(3.0 * theta)
        + 0.16 * np.sin(5.0 * theta + 0.7)
        + 0.10 * np.sin(7.0 * theta + 1.1)
    )
    r = np.maximum(r, r_ex + TRACK_W * 0.5 + 0.20)
    x = CX + r * np.cos(theta)
    y = CY + r * np.sin(theta)
    return x, y


def _px_width(metres):
    return max(2, int(round(metres / SIZE_M * RES)))


def main():
    rng = np.random.default_rng(7)

    grass_n = _noise((RES, RES), rng, 1.0)
    dirt_n = _noise((RES, RES), np.random.default_rng(11), 1.0)
    asp_n = _noise((RES, RES), np.random.default_rng(23), 1.0)

    grass = np.stack(
        [
            0.30 + 0.10 * grass_n,
            0.46 + 0.12 * grass_n,
            0.22 + 0.06 * grass_n,
        ],
        axis=-1,
    )
    infield = np.stack(
        [
            0.34 + 0.08 * grass_n,
            0.52 + 0.10 * grass_n,
            0.24 + 0.05 * grass_n,
        ],
        axis=-1,
    )
    dirt = np.stack(
        [
            0.40 + 0.08 * dirt_n,
            0.32 + 0.06 * dirt_n,
            0.20 + 0.04 * dirt_n,
        ],
        axis=-1,
    )
    asphalt = np.stack(
        [
            0.16 + 0.07 * asp_n,
            0.16 + 0.07 * asp_n,
            0.18 + 0.06 * asp_n,
        ],
        axis=-1,
    )

    px, py = _path_xy()
    pts = [_world_to_px(xw, yw) for xw, yw in zip(px, py)]

    fill = Image.new("L", (RES, RES), 0)
    ImageDraw.Draw(fill).polygon(pts, fill=255)
    inside = np.array(fill) > 0

    skeleton = Image.new("L", (RES, RES), 0)
    ImageDraw.Draw(skeleton).line(pts, fill=255, width=2, joint="curve")
    metres_per_px = SIZE_M / (RES - 1)
    dist = distance_transform_edt(np.array(skeleton) == 0) * metres_per_px

    half = TRACK_W * 0.5
    asphalt_m = dist <= half
    white_m = (dist > half) & (dist <= half + LINE_W)
    dirt_m = (dist > half + LINE_W) & (dist <= half + LINE_W + 0.11)

    img = grass.copy()
    img[inside] = infield[inside]
    img[dirt_m] = dirt[dirt_m]
    img[white_m] = np.array([0.93, 0.93, 0.90], dtype=np.float32)
    img[asphalt_m] = asphalt[asphalt_m]

    dash, gap = 0.34, 0.24
    period = dash + gap
    yellow = np.array([0.95, 0.78, 0.12], dtype=np.float32)
    yellow_img = Image.new("L", (RES, RES), 0)
    ydraw = ImageDraw.Draw(yellow_img)
    ds = np.sqrt(np.diff(px) ** 2 + np.diff(py) ** 2)
    s = np.concatenate([[0.0], np.cumsum(ds)])
    run = []
    for i in range(len(s) - 1):
        if (s[i] % period) < dash:
            run.append(pts[i])
        elif run:
            if len(run) > 1:
                ydraw.line(run, fill=255, width=_px_width(LINE_W), joint="curve")
            run = []
    if len(run) > 1:
        ydraw.line(run, fill=255, width=_px_width(LINE_W), joint="curve")
    img[np.array(yellow_img) > 0] = yellow

    out = Path(__file__).with_name("materials") / "textures" / "track.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8), mode="RGB").save(
        out, optimize=True
    )
    print(
        f"wrote {out}  x[{px.min():.2f},{px.max():.2f}] "
        f"y[{py.min():.2f},{py.max():.2f}]"
    )


if __name__ == "__main__":
    main()
