m.run(30000);
load('F01 C04 50D 011 F01 110 C07 022 F00');
let log=[]; m.onFetch=a=>log.push(a.toString(16)+(m.vmRunning?'r':'h'));
keys('HALT NEXT 0 0'); console.log('halted idle fetches (per 20000 cycles):', (log=[], m.run(20000), log.length), log.slice(0,6).join(' '));
log=[]; keys('RUN'); m.run(60000); console.log('RUN:', log.join(' '));
log=[]; keys('HALT NEXT 0 0'); log=[]; keys('STEP'); console.log('STEP:', log.join(' ')); log=[]; keys('STEP'); console.log('STEP:', log.join(' '));
