#!/usr/bin/env python3
"""Stitch rendered chunks into finished films and commit them to the `renders` branch.

Runs in the render workflow's stitch job. Environment:
  ART_DIR    artifacts root (actions/download-artifact, merge-multiple)
  OUT_DIR    where finished files are staged before the git commit
  FILMS_JSON JSON list of film names (from the plan job)
  FILM_ROOT  films/<name> lives here (repo checkout of main)

Per film (films/<name>/render.json):
  look -> copy stills to renders/<film>/look/
  film -> concat page segments, concat pages, mix audio (voice b64 + synthesized
          music bed, sidechain-ducked), mux.sh (loudnorm -14 LUFS, grain per config)
Then commit everything under renders/<film>/ to the `renders` branch with [skip ci].
"""
import base64
import glob
import json
import os
import re
import shutil
import subprocess
import sys

ART = os.environ["ART_DIR"]
OUT = os.environ["OUT_DIR"]
FILMS = json.loads(os.environ.get("FILMS_JSON", "[]"))
ROOT = os.environ.get("FILM_ROOT", os.getcwd())


def run(*a, cwd=None):
    print("+", " ".join(a), flush=True)
    r = subprocess.run(a, cwd=cwd or ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f"command failed: {a[0]}")
    return r


def natural_idx(p):
    m = re.search(r"-c(\d+)(?:/|$)", p)
    return int(m.group(1)) if m else 0


def concat_mp4(parts, dst):
    lst = dst + ".txt"
    with open(lst, "w") as f:
        for p in parts:
            f.write(f"file '{os.path.abspath(p)}'\n")
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", lst, "-c", "copy", dst)
    os.remove(lst)


def build_audio(cfg, film_dir, work):
    """voice (b64 parts in repo) + synthesized music bed -> ducked mix.wav. Returns path."""
    au = cfg["audio"]
    part_pat = os.path.join(film_dir, au["voice_parts"] + "*")
    parts = sorted(glob.glob(part_pat))
    if not parts:
        raise SystemExit(f"no voice parts matching {part_pat}")
    voice_src = os.path.join(work, "voice.flac")
    with open(voice_src, "wb") as out:
        for p in parts:
            with open(p, "rb") as f:
                out.write(base64.b64decode(f.read()))
    music_wav = os.path.join(work, "music.wav")
    run("python3", os.path.join(ROOT, au["music_script"]), music_wav)
    mix_wav = os.path.join(work, "mix.wav")
    # Full film duration: the voice (51.5 s here) must be padded to it, otherwise
    # sidechaincompress truncates the ducked music when the voice sidechain EOFs
    # and the mix comes out short (mux.sh would then pad the tail with silence,
    # killing the closing music swell).
    film_dur = sum(p.get("dur", 60) for p in cfg.get("pages", [{"dur": 60}]))
    pad_dur = max(film_dur, 65)
    # NOTE: link labels must NOT be single letters like [v] — ffmpeg fails to
    # resolve a re-used single-char output label ("Stream specifier 'v' ...
    # matches no streams", Invalid argument). Descriptive labels work.
    # NOTE 2: an output link feeding TWO downstream filters needs an explicit
    # asplit — the runner's apt ffmpeg (6.1.x) rejects label reuse that newer
    # ffmpeg accepts. asplit=2 is bit-identical and version-safe.
    run("ffmpeg", "-y", "-loglevel", "error", "-i", voice_src, "-i", music_wav,
        "-filter_complex",
        f"[0:a]aresample=44100,apad=whole_dur={pad_dur},asplit=2[voice][vsc];[1:a]aresample=44100,apad=whole_dur={pad_dur}[mus];"
        "[mus][vsc]sidechaincompress=threshold=0.04:ratio=9:attack=15:release=600:makeup=1[ducked];"
        f"[voice][ducked]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur={pad_dur}[aout]",
        "-map", "[aout]", mix_wav)
    return mix_wav


def main():
    os.makedirs(OUT, exist_ok=True)
    staged = []
    for film in FILMS:
        film_dir = os.path.join(ROOT, "films", film)
        cfg = json.load(open(os.path.join(film_dir, "render.json")))
        dest = os.path.join(OUT, "renders", film)
        os.makedirs(dest, exist_ok=True)
        if cfg.get("mode") == "look":
            look_art = os.path.join(ART, f"render-look-{film}")
            look_dest = os.path.join(dest, "look")
            os.makedirs(look_dest, exist_ok=True)
            for jpg in sorted(glob.glob(os.path.join(look_art, "*.jpg"))):
                shutil.copy(jpg, look_dest)
                staged.append(os.path.join("renders", film, "look", os.path.basename(jpg)))
            print(f"{film}: staged {len(glob.glob(os.path.join(look_art, '*.jpg')))} look stills")
            continue
        # film mode
        work = os.path.join(OUT, "work", film)
        os.makedirs(work, exist_ok=True)
        pages = cfg.get("pages", [{"dir": ".", "dur": 60}])
        page_mp4s = []
        for pi, page in enumerate(pages):
            segs = sorted(glob.glob(os.path.join(ART, f"render-chunk-{film}-p{pi}-c*", "seg.mp4")),
                          key=natural_idx)
            if not segs:
                raise SystemExit(f"{film}: no segments found for page {pi} ({page.get('dir')})")
            page_mp4 = os.path.join(work, f"page_{pi}.mp4")
            concat_mp4(segs, page_mp4)
            page_mp4s.append(page_mp4)
        silent = os.path.join(work, "silent.mp4")
        concat_mp4(page_mp4s, silent)
        final = os.path.join(work, cfg.get("out", f"{film}.mp4"))
        if cfg.get("audio"):
            mix = build_audio(cfg, film_dir, work)
            grain = str(cfg.get("grain", 0))
            fps = str(cfg.get("fps", 24))
            run("sh", "core/render/mux.sh", silent, mix, final, fps, grain)
        else:
            run("ffmpeg", "-y", "-loglevel", "error", "-i", silent,
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", final)
        info = run("ffprobe", "-v", "error", "-show_entries",
                   "format=duration,size:stream=width,height,codec_type",
                   "-of", "default=noprint_wrappers=1", final)
        print(info.stdout)
        shutil.copy(final, dest)
        staged.append(os.path.join("renders", film, os.path.basename(final)))
        print(f"{film}: staged {os.path.basename(final)}")

    # ---- commit to the renders branch ----
    run("git", "config", "user.email", "github-actions[bot]@users.noreply.github.com")
    run("git", "config", "user.name", "github-actions[bot]")
    subprocess.run(["git", "fetch", "origin", "renders"], cwd=ROOT, capture_output=True)  # may not exist yet
    r = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/remotes/origin/renders"], cwd=ROOT)
    if r.returncode == 0:
        run("git", "checkout", "-B", "renders", "origin/renders")
    else:
        run("git", "checkout", "--orphan", "renders")
        subprocess.run(["git", "rm", "-rf", "."], cwd=ROOT, capture_output=True)
    for film in FILMS:
        src = os.path.join(OUT, "renders", film)
        dst = os.path.join(ROOT, "renders", film)
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
    run("git", "add", "renders")
    # check staged changes only: untracked worktree files (art/, outbox/) must not count,
    # otherwise an empty stage proceeds to `git commit` and fails the job
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if diff.returncode == 0:
        print("nothing new to commit on renders branch")
        return
    sha = os.environ.get("GITHUB_SHA", "local")[:7]
    run("git", "commit", "-m", f"render {','.join(FILMS)} {sha} [skip ci]")
    run("git", "push", "origin", "renders")
    print("pushed to renders branch")


if __name__ == "__main__":
    main()
