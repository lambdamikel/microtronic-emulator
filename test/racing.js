function startP(name, clock){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); m.clockInput = clock; for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); const o = new Set(); for (let i = 0; i < 60; i++) { m.run(83333 / 4); o.add(m.outputPins); } return [...o].join(','); }
console.log('RACING without clock cable: output values seen in 15 s:', startP('RACING', -1)); console.log('RACING with clock on input 4:            ', startP('RACING', 3));
