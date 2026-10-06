// every library program must parse to clean 3-digit hex words and start running on the ROM
for (const p of MICROTRONIC_PROGRAMS) {
  let a = 0, n = 0, bad = 0;
  m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue;
    const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; }
    if (/^[0-9A-F]{3}$/.test(t)) { m.writeWord(a++, parseInt(t, 16)); n++; } else bad++; }
  m.run(30000); for (const k of ['HALT','NEXT','0','0','RUN']) { m.keyDown(k); m.run(8000); m.keyUp(k); m.run(8000); }
  m.run(200000);
  console.log(p.name.padEnd(12), String(n).padStart(3), 'words', bad ? bad + ' UNPARSED' : 'clean', '| display [' + disp(20000).s.split('').reverse().join('') + ']', m.vmRunning ? 'running' : 'halted', 'pc', m.vmPC.toString(16));
}
