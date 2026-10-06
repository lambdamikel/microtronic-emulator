const m = new Microtronic(romFromBase64(MICROTRONIC_ROM_B64));
const GL = {0x3f:'0',0x06:'1',0x5b:'2',0x4f:'3',0x66:'4',0x6d:'5',0x7d:'6',0x07:'7',0x7f:'8',0x6f:'9',0x77:'A',0xfc:'b',0x39:'C',0x5e:'d',0x79:'E',0x71:'F',0:' '};
function disp(n){ m.collectLight(); m.run(n||20000); const l=m.collectLight(); let s='';
  for(let d=0;d<6;d++){ let p=0; for(let b=0;b<8;b++) if(l.seg[d*8+b]>0.005) p|=1<<b; s+=(GL[p]||('?'+p.toString(16))); }
  return {s, led:l.led}; }
function show(tag){ const r=disp(); console.log(tag.padEnd(14), 'R0..R5: ['+r.s+']', 'leds', r.led.map(v=>v.toFixed(2)).join(' ')); }
function press(k){ m.keyDown(k); m.run(12000); m.keyUp(k); m.run(12000); }
function nz(){ const u=[]; for(let i=0;i<1024;i++) if(m.sram[i]) u.push(i.toString(16)+'='+m.sram[i].toString(16)); return u.length+': '+u.slice(0,24).join(' '); }
function load(txt, at){ let a=at||0; for(const w of txt.trim().split(/\s+/)){ const v=parseInt(w,16); m.sram[a]=(~(v>>8))&15; m.sram[0x200+a]=(~(v>>4))&15; m.sram[0x100+a]=(~v)&15; a++; } }
function keys(s){ for(const k of s.split(' ')) press(k); }
function regs(){ return Array.from(m.ram.slice(112,128)).map(v=>v.toString(16)).join(''); }
