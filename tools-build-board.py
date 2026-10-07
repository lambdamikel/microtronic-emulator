#!/usr/bin/env python3
"""Draw the 2090 and 2095 circuit boards as inline SVG and inject them into index.html.

Coordinates are pixels measured off photos of a real machine (pics/), so parts sit
where they do on the board and line up with the jacks on the label strip.

    python3 tools-build-board.py
"""
import re

TRACE, BOARD, PAD = '#35c9ab', '#0f5b4e', '#c9d6d2'
o = []
def add(s): o.append(s)

def trace(d, w=5): add(f'<path d="{d}" fill="none" stroke="{TRACE}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>')
def pad(x, y, r=7): add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAD}"/><circle cx="{x}" cy="{y}" r="{r*0.42:.1f}" fill="#16302b"/>')

def res_v(x, y1, y2, bands=('#7a3b12', '#1c1c1c', '#b3541e'), w=17, thin=False):
    add(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="#b9c0c2" stroke-width="3"/>')
    pad(x, y2, 6)
    if thin:
        add(f'<rect x="{x-4}" y="{y1+ (y2-y1)*.25:.0f}" width="8" height="{(y2-y1)*.5:.0f}" rx="3" fill="#c96a3a"/>'); return
    by, bh = y1 + (y2 - y1) * .16, (y2 - y1) * .66
    add(f'<rect x="{x-w/2}" y="{by:.0f}" width="{w}" height="{bh:.0f}" rx="6" fill="#d7ae7c"/>')
    for i, c in enumerate(bands):
        add(f'<rect x="{x-w/2}" y="{by + bh*(.2+.2*i):.0f}" width="{w}" height="{bh*.08:.1f}" fill="{c}"/>')
    add(f'<rect x="{x-w/2}" y="{by + bh*.82:.0f}" width="{w}" height="{bh*.07:.1f}" fill="#c9a227"/>')

def res_h(x1, x2, y, w=17):
    add(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#b9c0c2" stroke-width="3"/>')
    pad(x1, y, 6); pad(x2, y, 6)
    bx, bw = x1 + (x2 - x1) * .17, (x2 - x1) * .66
    add(f'<rect x="{bx:.0f}" y="{y-w/2}" width="{bw:.0f}" height="{w}" rx="6" fill="#d7ae7c"/>')
    for i, c in enumerate(('#7a3b12', '#1c1c1c', '#b3541e')):
        add(f'<rect x="{bx + bw*(.2+.2*i):.0f}" y="{y-w/2}" width="{bw*.08:.1f}" height="{w}" fill="{c}"/>')

def ccap(x, y, rx=22, ry=8, rot=0, c='#d9722f'):
    add(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" transform="rotate({rot} {x} {y})"/>')

def dip_v(x1, y1, x2, y2, n, label='', silk='', silk_at=None, socket=False):
    """vertical DIP, n pins per side"""
    pitch = (y2 - y1) / n
    for i in range(n):
        py = y1 + pitch * (i + .5)
        for px in (x1 - 9, x2 + 9):
            if socket: add(f'<circle cx="{px}" cy="{py:.1f}" r="7" fill="#e8e9e6"/><circle cx="{px}" cy="{py:.1f}" r="3" fill="#555"/>')
            else: add(f'<rect x="{px-8}" y="{py-4.5:.1f}" width="16" height="9" rx="2" fill="#c3c8ca"/>')
    add(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="4" fill="url(#chip)"/>')
    add(f'<path d="M{(x1+x2)/2-9} {y1} a9 9 0 0 0 18 0" fill="#0b0b0c"/>')
    if label:
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        add(f'<text x="{cx}" y="{cy}" transform="rotate(90 {cx} {cy})" text-anchor="middle" dominant-baseline="middle" font-size="15" fill="#8d9196" font-family="Arial,Helvetica,sans-serif">{label}</text>')
    if silk:
        sx, sy = silk_at
        add(f'<text x="{sx}" y="{sy}" transform="rotate(-90 {sx} {sy})" text-anchor="middle" font-size="19" fill="{TRACE}" font-family="Arial,Helvetica,sans-serif">{silk}</text>')

def logo(x, y, s, num):
    add(f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{TRACE}"/>')
    c = x + s / 2
    add(f'<path d="M{x+s*.1} {y+s*.5} L{c} {y+s*.1} L{x+s*.9} {y+s*.5} L{c} {y+s*.9} Z" fill="none" stroke="{BOARD}" stroke-width="{s*.04:.1f}"/>')
    add(f'<rect x="{x+s*.06}" y="{y+s*.36}" width="{s*.88}" height="{s*.28}" fill="{TRACE}"/>')
    add(f'<text x="{c}" y="{y+s*.6}" text-anchor="middle" font-size="{s*.27:.0f}" font-weight="700" fill="{BOARD}" font-family="Arial,Helvetica,sans-serif">BUSCH</text>')
    add(f'<text x="{c}" y="{y+s*1.32}" text-anchor="middle" font-size="{s*.26:.0f}" font-weight="700" fill="{TRACE}" font-family="Arial,Helvetica,sans-serif">{num}</text>')

DEFS = ('<defs><linearGradient id="chip" x1="0" x2="1"><stop offset="0" stop-color="#2b2c2f"/><stop offset=".5" stop-color="#1b1c1e"/><stop offset="1" stop-color="#232427"/></linearGradient>'
        '<linearGradient id="elko" x1="0" x2="1"><stop offset="0" stop-color="#1f62ad"/><stop offset=".35" stop-color="#6ab4ee"/><stop offset=".7" stop-color="#2d7ac6"/><stop offset="1" stop-color="#174a86"/></linearGradient></defs>')

# ============================================================ 2090 main board
def board2090():
    o.clear()
    add(f'<svg class="pcbsvg" viewBox="22 165 1371 840" preserveAspectRatio="none" aria-hidden="true">{DEFS}')
    add(f'<rect x="22" y="165" width="1371" height="840" fill="{BOARD}"/>')
    add(f'<rect x="1270" y="930" width="123" height="75" fill="{TRACE}"/><path d="M1290 172 V205 H1393" fill="none" stroke="{TRACE}" stroke-width="7"/>')
    # --- traces: output LED drivers
    trace('M42 168 V358 H150 V345'); trace('M100 168 V335 H138'); trace('M205 168 V340 H243'); trace('M305 168 V340 H345'); trace('M405 168 V337 H462 V248')
    trace('M168 380 V358 H470'); trace('M215 395 V378 H470 V355')
    # top bus and reset
    trace('M445 232 V190 H1140 V238 H1198 V392 H1100'); trace('M470 243 H722 V283 H1000 V318'); trace('M545 172 H1130')
    trace('M690 300 V338 H1000 V470 H1030'); trace('M768 370 V565 H760'); trace('M700 362 H1060'); trace('M35 565 H125 V512 H145'); trace('M150 585 H215 V545 H268'); trace('M320 520 V500 H600 V420')
    trace('M345 520 V480 H470'); trace('M175 606 H300')
    # the wide bus between the 4502/RAM area and the processor
    for i in range(8):
        y = 578 + i * 11
        xl = 505 - i * 13
        trace(f'M835 {y} H{xl} L{xl-34} {y+34} H{66 + i*11} V{712 + i*5}', 4)
    for i in range(6):
        x = 612 + i * 15
        trace(f'M{x-92} {668 - i*3} H{x-30} L{x} {700 - i*3 + 30} V{905 - i*16} L{x+62} {967 - i*16} V1003', 4)
    # stair-steps below the processor, left-edge fan
    trace('M275 842 V930 H330 V1003'); trace('M350 842 V912 H412 V1003'); trace('M428 842 V898 H482 V1003'); trace('M600 842 V1003')
    for i in range(5): trace(f'M{34 + i*12} {790 + i*12} L{70 + i*12} {826 + i*12} V1003', 4)
    trace('M100 838 H120 V880 H135')
    # right half
    trace('M750 590 H860 V790 H835'); trace('M875 572 H1000 V420 H1042'); trace('M965 592 H1205'); trace('M992 617 H1205'); trace('M1032 642 H1140 V664 H1205')
    trace('M880 600 V838 H862'); trace('M1055 830 H888 V862'); trace('M1060 850 H1180 V1003'); trace('M860 890 H1090')
    trace('M1232 880 V1003'); trace('M800 882 V930 H835')
    for x, y in ((148,338),(246,340),(347,340),(448,330),(268,548),(150,585),(300,580),(480,572),(770,468),(1000,320),(1170,265),(1000,440),(865,860),(840,862),(1240,636),(1265,640)): pad(x, y)
    for i in range(3): pad(40, 635 + i*27, 8)
    # --- resistors
    for x, a, b in ((80,240,335),(146,250,330),(181,240,322),(247,250,335),(282,240,322),(348,250,335),(383,240,322),(450,240,335)): res_v(x, a, b)
    for x in (476, 500, 524, 548, 573): res_v(x, 418, 518)
    for x in (326, 350, 373, 400): res_v(x, 515, 612)
    res_v(187, 455, 548, bands=('#b3261e', '#b3261e', '#1c1c1c')); res_v(212, 465, 548, thin=True)
    for x in (155, 180, 203, 228): res_v(x, 868, 958)
    for i, x in enumerate((748, 773, 800, 823, 848, 871, 896, 920, 946)): res_v(x, 212, 315, thin=bool(i % 2))
    res_v(1073, 222, 305); res_v(972, 640, 738); res_v(995, 645, 738, thin=True); res_v(845, 868, 962)
    res_v(971, 768, 858, thin=True); res_v(994, 768, 858, thin=True)
    res_h(612, 692, 292); res_h(1070, 1168, 352); res_h(700, 782, 992); res_h(1046, 1130, 882); res_h(1046, 1130, 910)
    # --- small parts
    for x, y, rot in ((650,318,5),(800,478,12),(65,768,8),(793,478,12),(1113,565,0),(1093,958,5),(1153,950,-8)): ccap(x, y, rot=rot)
    ccap(1041, 780, 22, 9, 80); ccap(966, 915, 24, 9, 82)
    add('<circle cx="998" cy="916" r="16" fill="#2f7fd0"/>')
    add('<rect x="1012" y="868" width="22" height="78" rx="8" fill="#a9aeb1" transform="rotate(-8 1023 907)"/>')
    add('<circle cx="195" cy="405" r="17" fill="#1a1a1b"/><circle cx="195" cy="405" r="11" fill="#e9e9e6"/>')
    for x in (237, 287, 335, 378, 423): add(f'<path d="M{x-22} {410} a22 22 0 1 0 40 -6 Z" fill="#232426"/>')
    add('<path d="M1100 286 a21 21 0 1 0 40 0 Z" fill="#232426"/><circle cx="1120" cy="295" r="20" fill="#232426"/>')
    add('<circle cx="660" cy="992" r="0" /><rect x="640" y="978" width="24" height="26" rx="3" fill="#e4e4de"/>')
    # --- interface socket (the 2095 ribbon cable plugs in here)
    add('<rect x="55" y="378" width="100" height="172" rx="4" fill="#161718"/><rect x="84" y="392" width="42" height="144" fill="#0f5b4e"/>')
    for i in range(7):
        for x in (68, 142): add(f'<circle cx="{x}" cy="{392 + i*24}" r="7.5" fill="#d8c88f"/><circle cx="{x}" cy="{392 + i*24}" r="3.2" fill="#3a3320"/>')
    # --- ICs
    dip_v(628, 358, 692, 548, 8, 'CD4502BE', '4502', (726, 482))
    dip_v(856, 375, 916, 565, 7, 'CD4016BE', '4016', (948, 425))
    dip_v(1078, 378, 1140, 560, 7, 'CD4013BE', '4013', (1172, 480))
    dip_v(1068, 660, 1138, 845, 8, 'CD4060BE', '4060', (1168, 770))
    dip_v(728, 658, 796, 880, 9, '2114', 'RAM', (705, 790), socket=True)
    # --- TMS1600 (40 pins)
    for i in range(20):
        x = 127 + i * 24.8
        add(f'<rect x="{x-7:.1f}" y="682" width="14" height="18" rx="5" fill="#dfe2e3"/><rect x="{x-5:.1f}" y="828" width="10" height="16" rx="2" fill="#c3c8ca"/>')
    add('<rect x="115" y="698" width="495" height="132" rx="5" fill="url(#chip)"/><rect x="115" y="698" width="495" height="26" rx="5" fill="#222326"/>')
    add('<path d="M115 754 a10 10 0 0 1 0 20" fill="#0b0b0c"/><circle cx="170" cy="772" r="9" fill="#17181a"/><circle cx="540" cy="772" r="9" fill="#17181a"/>')
    add('<text x="362" y="778" transform="rotate(180 362 772)" text-anchor="middle" font-size="19" fill="#8d9196" font-family="Arial,Helvetica,sans-serif">TMS1600NLL7574 &#160; P 8147</text>')
    add(f'<text x="502" y="884" text-anchor="middle" font-size="22" font-weight="700" fill="{TRACE}" font-family="Arial,Helvetica,sans-serif">TMS 1600</text>')
    # edge connector pins
    for i in range(16): add(f'<path d="M{82 + i*24.6:.1f} 1003 v-14 l5 -8 l5 8 v14 z" fill="#d7c9a8"/>')
    # --- logo, rectifier, big electrolytic
    logo(1265, 228, 100, '2090')
    add('<circle cx="1265" cy="425" r="50" fill="#1b1c1e"/><circle cx="1265" cy="425" r="43" fill="#232426"/>')
    add('<text x="1265" y="418" text-anchor="middle" font-size="19" fill="#7d8187" font-family="Arial,Helvetica,sans-serif" transform="rotate(170 1265 425)">B40</text><text x="1265" y="446" text-anchor="middle" font-size="16" fill="#7d8187" font-family="Arial,Helvetica,sans-serif" transform="rotate(170 1265 425)">C800 + ~</text>')
    add('<path d="M1250 492 q20 -10 44 4 v22" fill="none" stroke="#b9c0c2" stroke-width="4"/>')
    add('<rect x="1203" y="512" width="188" height="380" rx="26" fill="url(#elko)"/><rect x="1203" y="512" width="188" height="14" rx="7" fill="#174a86" opacity=".5"/>')
    add('<text x="1290" y="702" transform="rotate(-90 1290 702)" text-anchor="middle" font-size="40" font-weight="700" fill="#0d2d55" font-family="Arial,Helvetica,sans-serif">2200 µF &#160; 220</text>')
    add('<text x="1352" y="702" transform="rotate(-90 1352 702)" text-anchor="middle" font-size="31" font-weight="700" fill="#0d2d55" font-family="Arial,Helvetica,sans-serif">VDC &#160; 25 VDC &#160; 25</text>')
    # reset key frame (the green cap itself is a real button on top)
    add('<rect x="470" y="260" width="124" height="128" rx="5" fill="#141516"/>')
    add('</svg>')
    return ''.join(o)

# ============================================================ 2095 cassette interface
def board2095():
    o.clear()
    add(f'<svg class="pcbsvg" viewBox="12 12 1111 588" preserveAspectRatio="none" aria-hidden="true">{DEFS}')
    add(f'<rect x="12" y="12" width="1111" height="588" fill="{BOARD}"/>')
    def tr(d): trace(d, 4)
    # nested bus lines, as on the board: top fan, bottom bus, middle bus to the connector
    for i in range(5): tr(f'M{268 + i*14} 120 V{45 + i*13} H{610 - i*4}')
    tr('M130 30 H175 V60 H130 V120'); tr('M610 22 V75 H690'); tr('M688 40 H820 V95'); tr('M700 22 V40')
    for i in range(3): tr(f'M{78 + i*12} {352 + i*8} V{560 + i*12} H{575 - i*10}')
    for i in range(5): tr(f'M560 {285 + i*11} H{1020 - i*4} V{300 + i*11 + 30}')
    tr('M185 160 H215 V285 H260 V125'); tr('M230 350 H300 V280 H420'); tr('M230 350 V545 H250'); tr('M330 355 V540'); tr('M385 370 V560')
    tr('M410 280 V345 H560'); tr('M520 120 V280 H560'); tr('M505 372 H560 V545 H585'); tr('M575 380 H660 V520 H600')
    tr('M700 345 V470 H750'); tr('M725 360 H760 V380'); tr('M745 520 H870 V420 H830'); tr('M800 545 H1010 V410 H1040 V560 H660')
    tr('M870 330 H985 V380'); tr('M905 345 V380'); tr('M1035 345 V410'); tr('M690 110 V235 H820 V250'); tr('M1010 160 V240 H1035')
    tr('M1080 30 V165'); tr('M185 420 H215 V372'); tr('M95 298 H80 V352')
    for x, y in ((898,260),(155,553),(658,330),(658,355),(818,338),(1022,338),(862,495),(862,517),(432,258),(118,548)): pad(x, y, 7)
    T = f'fill="{TRACE}" font-family="Arial,Helvetica,sans-serif"'
    add(f'<text x="405" y="38" text-anchor="middle" font-size="26" font-weight="700" {T}>P 083/1</text>')
    add(f'<text x="898" y="246" text-anchor="middle" font-size="15" {T}>TP</text><text x="170" y="560" font-size="15" {T}>TP</text>')
    # resistors
    for x in (28, 48, 68): res_v(x, 150, 250, w=14)
    for x in (210, 232): res_v(x, 60, 145, w=14)
    for x in (30, 50): res_v(x, 355, 445, w=14)
    for x in (696, 716): res_v(x, 245, 345, w=14)
    res_v(1060, 430, 505, w=13)
    for y in (298, 320, 342): res_h(95, 182, y, w=14)
    res_h(335, 428, 298, w=14)
    # capacitors
    for x, y in ((380,135),(170,372),(505,372),(585,118),(888,340)): ccap(x, y, 26, 9, -4)
    ccap(605, 205, 26, 10, 88); ccap(578, 185, 16, 7, 85)
    add('<rect x="12" y="250" width="58" height="78" rx="4" fill="#d23a34"/><rect x="578" y="542" width="88" height="36" rx="4" fill="#d23a34"/>')
    add('<rect x="40" y="85" width="34" height="52" rx="12" fill="#2a63c4"/><rect x="66" y="82" width="34" height="50" rx="14" fill="#2f6fd0"/><rect x="12" y="100" width="12" height="36" fill="#e6e6e2"/>')
    add('<circle cx="340" cy="330" r="15" fill="#2f6fd0"/><ellipse cx="1036" cy="495" rx="11" ry="24" fill="#2f6fd0"/>')
    # ICs (silk-screen type next to each, as on the board)
    for (x1, y1, x2, y2), lab, silk in (((110,125,160,272),'HCF4011BE','4011'), ((270,125,322,272),'HCF4071BE','4071'), ((437,112,490,262),'HCF4069UBE','4069'),
                                        ((112,385,160,535),'HCF4013BE','4013'), ((272,385,322,535),'HCF4081BE','4081'), ((440,385,490,535),'HCF4013BE','4013'),
                                        ((598,390,648,535),'HCF4071BE','4071'), ((763,385,813,530),'HCF4013BE','4013'), ((928,385,983,532),'HCF4069UBE','4069')):
        n = 7; pitch = (y2 - y1) / n
        for i in range(n):
            for px in (x1 - 7, x2 + 7): add(f'<rect x="{px-7}" y="{y1 + pitch*(i+.5) - 4:.1f}" width="14" height="8" rx="2" fill="#c3c8ca"/>')
        add(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="4" fill="url(#chip)"/><path d="M{(x1+x2)/2-8} {y1} a8 8 0 0 0 16 0" fill="#0b0b0c"/>')
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        add(f'<text x="{cx}" y="{cy}" transform="rotate(90 {cx} {cy})" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#8d9196" font-family="Arial,Helvetica,sans-serif">{lab}</text>')
        sx = x2 + 30
        add(f'<text x="{sx}" y="{cy}" transform="rotate(90 {sx} {cy})" text-anchor="middle" font-size="19" {T}>{silk}</text>')
    # slide switch, start key frame, logo, ribbon connector
    add('<rect x="628" y="95" width="115" height="77" rx="3" fill="#cfc9bb"/><rect x="646" y="118" width="80" height="32" fill="#4a4a4a"/><rect x="653" y="114" width="52" height="40" rx="3" fill="#141516"/>')
    for k in range(5): add(f'<rect x="{660 + k*9}" y="118" width="3" height="32" fill="#3a3b3d"/>')
    add('<rect x="830" y="90" width="100" height="103" rx="5" fill="#141516"/>')
    logo(948, 38, 78, '2095')
    add('<rect x="1038" y="168" width="58" height="177" rx="4" fill="#18191b"/>')
    add('</svg>')
    return ''.join(o)

html = open('index.html').read()
for tag, fn in (('PCB2090', board2090), ('PCB2095', board2095)):
    html, n = re.subn(rf'<!--{tag}-->.*?<!--/{tag}-->', lambda m: f'<!--{tag}-->{fn()}<!--/{tag}-->', html, flags=re.S)
    assert n == 1, tag + ' marker missing in index.html'
open('index.html', 'w').write(html)
print('boards written')
