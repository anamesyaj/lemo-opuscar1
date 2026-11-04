#!/usr/bin/env python3
"""Per-frame QC for ph-power-itself-90s-lowpoly.mp4 (user directive: validate EVERY frame,
not just one still per beat). Streams downscaled frames and checks:

1. black/empty frames      (mean luma < 5)
2. frozen runs              (mean abs inter-frame diff < 0.35 for >= 12 frames / 0.5 s)
3. luma anomalies           (sudden mean jump > 50, or flat frame std < 1.5)
4. label presence           (amber pixels in right-third region during label windows)
5. text bounds              (no text-colored pixels in the outer 12 px border ring
                             during label windows; every title's measured width <= 920 px)

Usage: python3 tools/qc_frames.py <mp4> [--out report.json]
Exit 0 = PASS (no black frames, no frozen runs). Warnings printed for anomalies.
Label windows are cross-checked visually (full-res crops) by the operator.
"""
import json
import subprocess
import sys

import numpy as np

W, H = 270, 480           # analysis resolution (keeps text-scale labels detectable)
FPS = 24
FRAME_BYTES = W * H * 3

BLACK_LUMA = 5.0
FROZEN_DIFF = 0.35
FROZEN_MIN_FRAMES = 12
LUMA_JUMP = 50.0
FLAT_STD = 1.5

# (name, t_start, t_end) — from the treatment beat map + voice timings
LABEL_WINDOWS = [
    ("bataan", 14.0, 22.0),
    ("geothermal", 28.0, 37.0),
    ("hydro_solar_wind", 44.0, 52.0),
    ("power_price", 58.0, 66.0),
]

# --- text-bounds checks (defect fix: titles must never overflow the frame) ---
LABEL_TITLES = [
    ("bataan", "BATAAN"),
    ("geothermal", "GEOTHERMAL"),
    ("hydro_solar_wind", "HYDRO · SOLAR · WIND"),
    ("power_price", "POWER PRICE"),
]
TITLE_MAX_PX = 920          # shrink-to-fit ceiling in overlay.js
EDGE_PX = 3                 # 12 full-res px at the 270x480 analysis scale


def amber_mask(rgb):
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    return (r > 180) & (g > 120) & (b < 150) & ((r - b) > 60)


def white_mask(rgb):
    return (rgb[:, :, 0] > 200) & (rgb[:, :, 1] > 200) & (rgb[:, :, 2] > 200)


def text_mask(rgb):
    return amber_mask(rgb) | white_mask(rgb)


def border_text_px(f):
    """Text-colored pixels in the outer EDGE_PX border ring (frame edges)."""
    m = text_mask(f)
    return int(m[:EDGE_PX, :].sum() + m[-EDGE_PX:, :].sum()
               + m[:, :EDGE_PX].sum() + m[:, -EDGE_PX:].sum())


def check_title_widths(font_b64_path):
    """Replicate overlay.js shrink-to-fit; assert every title <= TITLE_MAX_PX."""
    import base64
    import tempfile
    from PIL import ImageFont
    raw = open(font_b64_path).read()
    tmp = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False)
    tmp.write(base64.b64decode(raw)); tmp.close()
    out = {}
    for name, title in LABEL_TITLES:
        fontPx, trackPx = 84, 14
        def total(fp, tp):
            fnt = ImageFont.truetype(tmp.name, fp)
            ws = [fnt.getlength(ch) + tp for ch in title]
            return sum(ws) - tp
        t = total(fontPx, trackPx)
        if t > TITLE_MAX_PX:
            k = TITLE_MAX_PX / t
            fontPx = max(24, int(fontPx * k))
            trackPx = max(2, round(trackPx * k))
            t = total(fontPx, trackPx)
        out[name] = {"title": title, "width_px": round(t, 1),
                     "font_px": fontPx, "track_px": trackPx,
                     "verdict": "OK" if t <= TITLE_MAX_PX else "OVERFLOW"}
    return out


