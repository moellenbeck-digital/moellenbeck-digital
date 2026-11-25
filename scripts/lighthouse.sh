#!/bin/bash
set -eo pipefail
out=$1
mkdir -p "$out"
for route in home hv privacy; do
 path=/
 [ "$route" != hv ] || path=/hausverwaltung/
 [ "$route" != privacy ] || path=/datenschutz.html
 for mode in mobile desktop; do
 extra=(); [ "$mode" != desktop ] || extra=(--preset=desktop)
 CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node audit/tools/node_modules/lighthouse/cli/index.js "${BASE_URL:-http://127.0.0.1:8876}$path" --chrome-flags='--headless --no-sandbox' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$out/$route-$mode.json" "${extra[@]}" --quiet
 done
done
