# TREATMENT: What If You Swallowed a Single Drop of Lava?

- **Format**: 1080×1920 (9:16 vertical), 30 fps, ~52.0 s (`duration` locked to exact mastered timeline after TTS/ASR timing check)
- **Style**: **ZackD Films** (`animation-styles/references/styles/zackd-films.md`) — soft rounded three.js vinyl-clay 3D (`MeshPhysicalMaterial`, `roughness ~0.45`, `clearcoat ~0.3`), warm studio key + cool surgical rim light, clean anatomical cross-sections, tactile mechanisms, bold safe-zone typography
- **Render Pipeline**: Lemo-Opuscar 18-worker parallel GitHub Actions farm (`.github/workflows/render.yml` → `plan.py` → `tools/render-chunk.mjs` → `stitch.py` → `core/render/mux.sh` at −14 LUFS) + self-contained interactive player HTML

---

## 1. Three Candidate Structures & Why We Chose #3

1. **Candidate A — The Straight Cartoon Descent ("Melts Right Through You")**
   - *Shape*: Drop enters mouth → burns throat → hits stomach → melts out of the abdomen onto the floor.
   - *Why rejected*: Scientifically false cliché. A single pea-sized drop (~0.55 g at 1,200 °C) carries only ~1,000 Joules of heat—enough to boil ~0.4 g of water, nowhere near melting through an organ wall.
2. **Candidate B — Clinical ER Progression (Second 1 → Minute 5 → Day 3)**
   - *Shape*: Cut from swallowing the drop to hospital monitors, intubation tube, endoscopy screen, and surgical recovery.
   - *Why rejected*: Too static and hospital-bound; sacrifices the visceral, millimeter-scale anatomical cutaways that make the ZackD 3D look shine.
3. **Candidate C (CHOSEN) — Myth-Busting Micro-Odyssey ("3 Seconds, 1,000 Joules & The Obsidian Twist")**
   - *Shape*: Start millimeter-close on the glowing 1,200 °C droplet falling toward an open mouth. Follow it inside a 3D sagittal anatomical cutaway through two counterintuitive physical mechanisms (**Leidenfrost vapor skating** on the tongue at 1,700× expansion, and **flash-steam airway swelling** + sticky silicate esophageal burn), then drop into near-silence for **the thermodynamic turn**: instead of melting through your belly like Hollywood acid, stomach fluid quenches the 1,000-Joule droplet in 3 seconds into **shattered razor-sharp volcanic glass (obsidian)**. Close on a bookend dual-pedestal reveal comparing the glowing molten drop at `t = 0` with the cold fractured black obsidian bead inside you.
   - *Why chosen*: Combines immediate hook, genuine scientific surprise, tactile 3D mechanisms on every beat, a true material-transformation native move at the climax, and a memorable bookend ending.

---

## 2. Logline & Emotional Arc

- **Logline**: Swallowing a single 1,200 °C drop of lava triggers a three-second clash between molten rock and human water—skating on boiling steam, swelling the airway shut, and shock-quenching into razor-sharp volcanic glass inside your stomach instead of melting through you.
- **Arc**:
  - **Setup (0.0–31.6 s)**: Visceral dread & curiosity—a single glowing viscous droplet enters the mouth, skates on a 1,700× Leidenfrost vapor cushion across the tongue, blasts superheated steam into the larynx, and snags against the esophageal wall.
  - **Turn (31.6–45.2 s)**: After a deliberate silence, Hollywood physics is busted—1,000 Joules runs out of heat in <0.5 g of water, rapidly quenching the glowing clay droplet from outside in until thermal shock shatters it into mirror-black volcanic glass.
  - **Ending (45.2–52.0 s)**: Clean diagnostic clarity & bookend echo—pulling back to compare the incandescent lava drop from frame 0 beside the cold jagged obsidian shards, revealing the three real medical emergencies inside the cutaway torso.

---

## 3. Benchmark (Learn / Don't Take)

