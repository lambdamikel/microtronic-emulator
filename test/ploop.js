const P = MICROTRONIC_PROGRAMS.find(p => p.name === 'PRIMES-LOOP'); let a = 0; for (const l of P.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (/^[0-9A-F]{3}$/.test(t)) m.writeWord(a++, parseInt(t, 16)); }
function go(key){ m.reset(true); a = 0; for (const l of P.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (/^[0-9A-F]{3}$/.test(t)) m.writeWord(a++, parseInt(t, 16)); } m.run(30000); keys('HALT NEXT 0 0 RUN'); m.run(60000); press(key); }
const rd = () => disp(4000).s.split('').reverse().join('').trim();
go('1'); let seen = [], last = '', c0 = m.cycles, leds = new Set();
while (seen.length < 14 && m.cycles - c0 < 83333 * 300) { m.run(8000); leds.add(m.outputPins); const s = rd(); if (s !== last && s !== '') { seen.push(s + '@' + ((m.cycles - c0) / 83333).toFixed(0) + 's'); last = s; } }
console.log('pause 1:', seen.join('  '), '| LED values seen:', [...leds].length);
// full run at pause 0: every distinct display value until it wraps
go('0'); const all = [], odd = []; last = ''; c0 = m.cycles; let wrapped = false;
while (m.cycles - c0 < 83333 * 3600 * 3) { m.run(6000); const s = rd(); if (!/^\d{3}$/.test(s)) { if (s !== '') odd.push(s); continue; } if (s !== last) { if (s === '002' && all.length > 5) { wrapped = true; break; } all.push(+s); last = s; } }
const isP = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const want = []; for (let n = 2; n < 1000; n++) if (isP(n)) want.push(n);
console.log('pause 0: shown', all.length, 'values; primes below 1000:', want.length, '| identical:', JSON.stringify(all) === JSON.stringify(want), '| wrapped to 2:', wrapped, '| took', ((m.cycles - c0) / 83333 / 60).toFixed(0), 'min of machine time', '| garbled readings:', odd.length);
if (JSON.stringify(all) !== JSON.stringify(want)) console.log('first shown', all.slice(0, 20).join(' '), '... non-primes:', all.filter(n => !isP(n)).slice(0, 10).join(' '), 'missing:', want.filter(n => !all.includes(n)).slice(0, 10).join(' '));
