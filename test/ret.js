m.run(30000); load('F01 F01 B25 110 C04'); m.writeWord(0x25, 0xF01); m.writeWord(0x26, 0xF07);
keys('HALT NEXT 0 0 RUN'); m.run(300000); console.log('stored', ((m.ram[30] << 4) | m.ram[29]).toString(16), 'after RET: pc', m.vmPC.toString(16), 'reg0', m.vmReg(0));