- **Reference Works**:
  1. *Zack D. Films* 3D anatomical explainer shorts (for vinyl-clay material softness, surgical sagittal cutaways, crisp studio lighting, and demonstrating every claim physically).
  2. *Kurzgesagt — "What Happens If We Bring the Sun to Earth?"* (for thermodynamic heat-budget visual comparisons that overturn movie myths).
- **What to learn**:
  - Rounded bevelled geometry (`ExtrudeGeometry` / lathe / capsule cross-sections) where outer skin is soft matte peach clay and cut planes reveal distinct ivory bone, coral muscle, and pink mucosa layers.
  - Warm self-illumination from the molten drop (`PointLight` casting orange-gold bounce onto wet pink tissues) against a clean dark slate-navy studio backdrop (`#121826`).
  - Fast, purposeful camera grammar: macro hero → side-by-side studio comparison → cutaway push-in → microscopic surface glide → vertical anatomical track → orbital slow-motion shatter → bookend pull-back.
- **What not to take**:
  - No copied character meshes, channel logos/watermarks, proprietary fonts, or borrowed melodies.

---

## 4. Cast & World Continuity Sheet (`workflow.md` §2)

- **Protagonist ("Leo")**: Stylized ZackD rounded vinyl-clay human (`skin: #f2bfa0`, cutaway inner dermis `#e38b7a`, ivory skull/jaw/teeth `#f5efe2`, coral-teal raglan shirt `#2b6cb0` / `#38b2ac`, expressive dark glossy eyes `#161a22` with white catchlights, rounded ears & soft swept chestnut hair `#4a3228`). Consistent proportions and lighting across Beats 1, 3, 5, 7, and 9.
- **Hero Object — The Single Lava Drop**: 6 mm pea-sized teardrop/sphere (~0.55 g). Starts incandescent molten orange-yellow (`color: #ff6a00`, `emissive: #ff4500`, cooling basalt crust patches `#2a1a18`), stretches viscous taffy strands in Beats 2 & 6, and transitions continuously in Beat 8 into mirror-glossy jet-black **obsidian glass** (`color: #090c12`, `roughness: 0.06`, `clearcoat: 1.0`) before fracturing into 9 angular facets.
- **Anatomical Palette**: Tongue & mucosa `#e86f82` (seared track `#f4ede8` → `#5c4742`), airway cartilage rings `#dce6f2`, esophageal muscle `#c94b63`, gastric fluid `#8fd14f` / `#b8e986` translucent sheen, arterial highlights `#e53e3e`.
- **Studio Lighting**: Warm-white key (`0xfff2de`, intensity 2.1 from upper-left front), cool surgical blue rim (`0x7fb3ff`, intensity 1.25 from back-right), soft hemisphere fill (`0xcfe2ff` / `0x1a2030`, 0.65), plus dynamic orange `PointLight` attached to the lava drop (fades to 0 as it quenches into obsidian!).
- **Typography**: Self-hosted OFL `Fredoka` / `Nunito` Heavy bold sans. Top headline badge strictly at `y = 265..385` (`>= 240 px` safe top), burned-in voice captions at `y = 1445..1545` (`<= 1920 - 350 = 1570 px` safe bottom), `x` padded `>= 90 px` from edges.

---

## 5. Shot List & Camera Grammar (9 Beats, 7 Distinct Camera Moves)

