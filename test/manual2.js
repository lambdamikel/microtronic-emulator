function start(name){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); m.run(100000); }
const rd = () => disp(20000).s.split('').reverse().join('');
const slow = s => { for (const k of s.split(' ')) { m.keyDown(k); m.run(12000); m.keyUp(k); m.run(60000); } };
start('DAYS'); console.log('start', rd()); slow('1 9 8 1 0 3'); console.log('entered', rd()); slow('A'); m.run(83333*60); console.log('after A', rd());
slow('0 5'); m.run(83333*10); console.log('after day', rd()); slow('1 9 8 5 1 2'); console.log('entered', rd()); slow('A'); m.run(83333*60); console.log('after A', rd()); slow('2 4'); m.run(83333*240); console.log('DAYS result', rd(), '(manual: 1755)');
