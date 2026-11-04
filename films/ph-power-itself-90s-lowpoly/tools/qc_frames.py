#!/usr/bin/env python3
"""Per-frame QC for ph-power-itself-90s.mp4 (user directive: validate EVERY frame,
not just one still per beat). Streams downscaled frames and checks:

1. black/empty frames      (mean luma < 5)
2. frozen runs              (mean abs inter-frame diff < 0.35 for >= 12 frames / 0.5 s)
3. luma anomalies           (sudden mean jump > 50, or flat frame std < 1.5)
4. label presence           (amber pixels in right-third region during label windows)

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
    ("bataan", 8.5, 20.0),
    ("geothermal", 24.0, 35.0),
    ("hydro_solar_wind", 36.0, 50.0),
    ("electricity", 49.0, 65.0),
    ("credit", 80.0, 90.0),
]


def amber_mask(rgb):
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    return (r > 180) & (g > 120) & (b < 150) & ((r - b) > 60)


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
    }
    print(json.dumps(report, indent=1))
    if out_path:
        json.dump(report, open(out_path, "w"), indent=1)

    ok = not black_frames and not frozen_runs
    print("PASS" if ok else "FAIL", f"— {len(black_frames)} black, "
          f"{len(frozen_runs)} frozen runs, {len(jumps)} luma jumps, "
          f"{len(flats)} flat frames")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
