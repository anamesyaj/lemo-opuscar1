# FACTS.md — imagery provenance for "What if the Philippines powered itself?" (Satellite Briefing, 90 s)

STYLE.md §9 requires: for every plate, the claim, source, and quoted licence/credit wording or
measurement method, with scene IDs and capture dates. All plates are real satellite imagery —
no generated imagery is used anywhere.

## OPENER — full Philippine archipelago, cloud-free (0–8 s)

- **Plate:** `plates/opener_archipelago_eox2016.jpg` (web delivery, 1466×2048 px, JPEG q85;
  + `.tif` full-res master, EPSG:3857, 2002×2796 px)
- **Claim:** cloud-free true-colour mosaic of the Philippine archipelago, bbox 116–127°E, 4–19°N.
- **Source:** EOX Sentinel-2 cloudless **2016** mosaic, layer `s2cloudless_3857`, fetched as
  WMTS z8 tiles from `https://tiles.maps.eox.at/wmts/1.0.0/` and cropped to the bbox.
- **Capture date:** composite; tropical scenes use Sentinel-2 acquisitions May 2016 – April 2017
  (per EOX methodology note). Treat the plate date as 2016–2017.
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0) — commercial use
  permitted with attribution. (This is the 2016 mosaic; the 2018+ EOX mosaics are CC BY-NC-SA
  and were NOT used.)
- **Credit wording (end credits):**
  `Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)`
- **Note:** one visible mosaic seam (greyish patch) exists over the Bicol peninsula area in the
  source EOX data; it is part of the licensed mosaic, not an edit.
- **Note:** the dark circular halos around several islands/coastlines (e.g. offshore Palawan,
  around the Sulu islands) are in the licensed EOX source GeoTIFF itself — verified on the
  master `.tif`; they are not an edit and are kept as evidence.

## NIGHT — VIIRS Black Marble night-lights of the Philippines (65–80 s night-bloom beat)

- **Plate:** `plates/night_archipelago_blackmarble2016.jpg` (web delivery, 1001×1398 px, JPEG q85;
  + `.tif` full-res master, EPSG:3857, 1001×1398 px)
- **Claim:** annual night-time lights composite of the Philippine archipelago, bbox 116–127°E, 4–19°N.
- **Source:** NASA VIIRS Black Marble (VNP46A4 annual composite), `VIIRS_Black_Marble` layer via
  NASA GIBS WMTS `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/`,
  TileMatrixSet `GoogleMapsCompatible_Level8`, z7 tiles, TIME=2016-01-01.
- **Capture date:** annual composite for calendar year 2016.
- **Licence:** NASA imagery — public domain / CC0; commercial use allowed, no NASA endorsement
  implied, NASA insignia not used.
- **Credit wording (end credits, courtesy):**
  `We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Observing System Data and Information System (ESDIS).`

## Sentinel-2 facility plates (10 m true-colour, L2A)

All five sourced from Copernicus Sentinel-2 Level-2A true-colour (TCI) scenes via the
Microsoft Planetary Computer STAC API (no account), signed download from the Copernicus
archive. Licence for all: **free for commercial use with attribution** under the EU
Copernicus Sentinel data licence.

