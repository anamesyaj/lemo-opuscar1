#!/usr/bin/env python3
"""Build the render task matrix for the render workflow.

Reads films/<name>/render.json for every film touched by this run and emits
a JSON task list on GITHUB_OUTPUT:
  tasks: [{kind: look|chunk, film, page, page_index, index, from, to, fps, size, q, stills}]
  films: [film names that produced tasks]

Film selection:
  workflow_dispatch -> the `film` input
  push              -> film dirs under films/ changed in HEAD~1..HEAD
"""
import json
import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
FILMS = os.path.join(ROOT, "films")


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True)


def changed_films():
    r = sh("git", "diff", "--name-only", "HEAD~1", "HEAD", "--", "films/")
    if r.returncode != 0:  # shallow checkout: fall back to the HEAD tree
        r = sh("git", "show", "--name-only", "--pretty=format:", "HEAD", "--", "films/")
    names = set()
    for line in r.stdout.splitlines():
        parts = line.strip().split("/")
        if len(parts) >= 2 and parts[0] == "films":
            names.add(parts[1])
    return sorted(names)


def main():
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    if event == "workflow_dispatch":
        films = [os.environ.get("INPUT_FILM", "").strip()]
        films = [f for f in films if f]
    else:
        films = changed_films()
    print(f"films selected: {films}", flush=True)

    tasks, done = [], []
    for film in films:
        cfg_path = os.path.join(FILMS, film, "render.json")
        if not os.path.isfile(cfg_path):
            print(f"::warning::films/{film} has no render.json; skipping")
            continue
        cfg = json.load(open(cfg_path))
        fps = int(cfg.get("fps", 24))
        size = cfg.get("size", "1080x1920")
        mode = cfg.get("mode", "film")
        if mode == "look":
            page = (cfg.get("pages") or [{"dir": "."}])[0]
            pagedir = os.path.normpath(os.path.join("films", film, page.get("dir", ".")))
            tasks.append({
                "kind": "look", "film": film, "pagedir": pagedir,
                "page_index": 0, "index": 0, "fps": fps, "size": size,
                "stills": cfg.get("look", {}).get("stills", []),
            })
            done.append(film)
        elif mode == "film":
            pages = cfg.get("pages", [{"dir": ".", "dur": 60}])
            n_chunks = max(1, int(cfg.get("chunks", 12)))
            ok = True
            for pi, page in enumerate(pages):
                pdir = os.path.join(FILMS, film, page.get("dir", "."))
                if not os.path.isfile(os.path.join(pdir, "index.html")):
                    print(f"::warning::films/{film}/{page.get('dir')} has no index.html yet; skipping film")
                    ok = False
                    break
            if not ok:
                continue
            # split the chunk budget across pages by frame count
            frames = [max(1, round(float(p.get("dur", 60)) * fps)) for p in pages]
            total = sum(frames)
            counts = [max(1, round(n_chunks * f / total)) for f in frames]
            for pi, (page, nf, cnt) in enumerate(zip(pages, frames, counts)):
                pagedir = os.path.normpath(os.path.join("films", film, page.get("dir", ".")))
                per = math.ceil(nf / cnt)
                for i in range(cnt):
                    a, b = i * per, min(nf, (i + 1) * per)
                    if a >= b:
                        continue
                    tasks.append({
                        "kind": "chunk", "film": film, "pagedir": pagedir,
                        "page_index": pi, "index": i, "from": a, "to": b,
                        "fps": fps, "size": size, "q": page.get("q", ""),
                    })
            done.append(film)
        else:
            print(f"::warning::films/{film}: unknown mode {mode!r}; skipping")

    out = os.environ.get("GITHUB_OUTPUT")
    payload = {"tasks": json.dumps(tasks), "films": json.dumps(done)}
    if out:
        with open(out, "a") as f:
            for k, v in payload.items():
                f.write(f"{k}={v}\n")
    else:
        print(json.dumps(payload, indent=1))
    print(f"tasks: {len(tasks)} for films {done}", flush=True)


if __name__ == "__main__":
    main()
