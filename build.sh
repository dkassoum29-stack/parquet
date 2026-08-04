#!/bin/bash
# Regénère bundle.js à partir des sources, dans l'ordre de dépendance exact.
# À relancer après toute modification d'un des fichiers listés ci-dessous —
# bundle.js est ce que le site déployé charge réellement, pas les fichiers
# sources pris individuellement.
set -e
cd "$(dirname "$0")"

FILES="profile.js data.js engine.js meta.js cast.js scenarios.js duel.js manga.js app.js"

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
} > bundle.js

echo "bundle.js régénéré ($(wc -c < bundle.js | tr -d ' ') octets) à partir de : $FILES"
