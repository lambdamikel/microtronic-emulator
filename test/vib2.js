function startP(name){ const p = MICROTRONIC_PROGRAMS.find(p => p.name === name); let a = 0; m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0);
  for (const l of p.text.split('\n')) { const t = l.replace(/#.*/, '').trim(); if (!t) continue; const o = t.match(/^@\s*([0-9A-F]{1,2})$/); if (o) { a = parseInt(o[1], 16); continue; } m.writeWord(a++, parseInt(t, 16)); }
  m.run(30000); keys('HALT NEXT 0 0 RUN'); }
const rd = () => disp(20000).s.split('').reverse().join('');
function notes(sec){ const o = []; let last = -1; for (let i = 0; i < sec * 200; i++) { m.run(417); const v = m.outputPins; if (v !== last) { o.push(v.toString(16)); last = v; } } return o.join(' '); }
function play(label, burn){ startP('LUNAR-SOUND'); m.run(83333); const log = []; let ended = false;
  for (let t = 0; t < 40 && !ended; t++) { const st = [];
    for (const k of ['0', '0', '0', ...burn(t), 'A']) { st.push(rd().trim()); if (m.vmPC >= 0x58 && !(m.vmPC >= 0x0f && m.vmPC <= 0x28)) { ended = true; break; } press(k); m.run(40000); }
    log.push(st.slice(0, 3).join('/')); m.run(200000); if (m.vmPC >= 0x56) ended = true; }
  console.log(label, '| rounds', log.length, ':', log.slice(0, 3).join('  '), '...', log.slice(-2).join('  '), '| pc', m.vmPC.toString(16), '| tones:', notes(6).slice(0, 100)); }
play('free fall', () => ['0', '0']);
play('max burn ', () => ['9', '9']);
play('hover 10 ', () => ['1', '0']);
play('pilot    ', t => t < 6 ? ['0', '0'] : ['1', '5']);
