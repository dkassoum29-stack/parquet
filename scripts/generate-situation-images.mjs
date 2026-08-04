#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   Génère une image manga/comic par situation de DUEL.LIB (duel.js),
   via l'API Pollinations.ai. Ne tourne jamais dans le site lui-même —
   script local, lu la clé dans scripts/.env (jamais commité).

   Usage :
     node scripts/generate-situation-images.mjs
   ═══════════════════════════════════════════════════════════ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv(path.join(__dirname, ".env"));
const KEY = env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_API_KEY;
if (!KEY) {
  console.error("Clé manquante : crée scripts/.env avec POLLINATIONS_API_KEY=sk_...");
  process.exit(1);
}

/* Style commun à toutes les images, pour rester cohérent visuellement
   avec l'identité du site (voir parquet.css : cuir orange, raisin). */
const STYLE = "manga comic ink illustration, dynamic basketball action, dramatic speed lines, "
  + "high contrast black and white with a bold orange accent color, comic panel, no text, no logo, no watermark";

/* Un prompt par situation de duel.js (DUEL.LIB) — à tenir synchronisé
   si de nouvelles situations sont ajoutées. */
const SITUATIONS = [
  { id: "iso_top", prompt: `Point guard isolation move at the top of the key, defender guarding closely, ${STYLE}` },
  { id: "post_up", prompt: `Low post battle, back to the basket, defender pressing from behind, ${STYLE}` },
  { id: "fastbreak", prompt: `Fast break sprint toward the basket, a lone defender trailing, ${STYLE}` },
  { id: "pick_and_roll", prompt: `Pick and roll play, a screen being set, defenders navigating around it, ${STYLE}` },
  { id: "corner_three", prompt: `Corner three-point shot, defender closing out desperately, ${STYLE}` },
  { id: "clutch_iso", prompt: `Clutch endgame isolation, the clock winding down, intense dramatic lighting, purple accent glow, ${STYLE}` },
  { id: "steal_and_go", prompt: `Defensive steal intercepting a pass, exploding into a breakaway, ${STYLE}` },
  { id: "block_and_run", prompt: `Powerful shot block followed by grabbing the ball for a fast break, ${STYLE}` },
  { id: "pg_dime", prompt: `Point guard creating a play under a buzzer-beating shot clock, teammates spacing the floor, ${STYLE}` },
  { id: "sg_catch_shoot", prompt: `Shooting guard catch-and-shoot off a screen, ball mid-air toward the hoop, ${STYLE}` },
  { id: "sf_two_way", prompt: `Versatile small forward attacking off the wing, defender scrambling, ${STYLE}` },
  { id: "pf_stretch", prompt: `Stretch power forward shooting from beyond the arc, spacing the floor, ${STYLE}` },
  { id: "c_paint_duel", prompt: `Center battling for post position under the basket, powerful presence, ${STYLE}` },
];

const OUT_DIR = path.join(ROOT, "assets", "situations");
fs.mkdirSync(OUT_DIR, { recursive: true });

function hashSeed(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 1000000;
}

async function generateOne(sit) {
  const outPath = path.join(OUT_DIR, `${sit.id}.jpg`);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sit.prompt)}`
    + `?width=900&height=540&nologo=true&model=flux&seed=${hashSeed(sit.id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`réponse suspecte (${buf.length} octets)`);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

(async () => {
  let ok = 0, fail = 0;
  for (const sit of SITUATIONS) {
    process.stdout.write(`Génération ${sit.id}… `);
    try {
      const p = await generateOne(sit);
      console.log("ok → " + path.relative(ROOT, p));
      ok++;
    } catch (e) {
      console.log("ÉCHEC : " + e.message);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 1200)); /* éviter le rate limit */
  }
  console.log(`\nTerminé : ${ok} image(s) générée(s), ${fail} échec(s). Dossier : assets/situations/`);
})();
