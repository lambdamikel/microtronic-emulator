// output -> input patch cable: DOT a value, read it back with DIN
m.run(30000); m.patches = [[3, 3], [0, 1]];
load('180 FE0 FD1 110 FE0 FD2 F00'); keys('HALT NEXT 0 0 RUN'); m.run(200000);
console.log('DOT 8 -> DIN:', m.vmReg(1).toString(16), '(expect 8)   DOT 1 -> DIN:', m.vmReg(2).toString(16), '(expect 2)');
