#!/bin/bash
set -eo pipefail
phase=$1
for route in home hv; do
 path=/; [ "$route" = hv ] && path=/hausverwaltung/
 for mode in mobile desktop; do
  extra=(); [ "$mode" = desktop ] && extra=(--preset=desktop)
  CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node audit/tools/node_modules/lighthouse/cli/index.js "http://127.0.0.1:8765$path" --chrome-flags='--headless --no-sandbox' --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path="audit/$phase/$route-$mode" "${extra[@]}" --quiet
 done
done
