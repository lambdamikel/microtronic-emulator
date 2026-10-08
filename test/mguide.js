function startP(name){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); m.clockInput = (p.setup && p.setup.clock !== undefined) ? p.setup.clock : -1; for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); }
const rd = () => disp(8000).s.split('').reverse().join('').trim();
const seq = (sec, per) => { const o = []; let last = null; for (let i = 0; i < sec * (per || 10); i++) { m.run(83333 / (per || 10)); const s = rd() + '/' + m.outputPins.toString(16); if (s !== last) { o.push(s); last = s; } } return o.slice(0, 22).join(' '); };
startP('G-FIRST'); m.run(60000); console.log('FIRST  ', rd(), m.vmRunning ? 'running' : 'halted');
startP('G-COUNT'); console.log('COUNT  ', seq(6));
startP('G-DECIMAL'); console.log('DECIMAL', seq(14));
startP('G-KEYS'); m.run(40000); press('A'); m.run(40000); console.log('KEYS    after A:', rd(), 'outputs', m.outputPins.toString(16));
startP('G-ADD'); m.run(60000); press('9'); m.run(40000); press('8'); m.run(400000); console.log('ADD     9 + 8 ->', rd()); press('F'); m.run(40000); press('F'); m.run(500000); console.log('        F + F ->', rd());
startP('G-INOUT'); m.run(40000); m.din = 5; m.run(60000); console.log('INOUT   inputs 5 -> outputs', m.outputPins, 'display', rd()); m.din = 0;
startP('G-DICE'); const r = []; for (let i = 0; i < 12; i++) { m.run(20000 + i * 7919); press('1'); m.run(60000); r.push(rd()); } console.log('DICE   ', r.join(' '));
startP('G-MULT'); m.run(500000); console.log('MULT   ', rd(), m.vmRunning ? 'running' : 'halted');
startP('G-CLOCK'); m.run(83333 * 3.5); const a = rd(); m.run(83333 * 60); console.log('CLOCK  ', a, '-> a minute later', rd());
startP('G-TONES'); console.log('TONES  ', seq(8));