Credit wording (end credits): `Contains modified Copernicus Sentinel data <YEAR>`
(with the year of each plate's capture; see below).

Credit wording (end credits): `Contains modified Copernicus Sentinel data <YEAR>`
(with the year of each plate's capture; see below).

### BATAAN — Bataan Nuclear Power Plant area, Morong

- **Plate:** `plates/bataan_20240416.jpg` (web delivery, 3100×3200 px, JPEG q85;
  + `.tif` full-res master, EPSG:32651, 4377×5585 px @ 10 m)
- **Claim:** true-colour view of the Bataan peninsula including the BNPP site at Morong;
  web delivery cropped to the film's shown AOI 120.28–120.58°E, 14.48–14.78°N
  (master extent 120.194–120.605°E, 14.296–14.805°N).
- **Source:** Copernicus Sentinel-2 Level-2A TCI via Microsoft Planetary Computer STAC (no account).
- **Capture date:** 2024-04-16 (mosaic of 4 same-day scenes, max scene cloud 3.2%).
- **Scene IDs:** S2A_MSIL2A_20240416T021611_R003_T51PTS_20240416T092653,
  S2A_MSIL2A_20240416T021611_R003_T50PRB_20240416T092706,
  S2A_MSIL2A_20240416T021611_R003_T50PRA_20240416T092837,
  S2A_MSIL2A_20240416T021611_R003_T51PTR_20240416T092653.
- **Licence:** Copernicus Sentinel data 2024 — free for commercial use with attribution.
- **Credit wording:** `Contains modified Copernicus Sentinel data 2024`

### TIWI — Tiwi geothermal, Albay

- **Plate:** `plates/tiwi_20260418.jpg` (web delivery, 3133×3200 px, JPEG q85;
  + `.tif` full-res master, EPSG:32651, 3256×3326 px @ 10 m)
- **Claim:** true-colour view of the Tiwi geothermal area; actual extent
  123.499–123.801°E, 13.299–13.601°N. Plant area verified cloud-free.
- **Source:** Copernicus Sentinel-2 Level-2A TCI via Microsoft Planetary Computer STAC (no account).
- **Capture date:** 2026-04-18 (2 scenes, max scene cloud 4.2%).
- **Scene IDs:** S2B_MSIL2A_20260418T020649_R103_T51PWR_20260418T041438,
  S2B_MSIL2A_20260418T020649_R103_T51PWQ_20260418T041438.
- **Licence:** Copernicus Sentinel data 2026 — free for commercial use with attribution.
- **Credit wording:** `Contains modified Copernicus Sentinel data 2026`

### MAK-BAN — Mak-Ban geothermal, Laguna

- **Plate:** `plates/makban_20240416.jpg` (web delivery, 3122×3200 px, JPEG q85;
  + `.tif` full-res master, EPSG:32651, 4351×4457 px @ 10 m)
- **Claim:** true-colour view of the Makiling-Banahaw geothermal area; web delivery cropped
  to the film's shown AOI 121.13–121.47°E, 13.925–14.265°N
  (master extent 121.097–121.503°E, 13.897–14.303°N).
- **Source:** Copernicus Sentinel-2 Level-2A TCI via Microsoft Planetary Computer STAC (no account).
- **Capture date:** 2024-04-16 (2 scenes; best of 30 screened Feb–May dates at 6.2% AOI cloud —
  the field is orographic-cloud prone; scattered clouds remain but the plant area is usable).
- **Scene IDs:** S2A_MSIL2A_20240416T021611_R003_T51PTR_20240416T092653,
  S2A_MSIL2A_20240416T021611_R003_T51PUR_20240416T150532.
- **Licence:** Copernicus Sentinel data 2024 — free for commercial use with attribution.
- **Credit wording:** `Contains modified Copernicus Sentinel data 2024`

### CORDILLERA — Cordillera hydro

- **Plate:** `plates/cordillera_20240219-20230323.jpg` (web delivery, 3030×3200 px, JPEG q85;
  + `.tif` full-res master, EPSG:32651, 6526×13347 px @ 10 m)
- **Claim:** true-colour view of the Cordillera region; web delivery cropped to the film's
  shown AOI 120.83–121.27°E, 16.78–17.22°N (master extent
  120.685–121.311°E, 16.394–17.606°N).
- **Source:** Copernicus Sentinel-2 Level-2A TCI via Microsoft Planetary Computer STAC (no account).
- **Capture dates (multi-date mosaic — the AOI spans UTM zones 50/51 and two relative orbits,
  so no single date covers it):** west tiles 50QRE/50QRD @ 2024-02-19 (cloud ~0%);
  east tiles 51QTU/51QTV/51QUU/51QUV @ 2023-03-23 (max cloud 2.6%).
  Per-tile gain matching applied to soften the date seam (tone-balanced = "modified" data).
- **Scene IDs:** S2A_MSIL2A_20240219T022741_R046_T50QRE_20240219T072411,
  S2A_MSIL2A_20240219T022741_R046_T50QRD_20240219T072410,
  S2A_MSIL2A_20230323T021531_R003_T51QTU_20240831T072834,
  S2A_MSIL2A_20230323T021531_R003_T51QTV_20240831T072834,
  S2A_MSIL2A_20230323T021531_R003_T51QUU_20240831T072834,
  S2A_MSIL2A_20230323T021531_R003_T51QUV_20240831T072834.
- **Licence:** Copernicus Sentinel data 2023 & 2024 — free for commercial use with attribution.
- **Credit wording:** `Contains modified Copernicus Sentinel data 2023 & 2024`
- **Note:** a faint tone seam remains at the west/east date boundary; some clouds in the SW corner.

### ILOCOS — Ilocos wind, Bangui

- **Plate:** `plates/ilocos_20240219.jpg` (web delivery, 3200×3179 px, JPEG q85;
  + `.tif` full-res master, EPSG:32651, 5352×5602 px @ 10 m)
- **Claim:** true-colour view of the Bangui / Ilocos Norte coastline; web delivery cropped
  to the film's shown AOI 120.545–120.995°E, 18.28–18.706°N (master extent
  120.493–121.006°E, 18.194–18.706°N). Cloud-free.
- **Source:** Copernicus Sentinel-2 Level-2A TCI via Microsoft Planetary Computer STAC (no account).
- **Capture date:** 2024-02-19 (2 scenes, 0.0% scene cloud).
- **Scene IDs:** S2A_MSIL2A_20240219T022741_R046_T50QRF_20240219T072408,
  S2A_MSIL2A_20240219T022741_R046_T51QTA_20240219T072411.
- **Licence:** Copernicus Sentinel data 2024 — free for commercial use with attribution.
- **Credit wording:** `Contains modified Copernicus Sentinel data 2024`

## End-credits attribution block (copy-paste)

```
Satellite imagery: Contains modified Copernicus Sentinel data 2023, 2024 & 2026
  (European Union / ESA, via Microsoft Planetary Computer)
Mosaic: Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH
  (Contains modified Copernicus Sentinel data 2016 & 2017), CC BY 4.0
Night lights: We acknowledge the use of imagery provided by services from NASA's
  Global Imagery Browse Services (GIBS), part of NASA's Earth Observing System
  Data and Information System (ESDIS)
```

## Web delivery plates (reproducibility)

- `plates/fetch_plates.py` regenerates all 7 web delivery JPEGs from the full-res
  `.tif` masters: crops each plate to its shown AOI + margin at native 10 m where
  close-ups land, caps the long edge (2048 px opener/night, 3200 px detail plates),
  writes JPEG q85, and rewrites `plates/plates.json` extents + web filenames.
  Idempotent (source extents are hardcoded in the script; safe to re-run).
- Delivery total: **10.89 MB** (budget ≤ ~25 MB).

## Method notes (for STYLE.md §9 "measurement method")

- Scene selection: Planetary Computer STAC `sentinel-2-l2a`, cloud_cover < 20%, February–May
  captures 2023–2026, ranked by `eo:cloud_cover`; per-AOI cloud fraction re-screened on
  downsampled reads (bright-pixel proxy) where the scene-level value was misleading.
- True colour = the L2A product's TCI (True Colour Image) asset, 10 m, uint8 RGB.
- AOI mosaics assembled in EPSG:32651 at 10 m via windowed reads + bilinear reprojection;
  same-date scenes preferred; Cordillera required a two-date mosaic (zone/orbit split) with
  per-tile gain matching. GeoTIFFs are the full-resolution masters; JPEG/PNG are web proxies.
- No Google Earth/Maps, Bing, Esri, Mapbox, Planet, Maxar, or EOX 2018+ imagery used anywhere.
