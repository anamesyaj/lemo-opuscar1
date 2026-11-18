# Treatment: *The French Town That Sued Tiny Bugs (1587)*

- **Title**: *The French Town That Sued Tiny Bugs*
- **Format**: 9:16 vertical (`1080×1920`), `30 fps`, **30.0 s** (`900` frames), animated 2D bean-head cartoon cards & animated weevil rigs inside a 3D painterly ink-outlined world (`cartoon-short-kit` engine architecture), Kokoro narration + burned-in safe-zone captions + `.srt`, `-14 LUFS`.
- **No external brand/watermark**: Original independent production (`films/weevil-trial-1587/`), zero LemoLab/watermark text.

---

## 1. Three Candidate Structures (and Choice)

1. **Candidate A — Archival Dossier Walkthrough**: Camera stays overhead on an oak table flipping through 29 Latin legal documents while diagram arrows explain 16th-century canon jurisprudence.
   - *Verdict*: Rejected — stays cold and cerebral, wasting the absurd slapstick contrast of tiny green beetles sitting in a solemn wooden witness dock.
2. **Candidate B — Verdict-First Cold Open**: Open on the chewed final manuscript stamped `"VERDICT: MISSING"`, then flash backward to explain how the trial happened.
   - *Verdict*: Rejected — gives away the historical punchline in Beat 1, turning the rest of a 30-second short into exposition instead of escalating absurdity.
3. **Candidate C — Escalating Courtroom Comedy with a Physical Evidence Turn (CHOSEN)**:
   - Open *in media res* on a giant-macro vine leaf violently losing chunks to a tiny grinning green weevil while the frantic St-Julien winegrower drops to his knees holding a subpoena (`0.0–5.4 s`).
   - Smash into the Bishop of Maurienne's vaulted stone court where court-appointed lawyers actually defend the insects with theological zeal while a giant hero weevil lounges on a witness cushion (`5.4–14.8 s`).
   - Pivot to the desperate bribery settlement: the town fences off a rocky wasteland sanctuary (*Le Grand Feisse*), only for the pompous weevil lawyer to inspect one pathetic dead twig and reject the real-estate offer (`14.8–22.8 s`).
   - Land on the candlelit archive turn: months pass, the bishop lifts his quill over the final *"VERDICT"* page — pause for **Silence #2** — then a silhouette weevil takes a huge loud **CHOMP** straight through the word `"VERDICT"` and burps a confetti shred (`22.8–30.0 s`).

---

## 2. Logline & Emotional Arc

- **Logline**: In 1587, desperate winegrowers dragged vineyard beetles into a church court — only for the bugs' court-appointed lawyers to turn down a free land deal right before pests chewed the verdict page out of history.
- **Setup (0.0–5.4 s)**: Greedy weevils demolish prize grapes; furious villagers serve them a real ecclesiastical court summons.
- **Complication / Turn (5.4–22.8 s)**: Far from rubber-stamping an extermination order, the church court assigns brilliant defense lawyers to the insects — who cite Scripture and even reject the town's bribe of free land as *"too barren."*
- **Payoff (22.8–30.0 s)**: Just as the final judgment is finally about to be read from the archive ledger, insects literally eat the verdict page out of existence.

---

## 3. Benchmark (Grammar Only)

- **Reference Grammar**: Classic theatrical cartoon shorts (Warner/UPA court gag compression + clean silhouette staging) & concise micro-history vertical explainers (ZackD crisp visual literalism + instant 1-second hook).
- **What to learn**: Staging depth along the camera Z-axis to maximize the narrow 9:16 frame (`±0.8 m` horizontal half-width at `4 m`); immediate prop-driven comedy (`subpoena scroll`, `witness cushion`, `real estate sign`, `chewed ledger page`); crisp pose anticipation → overshoot → spring settle; music dropouts before key gags.
- **What NOT to take**: Modern slang jokes, generic "piano and strings", recycled village layouts, or any external characters/logos. Every asset, light preset, character costume, bug rig, set piece, cue, and camera curve is built fresh for St-Julien 1587.

---

## 4. Cast & Look Bible

