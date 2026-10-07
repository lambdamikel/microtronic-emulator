addEventListener('load', () => { const m = window.microtronic; const seq = ['h','n','0','0','r']; let i = 0;
  m.writeWord(0, 0x1A5); m.writeWord(1, 0xF15); m.writeWord(2, 0xC02);      // MOVI A,5 ; DISP 1,5 ; loop
  const tick = () => { if (i >= seq.length) { setTimeout(() => { document.title = 'running=' + m.vmRunning + ' reg5=' + m.vmReg(5).toString(16); }, 1500); return; }
    dispatchEvent(new KeyboardEvent('keydown', { key: seq[i] })); setTimeout(() => { dispatchEvent(new KeyboardEvent('keyup', { key: seq[i++] })); setTimeout(tick, 250); }, 150); };
  setTimeout(tick, 800); });