| Shot / Beat | Time (approx) | Framing | Angle | Camera Move | Why It Is Shot This Way |
|---|---|---|---|---|---|
| **1. The Drop Above Open Jaws** | 0.0–3.8 s | Macro Close-Up | High 35° looking down into open mouth | **Slow vertical follow-drop + handheld micro-drift** | Immediate visceral hook on frame 0: steel tongs release a glowing 1,200 °C drop millimeters above Leo's open mouth, illuminating teeth and tongue in orange glow. |
| **2. 1,200 °C & Liquid Honey Scale** | 3.8–9.4 s | Medium Studio Two-Shot | Eye-level orthographic-feel front | **Lateral studio dolly pan (left → right)** | Demonstrates both temperature (100 °C steaming mug vs. towering 1,200 °C 12× thermal column) and viscosity (glowing lava stretching like thick honey from a crucible). |
| **3. Sagittal Head Cutaway: 1,700× Steam Flash** | 9.4–15.4 s | Medium Close-Up (Cutaway) | 90° Sagittal Profile | **Push-in through cutaway plane** | Classic ZackD half-head slice lets us watch the drop strike the wet tongue while saliva flashes into a 1,700× expanding ring of white-blue steam spheres. |
| **4. Microscopic Tongue: Leidenfrost Skate** | 15.4–21.0 s | Extreme Macro Insert | Low grazing 15° surface angle | **Tracking dolly glide parallel to tongue** | Reveals the counterintuitive physics: the glowing bead levitates above pink papillae on a shimmering vapor cushion, searing a white third-degree path behind it. |
| **5. The Airway Trap: Larynx Swelling Shut** | 21.0–26.8 s | Close-Up Anatomical Cutaway | Slight high-angle 3/4 cutaway | **Vertical crane down pharynx to vocal cords** | Shows why steam is the fastest killer: hot vapor curls into the trachea, inflating pink clay vocal folds inward until the airway narrows to a critical slit. |
| **6. Esophagus Snag & Deep Wall Crater** | 26.8–32.2 s | Tight Vertical Insert | Straight-on cross-section | **Slow push-in + subtle shake on snag** | Shows viscous cooling silicate clinging like molten taffy to the muscular esophageal tube and burning a deep focal crater into the wall. |
| **7. The Turn: Hollywood Belly Myth vs. 1,000 J** | 32.2–38.8 s | Full Torso Cutaway + Gauge | Front eye-level | **Pull-back reveal + snap zoom on X stamp** | Visualizes the busted movie cliché (dotted melt-through path stamped with a bold 3D red X) right beside a draining 1,000 J heat bar vs. a tiny 0.4 g water drop. |
| **8. Native Move: Quench & Obsidian Shatter** | 38.8–45.4 s | Macro Inside Stomach Cutaway | Dynamic 25° hero angle | **Slow-motion 40° orbital push** | **Signature Native Move**: inside the stomach pool, the emissive clay drop freezes from outside in into glossy black obsidian and shatters into 9 sharp glass shards. |
| **9. Bookend Verdict: Molten Drop vs. Obsidian** | 45.4–52.0 s | Medium-Full Cutaway + Foreground Pedestals | Eye-level hero | **Smooth pull-back to bookend composition** | Echoes Beat 1: glowing 1,200 °C drop vs. cold shattered obsidian on twin pedestals in front of Leo's torso cutaway with the 3 real hazard rings pulsing clearly. |

---

## 6. Second-by-Second Beat Sheet & Narration Script

*(Exact timestamps refine to millisecond precision from `dur.json` + `words.json` after Kokoro TTS & Whisper verification.)*

- **0.0–3.8 s (Beat 1)**: Tongs open; glowing teardrop stretches and falls toward Leo's open mouth.
  - *VO 1*: "What if you swallowed a single drop of lava?"
  - *Top Card*: `WHAT IF YOU SWALLOWED` / `1 DROP OF LAVA?`
- **3.8–9.4 s (Beat 2)**: Studio stage compares 100 °C boiling mug vs. 1,200 °C crucible pouring thick viscous lava ribbon + rising `12×` bar.
  - *VO 2*: "Fresh lava erupts at twelve hundred degrees Celsius, twelve times hotter than boiling water, and thick like glowing honey."
  - *Top Card*: `1,200°C · 12× BOILING WATER`
- **9.4–15.4 s (Beat 3)**: Sagittal head cutaway; lava hits wet tongue, erupting concentric white-cyan steam clouds (`1,700×` badge pops).
  - *VO 3*: "The instant that drop hits your wet tongue, saliva flashes into steam, expanding seventeen hundred times in volume."
  - *Top Card*: `STEAM EXPANDS 1,700× INSTANTLY`