def main():
    mp4 = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", mp4], capture_output=True, text=True)
    duration = float(probe.stdout.strip())
    n_expected = int(round(duration * FPS))
    print(f"duration={duration:.2f}s expect ~{n_expected} frames @ {W}x{H}")

    cmd = ["ffmpeg", "-v", "error", "-i", mp4,
           "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)

    means, stds, ambers, diffs = [], [], [], []
    prev = None
    frozen_runs, black_frames, jumps, flats = [], [], [], []
    frozen_start = None
    # text-bounds: max border-ring text px per label window
    win_ranges = {name: (int(t0 * FPS), int(t1 * FPS)) for name, t0, t1 in LABEL_WINDOWS}
    border_max = {name: 0 for name, _, _ in LABEL_WINDOWS}
    n = 0
    while True:
        raw = proc.stdout.read(FRAME_BYTES)
        if len(raw) < FRAME_BYTES:
            break
        f = np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3)
        luma = 0.299 * f[:, :, 0] + 0.587 * f[:, :, 1] + 0.114 * f[:, :, 2]
        m, s = float(luma.mean()), float(luma.std())
        means.append(m)
        stds.append(s)
        # amber in right-third region (label zone)
        region = f[:, W * 2 // 3:, :]
        ambers.append(int(amber_mask(region).sum()))
        # text-bounds: border ring must stay text-free during label windows
        for name, (f0, f1) in win_ranges.items():
            if f0 <= n < f1:
                b = border_text_px(f)
                if b > border_max[name]:
                    border_max[name] = b

        if prev is not None:
            d = float(np.abs(f.astype(np.int16) - prev.astype(np.int16)).mean())
            diffs.append(d)
            t = n / FPS
            if d < FROZEN_DIFF:
                if frozen_start is None:
                    frozen_start = n - 1
            else:
                if frozen_start is not None:
                    run = n - frozen_start
                    if run >= FROZEN_MIN_FRAMES:
                        frozen_runs.append(
                            {"from_frame": frozen_start, "to_frame": n - 1,
                             "from_s": round(frozen_start / FPS, 2),
                             "to_s": round(n / FPS, 2), "frames": run})
                    frozen_start = None
            if abs(m - means[-2]) > LUMA_JUMP:
                jumps.append({"frame": n, "t": round(t, 2),
                              "delta": round(m - means[-2], 1)})
        if m < BLACK_LUMA:
            black_frames.append({"frame": n, "t": round(n / FPS, 2), "luma": round(m, 2)})
        if s < FLAT_STD:
            flats.append({"frame": n, "t": round(n / FPS, 2)})
        prev = f
        n += 1
    proc.wait()
    if frozen_start is not None and n - frozen_start >= FROZEN_MIN_FRAMES:
        frozen_runs.append({"from_frame": frozen_start, "to_frame": n - 1,
                            "from_s": round(frozen_start / FPS, 2),
                            "to_s": round(n / FPS, 2), "frames": n - frozen_start})

    means = np.array(means)
    ambers = np.array(ambers)

    # label presence per window: fraction of frames with amber in label zone
    label_report = {}
    for name, t0, t1 in LABEL_WINDOWS:
        f0, f1 = int(t0 * FPS), min(int(t1 * FPS), n)
        if f1 <= f0:
            label_report[name] = {"frames": 0, "note": "window outside video"}
            continue
        win = ambers[f0:f1]
        present = win > 20  # >20 amber px in region at 270x480
        label_report[name] = {
            "window_s": [t0, t1], "frames": int(f1 - f0),
            "present_frac": round(float(present.mean()), 3),
            "median_amber_px": int(np.median(win)),
            "verdict": "OK" if present.mean() > 0.9 else "CHECK",
        }

    # text-bounds gate: measured title widths + border-ring violations
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    font_b64 = os.path.join(script_dir, "..", "fonts", "JosefinSans-600.ttf.b64")
    title_widths = check_title_widths(font_b64)
    border_report = {}
    for name, t0, t1 in LABEL_WINDOWS:
        v = border_max[name]
        border_report[name] = {"window_s": [t0, t1],
                               "max_border_text_px": v,
                               "verdict": "OK" if v == 0 else "OVERFLOW"}
    text_bounds_ok = (all(r["verdict"] == "OK" for r in border_report.values())
                      and all(r["verdict"] == "OK" for r in title_widths.values()))

    report = {
        "file": mp4, "duration_s": round(duration, 2), "frames": n,
        "luma": {"mean": round(float(means.mean()), 2),
                 "min": round(float(means.min()), 2),
                 "max": round(float(means.max()), 2)},
        "black_frames": black_frames,
        "frozen_runs": frozen_runs,
        "luma_jumps": jumps[:20],
        "flat_frames": flats[:20],
        "labels": label_report,
        "text_bounds": {"title_widths": title_widths,
                        "border_ring": border_report,
                        "verdict": "OK" if text_bounds_ok else "FAIL"},
    }
    print(json.dumps(report, indent=1))
    if out_path:
        json.dump(report, open(out_path, "w"), indent=1)

    ok = not black_frames and not frozen_runs and text_bounds_ok
    print("PASS" if ok else "FAIL", f"— {len(black_frames)} black, "
          f"{len(frozen_runs)} frozen runs, {len(jumps)} luma jumps, "
          f"{len(flats)} flat frames, "
          f"text_bounds={'OK' if text_bounds_ok else 'FAIL'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
