// mirror of the UI "Load & run" flow, then read primes off the display
const P = MICROTRONIC_PROGRAMS.find(p => p.name === 'PRIMES-ENUM');
let a = 0; for (const l of P.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (/^[0-9A-F]{3}$/.test(t)) m.writeWord(a++, parseInt(t, 16)); }
m.reset(false); m.run(30000);
for (const k of ['HALT','NEXT','0','0','RUN']) { m.keyDown(k); m.run(8000); m.keyUp(k); m.run(8000); }
console.log('running', m.vmRunning, 'pc', m.vmPC.toString(16));
const seen = []; let lastS = '';
for (let i = 0; i < 4000 && seen.length < 30; i++) { const s = disp(20000).s.split('').reverse().join(''); if (s !== lastS && /^   \d\d\d$/.test(s)) { seen.push(+s); } lastS = s; }
console.log('displayed:', seen.join(' '));
