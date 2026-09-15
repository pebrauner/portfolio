"""
GIARDINO prep. Crops and warms the paintings + portrait for lab/giardino.html.
Paintings: Paul Cezanne (The Met, open access, public domain).
Run from repo root: python lab/giardino-assets/prep.py
Source paintings live in the session scratchpad; the outputs are what the page uses.
"""
import os, sys
from PIL import Image, ImageOps, ImageEnhance
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = "lab/giardino-assets"

def warm(im, amt=1.0, contrast=1.06, sat=1.04, gamma=0.96):
    a = np.asarray(im, dtype=np.float32) / 255.0
    # a gentle warm cast: lift red, trim blue in the mids
    a[..., 0] = np.clip(a[..., 0] * (1 + 0.035 * amt) + 0.008 * amt, 0, 1)
    a[..., 2] = np.clip(a[..., 2] * (1 - 0.03 * amt), 0, 1)
    a = np.clip(a, 0, 1) ** gamma
    im = Image.fromarray((a * 255).astype(np.uint8), "RGB")
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(sat)
    return im

def save(im, name, q=84):
    p = os.path.join(OUT, name)
    im.save(p, "JPEG", quality=q, optimize=True, progressive=True)
    print(f"{name:20s} {im.size[0]}x{im.size[1]}  {os.path.getsize(p)//1024} KB")

def fit_w(im, w):
    if im.size[0] > w:
        im = im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)
    return im

# ---- hero: Mont Sainte-Victoire and the Viaduct (4000x3225) ----
v = Image.open(os.path.join(SRC, "cezanne_viaduct.jpg")).convert("RGB")
W, H = v.size
hero = v.crop((int(W*0.028), int(H*0.035), int(W*0.985), int(H*0.62)))   # wide band, keeps the pine crown
save(warm(fit_w(hero, 2400)), "hero.jpg", 82)
save(warm(fit_w(hero, 1100)), "hero-m.jpg", 80)
# a taller crop for phones
hero_t = v.crop((int(W*0.028), int(H*0.035), int(W*0.985), int(H*0.86)))
save(warm(fit_w(hero_t, 1000)), "hero-tall.jpg", 80)

# ---- bay: The Gulf of Marseille seen from L'Estaque (1905x1392) ----
m = Image.open(os.path.join(SRC, "cezanne_marseille.jpg")).convert("RGB")
W, H = m.size
bay = m.crop((int(W*0.01), int(H*0.02), int(W*0.99), int(H*0.98)))
save(warm(fit_w(bay, 1900), amt=1.2), "bay.jpg", 82)
bay_band = m.crop((int(W*0.01), int(H*0.16), int(W*0.99), int(H*0.72)))
save(warm(fit_w(bay_band, 1900), amt=1.2), "bay-band.jpg", 82)

# ---- domaine: View of the Domaine Saint-Joseph (3811x3049) ----
d = Image.open(os.path.join(SRC, "cezanne_stjoseph.jpg")).convert("RGB")
W, H = d.size
dom = d.crop((int(W*0.02), int(H*0.02), int(W*0.98), int(H*0.98)))
save(warm(fit_w(dom, 1200)), "domaine.jpg", 82)

# ---- card thumbs (3:2 crops) ----
def thumb(im, box, w=900):
    W, H = im.size
    c = im.crop((int(W*box[0]), int(H*box[1]), int(W*box[2]), int(H*box[3])))
    return fit_w(c, w)
save(warm(thumb(v, (0.30, 0.42, 0.98, 0.87))), "thumb-valley.jpg")      # viaduct + fields
save(warm(thumb(m, (0.02, 0.44, 0.70, 0.90), 900), amt=1.2), "thumb-roofs.jpg")  # L'Estaque roofs
save(warm(thumb(d, (0.30, 0.30, 0.95, 0.74))), "thumb-house.jpg")       # the yellow house

# ---- portrait (his own photo), warmed to sit on cream ----
p = ImageOps.exif_transpose(Image.open("assets/img/portrait.jpg")).convert("RGB")
save(warm(fit_w(p, 1300), amt=0.6, contrast=1.02, sat=0.96, gamma=1.0), "portrait.jpg", 84)

# ---- avatars: small square crops from event photos ----
av = [
    ("assets/img/photography/events/Riyadh-36.jpg", (0.35, 0.05, 0.75, 0.65)),
    ("assets/img/photography/events/Berlin site-13.jpg", (0.25, 0.10, 0.70, 0.78)),
    ("assets/img/photography/events/Riyadh-54.jpg", (0.30, 0.10, 0.70, 0.70)),
    ("assets/img/photography/events/Berlin site-44.jpg", (0.30, 0.10, 0.70, 0.70)),
]
for i, (path, box) in enumerate(av, 1):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    W, H = im.size
    c = im.crop((int(W*box[0]), int(H*box[1]), int(W*box[2]), int(H*box[3])))
    c = ImageOps.fit(c, (160, 160), Image.LANCZOS)
    save(warm(c, amt=0.5, contrast=1.0, sat=0.9, gamma=1.0), f"av-{i}.jpg", 82)
