/* ═══════════════════════════════════════════════════════════
   PARQUET — duel en direct (module DUEL)
   Un salon à deux, connecté via Firebase Realtime Database, créé
   juste avant de jouer — pas de code de carrière à échanger à
   l'avance, un seul salon éphémère par duel.

   Chacun vit sa propre série de situations (même format que la
   carrière solo : une question, plusieurs choix), en parallèle et à
   son rythme, sans attendre l'autre. Les deux scores se comparent
   en direct ; le plus haut à la fin gagne.
   ═══════════════════════════════════════════════════════════ */

const DUEL = {};

DUEL.ROUNDS_REGULAR = 10;
DUEL.ROUNDS_PLAYOFFS = 12;
DUEL.CHOICE_SECONDS = 10;
DUEL.ROOT = "parquet_duels";

/* ═══════════════ avatar rapide ═══════════════
   Pas de lycée, pas de NCAA — juste un nom et un poste. Réutilise
   ENG.newPlayer avec le reste tiré au hasard, pour rester cohérent
   avec les mêmes formules d'attributs que la carrière solo. */
DUEL.quickAvatar = function (name, positionId) {
  const parts = (name || "Joueur").trim().split(/\s+/);
  const pos = DATA.POSITIONS.find((p) => p.id === positionId) || DATA.POSITIONS[0];
  const cfg = {
    first: parts[0] || "Joueur",
    last: parts.slice(1).join(" ") || "Anonyme",
    nation: ENG.R.pick(DATA.NATIONS).id,
    position: pos.id,
    height: ENG.R.i(pos.hMin, pos.hMax),
    number: ENG.R.i(0, 35),
    origin: ENG.R.pick(DATA.ORIGINS).id,
    mentality: ENG.R.pick(DATA.MENTALITIES).id,
    entourage: ENG.R.pick(DATA.ENTOURAGES).id,
  };
  cfg.wingspan = cfg.height + ENG.R.i(2, 10);
  const p = ENG.newPlayer(cfg);
  p.age = ENG.R.i(24, 30);
  return p;
};

/* ═══════════════ personnage persistant du monde multijoueur ═══════════════
   Un seul personnage par compte, créé une fois via quickAvatar puis
   sauvegardé — remplace la régénération à chaque match. Utilisé pour
   les trois sous-modes (Saison / Ami / Aléatoire). */
DUEL.CHARACTER_KEY = "mp_character_v1";

DUEL.getCharacter = function () {
  try { return JSON.parse(localStorage.getItem(PROFILE.key(DUEL.CHARACTER_KEY)) || "null"); }
  catch (e) { return null; }
};

DUEL.setCharacter = function (c) {
  try { localStorage.setItem(PROFILE.key(DUEL.CHARACTER_KEY), JSON.stringify(c)); } catch (e) {}
};

DUEL.createCharacter = function (name, positionId) {
  const p = DUEL.quickAvatar(name, positionId);
  p.teamId = null;
  p.badges = [];
  DUEL.setCharacter(p);
  DUEL.setAlias(ENG.name(p));
  return p;
};

/* ═══════════════ grade affiché ═══════════════
   Paliers lisibles au-dessus de la cote numérique — purement cosmétique,
   ne débloque rien. */
DUEL.rankLabel = function (rating) {
  const r = rating || 0;
  if (r >= 260) return "Top classement";
  if (r >= 200) return "Élite";
  if (r >= 150) return "Vétéran";
  if (r >= 100) return "Titulaire";
  return "Espoir";
};

/* Le coup signature se débloque dès le premier badge — seuil simple,
   ajustable plus tard. Deux usages par match. */
DUEL.signatureUsesForCharacter = function (character) {
  return (character && character.badges && character.badges.length > 0) ? 2 : 0;
};

/* ═══════════════ bibliothèque de situations ═══════════════
   Même format que SC.LIB côté carrière solo : une tête, un corps,
   plusieurs choix avec titre/description/étiquette. `positions`
   (optionnel) restreint une situation au poste indiqué — absente,
   elle reste universelle. `flavor: "defense"` habille certaines
   situations en interception/contre plutôt qu'en attaque directe,
   mais la mécanique de résolution (tir/pénétration/passe) reste
   identique : pas de second modèle à maintenir. */
DUEL.LIB = [];
const D_ = (o) => DUEL.LIB.push(o);

D_({ id: "iso_top", w: 3,
  head: "Un contre un au sommet",
  body: "Le défenseur recule d'un pas, prêt à réagir. Le ballon est dans tes mains, l'horloge tourne.",
  ch: [
    { h: "Prendre le tir", d: "Assumer directement.", t: "Rapide, risqué", mech: "shoot" },
    { h: "Pénétrer", d: "Chercher le contact.", t: "Physique", mech: "drive" },
    { h: "Faire circuler", d: "Chercher un coéquipier mieux placé.", t: "Plus sûr", mech: "pass" },
  ] });

