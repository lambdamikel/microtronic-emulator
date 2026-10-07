#!/bin/bash
# Stamp the css/js links in index.html with a version, so browsers do not mix a new page with old cached files.
# Run before each commit that changes css/ or js/.
v=$(date +%Y%m%d%H%M)
sed -i -E "s#(href=\"css/microtronic\.css)(\?v=[0-9]+)?\"#\1?v=$v\"#; s#(src=\"js/(rom|programs|tms1600|ui)\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#" index.html
grep -c "?v=$v" index.html
