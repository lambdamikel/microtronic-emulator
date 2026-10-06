// drive the page: select the clock cable to input 4, then set and show the time
addEventListener('load', () => {
  const sel = document.getElementById('clkcable'); sel.value = '3'; sel.dispatchEvent(new Event('change'));
  const m = window.microtronic;
  document.title = 'clockInput=' + m.clockInput + ' wire=' + document.getElementById('wireC').getAttribute('d');
});
