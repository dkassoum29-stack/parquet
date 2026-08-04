/* ═══════════════════════════════════════════════════════════
   PARQUET — moteur de simulation
   ═══════════════════════════════════════════════════════════ */

const ENG = {};

/* ─────────── aléatoire ─────────── */

const R = {
  f: (a, b) => Math.random() * (b - a) + a,
  i: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  gauss(mu, sd) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;

ENG.R = R;
ENG.clamp = clamp;

/* ─────────── formatage ─────────── */

ENG.money = function (n) {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " M$";
  if (a >= 1e3) return Math.round(n / 1e3) + " k$";
  return Math.round(n) + " $";
};

ENG.pct = function (v) {
  return (v * 100).toFixed(1).replace(".", ",") + " %";
};

ENG.pct3 = function (v) {
  return "," + Math.round(v * 1000).toString().padStart(3, "0");
};

/* ═══════════════ JOUEUR ═══════════════ */

ENG.newPlayer = function (cfg) {
  const origin = DATA.ORIGINS.find((o) => o.id === cfg.origin);
  const ment = DATA.MENTALITIES.find((m) => m.id === cfg.mentality);
  const ent = DATA.ENTOURAGES.find((e) => e.id === cfg.entourage);
  const nat = DATA.NATIONS.find((n) => n.id === cfg.nation);

  /* socle d'attributs : bruit léger autour de 50 */
  const attrs = {};
  DATA.ATTRS.forEach((a) => { attrs[a.id] = clamp(Math.round(R.gauss(50, 5)), 36, 64); });

  /* le poste oriente le socle */
  const pw = DATA.POS_WEIGHTS[cfg.position];
  DATA.ATTRS.forEach((a) => {
    const w = pw[a.id] || 1;
    attrs[a.id] = clamp(Math.round(attrs[a.id] + (w - 1.5) * 3.4), 30, 70);
  });

  /* la culture basket du pays, puis l'origine, puis la mentalité —
     on ignore toute clé qui ne correspond à aucun attribut réel :
     une entrée mal orthographiée dans data.js ne doit jamais
     produire un NaN silencieux dans les attributs du joueur. */
  [nat.mods, origin.mods, ment.mods].forEach((mods) => {
    if (!mods) return;
    for (const k in mods) { if (k in attrs) attrs[k] = clamp(attrs[k] + mods[k], 25, 78); }
  });

  /* le gabarit influence le corps */
  const pos = DATA.POSITIONS.find((p) => p.id === cfg.position);
  const hMid = (pos.hMin + pos.hMax) / 2;
  const dh = cfg.height - hMid;
  attrs.rebounding = clamp(Math.round(attrs.rebounding + dh * 0.55), 25, 82);
  attrs.interiorD = clamp(Math.round(attrs.interiorD + dh * 0.45), 25, 82);
  attrs.block = clamp(Math.round(attrs.block + dh * 0.5), 25, 82);
  attrs.handle = clamp(Math.round(attrs.handle - dh * 0.42), 25, 82);
  attrs.athleticism = clamp(Math.round(attrs.athleticism - dh * 0.16), 25, 82);
  const wing = cfg.wingspan - cfg.height;
  attrs.perimeterD = clamp(Math.round(attrs.perimeterD + wing * 0.3), 25, 82);
  attrs.steal = clamp(Math.round(attrs.steal + wing * 0.25), 25, 82);

  const p = {
    first: cfg.first,
    last: cfg.last,
    nation: cfg.nation,
    flag: nat.flag,
    position: cfg.position,
    height: cfg.height,
    wingspan: cfg.wingspan,
    number: cfg.number,
    origin: cfg.origin,
    mentality: cfg.mentality,
    entourage: cfg.entourage,

    age: 16,
    attrs,
    potential: R.i(origin.pot[0], origin.pot[1]),
    growth: (ment.growth || 1) * (ent.growth || 1),

    form: 72,
    morale: 70,
    health: 100,

    rep: origin.rep + (ment.rep || 0) + (ent.rep || 0),
    fame: 8,
    followers: R.i(300, 4000),
    trust: 50,          /* confiance du staff */

    money: 0,
    salary: 0,
    contract: null,
    shoe: DATA.SHOES[0],
    shoeUntil: 0,

    team: null,
    college: null,
    draft: null,

    injury: null,
    injuryHistory: [],

    badges: {},
    trophies: [],
    seasons: [],
    rings: 0,

    career: {
      gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
      seasons: 0, bestPpg: 0, full82: 0, tripleSeasons: 0,
      teamsPlayed: 0, yearsSameTeam: 0, playoffApps: 0,
      allNba: 0, allStar: 0, mvp: 0, dpoy: 0, fmvp: 0,
    },
  };

  return p;
};

ENG.name = (p) => (p.first + " " + (p.last || "")).trim();

ENG.ovr = function (p) {
  const w = DATA.POS_WEIGHTS[p.position];
  let s = 0, t = 0;
  for (const k in w) { s += (p.attrs[k] || 50) * w[k]; t += w[k]; }
  return clamp(Math.round(s / t), 20, 99);
};

/* composites */
ENG.offRating = function (p) {
  const a = p.attrs;
  return (a.finishing * 1.5 + a.midrange * 1.1 + a.three * 1.5 + a.handle * 1.1 +
          a.passing * 0.9 + a.iq * 0.9 + a.athleticism * 1.0) / 8.0;
};

ENG.shootComposite = function (p) {
  const a = p.attrs;
  return a.three * 0.38 + a.finishing * 0.30 + a.midrange * 0.20 + a.freeThrow * 0.12;
};

ENG.defRating = function (p) {
  const a = p.attrs;
  return (a.perimeterD * 1.3 + a.interiorD * 1.1 + a.steal * 0.8 + a.block * 0.9 +
          a.rebounding * 0.9 + a.iq * 0.7 + a.athleticism * 0.6) / 6.3;
};

/* ═══════════════ LIGUE VIVANTE ═══════════════ */

const NPC_STYLES = [
  { id: "scorer", ppg: 1.16, rpg: 0.78, apg: 0.72 },
  { id: "allrd",  ppg: 1.00, rpg: 1.00, apg: 1.00 },
  { id: "playmk", ppg: 0.86, rpg: 0.80, apg: 1.55 },
  { id: "big",    ppg: 0.88, rpg: 1.30, apg: 0.62 },
  { id: "3andD",  ppg: 0.80, rpg: 0.92, apg: 0.70 },
];

const POS_REB = { PG: 0.42, SG: 0.50, SF: 0.68, PF: 0.90, C: 1.00 };
const POS_AST = { PG: 1.00, SG: 0.62, SF: 0.55, PF: 0.42, C: 0.40 };
const POS_BLK = { PG: 0.22, SG: 0.30, SF: 0.55, PF: 0.85, C: 1.00 };
const POS_FG  = { PG: -0.012, SG: -0.008, SF: 0.006, PF: 0.032, C: 0.062 };

function npcName(used) {
  for (let k = 0; k < 60; k++) {
    const n = R.pick(DATA.NAMES.first) + " " + R.pick(DATA.NAMES.last);
    if (!used.has(n)) { used.add(n); return n; }
  }
  return R.pick(DATA.NAMES.first) + " " + R.pick(DATA.NAMES.last) + " Jr.";
}

function makeNpc(L, ovr, age, teamId) {
  const pos = R.pick(["PG", "SG", "SF", "PF", "C"]);
  let style;
  if (pos === "C" || pos === "PF") style = R.chance(0.7) ? NPC_STYLES[3] : NPC_STYLES[1];
  else if (pos === "PG") style = R.chance(0.6) ? NPC_STYLES[2] : NPC_STYLES[0];
  else style = R.pick([NPC_STYLES[0], NPC_STYLES[0], NPC_STYLES[1], NPC_STYLES[4]]);

  return {
    id: "n" + (L.nextId++),
    name: npcName(L.usedNames),
    pos, style: style.id,
    ovr, age,
    peak: R.i(26, 30),
    ceiling: clamp(Math.round(ovr + R.i(2, 14) - Math.max(0, age - 22) * 1.5), ovr, 99),
    team: teamId,
    rookie: false,
    stats: null,
    accolades: { mvp: 0, allNba: 0, allStar: 0, rings: 0 },
  };
}

ENG.newLeague = function () {
  const L = {
    year: 0,
    cap: 154647000,
    nextId: 1,
    usedNames: new Set(),
    teams: {},
    npcs: [],
    history: [],
    champion: null,
  };

  DATA.TEAMS.forEach((t) => {
    L.teams[t.id] = {
      id: t.id,
      cast: clamp(Math.round(R.gauss(38 + t.prestige * 0.16, 7)), 24, 68),
      wins: 41, losses: 41,
      streakTitles: 0,
    };
  });

  /* trois joueurs notables par franchise */
  DATA.TEAMS.forEach((t) => {
    const tier = t.prestige;
    const lead = clamp(Math.round(R.gauss(64 + tier * 0.24, 5)), 58, 96);
    L.npcs.push(makeNpc(L, lead, R.i(23, 32), t.id));
    L.npcs.push(makeNpc(L, clamp(lead - R.i(3, 11), 52, 92), R.i(21, 33), t.id));
    L.npcs.push(makeNpc(L, clamp(lead - R.i(8, 19), 48, 86), R.i(20, 34), t.id));
  });

  return L;
};

/* courbe d'âge partagée */
function ageDelta(age, peak) {
  if (age < peak - 4) return R.f(1.8, 4.2);
  if (age < peak) return R.f(0.6, 2.4);
  if (age <= peak + 2) return R.f(-0.4, 1.0);
  if (age <= 32) return R.f(-2.0, -0.2);
  if (age <= 35) return R.f(-3.6, -1.2);
  return R.f(-5.5, -2.4);
}

/* stats d'un PNJ pour la saison */
function npcSeason(n) {
  const st = NPC_STYLES.find((s) => s.id === n.style) || NPC_STYLES[1];
  const base = Math.pow(clamp(n.ovr - 42, 0, 57) / 57, 1.35);
  const mpg = clamp(12 + base * 25 + R.f(-2, 2), 9, 37);

  /* les superstars portent une charge offensive que l'OVR seul ne traduit pas */
  const star = n.ovr >= 88 ? 1 + (n.ovr - 88) * 0.022 + 0.10 : 1;
  const ppg = clamp(base * 31 * st.ppg * star * R.f(0.88, 1.12), 2, 36);
  const rpg = clamp((1.8 + base * 10.6) * POS_REB[n.pos] * st.rpg * R.f(0.85, 1.15), 0.8, 14);
  const apg = clamp((0.8 + base * 8.6) * POS_AST[n.pos] * st.apg * R.f(0.85, 1.15), 0.4, 12);
  const ts = clamp(0.50 + base * 0.11 + R.f(-0.025, 0.025), 0.46, 0.68);
  const gp = clamp(Math.round(82 - Math.max(0, R.gauss(9, 11)) - Math.max(0, n.age - 31) * 2), 20, 82);

  return { mpg, ppg, rpg, apg, ts, gp,
           stl: clamp(0.35 + base * 2.1, .2, 2.8), blk: clamp((0.2 + base * 3.6) * POS_BLK[n.pos], .1, 3.6) };
}

/* score de valeur — sert au MVP, aux All-NBA, aux classements */
ENG.valueScore = function (s, wins, gp) {
  const prod = s.ppg * 1.0 + s.rpg * 0.72 + s.apg * 1.05 + (s.stl || 0) * 1.7 + (s.blk || 0) * 1.5;
  const eff = (s.ts || 0.55) / 0.575;
  const team = 0.58 + (wins / 82) * 0.84;
  const avail = gp >= 65 ? 1 : Math.pow(gp / 65, 1.6);
  return prod * eff * team * avail;
};

/* fait avancer la ligue d'une saison (hors joueur) */
ENG.rollLeague = function (L) {
  L.year++;
  L.cap = Math.round(L.cap * R.f(1.03, 1.10));

  /* les effectifs dérivent */
  for (const id in L.teams) {
    const t = L.teams[id];
    t.cast = clamp(Math.round(t.cast + R.gauss(0, 4.4) + (48 - t.cast) * 0.09), 22, 72);
  }

  /* les joueurs vieillissent */
  const gone = [];
  L.npcs.forEach((n) => {
    n.age++;
    n.rookie = false;
    n.ovr = clamp(Math.round(n.ovr + ageDelta(n.age, n.peak)), 30, 99);
    if (n.ovr > n.ceiling) n.ovr = n.ceiling;
    if (n.age >= 34 && (n.ovr < 62 || R.chance((n.age - 33) * 0.16))) gone.push(n.id);
    else if (n.age >= 40) gone.push(n.id);
  });
  L.npcs = L.npcs.filter((n) => !gone.includes(n.id));

  /* cuvée de draft : on remplace les partants */
  const teamIds = DATA.TEAMS.map((t) => t.id);
  const need = Math.max(gone.length, 6);
  for (let i = 0; i < need; i++) {
    const ovr = clamp(Math.round(R.gauss(60, 7)), 45, 79);
    const n = makeNpc(L, ovr, R.i(19, 22), R.pick(teamIds));
    n.rookie = true;
    n.peak = R.i(26, 30);
    n.ceiling = clamp(ovr + R.i(6, 28), ovr, 99);
    L.npcs.push(n);
  }

  /* la ligue produit toujours une poignée de superstars :
     sans elles, le MVP n'aurait aucune valeur */
  const ensure = (threshold, count) => {
    let have = L.npcs.filter((n) => n.ovr >= threshold).length;
    while (have < count) {
      const candidates = L.npcs
        .filter((n) => n.ovr < threshold && n.age >= 23 && n.age <= 31)
        .sort((a, b) => b.ovr - a.ovr);
      if (!candidates.length) break;
      const n = candidates[0];
      n.ovr = clamp(threshold + R.i(0, 4), 30, 99);
      n.ceiling = Math.max(n.ceiling, n.ovr);
      have++;
    }
  };
  ensure(88, 10);
  ensure(93, 4);

  /* stats de la saison pour tout le monde */
  L.npcs.forEach((n) => { n.stats = npcSeason(n); });
};

/* ═══════════════ SIMULATION DE SAISON ═══════════════ */

/* rôle du joueur dans son effectif.
   Le point de référence dépend du niveau : à 56 d'évaluation on est une star
   au lycée et un joueur de bout de banc en NBA. */
const LEVEL_BASE = {
  pro:  { mpg: 52, usg: 56, cap: 36.5 },
  ncaa: { mpg: 38, usg: 44, cap: 33.5 },
  hs:   { mpg: 30, usg: 36, cap: 33.0 },
};

ENG.role = function (p, cast, level) {
  const b = LEVEL_BASE[level] || LEVEL_BASE.pro;
  const o = ENG.ovr(p);
  const rel = o - (cast + 14);          /* on se compare à l'effectif */
  const trust = (p.trust - 50) * 0.05;
  const mpg = clamp(5 + (o - b.mpg) * 0.95 + rel * 0.10 + trust, 4, b.cap);
  const usg = clamp(10 + (ENG.offRating(p) - b.usg) * 0.58 + rel * 0.06, 8.5, 33);
  return { mpg, usg };
};

ENG.simSeason = function (p, L, opt) {
  opt = opt || {};
  const level = opt.level || "pro";       /* hs | ncaa | pro */
  const cast = opt.cast != null ? opt.cast : 45;
  const gamesMax = level === "pro" ? 82 : level === "ncaa" ? 33 : 26;

  const o = ENG.ovr(p);
  const { mpg, usg } = ENG.role(p, cast, level);

  /* état de forme */
  const formMod = 0.93 + (p.form / 100) * 0.14;

  /* blessures sur la saison */
  let missed = 0;
  const inj = [];
  const durMod = (100 - p.attrs.durability) / 100;
  const ageRisk = Math.max(0, p.age - 29) * 0.022;
  const loadRisk = (mpg / 38) * 0.10;
  const guard = opt.injuryGuard || 1;
  let risk = clamp((0.18 + durMod * 0.42 + ageRisk + loadRisk) * guard, 0.05, 0.85);

  while (R.chance(risk) && missed < gamesMax * 0.92) {
    const pool = DATA.INJURIES.filter((x) => x.sev <= (p.age > 28 ? 5 : 4));
    const weights = pool.map((x) => (x.sev >= 4 ? 0.35 : x.sev === 3 ? 1 : 2.6));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total, k = 0;
    while (r > weights[k]) { r -= weights[k]; k++; }
    const injury = pool[k];
    const g = Math.round(R.i(injury.min, injury.max) * (gamesMax / 82));
    missed += g;
    inj.push({ ...injury, games: g });
    risk *= 0.34;
  }
  missed = Math.min(missed, gamesMax);
  const gp = Math.max(0, gamesMax - missed);

  /* production par 36 minutes */
  const comp = ENG.shootComposite(p);
  const ts = clamp(0.475 + (comp - 50) * 0.0035 + (p.attrs.iq - 50) * 0.0004, 0.42, 0.68) * (level === "pro" ? 1 : 1.04);
  const eff = ts / 0.575;

  const pts36 = usg * 0.80 * eff * formMod * (level === "pro" ? 1 : 1.15);
  const reb36 = (2.2 + Math.pow(p.attrs.rebounding / 99, 1.3) * 11.5) * POS_REB[p.position] * formMod;
  const ast36 = (0.8 + Math.pow(p.attrs.passing / 99, 1.5) * 9.5) * POS_AST[p.position] *
                (1 + (p.attrs.iq - 50) / 300) * formMod;
  const stl36 = Math.pow(p.attrs.steal / 99, 1.6) * 2.6;
  const blk36 = Math.pow(p.attrs.block / 99, 1.7) * 3.6 * POS_BLK[p.position];
  const tov36 = clamp(0.9 + usg * 0.075 - (p.attrs.iq - 50) * 0.008, 0.6, 4.6);

  const k = mpg / 36;
  const noise = () => R.f(0.93, 1.07);
  const s = {
    gp, mpg: round1(mpg), usg: round1(usg),
    ppg: round1(clamp(pts36 * k * noise(), 0, 42)),
    rpg: round1(clamp(reb36 * k * noise(), 0, 17)),
    apg: round1(clamp(ast36 * k * noise(), 0, 14)),
    spg: round1(clamp(stl36 * k * noise(), 0, 3.4)),
    bpg: round1(clamp(blk36 * k * noise(), 0, 4.2)),
    tpg: round1(clamp(tov36 * k * noise(), 0, 5.6)),
    ts,
    fg: clamp(0.395 + (p.attrs.finishing / 99) * 0.105 + POS_FG[p.position] + R.f(-0.014, 0.014), 0.34, 0.66),
    tp: clamp(0.255 + (p.attrs.three / 99) * 0.16 + R.f(-0.02, 0.02), 0.18, 0.46),
    ft: clamp(0.55 + (p.attrs.freeThrow / 99) * 0.36 + R.f(-0.025, 0.025), 0.42, 0.95),
    injuries: inj, missed,
  };

  /* bilan collectif */
  const impact = clamp(o * (0.55 + 0.45 * (gp / gamesMax)), 20, 99);
  const rating = level === "pro" ? cast * 0.78 + impact * 0.22 : cast * 0.55 + impact * 0.45;
  const wins = level === "pro"
    ? clamp(Math.round(41 + (rating - 48) * 1.34 + R.gauss(0, 3.4)), 11, 71)
    : clamp(Math.round(gamesMax * clamp(0.40 + (rating - 40) * 0.021 + R.f(-0.08, 0.08), 0.12, 0.94)), 2, gamesMax - 2);

  s.wins = wins;
  s.losses = (level === "pro" ? 82 : gamesMax) - wins;
  s.value = ENG.valueScore(s, wins, gp);
  s.rating = rating;

  return s;
};

/* ═══════════════ CLASSEMENTS & PLAYOFFS ═══════════════ */

ENG.standings = function (L, myTeamId, myWins) {
  const rows = DATA.TEAMS.map((t) => {
    const lt = L.teams[t.id];
    let w;
    if (t.id === myTeamId && myWins != null) w = myWins;
    else w = clamp(Math.round(41 + (lt.cast - 48) * 1.34 + R.gauss(0, 4.2)), 11, 71);
    lt.wins = w; lt.losses = 82 - w;
    return { id: t.id, conf: t.conf, w, l: 82 - w };
  });
  const byConf = { E: [], O: [] };
  rows.forEach((r) => byConf[r.conf].push(r));
  byConf.E.sort((a, b) => b.w - a.w);
  byConf.O.sort((a, b) => b.w - a.w);
  byConf.E.forEach((r, i) => (r.seed = i + 1));
  byConf.O.forEach((r, i) => (r.seed = i + 1));
  return byConf;
};

/* ═══════════════ MONDE MULTIJOUEUR — mode Saison ═══════════════
   Couche à part, indépendante de la carrière solo et de simSeason :
   un personnage multijoueur choisit une franchise et joue contre des
   adversaires IA dont la difficulté dérive de t.prestige (pas besoin
   d'une ligue complète avec ses PNJ). */

/* attributs synthétiques d'un adversaire IA, centrés sur la force de
   son équipe — résolus ensuite avec la même DUEL.resolveChoice que pour
   un vrai joueur, aucune nouvelle mécanique à inventer. */
ENG.worldAiAttrs = function (team) {
  const center = clamp(28 + (team.prestige || 60) * 0.5, 25, 78);
  const attrs = {};
  DATA.ATTRS.forEach((a) => { attrs[a.id] = clamp(Math.round(center + R.gauss(0, 6)), 25, 78); });
  return attrs;
};

/* calendrier d'une saison multijoueur : deux matchs contre chaque
   franchise de la même conférence, pas d'aller-retour inter-conférence. */
ENG.worldBuildSchedule = function (myTeamId) {
  const me = DATA.TEAMS.find((t) => t.id === myTeamId);
  const slots = [];
  DATA.TEAMS.forEach((t) => {
    if (t.id === myTeamId || t.conf !== me.conf) return;
    slots.push({ opp: t.id, played: false, result: null });
    slots.push({ opp: t.id, played: false, result: null });
  });
  return R.shuffle(slots);
};

/* classement de conférence en fin de phase régulière : ton bilan réel
   (tiré du calendrier joué) + un bilan simulé pour les autres équipes,
   calé sur la même longueur de saison (pas 82 matchs). N'écrit jamais
   dans ENG.standings ni dans une ligue de carrière solo. */
ENG.worldConferenceStandings = function (myTeamId, myWins, gamesPerTeam) {
  const me = DATA.TEAMS.find((t) => t.id === myTeamId);
  const half = gamesPerTeam / 2;
  const rows = DATA.TEAMS.filter((t) => t.conf === me.conf).map((t) => {
    let w;
    if (t.id === myTeamId) w = myWins;
    else w = clamp(Math.round(half + ((t.prestige || 60) - 60) * (half / 60) + R.gauss(0, half * 0.18)), 2, gamesPerTeam - 2);
    return { id: t.id, w, l: gamesPerTeam - w };
  });
  rows.sort((a, b) => b.w - a.w);
  rows.forEach((r, i) => (r.seed = i + 1));
  return rows;
};

/* série au meilleur des trois (au lieu de sept) — même logique que
   seriesWin plus bas, juste un objectif de victoires plus court. */
function worldSeriesWin(a, b, boost) {
  const d = (a - b) * 0.075 + (boost || 0);
  const pg = clamp(0.5 + d, 0.14, 0.86);
  let wa = 0, wb = 0;
  const games = [];
  while (wa < 2 && wb < 2) { const win = R.chance(pg); games.push(win); if (win) wa++; else wb++; }
  return { win: wa === 2, score: wa + "-" + wb, games };
}
ENG.worldSeriesWin = worldSeriesWin;

function seriesWin(a, b, boost) {
  /* probabilité de gagner une série au meilleur des sept */
  const d = (a - b) * 0.075 + (boost || 0);
  const pg = clamp(0.5 + d, 0.14, 0.86);
  let wa = 0, wb = 0;
  while (wa < 4 && wb < 4) { if (R.chance(pg)) wa++; else wb++; }
  return { win: wa === 4, score: wa + "-" + wb };
}

function confBracket(L, conf, myTeamId, p) {
  const seeds = conf.slice(0, 10);
  const field = seeds.slice(0, 6).map((s) => ({ ...s }));

  /* play-in 7-10 */
  const s7 = seeds[6], s8 = seeds[7], s9 = seeds[8], s10 = seeds[9];
  const a = R.chance(0.62) ? s7 : s8;
  const b = R.chance(0.66) ? s9 : s10;
  const loserAB = a === s7 ? s8 : s7;
  field.push({ ...a, seed: 7 });
  field.push({ ...(R.chance(0.55) ? loserAB : b), seed: 8 });

  const rounds = [];
  let alive = field.slice();

  for (let r = 0; r < 3; r++) {
    const next = [];
    for (let i = 0; i < alive.length / 2; i++) {
      const hi = alive[i], lo = alive[alive.length - 1 - i];
      const strHi = L.teams[hi.id].cast + (hi.id === myTeamId ? 6 : 0);
      const strLo = L.teams[lo.id].cast + (lo.id === myTeamId ? 6 : 0);
      const boost = (hi.id === myTeamId || lo.id === myTeamId)
        ? ((p.attrs.clutch - 55) * 0.0035) * (hi.id === myTeamId ? 1 : -1) : 0;
      const res = seriesWin(strHi, strLo, boost + 0.04);
      const winner = res.win ? hi : lo;
      next.push(winner);
      rounds.push({ round: r, hi, lo, winner: winner.id, score: res.score });
    }
    alive = next.sort((x, y) => x.seed - y.seed);
    if (alive.length === 1) break;
  }
  return { champion: alive[0], rounds, field };
}

/* les deux conférences, puis les Finales */
ENG.postseason = function (L, standings, myTeamId, p) {
  const east = confBracket(L, standings.E, myTeamId, p);
  const west = confBracket(L, standings.O, myTeamId, p);

  const a = east.champion, b = west.champion;
  const strA = L.teams[a.id].cast + (a.id === myTeamId ? 6 : 0);
  const strB = L.teams[b.id].cast + (b.id === myTeamId ? 6 : 0);
  const boost = (a.id === myTeamId || b.id === myTeamId)
    ? ((p.attrs.clutch - 55) * 0.0035) * (a.id === myTeamId ? 1 : -1) : 0;
  const fin = seriesWin(strA, strB, boost);
  const champion = fin.win ? a : b;

  /* parcours de notre équipe */
  const myConf = standings.E.some((r) => r.id === myTeamId) ? east : west;
  let reached = -1, exit = null;
  myConf.rounds.forEach((r) => {
    if (r.hi.id === myTeamId || r.lo.id === myTeamId) {
      reached = r.round;
      if (r.winner !== myTeamId) exit = r;
    }
  });
  const madeFinals = myConf.champion.id === myTeamId;
  if (madeFinals) {
    reached = 3;
    if (champion.id !== myTeamId) {
      exit = { round: 3, winner: champion.id, score: fin.score.split("-").reverse().join("-") };
    }
  }

  return {
    champion, reached, exit, madeFinals,
    finalsScore: fin.score,
    opponent: madeFinals ? (champion.id === a.id ? b : a) : null,
  };
};

/* ═══════════════ RÉCOMPENSES ═══════════════ */

ENG.awards = function (L, me) {
  /* me = { name, pos, stats, wins, gp, rookie, isMe } ou null */
  const pool = L.npcs.map((n) => ({
    id: n.id, name: n.name, pos: n.pos, team: n.team, rookie: n.rookie, age: n.age,
    s: n.stats, wins: L.teams[n.team] ? L.teams[n.team].wins : 41,
    ovr: n.ovr, ref: n,
  })).filter((x) => x.s);

  pool.forEach((x) => { x.v = ENG.valueScore(x.s, x.wins, x.s.gp); });

  if (me) {
    me.v = ENG.valueScore(me.s, me.wins, me.s.gp);
    pool.push(me);
  }

  pool.sort((a, b) => b.v - a.v);

  const defScore = (x) => {
    const s = x.s;
    /* même échelle des deux côtés : sinon le joueur humain rafle le titre chaque année */
    return (s.blk || 0) * 3.4 + (s.stl || 0) * 3.2 + s.rpg * 0.5 +
           (x.isMe ? ENG.defRating(x.p) * 0.10 : x.ovr * 0.10) + (x.wins / 82) * 4;
  };
  const defRank = pool.slice().sort((a, b) => defScore(b) - defScore(a));
  const rookies = pool.filter((x) => x.rookie).sort((a, b) => b.v - a.v);

  return {
    mvp: pool[0],
    ladder: pool.slice(0, 8),
    allNba: pool.slice(0, 8),
    allStars: pool.slice(0, 15),
    dpoy: defRank[0],
    defTop: defRank.slice(0, 6),
    roy: rookies[0],
    scoring: pool.slice().sort((a, b) => b.s.ppg - a.s.ppg).slice(0, 8),
    assists: pool.slice().sort((a, b) => b.s.apg - a.s.apg).slice(0, 8),
  };
};

/* ═══════════════ PROGRESSION ═══════════════ */

/* plafond propre à chaque attribut : un arrière ne deviendra jamais
   un rebondeur d'élite, quel que soit son potentiel brut.
   Les plafonds sont normalisés pour que la moyenne pondérée par le poste
   retombe exactement sur le potentiel — le profil se creuse, le niveau global
   reste celui promis à la création. */
const CAP_SHAPE = (w) => 0.62 + 0.38 * clamp(w / 2.6, 0, 1);
const CAP_MEAN = {};

/* ─────────── la note parfaite se mérite ───────────
   Le talent brut fixe une limite. Ce qu'on en fait en fixe une autre,
   et c'est la plus basse des deux qui compte. Atteindre 99 suppose une
   carrière sans faute : titres, distinctions, disponibilité, vestiaire,
   corps préservé. Une carrière ordinaire plafonne bien plus bas, quel
   que soit le potentiel de départ. */
ENG.flawless = function (p) {
  const c = p.career;
  let s = 0, n = 0;
  const add = (v, w) => { s += clamp(v, 0, 1) * w; n += w; };

  /* On juge le RYTHME, pas le cumul : sinon le plafond ne se débloquerait
     qu'à trente-quatre ans, quand plus rien ne peut progresser. Un joueur
     déjà dominant à vingt-cinq ans doit pouvoir viser le sommet. */
  const den = Math.max(4, c.seasons);
  add(c.mvp / (den * 0.30), 2.2);                       /* MVP */
  add(p.rings / (den * 0.28), 2.0);                     /* titres */
  add(c.allNba / (den * 0.65), 1.6);                    /* All-NBA */
  add(c.allStar / (den * 0.75), 1.0);
  add(c.full82 / (den * 0.55), 1.8);                    /* disponibilité */
  add(1 - clamp(p.injuryHistory.length / (den * 0.8), 0, 1), 1.4); /* corps préservé */
  add(p.trust / 100, 0.9);                              /* staff */
  add(((p.rel && p.rel.locker) || 50) / 100, 0.7);      /* vestiaire */
  add(((p.rel && p.rel.fans) || 50) / 100, 0.6);        /* public */
  add(p.morale / 100, 0.5);
  add(ENG.badgeCount(p) / 26, 1.0);                     /* maîtrise technique */

  return n ? clamp(s / n, 0, 1) : 0;
};

/* Le plafond gagné par la carrière elle-même, calé sur la distribution
   réelle des carrières. Sous la moyenne il reste en dessous du talent
   brut et ne change rien : ce sont les premières années qui commandent.
   Au-dessus, la pente devient brutale — les derniers points se paient
   en titres, en disponibilité et en vestiaire tenu. 99 est réservé à
   une carrière sans faute, atteinte par environ un joueur sur dix. */
const CEIL_CURVE = [
  [0.00, 45], [0.60, 58], [0.80, 72], [0.87, 84],
  [0.90, 89], [0.93, 94], [0.955, 99], [1.00, 99],
];

ENG.hardCeiling = function (p) {
  const f = ENG.flawless(p);
  for (let i = 1; i < CEIL_CURVE.length; i++) {
    const [x0, y0] = CEIL_CURVE[i - 1], [x1, y1] = CEIL_CURVE[i];
    if (f <= x1) {
      const t = x1 === x0 ? 0 : (f - x0) / (x1 - x0);
      return clamp(Math.round(y0 + (y1 - y0) * t), 40, 99);
    }
  }
  return 99;
};

ENG.attrCap = function (p, attrId) {
  const W = DATA.POS_WEIGHTS[p.position];
  if (!CAP_MEAN[p.position]) {
    let num = 0, den = 0;
    for (const k in W) { num += CAP_SHAPE(W[k]) * W[k]; den += W[k]; }
    CAP_MEAN[p.position] = num / den;
  }
  /* le plafond effectif : le talent de départ, ou ce que la carrière a
     fini par prouver — le meilleur des deux */
  const eff = clamp(Math.max(p.potential, ENG.hardCeiling(p)), 30, 99);

  /* Le profil se resserre à mesure qu'on approche du sommet. Sans ça,
     les attributs clés butent sur 99 pendant que les secondaires restent
     bas, et la moyenne pondérée plafonne quatre points trop tôt : la note
     parfaite deviendrait arithmétiquement impossible. Un joueur à 99 est
     de toute façon complet. */
  const shape = CAP_SHAPE(W[attrId] || 1) / CAP_MEAN[p.position];
  const t = clamp((eff - 93) / 6, 0, 1);
  const blended = shape * (1 - t) + t;

  return clamp(Math.round(eff * blended), 30, 99);
};

/* Le potentiel n'est pas une sentence : il se repousse.
   Travail ciblé, moral haut, mentor, confiance du staff et grosses saisons
   font monter le plafond — jusqu'à +16 sur une carrière. */
ENG.growPotential = function (p, ctx) {
  if (p.age > 26) return 0;
  if ((p.potentialGained || 0) >= 10) return 0;

  const ment = DATA.MENTALITIES.find((m) => m.id === p.mentality) || {};
  const ent = DATA.ENTOURAGES.find((e) => e.id === p.entourage) || {};

  let pts = 0;
  if (ctx && ctx.focused) pts += 1;                       /* on a travaillé un axe précis */
  if (p.morale >= 72) pts += 1;
  if (p.trust >= 68) pts += 1;
  if (ment.id === "grinder") pts += 1;
  if (ent.id === "mentor") pts += 1;
  if (ctx && ctx.season && ctx.season.value > 16) pts += 1;
  if (p.age <= 21) pts += 1;                               /* la marge de manœuvre est plus grande jeune */

  /* rare et méritée : plus on coche de cases, plus la chance est grande,
     mais rien n'est automatique */
  if (pts === 0) return 0;
  if (!R.chance(pts / 13)) return 0;

  const gain = Math.min(R.i(1, 2), 10 - (p.potentialGained || 0));
  if (gain <= 0) return 0;

  p.potential = clamp(p.potential + gain, 30, 99);
  p.potentialGained = (p.potentialGained || 0) + gain;
  return gain;
};

/* Ce que vaut l'entretien du joueur cette saison : santé, résistance,
   régularité, production, moral. C'est ce qui décide si le corps tient
   ou s'il lâche — pas seulement le nombre de bougies. */
ENG.upkeep = function (p, season) {
  let s = 0, n = 0;
  const add = (v, w) => { s += clamp(v, 0, 1) * w; n += w; };
  add(p.health / 100, 2.0);
  add(p.attrs.durability / 99, 1.6);
  add(p.attrs.stamina / 99, 0.8);
  add(p.morale / 100, 0.8);
  if (season) {
    add(season.value / 20, 1.6);            /* une grosse saison entretient */
    add(season.gp / 78, 1.2);               /* être disponible entretient */
  } else { n += 0; }
  const ment = DATA.MENTALITIES.find((m) => m.id === p.mentality);
  if (ment && (ment.id === "grinder" || ment.id === "stoic" || ment.id === "zen")) add(1, 0.6);
  return n ? s / n : 0.5;
};

ENG.progress = function (p, opt) {
  opt = opt || {};
  const before = ENG.ovr(p);
  const moraleMod = 0.85 + (p.morale / 100) * 0.3;
  const focus = opt.focus || [];
  const season = opt.season || null;

  /* un corps solide recule plus tard */
  const peak = clamp(27 + (p.attrs.durability - 50) / 16, 24.5, 30.5);

  /* 0 = joueur entretenu, 1.4 = joueur qui se néglige.
     Une excellente saison en pleine santé annule presque le déclin. */
  const up = ENG.upkeep(p, season);
  const decay = clamp(1.45 - up * 1.35, 0.12, 1.45);

  DATA.ATTRS.forEach((a) => {
    const cur = p.attrs[a.id];
    const cap = ENG.attrCap(p, a.id);
    const head = cap - cur;
    let d;

    if (p.age < peak) {
      const youth = p.age < 21 ? 1.9 : p.age < 24 ? 1.45 : 0.95;
      d = R.f(0.9, 3.7) * youth * p.growth * moraleMod * clamp(head / 18, 0.06, 1.35);
    } else if (p.age <= peak + 2) {
      /* on peut encore progresser à trente ans si tout est en ordre */
      d = R.f(-0.4, 1.4) * clamp(head / 22, 0, 1) - (decay - 0.5) * 0.9;
    } else if (p.age <= 32) {
      d = R.f(-2.2, 0.4) * decay;
    } else if (p.age <= 35) {
      d = R.f(-3.8, -0.4) * decay;
    } else {
      d = R.f(-5.6, -1.2) * decay;
    }

    /* le travail ciblé accélère, et freine le déclin même tard */
    if (focus.includes(a.id)) {
      d += R.f(1.6, 3.8) * (p.age < 30 ? 1 : 0.7) * clamp(head / 12, 0.15, 1);
    }

    /* Maîtrise : un joueur d'élite parfaitement entretenu continue de
       combler l'écart avec son plafond au lieu de stagner trois points
       en dessous. C'est ce qui rend la note parfaite atteignable. */
    if (up > 0.76 && head > 0) {
      d += Math.min(head, 4) * 0.45 * (p.age <= peak + 4 ? 1 : 0.45);
    }
    /* le QI et le leadership résistent au temps */
    if ((a.id === "iq" || a.id === "leadership") && d < 0) d *= 0.28;

    let next = cur + d;
    if (d > 0 && next > cap) next = Math.max(cur, cap);   /* on ne dépasse pas le plafond */
    p.attrs[a.id] = clamp(Math.round(next), 22, 99);
  });

  return ENG.ovr(p) - before;
};

/* ═══════════════ BADGES ═══════════════ */

ENG.evalBadges = function (p) {
  const c = {
    bestPpg: p.career.bestPpg,
    gp82: p.career.full82,
    full82: p.career.full82,
    teamsPlayed: p.career.teamsPlayed,
    yearsSameTeam: p.career.yearsSameTeam,
    tripleSeasons: p.career.tripleSeasons,
    fame: p.fame,
  };
  const gained = [];
  DATA.BADGES.forEach((b) => {
    const t = clamp(b.t(p, c) | 0, 0, 4);
    const prev = p.badges[b.id] || 0;
    if (t > prev) { p.badges[b.id] = t; if (t >= 1) gained.push({ b, tier: t, up: prev > 0 }); }
  });
  return gained;
};

ENG.badgeCount = (p) => Object.values(p.badges).filter((t) => t >= 1).length;

/* ═══════════════ CONTRATS ═══════════════ */

ENG.rookieScale = function (pick, cap) {
  if (pick == null) return Math.round(cap * 0.0062);            /* two-way */
  if (pick <= 30) return Math.round(cap * 0.089 * Math.exp(-0.0506 * (pick - 1)));
  return Math.round(cap * 0.0125);                              /* 2e tour */
};

ENG.maxSalary = function (p, cap) {
  const yrs = p.career.seasons;
  const pctBase = yrs >= 10 ? 0.35 : yrs >= 7 ? 0.30 : 0.25;
  return Math.round(cap * pctBase);
};

/* valeur de marché annuelle */
ENG.marketValue = function (p, L) {
  const o = ENG.ovr(p);
  const cap = L.cap;
  let pct;
  if (o >= 92) pct = 0.34;
  else if (o >= 87) pct = 0.29;
  else if (o >= 82) pct = 0.23;
  else if (o >= 77) pct = 0.165;
  else if (o >= 72) pct = 0.105;
  else if (o >= 67) pct = 0.062;
  else if (o >= 62) pct = 0.032;
  else pct = 0.015;

  /* l'âge et la disponibilité pèsent */
  if (p.age >= 34) pct *= 0.62;
  else if (p.age >= 31) pct *= 0.84;
  if (p.career.allStar >= 3) pct *= 1.06;

  const ent = DATA.ENTOURAGES.find((e) => e.id === p.entourage);
  pct *= (ent.money || 1);

  return clamp(Math.round(cap * pct), Math.round(cap * 0.012), ENG.maxSalary(p, cap));
};

ENG.shoeOffer = function (p, L) {
  const o = ENG.ovr(p);
  const fameScore = p.fame + (p.career.allStar * 6) + (p.career.mvp * 14) + o * 0.4;
  let tier = 0;
  if (fameScore > 118) tier = 5;
  else if (fameScore > 96) tier = 4;
  else if (fameScore > 76) tier = 3;
  else if (fameScore > 58) tier = 2;
  else if (fameScore > 40) tier = 1;
  const shoe = DATA.SHOES[tier];
  if (tier === 0) return null;
  const ent = DATA.ENTOURAGES.find((e) => e.id === p.entourage);
  const ment = DATA.MENTALITIES.find((m) => m.id === p.mentality);
  const amount = Math.round(shoe.base * (ent.money || 1) * (ment.fame || 1) * R.f(0.85, 1.2));
  return { shoe, amount, years: R.i(3, 6) };
};

/* ═══════════════ DRAFT ═══════════════ */

ENG.draftStock = function (p, ctx) {
  const o = ENG.ovr(p);
  const potBonus = (p.potential - o) * 0.18;
  const youth = clamp((22 - p.age) * 1.6, -5, 6);
  const buzz = p.rep * 0.22;
  const prod = (ctx && ctx.lastSeason) ? clamp(ctx.lastSeason.value * 0.18, 0, 6) : 0;
  /* venir d'un pays peu regardé coûte cher au moment de la draft */
  const nat = DATA.NATIONS.find((n) => n.id === p.nation);
  const seen = nat ? (nat.exposure - 0.7) * 9 : 0;
  return o + potBonus + youth + buzz * 0.3 + prod + seen;
};

ENG.runDraft = function (p, ctx) {
  const stock = ENG.draftStock(p, ctx);
  const field = [];
  for (let i = 0; i < 74; i++) field.push(R.gauss(72, 8));
  field.push(stock);
  field.sort((a, b) => b - a);
  let pick = field.indexOf(stock) + 1;

  if (pick > 60) {
    return { pick: null, undrafted: true };
  }
  /* la loterie brasse le haut du tableau */
  if (pick <= 14) pick = clamp(pick + R.i(-3, 4), 1, 16);
  else pick = clamp(pick + R.i(-4, 5), 5, 60);
  return { pick, undrafted: false };
};

/* la franchise qui te sélectionne : plutôt les faibles en haut de draft */
ENG.draftTeam = function (L, pick) {
  const sorted = DATA.TEAMS.slice().sort((a, b) => L.teams[a.id].cast - L.teams[b.id].cast);
  const window = pick <= 14 ? sorted.slice(0, 14) : sorted.slice(8);
  return R.pick(window);
};

/* ═══════════════ BILAN DE CARRIÈRE ═══════════════ */

const LEGENDS = [
  { n: "Cyrus Vandell", s: 1520 }, { n: "Marcus Ellery", s: 1418 },
  { n: "Théo Brissac", s: 1336 },  { n: "Amadou Sangaré", s: 1262 },
  { n: "Reggie Pryor", s: 1188 },  { n: "Nikolas Vraný", s: 1112 },
  { n: "DeSean Hollis", s: 1040 }, { n: "Emeka Bassey", s: 968 },
  { n: "Léandre Fauve", s: 896 },  { n: "Kwame Dorsett", s: 824 },
  { n: "Ivan Lorenc", s: 752 },    { n: "Jules Marceau", s: 684 },
  { n: "Trey Callahan", s: 616 },  { n: "Bashir Diouf", s: 548 },
  { n: "Owen Radcliffe", s: 484 }, { n: "Nate Sorensen", s: 420 },
  { n: "Hugo Bertrand", s: 356 },  { n: "Malik Ayers", s: 296 },
  { n: "Sam Whitlock", s: 240 },   { n: "Pierre Vasseur", s: 186 },
];

ENG.legacy = function (p) {
  const c = p.career;
  const ppg = c.gp ? c.pts / c.gp : 0;
  let s = 0;
  s += c.pts * 0.0070;
  s += c.reb * 0.0034;
  s += c.ast * 0.0048;
  s += ppg * 2.2;
  s += c.seasons * 2.2;
  s += c.mvp * 62;
  s += c.fmvp * 34;
  s += p.rings * 40;
  s += c.dpoy * 20;
  s += c.allNba * 13;
  s += c.allStar * 7;
  s += c.playoffApps * 2.4;
  s += ENG.badgeCount(p) * 1.5;
  s += p.fame * 0.4;
  if (p.draft && p.draft.pick === 1) s += 8;
  return Math.round(s);
};

ENG.careerScore = function (p) {
  const leg = ENG.legacy(p);
  /* échelle calée sur le sommet du Panthéon fictif */
  return clamp(Math.round(Math.pow(leg / 1780, 0.78) * 100), 1, 100);
};

ENG.goatBoard = function (p) {
  const mine = { n: ENG.name(p), s: ENG.legacy(p), me: true };
  const board = LEGENDS.concat([mine]).sort((a, b) => b.s - a.s);
  return { board, rank: board.indexOf(mine) + 1 };
};

ENG.verdict = function (score, p) {
  if (score >= 88) return { t: "Légende absolue", d: "Ton nom se dit dans la même phrase que ceux qui ont défini le jeu." };
  if (score >= 74) return { t: "Hall of Fame", d: "Intronisé au premier tour de vote. Ton maillot monte au plafond." };
  if (score >= 60) return { t: "Star de la ligue", d: "Une décennie au sommet, des All-Star Games et un maillot retiré par ta franchise." };
  if (score >= 45) return { t: "Excellent joueur", d: "Titulaire respecté, une belle carrière et un compte en banque solide." };
  if (score >= 30) return { t: "Solide carrière", d: "Tu as duré, tu as compté, tu es sorti par la grande porte du vestiaire." };
  if (score >= 16) return { t: "Rotation NBA", d: "Tu as touché le plafond de verre, mais tu as porté le maillot." };
  if (p.career.seasons > 0) return { t: "Passage express", d: "Quelques matchs dans la grande ligue. Beaucoup n'y arrivent jamais." };
  return { t: "Rêve inachevé", d: "La marche était trop haute. Il reste le parquet, quelque part." };
};
