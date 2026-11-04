#!/usr/bin/env python3
"""Regenerate web delivery plates for the film from the full-res GeoTIFF sources.

Reads the .tif masters in this directory, crops each plate to its shown AOI +
margin (native 10 m where close-ups land), caps the long edge (2048 px for the
opener/night plates, 3200 px for detail plates), writes JPEG q85 delivery
files, and rewrites plates.json with the delivery extents and web filenames.

Idempotent: outputs depend only on the source GeoTIFFs + the tables below.
The source extents are hardcoded here (never read from plates.json), so
re-running never double-crops. Total delivery budget: <= ~25 MB.

Usage:
    python3 plates/fetch_plates.py
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# Full-res source extents (lon_min, lat_min, lon_max, lat_max) of each .tif.
# From the original plates.json / FACTS.md; kept here so re-runs stay correct.
SOURCE_EXTENTS = {
    "opener": (116.0, 3.996, 126.9973, 19.0),
    "night": (116.0, 3.996, 126.9973, 19.0),
    "bataan": (120.1936, 14.2956, 120.6054, 14.8045),
    "tiwi": (123.4993, 13.2994, 123.8009, 13.6009),
    "makban": (121.0966, 13.8972, 121.5025, 14.3029),
    "cordillera": (120.6852, 16.3944, 121.3108, 17.6061),
    "ilocos": (120.4927, 18.1941, 121.0058, 18.706),
}

# name, source tif, delivery web file, crop AOI (lon_min, lat_min, lon_max, lat_max)
# or None for full extent, long-edge cap, JPEG quality.
# AOIs were chosen from the film's camera path (TREATMENT.md beat map):
# each close-up lands inside its AOI with margin for the 9:16 frame.
PLATES = [
    dict(name="opener", src="opener_archipelago_eox2016.tif",
         web="opener_archipelago_eox2016.jpg", crop=None, max_edge=2048, q=85),
    dict(name="night", src="night_archipelago_blackmarble2016.tif",
         web="night_archipelago_blackmarble2016.jpg", crop=None, max_edge=2048, q=85),
    dict(name="bataan", src="bataan_20240416.tif",
         web="bataan_20240416.jpg",
         crop=(120.28, 14.48, 120.58, 14.78), max_edge=3200, q=85),
    dict(name="tiwi", src="tiwi_20260418.tif",
         web="tiwi_20260418.jpg", crop=None, max_edge=3200, q=85),
    dict(name="makban", src="makban_20240416.tif",
         web="makban_20240416.jpg",
         crop=(121.13, 13.925, 121.47, 14.265), max_edge=3200, q=85),
    dict(name="cordillera", src="cordillera_20240219-20230323.tif",
         web="cordillera_20240219-20230323.jpg",
         crop=(120.83, 16.78, 121.27, 17.22), max_edge=3200, q=85),
    dict(name="ilocos", src="ilocos_20240219.tif",
         web="ilocos_20240219.jpg",
         crop=(120.545, 18.28, 120.995, 18.706), max_edge=3200, q=85),
]


def crop_to_aoi(im, full, aoi):
    """Crop a north-up raster to a lon/lat AOI. full/aoi = (lon_min, lat_min, lon_max, lat_max)."""
    w, h = im.size
    flon0, flat0, flon1, flat1 = full
    alon0, alat0, alon1, alat1 = aoi
    x0 = int(round((alon0 - flon0) / (flon1 - flon0) * w))
    x1 = int(round((alon1 - flon0) / (flon1 - flon0) * w))
    y0 = int(round((flat1 - alat1) / (flat1 - flat0) * h))  # north-up: lat_max is row 0
    y1 = int(round((flat1 - alat0) / (flat1 - flat0) * h))
    x0, x1 = max(0, x0), min(w, x1)
    y0, y1 = max(0, y0), min(h, y1)
    assert x1 > x0 and y1 > y0, f"empty crop for AOI {aoi}"
    return im.crop((x0, y0, x1, y1))


def main():
    with open(os.path.join(HERE, "plates.json")) as f:
        meta = json.load(f)
    by_name = {p["name"]: p for p in meta["plates"]}

    total = 0
    for spec in PLATES:
        name = spec["name"]
        m = by_name[name]
        full = SOURCE_EXTENTS[name]
        im = Image.open(os.path.join(HERE, spec["src"]))
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (0, 0, 0))
            bg.paste(im, mask=im.split()[3])
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")

        if spec["crop"]:
            aoi = spec["crop"]
            assert aoi[0] >= full[0] and aoi[2] <= full[2], f"{name} lon AOI outside source"
            assert aoi[1] >= full[1] and aoi[3] <= full[3], f"{name} lat AOI outside source"
            im = crop_to_aoi(im, full, aoi)
            m["lon_min"], m["lat_min"], m["lon_max"], m["lat_max"] = aoi
            m["delivery_crop"] = (
                f"AOI {aoi[0]:.4f}-{aoi[2]:.4f}E, {aoi[1]:.4f}-{aoi[3]:.4f}N "
                f"cropped from full-res source for the film's camera path"
            )
        else:
            m["lon_min"], m["lat_min"], m["lon_max"], m["lat_max"] = full

        w, h = im.size
        if max(w, h) > spec["max_edge"]:
            s = spec["max_edge"] / max(w, h)
            im = im.resize((int(round(w * s)), int(round(h * s))), Image.LANCZOS)

        out = os.path.join(HERE, spec["web"])
        im.save(out, "JPEG", quality=spec["q"], optimize=True, progressive=True)
        size = os.path.getsize(out)
        total += size
        m["web"] = spec["web"]
        m["delivery_px"] = f"{im.size[0]}x{im.size[1]}"
        print(f"{name:10s} {im.size[0]:5d}x{im.size[1]:<5d} {size/1e6:5.2f} MB  -> {spec['web']}")

    with open(os.path.join(HERE, "plates.json"), "w") as f:
        json.dump(meta, f, indent=1)
        f.write("\n")
    print(f"TOTAL {total/1e6:.2f} MB (budget <= ~25 MB)")


if __name__ == "__main__":
    main()