- **15.4–21.0 s (Beat 4)**: Macro papillae view; drop hovers on pressurized vapor layer, gliding right-to-left and leaving a bleached white charred furrow.
  - *VO 4*: "For a split second, the lava skates on a vapor cushion, searing a white third degree track that destroys taste buds instantly."
  - *Top Card*: `LEIDENFROST VAPOR CUSHION`
- **21.0–26.8 s (Beat 5)**: Neck cutaway at epiglottis & larynx; rising steam billows into airway, pink mucosal walls swell inward, red danger halo pulses.
  - *VO 5*: "Worse, inhaling that superheated steam makes your throat swell shut within seconds, threatening suffocation first."
  - *Top Card*: `STEAM SWELLS AIRWAY SHUT`
- **26.8–31.8 s (Beat 6)**: Esophageal tube cross-section; cooling crusty drop snags on tissue, stretching glowing filaments and burning a dark crater.
  - *VO 6*: "As you swallow, the sticky molten rock clings to your esophagus, burning a deep crater through the tissue wall."
  - *Top Card*: `BURNS CRATER IN ESOPHAGUS`
- **31.8–32.5 s — SILENCE #1 (0.7 s near-silence)**: Music drops out completely; only a single low heartbeat before the turn.
- **32.5–38.8 s (Beat 7)**: Torso stomach cutaway; cartoon "melt through belly" arrow is blocked by a 3D red `X` while the `1,000 J` meter empties against `0.4 g H₂O`.
  - *VO 7*: "You might expect it to melt straight out of your stomach like in movies, but one pea sized drop holds only a thousand joules of heat."
  - *Top Card*: `MYTH BUSTED: ONLY 1,000 JOULES`
