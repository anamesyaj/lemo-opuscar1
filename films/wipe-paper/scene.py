"""WIPE: How Humans Wiped Before Toilet Paper. One continuous camera over one cork wall,
left to right: open (today) -> Stone Age -> Greece -> Rome -> China -> Medieval -> America ->
The Invention -> Today. Same board language as CLIP, but the motion plays comedy: punch-ins
on joke words, item hops, stamp slams, and deadpan camera freezes on the one-word punchlines.
Every item lands on the voice: doc.L(i) line start, doc.W(i, "word") the spoken word.
Photos are archive (see credits.md); the one drawn item is the plain-brown parcel card.
World units are 4K px at zoom 1.
"""
import math

import skia
from engine import HILITE, MUSTARD, RUST, BigText, Card, Counter, Film, Item, Print, Stamp, StringLine, clamp, paint, ramp

CREAM = (244, 240, 232)
GREY = (178, 172, 160)
DARK = (30, 26, 22)
BROWN = (154, 118, 80)

# cluster centres, one per section (same spacing as CLIP)
OPEN, STONE, GREECE, ROME, CHINA, MED, AMERICA, INVENT, TODAY = 0, 7500, 15000, 22000, 29500, 36500, 43500, 51000, 58000


def era_title(film, text, x, t):
    film.add(BigText(text, x, -2350, 600, t, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, type_on=0.5, sfx=False))


class AnimatedRoll(Item):
    """The other mascot: an animated toilet roll. Drops in with a squash, then idles —
    a loose sheet hangs off the front and flutters gently the whole time it is on screen.
    shiver_t makes it tremble for half a second (the splinters moment). (x, y) = top centre."""

    z = 15

    def __init__(self, x, y, r=620, t_in=0.0, shiver_t=None):
        super().__init__(t_in=t_in)
        self.x, self.y, self.r, self.shiver_t = x, y, r, shiver_t

    def bounds(self, res):
        return skia.Rect.MakeLTRB(self.x - 1.7 * self.r, self.y - 1.1 * self.r,
                                  self.x + 1.7 * self.r, self.y + 2.7 * self.r)

    def cues(self):
        return [("pop", self.t_in + 0.32, 0.65, {})]

    def shakes(self):
        return [(self.t_in + 0.32, 5, 0.22)]

    def draw(self, c, res, t):
        if t < self.t_in:
            return
        r = self.r
        dt = t - self.t_in
        # landing: fall a short way, squash, settle
        u = ramp(t, self.t_in, 0.34)
        y_off = -650 * (1 - u * u)
        osc = math.exp(-max(0.0, dt - 0.34) * 5.5) * math.cos(max(0.0, dt - 0.34) * 13.0) if dt > 0.34 else 0.0
        sy = (1 - 0.26 * osc) if dt > 0.34 else 1 + 0.18 * u
        sx = (1 + 0.16 * osc) if dt > 0.34 else 1 - 0.08 * u
        rot = 1.1 * math.sin(t * 0.9) * min(1.0, dt)
        if self.shiver_t is not None and 0 <= t - self.shiver_t <= 0.5:
            d = t - self.shiver_t
            rot += 2.6 * math.sin(d * 55) * math.exp(-d * 6)
        c.save()
        c.translate(self.x, self.y + y_off)
        c.rotate(rot)
        c.scale(sx, sy)
        # shadow
        c.drawOval(skia.Rect.MakeXYWH(-0.95 * r, 1.98 * r, 1.9 * r, 0.30 * r), paint((0, 0, 0), 0.32, blur=26))
        # body: cylinder
        body_grad = skia.GradientShader.MakeLinear(
            [skia.Point(-0.86 * r, 0), skia.Point(0.86 * r, 0)],
            [skia.Color(252, 250, 246, 255), skia.Color(228, 224, 216, 255), skia.Color(199, 193, 184, 255)],
            [0.0, 0.45, 1.0], skia.TileMode.kClamp)
        bp = skia.Paint(AntiAlias=True)
        bp.setShader(body_grad)
        c.drawRect(skia.Rect.MakeXYWH(-0.86 * r, 0, 1.72 * r, 1.42 * r), bp)
        c.drawOval(skia.Rect.MakeXYWH(-0.86 * r, 1.12 * r, 1.72 * r, 0.60 * r), paint((206, 200, 192), 1.0))
        c.drawRect(skia.Rect.MakeXYWH(-0.86 * r, 0, 1.72 * r, 1.42 * r), bp)
        # hanging sheet, draped OVER the front of the body, fluttering at the hem
        fl = math.sin(t * 2.3) * 0.045 * r
        fl2 = math.sin(t * 2.3 + 1.4) * 0.06 * r
        sheet = skia.Path()
        sheet.moveTo(-0.64 * r, 0.78 * r)
        sheet.lineTo(-0.64 * r, 2.02 * r + fl)
        sheet.cubicTo(-0.32 * r, 2.14 * r + fl2, 0.0, 1.98 * r + fl, 0.32 * r, 2.12 * r + fl2)
        sheet.cubicTo(0.48 * r, 2.18 * r + fl, 0.64 * r, 2.06 * r + fl2, 0.64 * r, 1.94 * r)
        sheet.lineTo(0.64 * r, 0.78 * r)
        sheet.close()
        c.drawPath(sheet, paint((250, 248, 242), 1.0))
        c.drawPath(sheet, paint((196, 190, 180), 0.8, stroke=5))
        for i in range(9):  # perforation dashes
            dx = -0.56 * r + i * 0.14 * r
            c.drawRect(skia.Rect.MakeXYWH(dx, 0.90 * r, 0.07 * r, 0.035 * r), paint((203, 197, 188), 1.0))
        # top face + cardboard tube
        c.drawOval(skia.Rect.MakeXYWH(-0.86 * r, -0.30 * r, 1.72 * r, 0.60 * r), paint((253, 251, 247), 1.0))
        c.drawOval(skia.Rect.MakeXYWH(-0.36 * r, -0.145 * r, 0.72 * r, 0.29 * r), paint((172, 138, 98), 1.0))
        c.drawOval(skia.Rect.MakeXYWH(-0.235 * r, -0.095 * r, 0.47 * r, 0.19 * r), paint((74, 60, 46), 1.0))
        # soft sheen down the left side
        c.drawRect(skia.Rect.MakeXYWH(-0.58 * r, 0.06 * r, 0.30 * r, 1.30 * r), paint((255, 255, 255), 0.28, blur=18))
        c.restore()


