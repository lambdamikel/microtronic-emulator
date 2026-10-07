// TMS1600 core + Busch Microtronic 2090 board model.
//
// Runs the original mask ROM instruction by instruction.  Nothing is
// intercepted: the 2114 program RAM, the multiplexed display, the keypad
// matrix, the DIN/DOT ports and the carry/zero LEDs are all modelled at the
// pin level, as wired in the Busch schematic.
//
// CPU semantics follow Jason T. Jacques' TMS1000-family emulator (TMS1600 target).
"use strict";

const OPLA = (() => {            // O-output PLA: index = SL:A (5 bits) -> O7..O0
  const t = new Uint8Array(32);
  for (let i = 0; i < 16; i++) t[i] = i;               // SL=0: raw nibble (RAM address A0..A3)
  [0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0xfc,0x39,0x5e,0x79,0x71]
    .forEach((v, i) => { t[16 + i] = v; });            // SL=1: 7-segment glyph (O0=a .. O6=g, O7=dp)
  return t;
})();

const NEXT = new Uint8Array(64);  // 6-bit LFSR program counter
for (let pc = 0; pc < 64; pc++) {
  let fb;
  if (pc === 0x1f) fb = 1; else if (pc === 0x3f) fb = 0;
  else fb = (((pc >> 5) & 1) === ((pc >> 4) & 1)) ? 1 : 0;
  NEXT[pc] = ((pc << 1) | fb) & 0x3f;
}
const LOGICAL = new Uint8Array(64);
for (let i = 0, p = 0; i < 64; i++) { LOGICAL[p] = i; p = NEXT[p]; }

const rev4 = b => ((b & 1) << 3) | ((b & 2) << 1) | ((b & 4) >> 1) | ((b & 8) >> 3);
const rev3 = b => ((b & 1) << 2) | (b & 2) | ((b & 4) >> 2);
const rev2 = b => ((b & 1) << 1) | ((b & 2) >> 1);

// keypad: key name -> [column R line, K row bit]
const KEYMAP = {};
[['0','1','2','3','CCE','PGM'],
 ['4','5','6','7','RUN','HALT'],
 ['8','9','A','B','BKP','STEP'],
 ['C','D','E','F','NEXT','REG']].forEach((row, r) => row.forEach((k, c) => { KEYMAP[k] = [c, r]; }));