- **38.8–45.4 s (Beat 8)**: Drop plunges into stomach fluid; at ~41.6 s (**SILENCE #2**, 0.45 s hush) the orange glow freezes black and *CRACKS* into 9 spinning obsidian glass shards!
  - *VO 8*: "That can boil less than half a gram of water, so stomach acid quenches the lava in three seconds into razor sharp volcanic glass."
  - *Top Card*: `QUENCHED INTO VOLCANIC GLASS`
- **45.4–52.0 s (Beat 9)**: Pull back to torso cutaway (3 pulsing callout rings: Airway, Esophagus, Obsidian Shards) + twin pedestals (`1,200°C LAVA` → `COLD OBSIDIAN`). Hold clean 2.2 s resolve after final word.
  - *VO 9*: "One drop will not melt through your belly. Instead, steam, a punctured throat, and shattered obsidian inside you become the real emergency."
  - *Top Card*: `3 REAL RISKS · NOT MELTING`

---

## 7. Cue Map & Original Score Architecture

- **Tempo & Grid**: **120 BPM** (1 beat = 0.50 s, 1 bar = 2.00 s), D minor → Bb Lydian turn → D minor resolute cadence.
- **Sound Palette** (no generic piano-and-strings):
  - **Tactile Woody Marimba / Plucked Mallet Synth** (characteristic ZackD/explainer curiosity pulse, eighth-note syncopated ostinato).
  - **Warm Analog Sub-Pulse** (MIDI ≥ 50 / D3 = 146.8 Hz with 2nd & 3rd harmonics so phone speakers read it cleanly, keeping 20–120 Hz balanced).
  - **Glass Harmonica / Crystalline Bell Shimmer** (enters exclusively on the Obsidian Glass turn in Beats 8–9).
- **Pacing Variation**:
  - *Bars 1–2 (0–4 s)*: Sparse tense mallet tick + rising heat swell (hook).
  - *Bars 3–16 (4–31.8 s)*: Driving 120 BPM marimba ostinato; accelerates density into sixteenth-note urgency during Airway Swelling (Beat 5).
  - *31.8–32.5 s*: **Full musical silence #1** (only one deep heartbeat).
  - *Bars 17–20 (32.5–41.4 s)*: Half-time investigative pulse as the movie myth is busted.
  - *41.4–41.85 s*: **Micro-silence #2** inside the stomach pool → broken by the crystalline **Obsidian Thermal-Shock Crack**!
  - *Bars 22–26 (41.85–52.0 s)*: Shimmering glass-bell + marimba finale resolving cleanly on a warm D9 chord hold.
- **J-Cuts / L-Cuts**:
  - *J-Cut #1 (9.1 s)*: Violent steam hiss begins 0.3 s *before* the cut from Beat 2 studio stage into Beat 3 mouth cutaway.
  - *L-Cut #2 (31.6–32.4 s)*: Low embers crackle trails across the cut into Beat 7 before dropping to silence + heartbeat.
  - *J-Cut #3 (38.5 s)*: Liquid acid submerge bubble enters 0.3 s *before* cutting inside the stomach pool in Beat 8.

---

## 8. Sound Design Table

| Section / Beat | Ambience Bed | Main Foley (Frame-Synced) | Music State |
|---|---|---|---|
| **Beat 1 (0–3.8 s)** | Low volcanic radiant hum | Metallic tong release click (`0.3 s`), viscous molten drip stretch (`1.4 s`) | Tense sparse D-minor mallet pulse + heat riser |
| **Beat 2 (3.8–9.4 s)** | Clean studio room air | Kettle soft boil (`4.2 s`), heavy viscous magma pour & rising bar ticks (`6.0 s`) | 120 BPM woody marimba curiosity groove |
| **Beat 3 (9.4–15.4 s)** | Resonant oral cavity | **J-cut flash-steam burst** (`9.1 s`), wet sizzle & expanding vapor whoosh (`10.2 s`) | Marimba + crisp sub-bass pulse (ducked under VO) |
| **Beat 4 (15.4–21.0 s)** | Pressurized high-frequency vapor | Continuous Leidenfrost airy skate hiss (`15.6–20.4 s`), nerve-sear crackle | Syncopated mallet pattern |
| **Beat 5 (21.0–26.8 s)** | Tightened tracheal airflow | Steam rush upward (`21.2 s`), muffled clay tissue inflation + urgent heartbeat (`23.5 s`) | Double-time 16th-note tension build |
| **Beat 6 (26.8–31.8 s)** | Deep internal chest resonance | Sticky silicate snag squelch (`27.3 s`), deep tissue char sizzle (`29.0 s`) | Low tension drone → cuts off at `31.8 s` |
| **Turn Silence + Beat 7 (31.8–38.8 s)** | **Near-silence** (`31.8–32.5 s`) | Single heartbeat (`32.0 s`), crisp 3D `X` stamp thud (`34.2 s`), energy meter drain ticks | Half-time investigative marimba re-enters at `32.6 s` |
| **Beat 8 (38.8–45.4 s)** | Submerged gastric fluid | **J-cut liquid plunge** (`38.5 s`), rapid quench boil → **0.45 s hush** → **sharp obsidian glass CRACK & shard chimes** (`41.85 s`) | Crystalline glass-bell chord blooms after the crack |
| **Beat 9 (45.4–52.0 s)** | Clean warm studio air | Three soft diagnostic ping chimes (`46.5, 47.4, 48.3 s`), final crystalline settle (`50.2 s`) | Full marimba + glass-bell resolve, clean fade to `-inf` |

---

## 9. Subtitle & Title Design

- **Top Callout Pill (`y = 265..380`)**: Rounded dark frosted slate pill (`rgba(15, 20, 34, 0.86)`) with warm lava-amber accent border (`#ff7a2f` in setup, `#38bdf8` in turn/glass beats), bold uppercase `Nunito` 900 (`42 px`), high contrast white + amber keywords.
- **Burned-in Voice Captions (`y = 1445..1540`)**: Synchronized 3–6 word phrase chunks derived directly from Whisper word timestamps (`words.json`), rendered in `44 px` extra-bold white with a crisp dark outline/pill inside the 9:16 safe zone (`x ∈ [90, 990]`, `y ≤ 1550`), plus exported sidecar `what-if-drop-of-lava.srt` (every cue held ≥ 1.8 s per `DIRECTOR.md` §7).