class WaterDrop(Item):
    """The cold-open hero: an animated water drop. Falls from above the board, PLOPs on the
    first word, ripples, throws a little crown splash, then rests pinned by nothing but
    surface tension, wobbling gently for the rest of the open. The board's one colour accent."""

    z = 15

    def __init__(self, x, y, r=880, t_fall=0.48):
        super().__init__(t_in=t_fall)
        self.x, self.y, self.r, self.t_fall = x, y, r, t_fall
        self.t_hit = t_fall + 0.44

    def bounds(self, res):
        R = self.r * 2.8
        return skia.Rect.MakeLTRB(self.x - R, self.y - R * 1.7, self.x + R, self.y + R)

    def cues(self):
        return [("drop", self.t_fall, 0.7, {}), ("pop", self.t_hit, 0.9, {})]

    def shakes(self):
        return [(self.t_hit, 6, 0.25)]

    def _path(self, r):
        p = skia.Path()
        p.moveTo(0, -1.30 * r)
        p.cubicTo(0.45 * r, -0.75 * r, 0.92 * r, -0.30 * r, 0.95 * r, 0.28 * r)
        p.cubicTo(0.97 * r, 0.80 * r, 0.55 * r, 1.02 * r, 0, 1.02 * r)
        p.cubicTo(-0.55 * r, 1.02 * r, -0.97 * r, 0.80 * r, -0.95 * r, 0.28 * r)
        p.cubicTo(-0.92 * r, -0.30 * r, -0.45 * r, -0.75 * r, 0, -1.30 * r)
        p.close()
        return p

    def draw(self, c, res, t):
        r, th = self.r, self.t_hit
        if t < self.t_fall:
            return
        # fall: accelerate down, stretching as it goes
        u = ramp(t, self.t_fall, 0.44)
        fall = u * u
        cy = self.y - 2500 * (1 - fall)
        sx, sy = 1 - 0.13 * u, 1 + 0.28 * u
        dt = t - th
        if dt >= 0:
            # impact squash with a decaying wobble, then a gentle idle sway
            osc = math.exp(-dt * 5.5) * math.cos(dt * 13.0)
            sy = 1 - 0.34 * osc
            sx = 1 + 0.20 * osc
            sway = max(0.0, 1 - dt * 0.25)
            sx += 0.016 * math.sin(dt * 2.4) * (1 - sway * 0.4)
            cy = self.y
        # shadow on the board
        c.drawOval(skia.Rect.MakeXYWH(self.x - r * 0.85, self.y + r * 0.98, r * 1.7, r * 0.34),
                   paint((0, 0, 0), 0.35, blur=30))
        # ripple rings on the "surface" at the drop's base
        if dt >= 0:
            for k in range(2):
                ru = ramp(t, th + k * 0.22, 0.95)
                if 0 < ru < 1:
                    rx = r * (0.35 + 1.6 * ru)
                    c.drawOval(skia.Rect.MakeXYWH(self.x - rx, self.y + r * 1.02 - rx * 0.15, 2 * rx, rx * 0.30),
                               paint((150, 200, 240), 0.5 * (1 - ru), stroke=10 * (1 - ru) + 3))
        # crown splash droplets
        if 0 <= dt <= 0.6:
            for i, ang in enumerate((-1.25, -0.95, -0.65, -0.35, -0.05)):
                vx = math.sin(ang) * r * 1.5
                vy = -math.cos(ang) * r * 2.6 - r * 0.8
                dx, dy = vx * dt, vy * dt + 3400 * dt * dt
                a = 0.85 * (1 - dt / 0.6)
                c.drawCircle(self.x + dx, self.y + r * 0.9 + dy, r * (0.055 + 0.02 * (i % 2)), paint((165, 212, 245), a))
        # the drop itself: blue gradient body, glossy highlight
        c.save()
        c.translate(self.x, cy)
        c.scale(sx, sy)
        grad = skia.GradientShader.MakeLinear(
            [skia.Point(0, -1.3 * r), skia.Point(0, 1.02 * r)],
            [skia.Color(178, 220, 248, 255), skia.Color(74, 144, 208, 255), skia.Color(32, 92, 168, 255)],
            [0.0, 0.55, 1.0], skia.TileMode.kClamp)
        body = skia.Paint(AntiAlias=True)
        body.setShader(grad)
        c.drawPath(self._path(r), body)
        c.drawPath(self._path(r), paint((225, 242, 255), 0.5, stroke=7))
        hl = skia.Paint(AntiAlias=True)
        hl.setColor(skia.Color(255, 255, 255, 190))
        c.save()
        c.translate(-0.34 * r, -0.18 * r)
        c.rotate(-22)
        c.drawOval(skia.Rect.MakeXYWH(-0.10 * r, -0.34 * r, 0.20 * r, 0.68 * r), hl)
        c.restore()
        c.drawCircle(0.30 * r, 0.42 * r, 0.075 * r, paint((255, 255, 255), 0.55))
        c.restore()


