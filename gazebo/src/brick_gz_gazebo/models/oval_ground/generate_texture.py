#!/usr/bin/env python3
"""Generate a 10x10 m grass texture with a stadium oval for brick_oval.sdf.

Same road paint as track_ground: asphalt, white edges, dirt shoulder, dashed
yellow center. The oval is two straights plus semicircular ends, centered on
the origin. brick_oval.sdf spawns the EV3 on the south straight.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt

SIZE_M = 10.0
CX, CY = 0.0, 0.0
RES = 1024
TRACK_W = 0.72
LINE_W = 0.035
STRAIGHT_M = 2.4
RADIUS_M = 1.05
# South straight, centerline, facing +X. Kept in brick_oval.sdf.
SPAWN_XY = (0.0, -RADIUS_M)


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
    arc = np.pi * RADIUS_M
    total = 2.0 * STRAIGHT_M + 2.0 * arc
    n = 640
    n_s = max(2, int(round(n * STRAIGHT_M / total)))
    n_a = max(8, int(round(n * arc / total)))
    half = STRAIGHT_M * 0.5

    x1 = np.linspace(-half, half, n_s, endpoint=False)
    y1 = np.full_like(x1, -RADIUS_M)
    theta_r = np.linspace(-0.5 * np.pi, 0.5 * np.pi, n_a, endpoint=False)
    x2 = half + RADIUS_M * np.cos(theta_r)
    y2 = RADIUS_M * np.sin(theta_r)
    x3 = np.linspace(half, -half, n_s, endpoint=False)
    y3 = np.full_like(x3, RADIUS_M)
    theta_l = np.linspace(0.5 * np.pi, 1.5 * np.pi, n_a, endpoint=False)
    x4 = -half + RADIUS_M * np.cos(theta_l)
    y4 = RADIUS_M * np.sin(theta_l)

    x = np.concatenate([x1, x2, x3, x4, x1[:1]])
    y = np.concatenate([y1, y2, y3, y4, y1[:1]])
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

    spawn_u, spawn_v = _world_to_px(*SPAWN_XY)
    spawn_px = (int(round(spawn_u)), int(round(spawn_v)))
    if not asphalt_m[spawn_px[1], spawn_px[0]]:
        raise RuntimeError(f"spawn {SPAWN_XY} is not on the asphalt")

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

    out = Path(__file__).with_name("materials") / "textures" / "oval.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8), mode="RGB").save(
        out, optimize=True
    )
    print(
        f"wrote {out}  x[{px.min():.2f},{px.max():.2f}] "
        f"y[{py.min():.2f},{py.max():.2f}] spawn={SPAWN_XY}"
    )


if __name__ == "__main__":
    main()
