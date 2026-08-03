/* ═══════════════════════════════════════════════════════════
   PARQUET — mémoire longue
   Le jeu retient discrètement ce que ce joueur a déjà vu, sur
   toutes ses carrières confondues : situations rencontrées,
   choix effectués, pays, postes, origines, franchises, coachs.
   Il s'en sert pour pousser vers l'avant ce qui n'a jamais été
   vu, et laisser reposer ce qui a déjà beaucoup servi.
   Rien de tout cela n'est affiché : ça se sent, ça ne se lit pas.
   ═══════════════════════════════════════════════════════════ */

const META = {};

/* la mémoire longue appartient au compte actif */
const metaKey = () => (typeof PROFILE !== "undefined" ? PROFILE.key("meta_v1") : "parquet_meta_v1");

META.blank = () => ({
  careers: 0,
  scen: {},      /* id de situation      -> nombre de fois vue */
  choice: {},    /* "idSituation:index"  -> nombre de fois pris */
  nation: {},
  position: {},
  origin: {},
  mentality: {},
  entourage: {},
  team: {},
  college: {},
  coachStyle: {},
  outcome: {},   /* "id:index:issue"     -> pour varier les issues aléatoires */
  lastCareers: [],
  rivals: [],    /* joueurs importés par code : ils rejoignent chaque nouvelle ligue */
});

/* ─────────── rivaux importés ─────────── */

META.addRival = function (o) {
  const m = META.get();
  m.rivals = m.rivals || [];
  if (m.rivals.some((r) => r.n === o.n)) return false;   /* déjà présent */
  m.rivals.push(o);
  m.rivals = m.rivals.slice(-12);
  META.flush();
  return true;
};

META.removeRival = function (name) {
  const m = META.get();
  m.rivals = (m.rivals || []).filter((r) => r.n !== name);
  META.flush();
};

META.getRivals = function () { return META.get().rivals || []; };

META.load = function () {
  try {
    const raw = localStorage.getItem(metaKey());
    if (!raw) return META.blank();
    const d = JSON.parse(raw);
    const b = META.blank();
    for (const k in b) if (d[k] != null) b[k] = d[k];
    return b;
  } catch (e) { return META.blank(); }
};

META.save = function (m) {
  try { localStorage.setItem(metaKey(), JSON.stringify(m)); } catch (e) { /* quota */ }
};

/* état chargé une fois par session */
META.state = null;
META.get = function () {
  if (!META.state) META.state = META.load();
  return META.state;
};

META.bump = function (bucket, key, by) {
  if (key == null) return;
  const m = META.get();
  if (!m[bucket]) m[bucket] = {};
  m[bucket][key] = (m[bucket][key] || 0) + (by || 1);
};

META.seen = function (bucket, key) {
  const m = META.get();
  return (m[bucket] && m[bucket][key]) || 0;
};

META.flush = function () { META.save(META.get()); };

/* ─────────── nouveauté ───────────
   Un coefficient qui multiplie le poids de tirage.
   Jamais vu → fortement mis en avant. Vu souvent → mis en veille,
   sans jamais disparaître totalement (sinon la ligue perdrait
   ses situations les plus structurantes). */

META.novelty = function (bucket, key) {
  const n = META.seen(bucket, key);
  if (n === 0) return 3.2;
  if (n === 1) return 1.5;
  if (n === 2) return 0.85;
  if (n === 3) return 0.5;
  return Math.max(0.18, 0.5 / (n - 2));
};

/* choisit un élément d'une liste en privilégiant ce qui est neuf */
META.pickFresh = function (list, bucket, keyOf) {
  if (!list || !list.length) return null;
  const weights = list.map((x) => META.novelty(bucket, keyOf ? keyOf(x) : x));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, i = 0;
  while (r > weights[i] && i < list.length - 1) { r -= weights[i]; i++; }
  return list[i];
};

/* renvoie un sous-ensemble varié : un peu de neuf, un peu de connu */
META.mixSubset = function (list, count, bucket, keyOf) {
  if (!list || list.length <= count) return list ? list.slice() : [];
  const pool = list.slice();
  const out = [];
  while (out.length < count && pool.length) {
    const pick = META.pickFresh(pool, bucket, keyOf);
    const i = pool.indexOf(pick);
    pool.splice(i, 1);
    out.push(pick);
  }
  return out;
};

/* ─────────── enregistrement d'une carrière ─────────── */

META.startCareer = function (p) {
  const m = META.get();
  m.careers++;
  META.bump("nation", p.nation);
  META.bump("position", p.position);
  META.bump("origin", p.origin);
  META.bump("mentality", p.mentality);
  META.bump("entourage", p.entourage);
  META.flush();
};

META.noteScenario = function (id) { META.bump("scen", id); META.flush(); };
META.noteChoice = function (id, idx) { META.bump("choice", id + ":" + idx); };
META.noteTeam = function (t) { META.bump("team", t); };
META.noteCollege = function (c) { META.bump("college", c); };
META.noteCoachStyle = function (s) { META.bump("coachStyle", s); };

META.endCareer = function (p, score) {
  const m = META.get();
  m.lastCareers.unshift({
    n: ENG.name(p), sc: score, pos: p.position, nat: p.nation,
    s: p.career.seasons, y: Date.now(),
  });
  m.lastCareers = m.lastCareers.slice(0, 25);
  META.flush();
};

/* ─────────── statistiques de découverte ─────────── */

META.coverage = function () {
  const m = META.get();
  const totalScen = typeof SC !== "undefined" ? SC.LIB.length : 0;
  const seenScen = Object.keys(m.scen).length;
  return {
    careers: m.careers,
    scen: seenScen, scenTotal: totalScen,
    nations: Object.keys(m.nation).length, nationsTotal: DATA.NATIONS.length,
    positions: Object.keys(m.position).length,
    origins: Object.keys(m.origin).length, originsTotal: DATA.ORIGINS.length,
    teams: Object.keys(m.team).length, teamsTotal: DATA.TEAMS.length,
    pct: totalScen ? Math.round((seenScen / totalScen) * 100) : 0,
  };
};

/* suggère un profil de départ que ce joueur n'a jamais essayé */
META.suggestProfile = function () {
  const nat = META.pickFresh(DATA.NATIONS, "nation", (x) => x.id);
  const pos = META.pickFresh(DATA.POSITIONS, "position", (x) => x.id);
  const ori = META.pickFresh(DATA.ORIGINS, "origin", (x) => x.id);
  const men = META.pickFresh(DATA.MENTALITIES, "mentality", (x) => x.id);
  const ent = META.pickFresh(DATA.ENTOURAGES, "entourage", (x) => x.id);
  return { nation: nat.id, position: pos.id, origin: ori.id, mentality: men.id, entourage: ent.id };
};

META.reset = function () {
  META.state = META.blank();
  META.flush();
};
