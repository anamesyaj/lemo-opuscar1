# TREATMENT — "What if the Philippines powered itself?" (Low-poly rebuild)
**Style:** Low-poly Isometric Island (Lemo-Opuscar) · **Duration:** 90 s · **Format:** 9:16, 24 fps
**Voice:** Kokoro `am_michael` — REUSED from the satellite build (19 lines, timings locked)
**Render:** GitHub Actions workers (proven pipeline) · **Status:** DRAFT — awaiting user approval

## 0. Why this rebuild
User verdict on the Satellite Briefing cut: "no visualization, just zooming at the map." The style visualizes evidence, not action. This rebuild keeps the locked narration, voice, facts, and music direction, but re-directs everything into a style where the energy story is *watched happening*: plants rise, turbines turn, lines energize, the country lights up.

## 1. Locked (carried over, not re-decided)
- 19 narration lines, am_michael with per-line emotion (timings from satellite build's `voices/` — reuse the WAVs, do not regenerate).
- 4 sourced facts: Bataan (completed 1984, never fueled), geothermal (top producer, barely tapped), hydro/solar/wind (unbuilt capacity), electricity price (among Asia's highest). Sources: DOE Philippines.
- No burned-in narration subtitles (user adds captions). Fact labels ARE rendered (requested).
- Music: analyst-documentary replaced by the style's native sound grammar — see §5.
- Loudness −14 LUFS, voice ~10 dB above music. AI label ON at posting.

## 2. Three candidate structures
**A. The Build-Up (chosen).** The diorama starts as a dim, half-built archipelago. Each energy source arrives as a bounce-in construction event on the music grid: Bataan → geothermal → hydro → wind → solar → transmission lines → night + lights. The camera is mostly locked 3/4 wide (the world lives on its own); tight close-ups only on the 4 fact-label arrivals. Finale: pure orthographic zoom-out to the whole glowing archipelago.

**B. Day-in-the-life.** Follows one town's lights from dawn to night. Intimate but loses the national scale the topic needs.

**C. Split-screen then/now.** Two dioramas side by side (import-dependent vs self-powered). Strong contrast, but doubles the build cost and halves the screen each side gets.

**Choice: A.** It is the style's native grammar (arrival curves are the charm), and every beat is a visual event — nothing is "just zooming."

## 3. Beat map (visual events, not camera moves)
| Time | Visual event (arrival on the music grid) | Fact label (style §4 titles) | Narration |
|------|------------------------------------------|------------------------------|-----------|
| 0–8 | Dim archipelago diorama, sea gently moving. A single unlit tile column where Bataan will be. | — | L1–2 |
| 8–20 | **Bataan rises**: reactor dome + cooling tower bounce in with squash-and-stretch, splash ring. Close-up on the arrival. | **BATAAN** — "Completed 1984. Never fueled." _(SRC · DOE)_ | L3–4 |
| 20–35 | **Geothermal**: volcanic tiles pop, steam puffs rise continuously, pipes stack. | **GEOTHERMAL** — "Top producer — barely tapped." _(SRC · DOE)_ | L5–7 |
| 35–50 | **Hydro**: dam drops across a river tile, water flows. **Wind**: turbines pop, blades turn (style-native "mills turn"). **Solar**: panel fields pop in rows. | **HYDRO · SOLAR · WIND** — "Unbuilt capacity." _(SRC · DOE)_ | L8–9 |
| 50–65 | **Transmission lines** draw tile to tile across the islands (lateral truck shot). Towns' windows begin to glow. | **POWER PRICE** — "Among Asia's highest." _(SRC · DOE)_ | L10–14 |
| 65–80 | **Night falls** (style's day→night colour keyframes). Emissive windows, lamps, plant beacons bloom. Boats bob, smoke puffs. | — (the lit world is the argument) | L15–17 |
| 80–90 | **Pure zoom-out**: the whole archipelago glowing in the dark sea. Hold. | Credit line (small, low third) | L18–19 |

**Label grammar (STYLE.md §4):** titles rise like tiles (letters one by one, overshoot, settle); geometric sans; no boxes. One finding per screen. Credit line: "Contains modified Copernicus Sentinel data 2024" is NOT needed here (no satellite plates) — instead credit the style licence per CREDITS convention.

## 4. Motion quality (STYLE.md §5 — the anti-slideshow rules)
- Every arrival: cubic ease up + damped-sine overshoot + splash ring/spray at the water line. Event time = when it settles.
- Continuous life throughout: turbines turn, steam puffs, boats bob with the wave function, birds circle.
- Growth scheduled on the music grid: at most one piece per smallest slot; accelerate by density, not tempo.
- Camera: locked 3/4 wide for the build; tight close-up only on label arrivals; lateral truck for the transmission lines; pure orthographic zoom for the finale. Never moves: the projection.

## 5. Sound
- Voice: reused WAVs + timings.
- Music: rebuild to the style's grammar — marimba/kalimba/woodblock pulse on the arrival grid (every piece lands with a note), warm swell at 50 s, resolve 80–90 s. (Satellite build's string score does not fit the diorama.)
- Arrival SFX: soft bounce notes (style-native: "everything that appears arrives with a bounce and a note").

## 6. Render plan
- New film folder `films/ph-power-itself-90s-lowpoly/`; same generic GitHub workflow, 24 chunks.
- Stills QC at 14 s (Bataan arrival), 28 s (geothermal), 44 s (turbines), 58 s (transmission), 72 s (night bloom), 86 s (finale) — against STYLE.md.
- Per-frame QC on all 2160 frames (user lock): black/flat/frozen/luma + label legibility.

## 7. Risks
- The toy aesthetic is the point here, but it must not read as childish next to a serious topic — the fix is the analyst-grade labels and the measured narration, same contrast the treatment is built on.
- Night lighting is the money shot; if the emissive pass looks flat in stills, fix before the full render.
