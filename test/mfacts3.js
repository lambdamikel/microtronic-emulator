const rd = () => disp(20000).s.split('').reverse().join('');
const D = t => console.log(t.padEnd(26), '[' + rd() + '] pc', m.vmPC.toString(16), 'work', regs().slice(0, 6), 'words', [0,1,2,3].map(a => m.readWord(a).toString(16)).join(' '));
function fresh(){ m.reset(true); for (let i = 0; i < 256; i++) m.writeWord(i, 0); m.run(30000); load('110 121 132 F00'); }
fresh(); keys('HALT NEXT 0 2'); D('at 02'); keys('5'); D('5'); keys('6'); D('6'); keys('CCE'); D('C/CE'); keys('CCE'); D('C/CE'); keys('7 8 9'); D('789'); keys('CCE'); D('C/CE'); keys('NEXT'); D('NEXT'); keys('NEXT'); D('NEXT');
fresh(); keys('HALT NEXT 0 0 RUN'); m.run(100000); D('ran'); keys('REG'); D('REG'); keys('1'); D('1'); keys('REG'); D('REG'); keys('2'); D('2'); keys('9'); D('9'); keys('REG'); D('REG'); keys('1'); D('1'); keys('NEXT'); D('NEXT'); keys('NEXT'); D('NEXT');
fresh(); keys('HALT NEXT 0 0 RUN'); m.run(100000); keys('REG F'); D('REG F'); keys('NEXT'); D('NEXT'); keys('HALT'); D('HALT'); keys('NEXT'); D('NEXT'); keys('0'); D('0'); keys('3'); D('3');
