const rd = n => disp(n||20000).s.split('').reverse().join('');
const clk = () => Array.from(m.ram.slice(64,70)).reverse().join('');
m.run(30000); m.clockInput = 3;
m.run(83333*3); console.log('idle 3 s, file-4 clock', clk());
keys('PGM 3 1 2 3 4'); console.log('set   ['+rd()+']', clk()); m.run(83333*3); console.log('3 s  ['+rd()+']', clk());
for (const k of ['HALT','NEXT','CCE','RUN']) { const s=m.ram.slice(); }
keys('HALT'); console.log('HALT ['+rd()+']', clk()); m.run(83333*3); console.log('3 s  ['+rd()+']', clk());
keys('PGM 4'); console.log('PGM4 ['+rd()+']', clk()); m.run(83333*3); console.log('3 s  ['+rd()+']', clk());
// TIME opcode
load('F06 F6A C00'); keys('HALT NEXT 0 0 RUN'); m.run(83333); console.log('F06 TIME + DISP 6,A ['+rd()+']');
