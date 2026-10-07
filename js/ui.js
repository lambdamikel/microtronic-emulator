// Console GUI for the Microtronic emulator: display, keypad, LEDs, program library, memory view.
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const hex = (v, n) => v.toString(16).toUpperCase().padStart(n, "0");
  const m = new Microtronic(romFromBase64(MICROTRONIC_ROM_B64));
  window.microtronic = m;                        // for poking around in the dev console

  // ------------------------------------------------------------------ timed events (in CPU cycles)
  const HOLD = 8000, GAP = 8000, BOOT = 30000;   // key hold / gap for scripted typing; boot settle time
  let queue = [], typeEnd = 0;
  const at = (cycle, fn) => { queue.push({ cycle, fn }); queue.sort((a, b) => a.cycle - b.cycle); };
  function typeKeys(names, startDelay) {
    let t = Math.max(m.cycles, typeEnd) + (startDelay || 0);
    for (const k of names) {
      at(t, () => { m.keyDown(k); showKey(k, true); });
      at(t + HOLD, () => { m.keyUp(k); showKey(k, false); });
      t += HOLD + GAP;
    }
    typeEnd = t;
  }

  // ------------------------------------------------------------------ display (6 x seven-segment, digit 0 = R5 = leftmost)
  const segEls = [];
  (function buildDisplay() {
    const NS = "http://www.w3.org/2000/svg", svg = $("display");
    const h = (x, y, l) => `${x},${y} ${x + 4},${y - 4} ${x + l - 4},${y - 4} ${x + l},${y} ${x + l - 4},${y + 4} ${x + 4},${y + 4}`;
    const v = (x, y, l) => `${x},${y} ${x + 4},${y + 4} ${x + 4},${y + l - 4} ${x},${y + l} ${x - 4},${y + l - 4} ${x - 4},${y + 4}`;
    const shapes = [h(3, 4, 30), v(34, 5, 30), v(34, 37, 30), h(3, 68, 30), v(2, 37, 30), v(2, 5, 30), h(3, 36, 30)];
    for (let pos = 0; pos < 6; pos++) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("transform", `translate(${22 + pos * 60},14) skewX(-8)`);
      const els = shapes.map(p => { const e = document.createElementNS(NS, "polygon"); e.setAttribute("points", p); return e; });
      const dp = document.createElementNS(NS, "circle"); dp.setAttribute("cx", 44); dp.setAttribute("cy", 68); dp.setAttribute("r", 4); els.push(dp);
      els.forEach(e => { e.setAttribute("class", "seg"); g.appendChild(e); });
      svg.appendChild(g);
      segEls[5 - pos] = els;                     // R5 strobes the leftmost digit
    }
  })();
  const segLevel = new Float32Array(48), ledLevel = new Float32Array(7);
  const dotLeds = [...$("dotleds").children], flagLeds = [$("carry"), $("zero")], clkLed = $("clkled");
  function renderLight() {
    const { seg, led } = m.collectLight();
    for (let d = 0; d < 6; d++) for (let b = 0; b < 8; b++) {
      const i = d * 8 + b, target = Math.min(1, seg[i] * 9);      // a steadily multiplexed digit is lit ~1/7 of the time
      const lv = segLevel[i] = segLevel[i] + (target - segLevel[i]) * (target > segLevel[i] ? 0.7 : 0.45);
      segEls[d][b].style.opacity = (0.045 + 0.955 * lv).toFixed(3);
    }
    // DOT outputs sit behind inverting drivers: LED on while R7..R10 is low.  Flag LEDs are driven directly.
    const vals = [1 - led[0], 1 - led[1], 1 - led[2], 1 - led[3], led[4], led[5], (Math.floor(m.cycles * 2 / m.cps) & 1)];
    if (typeof sound !== "undefined") sound.piezo(piezoOut >= 0 ? vals[piezoOut] : 0);
    const els = [...dotLeds, ...flagLeds, clkLed];
    for (let i = 0; i < 7; i++) {
      const lv = ledLevel[i] = ledLevel[i] + (vals[i] - ledLevel[i]) * 0.6;
      els[i].style.setProperty("--on", lv.toFixed(3));
    }
  }

  // ------------------------------------------------------------------ keypad
  const HINT = { HALT: "H", NEXT: "N, Enter or Space", RUN: "R", STEP: "S or T", BKP: "K", REG: "G", PGM: "P", CCE: "X, Backspace or Delete" };
  const LAYOUT = [["C","D","E","F","NEXT","REG"], ["8","9","A","B","BKP","STEP"],
                  ["4","5","6","7","RUN","HALT"], ["0","1","2","3","CCE","PGM"]];
  const keyEls = {}, downAt = {};
  function showKey(k, on) { if (keyEls[k]) keyEls[k].classList.toggle("down", on); }
  function press(k) {
    if (downAt[k] !== undefined) return;
    downAt[k] = m.cycles; m.keyDown(k); showKey(k, true);
  }
  function release(k) {
    if (downAt[k] === undefined) return;
    const t = downAt[k] + 5000; delete downAt[k];           // hold at least ~60 ms so the firmware's scan sees it
    at(Math.max(t, m.cycles), () => { m.keyUp(k); showKey(k, false); });
  }
  LAYOUT.forEach(row => row.forEach(k => {
    const el = document.createElement("div");
    el.className = "key"; el.innerHTML = `<span>${k === "CCE" ? "C/CE" : k}</span><b></b>`;
    el.setAttribute("role", "button"); el.setAttribute("aria-label", k); el.title = `${k === "CCE" ? "C/CE" : k} (keyboard: ${HINT[k] || k})`;
    el.addEventListener("pointerdown", e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} press(k); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => release(k)));
    keyEls[k] = el; $("keypad").appendChild(el);
  }));
  const KB = { h: "HALT", n: "NEXT", enter: "NEXT", " ": "NEXT", r: "RUN", s: "STEP", t: "STEP", k: "BKP", g: "REG", p: "PGM", backspace: "CCE", delete: "CCE", x: "CCE" };
  const kbKey = e => { const k = e.key.toLowerCase(); return /^[0-9a-f]$/.test(k) ? k.toUpperCase() : KB[k]; };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  addEventListener("keydown", e => {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { doReset(); return; }
    if (GH[e.key]) { e.preventDefault(); setBtn(GH[e.key], true); return; }
    const k = kbKey(e); if (!k) return;
    e.preventDefault(); if (!e.repeat) press(k);
  });
  addEventListener("keyup", e => { if (GH[e.key]) { setBtn(GH[e.key], false); return; } const k = kbKey(e); if (k) release(k); });
  addEventListener("blur", () => { Object.keys(downAt).forEach(release); setBtn("G", false); setBtn("H", false); });

  // ------------------------------------------------------------------ board controls
  function doReset() { sound.off(); queue = []; typeEnd = 0; Object.keys(keyEls).forEach(k => { m.keyUp(k); showKey(k, false); delete downAt[k]; }); m.reset(false); }
  $("reset").addEventListener("click", doReset);
  // inputs = the four switches, plus the red G / H push buttons wired to an input of the user's choice
  let swBits = 0; const btnDown = { G: false, H: false }, wire = {};
  const btnEls = {};
  function updateDin() {
    let d = swBits;
    for (const b of ["G", "H"]) if (btnDown[b] && wire[b].value !== "") d |= 1 << +wire[b].value;
    m.din = d;
  }
  $("dinsw").addEventListener("click", e => {
    const b = e.target.closest(".jack"); if (!b) return;
    swBits ^= 1 << +b.dataset.bit; b.classList.toggle("on", !!(swBits & (1 << +b.dataset.bit))); updateDin();
  });
  // patch wires on the pegboard: Taster -> the input jack it is wired to (supply side goes via the 4.7k resistor)
  const JACKX = [66.97, 69.5, 72.11, 74.68], JACKY = 12.48, TERM = { G: 34.99, H: 45.25 }, TERMY = 4.65;
  function drawWires() {
    for (const b of ["G", "H"]) {
      const v = wire[b].value, path = $("wire" + b), plug = $("plug" + b);
      $("peg" + b).setAttribute("r", v === "" ? 0 : 0.75);          // yellow peg on the block's terminal
      if (v === "") { path.setAttribute("d", ""); plug.setAttribute("r", 0); continue; }
      const x = JACKX[+v] + (b === "H" ? 0.25 : -0.25), x0 = TERM[b];
      path.setAttribute("d", `M${x0} ${TERMY} C ${x0 + 4} ${b === "G" ? 1.2 : 2}, ${x - 1} ${b === "G" ? 2 : 3}, ${x} ${JACKY}`);
      plug.setAttribute("cx", x); plug.setAttribute("cy", JACKY); plug.setAttribute("r", 0.75);
    }
  }
  function setBtn(b, on) { btnDown[b] = on; btnEls[b].classList.toggle("down", on); updateDin(); }
  document.querySelectorAll("select[data-wire]").forEach(sel => {
    wire[sel.dataset.wire] = sel;
    try { const v = localStorage.getItem("microtronic2090.wire" + sel.dataset.wire); if (v !== null) sel.value = v; } catch (_) {}
    sel.addEventListener("change", () => { try { localStorage.setItem("microtronic2090.wire" + sel.dataset.wire, sel.value); } catch (_) {} updateDin(); drawWires(); sel.blur(); });
  });
  drawWires();
  { let v = ""; try { v = localStorage.getItem("microtronic2090.clk") || ""; } catch (_) {} setClockCable(v); }
  document.querySelectorAll(".redkey").forEach(el => {
    const b = el.dataset.btn; btnEls[b] = el;
    el.addEventListener("pointerdown", e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} setBtn(b, true); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => setBtn(b, false)));
  });
  const GH = { ",": "G", ".": "H" };
  // virtual patch cable from the 1 Hz clock output to one of the inputs
  function setClockCable(v) {
    m.clockInput = v === "" ? -1 : +v; $("clkcable").value = v;
    $("clkjack").classList.toggle("on", v !== "");
    const path = $("wireC"), plug = $("plugC");
    if (v === "") { path.setAttribute("d", ""); plug.setAttribute("r", 0); }
    else { const x = JACKX[+v]; path.setAttribute("d", `M79.87 ${JACKY} C 79.5 6.8, ${x + 0.4} 6.8, ${x} ${JACKY}`); plug.setAttribute("cx", x); plug.setAttribute("cy", JACKY); plug.setAttribute("r", 0.75); }
    try { localStorage.setItem("microtronic2090.clk", v); } catch (_) {}
  }
  $("clkjack").addEventListener("click", () => setClockCable(m.clockInput >= 0 ? "" : "3"));
  $("clkcable").addEventListener("change", e => { setClockCable(e.target.value); e.target.blur(); });
  // piezo buzzer block: wired from one of the outputs (other leg to GND); it sounds while that output is on
  const OUTX = [53.8, 56.48, 59.12, 61.78], GNDX = 50.15;
  const setPlug = (id, x) => { const c = $(id); if (x === null) c.setAttribute("r", 0); else { c.setAttribute("cx", x); c.setAttribute("cy", JACKY); c.setAttribute("r", 0.75); } };
  let piezoOut = -1;
  function setPiezo(v) {
    piezoOut = v === "" ? -1 : +v; $("piezowire").value = v;
    $("pegP1").setAttribute("r", v === "" ? 0 : 0.75); $("pegP2").setAttribute("r", v === "" ? 0 : 0.75);
    if (v === "") { $("wireP").setAttribute("d", ""); $("wireN").setAttribute("d", ""); setPlug("plugP", null); setPlug("plugN", null); }
    else {
      const x = OUTX[+v];
      $("wireP").setAttribute("d", `M56.79 ${TERMY} C 60.5 5.2, ${x + 2.2} 8.6, ${x} ${JACKY}`);
      $("wireN").setAttribute("d", `M49.61 ${TERMY} C 47.4 6, 48 10, ${GNDX} ${JACKY}`);
      setPlug("plugP", x); setPlug("plugN", GNDX);
    }
    try { localStorage.setItem("microtronic2090.piezo", v); } catch (_) {}
  }
  $("piezowire").addEventListener("change", e => { setPiezo(e.target.value); e.target.blur(); });
  // patch cable from an output to an input
  function setPatch(o, i) {
    $("patchout").value = o; $("patchin").value = i;
    m.patches = o === "" ? [] : [[+o, +i]];
    if (o === "") { $("wireO").setAttribute("d", ""); setPlug("plugO1", null); setPlug("plugO2", null); }
    else {
      const x1 = OUTX[+o] + 0.3, x2 = JACKX[+i] + 0.3;
      $("wireO").setAttribute("d", `M${x1} ${JACKY} C ${x1 + 1} 16.5, ${x2 - 1} 16.5, ${x2} ${JACKY}`);
      setPlug("plugO1", x1); setPlug("plugO2", x2);
    }
    try { localStorage.setItem("microtronic2090.patch", o + "," + i); } catch (_) {}
  }
  const patchChanged = () => setPatch($("patchout").value, $("patchin").value);
  $("patchout").addEventListener("change", patchChanged); $("patchin").addEventListener("change", patchChanged);
  { let pz = "3", pt = ",3";
    try { const a = localStorage.getItem("microtronic2090.piezo"), b = localStorage.getItem("microtronic2090.patch"); if (a !== null) pz = a; if (b) pt = b; } catch (_) {}
    setPiezo(pz); const [o, i] = pt.split(","); setPatch(o || "", i || "3"); }

  // ------------------------------------------------------------------ programs
  function status(t, linkText, url) {
    const el = $("status"); el.textContent = t;
    if (url) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = linkText; el.append(" ", a); }
  }
  function parseMIC(text) {                      // -> [[address, word], ...]; tolerant of the usual OCR slips
    const out = []; let a = 0;
    for (let line of text.split(/\r?\n/)) {
      line = line.replace(/[#;].*$/, "").trim(); if (!line) continue;
      const org = line.match(/^@\s*([0-9A-Fa-fOoQIl]{1,2})$/);
      if (org) { a = parseInt(fix(org[1]), 16); continue; }
      for (const tok of line.split(/[\s,]+/)) {
        const w = fix(tok);
        if (!/^[0-9A-F]{3}$/.test(w)) throw new Error(`cannot read "${tok}" as an instruction`);
        if (a > 255) throw new Error("program is longer than 256 instructions");
        out.push([a++, parseInt(w, 16)]);
      }
    }
    return out;
    function fix(s) { return s.replace(/[OoQ]/g, "0").replace(/[Il]/g, "1").toUpperCase(); }
  }
  function loadText(text, name, run, entry) {
    let words;
    try { words = parseMIC(text); } catch (err) { status(`${name}: ${err.message}`); return; }
    if (!words.length) { status(`${name}: no instructions found`); return; }
    doReset();
    for (let a = 0; a < 256; a++) m.writeWord(a, 0);
    for (const [a, w] of words) m.writeWord(a, w);
    typeKeys(run ? ["HALT", "NEXT", "0", "0", "RUN"] : ["HALT", "NEXT", "0", "0"], BOOT);
    let msg = `${name}: ${words.length} instructions loaded${run ? ", running from 00" : ""}.`;
    if (entry && entry.setup) {                      // wire up what this program needs
      const w = [], su = entry.setup;
      if (su.piezo !== undefined) { setPiezo(String(su.piezo)); w.push(`piezo buzzer on output ${su.piezo + 1}`); }
      for (const b of ["G", "H"]) if (su[b] !== undefined) { wire[b].value = String(su[b]); wire[b].dispatchEvent(new Event("change")); w.push(`key ${b} on input ${su[b] + 1}`); }
      if (su.patch) { setPatch(String(su.patch[0]), String(su.patch[1])); w.push(`cable from output ${su.patch[0] + 1} to input ${su.patch[1] + 1}`); }
      if (w.length) msg += ` Wired for it: ${w.join(", ")}.`;
    }
    if (entry && entry.author) status(`${msg} © ${entry.author} —`, "rules and instructions", entry.url); else status(msg);
  }
  const lib = $("library");
  { const groups = {};
    MICROTRONIC_PROGRAMS.forEach((p, i) => {
      const g = groups[p.group] || (groups[p.group] = lib.appendChild(Object.assign(document.createElement("optgroup"), { label: p.group })));
      g.appendChild(new Option(p.title, i));
    }); }
  const chosen = () => MICROTRONIC_PROGRAMS[+lib.value];
  $("loadrun").addEventListener("click", () => loadText(chosen().text, chosen().title, true, chosen()));
  $("loadonly").addEventListener("click", () => loadText(chosen().text, chosen().title, false, chosen()));
  $("openfile").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    loadText(await f.text(), f.name, false); e.target.value = "";
  });
  $("savefile").addEventListener("click", () => {
    let last = 255; while (last > 0 && m.readWord(last) === 0) last--;
    let t = "# Microtronic program, saved from the browser emulator\n\n@ 00\n\n";
    for (let a = 0; a <= last; a++) t += hex(m.readWord(a), 3) + "\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = "PROGRAM.MIC"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("clearram").addEventListener("click", () => { for (let a = 0; a < 256; a++) m.writeWord(a, 0); status("Program memory cleared."); });

  // ------------------------------------------------------------------ PicoRAM 2090 sound (extended op-code 50D)
  // PicoRAM watches which instruction the Microtronic reads from RAM and gives "vacuous" op-codes a side effect:
  //   50x = start an extended op-code (50D = play note), 0xx = literal argument nibble x, 3Fx = argument from register x.
  // It can only see instructions as they are fetched, so (as on the real thing) nothing at address 00 is noticed on RUN.
  const sound = (() => {
    let ctx = null, osc = null, gain = null, mode = null, octave = null, freq = 0;
    const noteHz = (o, n) => {
      if (n < 1 || n > 13) return 0;                                   // rest
      if (o === 7 && n > 4) o = 0;                                     // quirk of the PicoRAM note table
      return 32.7032 * Math.pow(2, o + (n - 1) / 12);
    };
    function wake() { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = new C(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
        osc = ctx.createOscillator(); osc.type = "square"; osc.connect(gain); osc.start(); } if (ctx.state === "suspended") ctx.resume(); apply(); }
    function apply() {
      if (!ctx) return;
      const on = freq > 0 && $("sound").checked;
      if (on) osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setTargetAtTime(on ? 0.06 : 0, ctx.currentTime, 0.004);
    }
    function tone(f) { freq = f; $("tone").textContent = f > 0 ? `Playing ${f.toFixed(1)} Hz.` : "Silent."; apply(); }
    function arg(v) {
      if (mode !== "note") return;
      if (octave === null) octave = v % 8; else { tone(noteHz(octave, v)); octave = null; }
    }
    function fetched(a) {
      const w = m.readWord(a), o = w >> 8, h = (w >> 4) & 15, l = w & 15;
      if (o === 5 && h === 0) { octave = null; mode = l === 13 ? "note" : "other"; if (l === 13) tone(0); }
      else if (o === 0 && h === l) arg(l);
      else if (o === 3 && h === 15) arg(m.vmReg(l));
    }
    // piezo buzzer: a second, fixed-pitch voice whose loudness follows how long its output was on
    let pOsc = null, pGain = null;
    function piezo(level) {
      if (!ctx) return;
      if (!pOsc) { pGain = ctx.createGain(); pGain.gain.value = 0; pGain.connect(ctx.destination); pOsc = ctx.createOscillator(); pOsc.type = "square"; pOsc.frequency.value = 2400; pOsc.connect(pGain); pOsc.start(); }
      pGain.gain.setTargetAtTime($("sound").checked ? 0.035 * level : 0, ctx.currentTime, 0.006);
    }
    return { wake, fetched, apply, piezo, off() { mode = null; octave = null; tone(0); } };
  })();
  m.onFetch = sound.fetched;
  ["pointerdown", "keydown"].forEach(t => addEventListener(t, sound.wake, { capture: true }));
  $("sound").addEventListener("change", sound.apply);

  // ------------------------------------------------------------------ speed
  let speed = 1;
  $("speeds").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    speed = +b.dataset.speed;
    [...$("speeds").children].forEach(x => x.classList.toggle("on", x === b));
  });

  // ------------------------------------------------------------------ inside view
  const F0 = ["HALT","NOP","DISOUT","HXDZ","DZHX","RND","TIME","RET","CLEAR","STC","RSC","MULT","DIV","EXRL","EXRM","EXRA"];
  const OPS = ["MOV","MOVI","AND","ANDI","ADD","ADDI","SUB","SUBI","CMP","CMPI","OR","CALL","GOTO","BRC","BRZ"];
  const F1 = { 7: "MAS", 8: "INV", 9: "SHR", 10: "SHL", 11: "ADC", 12: "SUBC", 13: "DIN", 14: "DOT", 15: "KIN" };
  function disasm(w) {
    const o = w >> 8, h = (w >> 4) & 15, l = w & 15, X = v => hex(v, 1);
    if (o < 11) return `${OPS[o]} ${X(h)},${X(l)}`;
    if (o < 15) return `${OPS[o]} ${X(h)}${X(l)}`;
    if (h === 0) return F0[l];
    if (h < 7) return `DISP ${h},${X(l)}`;
    return `${F1[h]} ${X(l)}`;
  }
  const listing = $("listing"), rows = [], shown = new Int16Array(256).fill(-1);
  let pcRow = -1, editing = false;
  for (let a = 0; a < 256; a++) { const d = document.createElement("div"); d.dataset.a = a; listing.appendChild(d); rows.push(d); }
  function renderRow(a) {
    const w = m.readWord(a); shown[a] = w;
    rows[a].textContent = `${hex(a, 2)}  ${hex(w, 3)}  ${disasm(w)}`;
    rows[a].classList.toggle("nop", w === 0);
  }
  listing.addEventListener("click", e => {
    const row = e.target.closest("div[data-a]"); if (!row || editing || row === listing) return;
    edit(+row.dataset.a);
  });
  function edit(a) {
    editing = true;
    const row = rows[a], inp = document.createElement("input");
    inp.maxLength = 3; inp.value = hex(m.readWord(a), 3);
    row.textContent = hex(a, 2) + "  "; row.appendChild(inp); inp.focus(); inp.select();
    const done = (commit, next) => {
      if (!editing) return; editing = false;
      if (commit && /^[0-9a-fA-F]{3}$/.test(inp.value)) m.writeWord(a, parseInt(inp.value, 16));
      renderRow(a);
      if (next && a < 255) edit(a + 1);
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") done(true, true); else if (e.key === "Escape") done(false, false); });
    inp.addEventListener("blur", () => done(true, false));
  }
  function renderInside() {
    const pc = m.vmPC, fl = m.ram[77];
    let r = "", x = "";
    for (let i = 0; i < 16; i++) { r += hex(m.vmReg(i), 1) + " "; x += hex(m.vmMem(i), 1) + " "; }
    $("state").textContent =
      `PC ${hex(pc, 2)}   ${m.vmRunning ? "RUN " : "HALT"}   carry ${fl & 1}  zero ${(fl >> 1) & 1}\n` +
      `      0 1 2 3 4 5 6 7 8 9 A B C D E F\n` +
      `work  ${r}\nmem   ${x}`;
    if (!editing) for (let a = 0; a < 256; a++) if (shown[a] !== m.readWord(a)) renderRow(a);
    if (pc !== pcRow) {
      if (pcRow >= 0) rows[pcRow].classList.remove("pc");
      rows[pc].classList.add("pc"); pcRow = pc;
      if (!editing && !listing.matches(":hover")) listing.scrollTop = Math.max(0, rows[pc].offsetTop - listing.offsetTop - listing.clientHeight / 2);
    }
  }

  // ------------------------------------------------------------------ keep program memory across page reloads
  const STORE = "microtronic2090.ram";
  let saved = "";
  const snapshot = () => { let s = ""; for (let a = 0; a < 256; a++) s += hex(m.readWord(a), 3); return s; };
  try {
    const s = localStorage.getItem(STORE);
    if (s && s.length === 768) { for (let a = 0; a < 256; a++) m.writeWord(a, parseInt(s.substr(a * 3, 3), 16) || 0); saved = s; }
  } catch (_) {}
  setInterval(() => { const s = snapshot(); if (s !== saved) { saved = s; try { localStorage.setItem(STORE, s); } catch (_) {} } }, 2000);

  // ------------------------------------------------------------------ deep links: ?load=HANOI&run=1&speed=4
  (function fromURL() {
    const q = new URLSearchParams(location.search);
    const sp = q.get("speed"), b = sp && [...$("speeds").children].find(x => x.dataset.speed === sp);
    if (b) b.click();
    const name = (q.get("load") || "").toUpperCase(), i = MICROTRONIC_PROGRAMS.findIndex(p => p.name.toUpperCase() === name);
    if (i >= 0) { lib.value = i; loadText(chosen().text, chosen().title, q.get("run") !== "0", chosen()); }
    // report programs that do not parse (development aid)
    if (q.has("check")) status(MICROTRONIC_PROGRAMS.map(p => { try { return parseMIC(p.text).length ? "" : p.name + ": empty"; } catch (e) { return p.name + ": " + e.message; } }).filter(Boolean).join(" | ") || "all programs parse");
  })();

  // ------------------------------------------------------------------ main loop
  let last = performance.now(), frac = 0, frames = 0, rateCycles = 0, rateT = last;
  function frame(now) {
    const dt = Math.min(100, now - last); last = now;
    frac += dt / 1000 * m.cps * speed;
    let n = Math.floor(frac); frac -= n;
    const deadline = performance.now() + 12;
    while (n > 0) {
      while (queue.length && queue[0].cycle <= m.cycles) queue.shift().fn();
      let chunk = Math.min(n, 256);
      if (queue.length) chunk = Math.max(1, Math.min(chunk, queue[0].cycle - m.cycles));
      m.run(chunk); n -= chunk; rateCycles += chunk;
      if ((n & 0xfff) < 256 && performance.now() > deadline) break;     // host too slow for this speed: drop the rest
    }
    renderLight();
    if (++frames % 6 === 0) renderInside();
    if (now - rateT > 1000) {
      $("rate").textContent = `TMS1600 at ${Math.round(rateCycles / (now - rateT) * 1000).toLocaleString()} instruction cycles/s (original: ${Math.round(m.cps).toLocaleString()}).`;
      rateCycles = 0; rateT = now;
    }
    nextFrame();
  }
  // ?timer drives the loop from a timer instead of animation frames (for headless testing)
  const useTimer = new URLSearchParams(location.search).has("timer");
  const nextFrame = () => useTimer ? setTimeout(() => frame(performance.now()), 16) : requestAnimationFrame(frame);
  renderInside();
  nextFrame();
})();