- **Visual Language**: `three.js` painted world with depth+normal screen-space ink outlines (`widthNear 5.1 px` → `widthFar 3.3 px`, plum-black `#030303`) + un-outlined self-lit 2D cartoon cards on `NOINK = 3` + 48-tap depth of field on tight shots.
- **Hero Cast (2D Bean-Head Cards & Articulated Bug Cards)**:
  1. **François Amenet (Savoyard Winegrower)**: Sun-tanned skin, dark plum-ink eyebrows, ochre straw hat / wine-stained apron, blue-slate peasant vest, holding torn vine leaf & rolled court summons. Emotions: `shock` → `pained` → `stubborn` → `nervous` → `dazed`.
  2. **Antoine Filliol (Insect Defense Lawyer)**: Pale pinched face, curled dark wig / flat velvet lawyer's bonnet, sweeping black-plum robe with crisp white linen collars/bibs, waving leather Bible/law brief & magnifying brass loupe. Emotions: `smirk` → `grin` → `stern` → `laugh`.
  3. **Ecclesiastical Judge (Bishop's Official)**: Stout build, warm bronze velvet miter cap (`#7c2f3b` with gold cross trim), flowing burgundy/charcoal judicial vestments, raised heavy gavel and goose quill. Emotions: `stern` → `squint` → `shock`.
  4. **Chief Weevil (*Verpillion*) & Swarm**: Custom procedural cartoon weevil rig in `cast_weevil.js` (glossy emerald-gold carapace `#63a83b` with warm lime highlights & thick-thin plum ink contour, curved striped proboscis snout, bouncing clubbed antennae, six scuttling legs, blinking googly/lidded cartoon eyes, chewing mandibles holding leaf/parchment!). Can scale seamlessly from swarm specks on vines to **hero witness size** perched atop a crimson velvet witness cushion!

- **Four Custom Lighting & Time-of-Day Presets (`lights.js`)**:
  1. `vineyard` (Warm golden-green Savoy afternoon, bright leaf greens, crisp sky-blue zenith).
  2. `courtroom` (Dramatic warm amber church clerestory shaft + cool indigo stone pillar shadow contrast).
  3. `wasteland` (Dry bleached dusty-ochre afternoon over rocky scrubland *Le Grand Feisse*).
  4. `archive` (Intimate golden-orange candlelight glow over oak desk + deep plum nocturnal library shadows).

---

## 5. Spoken Script (`84 Words` — Fits `30.0 s` Cleanly with Two True Silences)

All numbers spelled out for Kokoro TTS (`1587` → `"fifteen eighty seven"`), digits formatted cleanly in captions (`1587`). Verified via Whisper `base.en` (`core/tts/asr_check.py`, `mismatches: 0`).

- **Line 01** `[0.20–5.24 s]` *(Hook · Vineyard)*:
  `"In 1587, a French town actually sued tiny green weevils for eating their vineyards."`
- **Line 02** `[5.44–9.54 s]` *(Courtroom & Lawyers)*:
  `"The church court even gave the bugs real defense lawyers, who nearly won the case."`
- **Line 03** `[9.80–14.78 s]` *(Genesis Argument)*:
  `"Since God created insects first, lawyers argued bugs held prior rights to eat green leaves."`
- `[14.78–15.63 s]` — **SILENCE #1 (`0.85 s`)** *(Score drops completely; parchment deed `"LE GRAND FEISSE"` unrolls across the oak court table at `14.80 s`)*
- **Line 04** `[15.63–20.09 s]` *(Land Bribe Rejected)*:
  `"Panicked villagers offered the bugs free land, yet the lawyer rejected it as rocky dirt."`
- **Line 05** `[20.30–23.70 s]` *(Months Later · Candlelight Ledger)*:
  `"Months of delays dragged on until the bishop finally penned a verdict."`
- `[23.70–24.55 s]` — **SILENCE #2 (`0.85 s`)** *(Pin-drop quiet; candlelight flickers on `"VERDICT:"` as an antenna shadow creeps across the page → **`24.60 s` LOUD SIGNATURE PARCHMENT CRUNCH!**)*
- **Line 06** `[25.25–29.17 s]` *(Payoff Ending)*:
  `"History never learned who won, because insects literally chewed up the last page!"`

---

## 6. Shot List & Beat Sheet (`30.0 s` = `900 frames` @ `30 fps`, `150 BPM` = `12 frames/beat`, `48 frames/bar`)

| Shot | Time (`f`) | Duration | Scene & Light | Framing & Camera Move | Why Framed That Way + Key Action |
|---|---|---|---|---|---|
| **1 — Vineyard Crime** | `0.00–5.17 s` (`f0–155`) | `5.20 s` (`156 f`) | Sunny Savoyard terraced vineyard (`vineyard`) | **Macro close-up** on giant grape leaf & munching weevil (`0.0–1.4 s`) → smooth **dolly pull-back + left track** (`1.4–5.17 s`) revealing chewed vine & kneeling winemaker Amenet waving a court summons | Instant visual hook at `t=0`: tiny villain demolishes grape leaf in audience's face before pulling back past leaf edge onto furious farmer |
| **2 — Witness Box** | `5.20–9.67 s` (`f156–290`) | `4.50 s` (`135 f`) | Vaulted stone church court (`courtroom`) | **Cut** (`f156`) to **low-angle crane** looking past witness box at Judge's high wooden dais (`5.26 s` **gavel slam kick**), swinging down onto tiny green Hero Weevil lounging on a crimson velvet witness cushion | Scale inversion joke: soaring gothic authority presiding politely over a 3 cm beetle on a plush velvet pillow |
| **3 — The Bug Lawyer** | `9.70–14.67 s` (`f291–440`) | `5.00 s` (`150 f`) | Courtroom floor (`courtroom`) | **Glide** from Hero Weevil onto smug lawyer Filliol pointing upward to golden sunbeam rays (`9.7–13.2 s`), fast reaction pan left onto shocked Amenet & baffled Judge (`13.2–14.67 s`) | Makes the absurd Genesis theological argument crystal clear visually: counsel points to heaven while villager's jaw drops (`shock`) |
| **4 — Silence #1 + Bribe Deed** | `14.70–16.27 s` (`f441–488`) | `1.60 s` (`48 f`) | Courtroom oak table → wasteland (`courtroom` → `wasteland`) | `14.70–15.60 s`: **SILENCE #1 + top-down table insert** of settlement deed `"LE GRAND FEISSE"` unrolling onto oak planks → `15.63 s` (`f469`) **cut outdoors** to barren fence hillside as villagers wave nervously | Silence clears the comedy Beat; rolling parchment visually bridges indoor bailout offer to outdoor scrubland |
| **5 — Barren Rejection** | `16.30–20.13 s` (`f489–604`) | `3.87 s` (`116 f`) | Dry rocky scrub hill *Le Grand Feisse* (`wasteland`) | **Lateral track** across cracked dry earth & dead twig (`16.3–18.0 s`) → **whip-pan to signboard** as Filliol stands up and **`18.60 s` (`f558`) SLAMS crimson `REJECTED` stamp** onto `"LE GRAND FEISSE"` while Hero Weevil watches smugly atop the sign | Establishes why counsel rejected it with zero extra dialogue — cracked earth + dead twig + huge crimson stamp |
| **6 — Passage of Time & Verdict Pen** | `20.17–24.53 s` (`f605–736`) | `4.40 s` (`132 f`) | Archive lectern (`archive`) | **6-frame warm flash transition (`f605–610`)** → open brass-clasp parchment court ledger while 1587 calendar pages riffle (`20.45–21.65 s`) & Bishop's goose quill writes **`VERDICT:`** (`22.10–23.55 s`); **`23.70–24.55 s`: SILENCE #2** creeping overhead push as beetle antenna shadow slides onto page corner | Slow push builds breathless suspense through Silence #2 so the upcoming bite crunch lands like thunder |
| **7 — Chewed Into History (Payoff)** | `24.57–30.00 s` (`f737–899`) | `5.43 s` (`163 f`) | Archive lectern (`archive`) | **NATIVE MOVE (`24.60 s / f738`)**: Giant ragged cartoon bite-hole punches cleanly through `"VERDICT:"` page + **7-frame flip-shake**, Hero Weevil pops straight up through chewed hole holding torn `"VERDICT"` crumb → **settle pull-back (`25.4–30.0 s`)** as Bishop throws arms up & weevil burps (`29.00 s`) + winks cleanly through `30.00 s` | Directly closes the Shot 1 bookend: the tiny culprit who ate grapes at frame 0 calmly eats history's verdict at frame 738 |

---

## 7. Cue Map (`150 BPM`, 4/4 Time · 1 Beat = `0.400 s` = `12 f` · 1 Bar = `1.600 s` = `48 f`)

| Bar (Time) | Frame Span | Section & Feel | Instrumentation | Hit Points (Beat-Locked) |
|---|---|---|---|---|
| **Bars 1–3** (`0.00–4.80 s`) | `f0–143` | **Vineyard Mischief** | Crisp plucked Karplus-Strong Renaissance lute ostinato (D Dorian) + harpsichord + bassoon bass (`>= C3`) | **B1 (`0.35 s, 0.92 s, 1.50 s`)**: wet leaf chomp bites; **B2 (`2.75 s`)**: parchment summons rustle |
| **Bars 4–9** (`4.80–14.66 s`) | `f144–439` | **Ecclesiastical Trial** | Pompous comic bassoon + harpsichord chords + woodblock court ticks + lute melody | **B4 (`5.26 s`)**: heavy oak Judge gavel slam; **`7.45 s`**: velvet cushion bounce; **`9.75 s`**: robe/page swish |
| **SILENCE #1** (`14.66–15.54 s`) | `f440–466` | **Complete Score Dropout** | Total instrumental cut (`880 ms` cosine gate) | **`14.80 s`**: crisp dry parchment settlement deed unroll on oak table |
| **Bars 10–14** (`15.54–23.66 s`) | `f467–709` | **Wasteland & Archive Delays** | Wry D Dorian bassoon + pizzicato lute + woodblock fading softly into bar 14 (`22.4–23.65 s`) | **`17.85 s`**: brass loupe clink; **`18.60 s`**: heavy **`REJECTED`** ink stamp thud; **`20.45–21.65 s`**: calendar flutters; **`22.15 s`**: goose quill nib scratch |
| **SILENCE #2** (`23.66–24.98 s`) | `f710–749` | **Pin-Drop Suspense Silence** | Pure score dropout (`23.66–24.55 s`) leading into isolated bite attack | **`24.60 s` (`f738`)**: Ultra-crisp **SIGNATURE PARCHMENT TEAR & BITE CRUNCH** |
| **Picardy Finale** (`25.00–30.00 s`) | `f750–899` | **Cheeky Picardy Tag** | Triumphant cheeky **D Major Picardy Third** lute + bassoon + harpsichord chord button at `29.22 s`, smooth fade to exact `0` by `30.00 s` (`30–65 s` pure digital zeros) | **`29.00 s`**: satisfied cheeky burp pop; **`29.22 s`**: D Major finale chord |

---

## 8. Sound Design Table (Every Row Verified in Mix)

| Section | Ambience / Bed | Main Foley (Timed to Action) | Music State |
|---|---|---|---|
| **Shot 1: Vineyard** | Ducked D Dorian chamber bed | Wet leaf chomps (`0.35s`, `0.92s`, `1.50s`), parchment summons rustle (`2.75s`) | Lute + harpsichord + bassoon (sidechain ducked) |
| **Shot 2–3: Courtroom** | Vaulted chamber groove | Oak gavel bang (`5.26s`), cushion squeak (`7.45s`), robe swish (`9.75s`) | Ecclesiastical bassoon + harpsichord + woodblock |
| **Shot 4: Silence #1** | Complete silence (`0.88 s`) | Parchment settlement deed unroll (`14.80s`) | **Complete score dropout** |
| **Shot 5: Le Grand Feisse** | Dry comedic underscore | Step tick (`16.50s`), brass loupe clink (`17.85s`), heavy `REJECTED` stamp (`18.60s`) | Comic bassoon + lute |
| **Shot 6: Archive & Silence #2** | Softening underscore -> pin-drop silence (`23.66–24.55s`) | 4× calendar flutters (`20.45–21.52s`), goose quill nib scratch (`22.15s`) | Gently fades -> **Complete Silence #2** |
| **Shot 7: Verdict Eaten** | Crisp payoff attack -> bright tag | **`24.60s`: SIGNATURE PARCHMENT TEAR & CRUNCH**, comic burp pop (`29.00s`) | D Major Picardy Third tag ending cleanly by `29.88s` (`0` at `30.0s`) |

---

## 9. Subtitle, Diegetic Prop Text, & Safe Zones (`1080×1920`)

- **Typography**: Self-hosted `/core/fonts/fonts.css` (`Fredoka` 600/700 for readable captions & plaques; `IM Fell English` italic/roman on in-world parchment decrees & ledger ink!). Never linked from remote URLs.
- **Safe Zones**:
  - **Top Diegetic Case Plaque (`y = 250..336 px`)**: Rounded parchment-dark court header (`ST. JULIEN · 1587`, `THE CASE FILE`, `LE GRAND FEISSE`, `FINAL VERDICT`). Holds continuously well over `readcheck.mjs` minimums (`4.8–6.0 s` per phase).
  - **Burned-In Captions (`y <= 1548 px`, bottom safe margin > `372 px`)**: Semi-transparent dark ink pill behind `Fredoka 600` (`38 px`), crisp white text, wrapped nicely within `830 px` width, synced verbatim to `audio/captions.srt` and `weevil-trial-1587.srt` (`1587` digits in text!).
  - **In-World Painted Text**: Rolled summons `"SUMMONS"`, hill wooden sign `"LE GRAND FEISSE"` + `"REJECTED"`, archive open book `"ACTA SANCTI JULIANI"` / `"VERDICT:"`. All world signs use planar front-facing UVs with **`mirror = false`**, checked carefully on stills!
- **Demo Independence Check**: Completely distinct from `dancing-plague` across all six comparison axes:
  1. **Structure**: Courtroom legal escalation & real-estate negotiation (not epidemic dance outbreak & medical ban).
  2. **Opening**: Macro green beetle chewing grape leaf (not cobbled street shoe close-up).
  3. **Signature Shot**: Bug chewing a physical hole straight through the 3D court ledger's `"VERDICT:"` page (not crowd fainting on market stage).
  4. **Camera Path**: Macro leaf pull-back → gothic aisle crane into thimble-scale witness stand → desert track → overhead archive book punch-in.
  5. **Score Shape**: 150 BPM playful Renaissance lute & bassoon pizzicato ending on bright Picardy major gag sting (vs grim crowd pulse).
  6. **Ending**: Smug beetle burping confetti paper crumbs through chewed ledger (not lonely red shoe on church steps).
