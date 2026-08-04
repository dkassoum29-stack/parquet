/* ═══════════════════════════════════════════════════════════
   PARQUET — panneaux illustrés du duel (module MANGA)
   Pas des milliers d'images dessinées une par une : une poignée
   de pièces réutilisables (trame, éclats, lignes de vitesse,
   texte d'impact) recombinées selon ce qui vient de se passer —
   même logique que la bibliothèque de scénarios, en visuel.
   Ce module ne touche jamais le DOM directement : il ne fait que
   fabriquer du balisage SVG, à insérer par app.js.
   ═══════════════════════════════════════════════════════════ */

const MANGA = {};

/* injecté une seule fois au démarrage (voir app.js) */
MANGA.DEFS_SVG = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
<pattern id="mg-halftone" width="7" height="7" patternUnits="userSpaceOnUse">
  <circle cx="1.4" cy="1.4" r="1.15" fill="currentColor"/>
</pattern>
<pattern id="mg-halftone-fine" width="4.5" height="4.5" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.7" fill="currentColor"/>
</pattern>
</defs>
</svg>`;

const TONE_COLOR = {
  good: "var(--gain)",
  bad: "var(--text-3)",
  turnover: "var(--loss)",
  clutch: "var(--grape)",
  signature: "var(--gold)",
};

const SFX = {
  shoot3: ["SWISH !", "BANG !", "CASH !"],
  shoot2: ["SWISH !", "PANIER !", "DEDANS !"],
  shootMiss: ["RATÉ…", "DEHORS !", "AH !"],
  driveGo: ["BOOM !", "AU CERCLE !", "EXPLOSION !"],
  driveBlocked: ["CONTRÉ !", "REJETÉ !"],
  driveMiss: ["RATÉ…", "RIEN À FAIRE"],
  passGo: ["ASSIST !", "PARFAIT !"],
  steal: ["INTERCEPTÉ !", "PERDU !"],
  turnover: ["PERDU…", "OH NON"],
  signature: ["IMPARABLE !", "SIGNATURE !", "PERSONNE N'Y PEUT RIEN !"],
};

function pickSfx(outcome, offChoice) {
  const f = outcome.flags || {};
  if (f.signature && outcome.success) return ENG.R.pick(SFX.signature);
  if (offChoice === "pass") {
    if (f.turnover) return ENG.R.pick(f.stolen === false ? SFX.turnover : SFX.steal);
    return ENG.R.pick(SFX.passGo);
  }
  if (offChoice === "shoot") {
    if (!outcome.success) return ENG.R.pick(SFX.shootMiss);
    return ENG.R.pick(outcome.points >= 3 ? SFX.shoot3 : SFX.shoot2);
  }
  /* drive */
  if (!outcome.success) return ENG.R.pick(f.blocked ? SFX.driveBlocked : SFX.driveMiss);
  return ENG.R.pick(SFX.driveGo);
}

function toneFor(outcome) {
  const f = outcome.flags || {};
  if (f.turnover || f.blocked) return "turnover";
  return outcome.success ? "good" : "bad";
}

/* quelques éclats en étoile, tirés au hasard pour ne pas se répéter
   à l'identique deux fois de suite */
function burst(cx, cy, spikes, r1, r2, color) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (Math.PI / spikes) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r2 : r1;
    pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}

function speedLines(x, y, len, count, color, angle) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const dy = i * 9 - (count * 9) / 2;
    s += `<line x1="${x}" y1="${y + dy}" x2="${x - len}" y2="${y + dy}" stroke="${color}"
           stroke-width="2.4" stroke-linecap="round" opacity="${0.75 - i * 0.08}"
           transform="rotate(${angle} ${x} ${y + dy})"/>`;
  }
  return s;
}

/* ═══════════════ composition d'un panneau ═══════════════
   outcome = ce que renvoie DUEL.resolveMoment ; ctx = { offChoice,
   framing, offName, defName, scoreA, scoreB } */
MANGA.compose = function (outcome, ctx) {
  const isSignature = !!(outcome.flags && outcome.flags.signature && outcome.success);
  const tone = isSignature ? "signature" : (ctx.framing === "clutch" && outcome.success ? "clutch" : toneFor(outcome));
  const color = TONE_COLOR[tone];
  const sfx = pickSfx(outcome, ctx.offChoice);
  const rot = ENG.R.f(-7, 7).toFixed(1);
  const dotsClass = (ctx.framing === "clutch" || isSignature) ? "mg-halftone-fine" : "mg-halftone";

  const wedge = `<polygon points="0,0 300,0 300,55 0,150" fill="${color}" opacity="${isSignature ? 0.2 : 0.12}"/>`;
  const dots = `<rect width="300" height="180" fill="url(#${dotsClass})" opacity="0.16" color="${color}"/>`;
  const frame = `<rect x="3" y="3" width="294" height="174" fill="none" stroke="${color}" stroke-width="${isSignature ? 4 : 3}" opacity="0.55"/>`;

  const lines = tone === "bad"
    ? ""
    : speedLines(280, 95, 70, isSignature ? 7 : 5, color, tone === "turnover" ? 18 : -14);

  const burstEl = tone !== "bad"
    ? burst(230, 60, isSignature ? 11 : 8, isSignature ? 14 : 10, isSignature ? 30 : 22, color)
    : "";

  const ballIcon = `<g transform="translate(52,${ctx.framing === "clutch" ? 100 : 118}) scale(1.15)" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round">
    <circle cx="0" cy="0" r="16"/>
    <path d="M0 -16v32M-16 0h32M-11.3 -11.3c5.1 5.1 5.1 17.5 0 22.6M11.3 -11.3c-5.1 5.1-5.1 17.5 0 22.6"/>
  </g>`;

  return `<svg class="manga-panel manga-${tone}" viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${sfx}">
    <rect width="300" height="180" fill="var(--bg-sunk)"/>
    ${wedge}${dots}
    ${lines}
    ${burstEl}
    ${ballIcon}
    <text class="mg-sfx" x="150" y="98" transform="rotate(${rot} 150 98)"
          text-anchor="middle" fill="${color}">${sfx}</text>
    ${frame}
  </svg>`;
};

/* panneau neutre affiché pendant le compte à rebours, avant résolution */
MANGA.composeSetup = function (ctx) {
  const dotsClass = ctx.framing === "clutch" ? "mg-halftone-fine" : "mg-halftone";
  const color = ctx.framing === "clutch" ? "var(--grape)" : "var(--leather)";
  return `<svg class="manga-panel manga-setup" viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ctx.label || "Moment en cours"}">
    <rect width="300" height="180" fill="var(--bg-sunk)"/>
    <rect width="300" height="180" fill="url(#${dotsClass})" opacity="0.13" color="${color}"/>
    <g transform="translate(150,90) scale(1.6)" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="0" r="16"/>
      <path d="M0 -16v32M-16 0h32M-11.3 -11.3c5.1 5.1 5.1 17.5 0 22.6M11.3 -11.3c-5.1 5.1-5.1 17.5 0 22.6"/>
    </g>
    <rect x="3" y="3" width="294" height="174" fill="none" stroke="${color}" stroke-width="2.4" opacity="0.4"/>
  </svg>`;
};
