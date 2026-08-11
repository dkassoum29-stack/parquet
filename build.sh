#!/bin/bash
# Regénère bundle.js (minifié) à partir des sources JS, dans l'ordre de
# dépendance exact, et parquet.min.css à partir de parquet.css.
# À relancer après toute modification d'un fichier .js source OU de
# parquet.css — index.html charge bundle.js et parquet.min.css, jamais
# les fichiers sources directement.
set -e
cd "$(dirname "$0")"

FILES="profile.js data.js engine.js meta.js cast.js scenarios.js duel.js manga.js app.js"
BIN="./node_modules/.bin"

TMP=$(mktemp)
{
  echo "/* ═══════════════════════════════════════════════════════════"
  echo "   PARQUET — bundle généré par build.sh, ne pas éditer à la main."
  echo "   Sources, dans l'ordre : $FILES"
  echo "   ═══════════════════════════════════════════════════════════ */"
  for f in $FILES; do
    echo ""
    echo "/* ── $f ── */"
    cat "$f"
  done
} > "$TMP"

"$BIN/terser" "$TMP" --compress --mangle -o bundle.js
rm "$TMP"
"$BIN/csso" parquet.css -o parquet.min.css

echo "bundle.js régénéré ($(wc -c < bundle.js | tr -d ' ') octets, minifié) à partir de : $FILES"
echo "parquet.min.css régénéré ($(wc -c < parquet.min.css | tr -d ' ') octets, minifié) à partir de parquet.css"
