# TREATMENT — "What if the Philippines powered itself?"
**Style:** Satellite Briefing (Lemo-Opuscar) · **Duration:** 90 s · **Format:** 9:16, 24 fps
**Voice:** Kokoro `am_michael`, en-us, per-line emotion direction · **Render:** GitHub Actions workers
**Status:** DRAFT — awaiting user approval before production

## 0. Brief (locked)
- Topic: a what-if explainer — the Philippines achieving energy self-sufficiency from its own nuclear, geothermal, hydro, solar, and wind resources.
- Language: English narration. User adds his own captions in edit — **no burned-in narration subtitles**.
- On-screen typography: **sourced fact labels** (explicitly requested) — rendered as the style's analyst labels with source notes, distinct from narration captions.
- Music: one motif, documentary-analyst register (low strings + piano pulse, no drums until the grid lights).
- Loudness: −14 LUFS integrated, true peak ≤ −1 dBFS. Voice ~10 dB above music.
- AI label: ON at posting (realistic AI voiceover triggers Meta's self-disclosure rule).

## 1. Three candidate structures
**A. The Descent (chosen).** One continuous satellite zoom: orbit → Bataan → geothermal arc → rivers/wind/sun → grid → orbit. The camera is the argument: the energy was always there, we just never looked closely. Follows the style's native grammar (one zoom, altitude readout, one finding per screen).

**B. The Ledger.** Split between "what we import" (grey, coal ships) and "what we own" (colour, plants). Strong contrast but needs two visual systems; risks feeling like a slideshow of comparisons.

**C. The Night Map.** Entire film at night: the archipelago dark, then lights blooming plant by plant. Beautiful, but night-only throws away the satellite grade the style is built on, and fact labels read worse in the dark.

**Choice: A.** It uses the style's strongest native move, keeps one visual truth, and the "what-if future" renders naturally as the style's claim layer over present-day imagery.

## 2. Locked narration (19 lines, ~90 s)
| # | Line | Emotion / pace |
|---|------|----------------|
| 1 | What if the Philippines powered itself? | open, curious, 1.00 |
| 2 | Not with imported fuel — with what is already under its feet. | grounded, 0.95 |
| 3 | Start in Bataan. A nuclear plant, finished in 1984, that never switched on. | measured, factual, 0.95 |
| 4 | One decision, and its reactors could hum for sixty years. | quiet weight, 0.90 |
| 5 | Then look down. The archipelago sits on the Ring of Fire. | lift, wonder, 1.00 |
| 6 | The Philippines is already among the world's top geothermal producers — and it has barely scratched the surface. | confident, 1.00 |
| 7 | Steam that has been rising for free, for centuries. | soft awe, 0.92 |
| 8 | The rivers of the Cordillera. The sun of the dry season. The wind of Ilocos. | listing, rising, 1.00 |
| 9 | Each one a power station waiting to be built. | resolve, 1.00 |
| 10 | Connect them, and the grid stops begging for imported coal. | firm, 0.98 |
| 11 | Electricity — among the priciest in Asia today — starts getting cheaper. | factual, 0.95 |
| 12 | Cheaper power means factories that stay open past midnight. | warm, 1.00 |
| 13 | Cold storage that keeps the fishermen's catch fresh. | warm, 1.00 |
| 14 | Hospitals that never flicker. | quiet, 0.92 |
| 15 | Here is the mechanism: energy independence compounds. | near-whisper, 0.88 |
| 16 | Every peso not spent on imported fuel is a peso spent at home. | building, 0.98 |
| 17 | On schools. On roads. On the next power plant. | building, 1.00 |
| 18 | So the question was never whether the Philippines had energy. | reflective, 0.95 |
| 19 | It was always who got to switch it on. | landing, 0.90 |

Word count ≈ 225 → ≈ 90 s at narration pace. Timings locked after voice generation (word-level alignment).

## 3. Beat map (camera + labels)
| Time | Camera | On-screen fact label (typography) | Narration |
|------|--------|-----------------------------------|-----------|
| 0–8 | Orbit, full archipelago true-colour (EOX 2016 cloudless mosaic). Altitude readout descending. | — | L1–2 |
| 8–20 | Descend Luzon west coast → Bataan. Grey analyst grade settles in. | **BATAAN NUCLEAR POWER PLANT** — "Completed 1984. Never fueled." _(src: DOE Philippines)_ | L3–4 |
| 20–35 | Swing along the volcanic arc: Tiwi, Mak-Ban fields. Scan front reveals steam plumes (claim layer, amber). | **GEOTHERMAL** — "Among the world's top producers — barely tapped." _(src: DOE)_ | L5–7 |
| 35–50 | Cordillera rivers → Ilocos wind → central solar plains. Quick successive lock-ons. | **HYDRO · SOLAR · WIND** — "Unbuilt capacity on every island." _(src: DOE)_ | L8–9 |
| 50–65 | Pull back to grid view: transmission lines draw on, cities brighten. | **ELECTRICITY PRICE** — "Among Asia's highest today." _(src: DOE)_ | L10–14 |
| 65–80 | Night lights blooming outward from each plant; factories, ports, cold-storage towns. | — (imagery is the argument) | L15–17 |
| 80–90 | Pull back to orbit. Full archipelago glowing, true colour returns. | **"Contains modified Copernicus Sentinel data 2025"** (credit line) | L18–19 |

**Label grammar (per STYLE.md §4):** condensed grotesk reading, monospace instruments, label pinned to ground with leader line, source note beneath. One finding per screen. No narration subtitles burned in.

## 4. Imagery plates (sourcing plan)
1. **Opener (orbit):** EOX Sentinel-2 cloudless 2016 mosaic — CC BY 4.0, commercial-safe with attribution. Guaranteed cloud-free.
2. **Descent plates:** Sentinel-2 L2A true-colour via Copernicus Data Space (free account), 10 m, cloud filter ≤ 10–20%, target Feb–May scenes. AOIs: Bataan, Tiwi/Mak-Ban, Cordillera, Ilocos.
3. **Backup/historical:** USGS Landsat 8/9 (public domain).
4. **Never:** Google Earth/Bing/Esri (commercial use banned).
5. Plates nested by resolution (world → region → detail) with feathered edges, per STYLE.md §2.

## 5. Sound
- Voice: `am_michael`, per-line emotion table above; word timings drive label appearance.
- Music: analyst-documentary — low string drone + piano pulse; single warm swell at 50 s (grid lights), resolve at 80–90 s.
- No SFX libraries needed beyond subtle whoosh on the claim-layer scan front (style-native).

## 6. Render plan (GitHub workers)
- Film folder `films/ph-power-itself-90s/` committed to `anamesyaj/lemo-opuscar1`; generic chunked workflow renders frame ranges in parallel, stitches, muxes with the voice+music mix.
- Plates downloaded once in a prep job, cached as workflow artifacts.
- Stills QC at 4 s (orbit), 14 s (Bataan label), 28 s (geothermal), 44 s (wind/solar), 58 s (grid), 72 s (night bloom), 86 s (orbit return) — checked against STYLE.md before the full run.

## 7. Deviations / risks
- Satellite Briefing has no demo precedent for a *what-if future*; the claim layer (amber) carries all future-state visuals — flagged as the top QC watch item.
- Cloud-free plate hunting for 4 AOIs may take several candidate screenings; EOX mosaic covers the opener regardless.
- Fact labels are rendered graphics (requested), not narration captions (user-added in edit) — the two must never be confused in QC.
