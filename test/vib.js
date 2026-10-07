function startP(name){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); }
function notes(sec){ const o = []; let last = -1; for (let i = 0; i < sec * 200; i++) { m.run(417); const v = m.outputPins; if (v !== last) { o.push(v.toString(16)); last = v; } } return o.join(' '); }
startP('MUSICBOX'); console.log('MUSICBOX first 25 s:', notes(25));
startP('ORGAN-LONG'); m.run(40000); press('9'); console.log('ORGAN key 9 -> outputs', m.outputPins, 'inputs', m.inputPins);
startP('COMPOSER'); m.run(40000); press('5'); console.log('COMPOSER:', notes(8));
startP('LUNAR-SOUND'); m.run(83333 * 2); const d0 = disp(20000).s.split('').reverse().join(''); for (let i = 0; i < 40; i++) { press('0'); m.run(30000); } console.log('LUNAR-SOUND start [' + d0 + '] after free fall:', notes(6).slice(0, 120));
