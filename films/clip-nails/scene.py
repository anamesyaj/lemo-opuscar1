"""CLIP: How Humans Cut Their Nails. One continuous camera over one cork wall, left to right
through the eras: open (today) -> Stone Age -> First Cities -> Written Word -> Rome ->
Medieval -> Imperial China -> The Clipper -> Today. Every item lands on the voice:
doc.L(i) line start, doc.W(i, "word") the spoken word. Photos are archive (see credits.md);
PaperDocs are labelled recreations quoting only real words. World units are 4K px at zoom 1.
"""
from engine import HILITE, MUSTARD, RUST, BigText, Card, Counter, Film, PaperDoc, PenMark, Print, Stamp, StringLine

CREAM = (244, 240, 232)
GREY = (178, 172, 160)
DARK = (30, 26, 22)

# cluster centres, one per era
OPEN, STONE, CITIES, WRITTEN, ROME, MED, CHINA, CLIPPER, TODAY = 0, 7500, 15000, 22000, 29500, 36500, 43500, 51000, 58000


def era_title(film, text, x, t):
    film.add(BigText(text, x, -2350, 600, t, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, type_on=0.5))


def recreation_tag(film, x, y, t):
    film.add(BigText("RECREATION", x, y, 190, t, rgb=GREY))


def build_film(doc):
    L, E, W = doc.L, doc.E, doc.W
    res = doc.res()
    film = Film(doc.duration, fps=30, look="wall")

    # ============================================================ OPEN (1-3)
    film.add(Counter(0, 200, 950, 3, W(1, "Three") - 0.05, dur=0.7, suffix=" SECONDS", caption="TO CUT A NAIL"))
    film.add(Counter(0, 1750, 800, 3, W(2, "three") - 0.05, dur=0.9, suffix=" MM", caption="A MONTH, AND THEY NEVER STOP"))
    film.add(BigText("CLIP", OPEN, -2100, 1150, L(3) - 0.1, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, type_on=0.6))
    film.add(BigText("HOW HUMANS CUT THEIR NAILS", OPEN, -1250, 400, L(3) + 0.35, rgb=CREAM))

    film.shot(0.0, OPEN, 200, 0.95, rot=-0.5)
    film.shot(L(2) + 0.4, OPEN, 1000, 0.62, rot=0.3, radius=3600, strength=0.5)
    film.shot(L(2) + 1.6, OPEN, 1030, 0.61, rot=0.2, radius=3600, strength=0.5)
    film.shot(E(2) - 0.2, OPEN, 970, 0.63, rot=0.35, radius=3600, strength=0.5)
    film.shot(L(3) + 0.5, OPEN, -1500, 0.55, rot=0.0, radius=4200, strength=0.45)
    film.shot(E(3) - 0.2, OPEN + 400, -1400, 0.52, rot=0.2)

    # ============================================================ STONE AGE (4-7)
    film.add(StringLine((OPEN + 1900, -900), (STONE - 2100, -900), t_in=L(4) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "STONE AGE", STONE, L(4) - 0.05)
    film.add(Print("P01", STONE, 250, 3000, rot=-1.5, t_in=L(5) + 0.1, label="FLINT KNAPPING", label_t=W(5, "knapping")))
    film.add(Print("P02", STONE + 2900, 1550, 2050, rot=2.0, t_in=L(6) + 0.1, label="FLINT · MUSEO EGIZIO, TURIN", label_t=W(6, "stone")))
    film.add(Stamp("INFERRED", STONE - 300, 1100, size=300, rot=-8, t_in=W(7, "guess") - 0.15))

    film.shot(L(4) + 0.5, STONE, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(5) + 0.5, STONE, 250, 0.95, rot=-0.5, radius=2400, strength=0.55)
    film.shot(L(6) + 0.5, STONE + 2400, 1300, 0.85, rot=0.4, radius=2600, strength=0.5)
    film.shot(L(7) + 0.5, STONE - 500, 1500, 0.82, rot=-0.3, radius=2400, strength=0.55)
    film.shot(E(7) - 0.1, STONE - 500, 1500, 0.82, rot=-0.2, radius=2400, strength=0.55)

    # ============================================================ FIRST CITIES (8-10)
    film.add(StringLine((STONE + 2100, -900), (CITIES - 2100, -900), t_in=L(8) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "FIRST CITIES", CITIES, L(8) - 0.05)
    film.add(Print("P03", CITIES - 1250, 300, 2350, rot=-2.0, t_in=L(9) + 0.1, label="GOLDWORK · ROYAL TOMBS OF UR", label_t=W(9, "gold")))
    film.add(Print("P04", CITIES + 1750, 450, 2550, rot=1.5, t_in=L(10) + 0.1, label="COSMETIC TOOL · EGYPT, THE MET", label_t=W(10, "Egypt")))
    film.add(BigText("HENNA RED", CITIES + 1750, 2050, 430, W(10, "henna") - 0.1, rgb=RUST))

    film.shot(L(8) + 1.8, CITIES, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(9) + 0.5, CITIES - 1250, 300, 1.0, rot=-0.5, radius=2100, strength=0.55)
    film.shot(L(10) + 0.5, CITIES + 1750, 600, 0.95, rot=0.4, radius=2300, strength=0.55)

    # ============================================================ WRITTEN WORD (11-12)
    film.add(StringLine((CITIES + 2100, -900), (WRITTEN - 2100, -900), t_in=L(11) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "8TH CENTURY BC", WRITTEN, L(11) - 0.05)
    deut = film.add(PaperDoc(WRITTEN - 1450, 150, 2450, 3150, rot=-1.5, t_in=L(11) + 0.15, rows=16, sentence_row=6, sentence_size=100,
                             header=(("DEUTERONOMY", 150, "serif"), ("CHAPTER TWENTY-ONE", 80, "mono")),
                             sentence="she shall shave her head and trim her nails"))
    recreation_tag(film, WRITTEN - 1450, 2050, L(11) + 0.3)
    for (hx, hy), hw in deut.phrase_spans(res, "trim her nails"):
        film.add(PenMark("highlight", hx, hy - 26, hw + 55, 0, t_in=E(11) - 0.7, dur=0.4, width=110, rot=-1.5, seed=3))
    film.add(Print("P05", WRITTEN + 1750, 300, 2750, rot=2.0, t_in=L(12) + 0.1, label="RAZOR + NAIL CUTTER · HALLSTATT GRAVE", label_t=W(12, "knife")))

    film.shot(L(11) + 0.5, WRITTEN, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(11) + 1.2, WRITTEN - 1450, 150, 0.95, rot=-0.4, radius=2000, strength=0.55)
    film.shot(L(12) + 0.5, WRITTEN + 1750, 300, 0.95, rot=0.5, radius=2300, strength=0.55)

    # ============================================================ ROME (13-15)
    film.add(StringLine((WRITTEN + 2100, -900), (ROME - 2100, -900), t_in=L(13) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "ROME", ROME, L(13) - 0.05)
    hor = film.add(PaperDoc(ROME - 1800, 150, 2450, 3150, rot=1.5, t_in=L(13) + 0.15, rows=16, sentence_row=6, sentence_size=92,
                            header=(("HORACE · EPISTLES", 140, "serif"), ("ABOUT 20 BC", 80, "mono")),
                            sentence="A close-shaven man, it is said, in an empty barber's booth, penknife in hand, quietly cleaning his nails."))
    recreation_tag(film, ROME - 1800, 2050, L(13) + 0.3)
    for (hx, hy), hw in hor.phrase_spans(res, "penknife in hand"):
        film.add(PenMark("highlight", hx, hy - 24, hw + 50, 0, t_in=W(13, "penknife") - 0.35, dur=0.4, width=100, rot=1.5, seed=5))
    for (hx, hy), hw in hor.phrase_spans(res, "cleaning his nails"):
        film.add(PenMark("highlight", hx, hy - 24, hw + 50, 0, t_in=W(13, "cleaning") - 0.35, dur=0.4, width=100, rot=1.5, seed=7))
    film.add(Print("P06", ROME + 1100, 200, 2500, rot=-2.0, t_in=L(14) + 0.1, label="TOILET SET HANGER · ROMAN BRITAIN", label_t=W(14, "rings")))
    film.add(Print("P07", ROME + 3400, 1500, 1950, rot=3.0, t_in=L(15) + 0.1, label="NAIL CLEANER", label_t=W(15, "V-shaped")))

    film.shot(L(13) + 0.5, ROME, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(W(13, "penknife") + 0.3, ROME - 1800, 150, 1.0, rot=0.4, radius=1900, strength=0.58)
    film.shot(L(14) + 0.5, ROME + 1100, 200, 0.95, rot=-0.4, radius=2200, strength=0.55)
    film.shot(L(15) + 0.5, ROME + 3200, 1550, 0.9, rot=0.3, radius=2100, strength=0.55)

    # ============================================================ MEDIEVAL (16-17)
    film.add(StringLine((ROME + 3600, -900), (MED - 2100, -900), t_in=L(16) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "MEDIEVAL", MED, L(16) - 0.05)
    film.add(Print("P08", MED - 1100, 250, 2750, rot=-1.5, t_in=L(17) + 0.1, label="PUMICE", label_t=W(17, "pumice")))
    film.add(Card(MED + 2450, 350, 3000, 1500, L(17) + 0.15, title="THE TOOLKIT", lines=["Small shears", "A small knife", "Pumice to smooth"], accent=RUST, title_size=290, body_size=185))

    film.shot(L(16) + 0.5, MED, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(17) + 0.5, MED - 1100, 250, 0.95, rot=-0.4, radius=2300, strength=0.55)
    film.shot(L(17) + 2.2, MED + 2150, 350, 0.78, rot=0.3, radius=2600, strength=0.5)
    film.shot(E(17) - 0.15, MED + 2150, 350, 0.78, rot=0.25, radius=2600, strength=0.5)

    # ============================================================ IMPERIAL CHINA (18-20)
    film.add(StringLine((MED + 2100, -900), (CHINA - 2100, -900), t_in=L(18) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "IMPERIAL CHINA", CHINA, L(18) - 0.05)
    film.add(Print("P09", CHINA - 1550, 250, 1950, rot=-2.0, t_in=L(18) + 0.2, label="EMPRESS DOWAGER CIXI · ABOUT 1890", label_t=W(18, "China")))
    film.add(BigText("GROWN, NOT TRIMMED", CHINA + 300, 2250, 470, W(19, "grown") - 0.1, rgb=MUSTARD))
    film.add(Print("P10", CHINA + 1900, 250, 1650, rot=2.0, t_in=L(20) + 0.1, label="NAIL GUARDS · QING DYNASTY", label_t=W(20, "Guards")))

    film.shot(L(18) + 1.0, CHINA, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(19) + 0.5, CHINA - 1200, 400, 0.8, rot=-0.3, radius=2800, strength=0.5)
    film.shot(L(20) + 0.5, CHINA + 1900, 250, 0.95, rot=0.4, radius=2000, strength=0.55)

    # ============================================================ THE CLIPPER (21-22)
    film.add(StringLine((CHINA + 2100, -900), (CLIPPER - 2100, -900), t_in=L(21) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "THE CLIPPER", CLIPPER, L(21) - 0.05)
    fog = film.add(PaperDoc(CLIPPER - 1450, 150, 2400, 3100, rot=-1.5, t_in=L(21) + 0.15, rows=16, sentence_row=6, sentence_size=100,
                            header=(("UNITED STATES PATENT OFFICE", 118, "serif"), ("VALENTINE FOGERTY · 1875", 82, "mono")),
                            sentence="Improvement in finger-nail trimmers."))
    recreation_tag(film, CLIPPER - 1450, 2020, L(21) + 0.3)
    for (hx, hy), hw in fog.phrase_spans(res, "finger-nail trimmers"):
        film.add(PenMark("highlight", hx, hy - 26, hw + 55, 0, t_in=W(21, "patent") - 0.4, dur=0.4, width=110, rot=-1.5, seed=9))
    hm = film.add(PaperDoc(CLIPPER + 1550, 150, 2400, 3100, rot=1.5, t_in=L(22) + 0.15, rows=16, sentence_row=6, sentence_size=100,
                           header=(("UNITED STATES PATENT OFFICE", 118, "serif"), ("HEIM AND MATZ · 1881", 82, "mono")),
                           sentence="Finger-nail trimmer."))
    recreation_tag(film, CLIPPER + 1550, 2020, L(22) + 0.3)
    for (hx, hy), hw in hm.phrase_spans(res, "Finger-nail trimmer"):
        film.add(PenMark("highlight", hx, hy - 26, hw + 55, 0, t_in=W(22, "clamp") - 0.4, dur=0.4, width=110, rot=1.5, seed=11))

    film.shot(L(21) + 0.5, CLIPPER, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(21) + 1.2, CLIPPER - 1450, 150, 0.95, rot=-0.4, radius=2000, strength=0.55)
    film.shot(L(22) + 0.5, CLIPPER + 1550, 150, 0.95, rot=0.4, radius=2000, strength=0.55)

    # ============================================================ TODAY + PULL-BACK (23-24)
    film.add(StringLine((CLIPPER + 2100, -900), (TODAY - 2100, -900), t_in=L(23) + 0.1, dur=1.0, sag=0.04, width=18))
    era_title(film, "TODAY", TODAY, L(23) - 0.05)
    film.add(Print("P11", TODAY, 300, 3350, rot=-1.0, t_in=L(23) + 0.1, label="THE MODERN CLIPPER", label_t=W(23, "steel")))
    film.add(BigText("STONE · TEETH · GOLD · STEEL", 29000, -3550, 640, L(24) + 0.3, rgb=CREAM))

    film.shot(L(23) + 0.5, TODAY, -900, 0.5, rot=0.0, radius=5200, strength=0.35)
    film.shot(L(23) + 1.4, TODAY, 300, 0.95, rot=-0.3, radius=2500, strength=0.55)
    film.shot(L(24) + 0.7, 29000, -600, 0.10, rot=0.0, radius=16000, strength=0.2)
    film.shot(film.duration, 29000, -400, 0.058, rot=0.0, radius=30000, strength=0.08)

    film.fade_in, film.fade_out = 0.9, 2.2
    return film
