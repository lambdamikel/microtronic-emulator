const P = MICROTRONIC_PROGRAMS.find(p => p.name === 'PRIMES-ENUM'); let a = 0; for (const l of P.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (/^[0-9A-F]{3}$/.test(t)) m.writeWord(a++, parseInt(t, 16)); }
m.reset(false); m.run(30000); keys('HALT NEXT 0 0 RUN'); const seen = []; let last = ''; const c0 = m.cycles;
while (seen.length < 16 && m.cycles - c0 < 83333 * 400) { m.run(20000); const s = disp(4000).s.split('').reverse().join('').trim(); if (s !== last && /^\d{3}$/.test(s)) { seen.push(+s + '@' + ((m.cycles - c0) / 83333).toFixed(0) + 's'); last = s; } }
console.log(seen.join('  '));