def build_film(doc):
    L, E, W = doc.L, doc.E, doc.W
    film = Film(doc.duration, fps=30, look="wall")

    # ============================================================ OPEN (1-4)
    film.add(WaterDrop(OPEN + 1650, 420, r=880))
    film.add(AnimatedRoll(OPEN + 150, 1050, r=600, t_in=L(2) - 0.3))
    film.add(Counter(OPEN - 1500, 300, 850, 170, 0.0, dur=1.1, suffix=" YEARS", caption="OLD. THAT'S ALL.", sfx=False))
    film.add(BigText("WIPE", OPEN - 300, -2100, 1150, 0.0, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, type_on=0.6, sfx=False))
    film.add(BigText("HOW HUMANS WIPED BEFORE TOILET PAPER", OPEN - 300, -1250, 400, 0.0, rgb=CREAM, sfx=False))

    film.shot(0.0, OPEN + 200, 200, 0.95, rot=-0.5)
    film.shot(W(1, "poo") - 0.02, OPEN + 1650, 420, 1.04, rot=-0.4, radius=2400, strength=0.55)   # punch on the first joke
    film.shot(W(1, "poo") + 0.5, OPEN + 1650, 420, 0.96, rot=-0.5, radius=2400, strength=0.55)    # settle
    film.shot(L(2) + 0.4, OPEN - 600, 600, 0.62, rot=0.3, radius=3600, strength=0.5)
    film.shot(L(3) + 0.3, OPEN - 900, 700, 0.62, rot=0.3, radius=3600, strength=0.5)
    film.shot(L(4) + 0.15, OPEN - 200, -1500, 0.55, rot=0.0, radius=4200, strength=0.45)
    film.shot(E(4) - 0.2, OPEN + 100, -1400, 0.52, rot=0.2)

    # ============================================================ STONE AGE (5-7)
    film.add(StringLine((OPEN + 1900, -900), (STONE - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "STONE AGE", STONE, 0.0)
    film.add(Print("P02", STONE - 1400, 200, 2300, rot=-2.0, t_in=0.0, label="SMOOTH STONES", sfx=False))
    film.add(Print("P05", STONE + 1600, 50, 2000, rot=2.0, t_in=0.0, label="LEAVES", sfx=False))
    film.add(Print("P03", STONE + 1600, 1700, 1850, rot=-1.5, t_in=0.0, label="MOSS", sfx=False))
    film.add(Print("P04", STONE - 1600, 1750, 1950, rot=1.5, t_in=0.0, label="SNOW · GOOD LUCK", sfx=False))
    film.add(Stamp("INFERRED", STONE - 300, 1100, size=300, rot=-8, t_in=0.0, sfx=False))

    film.shot(L(5) + 0.15, STONE, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(W(6, "Leaves") - 0.08, STONE + 1400, 200, 0.9, rot=0.3, radius=2400, strength=0.55)   # item hops:
    film.shot(W(6, "Moss") - 0.08, STONE + 1400, 1500, 0.9, rot=-0.3, radius=2400, strength=0.55)   # one quick hop
    film.shot(W(6, "Snow") - 0.05, STONE - 1400, 1550, 0.9, rot=0.3, radius=2400, strength=0.55)    # per item word
    film.shot(L(7) + 0.4, STONE - 400, 1200, 0.8, rot=-0.3, radius=2400, strength=0.55)
    film.shot(E(7) - 0.1, STONE - 400, 1200, 0.8, rot=-0.2, radius=2400, strength=0.55)

    # ============================================================ GREECE (8-10)
    film.add(StringLine((STONE + 2100, -900), (GREECE - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "ANCIENT GREECE", GREECE, 0.0)
    film.add(BigText("PESSOI", GREECE - 1500, 400, 700, 0.0, rgb=MUSTARD, sfx=False))
    film.add(Counter(GREECE - 1500, 1500, 850, 3, 0.0, dur=0.5, suffix=" STONES", caption="THE POLITE MINIMUM", sfx=False))
    film.add(Print("P06", GREECE + 1300, 300, 2600, rot=2.0, t_in=0.0, label="OSTRAKON · A NAME, SCRATCHED", sfx=False))

    film.shot(L(8) + 0.15, GREECE, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(9) + 0.3, GREECE - 1300, 900, 0.7, rot=0.2, radius=3000, strength=0.5)
    film.shot(L(10) + 0.15, GREECE + 1300, 300, 0.95, rot=0.4, radius=2200, strength=0.55)
    film.shot(W(10, "grudge") - 0.02, GREECE + 1300, 300, 1.03, rot=0.4, radius=2200, strength=0.55)  # punch on 'grudge'
    film.shot(W(10, "grudge") + 0.5, GREECE + 1300, 300, 0.96, rot=0.4, radius=2200, strength=0.55)

    # ============================================================ ROME (11-13)
    film.add(StringLine((GREECE + 2100, -900), (ROME - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "ROME", ROME, 0.0)
    film.add(Print("P07", ROME - 1300, 250, 2700, rot=-2.0, t_in=0.0, label="LATRINES · HOUSTEADS", sfx=False))
    film.add(Print("P08", ROME + 1700, 300, 2400, rot=2.0, t_in=0.0, label="TERSORIUM · REPLICA", sfx=False))
    film.add(Stamp("SHARED!", ROME + 1500, 1550, size=320, rot=6, t_in=0.0, sfx=False))

    film.shot(L(11) + 0.15, ROME, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(12) + 0.15, ROME + 1700, 300, 0.95, rot=0.4, radius=2200, strength=0.55)
    film.shot(W(12, "shared") - 0.02, ROME + 1700, 300, 1.04, rot=0.4, radius=2200, strength=0.55)  # punch on 'shared'
    film.shot(W(12, "shared") + 0.55, ROME + 1700, 300, 0.96, rot=0.4, radius=2200, strength=0.55)
    film.shot(L(13) + 0.4, ROME - 900, 600, 0.88, rot=-0.3, radius=2400, strength=0.55)
    film.shot(W(13, "Friendship") - 0.15, ROME - 200, 800, 0.78, rot=0.0, radius=2400, strength=0.5)
    film.shot(E(13) - 0.05, ROME - 195, 800, 0.782, rot=0.0, radius=2400, strength=0.5)              # DEADPAN FREEZE

    # ============================================================ CHINA (14-16)
    film.add(StringLine((ROME + 2100, -900), (CHINA - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "CHINA", CHINA, 0.0)
    film.add(Print("P10", CHINA - 1400, 250, 2300, rot=-2.0, aspect=1.0, t_in=0.0, label="MAKING PAPER", sfx=False))
    film.add(Print("P11", CHINA + 1600, 200, 2400, rot=2.0, aspect=1.15, t_in=0.0, label="DUNHUANG MANUSCRIPT", sfx=False))
    film.add(Counter(CHINA + 2750, 2100, 580, 589, 0.0, dur=0.8, suffix=" AD", caption="ALREADY WIPING WITH PAPER", sfx=False))
    film.add(Print("P12", CHINA - 2700, 1350, 2000, rot=-2.5, t_in=0.0, label="THE PALACE", sfx=False))
    film.add(Print("P09", CHINA + 2900, 1000, 1850, rot=3.0, aspect=1.0, t_in=0.0, label="SHEETS, DRYING", sfx=False))
    film.add(Counter(CHINA - 1400, 1850, 700, 720000, 0.0, dur=1.8, suffix=" SHEETS", caption="A YEAR · FOR THE PALACE", sfx=False))

    film.shot(L(14) + 0.15, CHINA, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(15) + 0.15, CHINA + 1900, 600, 0.8, rot=0.3, radius=2600, strength=0.55)
    film.shot(L(16) + 0.4, CHINA - 100, 900, 0.55, rot=0.0, radius=4200, strength=0.45)
    film.shot(W(16, "Royal") - 0.02, CHINA - 100, 900, 0.60, rot=0.0, radius=4200, strength=0.45)   # little lift on 'Royal'
    film.shot(W(16, "Royal") + 0.6, CHINA - 100, 900, 0.56, rot=0.0, radius=4200, strength=0.45)

    # ============================================================ MEDIEVAL (17-18)
    film.add(StringLine((CHINA + 2100, -900), (MED - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "MEDIEVAL", MED, 0.0)
    film.add(Print("P13", MED - 1300, 250, 2600, rot=-2.0, t_in=0.0, label="HAY", sfx=False))
    film.add(Print("P03", MED + 300, 1700, 1500, rot=2.0, t_in=0.0, label="MOSS, AGAIN", sfx=False))
    film.add(Print("P14", MED + 1900, 250, 2400, rot=1.5, t_in=0.0, label="WOOL · FOR RICH BUM BUMS", sfx=False))

    film.shot(L(17) + 0.15, MED, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(17) + 0.8, MED - 1300, 250, 0.95, rot=-0.4, radius=2300, strength=0.55)
    film.shot(L(18) + 0.15, MED + 1900, 250, 0.95, rot=0.4, radius=2300, strength=0.55)

    # ============================================================ AMERICA (19-21)
    film.add(StringLine((MED + 2100, -900), (AMERICA - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "AMERICA", AMERICA, 0.0)
    film.add(Print("P15", AMERICA - 1500, 250, 2500, rot=-2.0, t_in=0.0, label="DRIED CORNCOBS", sfx=False))
    film.add(Print("P16", AMERICA + 1600, 200, 2200, rot=2.0, aspect=1.1, t_in=0.0, label="THE OUTHOUSE", sfx=False))
    film.add(Print("P17", AMERICA + 200, 300, 2600, rot=-1.5, aspect=1.15, t_in=0.0, label="THE CATALOGUE", sfx=False))

    film.shot(L(19) + 0.15, AMERICA, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(19) + 0.8, AMERICA - 1200, 300, 0.9, rot=-0.3, radius=2500, strength=0.55)
    film.shot(L(20) + 0.15, AMERICA + 200, 300, 0.95, rot=-0.3, radius=2300, strength=0.55)
    film.shot(L(21) + 0.3, AMERICA + 200, 300, 0.97, rot=-0.3, radius=2300, strength=0.55)
    film.shot(E(21) - 0.05, AMERICA + 205, 300, 0.972, rot=-0.3, radius=2300, strength=0.55)         # DEADPAN FREEZE

    # ============================================================ THE INVENTION (22-25)
    film.add(StringLine((AMERICA + 2100, -900), (INVENT - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "THE INVENTION", INVENT, 0.0)
    film.add(Print("P18", INVENT - 1500, 250, 2300, rot=-2.0, aspect=1.2, t_in=0.0, label="GAYETTY'S MEDICATED PAPER", sfx=False))
    film.add(BigText("1857", INVENT - 1500, 1950, 520, 0.0, rgb=MUSTARD, sfx=False))
    film.add(Card(INVENT + 1800, 150, 2600, 1400, 0.0, title="PLAIN BROWN WRAPPING", lines=["NOTHING TO SEE HERE"], rgb=BROWN, text_rgb=CREAM, title_size=200, body_size=150, sfx=False))
    film.add(AnimatedRoll(INVENT + 1800, 1150, r=680, t_in=L(24) - 0.55, shiver_t=W(24, "splinters")))
    film.add(BigText("ON A ROLL · 1890", INVENT + 1800, 2720, 300, 0.0, rgb=RUST, sfx=False))
    film.add(BigText("SPLINTERS?!", INVENT - 1500, 2800, 460, 0.0, rgb=RUST, sfx=False))
    film.add(BigText("SPLINTER-FREE", INVENT - 300, -1500, 800, 0.0, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, sfx=False))

    film.shot(L(22) + 0.15, INVENT, -1200, 0.42, rot=0.0, radius=6000, strength=0.3)
    film.shot(L(22) + 0.8, INVENT - 1500, 250, 0.95, rot=-0.4, radius=2100, strength=0.55)
    film.shot(L(23) + 0.15, INVENT + 1800, 150, 0.85, rot=0.3, radius=2500, strength=0.55)
    film.shot(L(24) + 0.15, INVENT + 1800, 1800, 0.9, rot=0.4, radius=2400, strength=0.55)
    film.shot(W(24, "splinters") - 0.02, INVENT + 1800, 1800, 0.99, rot=0.4, radius=2400, strength=0.55)  # wince punch
    film.shot(W(24, "splinters") + 0.5, INVENT + 1800, 1800, 0.91, rot=0.4, radius=2400, strength=0.55)
    film.shot(W(25, "magic") - 0.1, INVENT - 300, -600, 0.55, rot=0.0, radius=4200, strength=0.45)
    film.shot(W(25, "Splinter") - 0.12, INVENT - 298, -600, 0.552, rot=0.0, radius=4200, strength=0.45)  # DEADPAN FREEZE across the pause
    film.shot(E(25) - 0.1, INVENT - 300, -700, 0.58, rot=0.0, radius=4200, strength=0.45)

    # ============================================================ TODAY + PULL-BACK (26-27)
    film.add(StringLine((INVENT + 2100, -900), (TODAY - 2100, -900), t_in=0.0, dur=1.0, sag=0.04, width=18, persist=True, sfx=False))
    era_title(film, "TODAY", TODAY, 0.0)
    film.add(Print("P20", TODAY - 400, 300, 2900, rot=-1.5, t_in=0.0, label="TEAM WATER", sfx=False))
    film.add(BigText("STONES · SPONGES · CORNCOBS · CATALOGUES", 29000, -3550, 640, 0.0, rgb=CREAM, sfx=False))

    film.shot(L(26) + 0.15, TODAY, -900, 0.5, rot=0.0, radius=5200, strength=0.35)
    film.shot(L(26) + 0.9, TODAY - 400, 300, 0.95, rot=-0.3, radius=2500, strength=0.55)
    film.shot(L(27) + 0.7, 29000, -600, 0.10, rot=0.0, radius=16000, strength=0.2)
    film.shot(film.duration, 29000, -400, 0.058, rot=0.0, radius=30000, strength=0.08)

    film.fade_in, film.fade_out = 0.9, 2.2
    return film