D_({ id: "post_up", w: 2,
  head: "Duel au poste bas",
  body: "Tu sens le défenseur dans ton dos, en position basse. Le jeu s'arrête, tout le monde regarde.",
  ch: [
    { h: "Tir en pivotant", d: "Un mouvement travaillé.", t: "Technique", mech: "shoot" },
    { h: "Forcer vers le cercle", d: "Jouer la puissance.", t: "Direct", mech: "drive" },
    { h: "Ressortir le ballon", d: "Relancer le jeu.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "fastbreak", w: 2,
  head: "Contre-attaque",
  body: "Le ballon récupéré, c'est la course. Un seul défenseur recule, entre toi et le cercle.",
  ch: [
    { h: "Tir de loin", d: "Ne pas attendre.", t: "Audacieux", mech: "shoot" },
    { h: "Foncer au cercle", d: "Finir en force.", t: "Spectaculaire", mech: "drive" },
    { h: "Temporiser et servir", d: "Attendre le soutien.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "pick_and_roll", w: 2,
  head: "Écran-roulade",
  body: "L'écran est posé. La défense doit choisir de le contourner ou de passer dessous — et toi, décider vite.",
  ch: [
    { h: "Tir immédiat", d: "Profiter de l'espace créé.", t: "Fenêtre courte", mech: "shoot" },
    { h: "Utiliser l'écran à fond", d: "Attaquer directement le cercle.", t: "Engagé", mech: "drive" },
    { h: "Trouver le relais", d: "Chercher le partenaire à l'écran.", t: "Lecture de jeu", mech: "pass" },
  ] });

D_({ id: "corner_three", w: 2,
  head: "Sortie de corner",
  body: "Le ballon arrive dans le corner, la défense ferme la course en catastrophe.",
  ch: [
    { h: "Prendre le tir", d: "Sans hésiter.", t: "Ligne à trois points", mech: "shoot" },
    { h: "Enchaîner vers l'intérieur", d: "Profiter du déséquilibre.", t: "Opportuniste", mech: "drive" },
    { h: "Rejouer le ballon", d: "Chercher mieux.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "clutch_iso", w: 2, clutchWeighted: true,
  head: "Money-time",
  body: "Le chrono défile. Ça compte double dans la tête, même si le match continue.",
  ch: [
    { h: "Le tir qui compte", d: "Prendre ses responsabilités.", t: "Quitte ou double", mech: "shoot" },
    { h: "Forcer le passage", d: "Aller chercher le contact.", t: "Sans filet", mech: "drive" },
    { h: "Décaler un partenaire", d: "Faire confiance au collectif.", t: "Partagé", mech: "pass" },
  ] });

D_({ id: "steal_and_go", w: 2, flavor: "defense",
  head: "Interception surprise",
  body: "Tu lis la passe avant tout le monde, le ballon est à toi. Devant toi, le terrain est grand ouvert.",
  ch: [
    { h: "Filer au cercle", d: "Ne rien laisser au hasard.", t: "Direct", mech: "drive" },
    { h: "Tenter le trois points", d: "Personne ne te suit.", t: "Audacieux", mech: "shoot" },
    { h: "Ralentir et structurer", d: "Poser le jeu avant d'agir.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "block_and_run", w: 2, flavor: "defense",
  head: "Contre et récupération",
  body: "Le tir adverse repart de ta main. Tu récupères la balle avant qu'elle ne sorte des limites.",
  ch: [
    { h: "Repartir en contre-attaque", d: "Le terrain est à toi.", t: "Rapide", mech: "drive" },
    { h: "Relancer un partenaire", d: "Jeu collectif.", t: "Sûr", mech: "pass" },
    { h: "Prendre le tir extérieur", d: "L'espace est là.", t: "Opportuniste", mech: "shoot" },
  ] });

D_({ id: "pg_dime", w: 2, positions: ["PG"],
  head: "Création au buzzer",
  body: "L'horloge des 24 secondes s'affole. En tant que meneur, tout le monde attend ta décision.",
  ch: [
    { h: "Décaler pour le tir", d: "Trouver le tireur ouvert.", t: "Vision de jeu", mech: "pass" },
    { h: "Prendre le tir toi-même", d: "Assumer la fin de possession.", t: "Direct", mech: "shoot" },
    { h: "Pénétrer et créer le contact", d: "Forcer la décision arbitrale.", t: "Engagé", mech: "drive" },
  ] });

D_({ id: "sg_catch_shoot", w: 2, positions: ["SG"],
  head: "Sortie d'écrans en cascade",
  body: "Tu traverses deux écrans coup sur coup, le ballon arrive pile au bon moment.",
  ch: [
    { h: "Tir en catch-and-shoot", d: "Le rythme est parfait.", t: "Précis", mech: "shoot" },
    { h: "Enchaîner vers le cercle", d: "La défense est en retard.", t: "Opportuniste", mech: "drive" },
    { h: "Ressortir la balle", d: "Ne pas forcer.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "sf_two_way", w: 2, positions: ["SF"],
  head: "Couteau suisse",
  body: "Ballon en main à l'aile, plusieurs options s'offrent à toi — comme toujours à ce poste.",
  ch: [
    { h: "Isolation rapide", d: "Jouer en un contre un.", t: "Polyvalent", mech: "drive" },
    { h: "Tir à mi-distance", d: "Un classique du poste.", t: "Fiable", mech: "shoot" },
    { h: "Trouver l'intérieur", d: "Servir le pivot démarqué.", t: "Altruiste", mech: "pass" },
  ] });

D_({ id: "pf_stretch", w: 2, positions: ["PF"],
  head: "Écartement à la lucarne",
  body: "Tu t'écartes en position d'ailier fort moderne, l'espace se crée derrière l'arc.",
  ch: [
    { h: "Tir à trois points", d: "L'espacement paie.", t: "Moderne", mech: "shoot" },
    { h: "Attaquer le cercle court", d: "Profiter du surnombre.", t: "Puissant", mech: "drive" },
    { h: "Faire tourner le ballon", d: "Garder le rythme collectif.", t: "Discipliné", mech: "pass" },
  ] });

D_({ id: "c_paint_duel", w: 2, positions: ["C"],
  head: "Duel de dominance sous le cercle",
  body: "Dos au panier, tu sens le poids de l'adversaire — la raquette, c'est ton territoire.",
  ch: [
    { h: "Mouvement de pivot", d: "La technique avant la force.", t: "Technique", mech: "shoot" },
    { h: "Forcer en puissance", d: "Imposer le rapport de force.", t: "Physique", mech: "drive" },
    { h: "Ressortir au shooteur", d: "Créer pour l'extérieur.", t: "Altruiste", mech: "pass" },
  ] });

/* Pool filtré par poste : les situations universelles restent tirables
   par tout le monde, celles taguées `positions` sont réservées au(x)
   poste(s) listé(s) — évite que tout le monde voie tout, sans dupliquer
   la logique de tirage pondéré. */
DUEL.pickScenario = function (positionId) {
  const pool = DUEL.LIB.filter((t) => !t.positions || (positionId && t.positions.includes(positionId)));
  const weights = pool.map((t) => t.w || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, i = 0;
  while (r > weights[i] && i < pool.length - 1) { r -= weights[i]; i++; }
  return pool[i];
};

/* ═══════════════ lecture de la défense (tell) ═══════════════
   Un indice tiré à chaque situation, affiché avant le choix — favorise
   un mécanisme précis s'il est exploité, sans jamais être une garantie
   (favors: null reste fréquent pour ne pas rendre la lecture triviale). */
DUEL.TELLS = [
  { id: "sags_off", label: "Le défenseur recule d'un pas : la ligne de tir est ouverte.", favors: "shoot", w: 2 },
  { id: "help_side", label: "La raquette est bouchée, personne n'est seul près du cercle.", favors: "pass", w: 2 },
  { id: "late_switch", label: "Le changement défensif arrive en retard.", favors: "drive", w: 2 },
  { id: "no_tell", label: "Défense équilibrée, rien à lire.", favors: null, w: 3 },
];

DUEL.pickTell = function () {
  const weights = DUEL.TELLS.map((t) => t.w || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, i = 0;
  while (r > weights[i] && i < DUEL.TELLS.length - 1) { r -= weights[i]; i++; }
  return DUEL.TELLS[i];
};

/* ═══════════════ momentum & fatigue ═══════════════
   Portées par `progress` (Firebase en ligne, objet local contre l'IA) —
   petites fonctions pures partagées par les deux chemins pour ne pas
   dupliquer les seuils/formules. */
DUEL.nextMomentum = function (progress, success) {
  const cur = (progress && progress.momentum) || 0;
  return ENG.clamp(cur + (success ? 1 : -1), -3, 3);
};

DUEL.nextMechStreak = function (progress, mech) {
  return progress && progress.lastMech === mech ? (progress.mechStreak || 0) + 1 : 0;
};

DUEL.deriveBonus = function (progress, tell, mech, useSignature) {
  let bonus = 0;
  if (tell && tell.favors === mech) bonus += 0.09;
  const momentum = (progress && progress.momentum) || 0;
  bonus += ENG.clamp(momentum, -3, 3) * 0.025;
  if (progress && progress.lastMech === mech && (progress.mechStreak || 0) >= 2) bonus -= 0.06;
  if (useSignature) bonus += 0.22;
  return bonus;
};

DUEL.applySignatureFlavor = function (outcome) {
  if (!outcome.success) {
    return Object.assign({}, outcome, { flags: Object.assign({}, outcome.flags, { signature: true }) });
  }
  return Object.assign({}, outcome, {
    headline: "COUP SIGNATURE !",
    text: ENG.R.pick(["Le geste travaillé mille fois, imparable ce soir.",
                       "Le move signature, personne n'y peut rien."]),
    flags: Object.assign({}, outcome.flags, { signature: true }),
  });
};

/* ═══════════════ commentateur & fiche adverse ═══════════════
   Purs générateurs de texte, aucune donnée à transporter en plus de ce
   qui existe déjà (scores, round, attributs). */
DUEL.commentatorLine = function (myScore, oppScore, round, total) {
  const diff = myScore - oppScore;
  const late = round >= total - 2;
  if (round <= 1) return "C'est parti !";
  if (Math.abs(diff) <= 2) return ENG.R.pick(["Match complètement serré.", "Ça se joue à rien.", "Personne ne lâche l'affaire."]);
  if (diff >= 8) return ENG.R.pick(["L'écart se creuse sérieusement.", "Le match commence à basculer.", "Domination nette pour l'instant."]);
  if (diff <= -8) return ENG.R.pick(["Il va falloir un sursaut.", "L'écart devient inquiétant.", "Le match s'échappe doucement."]);
  if (late && diff > 0) return ENG.R.pick(["L'avance tient bon en fin de match.", "Encore quelques instants à gérer."]);
  if (late && diff < 0) return ENG.R.pick(["Il reste une chance de renverser ça.", "Le temps presse pour revenir."]);
  return ENG.R.pick(["Le match avance, tout reste ouvert.", "Ça se construit possession après possession."]);
};

DUEL.scoutingLine = function (attrs, name) {
  if (!attrs) return `${name || "Cet adversaire"} reste un mystère.`;
  const keys = Object.keys(attrs);
  let best = keys[0], worst = keys[0];
  keys.forEach((k) => { if (attrs[k] > attrs[best]) best = k; if (attrs[k] < attrs[worst]) worst = k; });
  const label = (k) => ((DATA.ATTRS.find((a) => a.id === k) || { label: k }).label || k).toLowerCase();
  return `${name || "Cet adversaire"} : solide en ${label(best)}, plus faible en ${label(worst)}.`;
};

/* ═══════════════ résolution d'un choix ═══════════════
   Chacun joue contre une difficulté neutre, poussée par ses
   propres attributs — même esprit que oddsFrom() dans
   scenarios.js, mais sans second joueur à comparer : ici c'est
   ta propre carrière parallèle qui avance. `bonus` agrège tell,
   momentum, fatigue et coup signature (voir DUEL.deriveBonus). */
DUEL.ODDS = {
  shoot: { keys: ["three", "midrange", "finishing"], base: 0.48 },
  drive: { keys: ["handle", "athleticism", "finishing"], base: 0.5 },
  pass:  { keys: ["passing", "iq"], base: 0.58 },
};

DUEL.avg = function (attrs, keys) {
  let s = 0;
  keys.forEach((k) => { s += (attrs && attrs[k]) || 50; });
  return s / keys.length;
};

/* Le mécanisme où le joueur est naturellement le plus fort — sert de
   base au coup signature (§11), pour que ce soit vraiment « son »
   geste plutôt qu'un choix arbitraire. */
DUEL.bestMech = function (attrs) {
  let best = "shoot", bestVal = -1;
  Object.keys(DUEL.ODDS).forEach((m) => {
    const v = DUEL.avg(attrs, DUEL.ODDS[m].keys);
    if (v > bestVal) { bestVal = v; best = m; }
  });
  return best;
};

DUEL.resolveChoice = function (sc, mech, attrs, clutchWeighted, bonus) {
  const odds = DUEL.ODDS[mech];
  const val = DUEL.avg(attrs, odds.keys);
  let p = odds.base + (val - 55) * 0.008;
  if (clutchWeighted) p += (((attrs && attrs.clutch) || 50) - 55) * 0.006;
  p += bonus || 0;
  p = ENG.clamp(p, 0.1, 0.95);

  const success = ENG.R.chance(p);

  if (mech === "pass") {
    if (!success) {
      return { points: 0, success: false, headline: "Passe manquée",
        text: ENG.R.pick(["La défense lit la passe et récupère le ballon.",
                           "Passe trop appuyée, elle sort des limites."]),
        flags: { turnover: true } };
    }
    return { points: 2, success: true, headline: "Panier assisté",
      text: ENG.R.pick(["Tu trouves l'ouverture parfaite pour un panier facile.",
                         "Ballon qui circule, tu sers le tir le plus simple du monde."]),
      flags: {} };
  }

  if (mech === "shoot") {
    if (success) {
      const three = sc.id === "corner_three" || sc.id === "fastbreak" || sc.id === "clutch_iso";
      return { points: three ? 3 : 2, success: true, headline: three ? "Trois points !" : "Panier",
        text: ENG.R.pick([`Tu t'élèves et comptes${three ? " de loin" : ""} !`,
                           "Swish. Tu ne trembles pas.",
                           "Tu trouves le fond du filet malgré la défense."]),
        flags: {} };
    }
    return { points: 0, success: false, headline: "Tir manqué",
      text: ENG.R.pick(["La défense conteste fort, la balle heurte l'arceau.",
                         "Tu tires à côté sous la pression.",
                         "Air ball — la défense avait bien lu le coup."]),
      flags: {} };
  }

  /* pénétrer */
  if (success) {
    const andOne = ENG.R.chance(0.12);
    return { points: andOne ? 3 : 2, success: true, headline: andOne ? "Panier + faute !" : "Panier au cercle",
      text: ENG.R.pick([`Tu pénètres et marques${andOne ? ", et la faute en plus !" : " au cercle !"}`,
                         "Coast to coast, tu conclus au cercle.",
                         "Tu exploses au-dessus de la défense !"]),
      flags: {} };
  }
  const blocked = ENG.R.chance(0.35);
  return { points: 0, success: false, headline: blocked ? "Contré !" : "Tir manqué",
    text: ENG.R.pick(blocked
      ? ["La défense referme la voie et contre proprement !", "Contre monumental !"]
      : ["Tu perds l'équilibre en pénétrant, tir manqué.", "La défense tient bon."]),
    flags: { blocked } };
};

/* ═══════════════ code de salon ═══════════════
   Un code court, opaque : juste une clé de recherche, créée juste
   avant de jouer. Aucun code à échanger à l'avance — la seule
   façon de retrouver un ami est ce salon éphémère. */
const DUEL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
DUEL.genCode = function () {
  let c = "";
  for (let i = 0; i < 6; i++) c += DUEL_ALPHABET[Math.floor(Math.random() * DUEL_ALPHABET.length)];
  return c;
};

/* ═══════════════ Firebase : cycle de vie du salon ═══════════════ */
DUEL.db = null;
DUEL.uid = null;
DUEL.code = null;
DUEL.seat = null;
DUEL.seatsCache = {};
DUEL._seatsRef = null;
DUEL._roomRef = null;
DUEL._progressRef = null;

DUEL.ready = function () {
  return typeof firebase !== "undefined" && typeof FIREBASE_CONFIG !== "undefined" && !!FIREBASE_CONFIG.databaseURL;
};

DUEL.initFirebase = function () {
  if (DUEL.db) return;
  if (!DUEL.ready()) throw new Error("Firebase non configuré");
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  DUEL.db = firebase.database();
};

DUEL.ensureAuth = function (cb) {
  DUEL.initFirebase();
  if (DUEL.uid) { cb(DUEL.uid); return; }
  firebase.auth().onAuthStateChanged((u) => { if (u) { DUEL.uid = u.uid; cb(u.uid); } });
  firebase.auth().signInAnonymously().catch((e) => console.error("Auth duel :", e));
};

DUEL.seatPayload = function (uid, p) {
  return {
    uid, name: ENG.name(p), ovr: ENG.ovr(p), attrs: p.attrs,
    ready: false, connected: true, lastSeen: firebase.database.ServerValue.TIMESTAMP,
  };
};

DUEL.armPresence = function (code, seat) {
  DUEL.db.ref(`${DUEL.ROOT}/${code}/seats/${seat}`).onDisconnect()
    .update({ connected: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
};

/* pas de balayage programmé (ça demanderait les fonctions Cloud
   payantes) : à la place, un salon jamais rejoint est nettoyé dès
   que quelqu'un tombe dessus une fois son code trop vieux */
DUEL.ROOM_TTL_MS = 2 * 60 * 60 * 1000;

DUEL.createRoom = function (avatar, cb) {
  DUEL.ensureAuth((uid) => {
    const attempt = (tries) => {
      if (tries <= 0) { cb(null, "Impossible de créer le salon, réessaie."); return; }
      const code = DUEL.genCode();
      const ref = DUEL.db.ref(`${DUEL.ROOT}/${code}`);
      ref.transaction((cur) => (cur === null ? {
        room: { code, createdAt: firebase.database.ServerValue.TIMESTAMP, status: "waiting", hostSeat: "A" },
        seats: { A: DUEL.seatPayload(uid, avatar) },
      } : undefined), undefined, false).then((res) => {
        if (!res.committed) { attempt(tries - 1); return; }
        DUEL.code = code; DUEL.seat = "A";
        DUEL.armPresence(code, "A");
        cb(code, null);
      }).catch((e) => cb(null, e.message));
    };
    attempt(5);
  });
};

DUEL.joinRoom = function (code, avatar, cb) {
  DUEL.ensureAuth((uid) => {
    const roomRef = DUEL.db.ref(`${DUEL.ROOT}/${code}`);
    roomRef.get().then((snap) => {
      const val = snap.val();
      const stale = val && val.room && val.room.createdAt
        && (Date.now() - val.room.createdAt > DUEL.ROOM_TTL_MS);
      if (stale) roomRef.remove();
      if (!val || !val.room || val.room.status !== "waiting" || stale) {
        cb(false, stale ? "Ce code a expiré, demande-lui d'en générer un nouveau."
                         : "Code introuvable ou salon déjà complet.");
        return;
      }
      const seatRef = DUEL.db.ref(`${DUEL.ROOT}/${code}/seats/B`);
      seatRef.transaction((cur) => (cur === null ? DUEL.seatPayload(uid, avatar) : undefined), undefined, false).then((res) => {
        if (!res.committed) { cb(false, "Quelqu'un d'autre vient de rejoindre ce salon."); return; }
        DUEL.db.ref(`${DUEL.ROOT}/${code}/room/status`).set("ready-check");
        DUEL.code = code; DUEL.seat = "B";
        DUEL.armPresence(code, "B");
        cb(true, null);
      });
    }).catch((e) => cb(false, e.message));
  });
};

/* ═══════════════ file d'attente : adversaire aléatoire ═══════════════
   Chacun écrit sa propre entrée puis regarde s'il existe déjà quelqu'un
   d'autre dedans. Celui qui trouve un candidat crée le salon et lui
   assigne son code (le candidat le voit apparaître sur SA propre entrée,
   qu'il écoute en permanence) ; sinon on attend, visible dans la file,
   qu'un futur arrivant nous choisisse. Une transaction sur le champ
   « matchedRoom » du candidat évite que deux joueurs le réclament en
   même temps. */
DUEL.QUEUE_ROOT = "parquet_queue";
DUEL.QUEUE_TTL_MS = 3 * 60 * 1000;
DUEL._myQueueRef = null;

DUEL.joinQueue = function (avatar, cb) {
  DUEL.ensureAuth((uid) => {
    const myRef = DUEL.db.ref(`${DUEL.QUEUE_ROOT}/${uid}`);
    myRef.set({
      name: ENG.name(avatar), ovr: ENG.ovr(avatar), attrs: avatar.attrs,
      joinedAt: firebase.database.ServerValue.TIMESTAMP, matchedRoom: null,
    }).then(() => {
      myRef.onDisconnect().remove();
      DUEL._myQueueRef = myRef;
      myRef.on("value", (snap) => {
        const v = snap.val();
        if (v && v.matchedRoom && v.matchedRoom !== "PENDING") {
          myRef.off();
          myRef.onDisconnect().cancel();
          myRef.remove();
          DUEL._myQueueRef = null;
          DUEL.joinRoom(v.matchedRoom, avatar, (ok, err) => cb(ok ? v.matchedRoom : null, err, "matched"));
        }
      });
      DUEL.tryClaimFromQueue(uid, avatar, cb);
    });
  });
};

DUEL.tryClaimFromQueue = function (myUid, avatar, cb) {
  DUEL.db.ref(DUEL.QUEUE_ROOT).get().then((snap) => {
    const all = snap.val() || {};
    const now = Date.now();
    const candidateUid = Object.keys(all).find((k) =>
      k !== myUid && all[k] && all[k].matchedRoom == null &&
      (now - (all[k].joinedAt || 0) < DUEL.QUEUE_TTL_MS));
    if (!candidateUid) { cb(null, null, "waiting"); return; }
    const claimRef = DUEL.db.ref(`${DUEL.QUEUE_ROOT}/${candidateUid}/matchedRoom`);
    claimRef.transaction((cur) => (cur === null ? "PENDING" : undefined), undefined, false).then((res) => {
      if (!res.committed) { cb(null, null, "waiting"); return; } /* déjà réclamé par quelqu'un d'autre */
      DUEL.createRoom(avatar, (code, err) => {
        if (!code) { claimRef.set(null); cb(null, err, "error"); return; }
        claimRef.set(code);
        if (DUEL._myQueueRef) {
          DUEL._myQueueRef.off(); DUEL._myQueueRef.onDisconnect().cancel();
          DUEL._myQueueRef.remove(); DUEL._myQueueRef = null;
        }
        cb(code, null, "host");
      });
    });
  });
};

DUEL.leaveQueue = function () {
  if (DUEL._myQueueRef) {
    DUEL._myQueueRef.off();
    DUEL._myQueueRef.onDisconnect().cancel();
    DUEL._myQueueRef.remove();
    DUEL._myQueueRef = null;
  }
};

DUEL.markReady = function () {
  if (!DUEL.code || !DUEL.seat) return;
  DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/seats/${DUEL.seat}/ready`).set(true);
};

/* Dès que les deux sont prêts, l'un ou l'autre (le premier à s'en
   apercevoir) démarre l'horloge commune — une simple lecture puis
   écriture suffit : les deux resteraient d'accord même en cas de
   double écriture presque simultanée (même valeur à peu près). */
DUEL.checkBothReady = function () {
  const seats = DUEL.seatsCache;
  if (!(seats.A && seats.B && seats.A.ready && seats.B.ready)) return;
  const roomRef = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/room`);
  roomRef.get().then((snap) => {
    const room = snap.val();
    if (room && room.status === "ready-check") {
      roomRef.update({ status: "live", startedAt: firebase.database.ServerValue.TIMESTAMP });
    }
  });
};

DUEL.listenSeats = function (cb) {
  DUEL._seatsRef = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/seats`);
  DUEL._seatsRef.on("value", (snap) => {
    DUEL.seatsCache = snap.val() || {};
    cb(DUEL.seatsCache);
    DUEL.checkBothReady();
  });
};

DUEL.listenRoom = function (cb) {
  DUEL._roomRef = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/room`);
  DUEL._roomRef.on("value", (snap) => { const v = snap.val(); if (v) cb(v); });
};

DUEL.listenProgress = function (cb) {
  DUEL._progressRef = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/progress`);
  DUEL._progressRef.on("value", (snap) => cb(snap.val() || {}));
};

/* Chacun n'écrit jamais que dans son propre coin : pas de course à
   arbitrer entre les deux joueurs, donc pas besoin de transaction
   ici — une simple écriture suffit. */
DUEL.startMyRun = function (positionId, sigUsesLeft) {
  const sc = DUEL.pickScenario(positionId);
  const tell = DUEL.pickTell();
  DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/progress/${DUEL.seat}`).set({
    score: 0, count: 0, scenarioId: sc.id, tellId: tell.id, lastOutcome: null,
    momentum: 0, lastMech: null, mechStreak: 0, sigUsesLeft: sigUsesLeft || 0, taunt: null,
  });
};

DUEL.submitMyChoice = function (choiceIdx, attrs, positionId, useSignature, extraBonus) {
  const ref = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/progress/${DUEL.seat}`);
  ref.get().then((snap) => {
    const cur = snap.val();
    if (!cur) return;
    const sc = DUEL.LIB.find((t) => t.id === cur.scenarioId) || DUEL.LIB[0];
    const choice = sc.ch[choiceIdx] || sc.ch[0];
    const tell = DUEL.TELLS.find((t) => t.id === cur.tellId) || null;
    const bonus = DUEL.deriveBonus(cur, tell, choice.mech, useSignature) + (extraBonus || 0);
    let outcome = DUEL.resolveChoice(sc, choice.mech, attrs, !!sc.clutchWeighted, bonus);
    if (useSignature) outcome = DUEL.applySignatureFlavor(outcome);
    const nextSc = DUEL.pickScenario(positionId);
    const nextTell = DUEL.pickTell();
    ref.set({
      score: cur.score + (outcome.points || 0),
      count: cur.count + 1,
      scenarioId: nextSc.id,
      tellId: nextTell.id,
      lastOutcome: Object.assign({}, outcome, { scenarioId: cur.scenarioId, choiceH: choice.h, mech: choice.mech }),
      momentum: DUEL.nextMomentum(cur, outcome.success),
      lastMech: choice.mech,
      mechStreak: DUEL.nextMechStreak(cur, choice.mech),
      sigUsesLeft: Math.max(0, (cur.sigUsesLeft || 0) - (useSignature ? 1 : 0)),
      taunt: cur.taunt || null,
    });
  });
};

/* Le temps est écoulé sans choix : traité comme une perte de balle,
   même forme de résultat qu'un choix raté pour ne pas complexifier
   l'affichage en aval. */
DUEL.submitTimeout = function (positionId) {
  const ref = DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/progress/${DUEL.seat}`);
  ref.get().then((snap) => {
    const cur = snap.val();
    if (!cur) return;
    const nextSc = DUEL.pickScenario(positionId);
    const nextTell = DUEL.pickTell();
    ref.set({
      score: cur.score,
      count: cur.count + 1,
      scenarioId: nextSc.id,
      tellId: nextTell.id,
      lastOutcome: { points: 0, success: false, headline: "Temps écoulé",
        text: "L'horloge tourne trop vite, l'occasion est passée.",
        scenarioId: cur.scenarioId, choiceH: "—", flags: { turnover: true } },
      momentum: DUEL.nextMomentum(cur, false),
      lastMech: null,
      mechStreak: 0,
      sigUsesLeft: cur.sigUsesLeft || 0,
      taunt: cur.taunt || null,
    });
  });
};

/* ═══════════════ chambrage (Ami/Aléatoire uniquement) ═══════════════
   Purement cosmétique : une pique préréglée écrite dans mon propre coin
   de progress, que l'adversaire détecte via son écoute déjà en place. */
DUEL.TAUNTS = ["Trop facile 😎", "Regarde et apprends", "La suite arrive"];

DUEL.sendTaunt = function (text) {
  if (!DUEL.code || !DUEL.seat) return;
  DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/progress/${DUEL.seat}/taunt`)
    .set({ text, at: firebase.database.ServerValue.TIMESTAMP });
};

DUEL.leaveRoom = function () {
  if (DUEL._seatsRef) { DUEL._seatsRef.off(); DUEL._seatsRef = null; }
  if (DUEL._roomRef) { DUEL._roomRef.off(); DUEL._roomRef = null; }
  if (DUEL._progressRef) { DUEL._progressRef.off(); DUEL._progressRef = null; }
  if (DUEL.code && DUEL.seat && DUEL.db) DUEL.db.ref(`${DUEL.ROOT}/${DUEL.code}/seats/${DUEL.seat}`).onDisconnect().cancel();
  DUEL.code = null; DUEL.seat = null; DUEL.seatsCache = {};
};

DUEL.deleteRoom = function (code) {
  if (DUEL.db && code) DUEL.db.ref(`${DUEL.ROOT}/${code}`).remove();
};

/* ═══════════════ historique local ═══════════════
   Le duel ne touche jamais la carrière solo ni le Panthéon —
   juste un petit journal séparé, par compte. */
DUEL.saveHistory = function (entry) {
  const key = PROFILE.key("duels_v1");
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
  list.push(entry);
  if (list.length > 20) list = list.slice(-20);
  try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
};

DUEL.getHistory = function () {
  try { return JSON.parse(localStorage.getItem(PROFILE.key("duels_v1")) || "[]"); } catch (e) { return []; }
};

/* ═══════════════ cote et classement général ═══════════════
   Pas un vrai ELO — simple et lisible : victoire +15, nul +2,
   défaite -10, plancher à 0. Le pseudonyme public est choisi une
   fois et reste local (PROFILE.key), aucun compte ni mot de passe. */
DUEL.LEADERBOARD_ROOT = "parquet_leaderboard";

DUEL.getAlias = function () {
  try { return localStorage.getItem(PROFILE.key("duel_alias_v1")) || ""; } catch (e) { return ""; }
};

DUEL.setAlias = function (name) {
  try { localStorage.setItem(PROFILE.key("duel_alias_v1"), name); } catch (e) {}
};

/* ═══════════════ badges (multijoueur uniquement, cosmétique) ═══════════════ */
DUEL.awardBadge = function (character, id, label) {
  character.badges = character.badges || [];
  if (character.badges.some((b) => b.id === id)) return false;
  character.badges.push({ id, label, at: Date.now() });
  return true;
};

DUEL.recordResult = function (won, tie) {
  DUEL.ensureAuth((uid) => {
    const ref = DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${uid}`);
    ref.get().then((snap) => {
      const cur = snap.val() || { name: DUEL.getAlias() || "Joueur", rating: 100, wins: 0, losses: 0 };
      const delta = tie ? 2 : (won ? 15 : -10);
      const newWins = (cur.wins || 0) + (won ? 1 : 0);
      ref.set({
        name: DUEL.getAlias() || cur.name || "Joueur",
        rating: Math.max(0, (cur.rating || 100) + delta),
        wins: newWins,
        losses: (cur.losses || 0) + (!won && !tie ? 1 : 0),
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      });
      if (newWins >= 10) {
        const c = DUEL.getCharacter();
        if (c && DUEL.awardBadge(c, "wins10", "10 victoires")) DUEL.setCharacter(c);
      }
    });
  });
};

DUEL.getMyRating = function (cb) {
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${uid}`).get().then((snap) => {
      const v = snap.val();
      cb(v ? (v.rating || 0) : 100);
    }).catch(() => cb(100));
  });
};

DUEL.listenLeaderboard = function (cb) {
  const ref = DUEL.db.ref(DUEL.LEADERBOARD_ROOT).orderByChild("rating").limitToLast(50);
  ref.on("value", (snap) => {
    const rows = [];
    snap.forEach((child) => { rows.push(child.val()); });
    rows.reverse();
    cb(rows);
  });
  return ref;
};