class Microtronic {
  constructor(romBytes) {
    if (romBytes.length !== 4096) throw new Error("ROM must be 4096 bytes");
    this.rom = romBytes;
    this.ram = new Uint8Array(128);        // 8 files x 16 words
    this.sram = new Uint8Array(1024);      // 2114: 1024 x 4, raw cell contents
    this.R = new Uint8Array(16);
    this.keys = new Uint8Array(6);         // per column R0..R5: K row bits of held keys
    this.din = 0;                          // external inputs IN1..IN4
    this.onFetch = null;                   // optional observer: called with the address of each instruction read
    this.patches = [];                     // patch cables [output 0..3, input 0..3]: the input follows the output
    this.clockInput = -1;                  // patch cable: 1 Hz clock output -> input bit 0..3 (-1 = not connected)
    this.cps = 500000 / 6;                 // instruction cycles per second (500 kHz RC osc)
    // light integration: on-time (in cycles) per LED since last collect()
    this.segAcc = new Float64Array(48);    // 6 digits x 8 segments
    this.ledAcc = new Float64Array(6);     // DOT1..4 (R7..R10), carry (R14), zero (R15)
    this.accSince = 0;
    this.sram.fill(15);                    // cells hold inverted data: all-1s reads back as 000
    this.reset(true);
  }
  // ---- convenience access to the Microtronic VM state (not used by the emulation itself) ----
  readWord(a) { const s = this.sram; return ((~s[a] & 15) << 8) | ((~s[0x200 + a] & 15) << 4) | (~s[0x100 + a] & 15); }
  writeWord(a, v) { const s = this.sram; s[a] = ~(v >> 8) & 15; s[0x200 + a] = ~(v >> 4) & 15; s[0x100 + a] = ~v & 15; }
  get inputPins() {                        // levels on inputs 1-4: switches/keys, clock cable, output-to-input cables
    let d = this.din;
    for (const [o, i] of this.patches) if (!this.R[7 + o]) d |= 1 << i;
    if (this.clockInput >= 0 && (Math.floor(this.cycles * 2 / this.cps) & 1)) d |= 1 << this.clockInput;
    return d & 15;
  }
  get outputPins() { const R = this.R; return (R[7] ? 0 : 1) | (R[8] ? 0 : 2) | (R[9] ? 0 : 4) | (R[10] ? 0 : 8); }
  get vmPC() { return (this.ram[37] << 4) | this.ram[36]; }
  get vmRunning() { return this.ram[8] === 1; }
  vmReg(i) { return this.ram[112 + i]; }       // working registers  (file 7)
  vmMem(i) { return this.ram[96 + i]; }        // memory registers   (file 6)
  reset(cold) {
    this.pc = 0; this.pa = 0xf; this.pb = 0xf; this.ca = 0; this.cb = 0;
    this.x = 0; this.y = 0; this.a = 0; this.s = 0; this.sl = 0;
    this.sr = [0,0,0]; this.psr = [0,0,0]; this.csr = [0,0,0]; this.cl = [0,0,0];
    this.o = 0;
    this._light();
    this.R.fill(0);
    if (cold) { this.ram.fill(0); this.cycles = 0; this.lastLight = 0; this.accSince = 0; }
  }
  // ---- board ----
  sramAddr() {
    const R = this.R;
    return (this.o & 15) | (R[0] << 4) | (R[1] << 5) | (R[2] << 6) | (R[3] << 7) | (R[4] << 8) | (R[5] << 9);
  }
  readK() {
    const R = this.R;
    if (R[11]) {                                            // KL: L inputs = 2114 data
      const a = this.sramAddr();
      if (a < 0x100 && this.onFetch) this.onFetch(a);       // opcode nibble of instruction a is being read
      return this.sram[a];
    }
    let k = 0;
    for (let c = 0; c < 6; c++) if (R[c]) k |= this.keys[c];
    if (R[6]) {
      let d = this.din;
      for (const [o, i] of this.patches) if (!R[7 + o]) d |= 1 << i;   // an output is high while its R line is low
      if (this.clockInput >= 0 && (Math.floor(this.cycles * 2 / this.cps) & 1)) d |= 1 << this.clockInput;
      k |= d;
    }
    return k & 15;
  }
  _light() {                               // integrate LED on-time up to now
    const dt = this.cycles - this.lastLight;
    if (dt > 0) {
      const R = this.R;
      if (this.dispEnable()) {
        for (let d = 0; d < 6; d++) if (R[d]) {
          for (let b = 0, o = this.o; b < 8; b++) if ((o >> b) & 1) this.segAcc[d * 8 + b] += dt;
        }
      }
      for (let i = 0; i < 4; i++) if (R[7 + i]) this.ledAcc[i] += dt;
      if (R[14]) this.ledAcc[4] += dt;
      if (R[15]) this.ledAcc[5] += dt;
    }
    this.lastLight = this.cycles;
  }
  dispEnable() { return this.R[12] === 1; }
  _pins() {                                // called after R or O changed
    const R = this.R;
    if (R[13]) this.sram[this.sramAddr()] = (~(R[7] | (R[8] << 1) | (R[9] << 2) | (R[10] << 3))) & 15;
  }
  collectLight() {                         // -> {seg[48], led[6]} duty 0..1 since last call
    this._light();
    const span = Math.max(1, this.cycles - this.accSince);
    const seg = Array.from(this.segAcc, v => v / span), led = Array.from(this.ledAcc, v => v / span);
    this.segAcc.fill(0); this.ledAcc.fill(0); this.accSince = this.cycles;
    return { seg, led };
  }
  keyDown(name) { const k = KEYMAP[name]; if (k) this.keys[k[0]] |= (1 << k[1]); }
  keyUp(name) { const k = KEYMAP[name]; if (k) this.keys[k[0]] &= ~(1 << k[1]); }
  // ---- cpu ----
  logicalAddr() { return ((this.ca << 4) | this.pa).toString(16).padStart(2, '0') + ':' + LOGICAL[this.pc].toString(16).padStart(2, '0'); }
  run(n) { for (let i = 0; i < n; i++) this.step(); }
  step() {
    const inst = this.rom[(this.ca << 10) | (this.pa << 6) | this.pc];
    this.pc = NEXT[this.pc];
    this.cycles++;
    const ram = this.ram, mi = (this.x << 4) | this.y;
    let t;
    if (inst >= 0xc0) {                                   // CALL
      if (this.s) {
        this.sr.unshift(this.pc); this.sr.length = 3;
        this.psr.unshift(this.pa); this.psr.length = 3;
        this.csr.unshift(this.ca); this.csr.length = 3;
        this.cl.unshift(1); this.cl.length = 3;
        this.pc = inst & 0x3f; this.pa = this.pb; this.ca = this.cb;
      } else { this.cb = this.ca; this.pb = this.pa; this.s = 1; }
      return;
    }
    if (inst >= 0x80) {                                   // BR
      if (this.s) { this.pa = this.pb; this.ca = this.cb; this.pc = inst & 0x3f; }
      else this.s = 1;
      return;
    }
    switch (inst >> 4) {
      case 0x0:
        switch (inst) {
          case 0x00: this.s = ram[mi] !== this.a ? 1 : 0; break;                    // MNEA
          case 0x01: this.s = this.a <= ram[mi] ? 1 : 0; break;                     // ALEM
          case 0x02: this.s = this.y !== this.a ? 1 : 0; this.sl = this.s; break;   // YNEA
          case 0x03: t = ram[mi]; ram[mi] = this.a; this.a = t; this.s = 1; break;  // XMA
          case 0x04: this.s = this.y >= 1 ? 1 : 0; this.y = (this.y - 1) & 15; break; // DYN
          case 0x05: this.s = this.y === 15 ? 1 : 0; this.y = (this.y + 1) & 15; break; // IYC
          case 0x06: t = ram[mi] + this.a; this.s = t > 15 ? 1 : 0; this.a = t & 15; break; // AMAAC
          case 0x07: t = ram[mi]; this.s = t >= 1 ? 1 : 0; this.a = (t - 1) & 15; break;    // DMAN
          case 0x08: this.a = this.readK(); this.s = 1; break;                      // TKA
          case 0x09: this.x ^= 4; this.s = 1; break;                                // COMX
          case 0x0a: this._light(); this.o = OPLA[(this.sl << 4) | this.a]; this._pins(); this.s = 1; break; // TDO
          case 0x0b: this.cb = this.pb & 3; this.s = 1; break;                      // TPC
          case 0x0c: this._light(); this.R[this.y] = 0; this._pins(); this.s = 1; break; // RSTR
          case 0x0d: this._light(); this.R[this.y] = 1; this._pins(); this.s = 1; break; // SETR
          case 0x0e: this.s = this.readK() !== 0 ? 1 : 0; break;                    // KNEZ
          case 0x0f:                                                                // RETN
            if (this.cl[0]) {
              this.pc = this.sr.shift(); this.sr.push(0);
              this.pa = this.pb = this.psr.shift(); this.psr.push(0);
              this.ca = this.cb = this.csr.shift(); this.csr.push(0);
              this.cl.shift(); this.cl.push(0);
            }
            this.s = 1; break;
        }
        break;
      case 0x1: this.pb = rev4(inst & 15); this.s = 1; break;                       // LDP
      case 0x2:
        if (inst >= 0x28) { this.x = rev3(inst & 7); this.s = 1; break; }           // LDX
        switch (inst) {
          case 0x20: this.y = this.a; this.s = 1; break;                            // TAY
          case 0x21: this.a = ram[mi]; this.s = 1; break;                           // TMA
          case 0x22: this.y = ram[mi]; this.s = 1; break;                           // TMY
          case 0x23: this.a = this.y; this.s = 1; break;                            // TYA
          case 0x25: ram[mi] = this.a; this.s = this.y === 15 ? 1 : 0; this.y = (this.y + 1) & 15; break; // TAMIYC
          case 0x26: ram[mi] = this.a; this.a = 0; this.s = 1; break;               // TAMZA
          case 0x27: ram[mi] = this.a; this.s = 1; break;                           // TAM
          default: throw new Error("undecoded opcode " + inst.toString(16));
        }
        break;
      case 0x3:
        if (inst < 0x34) { ram[mi] |= 1 << rev2(inst & 3); this.s = 1; }            // SBIT
        else if (inst < 0x38) { ram[mi] &= ~(1 << rev2(inst & 3)); this.s = 1; }    // RBIT
        else if (inst < 0x3c) this.s = (ram[mi] >> rev2(inst & 3)) & 1;             // TBIT
        else if (inst === 0x3c) { t = ram[mi]; this.s = this.a <= t ? 1 : 0; this.a = (t - this.a) & 15; } // SAMAN
        else if (inst === 0x3d) { this.s = this.a === 0 ? 1 : 0; this.a = (-this.a) & 15; }                // CPAIZ
        else if (inst === 0x3e) { t = ram[mi]; this.s = t === 15 ? 1 : 0; this.a = (t + 1) & 15; }         // IMAC
        else this.s = ram[mi] !== 0 ? 1 : 0;                                        // MNEZ
        break;
      case 0x4: this.y = rev4(inst & 15); this.s = 1; break;                        // TCY
      case 0x5: this.s = this.y !== rev4(inst & 15) ? 1 : 0; break;                 // YNEC
      case 0x6: ram[mi] = rev4(inst & 15); this.y = (this.y + 1) & 15; this.s = 1; break; // TCMIY
      case 0x7:
        if (inst === 0x7f) { this.a = 0; this.s = 1; }                              // CLA
        else { t = this.a + rev4(inst & 15) + 1; this.s = t > 15 ? 1 : 0; this.a = t & 15; } // ACxAC
        break;
    }
  }
}

function romFromBase64(b64) {
  if (typeof atob === "function") return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Uint8Array(Buffer.from(b64, "base64"));
}

if (typeof module !== "undefined") module.exports = { Microtronic, romFromBase64, KEYMAP, OPLA, LOGICAL };
