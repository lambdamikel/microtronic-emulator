#!/bin/bash
# run a test script in headless Chrome: test/run.sh test/foo.js
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp --suffix=.html -p "$here/test")
cat > "$t" <<H
<!doctype html><meta charset=utf-8><pre id=out></pre>
<script>const __o=[];console.log=(...a)=>__o.push(a.join(' '));window.onerror=(m,s,l)=>{__o.push('ERROR '+m+' @'+l);document.getElementById('out').textContent=__o.join('\n')}</script>
<script src="../js/rom.js"></script><script src="../js/tms1600.js"></script><script src="../js/programs.js"></script>
$(for f in "$@"; do echo "<script src=\"$here/$f\"></script>"; done)
<script>document.getElementById('out').textContent=__o.join('\n')</script>
H
google-chrome --headless --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=60000 --dump-dom "file://$t" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<pre id="out">//; s/<\/pre>.*//' | sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g'
rm -f "$t"
