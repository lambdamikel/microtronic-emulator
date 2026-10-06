// worked examples from the manuals
function start(name){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); m.run(100000); }
const rd = () => disp(20000).s.split('').reverse().join('');
start('SINUS'); keys('2 0'); m.run(83333*40); console.log('SINUS  sin 20 deg ->', rd(), '(manual: 3415)');
keys('0'); m.run(50000); keys('0 5'); m.run(83333*40); console.log('SINUS  sin 05 deg ->', rd(), '(manual: 0870)');
start('DAYS'); keys('1 9 8 1 0 3 A'); m.run(83333*20); keys('0 5'); m.run(83333*5); keys('1 9 8 5 1 2 A'); m.run(83333*20); keys('2 4'); m.run(83333*120); console.log('DAYS   5.3.1981 -> 24.12.1985:', rd(), '(manual: 1755)');
start('POWERS'); keys('2 A 8'); m.run(83333*30); console.log('POWERS 2^8 ->', rd());
