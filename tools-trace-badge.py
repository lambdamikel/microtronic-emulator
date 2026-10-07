"""Trace the lettering of the console badge from a photo (pics/badge.jpg) into the SVG used in index.html.
Needs: pip install potracer pillow numpy. Writes badge.svg."""
import potrace, numpy as np
from PIL import Image, ImageFilter
im = Image.open('/home/mike/claude/microtronic/emulator/pics/badge.jpg').convert('L')
W, H = im.size; print(W, H)
# silver plate bounds (inside the dark surround), found from row/column brightness
a = np.asarray(im).astype(float)
cols = a[H//3:2*H//3].mean(0); rows = a[:, W//3:2*W//3].mean(1)
xs = np.where(cols > 110)[0]; ys = np.where(rows > 110)[0]
x0, x1, y0, y1 = xs[0], xs[-1], ys[0], ys[-1]; print('plate', x0, x1, y0, y1)
p = im.crop((x0, y0, x1 + 1, y1 + 1))
S = 4
p = p.resize((p.width * S, p.height * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))
b = np.asarray(p) >= 95                      # potracer traces the False (dark) areas here
hh, ww = b.shape
ink = ~b
RULES = (179, 201, 1184, 1206, 110, 2490)     # measured off the first trace: y-range of each rule, x-range
b[:int(hh*0.155)] = True; b[int(hh*0.78):] = True; b[:, :int(ww*0.03)] = True; b[:, int(ww*0.97):] = True
bm = potrace.Bitmap(b); pl = bm.trace(turdsize=120, alphamax=1.1, opttolerance=0.4)
d = []
for c in pl:
    s = c.start_point; d.append(f'M{s.x:.0f} {s.y:.0f}')
    for seg in c.segments:
        if seg.is_corner: d.append(f'L{seg.c.x:.0f} {seg.c.y:.0f}L{seg.end_point.x:.0f} {seg.end_point.y:.0f}')
        else: d.append(f'C{seg.c1.x:.0f} {seg.c1.y:.0f} {seg.c2.x:.0f} {seg.c2.y:.0f} {seg.end_point.x:.0f} {seg.end_point.y:.0f}')
    d.append('Z')
path = ''.join(d)
svg = f'<svg id="badgeart" viewBox="0 0 {p.width} {p.height}" preserveAspectRatio="none" aria-hidden="true"><path fill-rule="evenodd" d="{path}"/><rect x="{RULES[4]}" y="{RULES[0]}" width="{RULES[5]-RULES[4]}" height="{RULES[1]-RULES[0]+1}"/><rect x="{RULES[4]}" y="{RULES[2]}" width="{RULES[5]-RULES[4]}" height="{RULES[3]-RULES[2]+1}"/></svg>'
open('badge.svg', 'w').write(svg); print(len(pl), 'curves', len(svg), 'bytes', 'aspect', p.width / p.height)
open('badge_preview.svg','w').write(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="1340" style="background:#c0c0be" '))
