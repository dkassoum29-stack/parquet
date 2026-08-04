/* ═══════════════════════════════════════════════════════════
   PARQUET — bundle généré par build.sh, ne pas éditer à la main.
   Sources, dans l'ordre : profile.js data.js engine.js meta.js cast.js scenarios.js duel.js manga.js app.js
   ═══════════════════════════════════════════════════════════ */

/* ── profile.js ── */
/* ═══════════════════════════════════════════════════════════
   PARQUET — comptes
   Plusieurs personnes peuvent jouer sur le même appareil. Chaque
   compte a sa carrière en cours, son Panthéon et sa mémoire longue,
   rangés séparément. Tout reste sur la machine : aucun serveur,
   aucun mot de passe, rien qui parte ailleurs.
   ═══════════════════════════════════════════════════════════ */

const PROFILE = {};

const P_LIST = "parquet_profiles_v1";
const P_ACTIVE = "parquet_active_v1";

PROFILE.EMBLEMS = ["🏀", "🔥", "⚡", "🐍", "🦅", "🐺", "🦁", "🌊", "⭐", "👑", "🎯", "💎"];

PROFILE.list = function () {
  try { return JSON.parse(localStorage.getItem(P_LIST) || "[]"); }
  catch (e) { return []; }
};

PROFILE.saveList = function (l) {
  try { localStorage.setItem(P_LIST, JSON.stringify(l)); } catch (e) {}
};

PROFILE.activeId = function () {
  try { return localStorage.getItem(P_ACTIVE) || null; } catch (e) { return null; }
};

PROFILE.active = function () {
  const id = PROFILE.activeId();
  return PROFILE.list().find((p) => p.id === id) || null;
};

/* clés de stockage propres au compte actif */
PROFILE.key = function (base) {
  const id = PROFILE.activeId();
  return "parquet_" + base + (id ? "__" + id : "");
};

PROFILE.create = function (name, emblem) {
  const l = PROFILE.list();
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const prof = {
    id,
    name: (name || "").trim().slice(0, 18) || "Joueur",
    emblem: emblem || "🏀",
    created: Date.now(),
  };
  l.push(prof);
  PROFILE.saveList(l);
  PROFILE.switchTo(id);
  return prof;
};

PROFILE.switchTo = function (id) {
  try { localStorage.setItem(P_ACTIVE, id); } catch (e) {}
  /* la mémoire longue est propre au compte : on la recharge */
  if (typeof META !== "undefined") META.state = null;
};

PROFILE.rename = function (id, name) {
  const l = PROFILE.list();
  const p = l.find((x) => x.id === id);
  if (!p) return;
  p.name = (name || "").trim().slice(0, 18) || p.name;
  PROFILE.saveList(l);
};

PROFILE.remove = function (id) {
  const l = PROFILE.list().filter((p) => p.id !== id);
  PROFILE.saveList(l);
  /* on efface aussi les données rattachées à ce compte */
  ["save_v2", "pantheon_v2", "meta_v1"].forEach((b) => {
    try { localStorage.removeItem("parquet_" + b + "__" + id); } catch (e) {}
  });
  if (PROFILE.activeId() === id) {
    const next = l[0];
    if (next) PROFILE.switchTo(next.id);
    else { try { localStorage.removeItem(P_ACTIVE); } catch (e) {} }
    if (typeof META !== "undefined") META.state = null;
  }
};

/* quelques chiffres à afficher sur la carte du compte */
PROFILE.summary = function (id) {
  let pan = [], careers = 0, best = 0;
  try { pan = JSON.parse(localStorage.getItem("parquet_pantheon_v2__" + id) || "[]"); } catch (e) {}
  try {
    const m = JSON.parse(localStorage.getItem("parquet_meta_v1__" + id) || "{}");
    careers = m.careers || 0;
  } catch (e) {}
  pan.forEach((c) => { if (c.score > best) best = c.score; });
  const inProgress = !!localStorage.getItem("parquet_save_v2__" + id);
  return { careers: Math.max(careers, pan.length), finished: pan.length, best, inProgress };
};

/* ─────────── reprise des données d'avant les comptes ───────────
   Les parties jouées avant l'arrivée des comptes vivaient sur des
   clés sans suffixe. On les rattache au premier compte créé plutôt
   que de les perdre. */
PROFILE.adoptLegacy = function (id) {
  [["parquet_save_v2", "save_v2"],
   ["parquet_pantheon_v2", "pantheon_v2"],
   ["parquet_meta_v1", "meta_v1"]].forEach(([oldKey, base]) => {
    try {
      const v = localStorage.getItem(oldKey);
      if (v != null && !localStorage.getItem("parquet_" + base + "__" + id)) {
        localStorage.setItem("parquet_" + base + "__" + id, v);
        localStorage.removeItem(oldKey);
      }
    } catch (e) {}
  });
};

PROFILE.hasLegacy = function () {
  try {
    return !!(localStorage.getItem("parquet_save_v2") ||
              localStorage.getItem("parquet_pantheon_v2") ||
              localStorage.getItem("parquet_meta_v1"));
  } catch (e) { return false; }
};

/* ── data.js ── */
/* ═══════════════════════════════════════════════════════════
   PARQUET — données statiques
   ═══════════════════════════════════════════════════════════ */

const DATA = {};

/* ─────────── postes ─────────── */

DATA.POSITIONS = [
  { id: "PG", label: "Meneur",      short: "MEN", desc: "Le cerveau. Il crée pour les autres et dicte le tempo.", hMin: 183, hMax: 196 },
  { id: "SG", label: "Arrière",     short: "ARR", desc: "Le scoreur extérieur. Adresse, mouvement sans ballon.", hMin: 190, hMax: 202 },
  { id: "SF", label: "Ailier",      short: "AIL", desc: "Le couteau suisse. Il attaque, défend et rebondit.",    hMin: 196, hMax: 207 },
  { id: "PF", label: "Ailier fort", short: "AIF", desc: "Puissance et espacement. Le lien entre les lignes.",    hMin: 202, hMax: 211 },
  { id: "C",  label: "Pivot",       short: "PIV", desc: "Le verrou. Il tient la raquette des deux côtés.",        hMin: 206, hMax: 219 },
];

/* ─────────── attributs ─────────── */

DATA.ATTR_GROUPS = [
  { id: "sco", label: "Attaque" },
  { id: "cre", label: "Création" },
  { id: "def", label: "Défense" },
  { id: "phy", label: "Physique" },
  { id: "men", label: "Mental" },
];

DATA.ATTRS = [
  { id: "finishing",  label: "Finition",       g: "sco" },
  { id: "midrange",   label: "Mi-distance",    g: "sco" },
  { id: "three",      label: "3 points",       g: "sco" },
  { id: "freeThrow",  label: "Lancers francs", g: "sco" },

  { id: "handle",     label: "Dribble",        g: "cre" },
  { id: "passing",    label: "Passe",          g: "cre" },
  { id: "iq",         label: "QI basket",      g: "cre" },

  { id: "perimeterD", label: "Déf. extérieure",g: "def" },
  { id: "interiorD",  label: "Déf. intérieure",g: "def" },
  { id: "steal",      label: "Interception",   g: "def" },
  { id: "block",      label: "Contre",         g: "def" },
  { id: "rebounding", label: "Rebond",         g: "def" },

  { id: "athleticism",label: "Athlétisme",     g: "phy" },
  { id: "stamina",    label: "Endurance",      g: "phy" },
  { id: "durability", label: "Résistance",     g: "phy" },

  { id: "clutch",     label: "Clutch",         g: "men" },
  { id: "leadership", label: "Leadership",     g: "men" },
];

/* poids par poste pour le calcul de l'OVR */
DATA.POS_WEIGHTS = {
  PG: { handle:3.0, passing:3.2, iq:2.6, three:2.4, midrange:1.7, finishing:1.4, freeThrow:.9,
        perimeterD:1.8, steal:1.3, interiorD:.3, block:.2, rebounding:.5,
        athleticism:1.5, stamina:1.2, durability:1.0, clutch:1.4, leadership:1.2 },
  SG: { handle:2.2, passing:1.5, iq:1.8, three:3.2, midrange:2.4, finishing:2.0, freeThrow:1.1,
        perimeterD:2.2, steal:1.2, interiorD:.4, block:.3, rebounding:.8,
        athleticism:2.0, stamina:1.2, durability:1.0, clutch:1.6, leadership:.8 },
  SF: { handle:1.8, passing:1.5, iq:1.8, three:2.6, midrange:2.0, finishing:2.4, freeThrow:.9,
        perimeterD:2.4, steal:1.2, interiorD:1.0, block:.7, rebounding:1.5,
        athleticism:2.3, stamina:1.2, durability:1.1, clutch:1.4, leadership:.9 },
  PF: { handle:1.1, passing:1.2, iq:1.7, three:1.9, midrange:1.6, finishing:3.0, freeThrow:.7,
        perimeterD:1.4, steal:.8, interiorD:2.4, block:1.7, rebounding:2.8,
        athleticism:2.2, stamina:1.1, durability:1.3, clutch:1.1, leadership:.9 },
  C:  { handle:.7, passing:1.1, iq:1.6, three:1.1, midrange:1.2, finishing:3.2, freeThrow:.6,
        perimeterD:.8, steal:.6, interiorD:3.2, block:2.6, rebounding:3.2,
        athleticism:2.0, stamina:1.1, durability:1.4, clutch:1.0, leadership:1.0 },
};

/* ─────────── franchises ─────────── */

const T = (id, city, name, conf, div, market, prestige, c1, c2) =>
  ({ id, city, name, full: city + " " + name, conf, div, market, prestige, c1, c2 });

DATA.TEAMS = [
  /* — Est / Atlantique — */
  T("BOS","Boston","Celtics","E","Atlantique",4,92,"#0E7A4E","#C6A664"),
  T("BKN","Brooklyn","Nets","E","Atlantique",5,68,"#26262A","#B9B4AC"),
  T("NYK","New York","Knicks","E","Atlantique",5,80,"#F0692B","#1D3A8A"),
  T("PHI","Philadelphie","76ers","E","Atlantique",4,78,"#C8102E","#125BA6"),
  T("TOR","Toronto","Raptors","E","Atlantique",4,72,"#8C2447","#E4DED2"),
  /* — Est / Central — */
  T("CHI","Chicago","Bulls","E","Central",5,82,"#B8202E","#1A1A1A"),
  T("CLE","Cleveland","Cavaliers","E","Central",2,70,"#7A2A3E","#E0A03C"),
  T("DET","Détroit","Pistons","E","Central",3,64,"#1D5AA8","#C8102E"),
  T("IND","Indiana","Pacers","E","Central",2,69,"#EDB52C","#1B2A5E"),
  T("MIL","Milwaukee","Bucks","E","Central",2,74,"#186B45","#E6DCC0"),
  /* — Est / Sud-Est — */
  T("ATL","Atlanta","Hawks","E","Sud-Est",4,66,"#D62B3E","#F0A02E"),
  T("CHA","Charlotte","Hornets","E","Sud-Est",2,56,"#17968B","#5E3E92"),
  T("MIA","Miami","Heat","E","Sud-Est",4,84,"#DE1F7C","#15C0BE"),
  T("ORL","Orlando","Magic","E","Sud-Est",3,62,"#2183C8","#AEBCC4"),
  T("WAS","Washington","Wizards","E","Sud-Est",4,58,"#182F55","#C8102E"),
  /* — Ouest / Nord-Ouest — */
  T("DEN","Denver","Nuggets","O","Nord-Ouest",3,79,"#173A69","#EFB53A"),
  T("MIN","Minnesota","Timberwolves","O","Nord-Ouest",3,65,"#227E90","#6D4FBE"),
  T("OKC","Oklahoma City","Thunder","O","Nord-Ouest",1,73,"#0E82C4","#E6602F"),
  T("POR","Portland","Trail Blazers","O","Nord-Ouest",2,67,"#C8102E","#141414"),
  T("UTA","Utah","Jazz","O","Nord-Ouest",1,63,"#2F5636","#E4B03C"),
  /* — Ouest / Pacifique — */
  T("GSW","Golden State","Warriors","O","Pacifique",5,90,"#2166BE","#EDB52C"),
  T("LAA","Los Angeles","Lakers","O","Pacifique",5,94,"#63329A","#F2C63C"),
  T("LAC","Los Angeles","Clippers","O","Pacifique",5,64,"#C8102E","#2166BE"),
  T("PHX","Phoenix","Suns","O","Pacifique",3,71,"#E4622C","#4E2C79"),
  T("SAC","Sacramento","Kings","O","Pacifique",3,57,"#63409A","#B9B4AC"),
  /* — Ouest / Sud-Ouest — */
  T("DAL","Dallas","Mavericks","O","Sud-Ouest",4,76,"#2374BE","#1A2740"),
  T("HOU","Houston","Rockets","O","Sud-Ouest",4,72,"#C8102E","#1F1F1F"),
  T("MEM","Memphis","Grizzlies","O","Sud-Ouest",2,66,"#52779F","#EDB52C"),
  T("NOP","New Orleans","Pelicans","O","Sud-Ouest",2,60,"#16294A","#B58F43"),
  T("SAS","San Antonio","Spurs","O","Sud-Ouest",3,86,"#232326","#C6CBCE"),
];

/* ─────────── universités ─────────── */

DATA.COLLEGES = [
  { name: "Ashcroft",     prestige: 95, style: "Usine à lottery picks. Le coach a envoyé 40 joueurs en pro." },
  { name: "Fairmont",     prestige: 93, style: "Bleu roi et bannières. On y gagne ou on y meurt." },
  { name: "Kingsbury",    prestige: 90, style: "Défense étouffante, discipline militaire." },
  { name: "Lorne State",  prestige: 87, style: "Le run-and-gun le plus fou du pays." },
  { name: "Cedar Valley", prestige: 82, style: "Développement patient. Les joueurs y restent 3 ans." },
  { name: "Marbury",      prestige: 78, style: "Un campus, une salle pleine, zéro pression médiatique." },
  { name: "Portsmith",    prestige: 74, style: "Le système avant le talent. Ça forme des QI basket." },
  { name: "Elmridge",     prestige: 68, style: "Petit programme, grosse liberté offensive." },
  { name: "Havenport",    prestige: 61, style: "On te laissera shooter 20 fois par match." },
  { name: "Rockwell",     prestige: 54, style: "Personne ne te regarde. À toi de forcer la porte." },
];

/* ─────────── nationalités ─────────── */

/* exposure : visibilité auprès des recruteurs (cote de draft, notoriété)
   nt       : force de la sélection nationale (issues des étés internationaux)
   mods     : ce que la culture basket locale imprime au joueur
   major    : mis en avant en tête de la recherche quand le champ est vide */
const N = (id, label, flag, path, exposure, nt, mods, note, major) =>
  ({ id, label, flag, path, exposure, nt, mods, note, major: !!major });

/* Six nations portent une identité basket totalement écrite ; elles
   ouvrent la recherche par défaut. Le monde entier reste accessible
   derrière — c'est un simulateur de carrière, pas seulement pour les
   six pays qui font l'actualité. */
DATA.NATIONS = [
  N("US","États-Unis","🇺🇸","us",  1.00, 0.95, { athleticism:+5, handle:+4, iq:-2 },
    "Lycée, AAU, NCAA. La vitrine la plus regardée du monde — et la concurrence la plus féroce.", true),
  N("FR","France","🇫🇷","euro",    0.82, 0.88, { perimeterD:+5, athleticism:+3, iq:+2 },
    "Centres de formation réputés, défenseurs athlétiques, sélection redoutable.", true),
  N("ES","Espagne","🇪🇸","euro",   0.78, 0.90, { iq:+7, passing:+6, athleticism:-3 },
    "L'école du fondamental. On y apprend à lire le jeu avant à sauter.", true),
  N("RS","Serbie","🇷🇸","euro",    0.70, 0.94, { passing:+6, iq:+5, durability:+3, athleticism:-3 },
    "Culture du poste et du jeu collectif. Un pays qui fabrique des cerveaux.", true),
  N("NG","Nigeria","🇳🇬","afr",    0.54, 0.68, { athleticism:+7, block:+4, three:-4, iq:-2 },
    "Physique d'exception, technique à construire. Le vivier le plus convoité d'Afrique.", true),
  N("BF","Burkina Faso","🇧🇫","afr",0.30, 0.44, { stamina:+7, durability:+6, perimeterD:+4, three:-4 },
    "Les Étalons. Peu de salles, des terrains de terre battue, et une endurance forgée sous quarante degrés.", true),

  /* — reste de l'Amérique du Nord et Caraïbes — */
  N("CA","Canada","🇨🇦","us",       0.88, 0.75, { handle:+4, three:+2, athleticism:+2 },
    "Génération dorée, accès direct au circuit universitaire américain."),
  N("MX","Mexique","🇲🇽","latam",   0.44, 0.38, { stamina:+3, iq:+2, athleticism:-2 },
    "Peu de projecteurs, beaucoup de travail. Il faudra sortir du pays."),
  N("DO","Rép. dominicaine","🇩🇴","latam", 0.56, 0.48, { athleticism:+4, finishing:+3, three:-3 },
    "Du playground de Saint-Domingue au circuit américain, si quelqu'un te repère."),
  N("PR","Porto Rico","🇵🇷","latam",0.58, 0.50, { three:+4, handle:+2, interiorD:-2 },
    "Tradition de shooteurs et passerelle naturelle vers les États-Unis."),
  N("CU","Cuba","🇨🇺","latam",      0.34, 0.42, { athleticism:+5, rebounding:+3, three:-4 },
    "Un vivier athlétique isolé du marché international pendant des décennies."),
  N("JM","Jamaïque","🇯🇲","latam",  0.32, 0.30, { athleticism:+6, stamina:+3, three:-3 },
    "L'explosivité des sprinters, transposée au parquet."),
  N("HT","Haïti","🇭🇹","latam",     0.26, 0.26, { durability:+5, athleticism:+3, three:-3 },
    "Très peu d'infrastructures, une diaspora qui pousse pour se faire une place."),
  N("TT","Trinité-et-Tobago","🇹🇹","latam",0.28, 0.28, { athleticism:+4, perimeterD:+3 },
    "Petite île, grande vitesse. L'exposition reste à construire."),
  N("BS","Bahamas","🇧🇸","latam",   0.36, 0.32, { athleticism:+5, finishing:+3, three:-2 },
    "Un petit pays qui a déjà produit des joueurs NBA malgré lui."),
  N("PA","Panama","🇵🇦","latam",    0.30, 0.28, { stamina:+3, iq:+2 },
    "Le basket y reste derrière le baseball, mais la relève existe."),
  N("CR","Costa Rica","🇨🇷","latam",0.26, 0.24, { stamina:+3, perimeterD:+2 },
    "Championnat modeste, ambition intacte."),
  N("GT","Guatemala","🇬🇹","latam", 0.24, 0.22, { iq:+2, freeThrow:+2 },
    "Peu de visibilité régionale, un basket encore en construction."),
  N("HN","Honduras","🇭🇳","latam",  0.22, 0.20, { athleticism:+3, stamina:+2 },
    "Un championnat local et très peu de passerelles vers l'étranger."),
  N("SV","Salvador","🇸🇻","latam",  0.22, 0.20, { perimeterD:+2, iq:+2 },
    "Petit pays, petit championnat, et une envie intacte de percer."),
  N("NI","Nicaragua","🇳🇮","latam", 0.20, 0.18, { stamina:+3, durability:+2 },
    "Le basket local vit dans l'ombre du base-ball."),

  /* — Amérique du Sud — */
  N("AR","Argentine","🇦🇷","latam", 0.60, 0.78, { passing:+5, iq:+4, clutch:+3, athleticism:-3 },
    "Le jeu de passe et la hargne. Une école du collectif."),
  N("BR","Brésil","🇧🇷","latam",    0.58, 0.68, { handle:+4, three:+3, leadership:+2 },
    "Technique, créativité, et un championnat sous-médiatisé."),
  N("VE","Venezuela","🇻🇪","latam", 0.40, 0.46, { clutch:+4, stamina:+3, three:-2 },
    "Peu de moyens, énormément de caractère."),
  N("UY","Uruguay","🇺🇾","latam",   0.38, 0.44, { iq:+4, passing:+3, durability:+2 },
    "Petit pays, grande culture tactique — une vraie tradition du jeu collectif."),
  N("CL","Chili","🇨🇱","latam",     0.36, 0.40, { perimeterD:+3, iq:+3 },
    "Championnat structuré, exposition internationale encore limitée."),
  N("CO","Colombie","🇨🇴","latam",  0.34, 0.36, { athleticism:+4, stamina:+3, three:-2 },
    "Un basket qui grandit à l'ombre du football et du cyclisme."),
  N("PE","Pérou","🇵🇪","latam",     0.26, 0.26, { stamina:+3, iq:+2 },
    "Altitude et endurance, mais un vivier encore confidentiel."),
  N("EC","Équateur","🇪🇨","latam",  0.24, 0.24, { athleticism:+3, stamina:+3 },
    "Peu de structures, une génération qui doit tout se construire."),
  N("BO","Bolivie","🇧🇴","latam",   0.22, 0.22, { stamina:+4, durability:+3, athleticism:-2 },
    "L'altitude forge des poumons ; le reste s'apprend sur le tas."),
  N("PY","Paraguay","🇵🇾","latam",  0.22, 0.22, { iq:+2, perimeterD:+2 },
    "Un championnat modeste et une exposition presque nulle à l'étranger."),

  /* — Europe de l'Ouest — */
  N("IT","Italie","🇮🇹","euro",    0.70, 0.62, { midrange:+4, iq:+3, athleticism:-2 },
    "Jeu de position, mi-distance, patience tactique."),
  N("DE","Allemagne","🇩🇪","euro", 0.74, 0.80, { three:+4, iq:+3, freeThrow:+3 },
    "Rigueur, adresse, structure. Une sélection devenue redoutable."),
  N("GB","Royaume-Uni","🇬🇧","euro",0.52, 0.42, { athleticism:+3, handle:+2, iq:-2 },
    "Le basket y reste minoritaire. Tout est à prouver deux fois."),
  N("NL","Pays-Bas","🇳🇱","euro",  0.54, 0.46, { athleticism:+3, three:+2, rebounding:+2 },
    "Grands gabarits, championnat modeste, quelques passerelles vers l'Allemagne."),
  N("BE","Belgique","🇧🇪","euro",  0.52, 0.44, { iq:+3, passing:+2 },
    "Petit championnat consciencieux, à l'ombre de ses voisins."),
  N("CH","Suisse","🇨🇭","euro",    0.48, 0.38, { iq:+3, freeThrow:+3, athleticism:-2 },
    "Structures propres, ambition modeste, peu d'exposition internationale."),
  N("AT","Autriche","🇦🇹","euro",  0.44, 0.36, { stamina:+3, perimeterD:+2 },
    "Un championnat discret qui grandit lentement."),
  N("PT","Portugal","🇵🇹","euro",  0.48, 0.42, { handle:+3, three:+2 },
    "Technique et créativité, sous-médiatisé face au football roi."),
  N("IE","Irlande","🇮🇪","euro",   0.36, 0.28, { athleticism:+3, stamina:+2 },
    "Le basket reste marginal, loin derrière le rugby et le foot gaélique."),
  N("IS","Islande","🇮🇸","euro",   0.40, 0.40, { clutch:+4, leadership:+3, athleticism:-2 },
    "Une toute petite fédération qui produit un mental hors norme."),
  N("SE","Suède","🇸🇪","euro",     0.44, 0.36, { three:+3, stamina:+3 },
    "Championnat modeste, quelques joueurs qui percent en Europe."),
  N("NO","Norvège","🇳🇴","euro",   0.40, 0.32, { durability:+3, stamina:+3 },
    "Un basket encore jeune, loin derrière le ski et le handball."),
  N("DK","Danemark","🇩🇰","euro",  0.42, 0.34, { three:+3, iq:+2 },
    "Structuré et méthodique, mais peu regardé hors d'Europe du Nord."),

  /* — Balkans, Europe centrale & de l'Est — */
  N("SI","Slovénie","🇸🇮","euro",  0.66, 0.78, { handle:+5, passing:+4, three:+2 },
    "Petit pays, meneurs immenses. La création avant tout."),
  N("HR","Croatie","🇭🇷","euro",   0.62, 0.72, { midrange:+4, interiorD:+3, iq:+2 },
    "Grands gabarits techniques et école de shooteurs intérieurs."),
  N("LT","Lituanie","🇱🇹","euro",  0.60, 0.82, { rebounding:+5, interiorD:+4, freeThrow:+2, athleticism:-2 },
    "Le basket est la religion nationale. La raquette est un sacerdoce."),
  N("ME","Monténégro","🇲🇪","euro",0.48, 0.56, { interiorD:+4, rebounding:+4, block:+3, handle:-3 },
    "Pivots massifs et rugueux. On ne recule pas sous le cercle."),
  N("BA","Bosnie-Herzégovine","🇧🇦","euro",0.46, 0.50, { three:+4, midrange:+3, athleticism:-2 },
    "Shooteurs formés dans des salles glaciales."),
  N("LV","Lettonie","🇱🇻","euro",  0.52, 0.58, { three:+5, block:+3, athleticism:-3 },
    "Grands joueurs qui shootent de très loin."),
  N("EE","Estonie","🇪🇪","euro",   0.40, 0.40, { three:+4, iq:+3, athleticism:-2 },
    "Petite fédération balte, culture du tir extérieur."),
  N("PL","Pologne","🇵🇱","euro",   0.50, 0.54, { freeThrow:+4, iq:+3, stamina:+2 },
    "Championnat en croissance, joueurs appliqués."),
  N("CZ","Tchéquie","🇨🇿","euro",  0.48, 0.50, { midrange:+3, iq:+3 },
    "École solide, sélection régulièrement compétitive en Europe."),
  N("SK","Slovaquie","🇸🇰","euro", 0.40, 0.36, { durability:+3, perimeterD:+2 },
    "Un basket discret, à l'ombre du hockey sur glace."),
  N("HU","Hongrie","🇭🇺","euro",   0.40, 0.36, { iq:+3, freeThrow:+3, athleticism:-2 },
    "Fondamentaux solides, exposition internationale limitée."),
  N("RO","Roumanie","🇷🇴","euro",  0.38, 0.34, { rebounding:+3, durability:+3 },
    "Championnat modeste, gabarits intéressants sous le cercle."),
  N("BG","Bulgarie","🇧🇬","euro",  0.36, 0.32, { midrange:+3, iq:+2 },
    "Peu de moyens, une école technique qui se transmet localement."),
  N("UA","Ukraine","🇺🇦","euro",   0.44, 0.48, { rebounding:+4, durability:+4, three:-2 },
    "Peu de moyens, beaucoup de caractère."),
  N("GE","Géorgie","🇬🇪","euro",   0.42, 0.50, { interiorD:+5, finishing:+3, handle:-3 },
    "Force brute et jeu intérieur assumé."),
  N("FI","Finlande","🇫🇮","euro",  0.46, 0.52, { three:+4, stamina:+3, leadership:+2 },
    "Collectif obstiné et adresse extérieure."),
  N("GR","Grèce","🇬🇷","euro",     0.66, 0.74, { interiorD:+4, rebounding:+3, clutch:+3 },
    "Salles bouillantes, défense dure, culture du duel."),
  N("TR","Turquie","🇹🇷","euro",   0.62, 0.68, { finishing:+3, rebounding:+3, leadership:+2 },
    "Championnat solide et public capable de porter ou d'écraser."),
  N("IL","Israël","🇮🇱","euro",    0.58, 0.60, { iq:+4, clutch:+4, perimeterD:+2 },
    "Championnat intense, salles hostiles, mental forgé tôt."),

  /* — Afrique de l'Ouest — */
  N("SN","Sénégal","🇸🇳","afr",    0.50, 0.58, { block:+5, rebounding:+4, three:-4 },
    "Académies en plein essor et protecteurs de cercle réputés."),
  N("ML","Mali","🇲🇱","afr",       0.40, 0.50, { athleticism:+4, perimeterD:+4, three:-3 },
    "Formation par l'académie régionale, gabarits longilignes."),
  N("CI","Côte d'Ivoire","🇨🇮","afr",0.42, 0.50, { perimeterD:+4, steal:+3, midrange:-2 },
    "Défenseurs infatigables, adresse à travailler."),
  N("GH","Ghana","🇬🇭","afr",      0.36, 0.46, { athleticism:+5, finishing:+4, three:-3 },
    "Accra pousse vers le circuit américain. Le physique d'abord, la technique ensuite."),
  N("GN","Guinée","🇬🇳","afr",     0.32, 0.44, { rebounding:+5, block:+4, handle:-4 },
    "Conakry produit des intérieurs longs que personne ne va chercher assez tôt."),
  N("BJ","Bénin","🇧🇯","afr",      0.30, 0.40, { perimeterD:+5, steal:+4, midrange:-3 },
    "Une école défensive née dans les tournois de quartier de Cotonou."),
  N("TG","Togo","🇹🇬","afr",       0.28, 0.38, { stamina:+5, passing:+4, athleticism:-2 },
    "Lomé joue vite et court. Il faudra partir pour être vu."),
  N("NE","Niger","🇳🇪","afr",      0.26, 0.36, { durability:+6, interiorD:+4, three:-5 },
    "Des gabarits immenses, une infrastructure quasi inexistante."),
  N("SL","Sierra Leone","🇸🇱","afr",0.26, 0.34, { athleticism:+5, clutch:+4, freeThrow:-4 },
    "Freetown, quelques paniers rouillés, et une génération qui s'accroche."),
  N("LR","Liberia","🇱🇷","afr",    0.28, 0.34, { finishing:+5, athleticism:+4, iq:-4 },
    "Liens historiques avec les États-Unis, quelques passerelles universitaires."),
  N("CV","Cap-Vert","🇨🇻","afr",   0.34, 0.42, { three:+5, handle:+3, rebounding:-4 },
    "Diaspora européenne, formation portugaise, adresse extérieure au-dessus de la moyenne."),
  N("GM","Gambie","🇬🇲","afr",     0.24, 0.32, { block:+5, rebounding:+4, three:-5 },
    "Le plus petit pays du continent, et des envergures impossibles."),
  N("GW","Guinée-Bissau","🇬🇼","afr",0.24, 0.30, { athleticism:+5, steal:+4, freeThrow:-4 },
    "Presque aucun réseau de détection. Tout dépendra d'un départ."),
  N("MR","Mauritanie","🇲🇷","afr", 0.22, 0.30, { durability:+6, rebounding:+4, handle:-5 },
    "Le désert, la chaleur, et très peu de regards extérieurs."),

  /* — Afrique du Nord — */
  N("MA","Maroc","🇲🇦","afr",      0.36, 0.44, { iq:+4, midrange:+4, athleticism:-2 },
    "Formation structurée et passerelles vers les championnats européens."),
  N("DZ","Algérie","🇩🇿","afr",    0.34, 0.42, { perimeterD:+4, clutch:+3, three:+2 },
    "Championnat compétitif, exposition internationale limitée."),
  N("TN","Tunisie","🇹🇳","afr",    0.38, 0.52, { iq:+4, freeThrow:+3, athleticism:-2 },
    "École maghrébine appliquée, peu de passerelles vers la grande ligue."),
  N("EG","Égypte","🇪🇬","afr",     0.40, 0.50, { iq:+5, passing:+3, freeThrow:+3, athleticism:-3 },
    "Le Caire forme des joueurs de système depuis des décennies."),
  N("LY","Libye","🇱🇾","afr",      0.22, 0.28, { durability:+4, interiorD:+3 },
    "Un championnat qui survit malgré tout, très peu suivi à l'étranger."),

  /* — Afrique centrale, de l'Est et australe — */
  N("CD","RD Congo","🇨🇩","afr",   0.42, 0.48, { rebounding:+5, athleticism:+4, handle:-4 },
    "Un vivier immense et presque inexploré."),
  N("CG","Congo","🇨🇬","afr",      0.28, 0.36, { rebounding:+4, block:+4, freeThrow:-3 },
    "Des intérieurs bruts et un championnat sous-financé."),
  N("CM","Cameroun","🇨🇲","afr",   0.48, 0.54, { athleticism:+5, interiorD:+4, freeThrow:-3 },
    "Détectés tard, souvent très grands, très bruts."),
  N("TD","Tchad","🇹🇩","afr",      0.20, 0.24, { durability:+5, interiorD:+3 },
    "Presque aucune structure, un potentiel presque entièrement à découvrir."),
  N("SD","Soudan","🇸🇩","afr",     0.24, 0.30, { block:+5, athleticism:+4, three:-4 },
    "Des envergures immenses et un accès au haut niveau très rare."),
  N("SS","Soudan du Sud","🇸🇸","afr",0.44, 0.56, { block:+5, athleticism:+4, rebounding:+3, three:-4 },
    "Envergures irréelles. Une génération sortie de nulle part."),
  N("ET","Éthiopie","🇪🇹","afr",   0.24, 0.30, { stamina:+7, iq:+2, athleticism:-2 },
    "Le pays de l'endurance pure, transposée à un sport où elle surprend."),
  N("KE","Kenya","🇰🇪","afr",      0.28, 0.36, { stamina:+6, athleticism:+3, interiorD:-2 },
    "Une culture de l'endurance transposée au parquet."),
  N("UG","Ouganda","🇺🇬","afr",    0.26, 0.34, { athleticism:+5, rebounding:+3, three:-3 },
    "Kampala envoie ses meilleurs vers l'académie continentale."),
  N("RW","Rwanda","🇷🇼","afr",     0.34, 0.38, { iq:+4, passing:+3, stamina:+3 },
    "Kigali accueille désormais la ligue continentale : la vitrine s'ouvre."),
  N("TZ","Tanzanie","🇹🇿","afr",   0.24, 0.28, { stamina:+5, durability:+3 },
    "Un basket en développement, encore loin des radars internationaux."),
  N("ZM","Zambie","🇿🇲","afr",     0.26, 0.30, { athleticism:+4, rebounding:+3 },
    "Peu de structures, un potentiel athlétique réel et sous-exploité."),
  N("ZW","Zimbabwe","🇿🇼","afr",   0.26, 0.28, { perimeterD:+3, stamina:+3 },
    "Un championnat modeste, loin derrière le cricket et le rugby."),
  N("BW","Botswana","🇧🇼","afr",   0.24, 0.26, { durability:+4, interiorD:+3 },
    "Peu peuplé, peu de structures, un vivier presque entièrement fermé."),
  N("NA","Namibie","🇳🇦","afr",    0.24, 0.26, { athleticism:+4, stamina:+3 },
    "De grands espaces, très peu de salles couvertes."),
  N("MZ","Mozambique","🇲🇿","afr", 0.22, 0.26, { athleticism:+4, durability:+3 },
    "Un basket en construction, presque sans exposition extérieure."),
  N("MG","Madagascar","🇲🇬","afr", 0.22, 0.26, { perimeterD:+3, stamina:+3 },
    "Une île isolée des grands circuits de détection."),
  N("ZA","Afrique du Sud","🇿🇦","afr",0.38, 0.42, { stamina:+4, perimeterD:+3, interiorD:+2 },
    "Structures solides, mais le basket reste derrière le rugby et le football."),
  N("AO","Angola","🇦🇴","afr",     0.40, 0.60, { stamina:+4, iq:+3, athleticism:+2 },
    "La référence historique du continent, un jeu rapide et collectif."),

  /* — Moyen-Orient — */
  N("JO","Jordanie","🇯🇴","asia",  0.30, 0.34, { iq:+3, perimeterD:+2 },
    "Un championnat sérieux, mais un marché régional saturé de talents plus visibles."),
  N("LB","Liban","🇱🇧","asia",     0.34, 0.42, { three:+4, passing:+3, iq:+2 },
    "Salles passionnées, jeu rapide, tradition du tir extérieur."),
  N("SA","Arabie saoudite","🇸🇦","asia",0.28, 0.26, { athleticism:+3, finishing:+2 },
    "Des moyens qui grandissent vite, une culture basket encore jeune."),
  N("AE","Émirats arabes unis","🇦🇪","asia",0.30, 0.24, { iq:+2, freeThrow:+2 },
    "Infrastructures modernes, vivier local encore restreint."),
  N("QA","Qatar","🇶🇦","asia",     0.28, 0.22, { freeThrow:+3, iq:+2 },
    "Des salles neuves, une base de joueurs encore réduite."),
  N("KW","Koweït","🇰🇼","asia",    0.24, 0.20, { iq:+2, perimeterD:+2 },
    "Championnat modeste du Golfe, peu de passerelles internationales."),

  /* — Asie centrale et du Sud — */
  N("KZ","Kazakhstan","🇰🇿","asia",0.28, 0.26, { rebounding:+3, durability:+3 },
    "Immense, peu peuplé de joueurs de haut niveau, en développement."),
  N("UZ","Ouzbékistan","🇺🇿","asia",0.24, 0.22, { durability:+3, interiorD:+2 },
    "Un basket qui cherche encore sa place dans le paysage sportif régional."),
  N("MN","Mongolie","🇲🇳","asia",  0.20, 0.18, { stamina:+4, durability:+3 },
    "Très peu de structures, un basket presque confidentiel."),
  N("IN","Inde","🇮🇳","asia",      0.30, 0.20, { athleticism:+3, handle:+2, three:-2 },
    "Un marché immense, un basket encore minoritaire face au cricket."),
  N("PK","Pakistan","🇵🇰","asia",  0.18, 0.14, { durability:+3, stamina:+2 },
    "Le cricket domine tout. Le basket reste à peine visible."),
  N("BD","Bangladesh","🇧🇩","asia",0.16, 0.12, { stamina:+3, iq:+2 },
    "Un basket embryonnaire, sans réseau de détection structuré."),
  N("LK","Sri Lanka","🇱🇰","asia", 0.16, 0.12, { perimeterD:+2, iq:+2 },
    "Très peu de visibilité internationale pour ce sport sur l'île."),
  N("NP","Népal","🇳🇵","asia",     0.14, 0.10, { stamina:+4, durability:+2 },
    "Le basket y existe à peine en dehors de quelques clubs de Katmandou."),

  /* — Asie de l'Est — */
  N("JP","Japon","🇯🇵","asia",     0.54, 0.48, { three:+4, stamina:+4, handle:+3, interiorD:-4 },
    "Rythme élevé, adresse extérieure, gabarits plus légers."),
  N("CN","Chine","🇨🇳","asia",     0.58, 0.52, { finishing:+3, rebounding:+3, freeThrow:+2, athleticism:-3 },
    "Structures massives, marché énorme, exigence institutionnelle."),
  N("KR","Corée du Sud","🇰🇷","asia",0.48, 0.44, { iq:+4, three:+3, athleticism:-2 },
    "Discipline collective et adresse extérieure, championnat très structuré."),
  N("MO","Macao","🇲🇴","asia",     0.20, 0.16, { three:+3, iq:+2 },
    "Très petit territoire, presque aucune exposition internationale."),

  /* — Asie du Sud-Est — */
  N("PH","Philippines","🇵🇭","asia",0.44, 0.42, { handle:+5, three:+3, rebounding:-4 },
    "Le pays le plus fou de basket d'Asie. Petits joueurs, immense technique."),
  N("ID","Indonésie","🇮🇩","asia", 0.30, 0.24, { athleticism:+3, stamina:+3 },
    "Un immense pays où le basket grandit derrière le badminton et le foot."),
  N("TH","Thaïlande","🇹🇭","asia", 0.28, 0.22, { handle:+3, stamina:+2 },
    "Un championnat en développement, peu de visibilité hors d'Asie."),
  N("VN","Vietnam","🇻🇳","asia",   0.26, 0.20, { stamina:+3, perimeterD:+2 },
    "Une ligue jeune, en pleine croissance, encore peu regardée."),
  N("MY","Malaisie","🇲🇾","asia",  0.26, 0.20, { handle:+3, three:+2 },
    "Un basket urbain en expansion, sans grande exposition internationale."),
  N("SG","Singapour","🇸🇬","asia", 0.30, 0.20, { iq:+3, freeThrow:+2 },
    "Petit mais structuré, un championnat professionnel encore jeune."),
  N("MM","Myanmar","🇲🇲","asia",   0.16, 0.12, { stamina:+3, durability:+2 },
    "Un basket embryonnaire, presque aucune structure de détection."),
  N("KH","Cambodge","🇰🇭","asia",  0.16, 0.12, { stamina:+3, iq:+2 },
    "Très peu de moyens, un vivier presque entièrement inexploré."),

  /* — Océanie — */
  N("AU","Australie","🇦🇺","oce",  0.72, 0.80, { iq:+4, durability:+4, perimeterD:+3 },
    "Ligue professionnelle ouverte aux joueurs de 17 ans. On y grandit vite."),
  N("NZ","Nouvelle-Zélande","🇳🇿","oce",0.46, 0.44, { rebounding:+4, leadership:+3, three:-2 },
    "Peu de monde regarde, mais la culture du combat est réelle."),
  N("FJ","Fidji","🇫🇯","oce",      0.22, 0.20, { athleticism:+5, rebounding:+3, three:-3 },
    "Un physique redoutable, hérité du rugby, presque jamais exploité au basket."),
  N("PG","Papouasie-Nouvelle-Guinée","🇵🇬","oce",0.18, 0.16, { athleticism:+4, durability:+3 },
    "Un potentiel athlétique réel, une détection quasiment inexistante."),
  N("WS","Samoa","🇼🇸","oce",      0.20, 0.18, { athleticism:+5, interiorD:+3, three:-3 },
    "Des gabarits impressionnants, très peu tournés vers le basket."),
];

/* ─────────── origines ─────────── */

DATA.ORIGINS = [
  {
    id: "playground", label: "Le playground",
    desc: "Tu as appris sur le bitume, sans coach, sans arbitre. Le ballon et l'ego.",
    mods: { handle:+9, athleticism:+7, finishing:+4, iq:-7, perimeterD:-4, freeThrow:-5 },
    rep: 14, pot: [74, 93],
    tag: "Dribble & athlétisme, QI basket brut",
  },
  {
    id: "academy", label: "Le centre de formation",
    desc: "Structure, vidéo, musculation, école le matin. Une machine à fabriquer des pros.",
    mods: { iq:+8, passing:+5, perimeterD:+5, midrange:+3, athleticism:-3, handle:-2 },
    rep: 26, pot: [72, 89],
    tag: "Équilibré, très bon QI basket",
  },
  {
    id: "legacy", label: "Fils de pro",
    desc: "Tu as grandi dans les vestiaires. Tu connais le métier avant de l'avoir exercé.",
    mods: { iq:+10, leadership:+8, freeThrow:+5, midrange:+4, athleticism:-5, clutch:+3 },
    rep: 40, pot: [70, 87],
    tag: "Notoriété de départ élevée, pression énorme",
  },
  {
    id: "raw", label: "Découvert à 16 ans",
    desc: "Tu mesurais 2,03 m au lycée et quelqu'un t'a mis un ballon dans les mains.",
    mods: { athleticism:+8, rebounding:+6, block:+5, three:-10, handle:-8, iq:-6 },
    rep: 6, pot: [78, 96],
    tag: "Très brut, potentiel maximal",
  },
  {
    id: "gym", label: "Le rat de gymnase",
    desc: "Mille tirs par jour depuis tes onze ans. Le geste est déjà une signature.",
    mods: { three:+11, freeThrow:+9, midrange:+7, athleticism:-6, interiorD:-5, rebounding:-4 },
    rep: 18, pot: [73, 91],
    tag: "Adresse d'élite, physique en retard",
  },
  {
    id: "prodigy", label: "Prodige national",
    desc: "Classé numéro un de ta génération depuis la quatrième. Tout le monde attend.",
    mods: { finishing:+4, three:+4, handle:+4, passing:+3, iq:+3, durability:-4 },
    rep: 55, pot: [72, 92],
    tag: "Départ lancé, chute possible",
  },
];

DATA.ORIGINS.push(
  {
    id: "refugee", label: "Arrivé sans rien",
    desc: "Un camp, une frontière, puis un gymnase municipal qui laissait la porte ouverte le soir.",
    mods: { durability:+8, stamina:+7, leadership:+5, three:-6, iq:-3 },
    rep: 4, pot: [76, 96],
    tag: "Endurant, invisible au départ",
  },
  {
    id: "military", label: "Discipline familiale",
    desc: "Réveil à cinq heures, chaussures alignées, aucune excuse tolérée depuis tes six ans.",
    mods: { freeThrow:+7, iq:+6, durability:+5, handle:-5, athleticism:-3 },
    rep: 12, pot: [72, 89],
    tag: "Fondamentaux irréprochables, créativité bridée",
  },
  {
    id: "twosport", label: "Venu d'un autre sport",
    desc: "Tu jouais ailier au football jusqu'à seize ans. Le basket t'a pris par surprise.",
    mods: { athleticism:+9, rebounding:+5, perimeterD:+4, three:-9, iq:-7, handle:-5 },
    rep: 10, pot: [80, 98],
    tag: "Athlète brut, technique à écrire",
  },
  {
    id: "smalltown", label: "La salle du village",
    desc: "Cent quarante habitants, un panneau dans une grange, et personne pour te dire que c'était impossible.",
    mods: { midrange:+6, freeThrow:+5, clutch:+5, perimeterD:-4 },
    rep: 5, pot: [75, 95],
    tag: "Tir pur, aucune exposition",
  },
  {
    id: "streetlegend", label: "Légende du tournoi d'été",
    desc: "Ton nom circule dans toute la ville depuis tes quinze ans, mais aucun club officiel ne t'a jamais vu.",
    mods: { handle:+8, passing:+6, athleticism:+4, perimeterD:-6, iq:-4 },
    rep: 22, pot: [77, 96],
    tag: "Spectaculaire, indiscipliné",
  },
  {
    id: "labrat", label: "Produit de laboratoire",
    desc: "Capteurs, données, préparation individualisée depuis tes douze ans. Une carrière planifiée.",
    mods: { iq:+7, stamina:+6, durability:+6, three:+3, clutch:-5, leadership:-3 },
    rep: 20, pot: [74, 92],
    tag: "Optimisé, mais sans instinct",
  }
);

/* ─────────── mentalités ─────────── */

DATA.MENTALITIES = [
  { id:"grinder", label:"Bourreau de travail", desc:"Premier arrivé, dernier parti. La progression ne s'arrête jamais.",
    growth: 1.22, tag:"+22 % de progression annuelle", mods:{ stamina:+5, durability:+4 } },
  { id:"killer", label:"Tueur né", desc:"Tu veux le ballon quand il reste six secondes et que la salle hurle.",
    growth: 1.0, tag:"Clutch d'élite, playoffs relevés", mods:{ clutch:+14, midrange:+5, leadership:+3 } },
  { id:"general", label:"Général sur le terrain", desc:"Tu lis la défense avant qu'elle se mette en place.",
    growth: 1.06, tag:"QI et leadership supérieurs", mods:{ iq:+11, passing:+7, leadership:+9 } },
  { id:"showman", label:"Showman", desc:"Le basket est un spectacle. Tu joues pour la salle autant que pour le score.",
    growth: 0.98, tag:"Notoriété et contrats pub doublés", mods:{ handle:+8, athleticism:+4 }, fame: 2.0, rep: 18 },
  { id:"stoic", label:"Compétiteur silencieux", desc:"Pas de déclaration, pas de drama. Juste 82 matchs par saison.",
    growth: 1.08, tag:"Moral stable, corps solide", mods:{ durability:+9, stamina:+6, iq:+4 }, calm: true },
];

DATA.MENTALITIES.push(
  { id:"student", label:"Étudiant du jeu", desc:"Tu regardes plus de vidéo que de matchs. Tu annotes, tu classes, tu recommences.",
    growth: 1.14, tag:"Progression régulière, lecture supérieure", mods:{ iq:+8, passing:+4, perimeterD:+3 } },
  { id:"chip", label:"Une revanche à prendre", desc:"On t'a dit non trop souvent. Tu joues contre ces gens-là, tous les soirs.",
    growth: 1.10, tag:"Progresse quand le moral baisse", mods:{ clutch:+7, finishing:+4, durability:+3 }, spite: true },
  { id:"zen", label:"Imperturbable", desc:"Ni les sifflets, ni les compliments. Tu joues au même rythme intérieur.",
    growth: 1.02, tag:"Forme et moral très stables", mods:{ freeThrow:+6, iq:+4, stamina:+4 }, calm: true },
  { id:"volatile", label:"Sanguin", desc:"Quand ça part, c'est irrésistible. Quand ça casse, tout casse.",
    growth: 1.05, tag:"Écarts de performance extrêmes", mods:{ clutch:+9, athleticism:+5, leadership:-6 }, swing: true }
);

/* ─────────── entourage ─────────── */

DATA.ENTOURAGES = [
  { id:"family", label:"La famille", desc:"Ta mère décroche encore le téléphone à ta place. Tu es protégé du bruit.",
    tag:"Moral très stable", moraleFloor: 45 },
  { id:"shark", label:"Un agent requin", desc:"Il négocie comme il respire. Il te trouvera toujours un dollar de plus.",
    tag:"+18 % sur tous les contrats", money: 1.18 },
  { id:"crew", label:"Le crew du quartier", desc:"Les mêmes cinq gars depuis le collège. Loyaux, bruyants, imprévisibles.",
    tag:"Notoriété accrue, incidents fréquents", rep: 12, chaos: true },
  { id:"mentor", label:"Un ancien joueur", desc:"Quinze ans de carrière derrière lui. Il sait exactement ce qui t'attend.",
    tag:"Progression et prévention des blessures", growth: 1.12, injuryGuard: 0.75 },
  { id:"solo", label:"Personne", desc:"Tu gères tout seul. Moins de bruit, moins de filet de sécurité.",
    tag:"Aucun parasite, aucun soutien", money: 1.06, lonely: true },
];

DATA.ENTOURAGES.push(
  { id:"pastor", label:"Une figure du quartier", desc:"Un éducateur qui a vu passer trois générations et qui ne te lâche rien.",
    tag:"Moral protégé, réputation locale forte", moraleFloor: 40, rep: 6 },
  { id:"clan", label:"Toute la famille élargie", desc:"Onze personnes vivent de tes revenus et chacune a un avis sur ta carrière.",
    tag:"Pression financière constante", money: 0.82, chaos: true, rep: 5 },
  { id:"pro", label:"Une structure professionnelle", desc:"Nutritionniste, préparateur mental, chauffeur. Tout est délégué, rien n'est laissé au hasard.",
    tag:"Corps et forme optimisés, coûteux", growth: 1.08, injuryGuard: 0.7, money: 0.9 },
  { id:"partnerfirst", label:"Ton couple avant tout", desc:"Vous décidez à deux, y compris les transferts. Ça vous a déjà coûté cher.",
    tag:"Moral très haut, mobilité réduite", moraleFloor: 52 }
);

/* ─────────── badges (36) ─────────── */
/* tier(p, c) → 0 (verrouillé) à 4 (légende) ; c = contexte carrière */

const gate = (v, a, b, cc, d) => v >= d ? 4 : v >= cc ? 3 : v >= b ? 2 : v >= a ? 1 : 0;
const A = (p, k) => p.attrs[k];

DATA.BADGES = [
  /* — tir — */
  { id:"hot",     n:"Main chaude",         i:"🔥", c:"Tir",      t:(p)=>gate(A(p,"three")*.5+A(p,"midrange")*.5, 74,81,88,94) },
  { id:"range",   n:"Portée illimitée",    i:"🎯", c:"Tir",      t:(p)=>gate(A(p,"three"), 78,85,91,96) },
  { id:"corner",  n:"Sniper de corner",    i:"📐", c:"Tir",      t:(p)=>gate(A(p,"three")*.7+A(p,"iq")*.3, 72,80,87,93) },
  { id:"surgeon", n:"Chirurgien",          i:"🔪", c:"Tir",      t:(p)=>gate(A(p,"midrange"), 76,84,90,95) },
  { id:"catch",   n:"Catch & shoot",       i:"⚡", c:"Tir",      t:(p)=>gate(A(p,"three")*.6+A(p,"iq")*.4, 70,78,86,92) },
  { id:"pullup",  n:"Pull-up mortel",      i:"🌀", c:"Tir",      t:(p)=>gate(A(p,"midrange")*.55+A(p,"handle")*.45, 74,82,88,94) },
  { id:"stripe",  n:"Sur la ligne",        i:"🎽", c:"Tir",      t:(p)=>gate(A(p,"freeThrow"), 78,85,91,96) },
  { id:"volume",  n:"Volume de feu",       i:"💥", c:"Tir",      t:(p,c)=>gate(c.bestPpg||0, 20,25,30,34) },

  /* — finition — */
  { id:"poster",  n:"Poster",              i:"🖼️", c:"Finition", t:(p)=>gate(A(p,"athleticism")*.6+A(p,"finishing")*.4, 78,85,91,96) },
  { id:"acro",    n:"Acrobate",            i:"🤸", c:"Finition", t:(p)=>gate(A(p,"finishing")*.6+A(p,"handle")*.4, 74,82,88,94) },
  { id:"contact", n:"Béton armé",          i:"🧱", c:"Finition", t:(p)=>gate(A(p,"finishing")*.5+A(p,"athleticism")*.25+A(p,"durability")*.25, 75,83,89,95) },
  { id:"roll",    n:"Roi du pick & roll",  i:"🔗", c:"Finition", t:(p)=>gate(A(p,"finishing")*.5+A(p,"iq")*.5, 74,82,88,94) },
  { id:"post",    n:"Dos au panier",       i:"🐻", c:"Finition", t:(p)=>gate(A(p,"finishing")*.55+A(p,"interiorD")*.2+A(p,"iq")*.25, 76,84,90,95) },

  /* — création — */
  { id:"maestro", n:"Maestro",             i:"🎼", c:"Création", t:(p)=>gate(A(p,"passing"), 78,85,91,96) },
  { id:"vision",  n:"Vision périphérique", i:"👁️", c:"Création", t:(p)=>gate(A(p,"passing")*.6+A(p,"iq")*.4, 76,84,90,95) },
  { id:"streets", n:"Handles de rue",      i:"🪀", c:"Création", t:(p)=>gate(A(p,"handle"), 79,86,92,97) },
  { id:"first",   n:"Premier pas",         i:"💨", c:"Création", t:(p)=>gate(A(p,"athleticism")*.55+A(p,"handle")*.45, 77,85,91,96) },
  { id:"metro",   n:"Métronome",           i:"⏱️", c:"Création", t:(p)=>gate(A(p,"iq")*.5+A(p,"stamina")*.5, 76,83,89,95) },

  /* — défense — */
  { id:"clamps",  n:"Cadenas",             i:"🔒", c:"Défense",  t:(p)=>gate(A(p,"perimeterD"), 78,85,91,96) },
  { id:"wall",    n:"Intimidateur",        i:"🚫", c:"Défense",  t:(p)=>gate(A(p,"block")*.55+A(p,"interiorD")*.45, 77,85,91,96) },
  { id:"hands",   n:"Mains rapides",       i:"🤲", c:"Défense",  t:(p)=>gate(A(p,"steal"), 76,84,90,95) },
  { id:"vacuum",  n:"Aspirateur",          i:"🧲", c:"Défense",  t:(p)=>gate(A(p,"rebounding"), 78,86,92,96) },
  { id:"crash",   n:"Rebond offensif",     i:"🪓", c:"Défense",  t:(p)=>gate(A(p,"rebounding")*.6+A(p,"athleticism")*.4, 76,84,90,95) },
  { id:"rotate",  n:"Rotation parfaite",   i:"🧭", c:"Défense",  t:(p)=>gate(A(p,"iq")*.5+A(p,"interiorD")*.25+A(p,"perimeterD")*.25, 76,84,90,95) },
  { id:"stopper", n:"Anti-système",        i:"🛡️", c:"Défense",  t:(p)=>gate(A(p,"perimeterD")*.45+A(p,"interiorD")*.25+A(p,"iq")*.3, 78,85,91,96) },

  /* — physique & mental — */
  { id:"motor",   n:"Moteur increvable",   i:"🫀", c:"Mental",   t:(p)=>gate(A(p,"stamina"), 78,85,91,96) },
  { id:"iron",    n:"Homme de fer",        i:"⚙️", c:"Mental",   t:(p,c)=>gate(Math.min(99,(c.gp82||0)*22+A(p,"durability")*.5), 60,72,84,94) },
  { id:"assassin",n:"Assassin du money-time",i:"🕰️",c:"Mental",  t:(p)=>gate(A(p,"clutch"), 78,86,92,97) },
  { id:"mamba",   n:"Mentalité de tueur",  i:"🐍", c:"Mental",   t:(p)=>gate(A(p,"clutch")*.6+A(p,"leadership")*.4, 78,85,91,96) },
  { id:"captain", n:"Capitaine",           i:"©️", c:"Mental",   t:(p)=>gate(A(p,"leadership"), 76,84,90,96) },
  { id:"sponge",  n:"Éponge",              i:"📚", c:"Mental",   t:(p)=>gate(A(p,"iq"), 79,86,92,97) },

  /* — carrière — */
  { id:"franchise",n:"Franchise player",   i:"🏛️", c:"Carrière", t:(p,c)=>gate((c.yearsSameTeam||0)*10, 30,50,80,110) },
  { id:"globe",   n:"Globe-trotter",       i:"🧳", c:"Carrière", t:(p,c)=>gate((c.teamsPlayed||1)*22, 44,66,88,110) },
  { id:"iron82",  n:"Saison pleine",       i:"📅", c:"Carrière", t:(p,c)=>gate((c.full82||0)*30, 30,60,90,120) },
  { id:"triple",  n:"Machine à triple-double",i:"3️⃣",c:"Carrière",t:(p,c)=>gate((c.tripleSeasons||0)*34, 34,68,100,134) },
  { id:"icon",    n:"Icône culturelle",    i:"👑", c:"Carrière", t:(p,c)=>gate((c.fame||0), 45,65,82,94) },
];

/* ─────────── blessures ─────────── */

DATA.INJURIES = [
  { n:"entorse de la cheville",        min: 3,  max: 11, sev:1, hit:{} },
  { n:"élongation aux ischio-jambiers",min: 5,  max: 14, sev:1, hit:{ athleticism:-1 } },
  { n:"fracture de la main",           min: 12, max: 26, sev:2, hit:{ three:-2, freeThrow:-1 } },
  { n:"entorse du poignet",            min: 6,  max: 16, sev:1, hit:{ three:-1 } },
  { n:"déchirure du ménisque",         min: 20, max: 42, sev:3, hit:{ athleticism:-3, stamina:-2 } },
  { n:"fasciite plantaire",            min: 10, max: 24, sev:2, hit:{ athleticism:-2, stamina:-2 } },
  { n:"commotion cérébrale",           min: 2,  max: 8,  sev:1, hit:{} },
  { n:"rupture du ligament croisé",    min: 55, max: 82, sev:4, hit:{ athleticism:-8, handle:-3, stamina:-4 } },
  { n:"rupture du tendon d'Achille",   min: 60, max: 82, sev:5, hit:{ athleticism:-11, stamina:-5, durability:-4 } },
  { n:"hernie discale",                min: 18, max: 40, sev:3, hit:{ athleticism:-4, durability:-3 } },
  { n:"luxation de l'épaule",          min: 14, max: 30, sev:2, hit:{ finishing:-2, three:-2 } },
  { n:"fracture de fatigue au pied",   min: 22, max: 46, sev:3, hit:{ athleticism:-4, stamina:-2 } },
];

/* ─────────── équipementiers ─────────── */

DATA.SHOES = [
  { id:"none",   n:"Aucun",          tier:0, base:0 },
  { id:"local",  n:"Meridian",       tier:1, base:120000 },
  { id:"rise",   n:"Rise Athletic",  tier:2, base:900000 },
  { id:"apex",   n:"APEX",           tier:3, base:4200000 },
  { id:"vertex", n:"Vertex",         tier:4, base:14000000 },
  { id:"sig",    n:"Vertex Signature",tier:5, base:38000000 },
];

/* ─────────── programmes d'intersaison ───────────
   w    : poids de tirage
   when : conditions d'apparition (poste, âge, lacune, argent)
   cost : coût éventuel                                        */

const TR = (id, label, desc, t, mods, o) =>
  Object.assign({ id, label, desc, t, mods, w: 3 }, o || {});

const weak = (k, v) => (p) => p.attrs[k] < v;
const strong = (k, v) => (p) => p.attrs[k] >= v;

DATA.TRAINING = [
  /* — tir — */
  TR("shoot_gun", "La machine à tirer", "Huit cents tirs par jour, un rebondeur mécanique, personne d'autre dans la salle.",
     "Adresse extérieure", { three: 6, midrange: 3, freeThrow: 2 }),
  TR("shoot_guru", "Un gourou du tir", "Un ancien shooteur devenu consultant reconstruit ta mécanique de zéro. Deux mois de doute avant le déclic.",
     "Refonte complète du tir", { three: 9, midrange: 5, freeThrow: 4, form: -8 }, { w: 2, when: weak("three", 78) }),
  TR("shoot_move", "Tir en mouvement", "Sortie d'écran, réception, épaules alignées. Mille répétitions sans ballon avant d'en toucher un.",
     "Catch and shoot", { three: 5, iq: 3, stamina: 3 }),
  TR("shoot_deep", "Étendre la zone", "Reculer d'un mètre chaque semaine jusqu'à ce que la ligne devienne une formalité.",
     "Portée illimitée", { three: 7, freeThrow: -1 }, { when: strong("three", 74) }),
  TR("shoot_ft", "La ligne des lancers", "Deux cents lancers avant de quitter la salle. Tous les jours. Sans exception.",
     "Lancers francs", { freeThrow: 8, clutch: 2 }, { when: weak("freeThrow", 80) }),

  /* — création — */
  TR("hand_street", "Retour au playground", "Tu repasses l'été sur le bitume de ton quartier, contre des types qui n'ont rien à perdre.",
     "Dribble et culot", { handle: 6, clutch: 3, athleticism: 2, iq: -1 }),
  TR("hand_pnr", "Le pick and roll au scalpel", "Vidéo le matin, terrain l'après-midi. Lire la défense avant même qu'elle se place.",
     "Lecture du jeu", { iq: 6, passing: 5, handle: 2 }),
  TR("hand_pass", "Passe à une main", "Travail des angles, des passes dans le trafic, des transmissions à contretemps.",
     "Vision et passe", { passing: 7, iq: 2 }),
  TR("hand_iso", "Jeu en isolation", "Un défenseur, un ballon, huit secondes. Cent fois par séance.",
     "Création individuelle", { handle: 5, midrange: 4, clutch: 3 }),

  /* — finition — */
  TR("fin_contact", "Finir dans le contact", "Un préparateur te percute avec un bouclier à chaque prise d'appui. Tous les jours.",
     "Finition et robustesse", { finishing: 6, durability: 3, interiorD: 2 }),
  TR("fin_floater", "Le floater", "L'arme des petits contre les géants. Six semaines pour la rendre naturelle.",
     "Finition à mi-distance", { finishing: 5, midrange: 4 }, { when: (p) => p.height < 202 }),
  TR("fin_post", "Jeu dos au panier", "Un ancien pivot t'apprend les appuis, le sweep, le crochet. Un art presque perdu.",
     "Poste bas", { finishing: 7, interiorD: 3, iq: 2 }, { when: (p) => p.height >= 200 }),
  TR("fin_dunk", "Détente verticale", "Pliométrie, survitesse, travail de cheville. Attraper le cercle à deux mains, puis plus haut.",
     "Athlétisme et finition", { athleticism: 7, finishing: 3 }, { when: (p) => p.age <= 27 }),

  /* — défense — */
  TR("def_feet", "Jeu de jambes défensif", "Glissements, changements de direction, mains hautes. Le travail le plus ingrat qui soit.",
     "Défense extérieure", { perimeterD: 7, stamina: 3 }),
  TR("def_rim", "Protéger le cercle", "Timing, verticalité, lecture des trajectoires. Contrer sans faire faute.",
     "Défense intérieure", { block: 6, interiorD: 5 }, { when: (p) => p.height >= 198 }),
  TR("def_hands", "Mains actives", "Anticipation des lignes de passe et arrachages. Un été à voler des ballons.",
     "Interceptions", { steal: 7, iq: 2 }),
  TR("def_reb", "La bataille du rebond", "Placement, écran retard, second effort. Trois cents rebonds par séance.",
     "Rebond", { rebounding: 7, athleticism: 2 }),
  TR("def_switch", "Défendre tous les postes", "Apprendre à tenir un meneur et un pivot dans la même possession.",
     "Polyvalence défensive", { perimeterD: 4, interiorD: 4, iq: 3 }, { when: (p) => p.attrs.iq >= 65 }),

  /* — corps — */
  TR("body_mass", "Prise de masse", "Six kilos de muscle, quatre repas par jour, et un premier pas légèrement plus lent.",
     "Puissance", { finishing: 4, interiorD: 4, rebounding: 3, durability: 3, athleticism: -3 }),
  TR("body_lean", "Affûtage", "Perdre cinq kilos pour retrouver de la vitesse et soulager les articulations.",
     "Vitesse et endurance", { athleticism: 5, stamina: 6, health: 8, interiorD: -2 }, { when: (p) => p.age >= 26 }),
  TR("body_prehab", "Prévention pure", "Mobilité, chaîne postérieure, sommeil encadré. Zéro highlight, dix ans de carrière.",
     "Résistance et santé", { durability: 8, stamina: 4, health: 16 }),
  TR("body_altitude", "Stage en altitude", "Trois semaines à deux mille mètres. Les poumons brûlent, puis s'ouvrent.",
     "Endurance", { stamina: 9, health: 6, form: 6 }, { w: 2 }),
  TR("body_boxing", "Boxe et gainage", "Un été dans une salle de boxe. Le pied, l'équilibre, la sanction dans le duel.",
     "Physique et clutch", { athleticism: 4, durability: 4, clutch: 4 }, { w: 2 }),
  TR("body_rest", "Ne rien faire", "Deux mois sans ballon. Le corps répare ce que la saison a cassé.",
     "Récupération totale", { health: 26, form: 18, morale: 8, athleticism: -1 }, { when: (p) => p.health < 70 }),

  /* — mental & jeu — */
  TR("mind_film", "Salle vidéo", "Trois cents heures de match découpées avec un assistant. Tu commences à voir avant les autres.",
     "QI basket", { iq: 8, passing: 3, perimeterD: 2 }),
  TR("mind_sport", "Préparation mentale", "Respiration, visualisation, gestion du money-time. Un travail invisible et décisif.",
     "Clutch et moral", { clutch: 7, morale: 10, form: 4 }, { w: 2 }),
  TR("mind_lead", "Apprendre à parler", "Prise de parole, gestion de groupe. Un vestiaire ne se dirige pas à la voix la plus forte.",
     "Leadership", { leadership: 8, iq: 2 }, { when: (p) => p.career.seasons >= 2 }),

  /* — exotiques — */
  TR("exo_league", "Ligue d'été à l'étranger", "Deux mois dans un championnat exotique, des salles pleines et zéro filet de sécurité.",
     "Progression large, fatigue", { finishing: 3, three: 3, handle: 3, clutch: 3, health: -10, rep: 4 }, { w: 2 }),
  TR("exo_legend", "Séances avec une légende", "Un ancien MVP accepte de te prendre trois semaines. Il ne te ménagera pas.",
     "Progression rare", { iq: 5, midrange: 5, clutch: 5, leadership: 3 }, { w: 1, when: (p) => p.rep >= 45 }),
  TR("exo_rival", "S'entraîner avec ton rival", "Vous vous détestez publiquement. En privé, personne ne vous pousse mieux.",
     "Duel quotidien", { clutch: 5, perimeterD: 4, finishing: 4, athleticism: 3 }, { w: 2, when: (p) => p.career.seasons >= 3 }),
  TR("exo_academy", "Ouvrir ton propre camp", "Cent gamins pendant une semaine. Tu apprends autant qu'eux.",
     "Leadership et image", { leadership: 6, iq: 3, fame: 6, money: -180000 }, { w: 2, when: (p) => p.money > 900000 }),
];

/* ─────────── médias ─────────── */

DATA.MEDIA = [
  "Le Fil NBA", "Courtside", "Hardwood Daily", "The Baseline",
  "Radio Parquet", "Full Court", "Le Quotidien du Basket", "Tip-Off",
];

/* ─────────── noms (ligue vivante) ─────────── */

DATA.NAMES = {
  first: [
    "Marcus","Jalen","Tyrese","DeAndre","Xavier","Malik","Elijah","Amari","Trey","Isaiah",
    "Cameron","Devin","Josiah","Keon","Rashad","Darius","Quentin","Zion","Tariq","Jaylen",
    "Nikola","Luka","Vasilije","Dario","Goran","Bojan","Aleksej","Marko",
    "Théo","Nolan","Ousmane","Ibrahima","Moussa","Killian","Yanis","Sekou","Amine","Lucas",
    "Santiago","Facundo","Gabriel","Rafael","Diego","Mateo",
    "Chinedu","Emeka","Kelechi","Abdoulaye","Cheikh","Boubacar",
    "Jonas","Kristaps","Domantas","Lauri","Franz","Moritz","Callum","Josh","Dyson",
  ],
  last: [
    "Whitfield","Carrington","Boone","Ellison","Mercer","Vandross","Holloway","Prescott",
    "Ashby","Rutherford","Sinclair","Delaney","Crawford","Bannister","Thorne","Vaughn",
    "Okafor","Adeyemi","Nwosu","Diallo","Traoré","Sylla","Camara","Bamba","Konaté",
    "Petrović","Jovanović","Radić","Kovač","Marković","Šarić","Đurić",
    "Lefèvre","Marchand","Dubois","Rousseau","Bonnet","Girard","Perrin",
    "Ibáñez","Navarro","Delgado","Quintana","Ferreira","Moreira",
    "Lindqvist","Bergman","Virtanen","Kaufmann","Brandt","Hoffmann","Novak","Ziemann",
    "Fairbanks","Langston","Ridley","Camden","Sutton","Beaumont","Kingsley","Alderton",
  ],
};

/* ─────────── libellés ─────────── */

DATA.PHASES = {
  hs:      "Lycée",
  aau:     "Circuit AAU",
  choice:  "Orientation",
  ncaa:    "Université",
  prep:    "Académie pro",
  euro:    "Europe",
  draft:   "Draft",
  pro:     "Saison pro",
  retired: "Retraite",
};

DATA.ROUND_NAMES = ["1er tour", "Demi-finale de conférence", "Finale de conférence", "Finales"];

/* ── engine.js ── */
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

/* ── meta.js ── */
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
});

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

/* ── cast.js ── */
/* ═══════════════════════════════════════════════════════════
   PARQUET — le casting
   Chaque carrière génère ses propres personnages : un coach, un
   directeur sportif, un agent, des coéquipiers, des rivaux, un
   journaliste, une famille. Ils portent un nom, un caractère, et
   reviennent de saison en saison. C'est eux qui rendent les
   situations uniques.
   ═══════════════════════════════════════════════════════════ */

const CAST = {};

/* ─────────── réservoirs de noms ─────────── */

CAST.NAMES = {
  m: ["Marcus","Jalen","Tyrese","DeAndre","Xavier","Malik","Elijah","Amari","Trey","Isaiah",
      "Cameron","Devin","Josiah","Keon","Rashad","Darius","Quentin","Zion","Tariq","Jaylen",
      "Nikola","Luka","Vasilije","Dario","Goran","Bojan","Aleksej","Marko","Stefan","Vlado",
      "Théo","Nolan","Ousmane","Ibrahima","Moussa","Killian","Yanis","Sekou","Amine","Lucas",
      "Santiago","Facundo","Gabriel","Rafael","Diego","Mateo","Emilio","Joaquín",
      "Chinedu","Emeka","Kelechi","Abdoulaye","Cheikh","Boubacar","Mamadou","Youssouf",
      "Jonas","Kristaps","Domantas","Lauri","Franz","Moritz","Callum","Josh","Dyson","Rudy",
      "Terrance","Jamaal","Corey","Andre","Lamont","Dewayne","Kendrick","Roshawn","Brandon",
      "Hakim","Idriss","Samir","Rayan","Ilyes","Adama","Bilal","Kader"],
  f: ["Amara","Nadia","Léa","Inès","Fatou","Aminata","Clara","Sofia","Maya","Jasmine",
      "Camille","Élise","Awa","Salomé","Thalia","Naomi","Yasmine","Kenza","Manon","Iris",
      "Danielle","Simone","Brianna","Kiara","Latoya","Monique","Renée","Aaliyah"],
  last: ["Whitfield","Carrington","Boone","Ellison","Mercer","Vandross","Holloway","Prescott",
      "Ashby","Rutherford","Sinclair","Delaney","Crawford","Bannister","Thorne","Vaughn",
      "Okafor","Adeyemi","Nwosu","Diallo","Traoré","Sylla","Camara","Bamba","Konaté","Cissé",
      "Petrović","Jovanović","Radić","Kovač","Marković","Šarić","Đurić","Vraný","Lorenc",
      "Lefèvre","Marchand","Dubois","Rousseau","Bonnet","Girard","Perrin","Vasseur","Fauve",
      "Ibáñez","Navarro","Delgado","Quintana","Ferreira","Moreira","Salazar","Cortés",
      "Lindqvist","Bergman","Virtanen","Kaufmann","Brandt","Hoffmann","Novak","Ziemann",
      "Fairbanks","Langston","Ridley","Camden","Sutton","Beaumont","Kingsley","Alderton",
      "Barlow","Hendricks","Mulligan","Osgood","Pemberton","Radcliffe","Sorensen","Tillman",
      "Ayers","Whitlock","Dorsett","Bassey","Pryor","Hollis","Brissac","Sangaré","Marceau"],
};

CAST.rname = function (used, sex) {
  const pool = sex === "f" ? CAST.NAMES.f : CAST.NAMES.m;
  for (let i = 0; i < 80; i++) {
    const n = ENG.R.pick(pool) + " " + ENG.R.pick(CAST.NAMES.last);
    if (!used || !used.has(n)) { if (used) used.add(n); return n; }
  }
  return ENG.R.pick(pool) + " " + ENG.R.pick(CAST.NAMES.last);
};

const lastOf = (full) => full.split(" ").slice(1).join(" ") || full;

/* ─────────── caractères ─────────── */

CAST.COACH_STYLES = [
  { id: "def",   label: "obsédé par la défense",  trait: "Il fait rejouer la même rotation défensive vingt fois." },
  { id: "off",   label: "amoureux de l'attaque",  trait: "Il veut que le ballon touche quatre mains avant de partir." },
  { id: "player",label: "proche des joueurs",     trait: "Il connaît le prénom de la mère de chacun." },
  { id: "iron",  label: "à l'ancienne",           trait: "Il crie, il coupe les minutes, et il gagne." },
  { id: "data",  label: "adepte des statistiques",trait: "Il refuse tout tir à mi-distance et le dit sans détour." },
  { id: "young", label: "jeune et ambitieux",     trait: "Premier poste de titulaire. Il a tout à prouver, comme toi." },
];

CAST.GM_STYLES = [
  { id: "winnow", label: "veut gagner tout de suite" },
  { id: "build",  label: "construit sur cinq ans" },
  { id: "money",  label: "compte chaque dollar" },
  { id: "analytics", label: "ne jure que par les modèles" },
];

CAST.AGENT_STYLES = [
  { id: "shark",  label: "négociateur redoutable", trait: "Il n'a jamais perdu une négociation. Il te le rappelle souvent." },
  { id: "father", label: "presque un père",        trait: "Il t'appelle le dimanche soir, juste pour savoir." },
  { id: "quiet",  label: "discret et méthodique",  trait: "Il parle peu, mais chaque phrase a été préparée." },
  { id: "star",   label: "aussi célèbre que ses joueurs", trait: "Il a son propre podcast et deux millions d'abonnés." },
];

CAST.MATE_ROLES = [
  { id: "star",    label: "la star de l'équipe" },
  { id: "vet",     label: "le vétéran du vestiaire" },
  { id: "rookie",  label: "le rookie" },
  { id: "bench",   label: "le sixième homme" },
  { id: "enforcer",label: "le défenseur de l'ombre" },
  { id: "shooter", label: "le shooteur" },
];

CAST.PERSONALITIES = [
  { id: "loud",   label: "grande gueule" },
  { id: "calm",   label: "silencieux" },
  { id: "pro",    label: "professionnel jusqu'à l'os" },
  { id: "party",  label: "toujours de sortie" },
  { id: "pious",  label: "d'une discipline monacale" },
  { id: "funny",  label: "clown du vestiaire" },
  { id: "jealous",label: "rongé par la comparaison" },
];

CAST.OUTLETS = [
  "Le Fil NBA", "Courtside", "Hardwood Daily", "The Baseline", "Radio Parquet",
  "Full Court", "Le Quotidien du Basket", "Tip-Off", "Panier Presse", "La Raquette",
];

CAST.JOURNO_STANCE = [
  { id: "friendly", label: "bienveillant" },
  { id: "hostile",  label: "toujours à charge" },
  { id: "sharp",    label: "redoutablement bien informé" },
  { id: "lazy",     label: "en quête de titres faciles" },
];

/* ─────────── génération ─────────── */

CAST.make = function (p) {
  const R = ENG.R;
  const used = new Set([ENG.name(p)]);

  const mk = (extra) => Object.assign({ name: CAST.rname(used) }, extra);

  const coach = mk({
    style: R.pick(CAST.COACH_STYLES),
    temper: R.i(20, 90),
    tenure: 0,
  });

  const gm = mk({ style: R.pick(CAST.GM_STYLES) });

  const agent = mk({ style: R.pick(CAST.AGENT_STYLES) });

  const journo = mk({
    outlet: R.pick(CAST.OUTLETS),
    stance: R.pick(CAST.JOURNO_STANCE),
  });

  /* coéquipiers : rôles distincts */
  const roles = R.shuffle(CAST.MATE_ROLES).slice(0, 5);
  const mates = roles.map((r) => mk({
    role: r,
    perso: R.pick(CAST.PERSONALITIES),
    bond: R.i(35, 65),
    age: r.id === "rookie" ? R.i(19, 21) : r.id === "vet" ? R.i(33, 38) : R.i(23, 31),
  }));

  /* rivaux de génération */
  const rivals = [0, 1].map(() => mk({
    pos: R.pick(["PG", "SG", "SF", "PF", "C"]),
    team: R.pick(DATA.TEAMS).id,
    heat: R.i(30, 60),
    style: R.pick(["scoreur pur", "défenseur d'élite", "meneur créateur", "athlète phénoménal", "shooteur clinique"]),
  }));

  /* famille */
  const family = {
    parent: { name: CAST.rname(used, R.chance(0.6) ? "f" : "m"), role: R.chance(0.6) ? "ta mère" : "ton père" },
    sibling: R.chance(0.75)
      ? { name: CAST.rname(used, R.chance(0.5) ? "f" : "m"), role: R.chance(0.5) ? "ton frère" : "ta sœur" }
      : null,
    partner: null,
    kids: 0,
  };

  return { coach, gm, agent, journo, mates, rivals, family, used: Array.from(used) };
};

/* le vestiaire change avec les transferts */
CAST.rotateTeam = function (c, p, keep) {
  const R = ENG.R;
  const used = new Set(c.used || []);
  if (!keep) {
    c.coach = { name: CAST.rname(used), style: R.pick(CAST.COACH_STYLES), temper: R.i(20, 90), tenure: 0 };
    c.gm = { name: CAST.rname(used), style: R.pick(CAST.GM_STYLES) };
  }
  const roles = R.shuffle(CAST.MATE_ROLES).slice(0, 5);
  c.mates = roles.map((r) => ({
    name: CAST.rname(used), role: r, perso: R.pick(CAST.PERSONALITIES),
    bond: R.i(35, 60),
    age: r.id === "rookie" ? R.i(19, 21) : r.id === "vet" ? R.i(33, 38) : R.i(23, 31),
  }));
  c.used = Array.from(used);
};

/* le coach part, un autre arrive */
CAST.newCoach = function (c) {
  const used = new Set(c.used || []);
  c.coach = {
    name: CAST.rname(used), style: ENG.R.pick(CAST.COACH_STYLES),
    temper: ENG.R.i(20, 90), tenure: 0,
  };
  c.used = Array.from(used);
  return c.coach;
};

/* un coéquipier s'en va, un autre arrive */
CAST.swapMate = function (c) {
  const used = new Set(c.used || []);
  const idx = ENG.R.i(0, c.mates.length - 1);
  const gone = c.mates[idx];
  c.mates[idx] = {
    name: CAST.rname(used), role: ENG.R.pick(CAST.MATE_ROLES),
    perso: ENG.R.pick(CAST.PERSONALITIES), bond: ENG.R.i(30, 55),
    age: ENG.R.i(21, 34),
  };
  c.used = Array.from(used);
  return { gone, arrived: c.mates[idx] };
};

CAST.lastOf = lastOf;

/* ─────────── relations ─────────── */

CAST.REL_KEYS = [
  { id: "coach",  label: "Staff" },
  { id: "locker", label: "Vestiaire" },
  { id: "front",  label: "Direction" },
  { id: "media",  label: "Médias" },
  { id: "fans",   label: "Public" },
];

CAST.newRel = () => ({ coach: 50, locker: 50, front: 50, media: 50, fans: 45 });

CAST.relLabel = function (v) {
  if (v >= 82) return "adoré";
  if (v >= 66) return "solide";
  if (v >= 46) return "correct";
  if (v >= 28) return "tendu";
  return "rompu";
};

/* ── scenarios.js ── */
/* ═══════════════════════════════════════════════════════════
   PARQUET — moteur de scénarios
   Chaque situation est un patron à variables. Les noms, les
   chiffres, les adversaires, les mois et les enjeux sont tirés au
   moment où la situation se déclenche : deux carrières ne liront
   jamais la même phrase.
   ═══════════════════════════════════════════════════════════ */

const SC = {};

const MONTHS = ["octobre", "novembre", "décembre", "janvier", "février", "mars", "avril"];

/* ─────────── remplissage des variables ─────────── */

SC.fill = function (str, b) {
  if (!str) return "";
  return str.replace(/\{(\w+)\}/g, (m, k) => (b[k] != null ? b[k] : m));
};

SC.bind = function (c, extra) {
  const R = ENG.R, p = c.p, cast = c.cast;
  const team = p.team ? DATA.TEAMS.find((t) => t.id === p.team) : null;
  const opp = R.pick(DATA.TEAMS.filter((t) => !team || t.id !== team.id));
  const opp2 = R.pick(DATA.TEAMS.filter((t) => (!team || t.id !== team.id) && t.id !== opp.id));

  const mates = cast.mates || [];
  const shuffled = R.shuffle(mates);
  const m1 = shuffled[0] || { name: "un coéquipier", role: { label: "un joueur" }, perso: { label: "" } };
  const m2 = shuffled[1] || m1;
  const byRole = (id) => mates.find((m) => m.role && m.role.id === id) || m1;
  const rival = R.pick(cast.rivals || [{ name: "un rival", team: "BOS", style: "scoreur" }]);
  const rivalTeam = DATA.TEAMS.find((t) => t.id === rival.team) || DATA.TEAMS[0];

  const b = {
    me: ENG.name(p), first: p.first, last: p.last, num: p.number,
    age: p.age, ovr: ENG.ovr(p),

    coach: cast.coach.name, coachL: CAST.lastOf(cast.coach.name),
    coachStyle: cast.coach.style.label, coachTrait: cast.coach.style.trait,
    gm: cast.gm.name, gmL: CAST.lastOf(cast.gm.name), gmStyle: cast.gm.style.label,
    agent: cast.agent.name, agentL: CAST.lastOf(cast.agent.name),
    agentStyle: cast.agent.style.label, agentTrait: cast.agent.style.trait,
    journo: cast.journo.name, outlet: cast.journo.outlet, journoStance: cast.journo.stance.label,

    mate: m1.name, mateL: CAST.lastOf(m1.name), mateRole: m1.role.label, matePerso: m1.perso.label,
    mate2: m2.name, mate2L: CAST.lastOf(m2.name), mate2Role: m2.role.label,
    vet: byRole("vet").name, rookie: byRole("rookie").name, star: byRole("star").name,

    rival: rival.name, rivalL: CAST.lastOf(rival.name),
    rivalTeam: rivalTeam.full, rivalCity: rivalTeam.city, rivalStyle: rival.style, rivalPos: rival.pos,

    team: team ? team.full : (p.college || "ton équipe"),
    city: team ? team.city : "ta ville",
    teamName: team ? team.name : "",
    opp: opp.full, oppCity: opp.city, oppName: opp.name,
    opp2: opp2.full, opp2City: opp2.city,

    parent: cast.family.parent.name, parentRole: cast.family.parent.role,
    sibling: cast.family.sibling ? cast.family.sibling.name : "ton cousin",
    siblingRole: cast.family.sibling ? cast.family.sibling.role : "ton cousin",
    partner: cast.family.partner ? cast.family.partner.name : "ta compagne",

    month: R.pick(MONTHS), month2: R.pick(MONTHS),
    year: c.year, college: p.college || "ton université",
    salary: ENG.money(p.salary || 0),
  };

  b._rivalRef = rival;
  b._mateRef = m1;
  Object.assign(b, extra || {});
  return b;
};

/* ─────────── application des effets ─────────── */

/* Le même geste ne produit pas le même effet chez tout le monde :
   un été passé sur le tir extérieur transforme un arrière et ne fait
   presque rien à un pivot. Le moral pèse aussi sur ce qu'on assimile. */
SC.scaleAttr = function (p, key, v) {
  const w = DATA.POS_WEIGHTS[p.position][key] || 1;
  const relevance = ENG.clamp(0.55 + (w / 2.6) * 0.75, 0.55, 1.35);
  const mood = v > 0 ? 0.85 + (p.morale / 100) * 0.3 : 1;
  const out = v * relevance * mood;
  /* on ne perd jamais un gain annoncé : au minimum 1 point */
  return v > 0 ? Math.max(1, Math.round(out)) : Math.min(-1, Math.round(out));
};

/* Une relation déjà excellente progresse peu ; une relation détruite
   se répare lentement. Les extrêmes coûtent cher à atteindre. */
SC.scaleRel = function (cur, v) {
  const room = v > 0 ? (100 - cur) / 50 : cur / 50;
  const out = v * ENG.clamp(room, 0.35, 1.25);
  return v > 0 ? Math.max(1, Math.round(out)) : Math.min(-1, Math.round(out));
};

SC.apply = function (p, mods, rel) {
  const pills = [];
  const lbl = (k) => { const a = DATA.ATTRS.find((x) => x.id === k); return a ? a.label : k; };

  for (const k in (mods || {})) {
    let v = mods[k];
    if (!v) continue;
    if (DATA.ATTRS.some((a) => a.id === k)) {
      v = SC.scaleAttr(p, k, v);
      p.attrs[k] = ENG.clamp(p.attrs[k] + v, 22, 99);
      pills.push({ t: (v > 0 ? "+" : "") + v + " " + lbl(k), k: v > 0 ? "up" : "down" });
    } else if (k === "money") {
      p.money += v;
      pills.push({ t: (v > 0 ? "+" : "−") + ENG.money(Math.abs(v)), k: v > 0 ? "up" : "down" });
    } else if (k === "followers") {
      p.followers = Math.max(0, Math.round(p.followers * (1 + v / 100)));
      pills.push({ t: (v > 0 ? "+" : "") + v + " % abonnés", k: v > 0 ? "up" : "down" });
    } else {
      const names = { rep: "Notoriété", fame: "Aura", morale: "Moral", form: "Forme",
                      health: "Santé", trust: "Confiance du staff", potential: "Plafond" };
      p[k] = ENG.clamp((p[k] || 0) + v, 0, k === "potential" ? 99 : 100);
      pills.push({ t: (v > 0 ? "+" : "") + v + " " + (names[k] || k), k: v > 0 ? "up" : "down" });
    }
  }

  for (const k in (rel || {})) {
    let v = rel[k];
    if (!v) continue;
    if (k === "coach") {
      v = SC.scaleRel(p.trust, v);
      p.trust = ENG.clamp(p.trust + v, 0, 100);
    } else {
      p.rel = p.rel || CAST.newRel();
      v = SC.scaleRel(p.rel[k] != null ? p.rel[k] : 50, v);
      p.rel[k] = ENG.clamp((p.rel[k] || 50) + v, 0, 100);
    }
    const rk = CAST.REL_KEYS.find((x) => x.id === k);
    pills.push({ t: (v > 0 ? "+" : "") + v + " " + (rk ? rk.label : k), k: v > 0 ? "up" : "down" });
  }
  return pills;
};

/* raccourcis d'écriture */
const O = (txt, mods, rel, kind) => ({ txt, mods, rel, kind });
const luck = (prob, a, b) => (c, bd) => (ENG.R.chance(prob) ? a(c, bd) : b(c, bd));
const R_ = () => ENG.R;

/* ─────────── issues qui divergent selon le contexte ───────────
   Le même choix ne produit pas le même récit selon qui le fait. On
   déclare des cas, chacun avec sa condition ; le premier vrai gagne.
   Un même geste peut donc renforcer un joueur et en couler un autre. */
const branch = (cases) => (c, b) => {
  for (const k of cases) {
    if (!k.when || k.when(c, b)) {
      return typeof k.then === "function" ? k.then(c, b) : k.then;
    }
  }
  return O("", {});
};

/* La probabilité elle-même dépend du joueur : réussir un coup d'éclat
   n'a pas la même chance selon le clutch, la forme et le vestiaire. */
const oddsFrom = (c, base, keys) => {
  const p = c.p;
  let m = 0;
  (keys || []).forEach((k) => {
    if (k === "clutch") m += (p.attrs.clutch - 60) * 0.004;
    else if (k === "form") m += (p.form - 60) * 0.003;
    else if (k === "morale") m += (p.morale - 60) * 0.003;
    else if (k === "locker") m += (((p.rel && p.rel.locker) || 50) - 50) * 0.003;
    else if (k === "coach") m += (p.trust - 50) * 0.003;
    else if (k === "iq") m += (p.attrs.iq - 60) * 0.003;
    else if (k === "media") m += (((p.rel && p.rel.media) || 50) - 50) * 0.003;
  });
  return ENG.clamp(base + m, 0.08, 0.94);
};

const luckCtx = (base, keys, a, b) => (c, bd) =>
  (ENG.R.chance(oddsFrom(c, base, keys)) ? a(c, bd) : b(c, bd));

/* raccourcis de lecture du contexte */
const isGuard = (c) => c.p.position === "PG" || c.p.position === "SG";
const isBig = (c) => c.p.position === "PF" || c.p.position === "C";
const isStar = (c) => ENG.ovr(c.p) >= 84;
const isYoung = (c) => c.p.age <= 23;
const isVet = (c) => c.p.age >= 31;
const lockerLow = (c) => ((c.p.rel && c.p.rel.locker) || 50) < 42;
const lockerHigh = (c) => ((c.p.rel && c.p.rel.locker) || 50) >= 70;
const coachLow = (c) => c.p.trust < 42;
const winning = (c) => c.season && c.season.wins >= 48;
const losing = (c) => c.season && c.season.wins <= 30;

/* ═══════════════════════════════════════════════════════════
   BIBLIOTHÈQUE
   ph : phases où la situation peut tomber
   w  : poids de tirage
   n  : chiffres tirés au hasard, injectés comme variables
   ═══════════════════════════════════════════════════════════ */

SC.LIB = [];
const S_ = (o) => SC.LIB.push(o);

/* ─────────────────────────────────────────────
   LYCÉE & JEUNESSE
   ───────────────────────────────────────────── */

S_({ id: "hs_scout", cat: "Recrutement", ph: ["hs"], w: 4,
  n: () => ({ n1: R_().i(2, 9), n2: R_().i(11, 34) }),
  head: "Un recruteur de {college} dans la salle",
  body: "Il est assis derrière le banc, carnet ouvert, à {n1} rangs de {parentRole}. Le match commence dans dix minutes.",
  ch: [
    { h: "Jouer collectif", d: "Faire tourner, impliquer tout le monde.", t: "QI et passe",
      run: () => O("Tu finis à {n1} points et onze passes. Le recruteur écrit « lecture du jeu rare pour son âge ».", { passing: 4, iq: 3, rep: 3 }, { coach: 4 }) },
    { h: "Prendre le match à mon compte", d: "Attaquer chaque possession.", t: "Notoriété, vestiaire froissé",
      run: () => O("{n2} points. La salle est debout. Deux coéquipiers ne t'adressent plus la parole dans le bus.", { finishing: 3, three: 3, rep: 8 }, { locker: -7, fans: 5 }) },
    { h: "Défendre sur leur meilleur joueur", d: "Le sortir du match.", t: "Défense et crédit",
      run: () => O("Tu le limites à six points. Le recruteur souligne « une mentalité qu'on n'enseigne pas ».", { perimeterD: 5, steal: 3 }, { coach: 7, locker: 4 }) },
  ] });

S_({ id: "hs_aau", cat: "Été", ph: ["hs"], w: 4,
  n: () => ({ n1: R_().i(14, 32), n2: R_().i(3, 8) }),
  head: "Le circuit AAU de {month2}",
  body: "{n1} matchs en huit semaines, devant des dizaines de recruteurs. Ou {n2} semaines seul dans la salle du quartier.",
  ch: [
    { h: "Faire tout le circuit", d: "Jouer partout, être vu.", t: "Notoriété, usure",
      run: () => O("Ton nom apparaît dans tous les classements nationaux. Tes genoux réclament du repos dès août.", { rep: 12, handle: 3, athleticism: 2, health: -9, followers: 60 }) },
    { h: "Rester travailler en salle", d: "Mille tirs par jour.", t: "Technique pure",
      run: () => O("Personne ne t'a vu jouer de l'été. Mais ton tir a changé de catégorie.", { three: 6, freeThrow: 4, midrange: 4, rep: -3 }) },
    { h: "Camp de développement", d: "Encadré par d'anciens pros.", t: "QI basket",
      run: () => O("Deux semaines de vidéo, de jeu de jambes et de lecture d'écran. Tu ne vois plus le terrain pareil.", { iq: 7, passing: 3, perimeterD: 3 }) },
  ] });

S_({ id: "hs_body", cat: "Corps", ph: ["hs", "ncaa"], w: 3,
  n: () => ({ n1: R_().i(5, 11) }),
  head: "Le protocole de {coachL}",
  body: "{coachTrait} Il te trouve trop léger pour le niveau supérieur et propose {n1} kilos de travail.",
  ch: [
    { h: "Prise de masse", d: "Encaisser les contacts.", t: "Puissance",
      run: () => O("Tu ne recules plus dans la raquette. Ton premier pas, lui, a perdu un dixième.", { finishing: 5, interiorD: 4, rebounding: 3, athleticism: -2, stamina: 2 }) },
    { h: "Explosivité", d: "Pliométrie et sprints.", t: "Athlétisme",
      run: () => O("Tu attrapes le cercle à deux mains. Toute la salle l'a vu.", { athleticism: 7, block: 2, rep: 4 }) },
    { h: "Mobilité et prévention", d: "Lent, ennuyeux, invisible.", t: "Durabilité",
      run: () => O("Aucun highlight. Mais ton corps encaissera les dix prochaines années.", { durability: 8, stamina: 4, health: 8 }) },
  ] });

S_({ id: "hs_viral", cat: "Réseaux", ph: ["hs"], w: 3,
  n: () => ({ n1: R_().i(120, 900) }),
  head: "Une action filmée au téléphone",
  body: "{n1} 000 vues en trois jours. {siblingRole} l'a repostée, {parentRole} n'y comprend rien.",
  ch: [
    { h: "Surfer sur la vague", d: "Ouvrir un compte, poster, répondre.", t: "Notoriété, distraction",
      run: () => O("Ton audience explose. {coachL} commence à te trouver ailleurs pendant les entraînements.", { rep: 14, fame: 8, followers: 900, iq: -2 }, { coach: -6, fans: 8 }) },
    { h: "Ne rien dire", d: "Rester sur le terrain.", t: "Crédit auprès du staff",
      run: () => O("Le bruit retombe en dix jours. {coachL} note que tu n'as pas bougé d'un centimètre.", { iq: 2, rep: 2 }, { coach: 9 }) },
  ] });

S_({ id: "hs_captain", cat: "Vestiaire", ph: ["hs"], w: 3,
  head: "{mate} supporte mal ta montée",
  body: "{mateRole}, {matePerso}, il était le patron de cette salle avant toi. Il l'a fait savoir devant le groupe.",
  ch: [
    { h: "M'expliquer avec lui", d: "En tête-à-tête, sans témoin.", t: "Leadership",
      run: luck(0.72,
        () => O("Une heure sur le parking. Il finit par dire qu'il aurait aimé avoir ton niveau à ton âge.", { leadership: 7, morale: 6 }, { locker: 9, coach: 3 }),
        () => O("Le ton monte, {coachL} vous suspend tous les deux un match.", { leadership: 2, morale: -8 }, { coach: -8, locker: -5 })) },
    { h: "Répondre sur le terrain", d: "Trois matchs à vingt-cinq points.", t: "Sang-froid",
      run: () => O("Il finit par te passer le ballon sans qu'on le lui demande.", { clutch: 4, midrange: 3, leadership: 3 }, { locker: 5 }) },
    { h: "Le chambrer en public", d: "Rendre coup pour coup.", t: "Risqué",
      run: luck(0.35,
        () => O("La salle rit avec toi. Tu deviens la voix du vestiaire.", { rep: 8, leadership: 5 }, { locker: 6 }),
        () => O("Le vestiaire se fige. {coachL} te sort du cinq pour un mois.", { morale: -10, leadership: -4 }, { coach: -12, locker: -10 })) },
  ] });

S_({ id: "hs_school", cat: "École", ph: ["hs"], w: 2,
  head: "Le bulletin du deuxième trimestre",
  body: "{parentRole} a posé les notes sur la table sans un mot. Sans moyenne correcte, certaines universités ne pourront même pas te recruter.",
  ch: [
    { h: "Prendre un tuteur", d: "Deux heures après chaque entraînement.", t: "Portes ouvertes",
      run: () => O("Tu remontes la moyenne. Toutes les universités restent dans la course.", { iq: 5, rep: 3, form: -5 }) },
    { h: "Miser sur le basket", d: "Le ballon paiera, pas l'algèbre.", t: "Options réduites",
      run: () => O("Trois programmes retirent leur offre. Il en reste d'autres.", { rep: -8, form: 5, handle: 3 }) },
  ] });

S_({ id: "hs_injury", cat: "Blessure", ph: ["hs"], w: 3,
  n: () => ({ n1: R_().i(4, 9) }),
  head: "La cheville a tourné contre {opp}",
  body: "Réception ratée sur une pénétration. Toute la salle a entendu le craquement. {n1} semaines d'arrêt selon le médecin.",
  ch: [
    { h: "Arrêter et soigner", d: "Respecter le délai.", t: "Récupération complète",
      run: () => O("Tu reviens intact, un peu rouillé, mais entier.", { health: 14, durability: 3, form: -12 }) },
    { h: "Revenir pour les phases finales", d: "Strapper et serrer les dents.", t: "Notoriété contre santé",
      run: luck(0.55,
        () => O("Tu joues la finale sur une jambe et demie, et tu la gagnes. La légende locale commence là.", { rep: 12, clutch: 7, health: -12 }, { fans: 12, locker: 8 }, "epic"),
        () => O("Tu retombes dessus au deuxième match. Cette fois, quatre mois.", { health: -26, durability: -5, athleticism: -3, morale: -12 }, null, "bad")) },
  ] });

S_({ id: "hs_rank", cat: "Classement", ph: ["hs"], w: 3,
  n: () => ({ n1: R_().i(28, 96), n2: R_().i(4, 40) }),
  head: "{n1}ᵉ du classement national",
  body: "Le site de référence vient de publier sa liste. {rival}, {rivalStyle} de {rivalCity}, te devance de {n2} places.",
  ch: [
    { h: "En faire une obsession", d: "Organiser la saison autour du classement.", t: "Notoriété, pression",
      run: () => O("Tu grimpes de {n2} places. Chaque match devient un examen.", { rep: 13, finishing: 3, three: 3, morale: -4 }) },
    { h: "Ne pas le regarder", d: "Jouer, simplement.", t: "Sérénité",
      run: () => O("Tu ne cliques jamais sur le lien. Ta saison est la plus libre de ta jeune carrière.", { morale: 9, iq: 4, passing: 3, form: 6 }) },
    { h: "Appeler {rival}", d: "Prendre les devants.", t: "Une relation qui durera",
      run: () => O("Vous parlez deux heures. Vous vous croiserez encore souvent, et vous le savez déjà.", { iq: 3, leadership: 4, morale: 5 }, null, "wire"), rivalUp: -8 },
  ] });

S_({ id: "hs_position", cat: "Poste", ph: ["hs"], w: 2,
  head: "{coachL} veut te changer de poste",
  body: "Il est {coachStyle}. Il pense que ta morphologie te destine à autre chose que ce que tu fais aujourd'hui.",
  ch: [
    { h: "Essayer", d: "Apprendre un second rôle.", t: "Polyvalence",
      run: () => O("Deux mois difficiles, puis un déclic. Tu sais jouer à deux postes.", { iq: 6, passing: 4, rebounding: 4, perimeterD: 4 }, { coach: 6 }) },
    { h: "Refuser", d: "Rester sur ce que tu maîtrises.", t: "Spécialisation",
      run: () => O("Tu creuses ton sillon. Ce que tu fais bien, tu le fais très bien.", { finishing: 4, three: 4, handle: 3 }, { coach: -4 }) },
  ] });

S_({ id: "hs_friend", cat: "Amitié", ph: ["hs"], w: 2,
  head: "{mate} est coupé de l'effectif",
  body: "{mateRole} depuis trois ans, ton partenaire d'échauffement. Il t'appelle le soir même, la voix cassée.",
  ch: [
    { h: "Plaider sa cause", d: "Aller voir {coachL}.", t: "Loyauté, risque",
      run: luck(0.4,
        () => O("{coachL} le reprend à l'essai. Il finira titulaire.", { leadership: 8, morale: 10 }, { locker: 10, coach: -3 }),
        () => O("{coachL} te rappelle que ce n'est pas ton rôle.", { leadership: 3, morale: -5 }, { coach: -8 })) },
    { h: "L'aider en dehors", d: "L'entraîner le week-end.", t: "Équilibre",
      run: () => O("Il retrouve un club l'année suivante. Vous vous entraînez encore ensemble aujourd'hui.", { morale: 8, leadership: 5, handle: 3 }, { locker: 5 }) },
  ] });

S_({ id: "hs_offer", cat: "Famille", ph: ["hs"], w: 2,
  n: () => ({ n1: R_().i(60, 140) }),
  head: "Une offre d'un club européen",
  body: "{n1} 000 dollars sur la table pour {parentRole}, et l'école qui s'arrête maintenant.",
  ch: [
    { h: "Refuser et finir le lycée", d: "Garder toutes les portes ouvertes.", t: "Aucun gain immédiat",
      run: () => O("{parentRole} respire. Tu restes maître de ton calendrier.", { morale: 6, iq: 3 }) },
    { h: "Signer pour aider les miens", d: "Le loyer ne se paie pas en potentiel.", t: "Argent, pression",
      run: (c, b) => O("Le premier virement tombe. Tu deviens l'adulte de la maison à dix-sept ans.", { money: b.n1 * 1000, morale: -4, leadership: 5, rep: 4 }, null, "money") },
  ] });

/* ─────────────────────────────────────────────
   UNIVERSITÉ
   ───────────────────────────────────────────── */

S_({ id: "nc_role", cat: "Rôle", ph: ["ncaa"], w: 4,
  head: "La conversation de rentrée avec {coachL}",
  body: "Il est {coachStyle}. {coachTrait} Il ouvre son bureau et veut fixer ton rôle pour la saison.",
  ch: [
    { h: "Demander le ballon", d: "Être la première option.", t: "Statistiques et cote",
      run: () => O("Tu finis meilleur marqueur de la conférence. Les projections de draft te font grimper.", { rep: 10, three: 3, handle: 3 }, { coach: -4, fans: 7 }) },
    { h: "Accepter le rôle défensif", d: "Prendre le meilleur adverse chaque soir.", t: "Profil deux-way",
      run: () => O("Élu meilleur défenseur de la conférence. Les scouts adorent ce profil.", { perimeterD: 7, interiorD: 4, steal: 4, rep: 5 }, { coach: 11 }) },
    { h: "Devenir le chef d'orchestre", d: "Faire tourner, gagner.", t: "QI basket",
      run: () => O("Ton équipe joue le meilleur basket du pays. On parle de toi comme d'un prolongement de {coachL}.", { iq: 7, passing: 6, leadership: 5 }, { coach: 9, locker: 8 }) },
  ] });

S_({ id: "nc_nil", cat: "Argent", ph: ["ncaa"], w: 3,
  n: () => ({ n1: R_().i(20, 90) }),
  head: "Un contrat d'image local",
  body: "Une enseigne de {city} propose {n1} 000 dollars pour ton visage sur ses affiches. {agentL} n'est pas encore ton agent, mais il a appelé.",
  ch: [
    { h: "Signer", d: "Premier vrai chèque.", t: "Argent et visibilité",
      run: (c, b) => O("Ton visage est sur tous les panneaux du campus. Le vestiaire t'appelle « la pub ».", { money: b.n1 * 1000, rep: 6, fame: 4, followers: 120 }, { locker: -3 }, "money") },
    { h: "Refuser", d: "Rester concentré.", t: "Progression",
      run: () => O("Aucune séance photo, aucune distraction. Juste la salle.", { iq: 3, three: 3 }, { coach: 6 }) },
    { h: "Viser plus gros", d: "Faire monter les enchères.", t: "Tout ou rien",
      run: luck(0.4,
        (c, b) => O("Un équipementier national te repère et quadruple la mise.", { money: b.n1 * 4000, rep: 12, fame: 8, followers: 400 }, null, "money"),
        () => O("L'enseigne se vexe et retire son offre. Tu finis la saison sans rien.", { rep: -4, morale: -6 })) },
  ] });

S_({ id: "nc_march", cat: "Tournoi", ph: ["ncaa"], w: 4,
  n: () => ({ n1: R_().i(1, 3), n2: R_().i(4, 9) }),
  head: "{n2} secondes, {n1} point de retard",
  body: "Huitième de finale du tournoi national contre {opp}. {coachL} pose le tableau et dessine le système. Pour toi.",
  ch: [
    { h: "Prendre le tir", d: "Assumer, quoi qu'il arrive.", t: "Clutch",
      run: luck(0.5,
        () => O("Le tir rentre au buzzer. Cette image passera en boucle pendant dix ans.", { clutch: 12, rep: 18, fame: 10, morale: 12, followers: 800 }, { fans: 15 }, "epic"),
        () => O("Le tir heurte l'arceau. Tu apprends ce que pèse un ballon dans ces moments.", { clutch: 5, morale: -12, rep: 3 })) },
    { h: "Ressortir sur {mate}", d: "Le bon coup, pas le beau coup.", t: "QI basket",
      run: luck(0.55,
        () => O("Ton extra-passe trouve le corner. Panier. Tu n'as pas marqué, tu as gagné le match.", { iq: 9, passing: 7, rep: 8, leadership: 6 }, { locker: 10 }),
        () => O("{mateL} manque le tir ouvert. Personne ne te reproche rien, mais tu y repenseras.", { iq: 5, passing: 4, morale: -6 })) },
  ] });

S_({ id: "nc_transfer", cat: "Transfert", ph: ["ncaa"], w: 3,
  head: "{opp2City} te veut",
  body: "Un programme plus huppé propose de te récupérer dès la saison prochaine. Salle pleine, télévision nationale, concurrence féroce.",
  ch: [
    { h: "Partir", d: "Plus d'exposition.", t: "Vitrine supérieure",
      run: () => O("Nouveau vestiaire, nouvelles caméras. Il faut tout reconstruire.", { rep: 11, iq: 3, morale: -4 }, { coach: -6, locker: -8 }) },
    { h: "Rester fidèle", d: "Finir ce qui a commencé.", t: "Rôle central",
      run: () => O("{coachL} te confie les clés du programme. Trente-six minutes par match.", { leadership: 6, morale: 8, handle: 3 }, { coach: 12, fans: 8 }) },
  ] });

S_({ id: "nc_degree", cat: "Études", ph: ["ncaa"], w: 2,
  head: "Le diplôme ou l'été en salle",
  body: "Tu peux valider ton année, mais cela coûte ta préparation estivale. {parentRole} a un avis très arrêté sur la question.",
  ch: [
    { h: "Passer le diplôme", d: "Un filet pour la vie d'après.", t: "QI et sérénité",
      run: () => O("Tu l'obtiens. Quoi qu'il arrive au genou, tu as un plan B.", { iq: 7, leadership: 4, morale: 10, athleticism: -2 }) },
    { h: "Tout miser sur l'été", d: "La salle, rien que la salle.", t: "Progression pure",
      run: () => O("Trois mois de travail acharné. Ton corps et ton tir changent de catégorie.", { three: 5, athleticism: 4, finishing: 4, stamina: 3 }) },
  ] });

S_({ id: "nc_mock", cat: "Draft", ph: ["ncaa"], w: 3,
  n: () => ({ n1: R_().i(6, 42) }),
  head: "{journo} te place {n1}ᵉ de sa projection",
  body: "{journoStance}, il écrit pour {outlet}. Son analyse pointe précisément ce que tu ne sais pas encore faire.",
  ch: [
    { h: "Ignorer le bruit", d: "Jouer sans regarder les listes.", t: "Sérénité",
      run: () => O("Tu coupes les notifications. Ta saison n'en est que meilleure.", { iq: 4, morale: 7, form: 6 }) },
    { h: "Travailler ce qu'il pointe", d: "Cibler les reproches.", t: "Progression ciblée",
      run: () => O("Tu passes l'hiver sur les défauts listés dans les rapports. Ta cote grimpe.", { three: 4, perimeterD: 4, freeThrow: 3, rep: 6 }) },
    { h: "Lui répondre publiquement", d: "Contester l'analyse.", t: "Bruit",
      run: () => O("Ta réponse fait le tour du campus. {journo} note ton nom dans un carnet.", { rep: 5, fame: 3 }, { media: -12 }) },
  ] });

S_({ id: "nc_mate", cat: "Vestiaire", ph: ["ncaa"], w: 3,
  head: "{mate} traverse une mauvaise passe",
  body: "{mateRole}, {matePerso}. Il ne parle plus à personne depuis trois semaines et rate les séances du matin.",
  ch: [
    { h: "Aller le chercher", d: "Passer du temps hors du terrain.", t: "Leadership",
      run: () => O("Il revient dans le groupe et enchaîne trois bons matchs. Le vestiaire a vu qui tu es.", { leadership: 9, iq: 3, morale: 4 }, { locker: 12, coach: 6 }) },
    { h: "Laisser le staff gérer", d: "Ce n'est pas ton rôle.", t: "Concentration",
      run: () => O("Tu restes concentré sur ton jeu. Le staff s'en occupe, mal.", { three: 3, finishing: 3, leadership: -3 }, { locker: -6 }) },
  ] });

/* ─────────────────────────────────────────────
   ACADÉMIE / PRÉPA
   ───────────────────────────────────────────── */

S_({ id: "pr_room", cat: "Adaptation", ph: ["prep"], w: 4,
  head: "Le premier vestiaire professionnel",
  body: "Tu as {age} ans. {vet} en a trente-quatre et ne t'a pas encore adressé la parole. Personne ne t'attend, personne ne t'aide.",
  ch: [
    { h: "Écouter et observer", d: "Se taire, prendre des notes.", t: "QI basket",
      run: () => O("Tu apprends en trois mois ce que d'autres mettent trois ans à comprendre.", { iq: 9, perimeterD: 4 }, { coach: 8, locker: 5 }) },
    { h: "M'imposer tout de suite", d: "Montrer qu'on ne t'impressionne pas.", t: "Risqué",
      run: luck(0.45,
        () => O("Vingt-deux points à ton troisième match. {vet} te tape dans la main pour la première fois.", { rep: 10, finishing: 4, clutch: 5 }, { locker: 9 }),
        () => O("Les vétérans te passent dessus pendant deux mois. Tu finis sur le banc.", { morale: -12, iq: 3 }, { coach: -10, locker: -6 })) },
  ] });

S_({ id: "pr_minutes", cat: "Temps de jeu", ph: ["prep"], w: 3,
  n: () => ({ n1: R_().i(5, 12) }),
  head: "{n1} minutes par match",
  body: "{coachL} préfère l'expérience. {agentL}, {agentStyle}, s'agace au téléphone tous les lundis.",
  ch: [
    { h: "Patienter", d: "Travailler et attendre l'ouverture.", t: "Crédit auprès du staff",
      run: () => O("Une blessure libère une place en {month}. Tu ne la rends plus.", { iq: 4, stamina: 4, morale: -4 }, { coach: 11 }) },
    { h: "Demander à partir", d: "Chercher du temps de jeu ailleurs.", t: "Contrôle, instabilité",
      run: () => O("Prêté à un club plus modeste. Trente minutes par match, tout de suite.", { handle: 4, finishing: 4, three: 3, rep: 4 }, { coach: -6 }) },
  ] });

S_({ id: "pr_nt", cat: "Sélection", ph: ["prep", "ncaa"], w: 2,
  head: "La sélection nationale appelle",
  body: "Deux mois de préparation et un tournoi continental. C'est un honneur, et un été de repos en moins.",
  ch: [
    { h: "Répondre présent", d: "Le maillot avant tout.", t: "Notoriété internationale",
      run: () => O("Tu ramènes une médaille et une réputation qui traverse l'Atlantique.", { rep: 12, leadership: 5, iq: 4, health: -7 }, { fans: 8 }) },
    { h: "Décliner", d: "Se reposer et préparer la suite.", t: "Corps frais",
      run: () => O("Deux mois de récupération et de travail individuel. Ton corps te remercie.", { health: 14, athleticism: 4, three: 4, rep: -5 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — VESTIAIRE & STAFF
   ───────────────────────────────────────────── */

S_({ id: "pro_hazing", cat: "Rookie", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons <= 1,
  head: "Le bizutage selon {vet}",
  body: "Tu es responsable des donuts, des bagages et de la playlist du bus. {vet} vérifie chaque matin.",
  ch: [
    { h: "Jouer le jeu à fond", d: "Rire, assumer, appartenir.", t: "Vestiaire acquis",
      run: () => O("Tu deviens le rookie préféré du groupe. {vet} commence à te coacher gratuitement.", { leadership: 5, iq: 5, morale: 8 }, { locker: 14, coach: 5 }) },
    { h: "Refuser", d: "Tu es professionnel, pas larbin.", t: "Isolement",
      run: () => O("Le vestiaire te met à distance. Tu manges seul toute ta première saison.", { morale: -12, three: 3, finishing: 3 }, { locker: -14 }) },
  ] });

S_({ id: "pro_mentor", cat: "Transmission", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons <= 7,
  head: "{vet} t'attend à six heures",
  body: "{mate2Role} de l'effectif, quinze ans de carrière, il te propose de venir travailler avant tout le monde.",
  ch: [
    { h: "Y aller tous les jours", d: "Toute la saison, sans exception.", t: "Progression forte",
      run: () => O("Footwork, lecture des rotations, gestion du corps. Ces séances valent une carrière.", { iq: 8, midrange: 5, perimeterD: 5, durability: 4, stamina: 3 }, { locker: 8 }) },
    { h: "Y aller quand je peux", d: "Garder du sommeil.", t: "Gain modéré",
      run: () => O("Quelques séances, quelques conseils. Mieux que rien.", { iq: 3, midrange: 2, form: 4 }) },
  ] });

S_({ id: "pro_ballhog", cat: "Vestiaire", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons >= 2,
  n: () => ({ n1: R_().i(3, 8) }),
  head: "{star} réclame le ballon",
  body: "{matePerso}, il a déclaré devant {n1} caméras qu'« il y a des joueurs ici qui tirent trop ». Personne n'a eu besoin de demander de qui il parlait.",
  ch: [
    { h: "Lui céder du volume", d: "Réduire son usage pour l'équilibre.", t: "Vestiaire apaisé, stats en baisse",
      run: () => O("L'équipe joue mieux. Tes moyennes baissent de trois points. Les votants du MVP le remarquent aussi.", { leadership: 8, passing: 4, rep: -4 }, { locker: 12, coach: 8 }) },
    { h: "Refuser net", d: "C'est ton équipe.", t: "Dépend de ton statut et du vestiaire",
      run: branch([
        { when: (c) => isStar(c) && lockerHigh(c),
          then: O("Personne ne conteste. Le vestiaire savait déjà à qui appartenait cette équipe, et {star} rentre dans le rang le soir même.",
                  { leadership: 8, rep: 7, clutch: 4 }, { locker: 5, front: 4 }) },
        { when: (c) => isStar(c) && !lockerLow(c),
          then: luckCtx(0.62, ["locker", "coach"],
            () => O("Ton statut fait la différence. Il accepte le second rôle et signe sa meilleure saison.", { leadership: 6, rep: 6 }, { locker: 3 }),
            () => O("Ton statut ne suffit pas : il demande son transfert en {month} et la moitié du vestiaire le soutient.", { morale: -10 }, { locker: -12, front: -5 })) },
        { when: (c) => lockerLow(c),
          then: O("Tu n'avais pas le crédit pour ça. Le vestiaire prend son parti et {coachL} choisit de ne pas trancher — ce qui revient à trancher contre toi.",
                  { morale: -14, leadership: -5 }, { locker: -16, coach: -8 }) },
        { when: (c) => isYoung(c),
          then: O("À {age} ans, tu n'es pas en position d'exiger quoi que ce soit. La scène se retourne contre toi dans les médias.",
                  { morale: -9, rep: -5 }, { locker: -9, media: -7 }) },
        { then: luckCtx(0.5, ["locker"],
            () => O("Il rentre dans le rang, sans conviction. Le sujet reviendra.", { leadership: 4, rep: 3 }, { locker: -2 }),
            () => O("Il demande son transfert en {month}. Le vestiaire se scinde en deux.", { morale: -12 }, { locker: -14, front: -6 })) },
      ]) },
    { h: "En parler à {coachL}", d: "Régler ça sans micro.", t: "Solution posée",
      run: () => O("{coachL} réorganise ses systèmes. Personne n'en parle publiquement, tout le monde y gagne.", { iq: 5, leadership: 5, morale: 5 }, { coach: 11, locker: 7 }) },
  ] });

S_({ id: "pro_coachfight", cat: "Staff", ph: ["pro"], w: 3,
  when: (c) => c.p.trust < 58,
  n: () => ({ n1: R_().i(4, 11) }),
  head: "{coachL} te sort du cinq",
  body: "{coachTrait} Après {n1} défaites, il annonce le changement en réunion vidéo, devant tout le monde, sans t'avoir prévenu.",
  ch: [
    { h: "Accepter et bosser", d: "Reprendre la place sur le terrain.", t: "Crédit regagné",
      run: () => O("Six semaines plus tard tu es de retour dans le cinq, et il ne t'en sortira plus.", { stamina: 3, iq: 4, morale: -5 }, { coach: 14, locker: 5 }) },
    { h: "Exiger une explication", d: "Frapper à sa porte le soir même.", t: "Franc, risqué",
      run: luck(0.5,
        () => O("Vous criez vingt minutes, puis vous vous comprenez. Le respect est mutuel désormais.", { leadership: 6, clutch: 3 }, { coach: 12 }),
        () => O("Il te colle une amende et te laisse au banc un mois de plus.", { money: -180000, morale: -14 }, { coach: -14 })) },
    { h: "Passer par {agentL}", d: "Laisser l'agent gérer.", t: "Guerre froide",
      run: () => O("{agentL} appelle la direction. {coachL} l'apprend et ne te le pardonnera pas.", { rep: 4 }, { front: 8, coach: -16, locker: -4 }) },
  ] });

S_({ id: "pro_coachfired", cat: "Staff", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 2,
  head: "{coachL} est démis de ses fonctions",
  body: "{gm}, qui {gmStyle}, a tranché après une série de résultats. Le nouveau veut te rencontrer dès demain.",
  ch: [
    { h: "Adhérer au nouveau projet", d: "Apprendre, s'adapter, exécuter.", t: "QI basket",
      run: (c) => { const nc = CAST.newCoach(c.cast);
        return O("Tu maîtrises le nouveau playbook en deux semaines. " + CAST.lastOf(nc.name) + " bâtit son attaque autour de toi.", { iq: 6, passing: 3, morale: 4 }, { coach: 14 }); } },
    { h: "Défendre l'ancien staff", d: "Dire publiquement que le problème était ailleurs.", t: "Intègre, coûteux",
      run: (c) => { CAST.newCoach(c.cast);
        return O("Ton honnêteté impressionne le vestiaire et refroidit la direction.", { leadership: 8, rep: 6 }, { locker: 12, front: -12, coach: -6 }); } },
  ] });

S_({ id: "pro_newmate", cat: "Vestiaire", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 2,
  head: "Un nouveau dans le vestiaire",
  body: "La franchise vient de recruter à ton poste. Tout le monde attend de voir comment tu le reçois.",
  ch: [
    { h: "Le prendre sous mon aile", d: "Transmettre ce qu'on t'a transmis.", t: "Leadership",
      run: (c) => { const s = CAST.swapMate(c.cast);
        return O("Il éclate dès sa deuxième saison et cite ton nom dans chaque entretien. " + CAST.lastOf(s.gone.name) + ", lui, est parti sans un mot.", { leadership: 10, iq: 5, fame: 5, morale: 6 }, { locker: 12, coach: 6 }); } },
    { h: "Le laisser se débrouiller", d: "Personne ne t'a aidé non plus.", t: "Distance",
      run: (c) => { CAST.swapMate(c.cast);
        return O("Il galère un an. Le vestiaire remarque ton silence.", { three: 3, midrange: 3, leadership: -5 }, { locker: -9 }); } },
    { h: "Le défier chaque jour", d: "L'endurcir par la confrontation.", t: "Rude",
      run: luck(0.6,
        (c) => { CAST.swapMate(c.cast);
          return O("Vos duels à l'entraînement deviennent légendaires. Vous progressez tous les deux.", { clutch: 6, perimeterD: 5, athleticism: 3 }, { locker: 6 }); },
        (c) => { CAST.swapMate(c.cast);
          return O("Tu le casses psychologiquement. La direction n'apprécie pas du tout.", { leadership: -6, morale: -5 }, { front: -10, coach: -8 }); }) },
  ] });

S_({ id: "pro_vetclash", cat: "Vestiaire", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 3,
  head: "{vet} conteste ton statut",
  body: "Devant les caméras, il a estimé que « certains joueurs ici se croient arrivés ». {journo} a relayé la phrase en titre.",
  ch: [
    { h: "Le confronter en interne", d: "Vider l'abcès entre quatre murs.", t: "Vestiaire clarifié",
      run: () => O("Une heure de discussion. Il devient ton meilleur soutien pour le reste de la saison.", { leadership: 8, morale: 6 }, { locker: 11, coach: 4 }) },
    { h: "Le laisser dire", d: "Ne pas nourrir l'histoire.", t: "Neutre",
      run: () => O("L'histoire meurt d'elle-même en une semaine.", { iq: 3, morale: -2 }) },
    { h: "Demander son départ", d: "Aller voir {gmL}.", t: "Autorité, ou boomerang",
      run: luck(0.45,
        (c) => { CAST.swapMate(c.cast);
          return O("Il est échangé en {month}. Le vestiaire comprend qui décide désormais.", { leadership: 6, rep: 5 }, { front: 6, locker: -4 }); },
        () => O("{gmL} refuse et l'histoire fuite. Tu passes pour le problème.", { rep: -8, morale: -10 }, { front: -12, locker: -10, media: -8 })) },
  ] });

/* ─────────────────────────────────────────────
   PRO — MÉDIAS & IMAGE
   ───────────────────────────────────────────── */

S_({ id: "pro_presser", cat: "Médias", ph: ["pro"], w: 4,
  n: () => ({ n1: R_().i(3, 8) }),
  head: "{journo} tend le micro après la {n1}ᵉ défaite",
  body: "{journoStance}, il écrit pour {outlet}. Sa question : est-ce que le problème vient de {coachL} ?",
  ch: [
    { h: "Protéger le groupe", d: "Assumer collectivement.", t: "Staff et vestiaire",
      run: () => O("« On perd ensemble. » La phrase tourne en boucle, et le vestiaire l'a entendue.", { leadership: 7, morale: 4, rep: 3 }, { coach: 10, locker: 9, media: 4 }) },
    { h: "Dire ce que je pense", d: "Pointer les vrais problèmes.", t: "Explosif",
      run: luck(0.4,
        () => O("{gmL} te donne raison et change le staff. Tu deviens la voix de la franchise.", { leadership: 9, rep: 14, fame: 8 }, { front: 6, media: 10, coach: -10 }),
        () => O("{coachL} le prend très mal. Tes minutes fondent pendant six semaines.", { morale: -12, rep: 6 }, { coach: -18, front: -6 })) },
    { h: "Botter en touche", d: "Trois phrases creuses.", t: "Neutre",
      run: () => O("Personne n'en retient rien. C'était l'objectif.", { iq: 2, form: 2 }, { media: -4 }) },
  ] });

S_({ id: "pro_podcast", cat: "Médias", ph: ["pro"], w: 4,
  head: "Le podcast de {journo}",
  body: "En direct, on te demande de citer les cinq meilleurs joueurs de la ligue. {star} écoute dans le bus.",
  ch: [
    { h: "Me citer dedans", d: "Assumer sa valeur.", t: "Confiance et bruit",
      run: () => O("Le clip fait le tour de la ligue. Certains rient, d'autres notent ton nom.", { fame: 8, clutch: 4, rep: 5, followers: 400 }, { media: 6, locker: -5 }) },
    { h: "Citer {star}", d: "Renvoyer l'ascenseur.", t: "Vestiaire acquis",
      run: () => O("Il l'apprend en direct dans le bus. Vous ne serez plus jamais en froid.", { leadership: 8, morale: 6 }, { locker: 14 }) },
    { h: "Refuser de répondre", d: "Esquiver.", t: "Rien à signaler",
      run: () => O("Tu bottes en touche avec le sourire. Aucun titre ne sortira de cet entretien.", { iq: 3 }, { media: -5 }) },
  ] });

S_({ id: "pro_beef", cat: "Réseaux", ph: ["pro"], w: 4,
  n: () => ({ n1: R_().i(28, 48) }),
  head: "{rival} te tacle publiquement",
  body: "{rivalStyle} de {rivalTeam}, drafté la même année que toi. Dans son émission, il a dit que tu n'avais « jamais rien gagné ». Vous vous croisez en {month}.",
  ch: [
    { h: "Répondre publiquement", d: "Ne rien laisser passer.", t: "Selon ton crédit auprès des médias",
      run: branch([
        { when: (c) => ((c.p.rel && c.p.rel.media) || 50) >= 66,
          then: O("La presse prend ton parti sans même que tu le demandes. {rivalL} se retrouve seul contre tout le monde.",
                  { fame: 11, rep: 9, followers: 800 }, { media: 6, fans: 8 }) },
        { when: (c) => ((c.p.rel && c.p.rel.media) || 50) < 38,
          then: O("Les éditorialistes retournent ta phrase contre toi pendant une semaine. Tu n'aurais pas dû ouvrir ce dossier.",
                  { fame: 5, rep: -6, form: -6, morale: -7 }, { media: -10 }) },
        { when: (c) => !isStar(c),
          then: O("On te reproche de parler plus fort que tu ne joues. La comparaison ne joue pas en ta faveur.",
                  { fame: 6, rep: -3, form: -4 }, { media: -4 }) },
        { then: O("Ta réponse fait plus de vues que le clip original. Le débat dure trois semaines.",
                  { fame: 9, rep: 8, followers: 700, form: -5 }, { media: 8 }) },
      ]), rivalUp: 12 },
    { h: "Répondre sur le terrain", d: "Le match de {month}.", t: "Silence assourdissant",
      run: luck(0.6,
        (c, b) => O("Tu plantes " + b.n1 + " points sur lui et tu regardes la caméra sans un mot. Le clip devient culte.", { fame: 12, clutch: 6, rep: 10, followers: 900, morale: 8 }, { fans: 12 }, "epic"),
        () => O("Tu forces toute la soirée, sept sur vingt-quatre. Son podcast a du grain à moudre.", { morale: -9, form: -6, rep: -4 })), rivalUp: 8 },
    { h: "Ignorer", d: "Ne rien lire, ne rien dire.", t: "Sérénité",
      run: () => O("Tu n'ouvres pas l'application pendant un mois. Ton jeu s'en porte mieux.", { morale: 6, form: 7, iq: 3 }) },
  ] });

S_({ id: "pro_doc", cat: "Médias", ph: ["pro"], w: 3,
  when: (c) => c.p.fame > 22,
  head: "Un documentaire sur ta saison",
  body: "Une plateforme veut des caméras dans le vestiaire, dans ta voiture, chez {parentRole}. Douze épisodes.",
  ch: [
    { h: "Tout ouvrir", d: "Accès total, sans filtre.", t: "Aura maximale, intimité perdue",
      run: () => O("La série cartonne. On te reconnaît partout, et {mate} n'a pas apprécié certaines scènes.", { money: 2400000, fame: 16, followers: 1200 }, { media: 12, fans: 10, locker: -8 }, "money") },
    { h: "Encadrer strictement", d: "Terrain uniquement.", t: "Compromis",
      run: () => O("Le produit est propre et consensuel. Personne n'est fâché, personne n'est marqué.", { money: 900000, fame: 6 }, { media: 4 }, "money") },
    { h: "Refuser", d: "La vie privée n'est pas à vendre.", t: "Sérénité",
      run: () => O("Tu passes ton tour. La saison se joue sans caméra dans ton dos.", { morale: 8, form: 6 }, { media: -6 }) },
  ] });

S_({ id: "pro_night", cat: "Hors terrain", ph: ["pro"], w: 3,
  when: (c) => c.p.age <= 31,
  head: "Une vidéo de sortie à trois heures du matin",
  body: "La veille d'un match contre {opp}. {outlet} l'a publiée à sept heures. {agentL} appelle avant même ton réveil.",
  ch: [
    { h: "Assumer publiquement", d: "S'excuser, tourner la page.", t: "Crédibilité préservée",
      run: () => O("Ton communiqué est sobre. L'affaire s'éteint en trois jours.", { rep: -3, leadership: 4, morale: -3 }, { media: 5, coach: 3 }) },
    { h: "Nier en bloc", d: "Prétendre que c'était un autre soir.", t: "Risqué",
      run: luck(0.4,
        () => O("Personne ne creuse. L'histoire disparaît.", { rep: 2 }),
        () => O("Un second angle sort le lendemain. Amende de la franchise et titre en une.", { money: -400000, rep: -12, morale: -10 }, { front: -14, media: -12, coach: -8 }, "bad")) },
    { h: "En rire", d: "Transformer ça en contenu.", t: "Aura contre sérieux",
      run: () => O("Ton post fait dix millions de vues. {coachL} rit beaucoup moins.", { fame: 10, followers: 600, rep: 5 }, { coach: -10, fans: 6 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — CONTRAT, AGENT, DIRECTION
   ───────────────────────────────────────────── */

S_({ id: "pro_renego", cat: "Contrat", ph: ["pro"], w: 4,
  when: (c) => c.p.contract && c.p.career.seasons >= 2,
  n: () => ({ n1: R_().i(22, 45) }),
  head: "{agentL} veut renégocier",
  body: "{agentTrait} Il estime que tu es sous-payé de {n1} pour cent et propose de mettre la franchise sous pression publiquement.",
  ch: [
    { h: "Le laisser faire", d: "Mettre {gmL} au pied du mur.", t: "Argent contre image",
      run: luck(0.5,
        (c) => O("La direction cède et rallonge ton contrat.", { money: Math.round(c.p.salary * 0.8), rep: -4 }, { front: -8, media: -5 }, "money"),
        () => O("{gmL} refuse et fait fuiter que tu es « difficile ». Le marché s'en souviendra.", { rep: -9, morale: -8 }, { front: -14, media: -8 })) },
    { h: "Honorer mon contrat", d: "J'ai signé, je joue.", t: "Réputation intacte",
      run: () => O("Ta position circule dans la ligue. Les dirigeants adorent ce type de joueur.", { rep: 7, leadership: 5 }, { front: 14, coach: 8 }) },
    { h: "Changer d'agent", d: "{agentL} va trop loin.", t: "Rupture",
      run: (c) => { const used = new Set(c.cast.used || []); c.cast.agent = { name: CAST.rname(used), style: ENG.R.pick(CAST.AGENT_STYLES) }; c.cast.used = Array.from(used);
        return O("Tu signes chez " + CAST.lastOf(c.cast.agent.name) + ". Le milieu en parle pendant deux semaines.", { rep: 2, morale: 4 }, { front: 5 }); } },
  ] });

S_({ id: "pro_gm", cat: "Direction", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 3,
  head: "{gm} t'invite à déjeuner",
  body: "Il {gmStyle}. Il veut ton avis sur le prochain choix de draft, et surtout savoir si tu te projettes ici.",
  ch: [
    { h: "Réclamer du renfort immédiat", d: "Un vétéran, maintenant.", t: "Gagner tout de suite",
      run: luck(0.55,
        () => O("La franchise recrute un titulaire confirmé cet été. L'effectif monte d'un cran.", { morale: 8 }, { front: 8, locker: 5 }, "good"),
        () => O("Il t'écoute poliment et drafte un jeune de dix-neuf ans.", { morale: -6 }, { front: -4 })) },
    { h: "Soutenir la reconstruction", d: "Patience et jeunesse.", t: "Confiance de la direction",
      run: () => O("Ton discours le rassure. Tu deviens le pilier autour duquel tout se construit.", { leadership: 6, iq: 4 }, { front: 15, coach: 6 }) },
    { h: "Poser mes conditions", d: "Dire clairement ce qu'il te faut.", t: "Franc, tranchant",
      run: luck(0.45,
        () => O("Il apprécie la clarté et exécute point par point.", { rep: 6, leadership: 5 }, { front: 10 }),
        () => O("Il te trouve arrogant. La conversation s'arrête au dessert.", { rep: -4 }, { front: -13 })) },
  ] });

S_({ id: "pro_deadline", cat: "Transferts", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons >= 2,
  head: "La date limite des transferts",
  body: "Ton nom circule. {gmL} te demande discrètement ce que tu souhaites, et {agentL} a déjà trois clubs au téléphone.",
  ch: [
    { h: "Demander à rester", d: "Construire ici.", t: "Loyauté",
      run: () => O("La direction apprécie. Tu deviens officiellement le visage de la franchise.", { morale: 7, rep: 4, leadership: 4 }, { front: 12, fans: 10, coach: 6 }) },
    { h: "Demander un transfert", d: "Chercher un projet compétitif.", t: "Changement probable",
      run: () => ({ txt: "{agentL} transmet le message. Le téléphone de {gmL} ne s'arrête plus.", mods: { rep: 6, morale: -3 }, rel: { front: -10, fans: -12 }, flag: "tradeRequest" }) },
    { h: "Ne rien dire", d: "Laisser le marché décider.", t: "Incertain",
      run: luck(0.35,
        () => ({ txt: "Coup de tonnerre : tu apprends ton transfert par une notification.", mods: { morale: -8, rep: 5 }, kind: "bad", flag: "traded" }),
        () => O("La date limite passe. Tu es toujours là.", { morale: 2 })) },
  ] });

S_({ id: "pro_shoe", cat: "Sponsoring", ph: ["pro"], w: 3,
  when: (c) => c.p.fame > 15,
  n: () => ({ n1: R_().i(3, 9) }),
  head: "Une marque veut ton visage",
  body: "Campagne nationale, {n1} jours de tournage en pleine saison. {agentL} pousse fort.",
  ch: [
    { h: "Accepter", d: "Gros chèque, calendrier chargé.", t: "Argent et aura",
      run: (c) => O("Ton visage est sur tous les abribus du pays.", { money: Math.round(900000 * (1 + c.p.fame / 100)), fame: 7, followers: 300, form: -6 }, { media: 6, fans: 5 }, "money") },
    { h: "Refuser", d: "La saison d'abord.", t: "Forme préservée",
      run: () => O("Tu restes dans ta routine. Le staff médical te remercie.", { form: 8 }, { coach: 6 }) },
  ] });

S_({ id: "pro_invest", cat: "Business", ph: ["pro"], w: 3,
  when: (c) => c.p.money > 900000,
  n: () => ({ n1: R_().i(2, 6) }),
  head: "{sibling} propose une affaire",
  body: "{siblingRole} veut monter une chaîne de salles de sport et cherche {n1} millions. Il a un dossier, un vrai.",
  ch: [
    { h: "Investir gros", d: "Miser la somme demandée.", t: "Tout ou rien",
      run: luck(0.45,
        (c, b) => O("Trois ans plus tard, quarante salles ouvertes. Le retour dépasse largement la mise.", { money: b.n1 * 3800000, iq: 3, fame: 4 }, null, "money"),
        (c, b) => O("L'affaire coule en dix-huit mois. Les repas de famille sont devenus difficiles.", { money: -b.n1 * 1000000, morale: -12 }, null, "bad")) },
    { h: "Investir prudemment", d: "Le dixième, pas plus.", t: "Risque limité",
      run: luck(0.6,
        (c, b) => O("Petit placement, petit gain. Rien de spectaculaire, rien de dramatique.", { money: b.n1 * 260000 }, null, "money"),
        (c, b) => O("Tu perds la mise. Leçon peu coûteuse.", { money: -b.n1 * 100000, iq: 3 })) },
    { h: "Refuser", d: "Garder l'argent où il est.", t: "Aucun risque",
      run: () => O("Ton conseiller approuve. {sibling} beaucoup moins.", { iq: 2, morale: -5 }) },
  ] });

S_({ id: "pro_tax", cat: "Argent", ph: ["pro"], w: 2,
  when: (c) => c.p.money > 4000000,
  head: "Un audit sur tes placements",
  body: "Ton ancien conseiller a mal orienté une partie de tes gains. {agentL} l'a découvert par hasard.",
  ch: [
    { h: "Attaquer en justice", d: "Long, coûteux, légitime.", t: "Récupération partielle",
      run: luck(0.55,
        () => O("Trois ans de procédure, et tu récupères l'essentiel.", { money: 3200000, iq: 4, morale: 4 }, null, "money"),
        () => O("Tu perds le procès et les frais d'avocat.", { money: -900000, morale: -10 }, null, "bad")) },
    { h: "Solder et repartir", d: "Tourner la page proprement.", t: "Perte sèche, sérénité",
      run: () => O("Tu changes toute ton équipe financière et tu n'y penses plus.", { money: -1400000, morale: 5, iq: 3 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — CORPS & PERFORMANCE
   ───────────────────────────────────────────── */

S_({ id: "pro_load", cat: "Corps", ph: ["pro"], w: 4,
  n: () => ({ n1: R_().i(9, 22) }),
  head: "Le staff médical veut te mettre au repos",
  body: "Une inflammation détectée à l'imagerie. {n1} matchs de repos préventif, en pleine course aux playoffs.",
  ch: [
    { h: "Suivre le protocole", d: "Corps préservé, public déçu.", t: "Santé",
      run: () => O("Tu reviens frais et finis la saison sans alerte. Les tribunes ont râlé pendant un mois.", { health: 18, durability: 4, form: 8, rep: -3 }, { coach: 8, fans: -10 }) },
    { h: "Jouer quand même", d: "L'équipe a besoin de toi maintenant.", t: "Risqué",
      run: luck(0.5,
        () => O("Tu tiens la saison entière. Le vestiaire n'oubliera pas.", { leadership: 8, rep: 8, health: -12 }, { locker: 12, fans: 12, coach: -4 }),
        () => O("L'inflammation dégénère. Six semaines d'absence au pire moment.", { health: -24, athleticism: -3, morale: -12 }, { coach: -8 }, "bad")) },
    { h: "Gestion de charge", d: "Un match sur deux jusqu'en {month}.", t: "Compromis",
      run: () => O("Le public râle, ton corps encaisse. Les analystes appellent ça la modernité.", { health: 10, form: 5, rep: -6 }, { fans: -8, coach: 4 }) },
  ] });

/* la scène ne se déclenche que s'il y a réellement eu une longue absence
   la saison passée : sinon le texte raconterait une blessure imaginaire */
S_({ id: "pro_comeback", cat: "Retour", ph: ["pro"], w: 4,
  when: (c) => c.season && c.season.missed >= 20 && c.season.injuries &&
               c.season.injuries.some((i) => i.sev >= 3),
  n: () => ({}),
  bindx: (c) => {
    const inj = c.season.injuries.filter((i) => i.sev >= 3).sort((a, b) => b.sev - a.sev)[0];
    return { inj: inj ? inj.n : "blessure", miss: c.season.missed,
             mois: Math.max(2, Math.round(c.season.missed / 9)) };
  },
  head: "Le premier match après {mois} mois",
  body: "{miss} matchs manqués sur une {inj}. Rééducation terminée. Ce soir, contre {opp}, tout le monde regardera ton corps avant de regarder ton jeu.",
  ch: [
    { h: "Y aller progressivement", d: "Vingt minutes, sans forcer.", t: "Reconstruction saine",
      run: () => O("Tu ressors sans douleur. Le plus dur est derrière.", { health: 16, form: 10, morale: 8, durability: 3 }) },
    { h: "Tout donner", d: "Prouver que rien n'a changé.", t: "Risqué",
      run: luck(0.5,
        () => O("Vingt-huit points et un dunk en contre-attaque. Le doute est levé en une soirée.", { rep: 9, morale: 14, clutch: 5, fame: 5 }, { fans: 12 }, "epic"),
        () => O("Tu te crispes à la vingt-deuxième minute. Trois semaines de plus.", { health: -16, morale: -14, athleticism: -2 }, null, "bad")) },
  ] });

S_({ id: "pro_slump", cat: "Passage à vide", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons >= 3 && c.season && c.season.ppg < 20,
  n: () => ({ n1: R_().i(5, 11) }),
  bindx: (c) => ({ n2: Math.round(c.season.fg * 100) }),
  head: "{n1} matchs sous les quinze points",
  body: "Tu tires à {n2} pour cent depuis {month}. {journo} a écrit le mot « déclin » en titre.",
  ch: [
    { h: "Retourner aux fondamentaux", d: "Mille tirs par jour, comme à seize ans.", t: "Adresse retrouvée",
      run: () => O("Trois semaines de gymnase vide. Le geste revient, et la confiance avec.", { three: 4, midrange: 4, freeThrow: 3, morale: 6 }) },
    { h: "Changer mon jeu", d: "Défendre et créer en attendant.", t: "Polyvalence",
      run: () => O("Tu compenses par la défense et la passe. {coachL} découvre un autre joueur.", { passing: 5, perimeterD: 5, iq: 4 }, { coach: 9 }) },
    { h: "Forcer jusqu'à ce que ça rentre", d: "Continuer à shooter.", t: "Risqué",
      run: luck(0.42,
        () => O("Le quatorzième tir du sixième match rentre. Ensuite, cinq matchs à trente.", { clutch: 7, three: 3, morale: 10, rep: 6 }, { fans: 8 }),
        () => O("Tu finis le mois à trente-six pour cent. {coachL} te sort du cinq deux matchs.", { morale: -12, form: -8 }, { coach: -10 })) },
  ] });

S_({ id: "pro_bigsummer", cat: "Intersaison", ph: ["pro"], w: 3,
  head: "L'été chez {vet}",
  body: "Il organise un camp fermé dans sa maison de {oppCity}. Six joueurs, un terrain, aucune caméra.",
  ch: [
    { h: "Y aller", d: "Six semaines de duels quotidiens.", t: "Progression et réseau",
      run: () => O("Tu ressors avec un jeu affiné et trois numéros importants dans le téléphone.", { midrange: 4, handle: 4, iq: 4, clutch: 3 }, { locker: 6 }) },
    { h: "Rester avec mon préparateur", d: "Programme individuel.", t: "Corps",
      run: () => O("Le travail est moins spectaculaire mais parfaitement calibré pour toi.", { athleticism: 4, stamina: 5, durability: 4, health: 10 }) },
  ] });

S_({ id: "pro_record", cat: "Record", ph: ["pro"], w: 3,
  when: (c) => c.season && c.season.ppg >= 17,
  n: () => ({ n2: R_().i(54, 68) }),
  bindx: (c) => ({ n1: Math.round(c.season.ppg * 1.25) }),
  head: "{n1} points à la mi-temps",
  body: "Contre {opp}, tout rentre. {coachL} te laisse le choix pour la seconde période, le match est déjà plié.",
  ch: [
    { h: "Chasser le record", d: "Rester sur le terrain.", t: "Soirée historique",
      run: luck(0.5,
        (c, b) => O("Tu finis à " + b.n2 + " points. La salle adverse t'applaudit debout à la sortie.", { fame: 13, rep: 11, clutch: 6, followers: 700, morale: 12 }, { fans: 14 }, "epic"),
        () => O("Tu forces et tu retombes à quarante-deux points en dix-neuf tirs. Belle soirée, rien d'historique.", { rep: 5, fame: 4, midrange: 2 })) },
    { h: "Sortir et laisser jouer {rookie}", d: "Le match est plié.", t: "Respect du vestiaire",
      run: () => O("Tu regardes la fin depuis le banc en encourageant les remplaçants. Ce genre de geste ne s'oublie pas.", { leadership: 9, morale: 5, health: 6 }, { locker: 14, coach: 11 }) },
  ] });

S_({ id: "pro_allstar", cat: "All-Star", ph: ["pro"], w: 3,
  when: (c) => c.p.career.allStar >= 1,
  head: "Le week-end des étoiles à {oppCity}",
  body: "Trois jours de projecteurs, de sollicitations et de photos. {agentL} a rempli ton planning heure par heure.",
  ch: [
    { h: "Concours de dunks", d: "Le show, la foule.", t: "Aura maximale",
      run: luck(0.55,
        () => O("Un cinquante parfait sur le dernier dunk. La vidéo tourne pendant des mois.", { fame: 14, rep: 10, followers: 800, morale: 10 }, { fans: 14 }, "trophy"),
        () => O("Trois essais ratés sur ton dunk signature. Le public siffle gentiment.", { fame: 4, morale: -8, followers: 150 })) },
    { h: "Concours à trois points", d: "Plus sobre, plus technique.", t: "Adresse et crédibilité",
      run: luck(0.5,
        () => O("Tu gagnes avec vingt-sept points au dernier rack. Ton tir devient une référence.", { three: 4, fame: 9, rep: 6, morale: 8 }, { fans: 8 }, "trophy"),
        () => O("Éliminé au premier tour. Personne n'en reparlera.", { fame: 3, three: 1 })) },
    { h: "Rentrer me reposer", d: "Décliner poliment.", t: "Corps frais",
      run: () => O("Tu honores le match et rentres chez toi. Ton corps te remercie en {month}.", { health: 12, form: 10, fame: -3 }, { media: -6, fans: -5 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — VIE PRIVÉE
   ───────────────────────────────────────────── */

S_({ id: "pro_partner", cat: "Vie privée", ph: ["pro"], w: 3,
  when: (c) => c.p.age >= 24 && !c.cast.family.partner,
  head: "Quelqu'un qui ne connaît rien au basket",
  body: "Rencontrée à {city} il y a trois mois. Elle ne sait pas ce qu'est une prolongation de contrat, et ça te repose.",
  ch: [
    { h: "M'engager", d: "Construire quelque chose.", t: "Stabilité",
      run: (c) => { const used = new Set(c.cast.used || []); c.cast.family.partner = { name: CAST.rname(used, "f") }; c.cast.used = Array.from(used);
        return O("Vous emménagez ensemble en {month}. Tu dors mieux, tu joues mieux.", { morale: 14, form: 8, clutch: 3 }); } },
    { h: "Garder mes distances", d: "La carrière d'abord.", t: "Concentration",
      run: () => O("Tu coupes court. La saison est longue et l'appartement, silencieux.", { form: 5, three: 3, morale: -6 }) },
  ] });

S_({ id: "pro_move", cat: "Vie privée", ph: ["pro"], w: 3,
  when: (c) => c.p.age >= 26 && !!c.cast.family.partner,
  head: "{partner} a une opportunité à {opp2City}",
  body: "Un poste qu'elle attend depuis des années, à deux mille kilomètres de {city}.",
  ch: [
    { h: "Demander un transfert", d: "La suivre si possible.", t: "Vie stable, carrière bousculée",
      run: () => ({ txt: "Tu demandes officiellement à être échangé. {gmL} l'apprend par la presse.", mods: { morale: 10 }, rel: { front: -12, fans: -10 }, flag: "tradeRequest" }) },
    { h: "La distance", d: "Tenir à deux mille kilomètres.", t: "Moral fragilisé",
      run: luck(0.5,
        () => O("Ça tient. Vous vous voyez une semaine sur trois et ça vous suffit.", { morale: 3, form: 2 }),
        (c) => { c.cast.family.partner = null;
          return O("Ça casse en {month}. Ta saison s'effondre avec.", { morale: -18, form: -12 }, null, "bad"); }) },
    { h: "Lui demander de rester", d: "Sacrifier sa carrière.", t: "Confort, culpabilité",
      run: () => O("Elle reste. Vous n'en reparlez jamais, mais quelque chose s'est fissuré.", { morale: -6, form: 4, clutch: 3 }) },
  ] });

S_({ id: "pro_kid", cat: "Famille", ph: ["pro"], w: 3,
  when: (c) => !!c.cast.family.partner && c.p.age >= 26 && c.cast.family.kids < 3,
  head: "Un enfant arrive en {month}",
  body: "L'échographie était hier. {parentRole} l'a appris avant ton agent, pour une fois.",
  ch: [
    { h: "Manquer des matchs pour être présent", d: "Rater le déplacement de l'Ouest.", t: "Famille avant tout",
      run: (c) => { c.cast.family.kids++;
        return O("Tu es là pour la naissance. Trois matchs manqués, aucun regret.", { morale: 18, leadership: 4, form: -4 }, { locker: 6, coach: -3, fans: 4 }); } },
    { h: "Jouer tous les matchs", d: "Le calendrier ne s'arrête pas.", t: "Disponibilité",
      run: (c) => { c.cast.family.kids++;
        return O("Tu apprends la naissance dans un avion. Tu n'en parles à personne.", { morale: -6, durability: 2 }, { coach: 8 }); } },
  ] });

S_({ id: "pro_gym", cat: "Communauté", ph: ["pro"], w: 3,
  when: (c) => c.p.money > 1500000,
  head: "Le gymnase de ton quartier va fermer",
  body: "Celui où {parentRole} te déposait à sept heures du matin. La municipalité coupe le budget en {month}.",
  ch: [
    { h: "Le racheter et le rénover", d: "Ton nom sur la façade.", t: "Héritage local",
      run: () => O("Six cents gamins y jouent chaque semaine. C'est peut-être ce que tu auras fait de mieux.", { money: -2000000, fame: 8, leadership: 7, morale: 14 }, { fans: 18, media: 8 }) },
    { h: "Financer une saison", d: "Un chèque discret.", t: "Geste mesuré",
      run: () => O("Tu payes l'année sans le dire. {outlet} finit par l'apprendre.", { money: -250000, morale: 8 }, { fans: 8 }) },
    { h: "Ne rien faire", d: "Ce n'est pas ton rôle.", t: "Aucun effet",
      run: () => O("Le gymnase ferme en juin. Tu passes devant en voiture l'été suivant.", { morale: -8 }, { fans: -6 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — RIVALITÉS & GRANDS MOMENTS
   ───────────────────────────────────────────── */

S_({ id: "pro_duel", cat: "Rivalité", ph: ["pro"], w: 4,
  when: (c) => c.p.career.seasons >= 2,
  n: () => ({ n1: R_().i(30, 38) }),
  head: "Quatre duels contre {rival} cette saison",
  body: "{rivalStyle} de {rivalTeam}. On vous compare depuis la draft, et la comparaison agace tout le monde sauf les diffuseurs.",
  ch: [
    { h: "En faire une obsession", d: "Organiser la saison autour de ces quatre matchs.", t: "Progression par la rivalité",
      run: luck(0.58,
        (c, b) => O("Trois duels gagnés sur quatre, " + b.n1 + " points de moyenne. Le débat est clos pour un moment.", { clutch: 8, midrange: 4, rep: 10, fame: 6, morale: 8 }, { fans: 10 }),
        () => O("Il te domine trois fois. Les comparaisons deviennent humiliantes.", { morale: -14, rep: -6, clutch: 3 })), rivalUp: 14 },
    { h: "Refuser la comparaison", d: "On ne joue pas au même jeu.", t: "Sérénité",
      run: () => O("Ta réponse posée fait le tour des réseaux. Vous finirez par vous respecter.", { iq: 4, leadership: 4, morale: 5 }, { media: 6 }), rivalUp: -10 },
    { h: "L'appeler après le premier duel", d: "Désamorcer en privé.", t: "Une alliance possible",
      run: () => O("Deux heures au téléphone. Vous parlerez de vous associer un jour, et ce n'est pas une plaisanterie.", { iq: 5, leadership: 4, morale: 6 }), rivalUp: -20 },
  ] });

S_({ id: "pro_superteam", cat: "Loyauté", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 3 && ENG.ovr(c.p) >= 72,
  head: "{rival} t'appelle un soir de juillet",
  body: "Lui et deux autres montent un projet. Ils te réservent la troisième place et ont déjà tout calculé.",
  ch: [
    { h: "Les rejoindre", d: "Maximiser les chances de titre.", t: "Titre probable, héritage discuté",
      run: () => ({ txt: "Tu acceptes. On te dira toute ta vie que tu as pris le chemin le plus court.", mods: { morale: 8, rep: -6, fame: 10 }, rel: { fans: -14, media: -6 }, flag: "ringChase" }) },
    { h: "Refuser et bâtir ici", d: "Gagner avec sa propre franchise.", t: "Héritage renforcé",
      run: () => O("Ton refus fuite dans la presse. {city} te porte en triomphe avant même le premier match.", { rep: 12, leadership: 9, fame: 6, morale: 8 }, { fans: 20, front: 12 }) },
  ] });

S_({ id: "pro_gm7", cat: "Playoffs", ph: ["pro"], w: 4,
  when: (c) => c.madePlayoffs,
  n: () => ({ n1: R_().i(12, 26) }),
  head: "Match sept, {n1} secondes, un point de retard",
  body: "Chez {opp}, salle debout. {coachL} pose le tableau, et le système est pour toi.",
  ch: [
    { h: "Attaquer le cercle", d: "Chercher la faute ou le panier.", t: "Ton clutch, ta forme et ton gabarit décident",
      run: branch([
        { when: (c) => isBig(c),
          then: luckCtx(0.60, ["clutch", "form"],
            () => O("Tu prends l'aile, tu poses l'épaule, et personne ne peut te tenir à cette distance du cercle. Panier plus un.",
                    { clutch: 10, finishing: 5, rep: 14, fame: 9, morale: 12 }, { fans: 16 }, "epic"),
            () => O("Ils envoient le double et te sortent le ballon des mains. Perte de balle à sept secondes de la fin.",
                    { clutch: 3, morale: -14 }, { fans: -6 })) },
        { when: (c) => c.p.attrs.freeThrow >= 82,
          then: luckCtx(0.58, ["clutch", "form"],
            () => O("Tu provoques le contact. Deux lancers, et ta ligne des lancers ne tremble jamais. Série prolongée.",
                    { clutch: 9, freeThrow: 3, rep: 13, fame: 8, morale: 12 }, { fans: 15 }, "epic"),
            () => O("Les arbitres laissent jouer. Tu finis au sol sans coup de sifflet.", { clutch: 4, morale: -12 })) },
        { then: luckCtx(0.46, ["clutch", "form", "morale"],
            () => O("Tu passes en force et tu marques dans le contact. La salle adverse se tait d'un coup.",
                    { clutch: 10, rep: 14, fame: 9, morale: 12 }, { fans: 16 }, "epic"),
            () => O("Le contre arrive du côté aveugle. Tu restes assis sur le parquet trente secondes.",
                    { clutch: 4, morale: -14 })) },
      ]) },
    { h: "Ressortir sur {mate}", d: "Le bon coup basket.", t: "QI basket",
      run: luck(0.48,
        () => O("{mateL} rentre le tir du corner. Tu as gagné le match sans marquer.", { iq: 8, passing: 6, leadership: 7, rep: 8 }, { locker: 14 }),
        () => O("Le tir est court. On te reprochera de ne pas avoir pris tes responsabilités.", { iq: 4, rep: -6, morale: -10 }, { media: -8, fans: -6 })) },
  ] });

S_({ id: "pro_nt", cat: "Sélection", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 1,
  head: "L'été international",
  body: "La sélection prépare le tournoi mondial. Deux mois de préparation, et une saison qui arrive juste derrière.",
  ch: [
    { h: "Jouer pour mon pays", d: "Le maillot national, quoi qu'il en coûte.", t: "Aura mondiale",
      run: luck(0.4,
        () => O("Vous ramenez l'or. Tu es élu meilleur joueur du tournoi. Le monde entier a regardé.", { rep: 16, fame: 14, clutch: 6, leadership: 6, followers: 600, health: -12 }, { fans: 12 }, "trophy"),
        () => O("Élimination en quart. Deux mois de fatigue pour rien.", { rep: 5, fame: 4, health: -14, morale: -6 })) },
    { h: "Déclarer forfait", d: "Se reposer.", t: "Corps frais",
      run: () => O("Tu passes l'été sur la table de massage. Le pays râle, ton corps applaudit.", { health: 16, form: 12, three: 3, rep: -7 }, { fans: -8 }) },
  ] });

/* ─────────────────────────────────────────────
   PRO — FIN DE CARRIÈRE
   ───────────────────────────────────────────── */

S_({ id: "pro_rebuild", cat: "Fin de cycle", ph: ["pro"], w: 3,
  when: (c) => c.p.age >= 29 && c.p.career.seasons >= 6,
  head: "{gmL} annonce une reconstruction",
  body: "Trois ans de projet, minimum. À ton âge, tu n'en verras pas la fin sous ce maillot.",
  ch: [
    { h: "Rester et accompagner", d: "Être le vétéran qui forme la relève.", t: "Respect, peu de victoires",
      run: () => O("Tu deviens le professeur du vestiaire. Ton maillot montera au plafond, c'est déjà écrit.", { leadership: 10, iq: 5, fame: 6, morale: 3 }, { front: 14, fans: 16, locker: 10 }) },
    { h: "Demander un contender", d: "Chasser la bague tant qu'il est temps.", t: "Chasse au titre",
      run: () => ({ txt: "Tu demandes officiellement à rejoindre une équipe qui joue le titre.", mods: { morale: 6, rep: 4 }, rel: { fans: -12, front: -8 }, flag: "ringChase" }) },
  ] });

S_({ id: "pro_body34", cat: "Le corps parle", ph: ["pro"], w: 3,
  when: (c) => c.p.age >= 33,
  n: () => ({ n1: R_().i(2, 4) }),
  head: "{n1} heures de soins avant chaque match",
  body: "Le réveil est plus dur, la récupération ne suit plus. {vet} a raccroché l'an dernier pour moins que ça.",
  ch: [
    { h: "Réinventer mon jeu", d: "Moins d'explosivité, plus de lecture.", t: "Longévité",
      run: () => O("Tu joues au sol, au poste, en lecture. Ton jeu vieillit mieux que ton corps.", { iq: 8, midrange: 5, three: 4, passing: 4, athleticism: -3, stamina: 4 }) },
    { h: "Forcer comme avant", d: "Continuer à attaquer le cercle.", t: "Usure",
      run: () => O("Tu tiens quelques mois. Puis les blessures s'enchaînent.", { finishing: 3, health: -18, durability: -5, athleticism: -2 }) },
  ] });

S_({ id: "pro_jersey", cat: "Héritage", ph: ["pro"], w: 2,
  when: (c) => c.p.career.seasons >= 8 && c.p.career.yearsSameTeam >= 4,
  head: "{gmL} veut retirer ton numéro {num}",
  body: "La cérémonie serait pour la saison prochaine. Sauf que tu n'as pas encore fini de jouer.",
  ch: [
    { h: "Accepter", d: "Recevoir l'hommage maintenant.", t: "Héritage scellé",
      run: () => O("Ton numéro monte au plafond devant une salle debout. Tu joues encore, et c'est étrange et magnifique.", { fame: 12, morale: 14, leadership: 6, rep: 8 }, { fans: 18 }, "trophy") },
    { h: "Demander à attendre", d: "Ce sera pour la retraite.", t: "Sobriété",
      run: () => O("« On verra quand j'aurai fini. » {city} apprécie la retenue.", { rep: 5, morale: 4, leadership: 4 }, { fans: 8 }) },
  ] });

S_({ id: "pro_tv", cat: "Reconversion", ph: ["pro"], w: 2,
  when: (c) => c.p.age >= 31,
  head: "{outlet} te propose un pilote",
  body: "Commenter quelques matchs pendant l'intersaison, pour préparer l'après. {journo} serait ton binôme.",
  ch: [
    { h: "Accepter", d: "Préparer la suite.", t: "Argent et notoriété",
      run: () => O("Tu découvres que tu aimes expliquer le jeu. La suite se dessine.", { money: 600000, fame: 6, iq: 5, leadership: 3 }, { media: 12 }) },
    { h: "Refuser", d: "Une chose à la fois.", t: "Concentration",
      run: () => O("Tu passes ton été en salle, comme toujours.", { form: 8, three: 3, stamina: 3 }) },
  ] });

S_({ id: "pro_farewell", cat: "Transmission", ph: ["pro"], w: 2,
  when: (c) => c.p.career.seasons >= 5,
  head: "{vet} raccroche",
  body: "Celui qui t'a pris sous son aile à tes débuts. Il te demande de parler à sa cérémonie d'adieu.",
  ch: [
    { h: "Prendre la parole", d: "Dire ce qu'il t'a apporté.", t: "Moment fondateur",
      run: () => O("Tu parles douze minutes sans notes. La ligue entière comprend quel joueur tu es devenu.", { leadership: 11, fame: 6, morale: 12, iq: 3 }, { locker: 12, media: 8, fans: 8 }) },
    { h: "Décliner", d: "Ce n'est pas ton exercice.", t: "Rien",
      run: () => O("Tu lui envoies un message privé. Il comprend. Toi un peu moins.", { morale: -5, leadership: -2 }, { locker: -6 }) },
  ] });

S_({ id: "pro_wall", cat: "Mur du rookie", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons <= 2 && c.season && c.season.gp >= 45,
  n: () => ({}),
  bindx: (c) => ({ n1: c.season.gp }),
  head: "{n1} matchs dans les jambes",
  body: "Tu n'as jamais joué autant de ta vie. En {month}, tes jambes ont cessé de répondre.",
  ch: [
    { h: "Alléger les entraînements", d: "Économiser jusqu'en avril.", t: "Forme préservée",
      run: () => O("Le staff adapte ta charge. Tu finis la saison en montant en puissance.", { form: 14, health: 12, stamina: 3 }, { coach: 5 }) },
    { h: "Serrer les dents", d: "Personne n'a promis que ce serait simple.", t: "Endurance acquise",
      run: () => O("Tu traverses le mur sans le contourner. En avril, plus rien ne t'impressionne.", { stamina: 7, durability: 4, clutch: 3, health: -12, form: -8 }, { coach: 8, locker: 6 }) },
  ] });

S_({ id: "pro_system", cat: "Staff", ph: ["pro"], w: 3,
  when: (c) => c.p.career.seasons >= 3,
  n: () => ({ n1: R_().i(5, 9) }),
  head: "Le nouveau schéma de {coachL}",
  body: "Il est {coachStyle}. Son système te relègue au corner : ton usage a chuté de {n1} points.",
  ch: [
    { h: "M'adapter et exceller dedans", d: "Devenir le meilleur joueur de corner de la ligue.", t: "Efficacité",
      run: () => O("Tu tournes à quarante-trois pour cent de loin. Tes moyennes baissent, ton impact grimpe.", { three: 6, iq: 4, rep: -3 }, { coach: 12 }) },
    { h: "Exiger le ballon", d: "Aller le voir.", t: "Selon ta cote auprès du staff",
      run: branch([
        { when: (c) => c.p.trust >= 72 && !losing(c),
          then: O("{coachL} t'écoute parce que tu as le crédit pour ça. L'attaque est redessinée en une semaine.",
                  { rep: 9, handle: 3, morale: 10 }, { coach: 3 }) },
        { when: (c) => coachLow(c),
          then: O("Venant de toi, en ce moment, la demande passe très mal. Tu perds six minutes par match jusqu'en {month}.",
                  { morale: -14, form: -6 }, { coach: -12, locker: -5 }) },
        { when: (c) => losing(c),
          then: O("L'équipe perd, et il te répond que le problème n'est pas le nombre de ballons. Il n'a pas tout à fait tort.",
                  { morale: -7 }, { coach: -6 }) },
        { then: luckCtx(0.5, ["coach", "locker"],
            () => O("Il réécrit son attaque autour de toi. Les résultats suivent.", { rep: 8, morale: 8 }, { coach: 4 }),
            () => O("Il refuse et te le fait payer sur les minutes. La saison est longue.", { morale: -12 }, { coach: -12 })) },
      ]) },
  ] });

/* ─────────────────────────────────────────────
   TIRAGE
   ───────────────────────────────────────────── */

SC.eligible = function (c) {
  return SC.LIB.filter((s) => {
    if (s.ph && s.ph.indexOf(c.phase) === -1) return false;
    if (s.when) { try { if (!s.when(c)) return false; } catch (e) { return false; } }
    return true;
  });
};

/* forceFreshest : réservé à la toute première scène d'une carrière.
   C'est l'instant qui décide si une nouvelle partie se sent différente
   de la précédente — on n'y laisse aucune place au hasard : parmi tout
   ce qui est éligible, on prend ce que ce joueur a le moins vu, sans
   pondération. Le reste de la carrière continue de tirer au sort. */
SC.draw = function (c, recent, forceFreshest) {
  let pool = SC.eligible(c);
  if (!pool.length) return null;

  /* jamais deux fois la même situation dans une carrière tant qu'il
     reste du neuf à montrer */
  const fresh = pool.filter((s) => recent.indexOf(s.id) === -1);
  if (fresh.length) pool = fresh;

  const useMeta = typeof META !== "undefined";

  if (forceFreshest && useMeta) {
    let minSeen = Infinity;
    pool.forEach((s) => { const n = META.seen("scen", s.id); if (n < minSeen) minSeen = n; });
    const freshest = pool.filter((s) => META.seen("scen", s.id) === minSeen);
    return ENG.R.pick(freshest);
  }

  /* la mémoire longue pousse vers ce que ce joueur n'a jamais vu,
     toutes carrières confondues */
  const weights = pool.map((s) =>
    (s.w || 3) * (useMeta ? META.novelty("scen", s.id) : 1));

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, i = 0;
  while (r > weights[i] && i < pool.length - 1) { r -= weights[i]; i++; }
  return pool[i];
};

/* prépare une situation : tire les variables, rend les textes et
   sélectionne les options à proposer */
SC.stage = function (sc, c) {
  const extra = sc.n ? sc.n(ENG.R) : {};
  /* certaines scènes tirent leurs variables de la saison réellement
     écoulée, pour ne jamais raconter un événement qui n'a pas eu lieu */
  if (sc.bindx) Object.assign(extra, sc.bindx(c));
  const b = SC.bind(c, extra);

  /* une situation peut porter plus d'options qu'on n'en affiche :
     on en propose un sous-ensemble, biaisé vers celles que ce joueur
     n'a jamais essayées. Deux parties ne présentent pas les mêmes
     alternatives sur la même scène. */
  const shown = sc.ch.length > (sc.show || 3) && typeof META !== "undefined"
    ? META.mixSubset(sc.ch.map((ch, i) => ({ ch, i })), sc.show || 3,
                     "choice", (x) => sc.id + ":" + x.i)
    : sc.ch.map((ch, i) => ({ ch, i }));

  /* on garde l'ordre d'écriture pour la lisibilité */
  shown.sort((x, y) => x.i - y.i);

  return {
    sc, b,
    kicker: sc.cat,
    head: SC.fill(sc.head, b),
    body: SC.fill(sc.body, b),
    idx: shown.map((x) => x.i),
    choices: shown.map((x) => ({
      h: SC.fill(x.ch.h, b), d: SC.fill(x.ch.d, b), t: SC.fill(x.ch.t, b), ref: x.ch,
    })),
  };
};

/* joue un choix et renvoie de quoi écrire dans le fil */
SC.resolve = function (staged, shownIdx, c) {
  const idx = staged.idx ? staged.idx[shownIdx] : shownIdx;
  const ch = staged.sc.ch[idx];
  if (typeof META !== "undefined") META.noteChoice(staged.sc.id, idx);
  const res = ch.run(c, staged.b) || {};
  const p = c.p;

  if (ch.rivalUp && staged.b._rivalRef) {
    staged.b._rivalRef.heat = ENG.clamp(staged.b._rivalRef.heat + ch.rivalUp, 0, 100);
  }
  if (staged.b._mateRef && res.rel && res.rel.locker) {
    staged.b._mateRef.bond = ENG.clamp(staged.b._mateRef.bond + res.rel.locker, 0, 100);
  }

  return {
    text: SC.fill(res.txt || "", staged.b),
    pills: SC.apply(p, res.mods, res.rel),
    kind: res.kind || "wire",
    flag: res.flag || null,
  };
};

SC.count = function () {
  return SC.LIB.length;
};

/* ── duel.js ── */
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
DUEL.CHOICE_SECONDS = 15;
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
    last: parts.slice(1).join(" "),
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

/* ── situations universelles supplémentaires ── */

D_({ id: "elbow_jumper", w: 2,
  head: "Réception au coude",
  body: "Le ballon arrive au coude, à mi-distance. La défense doit choisir entre sortir ou céder l'espace.",
  ch: [
    { h: "Tir immédiat", d: "La zone de confort.", t: "Direct", mech: "shoot" },
    { h: "Pénétrer vers le cercle", d: "Une dribble suffit.", t: "Opportuniste", mech: "drive" },
    { h: "Trouver le coupeur", d: "Lecture rapide du jeu.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "baseline_drive", w: 2,
  head: "Attaque par la ligne de fond",
  body: "Tu longes la ligne de fond, le défenseur colle mais l'angle est étroit pour lui.",
  ch: [
    { h: "Finir au cercle", d: "L'angle est serré pour lui.", t: "Engagé", mech: "drive" },
    { h: "Tir en suspension", d: "Un retrait rapide.", t: "Technique", mech: "shoot" },
    { h: "Ressortir au corner", d: "Un jeu plus large.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "zone_break", w: 2,
  head: "Faille dans la zone",
  body: "La défense de zone laisse un trou entre deux joueurs. Il faut décider vite avant qu'elle se referme.",
  ch: [
    { h: "Tir dans la faille", d: "Une fenêtre courte.", t: "Rapide", mech: "shoot" },
    { h: "Pénétrer dans l'interstice", d: "Foncer avant que ça se ferme.", t: "Direct", mech: "drive" },
    { h: "Faire circuler pour l'ouvrir", d: "Étirer encore la zone.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "inbound_play", w: 1,
  head: "Remise en jeu sous pression",
  body: "Après le temps mort, il faut remettre le ballon en jeu avec un défenseur qui colle la ligne.",
  ch: [
    { h: "Chercher le tir rapide", d: "Profiter de la surprise.", t: "Audacieux", mech: "shoot" },
    { h: "Couper vers le cercle", d: "S'engager tout de suite.", t: "Engagé", mech: "drive" },
    { h: "Relancer proprement", d: "La sécurité d'abord.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "putback", w: 2,
  head: "Rebond offensif",
  body: "Le tir d'un partenaire rebondit sur l'arceau, tu es le mieux placé pour la deuxième chance.",
  ch: [
    { h: "Remettre au cercle", d: "Suivre son instinct.", t: "Immédiat", mech: "drive" },
    { h: "Ressortir pour un tir propre", d: "Recomposer l'action.", t: "Technique", mech: "shoot" },
    { h: "Redistribuer", d: "Chercher mieux placé.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "cross_court_kick", w: 2,
  head: "Passe cross-court",
  body: "Le ballon circule vite, un partenaire est seul de l'autre côté du terrain — si la passe arrive à temps.",
  ch: [
    { h: "Tir depuis ta position", d: "Ne pas attendre.", t: "Direct", mech: "shoot" },
    { h: "Pénétrer pendant que ça bouge", d: "Profiter du désordre.", t: "Opportuniste", mech: "drive" },
    { h: "Envoyer la passe cross-court", d: "Une grande fenêtre.", t: "Vision de jeu", mech: "pass" },
  ] });

D_({ id: "iso_wing", w: 2,
  head: "Un contre un à l'aile",
  body: "Ballon à l'aile, ton défenseur en position basse, prêt à réagir dans les deux sens.",
  ch: [
    { h: "Tir sec", d: "Direct, sans hésiter.", t: "Rapide", mech: "shoot" },
    { h: "Attaquer le cercle", d: "Explosif, dès la première dribble.", t: "Engagé", mech: "drive" },
    { h: "Faire tourner", d: "Garder le jeu réversible.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "floater_lane", w: 2,
  head: "Fenêtre dans la raquette",
  body: "Tu es dans la raquette, entre le défenseur extérieur et l'intérieur qui recule — une fenêtre étroite s'ouvre.",
  ch: [
    { h: "Petit tir flottant", d: "Une touche délicate.", t: "Technique", mech: "shoot" },
    { h: "Continuer au cercle", d: "S'engager à fond.", t: "Engagé", mech: "drive" },
    { h: "Ressortir la balle", d: "La fenêtre s'est refermée.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "double_team_break", w: 1,
  head: "Double équipe",
  body: "Deux défenseurs convergent sur toi en même temps. Il faut se sortir de là avant le marcher.",
  ch: [
    { h: "Forcer un tir rapide", d: "Avant d'être totalement bloqué.", t: "Risqué", mech: "shoot" },
    { h: "Fendre les deux défenseurs", d: "Passer entre eux.", t: "Audacieux", mech: "drive" },
    { h: "Trouver le joueur libre", d: "Un partenaire est forcément démarqué.", t: "Lecture obligatoire", mech: "pass" },
  ] });

D_({ id: "transition_trail", w: 2,
  head: "Retard en transition",
  body: "Tu arrives en deuxième vague sur la contre-attaque, le ballon peut encore te trouver derrière l'arc.",
  ch: [
    { h: "Tir à trois points", d: "Profiter du rythme.", t: "Rythme", mech: "shoot" },
    { h: "Continuer vers le cercle", d: "Poursuivre l'action.", t: "Engagé", mech: "drive" },
    { h: "Temporiser le jeu", d: "Laisser l'attaque se poser.", t: "Collectif", mech: "pass" },
  ] });

/* ── situations défensives supplémentaires ── */

D_({ id: "charge_take", w: 1, flavor: "defense",
  head: "Prendre la charge",
  body: "Tu tiens ta position, l'attaquant te percute de plein fouet — faute offensive sifflée. Le ballon revient à ton équipe, remis en jeu tout de suite.",
  ch: [
    { h: "Chercher le tir sur la remise", d: "Profiter de la surprise.", t: "Rapide", mech: "shoot" },
    { h: "Attaquer directement", d: "Sans attendre.", t: "Direct", mech: "drive" },
    { h: "Relancer le jeu", d: "Poser l'attaque.", t: "Posé", mech: "pass" },
  ] });

D_({ id: "help_rotation", w: 2, flavor: "defense",
  head: "Rotation défensive",
  body: "Tu quittes ton vis-à-vis pour aider sur la pénétration adverse — l'interception réussit, et te voilà lancé.",
  ch: [
    { h: "Filer en contre-attaque", d: "Ne pas perdre de temps.", t: "Immédiat", mech: "drive" },
    { h: "Chercher le trois points", d: "Le terrain est écarté.", t: "Opportuniste", mech: "shoot" },
    { h: "Structurer l'attaque", d: "Reposer le jeu.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "full_court_press", w: 2, flavor: "defense",
  head: "Pressing tout terrain",
  body: "Le pressing paie : le porteur de balle adverse hésite, la balle est à portée de main.",
  ch: [
    { h: "Intercepter et foncer", d: "Ne rien laisser au hasard.", t: "Agressif", mech: "drive" },
    { h: "Intercepter et tirer", d: "Le terrain est ouvert.", t: "Opportuniste", mech: "shoot" },
    { h: "Intercepter et temporiser", d: "Reprendre le contrôle du jeu.", t: "Contrôlé", mech: "pass" },
  ] });

D_({ id: "rebound_battle", w: 2, flavor: "defense",
  head: "Bataille au rebond défensif",
  body: "Le tir adverse est manqué, la balle rebondit au milieu d'une mêlée de joueurs — c'est à qui l'attrapera.",
  ch: [
    { h: "Sécuriser puis pousser", d: "Lancer la transition.", t: "Rapide", mech: "drive" },
    { h: "Sécuriser puis viser", d: "Prendre le tir de loin.", t: "Confiant", mech: "shoot" },
    { h: "Sécuriser puis relancer", d: "Poser l'attaque.", t: "Prudent", mech: "pass" },
  ] });

/* ── situations par poste supplémentaires ── */

D_({ id: "pg_full_court", w: 2, positions: ["PG"],
  head: "Montée de balle sous pression",
  body: "Le pressing adverse t'attend dès la sortie de terrain — en tant que meneur, c'est à toi de faire avancer le jeu.",
  ch: [
    { h: "Accélérer et attaquer", d: "Casser le pressing par la vitesse.", t: "Direct", mech: "drive" },
    { h: "Chercher le tir rapide", d: "Profiter de la surprise.", t: "Audacieux", mech: "shoot" },
    { h: "Passer le pressing en relançant", d: "La sécurité avant tout.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "pg_pick_reject", w: 2, positions: ["PG"],
  head: "Refuser l'écran",
  body: "L'écran est posé, mais le défenseur triche déjà pour l'anticiper — parfois la meilleure option est de ne pas l'utiliser.",
  ch: [
    { h: "Attaquer avant l'écran", d: "Le prendre de vitesse.", t: "Rapide", mech: "drive" },
    { h: "Tirer directement", d: "Il ne l'attend pas.", t: "Surprise", mech: "shoot" },
    { h: "Utiliser l'écran quand même", d: "Revenir au plan classique.", t: "Classique", mech: "pass" },
  ] });

D_({ id: "sg_baseline_cut", w: 2, positions: ["SG"],
  head: "Coupe ligne de fond",
  body: "Sans le ballon, tu sens l'ouverture le long de la ligne de fond — le timing doit être parfait.",
  ch: [
    { h: "Recevoir et tirer", d: "Un mouvement travaillé.", t: "Précis", mech: "shoot" },
    { h: "Recevoir et enchaîner au cercle", d: "Continuer sur sa lancée.", t: "Opportuniste", mech: "drive" },
    { h: "Continuer le mouvement sans ballon", d: "Laisser venir le jeu.", t: "Discipline", mech: "pass" },
  ] });

D_({ id: "sg_iso_closeout", w: 2, positions: ["SG"],
  head: "Attaquer la fermeture",
  body: "Le défenseur se précipite pour fermer ta ligne de tir — un déséquilibre à exploiter tout de suite.",
  ch: [
    { h: "Tirer avant qu'il n'arrive", d: "Une fenêtre courte.", t: "Rapide", mech: "shoot" },
    { h: "Attaquer son excès de vitesse", d: "Le prendre à contre-pied.", t: "Direct", mech: "drive" },
    { h: "Faire circuler", d: "Chercher mieux.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "sf_transition_finish", w: 2, positions: ["SF"],
  head: "Finition en transition",
  body: "La contre-attaque bat son plein, tu es à mi-chemin entre le tir extérieur et la finition au cercle.",
  ch: [
    { h: "Foncer finir au cercle", d: "Profiter de l'athlétisme.", t: "Athlétique", mech: "drive" },
    { h: "S'arrêter pour le tir", d: "Un choix plus contrôlé.", t: "Contrôlé", mech: "shoot" },
    { h: "Servir le partenaire démarqué", d: "Le jeu collectif avant tout.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "sf_post_mismatch", w: 2, positions: ["SF"],
  head: "Mésentente de taille au poste",
  body: "Un défenseur plus petit se retrouve sur toi au poste bas — l'occasion est trop belle pour la laisser passer.",
  ch: [
    { h: "Jouer la puissance", d: "Imposer le rapport de force.", t: "Physique", mech: "drive" },
    { h: "Tir en pivotant", d: "Un geste travaillé.", t: "Technique", mech: "shoot" },
    { h: "Ressortir si ça se referme", d: "Rester patient.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "pf_roll_man", w: 2, positions: ["PF"],
  head: "Roulade vers le cercle",
  body: "Après avoir posé l'écran, tu roules vers le cercle — la défense doit choisir qui laisser seul.",
  ch: [
    { h: "Foncer recevoir au cercle", d: "Profiter de l'espace créé.", t: "Direct", mech: "drive" },
    { h: "Se réétaler pour le tir", d: "L'option pop plutôt que roll.", t: "Moderne", mech: "shoot" },
    { h: "Laisser le jeu se faire ailleurs", d: "Rester discipliné.", t: "Discipline", mech: "pass" },
  ] });

D_({ id: "pf_offensive_board", w: 2, positions: ["PF"],
  head: "Écran offensif",
  body: "Le tir part, tu es déjà en position pour te battre sur le rebond offensif.",
  ch: [
    { h: "Remettre directement", d: "Suivre son instinct.", t: "Immédiat", mech: "drive" },
    { h: "Ressortir pour un tir propre", d: "Recomposer l'action.", t: "Technique", mech: "shoot" },
    { h: "Redistribuer vers l'extérieur", d: "Reposer le jeu.", t: "Collectif", mech: "pass" },
  ] });

D_({ id: "c_lob_finish", w: 2, positions: ["C"],
  head: "Finition sur alley-oop",
  body: "Le ballon est lobé vers le cercle, c'est à toi de conclure au-dessus de tout le monde.",
  ch: [
    { h: "Conclure en puissance", d: "Un geste spectaculaire.", t: "Spectaculaire", mech: "drive" },
    { h: "Redescendre pour un appui sûr", d: "Ne pas forcer.", t: "Prudent", mech: "shoot" },
    { h: "Relayer si ça se complique", d: "La sécurité avant tout.", t: "Sécurité", mech: "pass" },
  ] });

D_({ id: "c_high_post", w: 2, positions: ["C"],
  head: "Meneur de jeu au poste haut",
  body: "Ballon reçu au sommet de la raquette, toute l'attaque peut passer par tes mains un instant.",
  ch: [
    { h: "Attaquer directement", d: "Profiter de l'ouverture.", t: "Direct", mech: "drive" },
    { h: "Tirer depuis le poste haut", d: "Une option inattendue.", t: "Inattendu", mech: "shoot" },
    { h: "Distribuer vers le jeu", d: "Faire jouer les autres.", t: "Altruiste", mech: "pass" },
  ] });

/* ── deuxième vague de situations universelles ── */

D_({ id: "backdoor_cut", w: 2,
  head: "Coupe en backdoor",
  body: "Ton défenseur anticipe trop haut sur la ligne de passe — la voie est libre derrière lui, vers le cercle.",
  ch: [
    { h: "Couper et recevoir au cercle", d: "Le timing parfait.", t: "Direct", mech: "drive" },
    { h: "S'arrêter pour un tir court", d: "Une option plus sûre.", t: "Technique", mech: "shoot" },
    { h: "Revenir vers le ballon", d: "Si la passe n'arrive pas.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "flare_screen", w: 2,
  head: "Écran flare",
  body: "Un partenaire pose un écran dans ton dos, tu t'écartes vers le corner pendant que ton défenseur cherche l'angle.",
  ch: [
    { h: "Tir depuis l'écran flare", d: "L'espace est là.", t: "Écarté", mech: "shoot" },
    { h: "Enchaîner vers l'intérieur", d: "Profiter du désordre défensif.", t: "Opportuniste", mech: "drive" },
    { h: "Reposer le jeu", d: "Attendre une meilleure occasion.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "broken_play_scramble", w: 1,
  head: "Attaque cassée",
  body: "Le jeu prévu part en vrille, il ne reste que quelques secondes pour improviser quelque chose de propre.",
  ch: [
    { h: "Créer seul dans le chaos", d: "Il faut faire quelque chose.", t: "Improvisé", mech: "drive" },
    { h: "Prendre le tir disponible", d: "Ne pas trop réfléchir.", t: "Instinctif", mech: "shoot" },
    { h: "Trouver le joueur le plus libre", d: "Sauver la possession.", t: "Lecture obligatoire", mech: "pass" },
  ] });

D_({ id: "late_clock_heave", w: 1, clutchWeighted: true,
  head: "Fin des 24 secondes",
  body: "L'horloge de possession s'éteint dans un instant. Il n'y a plus vraiment le temps de bien faire les choses.",
  ch: [
    { h: "Tir désespéré", d: "Mieux vaut tenter que rien.", t: "Quitte ou double", mech: "shoot" },
    { h: "Forcer au cercle", d: "Chercher au moins la faute.", t: "Sans filet", mech: "drive" },
    { h: "Chercher un dernier relais", d: "Une passe risquée mais possible.", t: "Désespéré", mech: "pass" },
  ] });

D_({ id: "loose_ball_scramble", w: 2, flavor: "defense",
  head: "Ballon en mêlée",
  body: "Le ballon traîne au sol au milieu d'une mêlée de joueurs — le premier à la sécuriser change tout.",
  ch: [
    { h: "Plonger et repartir", d: "Ne pas perdre une seconde.", t: "Engagé", mech: "drive" },
    { h: "Sécuriser puis viser", d: "Se relever et tirer.", t: "Confiant", mech: "shoot" },
    { h: "Sécuriser et temporiser", d: "Reposer le jeu calmement.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "horns_set", w: 2,
  head: "Disposition en cornes",
  body: "Deux intérieurs postés aux coudes, toi au sommet — plusieurs lectures s'offrent selon comment la défense réagit.",
  ch: [
    { h: "Utiliser l'écran le plus proche", d: "Attaquer directement.", t: "Direct", mech: "drive" },
    { h: "Tirer par-dessus", d: "Si la défense recule.", t: "Opportuniste", mech: "shoot" },
    { h: "Trouver l'intérieur démarqué", d: "Lire le bon côté.", t: "Vision de jeu", mech: "pass" },
  ] });

/* ── deuxième vague de situations défensives ── */

D_({ id: "deflection_and_go", w: 2, flavor: "defense",
  head: "Déviation et poursuite",
  body: "Ta main dévie la passe adverse — le ballon part devant toi, c'est une course pour le récupérer en premier.",
  ch: [
    { h: "Rattraper et foncer", d: "Ne pas ralentir.", t: "Rapide", mech: "drive" },
    { h: "Rattraper et tirer", d: "Le terrain est dégagé.", t: "Opportuniste", mech: "shoot" },
    { h: "Rattraper et relancer", d: "Reposer calmement.", t: "Contrôlé", mech: "pass" },
  ] });

D_({ id: "boxout_secure", w: 2, flavor: "defense",
  head: "Rebond sécurisé sous pression",
  body: "Tu tiens ta position sur l'écran de rebond et sécurises le ballon avant que l'attaque ne se réorganise.",
  ch: [
    { h: "Pousser tout de suite", d: "Ne pas laisser la défense se replacer.", t: "Rapide", mech: "drive" },
    { h: "Chercher le tir en transition", d: "Une fenêtre s'ouvre déjà.", t: "Confiant", mech: "shoot" },
    { h: "Relancer proprement", d: "Reposer l'attaque.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "late_clock_stop", w: 1, flavor: "defense",
  head: "Arrêt en fin d'horloge",
  body: "Ton marquage force un tir difficile à l'adversaire, raté — la balle est à toi avec le terrain grand ouvert devant.",
  ch: [
    { h: "Partir en contre-attaque", d: "Personne ne s'y attend.", t: "Immédiat", mech: "drive" },
    { h: "Chercher le tir de loin", d: "Le terrain est encore ouvert.", t: "Opportuniste", mech: "shoot" },
    { h: "Reposer le jeu", d: "Prendre son temps.", t: "Collectif", mech: "pass" },
  ] });

/* ── deuxième vague de situations par poste ── */

D_({ id: "pg_hesitation", w: 2, positions: ["PG"],
  head: "Dribble d'hésitation",
  body: "Un changement de rythme suffit parfois à déséquilibrer complètement un défenseur trop sur ses appuis.",
  ch: [
    { h: "Accélérer après l'hésitation", d: "Le déséquilibre est créé.", t: "Direct", mech: "drive" },
    { h: "Tirer sur l'hésitation", d: "Il recule d'un pas de trop.", t: "Technique", mech: "shoot" },
    { h: "Redistribuer le jeu", d: "Utiliser l'attention qu'il te porte.", t: "Vision de jeu", mech: "pass" },
  ] });

D_({ id: "sg_flare_three", w: 2, positions: ["SG"],
  head: "Trois points sur écran flare",
  body: "Le ballon change de côté, un écran flare te libère juste à temps pour une ligne de tir dégagée.",
  ch: [
    { h: "Tir à trois points", d: "La fenêtre classique du poste.", t: "Spécialiste", mech: "shoot" },
    { h: "Enchaîner vers l'intérieur", d: "Si le défenseur ferme trop vite.", t: "Opportuniste", mech: "drive" },
    { h: "Ressortir la balle", d: "Chercher mieux.", t: "Patient", mech: "pass" },
  ] });

D_({ id: "sf_euro_step", w: 2, positions: ["SF"],
  head: "Euro-step dans la raquette",
  body: "Lancé vers le cercle, un changement d'appui te fait éviter le dernier défenseur sur ta route.",
  ch: [
    { h: "Finir en euro-step", d: "Le geste travaillé.", t: "Technique", mech: "drive" },
    { h: "S'arrêter pour un tir court", d: "Plus sûr que forcer.", t: "Contrôlé", mech: "shoot" },
    { h: "Ressortir si ça se ferme", d: "Ne pas forcer le passage.", t: "Prudent", mech: "pass" },
  ] });

D_({ id: "pf_short_roll", w: 2, positions: ["PF"],
  head: "Court-roulade et lecture",
  body: "Après l'écran, tu t'arrêtes à mi-chemin du cercle — ni tout à fait roulade, ni tout à fait extérieur, une vraie option de jeu.",
  ch: [
    { h: "Continuer vers le cercle", d: "Achever le mouvement.", t: "Direct", mech: "drive" },
    { h: "Tirer depuis la mi-distance", d: "L'espace suffit.", t: "Technique", mech: "shoot" },
    { h: "Distribuer depuis le milieu", d: "Une vue parfaite sur tout le terrain.", t: "Vision de jeu", mech: "pass" },
  ] });

D_({ id: "c_deep_seal", w: 2, positions: ["C"],
  head: "Sceller profond",
  body: "Tu prends la position la plus proche du cercle possible et scelles ton défenseur derrière toi.",
  ch: [
    { h: "Forcer en puissance", d: "La position est gagnée.", t: "Physique", mech: "drive" },
    { h: "Petit tir au cercle", d: "Un geste économe.", t: "Technique", mech: "shoot" },
    { h: "Ressortir si ça se complique", d: "Rejouer le ballon.", t: "Prudent", mech: "pass" },
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

/* ── manga.js ── */
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

/* ── app.js ── */
/* ═══════════════════════════════════════════════════════════
   PARQUET — interface et déroulé de carrière
   ═══════════════════════════════════════════════════════════ */

/* sauvegarde et Panthéon appartiennent au compte actif */
const SAVE = () => PROFILE.key("save_v2");
const HALL = () => PROFILE.key("pantheon_v2");

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

let S = null;   /* état global */

/* ═══════════════ SAUVEGARDE ═══════════════ */

function save() {
  if (!S) return;
  try {
    localStorage.setItem(SAVE(), JSON.stringify({
      p: S.p, cast: S.cast,
      L: { ...S.L, usedNames: Array.from(S.L.usedNames) },
      phase: S.phase, stageYear: S.stageYear, queue: S.queue,
      calendar: S.calendar, recent: S.recent, teamsSeen: S.teamsSeen,
      log: S.log.slice(-90), pending: S.pending, mp: S.mp,
    }));
  } catch (e) { /* quota */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE());
    if (!raw) return null;
    const d = JSON.parse(raw);
    d.L.usedNames = new Set(d.L.usedNames || []);
    return d;
  } catch (e) { return null; }
}

const wipe = () => { try { localStorage.removeItem(SAVE()); } catch (e) {} };

function pantheon() {
  try { return JSON.parse(localStorage.getItem(HALL()) || "[]"); } catch (e) { return []; }
}
function addToPantheon(entry) {
  const list = pantheon();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(HALL(), JSON.stringify(list.slice(0, 40))); } catch (e) {}
}

/* ═══════════════ ÉCRANS ═══════════════ */

/* On lit les écrans directement dans le document plutôt que de tenir une
   liste à jour à la main : un écran ajouté au HTML est pris en compte
   automatiquement. Une liste figée avait déjà laissé l'écran des codes
   invisible en permanence. */
function show(id) {
  const target = $(id);
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("hidden", s !== target);
  });
  if (target) target.classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* ═══════════════ FIL D'ACTUALITÉ ═══════════════ */

/* Les blocs produits dans une même action arrivent en cascade plutôt
   que d'un coup : la saison se déroule sous les yeux au lieu de tomber
   comme un rapport. Le compteur se remet à zéro à chaque action.
   Le rythme est volontairement lent — c'est ce qui donne le temps de
   ressentir ce qui vient d'arriver avant que la suite ne s'affiche. */
let BATCH = 0, BATCH_T = 0;
const STEP_WIRE = 0.85, CAP_WIRE = 3400;
const STEP_POSTER = 1.05, CAP_POSTER = 3800;

/* Une courte scène d'attente avant un moment qui compte : un aveu à
   l'italique, trois points qui pulsent. Le joueur sait que quelque
   chose arrive avant de savoir quoi. */
function teaser(text, isPoster) {
  const rank = BATCH++;
  const b = el("div", "teaser" + (isPoster ? " teaser-poster" : ""));
  b.appendChild(el("span", null, text));
  const dots = el("span", "teaser-dots");
  dots.appendChild(el("i")); dots.appendChild(el("i")); dots.appendChild(el("i"));
  b.appendChild(dots);
  const step = isPoster ? STEP_POSTER : STEP_WIRE;
  const cap = isPoster ? CAP_POSTER : CAP_WIRE;
  if (rank > 0) {
    b.style.animationDelay = Math.min(rank * step, cap / 1000) + "s";
    b.style.animationFillMode = "both";
  }
  $("feed").appendChild(b);
  const delay = Math.min(rank * step * 1000, cap);
  setTimeout(() => { try { b.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {} }, delay);
}

function beat(o) {
  const now = Date.now();
  if (now - BATCH_T > 600) BATCH = 0;
  BATCH_T = now;

  if (o.teaser) teaser(o.teaser, !!o.poster);

  const rank = BATCH++;

  /* une affiche prend plus de temps à se poser qu'une brève : on lui
     laisse la place, et on ralentit ce qui la suit */
  const b = el("div", o.poster ? "poster" : "beat " + (o.kind || "wire"));
  const step = o.poster ? STEP_POSTER : STEP_WIRE;
  const cap = o.poster ? CAP_POSTER : CAP_WIRE;
  if (rank > 0) {
    b.style.animationDelay = Math.min(rank * step, cap / 1000) + "s";
    b.style.animationFillMode = "both";
  }

  if (o.poster) {
    if (o.poster.emblem) b.appendChild(el("span", "poster-emblem", o.poster.emblem));
    b.appendChild(el("div", "poster-kicker", o.tag || "Instant"));
    b.appendChild(el("div", "poster-title", o.head || ""));
    if (o.body) b.appendChild(el("div", "poster-sub", o.body));
    b.appendChild(el("div", "poster-rule"));
    if (o.box) b.appendChild(o.box);
    if (o.pills && o.pills.length) {
      const wrap = el("div", "beat-pills");
      o.pills.forEach((p) => wrap.appendChild(el("span", "pill " + (p.k || ""), p.t)));
      b.appendChild(wrap);
    }
    $("feed").appendChild(b);
    S.log.push({ kind: o.kind, tag: o.tag, head: o.head, body: o.body,
                 when: o.when || S.calendar.label, poster: o.poster });
    setTimeout(() => {
      try { b.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    }, Math.min(rank * step * 1000, cap));
    return;
  }

  const top = el("div", "beat-top");
  top.appendChild(el("span", "beat-tag", o.tag || "Info"));
  if (o.src) top.appendChild(el("span", "beat-src", o.src));
  top.appendChild(el("span", "beat-when", o.when || S.calendar.label));
  b.appendChild(top);

  if (o.head) b.appendChild(el("div", "beat-h", o.head));
  if (o.body) b.appendChild(el("div", "beat-p", o.body));

  if (o.box) b.appendChild(o.box);

  if (o.pills && o.pills.length) {
    const wrap = el("div", "beat-pills");
    o.pills.forEach((p) => wrap.appendChild(el("span", "pill " + (p.k || ""), p.t)));
    b.appendChild(wrap);
  }

  $("feed").appendChild(b);
  S.log.push({ kind: o.kind, tag: o.tag, head: o.head, body: o.body, when: o.when || S.calendar.label });

  /* on suit la cascade : chaque bloc se met en vue au moment où il apparaît */
  const delay = Math.min(rank * step * 1000, cap);
  setTimeout(() => {
    try { b.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  }, delay);
}

/* ─── habillages « média » : un même événement peut se lire comme un
   SMS reçu, une manchette de journal ou une poignée de réactions,
   au lieu d'un simple compte-rendu. Réservé aux moments qui le
   justifient : la surprise n'accroche que si elle reste rare. */

/* un champ peut être un texte fixe ou une liste de variantes : dans
   ce cas on en tire une au hasard, pour qu'un même instant ne se lise
   jamais deux fois pareil d'une carrière à l'autre */
const pickText = (v) => (Array.isArray(v) ? ENG.R.pick(v) : v);

/* petites icônes maison plutôt que des emoji : même stroke, même
   grille 24×24, couleur héritée via currentColor pour rester lisibles
   dans les deux thèmes. Le ballon reprend le tracé du logo de marque. */
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21C12 21 4 14.5 4 9.5C4 6.9 6.1 5 8.5 5C10 5 11.3 5.8 12 7C12.7 5.8 14 5 15.5 5C17.9 5 20 6.9 20 9.5C20 14.5 12 21 12 21Z"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6.3 6.3c2.6 2.6 2.6 8.8 0 11.4M17.7 6.3c-2.6 2.6-2.6 8.8 0 11.4"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C9 6 7 8.5 7 12.5C7 16.6 9.4 20 12.5 20C15.9 20 18 17.2 18 14C18 11.5 16.5 10 15.5 11C16 8.5 14.5 5 12 2Z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L4.5 14H11L10 22L19.5 9H13L13 2Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.5L10.5 15.5L16.5 8.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function icon(name) {
  const wrap = el("span", "icon icon-" + name);
  wrap.innerHTML = ICONS[name] || ICONS.ball;
  return wrap;
}

function smsCard(o) {
  const wrap = el("div", "box media-sms");
  const head = el("div", "sms-head");
  const av = el("span", "sms-avatar"); av.appendChild(icon(o.icon || "heart"));
  head.appendChild(av);
  const who = el("div", "sms-who");
  who.appendChild(el("div", "sms-name", o.from));
  if (o.sub) who.appendChild(el("div", "sms-sub", o.sub));
  head.appendChild(who);
  head.appendChild(el("span", "sms-ts", "maintenant"));
  wrap.appendChild(head);
  wrap.appendChild(el("div", "sms-bubble", pickText(o.text)));
  return wrap;
}

function headlineCard(o) {
  const wrap = el("div", "box media-headline");
  const top = el("div", "headline-top");
  const badge = el("span", "headline-badge"); badge.appendChild(icon("bolt"));
  top.appendChild(badge);
  top.appendChild(el("span", "headline-outlet", o.outlet));
  top.appendChild(el("span", "headline-kicker", o.kicker || "Dernière minute"));
  wrap.appendChild(top);
  wrap.appendChild(el("div", "headline-title", pickText(o.headline)));
  if (o.dek) wrap.appendChild(el("div", "headline-dek", pickText(o.dek)));
  return wrap;
}

function socialCard(o) {
  const wrap = el("div", "box media-social");
  const top = el("div", "social-top");
  top.appendChild(el("span", "social-platform", "Sur " + (o.platform || "X")));
  top.appendChild(el("span", "social-live", "● en direct"));
  wrap.appendChild(top);
  o.posts.forEach((p) => {
    const row = el("div", "social-post");
    const av = el("span", "social-avatar"); av.appendChild(icon(p.icon || "ball"));
    row.appendChild(av);
    const body = el("div", "social-body");
    const line = el("div", "social-line");
    line.appendChild(el("span", "social-name", p.name));
    if (p.verified !== false) { const chk = el("span", "social-check"); chk.appendChild(icon("check")); line.appendChild(chk); }
    line.appendChild(el("span", "social-handle", p.handle));
    body.appendChild(line);
    body.appendChild(el("div", "social-text", pickText(p.text)));
    row.appendChild(body);
    wrap.appendChild(row);
  });
  return wrap;
}

function statTable(rows, headers) {
  const wrap = el("div", "box");
  const t = el("table");
  const thead = el("thead");
  const tr = el("tr");
  headers.forEach((h) => tr.appendChild(el("th", null, h)));
  thead.appendChild(tr);
  t.appendChild(thead);
  const tb = el("tbody");
  rows.forEach((r) => {
    const row = el("tr");
    r.forEach((c, i) => {
      const td = el("td", c && c.hi ? "hi" : null, c && c.v != null ? c.v : c);
      row.appendChild(td);
    });
    tb.appendChild(row);
  });
  t.appendChild(tb);
  wrap.appendChild(t);
  return wrap;
}

/* ═══════════════ MODALE ═══════════════ */

function ask(o) {
  /* Une croix apparaît dans deux cas, avec deux sens différents :
     — defer : la scène peut attendre, elle retourne dans la pioche
       et reviendra plus tard (réservé aux événements de carrière) ;
     — cancelable : la fenêtre n'impose aucun choix réel — fermer
       revient simplement à ne rien faire, sans aucune conséquence.
     Les décisions qui engagent la carrière (contrat, orientation,
     retraite) n'ont ni l'un ni l'autre : il faut trancher. */
  const close = $("modal-close");
  const canClose = o.defer || o.cancelable;
  close.classList.toggle("hidden", !canClose);
  close.onclick = !canClose ? null : o.defer
    ? () => {
        $("modal").classList.add("hidden");
        if (o.onDefer) o.onDefer();
        setActionEnabled(true);
        render(); save();
      }
    : () => {
        $("modal").classList.add("hidden");
        if (o.onCancel) o.onCancel();
        setActionEnabled(true);
        render(); save();
      };

  $("modal-kicker").textContent = o.kicker || "Décision";
  $("modal-head").textContent = o.head || "";
  $("modal-body").textContent = o.body || "";
  const box = $("modal-choices");
  box.innerHTML = "";

  o.choices.forEach((c) => {
    const btn = el("button", "choice" + (c.danger ? " danger" : ""));
    btn.appendChild(el("div", "choice-h", c.h));
    if (c.d) btn.appendChild(el("div", "choice-d", c.d));
    if (c.t) btn.appendChild(el("div", "choice-t", "→ " + c.t));
    btn.onclick = () => {
      $("modal").classList.add("hidden");
      c.pick();
      render();
      save();
      /* On enchaîne tout seul jusqu'au prochain moment qui demande
         vraiment quelque chose au joueur : ni double clic après une
         décision, ni bouton « Continuer » pour rien. */
      if (o.chain !== false) autoChain();
    };
    box.appendChild(btn);
  });

  $("modal").classList.remove("hidden");
  setActionEnabled(false);
}

let TAP_ENABLED = true;
function setActionEnabled(v) {
  TAP_ENABLED = !!v;
  $("tap-hint").classList.toggle("is-off", !v);
}

/* ═══════════════ RENDU ═══════════════ */

const teamOf = (id) => DATA.TEAMS.find((t) => t.id === id);

/* Les couleurs officielles vont du quasi-noir au jaune vif. Pour rester
   lisibles sur fond clair ET sur fond sombre, on ramène la luminosité
   dans une bande médiane sans toucher à la teinte. */
function readable(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const l = (mx + mn) / 2;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const L = ENG.clamp(l, 0.42, 0.64);
  if (s < 0.12) s = Math.min(0.16, s + 0.08);      /* les gris purs restent ternes */

  const c = (1 - Math.abs(2 * L - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const mm = L - c / 2;
  const seg = Math.floor(h * 6) % 6;
  const rgb = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][seg];
  const hx = (v) => Math.round((v + mm) * 255).toString(16).padStart(2, "0");
  return "#" + hx(rgb[0]) + hx(rgb[1]) + hx(rgb[2]);
}

function applyTeamColors() {
  const t = S.p.team ? teamOf(S.p.team) : null;
  const root = document.documentElement;
  root.style.setProperty("--team", t ? readable(t.c1) : "#E2622C");
  root.style.setProperty("--team-2", t ? readable(t.c2) : "#10A0A0");
}

function render() {
  if (!S) return;
  const p = S.p;
  applyTeamColors();

  /* — scorebug — */
  $("sb-num").textContent = p.number;
  $("sb-name").textContent = ENG.name(p);
  const pos = DATA.POSITIONS.find((x) => x.id === p.position);
  const place = p.team ? teamOf(p.team).full : (p.college ? "Université " + p.college : "Sans club");
  const seat = S.mp && S.mp.on && S.mp.players.length > 1
    ? S.mp.players[S.mp.turn].label + " · " : "";
  $("sb-sub").textContent = `${seat}${p.flag} ${pos.label} · ${place} · ${p.height} cm`;
  $("sb-ovr").textContent = ENG.ovr(p);
  $("sb-season").textContent = p.age + " ans";
  $("sb-phase").textContent = DATA.PHASES[S.phase] || "";

  /* — vitals — */
  [["form", "m-form", "v-form"], ["morale", "m-morale", "v-morale"], ["health", "m-health", "v-health"]]
    .forEach(([k, mid, vid]) => {
      const v = Math.round(p[k]);
      const bar = $(mid);
      bar.style.width = v + "%";
      bar.className = "meter-fill" + (v < 35 ? " low" : v < 60 ? " mid" : "");
      $(vid).textContent = v;
    });

  renderRelations();
  renderCast();
  renderContract();
  renderAttrs();
  renderBadges();
  renderCareer();
  renderTrophies();
  renderLeagueRail();
}

/* redessine tout le fil depuis le journal — utilisé à la reprise
   et à chaque changement de joueur en mode rivalité */
function renderFullFeed() {
  const feed = $("feed");
  feed.innerHTML = "";
  (S.log || []).slice(-30).forEach((l) => {
    const b = el("div", "beat " + (l.kind || "wire"));
    const top = el("div", "beat-top");
    top.appendChild(el("span", "beat-tag", l.tag || "Info"));
    if (l.src) top.appendChild(el("span", "beat-src", l.src));
    top.appendChild(el("span", "beat-when", l.when || ""));
    b.appendChild(top);
    if (l.head) b.appendChild(el("div", "beat-h", l.head));
    if (l.body) b.appendChild(el("div", "beat-p", l.body));
    feed.appendChild(b);
  });
}

function renderRelations() {
  const p = S.p, box = $("rel-body");
  if (!box) return;
  p.rel = p.rel || CAST.newRel();
  box.innerHTML = "";
  CAST.REL_KEYS.forEach((k) => {
    const v = Math.round(k.id === "coach" ? p.trust : (p.rel[k.id] != null ? p.rel[k.id] : 50));
    const row = el("div", "vital");
    row.appendChild(el("span", "vital-lbl", k.label));
    const meter = el("span", "meter");
    const fill = el("span", "meter-fill" + (v < 32 ? " low" : v < 55 ? " mid" : ""));
    fill.style.width = v + "%";
    meter.appendChild(fill);
    row.appendChild(meter);
    const val = el("span", "vital-val", v);
    val.title = CAST.relLabel(v);
    row.appendChild(val);
    box.appendChild(row);
  });
}

function renderCast() {
  const box = $("cast-body");
  if (!box || !S.cast) return;
  const c = S.cast;
  box.innerHTML = "";

  const line = (role, name, note) => {
    const d = el("div", "cast-row");
    d.appendChild(el("span", "cast-role", role));
    const n = el("span", "cast-name");
    n.textContent = name;
    if (note) n.appendChild(el("small", null, note));
    d.appendChild(n);
    box.appendChild(d);
  };

  line("Coach", c.coach.name, c.coach.style.label);
  line("Direction", c.gm.name, c.gm.style.label);
  line("Agent", c.agent.name, c.agent.style.label);
  line("Presse", c.journo.name, c.journo.outlet);
  (c.mates || []).slice(0, 3).forEach((m) => line("Vestiaire", m.name, m.role.label));
  (c.rivals || []).forEach((r) => {
    const t = teamOf(r.team);
    line("Rival", r.name, (t ? t.city + " · " : "") + (r.heat >= 70 ? "tension vive" : r.heat >= 45 ? "rivalité" : "respect"));
  });
  if (c.family.partner) line("Vie privée", c.family.partner.name, c.family.kids ? c.family.kids + " enfant(s)" : "");
}

function renderContract() {
  const p = S.p, box = $("contract-body");
  box.innerHTML = "";
  if (!p.contract) {
    box.appendChild(el("div", "empty-note", p.team ? "Aucun contrat professionnel." : "Pas encore professionnel."));
    box.appendChild(Object.assign(el("div", "contract-line"), { innerHTML: `<span>Fortune</span><b>${ENG.money(p.money)}</b>` }));
    return;
  }
  const c = p.contract;
  box.appendChild(el("div", "contract-deal", ENG.money(c.salary) + " / an"));
  const tag = el("span", "contract-tag", c.kind);
  box.appendChild(tag);
  const line = (l, v) => {
    const d = el("div", "contract-line");
    d.appendChild(el("span", null, l));
    d.appendChild(el("b", null, v));
    box.appendChild(d);
  };
  line("Années restantes", c.years);
  line("Total du contrat", ENG.money(c.salary * c.total));
  if (p.shoe && p.shoe.tier > 0) line(p.shoe.n, ENG.money(p.shoeAnnual || 0) + "/an");
  line("Fortune", ENG.money(p.money));
}

function tierClass(v) {
  return v >= 90 ? "t-elite" : v >= 80 ? "t-great" : v >= 68 ? "t-good" : "";
}

function renderAttrs() {
  const p = S.p, box = $("attrs-body");
  box.innerHTML = "";
  DATA.ATTR_GROUPS.forEach((g) => {
    const sect = el("div");
    sect.appendChild(el("div", "attr-group-name", g.label));
    DATA.ATTRS.filter((a) => a.g === g.id).forEach((a) => {
      const v = Math.round(p.attrs[a.id]);
      const row = el("div", "attr");
      row.appendChild(el("span", "attr-n", a.label));
      const bar = el("span", "attr-bar");
      const fill = el("i", tierClass(v));
      fill.style.width = v + "%";
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el("span", "attr-v", v));
      sect.appendChild(row);
    });
    box.appendChild(sect);
  });
}

function renderBadges() {
  const p = S.p, box = $("badges-body");
  box.innerHTML = "";
  DATA.BADGES.forEach((b) => {
    const t = p.badges[b.id] || 0;
    const n = el("div", "badge" + (t ? " has t" + t : ""), b.i);
    const names = ["", "bronze", "argent", "or", "légende"];
    n.title = b.n + (t ? ` — ${names[t]}` : " — verrouillé") + ` (${b.c})`;
    box.appendChild(n);
  });
  $("badge-count").textContent = ENG.badgeCount(p) + "/36";
}

function renderCareer() {
  const p = S.p, c = p.career, box = $("career-body");
  const per = (v) => (c.gp ? (v / c.gp).toFixed(1).replace(".", ",") : "0,0");
  box.innerHTML = "";
  [["PTS", per(c.pts)], ["REB", per(c.reb)], ["PD", per(c.ast)], ["MJ", c.gp]].forEach(([l, v]) => {
    const d = el("div", "cstat");
    d.appendChild(el("b", null, v));
    d.appendChild(el("span", null, l));
    box.appendChild(d);
  });
  drawArc();
}

function drawArc() {
  const cv = $("arc-chart");
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 260, h = 80;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);

  const seasons = S.p.seasons.filter((s) => s.level === "pro");
  if (seasons.length < 2) {
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-3").trim() || "#888";
    g.font = "11px system-ui";
    g.fillText("Courbe disponible après 2 saisons pro", 4, h / 2);
    return;
  }

  const cs = getComputedStyle(document.documentElement);
  const teamC = cs.getPropertyValue("--team").trim() || "#E2622C";
  const lineC = cs.getPropertyValue("--line").trim() || "#ccc";

  const ovrs = seasons.map((s) => s.ovr);
  const ppgs = seasons.map((s) => s.ppg);
  const maxO = Math.max(...ovrs) + 3, minO = Math.min(...ovrs) - 3;
  const maxP = Math.max(...ppgs, 10);

  const x = (i) => 4 + (i / (seasons.length - 1)) * (w - 8);

  /* barres : points par match */
  g.fillStyle = lineC;
  seasons.forEach((s, i) => {
    const bh = (s.ppg / maxP) * (h - 18);
    const bw = Math.max(2, (w - 8) / seasons.length - 3);
    g.fillRect(x(i) - bw / 2, h - 4 - bh, bw, bh);
  });

  /* ligne : évaluation générale */
  g.beginPath();
  seasons.forEach((s, i) => {
    const y = 8 + (1 - (s.ovr - minO) / (maxO - minO)) * (h - 22);
    i ? g.lineTo(x(i), y) : g.moveTo(x(i), y);
  });
  g.strokeStyle = teamC;
  g.lineWidth = 2;
  g.lineJoin = "round";
  g.stroke();

  const last = seasons[seasons.length - 1];
  const ly = 8 + (1 - (last.ovr - minO) / (maxO - minO)) * (h - 22);
  g.fillStyle = teamC;
  g.beginPath();
  g.arc(x(seasons.length - 1), ly, 3, 0, Math.PI * 2);
  g.fill();
}

function renderTrophies() {
  const box = $("trophies-body");
  box.innerHTML = "";
  const list = S.p.trophies.slice().reverse();
  if (!list.length) { box.appendChild(el("div", "empty-note", "Aucune distinction pour l'instant.")); return; }
  list.slice(0, 26).forEach((t) => {
    const d = el("div", "trophy " + (t.cls || ""));
    d.appendChild(el("span", null, t.icon || "🏅"));
    d.appendChild(el("span", null, t.name));
    d.appendChild(el("b", null, t.year));
    box.appendChild(d);
  });
}

function renderLeagueRail() {
  const p = S.p;

  /* ma saison */
  const ms = $("myseason-body");
  ms.innerHTML = "";
  const last = p.seasons[p.seasons.length - 1];
  if (!last) {
    ms.appendChild(el("div", "empty-note", "Première saison à venir."));
  } else {
    const line = el("div", "ms-line");
    [["PTS", last.ppg], ["REB", last.rpg], ["PD", last.apg], ["INT", last.spg], ["CTR", last.bpg]]
      .forEach(([l, v]) => {
        const d = el("div");
        d.appendChild(el("b", null, (v || 0).toFixed(1).replace(".", ",")));
        d.appendChild(el("span", null, l));
        line.appendChild(d);
      });
    ms.appendChild(line);
    const rec = el("div", "ms-rec");
    rec.appendChild(el("span", null, last.teamName || "Bilan"));
    rec.appendChild(el("b", null, last.wins + "–" + last.losses));
    ms.appendChild(rec);
  }

  /* course au MVP */
  const mv = $("mvp-body");
  mv.innerHTML = "";
  if (!S.lastAwards) mv.appendChild(el("div", "empty-note", "Classement après la première saison pro."));
  else S.lastAwards.ladder.slice(0, 6).forEach((x, i) => {
    const r = el("div", "rank" + (x.isMe ? " me" : ""));
    r.appendChild(el("span", "rank-i", i + 1));
    const n = el("span", "rank-n");
    n.textContent = x.name + " ";
    /* le sous-titre porte les points, la colonne de droite la note de vote :
       sans ça le n°1 peut sembler moins bon que le n°2 */
    const small = el("small", null,
      (teamOf(x.team) ? teamOf(x.team).id + " · " : "") + x.s.ppg.toFixed(1).replace(".", ",") + " pts");
    n.appendChild(small);
    r.appendChild(n);
    r.appendChild(el("span", "rank-v", Math.round(x.v)));
    mv.appendChild(r);
  });

  /* classement de conférence */
  const st = $("standings-body");
  st.innerHTML = "";
  if (!S.lastStandings || !p.team) {
    $("standings-title").textContent = "Classement";
    st.appendChild(el("div", "empty-note", "Disponible en carrière professionnelle."));
  } else {
    const conf = teamOf(p.team).conf;
    $("standings-title").textContent = "Conférence " + (conf === "E" ? "Est" : "Ouest");
    S.lastStandings[conf].slice(0, 10).forEach((row) => {
      const t = teamOf(row.id);
      const r = el("div", "rank" + (row.id === p.team ? " me" : ""));
      r.appendChild(el("span", "rank-i", row.seed));
      const n = el("span", "rank-n");
      n.textContent = t.city + " ";
      n.appendChild(el("small", null, t.name));
      r.appendChild(n);
      r.appendChild(el("span", "rank-v", row.w + "–" + row.l));
      st.appendChild(r);
    });
  }

  /* face à face entre joueurs humains */
  const vs = $("card-versus");
  if (vs) {
    const on = S.mp && S.mp.on && S.mp.players.length > 1;
    vs.classList.toggle("hidden", !on);
    if (on) {
      const body = $("versus-body");
      body.innerHTML = "";
      S.mp.players.map((x, i) => {
        const pp = i === S.mp.turn ? S.p : x.p;
        const cc = pp ? pp.career : null;
        return { i, label: x.label, name: pp ? ENG.name(pp) : x.label,
                 ovr: pp ? ENG.ovr(pp) : 0, rings: pp ? pp.rings : 0,
                 mvp: cc ? cc.mvp : 0, seasons: cc ? cc.seasons : 0,
                 ppg: cc && cc.gp ? cc.pts / cc.gp : 0, retired: x.retired };
      }).sort((a, b) => b.ovr - a.ovr).forEach((r) => {
        const row = el("div", "rank" + (r.i === S.mp.turn ? " me" : ""));
        row.appendChild(el("span", "rank-i", r.ovr || "—"));
        const n = el("span", "rank-n");
        n.textContent = r.name + " ";
        n.appendChild(el("small", null,
          `${r.label}${r.retired ? " · retraité" : ""} · ${r.ppg.toFixed(1).replace(".", ",")} pts · ${r.rings} 💍`));
        row.appendChild(n);
        row.appendChild(el("span", "rank-v", r.seasons + " s."));
        body.appendChild(row);
      });
    }
  }

  /* meilleurs marqueurs */
  const ld = $("leaders-body");
  ld.innerHTML = "";
  if (!S.lastAwards) ld.appendChild(el("div", "empty-note", "—"));
  else S.lastAwards.scoring.slice(0, 6).forEach((x, i) => {
    const r = el("div", "rank" + (x.isMe ? " me" : ""));
    r.appendChild(el("span", "rank-i", i + 1));
    const n = el("span", "rank-n", x.name);
    r.appendChild(n);
    r.appendChild(el("span", "rank-v", x.s.ppg.toFixed(1).replace(".", ",")));
    ld.appendChild(r);
  });
}

/* ═══════════════ TROPHÉES ═══════════════ */

function award(name, icon, cls) {
  S.p.trophies.push({ name, icon, cls, year: S.calendar.year });
}

/* ═══════════════ DÉROULÉ ═══════════════ */

const STEPS = {};

/* Une saison ne demande que des décisions. Tout ce qui est du récit
   — la saison jouée, les temps forts, les trophées, les playoffs, la
   progression — sort d'un seul bloc, sans clic intermédiaire. */
function queueSeason() {
  const ph = S.phase;
  if (ph === "hs") S.queue = ["event", "season", "hsCheck"];
  else if (ph === "ncaa") S.queue = ["event", "season", "ncaaCheck"];
  else if (ph === "prep") S.queue = ["event", "season", "toDraft"];
  else if (ph === "pro") {
    S.queue = ["offseason", "event", "season", "event", "contract"];
  }
  else S.queue = [];
}

/* le bloc récit : enchaîne les étapes sans rendre la main */
STEPS.season = function () {
  STEPS.play();
  if (S.phase === "pro") {
    STEPS.highlights();
    STEPS.awards();
    STEPS.playoffs();
  }
  STEPS.grow();
  setActionEnabled(true);
};

function pump() {
  if (!S.queue.length) {
    /* fin de saison : en mode rivalité, on passe la main */
    if (S.mp && S.mp.on && S.mp.players.length > 1 && mpAliveCount() > 0) {
      mpEndTurn();
      return;
    }
    queueSeason();
  }
  if (!S.queue.length) return;
  const step = S.queue.shift();
  (STEPS[step] || (() => {}))();
  render();
  save();
  labelAction();
}

/* Étapes après lesquelles on rend la main : ce sont des blocs à lire.
   Tout le reste s'enchaîne sans intervention. */
const TERMINAL = { season: true, contract: true, toDraft: true };

function modalOpen() { return !$("modal").classList.contains("hidden"); }

/* Revenir au terrain depuis un écran annexe : on réactive le bouton
   d'action, sinon une visite au menu ou aux codes laisse la partie figée. */
function backToGame() {
  show("screen-game");
  if (!modalOpen()) setActionEnabled(true);
  render();
}

function autoChain() {
  let guard = 0;
  while (guard++ < 12) {
    if (modalOpen()) return;                       /* une décision attend */
    if (!S || S.phase === "retired") return;       /* carrière terminée */
    if ($("screen-game").classList.contains("hidden")) return;
    const next = S.queue[0];
    if (!next) return;                             /* fin de saison : le joueur relance */
    pump();
    if (TERMINAL[next]) return;                    /* bloc à lire : on s'arrête */
  }
}

function labelAction() {
  const next = S.queue[0];
  const map = {
    offseason: "Touche pour préparer l'intersaison",
    event: "Touche l'écran pour continuer",
    season: S.phase === "pro" ? "Touche pour jouer la saison " + S.calendar.year
          : S.phase === "ncaa" ? "Touche pour jouer la saison universitaire"
          : S.phase === "prep" ? "Touche pour jouer l'année de préparation"
          : "Touche pour jouer la saison de lycée",
    contract: "Touche pour le bilan de fin de saison",
    hsCheck: "Touche l'écran pour continuer", ncaaCheck: "Touche l'écran pour continuer",
    toDraft: "Touche l'écran pour rejoindre la draft",
  };
  $("tap-label").textContent = next ? (map[next] || "Touche l'écran pour continuer") : "Touche pour la saison suivante";
}

/* ─── étape : intersaison ─── */

STEPS.offseason = function () {
  const p = S.p;
  p.form = ENG.clamp(p.form + ENG.R.i(6, 16), 0, 100);
  p.health = ENG.clamp(p.health + ENG.R.i(10, 22), 0, 100);

  /* on ne garde que les programmes qui ont du sens pour CE joueur,
     puis on en propose quatre, biaisés vers ceux jamais essayés */
  const pool = DATA.TRAINING.filter((t) => {
    if (t.when) { try { if (!t.when(p)) return false; } catch (e) { return false; } }
    if (t.mods.money && p.money + t.mods.money < 0) return false;
    return true;
  });
  const offered = META.mixSubset(pool, 4, "training", (t) => t.id);

  const intro = p.health < 62
    ? "Le corps a pris cher cette saison. Ce que tu choisis maintenant décidera de ce qu'il te restera en avril."
    : p.career.seasons === 0
      ? "Ton premier été de professionnel. Personne ne te dira quoi faire de ces quatre mois."
      : "Quatre mois avant la reprise. Ce que tu choisis maintenant décide de ce que tu seras en avril.";

  ask({
    kicker: "Intersaison " + S.calendar.year,
    head: ENG.R.pick(["Le programme d'été", "Quatre mois devant toi", "L'été se prépare maintenant",
                      "Ce que tu feras de l'intersaison"]),
    body: intro,
    choices: offered.map((t) => ({
      h: t.label, d: t.desc, t: t.t,
      pick: () => {
        META.bump("training", t.id);
        /* l'axe travaillé accélère la progression des attributs visés */
        S.focus = Object.keys(t.mods).filter((k) => DATA.ATTRS.some((a) => a.id === k));
        const pills = SC.apply(p, t.mods, null);
        beat({
          kind: "wire", tag: "Intersaison", src: "Salle d'entraînement",
          head: t.label, body: t.desc + " " + summerLine(t, p), pills,
        });
        setActionEnabled(true);
      },
    })),
  });
};

/* une phrase de contexte différente selon le programme et le joueur */
function summerLine(t, p) {
  const pos = DATA.POSITIONS.find((x) => x.id === p.position).label.toLowerCase();
  const opts = [
    `Tu rentres au camp avec un axe assumé : ${t.t.toLowerCase()}.`,
    `Pour un ${pos} de ${p.age} ans, c'est le genre d'été qui se voit deux saisons plus tard.`,
    `Le staff n'a rien demandé. C'est ton choix, et il t'appartient.`,
    `Personne ne l'a filmé. Le résultat, si, se verra.`,
  ];
  return ENG.R.pick(opts);
}

/* ─── étape : événement narratif ─── */

function scCtx() {
  return {
    p: S.p, cast: S.cast, L: S.L, phase: S.phase, year: S.calendar.year,
    madePlayoffs: S.madePlayoffs, season: S.lastSeason,
  };
}

STEPS.event = function () {
  const c = scCtx();
  /* la toute première scène d'une carrière ne doit jamais être celle
     d'hier : c'est elle qui donne envie de relancer une partie */
  const sc = SC.draw(c, S.recent, S.recent.length === 0);
  if (!sc) { setActionEnabled(true); return; }

  /* on garde la trace de tout ce qui est tombé dans CETTE carrière :
     aucune situation ne revient tant qu'il reste du neuf */
  S.recent.push(sc.id);
  META.noteScenario(sc.id);

  const staged = SC.stage(sc, c);

  ask({
    kicker: staged.kicker, head: staged.head, body: staged.body,
    defer: true,
    onDefer: () => {
      /* on n'y répond pas maintenant : la scène redevient tirable */
      const i = S.recent.indexOf(sc.id);
      if (i >= 0) S.recent.splice(i, 1);
      beat({ kind: "wire", tag: staged.kicker, src: S.cast.journo.outlet,
             head: staged.head, body: "Tu remets la décision à plus tard. Le sujet reviendra." });
    },
    choices: staged.choices.map((ch, i) => ({
      h: ch.h, d: ch.d, t: ch.t,
      pick: () => {
        const res = SC.resolve(staged, i, scCtx());
        /* les issues qui font basculer un match méritent un instant de silence
           avant qu'on sache ce qu'il en est advenu */
        const susp = res.kind === "epic" ? ENG.R.pick(["Le ballon quitte tes mains…", "La salle retient son souffle…", "Tout se joue maintenant…"])
                   : res.kind === "ring" ? "Le buzzer approche…"
                   : res.kind === "trophy" ? "L'annonce arrive…"
                   : res.flag === "traded" ? "Ton téléphone se met à vibrer sans s'arrêter…" : null;
        /* la scène « transfert appris par notification » se lit littéralement :
           le texte narratif introduit l'écran, la notif suit en dessous */
        const notifBox = res.flag === "traded"
          ? smsCard({ from: S.cast.agent.name, sub: "ton agent", icon: "briefcase",
                      text: [
                        "Je viens d'avoir la confirmation. C'est fait, tu changes d'équipe. Je t'appelle dans la minute, ne panique pas.",
                        "Ça vient de tomber, c'est officiel. Je sais que c'est brutal comme ça, mais respire — je t'explique tout au téléphone.",
                        "Je voulais te l'annoncer moi-même mais l'info a fuité avant. C'est confirmé, tu es transféré. J'arrive.",
                      ] })
          : null;
        beat({ kind: res.kind, tag: staged.kicker, src: S.cast.journo.outlet,
               teaser: susp, head: staged.head, body: res.text, pills: res.pills, box: notifBox });
        if (res.flag) S.pending = res.flag;
        setActionEnabled(true);
      },
    })),
  });
};

/* ─── étape : jouer la saison ─── */

STEPS.play = function () {
  const p = S.p;
  const level = S.phase === "pro" ? "pro" : S.phase === "hs" ? "hs" : "ncaa";
  const ent = DATA.ENTOURAGES.find((x) => x.id === p.entourage);

  let cast = 45;
  if (S.phase === "pro" && p.team) cast = S.L.teams[p.team].cast;
  else if (S.phase === "ncaa" && p.college) {
    const col = DATA.COLLEGES.find((c) => c.name === p.college);
    cast = 30 + col.prestige * 0.22;
  } else if (S.phase === "hs") cast = 34;
  else if (S.phase === "prep") cast = 46;

  if (S.phase === "pro") ENG.rollLeague(S.L);

  const s = ENG.simSeason(p, S.L, { level, cast, injuryGuard: ent.injuryGuard || 1 });
  s.level = level;
  s.ovr = ENG.ovr(p);
  s.age = p.age;
  s.year = S.calendar.year;
  s.teamName = p.team ? teamOf(p.team).full : (p.college || "Lycée");

  /* blessures */
  s.injuries.forEach((inj) => {
    p.injuryHistory.push({ n: inj.n, year: S.calendar.year });
    for (const k in inj.hit) p.attrs[k] = ENG.clamp(p.attrs[k] + inj.hit[k], 22, 99);
  });
  if (s.injuries.length) {
    p.health = ENG.clamp(p.health - s.injuries.reduce((a, b) => a + b.sev * 7, 0), 5, 100);
  }

  /* cumuls — uniquement le professionnel : les stats de lycée et
     d'université ne comptent pas dans les totaux de carrière */
  const c = p.career;
  if (level === "pro") {
    c.gp += s.gp; c.pts += Math.round(s.ppg * s.gp); c.reb += Math.round(s.rpg * s.gp);
    c.ast += Math.round(s.apg * s.gp); c.stl += Math.round(s.spg * s.gp); c.blk += Math.round(s.bpg * s.gp);
    c.seasons++;
    c.bestPpg = Math.max(c.bestPpg, s.ppg);
    if (s.gp >= 78) c.full82++;
    if (s.ppg >= 10 && s.rpg >= 10 && s.apg >= 10) c.tripleSeasons++;
  }
  p.seasons.push(s);
  S.lastSeason = s;

  /* forme et moral suivent les résultats */
  const winPct = s.wins / (s.wins + s.losses);
  p.form = ENG.clamp(p.form - ENG.R.i(8, 20) + (s.gp / 82) * 6, 10, 100);
  p.morale = ENG.clamp(p.morale + (winPct - 0.5) * 42 + (s.ppg > 15 ? 5 : -2), 5, 100);
  const floor = (DATA.ENTOURAGES.find((x) => x.id === p.entourage) || {}).moraleFloor;
  if (floor) p.morale = Math.max(p.morale, floor);
  p.trust = ENG.clamp(p.trust + (s.value > 14 ? 6 : s.value > 8 ? 2 : -4), 5, 100);

  /* notoriété */
  const buzz = (s.ppg * 0.5 + s.value * 0.5) * (level === "pro" ? 1 : 0.45);
  p.rep = ENG.clamp(p.rep + buzz * 0.34, 0, 100);
  p.fame = ENG.clamp(p.fame + buzz * (level === "pro" ? 0.28 : 0.1), 0, 100);
  p.followers = Math.round(p.followers * (1 + buzz / 120));

  /* salaire encaissé */
  if (p.contract) {
    p.money += Math.round(p.salary * 0.54);   /* net d'impôts et d'agent */
    if (p.shoeAnnual) p.money += Math.round(p.shoeAnnual * 0.6);
  }

  /* rapport de saison */
  const rows = [[
    { v: s.gp }, { v: s.mpg.toFixed(1).replace(".", ",") },
    { v: s.ppg.toFixed(1).replace(".", ","), hi: true },
    { v: s.rpg.toFixed(1).replace(".", ",") },
    { v: s.apg.toFixed(1).replace(".", ",") },
    { v: s.spg.toFixed(1).replace(".", ",") },
    { v: s.bpg.toFixed(1).replace(".", ",") },
    { v: ENG.pct3(s.fg) }, { v: ENG.pct3(s.tp) }, { v: ENG.pct3(s.ft) },
  ]];
  const box = statTable(rows, ["MJ", "MIN", "PTS", "REB", "PD", "INT", "CTR", "TIRS", "3 PTS", "LF"]);

  const label = level === "pro" ? "Saison régulière" : level === "ncaa" ? "Saison universitaire" : "Saison lycée";
  const missTxt = s.missed > 0
    ? ` ${s.missed} match(s) manqué(s) : ${s.injuries.map((i) => i.n).join(", ")}.`
    : " Aucune absence.";

  beat({
    kind: s.injuries.some((i) => i.sev >= 4) ? "bad" : "wire",
    tag: label, src: ENG.R.pick(DATA.MEDIA),
    head: `${s.teamName} termine ${s.wins}–${s.losses}`,
    body: `${ENG.name(p)} boucle la saison à ${s.ppg.toFixed(1).replace(".", ",")} points, ${s.rpg.toFixed(1).replace(".", ",")} rebonds et ${s.apg.toFixed(1).replace(".", ",")} passes de moyenne en ${s.mpg.toFixed(1).replace(".", ",")} minutes.${missTxt}`,
    box,
  });

  if (level === "pro") {
    S.lastStandings = ENG.standings(S.L, p.team, s.wins);
  }

  setActionEnabled(true);
};

/* ─── étape : temps forts de la saison ───
   Deux ou trois moments tirés au sort parmi ceux que la saison rend possibles.
   C'est ce qui fait qu'aucune saison ne se raconte comme la précédente. */

const OPPONENTS = () => teamOf(ENG.R.pick(DATA.TEAMS).id).full;

STEPS.highlights = function () {
  const p = S.p, s = S.lastSeason, R = ENG.R;
  const c = p.career;
  const moments = [];
  const push = (w, txt) => moments.push({ w, txt });

  /* record personnel sur un match */
  const high = Math.round(s.ppg * R.f(1.75, 2.35));
  push(3, `Record personnel : ${high} points face à ${OPPONENTS()}.`);

  /* série de victoires ou de défaites */
  if (s.wins >= 45) push(2, `Série de ${R.i(8, 14)} victoires consécutives entre décembre et janvier.`);
  if (s.losses >= 45) push(2, `Série noire de ${R.i(7, 12)} défaites de suite en février.`);

  /* tir au buzzer */
  if (p.attrs.clutch > 62) {
    const n = R.i(1, 4);
    push(2, n === 1
      ? "Un panier de la gagnance dans les cinq dernières secondes."
      : `${n} paniers de la gagnance dans les cinq dernières secondes.`);
  }

  /* triple-doubles */
  const tdRate = (s.ppg > 16 ? 1 : 0) + (s.rpg > 7 ? 1 : 0) + (s.apg > 6 ? 1 : 0);
  if (tdRate >= 2) {
    const n = R.i(2, tdRate === 3 ? 18 : 6);
    push(3, `${n} triple-doubles sur la saison.`);
  }

  /* dunk marquant */
  if (p.attrs.athleticism > 74) push(1, `Un dunk sur ${OPPONENTS().split(" ").slice(-1)[0]} qui tourne en boucle toute la semaine.`);

  /* adresse remarquable */
  if (s.tp > 0.40 && s.ft > 0.87 && s.fg > 0.49) push(4, "Saison à 50-40-90 : le club le plus fermé du basket.");
  else if (s.tp > 0.41) push(1, `${ENG.pct3(s.tp).replace(",", "")} % à trois points, meilleur total de sa carrière.`);

  /* distinctions hebdomadaires */
  if (s.value > 20) push(2, `Élu joueur de la semaine à ${R.i(2, 6)} reprises.`);

  /* exclusions */
  if (p.morale < 45 || p.attrs.clutch > 85) {
    const n = R.i(1, 3);
    push(1, n === 1
      ? "Une exclusion pour deux fautes techniques."
      : `${n} exclusions pour deux fautes techniques.`);
  }

  /* absence longue */
  if (s.missed > 25) push(3, `${s.missed} matchs manqués : la plus longue absence de sa carrière.`);

  /* jalons de carrière */
  const marks = [
    [5000, "points"], [10000, "points"], [15000, "points"], [20000, "points"],
    [25000, "points"], [30000, "points"],
  ];
  marks.forEach(([n]) => {
    const before = c.pts - Math.round(s.ppg * s.gp);
    if (before < n && c.pts >= n) {
      push(9, `Cap des ${n.toLocaleString("fr-FR")} points en carrière franchi.`);
      award(`${n.toLocaleString("fr-FR")} points`, "📈", "major");
    }
  });
  [[2500, "passes décisives", c.ast], [5000, "passes décisives", c.ast],
   [5000, "rebonds", c.reb], [10000, "rebonds", c.reb]].forEach(([n, label, tot]) => {
    const delta = label === "rebonds" ? Math.round(s.rpg * s.gp) : Math.round(s.apg * s.gp);
    if (tot - delta < n && tot >= n) {
      push(8, `Cap des ${n.toLocaleString("fr-FR")} ${label} franchi.`);
      award(`${n.toLocaleString("fr-FR")} ${label}`, "📈", "major");
    }
  });

  /* tirage pondéré, sans doublon */
  const chosen = [];
  const pool = moments.slice();
  const take = Math.min(pool.length, ENG.R.i(2, 3));
  for (let i = 0; i < take && pool.length; i++) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total, k = 0;
    while (r > pool[k].w && k < pool.length - 1) { r -= pool[k].w; k++; }
    chosen.push(pool[k].txt);
    pool.splice(k, 1);
  }

  beat({
    kind: "wire", tag: "Temps forts", src: ENG.R.pick(DATA.MEDIA),
    head: `Ce qu'on retiendra de la saison ${S.calendar.year}`,
    body: chosen.join(" "),
  });
  setActionEnabled(true);
};

/* ─── étape : trophées ─── */

STEPS.awards = function () {
  const p = S.p, s = S.lastSeason;
  const me = {
    name: ENG.name(p), pos: p.position, team: p.team, isMe: true, p,
    rookie: p.career.seasons === 1, ovr: ENG.ovr(p),
    s: { ppg: s.ppg, rpg: s.rpg, apg: s.apg, stl: s.spg, blk: s.bpg, ts: s.ts, gp: s.gp, mpg: s.mpg },
    wins: s.wins,
  };
  const aw = ENG.awards(S.L, me);
  S.lastAwards = aw;

  const won = [];
  const isMe = (x) => x && x.isMe;

  if (isMe(aw.mvp)) { won.push(["MVP de la saison", "🏆", "major"]); p.career.mvp++; }
  if (isMe(aw.dpoy)) { won.push(["Meilleur défenseur", "🛡️", "major"]); p.career.dpoy++; }
  if (isMe(aw.roy)) { won.push(["Rookie de l'année", "🌱", "major"]); }
  if (aw.allNba.some(isMe)) { won.push(["All-NBA", "⭐", ""]); p.career.allNba++; }
  if (aw.allStars.some(isMe)) { won.push(["All-Star", "✴️", ""]); p.career.allStar++; }
  if (aw.scoring[0] && isMe(aw.scoring[0])) won.push(["Meilleur marqueur", "🎯", ""]);
  if (aw.assists[0] && isMe(aw.assists[0])) won.push(["Meilleur passeur", "🎼", ""]);

  won.forEach(([n, i, cls]) => award(n, i, cls));

  const rank = aw.ladder.findIndex(isMe) + 1;
  if (won.length) {
    const major = won.find((w) => w[2] === "major") || won[0];
    beat({
      kind: "trophy", tag: "Cérémonie " + S.calendar.year,
      teaser: ENG.R.pick(["La ligue s'apprête à trancher…", "Les votes sont comptés…", "La salle attend l'annonce…"]),
      poster: { emblem: major[1] },
      head: won.map((w) => w[0]).join(" · "),
      body: `${ENG.name(p)} est récompensé au terme de la saison ${S.calendar.year}.`,
      pills: won.map((w) => ({ t: w[1] + " " + w[0], k: "star" })),
    });
    if (isMe(aw.mvp)) {
      const j = S.cast.journo;
      const n = ENG.name(p);
      const quoteByStance = {
        hostile: [`On peut discuter des chiffres, mais la ligue a tranché`, `Pas mon choix, mais les votants ont parlé`],
        sharp:   [`Les chiffres ne mentent pas, et cette saison encore moins`, `Une domination lisible dans la moindre statistique`],
        lazy:    [`Bon, difficile de voter contre lui cette fois`, `Même sans creuser, l'écart saute aux yeux`],
        friendly:[`Une saison sans équivalent`, `Le genre de campagne qu'on ne voit qu'une fois par génération`],
      };
      beat({
        kind: "wire", tag: "Une",
        teaser: "La presse s'empare déjà de la nouvelle…",
        box: headlineCard({
          outlet: j.outlet, kicker: "MVP " + S.calendar.year,
          headline: [
            `${n}, LE MEILLEUR DE LA LIGUE`,
            `${n} COURONNÉ MVP ${S.calendar.year}`,
            `SANS DÉBAT : ${n} EST MVP`,
          ],
          dek: `${j.name} : « ${ENG.R.pick(quoteByStance[j.stance.id] || quoteByStance.friendly)} — ${n} s'impose comme MVP ${S.calendar.year}. »`,
        }),
      });
    }
  } else {
    beat({
      kind: "wire", tag: "Trophées", src: "Cérémonie de la ligue",
      head: `${aw.mvp.name} est élu MVP`,
      body: rank > 0 && rank <= 8
        ? `${ENG.name(p)} termine ${rank}ᵉ du vote MVP.`
        : `${ENG.name(p)} ne figure pas dans les huit premiers du vote.`,
    });
  }
  setActionEnabled(true);
};

/* ─── étape : playoffs ─── */

STEPS.playoffs = function () {
  const p = S.p, s = S.lastSeason;
  const conf = teamOf(p.team).conf;
  const table = S.lastStandings[conf];
  const mySeed = table.find((r) => r.id === p.team);
  S.madePlayoffs = mySeed && mySeed.seed <= 10;

  if (!S.madePlayoffs) {
    beat({ kind: "bad", tag: "Playoffs", src: ENG.R.pick(DATA.MEDIA),
           head: "Saison terminée en avril",
           body: `${teamOf(p.team).full} manque les playoffs (${mySeed ? mySeed.seed : "—"}ᵉ de conférence). Direction la loterie.` });
    p.morale = ENG.clamp(p.morale - 10, 5, 100);
    setActionEnabled(true);
    return;
  }

  p.career.playoffApps++;
  const po = ENG.postseason(S.L, S.lastStandings, p.team, p);
  const out = po.exit, reached = Math.max(0, po.reached);
  const champ = po.champion.id === p.team;
  const clutchBoost = ENG.R.f(0.9, 1.22);
  const poLine = {
    ppg: Math.round(s.ppg * clutchBoost * (1 + (p.attrs.clutch - 60) / 400) * 10) / 10,
    rpg: Math.round(s.rpg * ENG.R.f(0.95, 1.12) * 10) / 10,
    apg: Math.round(s.apg * ENG.R.f(0.92, 1.1) * 10) / 10,
  };

  if (champ) {
    p.rings++;
    award("Champion de la ligue", "💍", "ring");
    const fmvp = ENG.R.chance(ENG.clamp(0.18 + (ENG.ovr(p) - 74) * 0.035, 0.05, 0.85));
    if (fmvp) { award("MVP des Finales", "👑", "ring"); p.career.fmvp++; }
    beat({
      kind: "ring", tag: "Finales " + S.calendar.year,
      teaser: "Le chronomètre s'arrête. La salle retient son souffle…",
      poster: { emblem: "💍" },
      head: `${teamOf(p.team).full} est champion`,
      body: `Titre remporté ${po.finalsScore.replace("-", "–")} face à ${po.opponent ? teamOf(po.opponent.id).full : "l'Ouest"}. ${ENG.name(p)} tourne à ${poLine.ppg.toFixed(1).replace(".", ",")} points de moyenne en playoffs${fmvp ? " et est élu MVP des Finales" : ""}.`,
      pills: [{ t: "💍 Bague n°" + p.rings, k: "star" }],
    });
    const mate = S.cast.mates[0], rival = S.cast.rivals[0], firstName = ENG.name(p).split(" ")[0];
    beat({
      kind: "wire", tag: "Ça réagit",
      teaser: "Les réactions commencent déjà à affluer…",
      box: socialCard({
        posts: [
          { name: mate.name, handle: mate.role.label, icon: "ball",
            text: fmvp
              ? [`on a gagné avec un GOAT dans le vestiaire, j'ai pas d'autres mots 🐐🏆`, `jouer à côté de lui cette saison, c'était voir la grandeur de près. MVP des Finales amplement mérité 🏆`, `ce mec a porté l'équipe entière en finale. légende vivante 🐐`]
              : [`champions !! cette équipe, cette ville, cette bague. jamais je n'oublierai cette saison 🏆`, `ON L'A FAIT 🏆 tout ce sang et cette sueur, pour CE moment. je pleure`, `bague numéro ${p.rings} 💍 cette équipe restera gravée à jamais`] },
          { name: rival.name, handle: rival.style, icon: "flame",
            text: rival.heat >= 55
              ? [`Titre mérité. On se retrouvera l'an prochain, ${firstName}.`, `Chapeau ${firstName}. Cette fois c'est vous. La prochaine, c'est nous.`, `Respect pour cette série, ${firstName}. Le duel continue la saison prochaine.`]
              : [`Bravo, c'était la meilleure équipe cette année. Respect.`, `Bien mérité. Une saison sans faille de leur part.`, `Rien à redire, ils ont dominé du premier au dernier match.`] },
        ],
      }),
    });
    p.morale = 100; p.fame = ENG.clamp(p.fame + 12, 0, 100); p.rep = ENG.clamp(p.rep + 10, 0, 100);
  } else {
    const roundName = DATA.ROUND_NAMES[reached] || "Playoffs";
    beat({
      kind: reached >= 2 ? "wire" : "bad", tag: "Playoffs", src: ENG.R.pick(DATA.MEDIA),
      head: po.madeFinals ? "Battu en finale" : `Éliminé en ${roundName.toLowerCase()}`,
      body: `${teamOf(p.team).full} s'incline ${out ? out.score.split("-").reverse().join("–") : ""} face à ${out ? teamOf(out.winner).full : "son adversaire"}. ${ENG.name(p)} aura tourné à ${poLine.ppg.toFixed(1).replace(".", ",")} points en séries.`,
    });
    if (po.madeFinals) award("Finaliste", "🥈", "");
    p.morale = ENG.clamp(p.morale + (reached >= 2 ? 4 : -6), 5, 100);
    p.fame = ENG.clamp(p.fame + reached * 2, 0, 100);
  }
  setActionEnabled(true);
};

/* ─── étape : progression ─── */

STEPS.grow = function () {
  const p = S.p;

  /* hors carrière pro il n'y a pas d'étape d'intersaison :
     le corps récupère ici, sinon la forme s'effondre définitivement */
  if (S.phase !== "pro") {
    p.form = ENG.clamp(p.form + ENG.R.i(10, 22), 0, 100);
    p.health = ENG.clamp(p.health + ENG.R.i(12, 26), 0, 100);
  }

  const before = ENG.ovr(p);
  const potUp = ENG.growPotential(p, { focused: !!S.focus, season: S.lastSeason });
  ENG.progress(p, { focus: S.focus || [], season: S.lastSeason });
  S.focus = null;
  const after = ENG.ovr(p);

  const gained = ENG.evalBadges(p);
  p.age++;
  S.calendar.year++;
  S.calendar.label = "Saison " + S.calendar.year;
  S.stageYear++;

  const pills = [{ t: (after >= before ? "+" : "") + (after - before) + " OVR → " + after, k: after >= before ? "up" : "down" }];
  if (potUp) pills.push({ t: "+" + potUp + " plafond → " + p.potential, k: "star" });
  gained.slice(0, 4).forEach((g) => pills.push({ t: g.b.i + " " + g.b.n, k: "star" }));

  const bodyParts = [];
  if (potUp) bodyParts.push(`Ton plafond estimé monte à ${p.potential} : le travail a repoussé la limite.`);
  bodyParts.push(gained.length
    ? `${gained.length} badge(s) débloqué(s) ou améliorés cette saison.`
    : "Aucun nouveau badge cette saison.");

  beat({
    kind: potUp || gained.length ? "good" : "wire", tag: "Développement", src: "Rapport du staff",
    head: after > before ? `Progression : ${before} → ${after}` : after < before ? `Déclin : ${before} → ${after}` : `Évaluation stable à ${after}`,
    body: bodyParts.join(" "),
    pills,
  });

  /* équipementier */
  if (S.phase === "pro" && (!p.shoe || p.shoe.tier === 0 || S.calendar.year >= (p.shoeUntil || 0))) {
    const offer = ENG.shoeOffer(p, S.L);
    if (offer && offer.shoe.tier > (p.shoe ? p.shoe.tier : 0)) {
      p.shoe = offer.shoe;
      p.shoeAnnual = offer.amount;
      p.shoeUntil = S.calendar.year + offer.years;
      beat({ kind: "money", tag: "Sponsoring", src: "Marché de l'équipement",
             head: `${offer.shoe.n} signe ${ENG.name(p)}`,
             body: `Contrat de ${offer.years} ans à ${ENG.money(offer.amount)} par an.`,
             pills: [{ t: "+" + ENG.money(offer.amount) + "/an", k: "up" }] });
      if (offer.shoe.tier === 5) award("Chaussure signature", "👟", "major");
    }
  }
  setActionEnabled(true);
};

/* ─── étape : lycée ─── */

STEPS.hsCheck = function () {
  if (S.stageYear <= 3) { setActionEnabled(true); return; }
  const p = S.p;
  const stock = ENG.draftStock(p, { lastSeason: S.lastSeason });

  const choices = [
    { h: "Université", d: DATA.COLLEGES[0].style, t: "Progression et exposition maximales",
      pick: () => {
        const eligible = DATA.COLLEGES.filter((c) => c.prestige <= 40 + p.rep * 1.1);
        const col = eligible.length ? ENG.R.pick(eligible.slice(0, 4)) : DATA.COLLEGES[DATA.COLLEGES.length - 1];
        p.college = col.name;
        S.phase = "ncaa"; S.stageYear = 1;
        beat({ kind: "good", tag: "Orientation", src: "Journée de signature",
               head: `${ENG.name(p)} s'engage avec ${col.name}`,
               body: col.style });
        setActionEnabled(true);
      } },
    { h: "Académie professionnelle", d: "Une saison rémunérée dans une structure pro avant la draft.", t: "Argent immédiat, une seule saison",
      pick: () => {
        S.phase = "prep"; S.stageYear = 1;
        p.money += 125000;
        beat({ kind: "money", tag: "Orientation", src: "Le Fil NBA",
               head: `${ENG.name(p)} rejoint une académie professionnelle`,
               body: "Un an de contrat, un vrai vestiaire, et la draft au bout." });
        setActionEnabled(true);
      } },
  ];

  if (stock > 72) {
    choices.push({ h: "Draft immédiate", d: "Se déclarer dès maintenant.", t: "Risqué : ton profil est encore jeune",
      pick: () => { S.phase = "draft"; runDraft(); } });
  }

  ask({ kicker: "Orientation", head: "Le lycée est terminé",
        body: `Trois ans de lycée derrière toi. Ta cote actuelle situe ton profil autour de ${Math.round(stock)}. Quelle route prends-tu ?`,
        choices });
};

/* ─── étape : université ─── */

STEPS.ncaaCheck = function () {
  const p = S.p;
  if (S.stageYear > 4) { S.phase = "draft"; runDraft(); return; }
  const stock = ENG.draftStock(p, { lastSeason: S.lastSeason });
  const proj = stock > 84 ? "dans le top 5" : stock > 78 ? "en fin de loterie" : stock > 72 ? "au premier tour" : stock > 66 ? "au second tour" : "hors des soixante";

  ask({
    kicker: "Draft", head: "Se déclarer, ou rester ?",
    body: `Les projections te situent ${proj}. Une saison de plus peut tout changer — dans un sens comme dans l'autre.`,
    choices: [
      { h: "Rester une saison de plus", d: "Progresser, gagner, faire monter la cote.", t: "Plus de développement",
        pick: () => { beat({ kind: "wire", tag: "Draft", src: ENG.R.pick(DATA.MEDIA), head: `${ENG.name(p)} reste à ${p.college}`, body: "Une année de plus pour construire un dossier solide." }); setActionEnabled(true); } },
      { h: "Me déclarer à la draft", d: "L'horloge du contrat rookie commence à tourner.", t: "Passage chez les pros",
        pick: () => { S.phase = "draft"; runDraft(); } },
    ],
  });
};

STEPS.toDraft = function () { S.phase = "draft"; runDraft(); };

/* ─── la draft ─── */

function runDraft() {
  const p = S.p;
  const res = ENG.runDraft(p, { lastSeason: S.lastSeason });

  /* combine */
  const vert = Math.round(60 + (p.attrs.athleticism - 50) * 0.55);
  beat({
    kind: "wire", tag: "Combine", src: "Le Fil NBA",
    head: "Mesures officielles",
    body: `${p.height} cm pieds nus, ${p.wingspan} cm d'envergure, ${vert} cm de détente sèche. Les équipes ont les chiffres, il reste les entretiens.`,
  });

  S.phase = "pro"; S.stageYear = 1;
  const cap = S.L.cap;

  if (res.undrafted) {
    const t = ENG.R.pick(DATA.TEAMS);
    p.team = t.id;
    p.draft = { pick: null, year: S.calendar.year };
    p.salary = ENG.rookieScale(null, cap);
    p.contract = { salary: p.salary, years: 2, total: 2, kind: "Contrat two-way" };
    beat({
      kind: "bad", tag: "Draft " + S.calendar.year, src: "Le Fil NBA",
      head: "Non drafté",
      body: `Les soixante noms sont tombés, le tien n'y était pas. ${t.full} t'offre un contrat two-way : le camp d'entraînement, et rien de garanti.`,
    });
    p.morale = ENG.clamp(p.morale - 16, 5, 100);
  } else {
    const t = ENG.draftTeam(S.L, res.pick);
    p.team = t.id;
    p.draft = { pick: res.pick, year: S.calendar.year };
    p.salary = ENG.rookieScale(res.pick, cap);
    const yrs = res.pick <= 30 ? 4 : 3;
    p.contract = { salary: p.salary, years: yrs, total: yrs, kind: res.pick <= 30 ? "Contrat rookie (1er tour)" : "Contrat rookie (2e tour)" };
    p.rep = ENG.clamp(p.rep + Math.max(0, 34 - res.pick), 0, 100);
    p.fame = ENG.clamp(p.fame + Math.max(0, 22 - res.pick * 0.6), 0, 100);

    beat({
      kind: res.pick <= 5 ? "epic" : "good", tag: "Draft " + S.calendar.year,
      teaser: "Le commissioner s'avance vers le micro…",
      poster: { emblem: res.pick === 1 ? "🥇" : res.pick <= 5 ? "⭐" : "🏀" },
      head: `${res.pick}ᵉ choix — ${t.full}`,
      body: `${ENG.name(p)} est sélectionné en ${res.pick}ᵉ position par ${t.full}. Contrat rookie de ${yrs} ans à ${ENG.money(p.salary)} par an.`,
      pills: [{ t: "Pick #" + res.pick, k: "star" }, { t: ENG.money(p.salary) + "/an", k: "up" }],
    });
    if (res.pick === 1) award("Premier choix de draft", "🥇", "major");
    p.morale = ENG.clamp(p.morale + 18, 5, 100);
  }

  const fam = S.cast.family.parent;
  const draftedTeam = teamOf(p.team).full;
  beat({
    kind: "wire", tag: "Ton monde", src: "Messages",
    teaser: "Ton téléphone n'arrête plus de vibrer…",
    box: smsCard({
      from: fam.name, sub: fam.role, icon: "heart",
      text: res.undrafted
        ? [
            "Je sais que c'est pas la soirée que tu voulais. Mais un two-way c'est une porte, pas une fin. On est fiers de toi, quoi qu'il arrive.",
            "Le téléphone n'a pas sonné ce soir, je sais. Mais je te connais, tu vas leur prouver qu'ils ont eu tort. On est là.",
            "Soixante noms et pas le tien, ça fait mal, je le vois. Mais rien n'est fini. On croit en toi à fond.",
          ]
        : res.pick <= 5
        ? [
            `JE HURLE 😭 Toute la famille est devant la télé là. ${draftedTeam}, ${res.pick}ᵉ choix, tu te rends compte ?? On arrive te voir jouer dès que possible.`,
            `Ton nom à l'écran, ${res.pick}ᵉ, ${draftedTeam}... j'ai les larmes aux yeux là. Tout ce travail, enfin récompensé. On est SI fiers.`,
            `Le salon entier a explosé quand ils ont annoncé ton nom. ${res.pick}ᵉ choix par ${draftedTeam} !! On rapplique dès que possible, promis.`,
          ]
        : [
            `Ça y est, c'est officiel ! ${draftedTeam}. Fier de toi, tu l'as mérité. Appelle-nous quand t'as une minute.`,
            `${draftedTeam}, te voilà. On a suivi ça en direct, on n'a pas raté une seconde. Bravo, tu l'as fait.`,
            `C'est acté : ${draftedTeam} t'a choisi. Après tout ce chemin... on savait que ce jour arriverait. Profite à fond ce soir.`,
          ],
    }),
  });

  S.teamsSeen = [p.team];
  p.career.teamsPlayed = 1;
  p.career.yearsSameTeam = 0;
  S.queue = [];
  setActionEnabled(true);
}

/* ─── étape : contrat / fin de saison pro ─── */

STEPS.contract = function () {
  const p = S.p;
  const c = p.contract;

  /* suivi franchise */
  p.career.yearsSameTeam++;
  if (S.teamsSeen.indexOf(p.team) === -1) { S.teamsSeen.push(p.team); }
  p.career.teamsPlayed = S.teamsSeen.length;

  /* transfert demandé ou subi */
  if (S.pending === "traded" || S.pending === "tradeRequest" || S.pending === "ringChase") {
    const pool = DATA.TEAMS.filter((t) => t.id !== p.team);
    let dest;
    if (S.pending === "ringChase") {
      dest = pool.slice().sort((a, b) => S.L.teams[b.id].cast - S.L.teams[a.id].cast)[ENG.R.i(0, 4)];
    } else dest = ENG.R.pick(pool);
    p.team = dest.id;
    CAST.rotateTeam(S.cast, p, false);
    p.career.yearsSameTeam = 0;
    if (S.teamsSeen.indexOf(dest.id) === -1) S.teamsSeen.push(dest.id);
    p.career.teamsPlayed = S.teamsSeen.length;
    beat({ kind: "wire", tag: "Transfert", src: "Le Fil NBA",
           head: `${ENG.name(p)} rejoint ${dest.full}`,
           body: "L'échange est officialisé pendant l'intersaison." });
    beat({
      kind: "wire", tag: "Ton monde", src: "Messages",
      teaser: "Ton agent essaie de te joindre…",
      box: smsCard({
        from: S.cast.agent.name, sub: "ton agent", icon: "briefcase",
        text: [
          `C'est fait, c'est officiel. ${dest.full} t'attend. On en parle dès que tu veux, mais globalement c'est une bonne nouvelle pour la suite.`,
          `Voilà, le dossier est bouclé. Direction ${dest.full}. Prends le temps d'encaisser, on débriefe bientôt.`,
          `${dest.full}, signé. Je sais que c'est un changement, mais je pense sincèrement que c'est le bon move pour la suite.`,
        ],
      }),
    });
    S.pending = null;
  }

  if (c) c.years--;

  /* retraite ? */
  const ovr = ENG.ovr(p);
  if (p.age >= 41 || ovr < 42) { return retire(ovr < 42 ? "corps" : "âge"); }

  if (p.age >= 33 || (ovr < 55 && p.career.seasons > 6)) {
    ask({
      kicker: "Carrière", head: "Encore une saison ?",
      body: `${p.age} ans, ${p.career.seasons} saisons professionnelles, une évaluation à ${ovr}. Le corps te demande une réponse.`,
      choices: [
        { h: "Continuer", d: "Il reste quelque chose à aller chercher.", t: "Une saison de plus",
          pick: () => { beat({ kind: "wire", tag: "Carrière", src: ENG.R.pick(DATA.MEDIA), head: `${ENG.name(p)} sera là la saison prochaine`, body: "La retraite attendra." }); afterContract(); } },
        { h: "Prendre ma retraite", d: "Partir en choisissant le moment.", t: "Fin de carrière",
          pick: () => retire("choix") },
      ],
    });
    return;
  }
  afterContract();
};

function afterContract() {
  const p = S.p, c = p.contract;
  if (c && c.years > 0) { setActionEnabled(true); return; }

  /* agence libre */
  const mv = ENG.marketValue(p, S.L);
  const cur = teamOf(p.team);
  const contenders = DATA.TEAMS.filter((t) => t.id !== p.team)
    .sort((a, b) => S.L.teams[b.id].cast - S.L.teams[a.id].cast);

  const mkOffer = (t, mult, yrs, note) => ({
    t, salary: Math.round(mv * mult), years: yrs, note,
  });

  const offers = [
    mkOffer(cur, 1.12, ENG.R.i(3, 5), "Droits Bird : ta franchise peut aller plus haut que les autres."),
    mkOffer(contenders[ENG.R.i(0, 3)], 0.88, ENG.R.i(2, 4), "Une équipe qui joue le titre dès l'an prochain."),
    mkOffer(contenders[ENG.R.i(4, 14)], 1.0, ENG.R.i(3, 4), "Projet intermédiaire, rôle central promis."),
    mkOffer(contenders[contenders.length - 1 - ENG.R.i(0, 4)], 1.22, ENG.R.i(4, 5), "Franchise en reconstruction, prête à surpayer."),
  ];

  ask({
    kicker: "Agence libre " + S.calendar.year,
    head: "Ton contrat arrive à échéance",
    body: `Valeur estimée sur le marché : ${ENG.money(mv)} par an. Quatre offres sur la table.`,
    choices: offers.map((o) => ({
      h: `${o.t.full} — ${ENG.money(o.salary)}/an`,
      d: o.note,
      t: `${o.years} ans · ${ENG.money(o.salary * o.years)} au total`,
      pick: () => {
        const moved = o.t.id !== p.team;
        p.team = o.t.id;
        if (moved) CAST.rotateTeam(S.cast, p, false);
        p.salary = o.salary;
        p.contract = { salary: o.salary, years: o.years, total: o.years, kind: moved ? "Agent libre" : "Prolongation" };
        if (moved) {
          p.career.yearsSameTeam = 0;
          if (S.teamsSeen.indexOf(o.t.id) === -1) S.teamsSeen.push(o.t.id);
          p.career.teamsPlayed = S.teamsSeen.length;
        }
        beat({
          kind: "money", tag: "Agence libre", src: "Le Fil NBA",
          head: `${ENG.name(p)} signe ${o.years} ans à ${o.t.full}`,
          body: `Un contrat de ${ENG.money(o.salary * o.years)} au total, soit ${ENG.money(o.salary)} par saison.`,
          pills: [{ t: ENG.money(o.salary) + "/an", k: "up" }, { t: o.years + " ans", k: "" }],
        });
        beat({
          kind: "wire", tag: "Ton monde", src: "Messages",
          teaser: "Un message arrive…",
          box: smsCard({
            from: S.cast.agent.name, sub: "ton agent", icon: "briefcase",
            text: moved
              ? [
                  `Signé, cacheté ! ${ENG.money(o.salary)} par an sur ${o.years} ans. Je t'envoie les détails du contrat ce soir, mais tu peux souffler.`,
                  `C'est dans la boîte. ${ENG.money(o.salary)}/an, ${o.years} ans. On a fait du bon boulot sur ce dossier, profite du moment.`,
                  `Fini les négociations, tout est signé. ${o.years} ans à ${ENG.money(o.salary)} par saison. Repose-toi, tu l'as gagné.`,
                ]
              : [
                  `On reste à la maison, et à ce prix-là. Bon travail, tu as fait le bon choix.`,
                  `Prolongation bouclée. Rester ici avait du sens, et le montant le confirme.`,
                  `Voilà, c'est signé, tu restes. Parfois la meilleure décision c'est de ne rien changer.`,
                ],
          }),
        });
        setActionEnabled(true);
      },
    })),
  });
}

/* ═══════════════ RETRAITE ═══════════════ */

function retire(reason) {
  const p = S.p;
  S.phase = "retired";
  S.queue = [];

  const txt = reason === "corps"
    ? "Le corps a rendu les armes avant la tête."
    : reason === "âge" ? "Quarante et un ans. Il fallait bien s'arrêter un jour."
    : "Tu pars au moment que tu as choisi, sous une ovation debout.";

  beat({ kind: "epic", tag: "Fin de parcours",
         teaser: "Une dernière fois, il repose le ballon…",
         poster: { emblem: "🎬" },
         head: `${ENG.name(p)} raccroche`,
         body: txt });

  /* mode rivalité : ce joueur sort, les autres continuent */
  if (S.mp && S.mp.on && S.mp.players.length > 1) {
    S.mp.players[S.mp.turn].retired = true;
    S.mp.players[S.mp.turn].p = p;
    S.mp.players[S.mp.turn].snap = mpSnapshot();
    mpSyncGhost(S.mp.turn);
    addToPantheon({
      name: ENG.name(p), score: ENG.careerScore(p), seasons: p.career.seasons,
      ppg: p.career.gp ? Math.round((p.career.pts / p.career.gp) * 10) / 10 : 0,
      rings: p.rings, mvp: p.career.mvp, rank: ENG.goatBoard(p).rank,
      pos: p.position, year: S.calendar.year,
    });
    if (mpAliveCount() === 0) { setTimeout(mpFinalBoard, 400); return; }
    beat({ kind: "wire", tag: "Mode rivalité", src: "Parquet",
           head: "Carrière terminée",
           body: `${ENG.name(p)} raccroche. ${mpAliveCount()} joueur(s) encore en activité.` });
    setTimeout(mpEndTurn, 400);
    return;
  }

  const score = ENG.careerScore(p);
  META.endCareer(p, score);
  const goat = ENG.goatBoard(p);
  addToPantheon({
    name: ENG.name(p), score, seasons: p.career.seasons,
    ppg: p.career.gp ? Math.round((p.career.pts / p.career.gp) * 10) / 10 : 0,
    rings: p.rings, mvp: p.career.mvp, rank: goat.rank,
    pos: p.position, year: S.calendar.year,
  });

  wipe();
  setTimeout(() => showEnd(score, goat), 420);
}

function showEnd(score, goat) {
  const p = S.p, c = p.career;
  const v = ENG.verdict(score, p);
  const shell = $("end-shell");
  shell.innerHTML = "";

  const per = (x) => (c.gp ? (x / c.gp).toFixed(1).replace(".", ",") : "0,0");

  const hero = el("div", "end-hero");
  hero.innerHTML = `
    <div class="end-verdict">${v.t}</div>
    <div class="end-name">${ENG.name(p)} · ${DATA.POSITIONS.find((x) => x.id === p.position).label} · ${c.seasons} saisons</div>
    <div class="end-score">${score}<sup>/100</sup></div>
    <div class="end-score-lbl">Score de carrière</div>
    <div class="end-rank">${v.d}<br><br>Classé <b>${goat.rank}<sup>e</sup></b> de tous les temps.</div>`;
  shell.appendChild(hero);

  const grid = el("div", "end-grid");
  [["PTS", per(c.pts)], ["REB", per(c.reb)], ["PD", per(c.ast)], ["Matchs", c.gp],
   ["Bagues", p.rings], ["MVP", c.mvp], ["All-Star", c.allStar], ["Badges", ENG.badgeCount(p)],
   ["Fortune", ENG.money(p.money)]]
    .forEach(([l, val]) => {
      const cell = el("div", "end-cell");
      cell.appendChild(el("b", null, val));
      cell.appendChild(el("span", null, l));
      grid.appendChild(cell);
    });
  shell.appendChild(grid);

  /* palmarès */
  const tro = el("div", "end-sect");
  tro.appendChild(el("h3", null, "Palmarès"));
  const list = el("div", "end-list");
  if (!p.trophies.length) list.appendChild(el("div", "empty-note", "Aucune distinction majeure."));
  else {
    const counts = {};
    p.trophies.forEach((t) => { counts[t.name] = counts[t.name] || { n: 0, icon: t.icon, cls: t.cls }; counts[t.name].n++; });
    Object.entries(counts).sort((a, b) => b[1].n - a[1].n).forEach(([name, d]) => {
      const row = el("div", "trophy " + (d.cls || ""));
      row.appendChild(el("span", null, d.icon));
      row.appendChild(el("span", null, name));
      row.appendChild(el("b", null, "×" + d.n));
      list.appendChild(row);
    });
  }
  tro.appendChild(list);
  shell.appendChild(tro);

  /* discours */
  const sp = el("div", "end-sect");
  sp.appendChild(el("h3", null, "Discours d'adieu"));
  const origin = DATA.ORIGINS.find((o) => o.id === p.origin);
  const speech = el("div", "end-speech");
  speech.textContent = `« J'ai commencé ${origin.label.toLowerCase()}, à seize ans, sans savoir si tout ça mènerait quelque part. ${c.seasons} saisons plus tard, ${p.rings > 0 ? `${p.rings} bague${p.rings > 1 ? "s" : ""} au doigt` : "sans bague au doigt"}, ${c.gp} matchs dans les jambes et ${ENG.money(c.pts * 0 + p.money)} sur le compte, je peux dire une chose : le parquet ne ment jamais. Merci. »`;
  sp.appendChild(speech);
  shell.appendChild(sp);

  /* classement all-time */
  const gt = el("div", "end-sect");
  gt.appendChild(el("h3", null, "Panthéon de tous les temps"));
  const gl = el("div", "rank-body");
  const start = Math.max(0, goat.rank - 4);
  goat.board.slice(start, start + 8).forEach((x, i) => {
    const r = el("div", "rank" + (x.me ? " me" : ""));
    r.appendChild(el("span", "rank-i", start + i + 1));
    r.appendChild(el("span", "rank-n", x.n));
    r.appendChild(el("span", "rank-v", x.s));
    gl.appendChild(r);
  });
  gt.appendChild(gl);
  shell.appendChild(gt);

  const again = el("button", "btn btn-accent btn-block", "Nouvelle carrière");
  again.style.padding = "15px";
  again.onclick = () => { S = null; boot(); };
  shell.appendChild(again);

  const pan = el("button", "btn btn-quiet btn-block", "Voir le Panthéon");
  pan.onclick = showPantheon;
  shell.appendChild(pan);

  show("screen-end");
}

/* ═══════════════ PANTHÉON ═══════════════ */

function showPantheon() {
  const box = $("pantheon-body");
  box.innerHTML = "";
  const list = pantheon();
  if (!list.length) {
    box.appendChild(el("div", "empty-note", "Aucune carrière achevée pour l'instant. Termine une carrière pour y entrer."));
  } else {
    list.forEach((c) => {
      const row = el("div", "pan-row");
      row.appendChild(el("div", "pan-score", c.score));
      const mid = el("div");
      mid.appendChild(el("div", "pan-name", c.name));
      mid.appendChild(el("div", "pan-sub",
        `${c.seasons} saisons · ${String(c.ppg).replace(".", ",")} pts/m · ${c.rank}ᵉ de tous les temps`));
      row.appendChild(mid);
      const tags = el("div", "pan-tags");
      if (c.rings) tags.appendChild(el("span", "pill star", "💍 " + c.rings));
      if (c.mvp) tags.appendChild(el("span", "pill star", "🏆 " + c.mvp));
      row.appendChild(tags);
      box.appendChild(row);
    });
  }
  show("screen-pantheon");
}

/* ═══════════════ CRÉATION ═══════════════ */

let W = null;

const FIRSTS = ["Amara", "Noah", "Elias", "Ilyan", "Marcus", "Théo", "Kylian", "Sacha", "Jonas", "Léo", "Ayo", "Nael"];
const LASTS = ["Diallo", "Bennani", "Okonkwo", "Marchand", "Vasquez", "Petrović", "Lindqvist", "Sylla", "Rousseau", "Ferrand"];

/* Sous-ensembles tirés une fois par création : biaisés vers ce que
   ce joueur n'a jamais choisi, pour que deux parties ne proposent pas
   les mêmes cartes. */
function buildSubsets() {
  return {
    origins: META.mixSubset(DATA.ORIGINS, 6, "origin", (x) => x.id),
    mentalities: META.mixSubset(DATA.MENTALITIES, 5, "mentality", (x) => x.id),
    entourages: META.mixSubset(DATA.ENTOURAGES, 5, "entourage", (x) => x.id),
  };
}

/* ─────────── recherche de nationalité ───────────
   132 pays, cherchables par nom ou par code. Les six nations les plus
   écrites s'affichent par défaut, tout le reste du monde reste à un
   clavier de distance. La saisie ne redessine que la liste de
   résultats — jamais tout le pas, pour ne pas perdre le focus. */
function normText(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function buildNationSearch(b) {
  const wrap = el("div", "field");
  wrap.appendChild(el("span", null, `Nationalité — ${DATA.NATIONS.length} pays`));
  const inp = el("input");
  inp.type = "text";
  inp.placeholder = "Rechercher un pays… (ex : Brésil, JP, Sénégal)";
  inp.value = W._natQuery || "";
  wrap.appendChild(inp);
  b.appendChild(wrap);

  const results = el("div", "nat-results");
  b.appendChild(results);

  const renderResults = () => {
    results.innerHTML = "";
    const q = normText(inp.value.trim());
    let items;
    if (!q) items = DATA.NATIONS.filter((n) => n.major);
    else items = DATA.NATIONS.filter((n) => normText(n.label).includes(q) || n.id.toLowerCase() === q);

    if (!items.length) {
      results.appendChild(el("div", "nat-empty", "Aucun pays ne correspond à cette recherche."));
      return;
    }
    items.slice(0, 60).forEach((n) => {
      const row = el("button", "nat-row" + (W.cfg.nation === n.id ? " on" : ""));
      row.type = "button";
      row.appendChild(el("span", "nat-flag", n.flag));
      const mid = el("span", "nat-mid");
      mid.appendChild(el("span", "nat-label", n.label));
      mid.appendChild(el("span", "nat-note", n.note));
      row.appendChild(mid);
      row.onclick = () => { W.cfg.nation = n.id; W._natQuery = inp.value; drawStep(); };
      results.appendChild(row);
    });
    if (!q && DATA.NATIONS.length > items.length) {
      const more = el("div", "nat-empty", "Tape le nom d'un pays pour chercher parmi les " + DATA.NATIONS.length + ".");
      results.appendChild(more);
    }
  };

  inp.oninput = renderResults;
  renderResults();

  if (W.cfg.nation) {
    const n = DATA.NATIONS.find((x) => x.id === W.cfg.nation);
    if (n) {
      const chip = el("div", "nat-chip");
      chip.appendChild(el("span", null, n.flag + " " + n.label + " sélectionné"));
      chip.appendChild(el("span", null, n.note));
      b.appendChild(chip);
    }
  }
}

function startCreate() {
  W = {
    step: 0,
    subsets: buildSubsets(),
    cfg: {
      first: ENG.R.pick(FIRSTS), last: ENG.R.pick(LASTS),
      nation: "FR", position: null, height: null, wingspan: null,
      number: ENG.R.i(0, 35), origin: null, mentality: null, entourage: null,
    },
  };
  show("screen-create");
  drawStep();
}

const STEP_COUNT = 6;

function drawStep() {
  const steps = $("create-steps");
  steps.innerHTML = "";
  for (let i = 0; i < STEP_COUNT; i++) {
    steps.appendChild(el("i", i < W.step ? "done" : i === W.step ? "now" : ""));
  }

  const b = $("create-body");
  b.innerHTML = "";
  const f = $("create-foot");
  f.innerHTML = "";

  const title = (t, s) => {
    b.appendChild(el("h1", "create-title", t));
    b.appendChild(el("p", "create-sub", s));
  };

  const optGrid = (items, cols, sel, onPick) => {
    const g = el("div", "opts cols-" + cols);
    items.forEach((it) => {
      const o = el("button", "opt" + (sel === it.id ? " on" : ""));
      o.type = "button";
      const h = el("div", "opt-h");
      h.appendChild(el("span", null, it.label));
      if (it.em) h.appendChild(el("em", null, it.em));
      o.appendChild(h);
      if (it.desc) o.appendChild(el("div", "opt-d", it.desc));
      if (it.tag) o.appendChild(el("div", "opt-t", it.tag));
      o.onclick = () => { onPick(it.id); drawStep(); };
      g.appendChild(o);
    });
    b.appendChild(g);
    return g;
  };

  const nextBtn = (label, ok) => {
    const btn = el("button", "btn btn-accent", label);
    btn.disabled = !ok;
    btn.style.opacity = ok ? 1 : .45;
    btn.onclick = () => { if (!ok) return; W.step++; W.step >= STEP_COUNT ? finishCreate() : drawStep(); };
    f.appendChild(btn);
  };

  switch (W.step) {
    case 0: {
      title("Qui es-tu ?", "Un nom, un drapeau, un numéro. Le reste s'écrira sur le terrain.");
      const row = el("div", "field-row");
      [["first", "Prénom"], ["last", "Nom"]].forEach(([k, l]) => {
        const fl = el("label", "field");
        fl.appendChild(el("span", null, l));
        const inp = el("input");
        inp.type = "text"; inp.maxLength = 18; inp.value = W.cfg[k];
        inp.oninput = () => { W.cfg[k] = inp.value; };
        fl.appendChild(inp);
        row.appendChild(fl);
      });
      b.appendChild(row);

      const nf = el("label", "field");
      nf.appendChild(el("span", null, "Numéro de maillot (0–99)"));
      const ni = el("input");
      ni.type = "number"; ni.min = 0; ni.max = 99; ni.value = W.cfg.number;
      ni.oninput = () => { W.cfg.number = ENG.clamp(parseInt(ni.value || "0", 10), 0, 99); };
      nf.appendChild(ni);
      b.appendChild(nf);

      buildNationSearch(b);

      nextBtn("Continuer", W.cfg.first.trim() && W.cfg.last.trim() && W.cfg.nation);
      break;
    }
    case 1: {
      title("Ton poste", "Il décide de ce qu'on attendra de toi pendant vingt ans.");
      optGrid(DATA.POSITIONS.map((p) => ({ id: p.id, label: p.label, em: p.short, desc: p.desc, tag: `${p.hMin}–${p.hMax} cm` })),
        2, W.cfg.position, (id) => {
          W.cfg.position = id;
          const pos = DATA.POSITIONS.find((x) => x.id === id);
          W.cfg.height = Math.round((pos.hMin + pos.hMax) / 2);
          W.cfg.wingspan = W.cfg.height + 6;
        });
      nextBtn("Continuer", !!W.cfg.position);
      break;
    }
    case 2: {
      const pos = DATA.POSITIONS.find((x) => x.id === W.cfg.position);
      title("Ton gabarit", "Chaque centimètre déplace ton jeu vers la raquette ou vers le périmètre.");

      const mk = (label, key, min, max, suffix) => {
        const fl = el("label", "field");
        const sp = el("span");
        sp.textContent = label;
        fl.appendChild(sp);
        const inp = el("input");
        inp.type = "range"; inp.min = min; inp.max = max; inp.value = W.cfg[key];
        const upd = () => {
          W.cfg[key] = parseInt(inp.value, 10);
          sp.textContent = `${label} — ${W.cfg[key]} ${suffix}`;
          if (key === "height") {
            const wsIn = $("ws-input");
            if (wsIn) { wsIn.min = W.cfg.height - 2; wsIn.max = W.cfg.height + 22; }
            if (W.cfg.wingspan < W.cfg.height - 2) W.cfg.wingspan = W.cfg.height - 2;
          }
          drawHint();
        };
        inp.oninput = upd;
        if (key === "wingspan") inp.id = "ws-input";
        fl.appendChild(inp);
        b.appendChild(fl);
        upd();
      };

      mk("Taille", "height", pos.hMin - 4, pos.hMax + 4, "cm");
      mk("Envergure", "wingspan", W.cfg.height - 2, W.cfg.height + 22, "cm");

      const hint = el("div", "opt-t");
      hint.id = "gab-hint";
      b.appendChild(hint);

      function drawHint() {
        const h = $("gab-hint");
        if (!h) return;
        const d = W.cfg.height - (pos.hMin + pos.hMax) / 2;
        const w = W.cfg.wingspan - W.cfg.height;
        const parts = [];
        parts.push(d > 3 ? "Grand pour le poste : rebond et protection du cercle, moins de vitesse balle en main."
                 : d < -3 ? "Petit pour le poste : dribble et explosivité, la raquette sera plus dure."
                 : "Gabarit standard pour le poste.");
        parts.push(w >= 14 ? "Envergure exceptionnelle : interceptions et contres." : w >= 7 ? "Bonne envergure." : "Envergure courte.");
        h.textContent = parts.join(" ");
      }
      drawHint();
      nextBtn("Continuer", true);
      break;
    }
    case 3: {
      title("D'où tu viens", "Le point de départ fixe tes forces et ton plafond.");
      optGrid(W.subsets.origins.map((o) => ({ id: o.id, label: o.label, desc: o.desc, tag: o.tag })),
        2, W.cfg.origin, (id) => { W.cfg.origin = id; });
      nextBtn("Continuer", !!W.cfg.origin);
      break;
    }
    case 4: {
      title("Ta mentalité", "Ce qui te fait tenir quand la salle siffle ton nom.");
      optGrid(W.subsets.mentalities.map((m) => ({ id: m.id, label: m.label, desc: m.desc, tag: m.tag })),
        2, W.cfg.mentality, (id) => { W.cfg.mentality = id; });
      nextBtn("Continuer", !!W.cfg.mentality);
      break;
    }
    case 5: {
      title("Ton entourage", "Personne ne fait carrière seul. Même ceux qui le prétendent.");
      optGrid(W.subsets.entourages.map((e) => ({ id: e.id, label: e.label, desc: e.desc, tag: e.tag })),
        2, W.cfg.entourage, (id) => { W.cfg.entourage = id; });
      nextBtn("Commencer la carrière", !!W.cfg.entourage);
      break;
    }
  }

  if (W.step > 0) {
    const back = el("button", "btn btn-quiet", "Retour");
    back.onclick = () => { W.step--; drawStep(); };
    f.insertBefore(back, f.firstChild);
  }
}

function finishCreate() {
  const p = ENG.newPlayer(W.cfg);
  p.rel = CAST.newRel();
  META.startCareer(p);
  const L = (S && S.mp && S.mp.on && S.L) ? S.L : ENG.newLeague();
  if (!(S && S.mp && S.mp.on && S.L)) ENG.rollLeague(L);
  const mp = S && S.mp ? S.mp : null;

  S = {
    p, L, cast: CAST.make(p),
    phase: "hs", stageYear: 1,
    calendar: { year: 2026, label: "Saison 2026" },
    queue: [], recent: [], log: [], teamsSeen: [],
    focus: null, pending: null,
    lastSeason: null, lastAwards: null, lastStandings: null, madePlayoffs: false,
    mp,
  };

  show("screen-game");
  $("feed").innerHTML = "";

  const origin = DATA.ORIGINS.find((o) => o.id === p.origin);
  const cs = S.cast;
  beat({
    kind: "epic", tag: "Début", src: "Parquet",
    head: `${ENG.name(p)}, ${p.age} ans`,
    body: `${origin.desc} Évaluation de départ : ${ENG.ovr(p)}. Trois saisons de lycée pour convaincre quelqu'un que tu vaux le déplacement.`,
    pills: [
      { t: "OVR " + ENG.ovr(p), k: "" },
      { t: "Plafond estimé " + Math.round(p.potential / 5) * 5, k: "star" },
      { t: p.height + " cm", k: "" },
    ],
  });
  beat({
    kind: "wire", tag: "Ton monde", src: cs.journo.outlet,
    head: "Ceux qui vont compter",
    body: `${cs.coach.name}, ${cs.coach.style.label}, dirige ta salle — ${cs.coach.style.trait} ` +
          `${cs.family.parent.name} est ${cs.family.parent.role}. ` +
          `${cs.journo.name} couvre ta génération pour ${cs.journo.outlet}, et il est ${cs.journo.stance.label}. ` +
          `Quelque part, ${cs.rivals[0].name}, ${cs.rivals[0].style}, a le même âge que toi et le même objectif.`,
  });

  queueSeason();
  render();
  labelAction();
  setActionEnabled(true);

  /* mode rivalité : on enregistre cette carrière et on passe au joueur suivant */
  if (S.mp && S.mp.on && S.mp.seat < S.mp.players.length) {
    const seat = S.mp.seat;
    S.mp.players[seat].p = S.p;
    S.mp.players[seat].snap = mpSnapshot();
    mpSyncGhost(seat);
    S.mp.seat++;
    mpNextCreation();
    return;
  }

  save();
}

/* ═══════════════════════════════════════════════════════════
   MULTIJOUEUR HORS LIGNE — mode rivalité
   2 à 4 carrières dans LA MÊME ligue, chacun son tour, saison
   par saison. Vous vous disputez le même MVP, le même titre, les
   mêmes places au classement. (Le duel en direct, en ligne et en
   temps réel, vit dans duel.js.)
   ═══════════════════════════════════════════════════════════ */

const MP_FIELDS = ["p", "cast", "phase", "stageYear", "calendar", "queue", "recent",
                   "log", "teamsSeen", "pending", "focus", "lastSeason",
                   "lastStandings", "lastAwards", "madePlayoffs"];

function mpSnapshot() {
  const s = {};
  MP_FIELDS.forEach((k) => (s[k] = S[k]));
  return s;
}
function mpRestore(snap) {
  MP_FIELDS.forEach((k) => (S[k] = snap[k]));
}

/* le joueur humain apparaît dans la ligue des autres */
function mpSyncGhost(i) {
  const slot = S.mp.players[i];
  if (!slot || !slot.p) return;
  const p = slot.p;
  const last = p.seasons[p.seasons.length - 1];
  const id = "H" + i;
  let g = S.L.npcs.find((n) => n.id === id);
  if (!g) {
    g = { id, human: true, name: ENG.name(p), pos: p.position, style: "allrd",
          ovr: ENG.ovr(p), age: p.age, peak: 27, ceiling: 99, team: p.team || "BOS",
          rookie: false, stats: null, accolades: { mvp: 0, allNba: 0, allStar: 0, rings: 0 } };
    S.L.npcs.push(g);
  }
  g.name = ENG.name(p); g.ovr = ENG.ovr(p); g.age = p.age; g.pos = p.position;
  g.team = p.team || g.team;
  g.retired = slot.retired || false;
  if (last && last.level === "pro") {
    g.stats = { mpg: last.mpg, ppg: last.ppg, rpg: last.rpg, apg: last.apg,
                stl: last.spg, blk: last.bpg, ts: last.ts, gp: last.gp };
  }
  if (g.retired) { const k = S.L.npcs.indexOf(g); if (k >= 0) S.L.npcs.splice(k, 1); }
}

function mpAliveCount() {
  return S.mp.players.filter((x) => !x.retired).length;
}

function mpEndTurn() {
  const mp = S.mp;
  mp.players[mp.turn].snap = mpSnapshot();
  mp.players[mp.turn].p = S.p;
  mpSyncGhost(mp.turn);

  if (mpAliveCount() === 0) { mpFinalBoard(); return; }

  let guard = 0;
  do {
    mp.turn = (mp.turn + 1) % mp.players.length;
    guard++;
  } while (mp.players[mp.turn].retired && guard <= mp.players.length);

  const nxt = mp.players[mp.turn];
  mpRestore(nxt.snap);
  /* son instantané a été pris quand sa file venait de se vider :
     il faut lui préparer la saison suivante, sinon il repasse la main
     aussitôt et les joueurs se renvoient le tour indéfiniment */
  if (!S.queue.length && S.phase !== "retired") queueSeason();
  renderFullFeed();
  render();
  labelAction();

  ask({
    kicker: "Mode rivalité",
    head: "Au tour de " + nxt.label,
    body: `${ENG.name(S.p)} · ${S.p.age} ans · ${DATA.PHASES[S.phase]}. Passe l'appareil.`,
    choices: [{ h: "Je suis prêt", d: "", t: "", pick: () => { setActionEnabled(true); } }],
  });
}

function mpFinalBoard() {
  const rows = S.mp.players.map((x) => ({
    label: x.label, name: ENG.name(x.p),
    score: ENG.careerScore(x.p), rings: x.p.rings,
    mvp: x.p.career.mvp, seasons: x.p.career.seasons,
    ppg: x.p.career.gp ? +(x.p.career.pts / x.p.career.gp).toFixed(1) : 0,
  })).sort((a, b) => b.score - a.score);

  const shell = $("end-shell");
  shell.innerHTML = "";
  const hero = el("div", "end-hero");
  hero.innerHTML = `<div class="end-verdict">${rows[0].name}</div>
    <div class="end-name">remporte le mode rivalité</div>
    <div class="end-score">${rows[0].score}<sup>/100</sup></div>
    <div class="end-score-lbl">Meilleur score de carrière</div>`;
  shell.appendChild(hero);

  const sect = el("div", "end-sect");
  sect.appendChild(el("h3", null, "Classement final"));
  const list = el("div", "rank-body");
  rows.forEach((r, i) => {
    const row = el("div", "rank" + (i === 0 ? " me" : ""));
    row.appendChild(el("span", "rank-i", i + 1));
    const n = el("span", "rank-n");
    n.textContent = r.name + " ";
    n.appendChild(el("small", null, `${r.label} · ${r.seasons} saisons · ${String(r.ppg).replace(".", ",")} pts · ${r.rings} 💍 · ${r.mvp} MVP`));
    row.appendChild(n);
    row.appendChild(el("span", "rank-v", r.score));
    list.appendChild(row);
  });
  sect.appendChild(list);
  shell.appendChild(sect);

  const again = el("button", "btn btn-accent btn-block", "Rejouer");
  again.style.padding = "15px";
  again.onclick = () => { S = null; wipe(); boot(); };
  shell.appendChild(again);
  show("screen-end");
}

/* — mise en place — */

function mpSetup() {
  W = { step: 0, mp: { count: 2, names: ["Joueur 1", "Joueur 2", "Joueur 3", "Joueur 4"] } };
  show("screen-create");
  mpDrawSetup();
}

function mpDrawSetup() {
  $("create-steps").innerHTML = "";
  const b = $("create-body"), f = $("create-foot");
  b.innerHTML = ""; f.innerHTML = "";

  b.appendChild(el("h1", "create-title", "Mode rivalité"));
  b.appendChild(el("p", "create-sub",
    "Deux à quatre carrières dans la même ligue. Chacun joue sa saison à tour de rôle, sur le même appareil. Vous vous disputez le MVP, le titre et la place au Panthéon."));

  const grid = el("div", "opts cols-3");
  [2, 3, 4].forEach((n) => {
    const o = el("button", "opt" + (W.mp.count === n ? " on" : ""));
    o.type = "button";
    o.appendChild(el("div", "opt-h", n + " joueurs"));
    o.appendChild(el("div", "opt-d", n === 2 ? "Un duel direct." : n === 3 ? "Trois trajectoires." : "Une génération entière."));
    o.onclick = () => { W.mp.count = n; mpDrawSetup(); };
    grid.appendChild(o);
  });
  b.appendChild(grid);

  for (let i = 0; i < W.mp.count; i++) {
    const fl = el("label", "field");
    fl.appendChild(el("span", null, "Nom du joueur " + (i + 1)));
    const inp = el("input");
    inp.type = "text"; inp.maxLength = 16; inp.value = W.mp.names[i];
    inp.oninput = () => { W.mp.names[i] = inp.value; };
    fl.appendChild(inp);
    b.appendChild(fl);
  }

  const back = el("button", "btn btn-quiet", "Retour");
  back.onclick = boot;
  f.appendChild(back);

  const go = el("button", "btn btn-accent", "Créer les joueurs");
  go.onclick = () => {
    const L = ENG.newLeague();
    ENG.rollLeague(L);
    S = { L, mp: { on: true, turn: 0, seat: 0, players: [] } };
    for (let i = 0; i < W.mp.count; i++) {
      S.mp.players.push({ label: (W.mp.names[i] || "Joueur " + (i + 1)).trim() || "Joueur " + (i + 1), p: null, snap: null, retired: false });
    }
    mpNextCreation();
  };
  f.appendChild(go);
}

/* création successive des carrières */
function mpNextCreation() {
  const seat = S.mp.seat;
  if (seat >= S.mp.players.length) {
    /* tout le monde est créé : on charge le premier */
    S.mp.turn = 0;
    mpRestore(S.mp.players[0].snap);
    renderFullFeed();
    render();
    labelAction();
    setActionEnabled(true);
    show("screen-game");
    save();
    return;
  }
  startCreate();
  const label = S.mp.players[seat].label;
  const t = $("create-body");
  const note = el("p", "create-sub", "— " + label + " —");
  note.style.color = "var(--leather)";
  t.insertBefore(note, t.firstChild);
}

/* ═══════════════ CODES DE CARRIÈRE ═══════════════ */

function b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64dec(s) { return decodeURIComponent(escape(atob(s))); }

/* ═══════════════════════════════════════════════════════════
   COMPTES
   Tout reste sur l'appareil. Chaque compte a sa carrière en cours,
   son Panthéon et sa mémoire longue, rangés séparément.
   ═══════════════════════════════════════════════════════════ */

let PF = { emblem: "🏀", name: "" };

function renderProfileChip() {
  const a = PROFILE.active();
  $("profile-emblem").textContent = a ? a.emblem : "🏀";
  $("profile-name").textContent = a ? a.name : "Créer un compte";
}

function showProfiles(flash) {
  const b = $("profile-body");
  b.innerHTML = "";
  b.appendChild(el("h1", "create-title", "Comptes"));
  b.appendChild(el("p", "create-sub",
    "Chaque compte garde sa carrière en cours, son Panthéon et sa mémoire des situations déjà vues. Tout est stocké sur cet appareil : rien n'est envoyé ailleurs, et aucun mot de passe n'est demandé."));

  if (flash) {
    const f = el("p", "opt-t");
    f.textContent = flash;
    b.appendChild(f);
  }

  const list = PROFILE.list();
  const activeId = PROFILE.activeId();

  if (list.length) {
    const box = el("div", "opts");
    box.style.marginBottom = "22px";
    list.forEach((p) => {
      const s = PROFILE.summary(p.id);
      const card = el("button", "prof-card" + (p.id === activeId ? " on" : ""));
      card.type = "button";
      card.appendChild(el("div", "pc-emblem", p.emblem));
      const mid = el("div");
      mid.appendChild(el("div", "pc-name", p.name));
      const bits = [];
      bits.push(s.careers + " carrière" + (s.careers > 1 ? "s" : ""));
      if (s.best) bits.push("meilleur score " + s.best);
      if (s.inProgress) bits.push("partie en cours");
      mid.appendChild(el("div", "pc-sub", bits.join(" · ")));
      card.appendChild(mid);

      const del = el("span", "pc-del", "✕");
      del.title = "Supprimer ce compte";
      del.onclick = (e) => {
        e.stopPropagation();
        ask({
          kicker: "Confirmation", head: "Supprimer « " + p.name + " » ?",
          body: "Ses carrières, son Panthéon et sa mémoire seront effacés définitivement.",
          chain: false,
          choices: [
            { h: "Annuler", d: "", t: "", pick: () => showProfiles() },
            { h: "Supprimer définitivement", d: "", t: "", danger: true,
              pick: () => { PROFILE.remove(p.id); S = null; renderProfileChip(); showProfiles("Compte supprimé."); } },
          ],
        });
      };
      card.appendChild(del);

      card.onclick = () => {
        PROFILE.switchTo(p.id);
        S = null;
        renderProfileChip();
        boot();
      };
      box.appendChild(card);
    });
    b.appendChild(box);
  }

  /* création */
  b.appendChild(el("h3", "attr-group-name", list.length ? "Nouveau compte" : "Crée ton compte"));

  const nameF = el("label", "field");
  nameF.appendChild(el("span", null, "Nom du compte"));
  const inp = el("input");
  inp.type = "text"; inp.maxLength = 18; inp.placeholder = "Ton pseudo";
  inp.value = PF.name;
  inp.oninput = () => { PF.name = inp.value; };
  nameF.appendChild(inp);
  b.appendChild(nameF);

  const embF = el("label", "field");
  embF.appendChild(el("span", null, "Emblème"));
  const grid = el("div", "emblem-grid");
  PROFILE.EMBLEMS.forEach((e) => {
    const btn = el("button", "emblem-pick" + (PF.emblem === e ? " on" : ""), e);
    btn.type = "button";
    btn.onclick = () => { PF.emblem = e; showProfiles(); };
    grid.appendChild(btn);
  });
  embF.appendChild(grid);
  b.appendChild(embF);

  const go = el("button", "btn btn-accent btn-block", "Créer ce compte");
  go.style.marginTop = "6px";
  go.onclick = () => {
    const name = (inp.value || "").trim();
    if (!name) { showProfiles("Donne un nom à ce compte."); return; }
    const first = PROFILE.list().length === 0;
    const prof = PROFILE.create(name, PF.emblem);
    /* les parties jouées avant l'arrivée des comptes rejoignent le premier créé */
    if (first && PROFILE.hasLegacy()) PROFILE.adoptLegacy(prof.id);
    PF = { emblem: "🏀", name: "" };
    S = null;
    renderProfileChip();
    boot();
  };
  b.appendChild(go);

  show("screen-profile");
}

/* ═══════════════ AMORÇAGE ═══════════════ */

function boot() {
  renderProfileChip();
  /* pas encore de compte : on commence par là */
  if (!PROFILE.active()) { showProfiles(); return; }
  const saved = loadSave();
  $("btn-resume").classList.toggle("hidden", !saved);
  $("boot-careers").textContent = pantheon().length;
  show("screen-boot");
}

function resume() {
  try { resumeInner(); }
  catch (e) {
    /* sauvegarde illisible ou issue d'une version incompatible :
       on le dit clairement au lieu de laisser un écran inerte */
    ask({
      kicker: "Sauvegarde", head: "Cette carrière ne peut pas être rouverte",
      body: "Le fichier de sauvegarde est incomplet ou provient d'une version antérieure du jeu. Tu peux repartir sur une nouvelle carrière.",
      chain: false,
      choices: [{ h: "Démarrer une nouvelle carrière", d: "", t: "",
                  pick: () => { wipe(); startCreate(); } }],
    });
  }
}

function resumeInner() {
  const d = loadSave();
  if (!d) return;
  S = {
    p: d.p, L: d.L, cast: d.cast || CAST.make(d.p),
    phase: d.phase, stageYear: d.stageYear,
    calendar: d.calendar, queue: d.queue || [], recent: d.recent || [],
    log: d.log || [], teamsSeen: d.teamsSeen || [], focus: null, pending: d.pending || null,
    lastSeason: d.p.seasons[d.p.seasons.length - 1] || null,
    lastAwards: null, lastStandings: null, madePlayoffs: false,
    mp: d.mp || null,
  };
  S.p.rel = S.p.rel || CAST.newRel();
  if (S.p.team) S.lastStandings = ENG.standings(S.L, S.p.team, S.lastSeason ? S.lastSeason.wins : 41);
  show("screen-game");
  renderFullFeed();
  render();
  labelAction();
  setActionEnabled(true);
}

/* ═══════════════ DUEL EN DIRECT ═══════════════
   Écran séparé de la carrière solo : DUEL_UI ne touche jamais S,
   SAVE() ni HALL() — un duel ne peut rien casser dans une partie
   en cours. */
let DUEL_UI = null;

function duelReset() {
  DUEL.leaveRoom();
  DUEL.leaveQueue();
  duelClearCountdown();
  DUEL_UI = { avatar: null, mySeat: null, code: null, isHost: false,
              enteredLive: false, myProgress: null, oppProgress: null,
              ended: false, mode: "online", perfect: true,
              competition: "regular", roundsTotal: DUEL.ROUNDS_REGULAR,
              halfShown: false, halfBonus: 0, halfBonusMechs: null,
              feed: [], tauntSentThisRound: false,
              aiAttrs: null, aiName: null, aiOnDone: null };
}

/* Petite carte de scouting avant le coup d'envoi — même motif que
   les autres décisions (ask()), un seul choix pour continuer. */
function duelShowScoutingThen(oppName, oppAttrs, onContinue) {
  ask({
    kicker: "Avant le coup d'envoi", head: "Face à " + oppName,
    body: DUEL.scoutingLine(oppAttrs, oppName),
    chain: false,
    choices: [
      { h: "C'est parti", d: "", t: "", pick: () => { setActionEnabled(true); onContinue(); } },
    ],
  });
}

function duelOpenLobby() {
  duelReset();
  show("screen-duel-lobby");
  if (!DUEL.ready()) { worldDrawUnavailable(); return; }
  const c = DUEL.getCharacter();
  if (!c) worldDrawCreateCharacter(); else worldDrawHome();
}

function worldDrawUnavailable() {
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Monde multijoueur"));
  b.appendChild(el("p", "duel-msg", "Le monde multijoueur n'est pas encore configuré sur ce site."));
}

/* ─── création du personnage multijoueur (une fois par compte) ─── */
function worldDrawCreateCharacter() {
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Ton joueur multijoueur"));
  b.appendChild(el("p", "duel-msg", "Un seul personnage, séparé de ta carrière solo, pour tout le monde multijoueur : saison, amis, adversaires aléatoires."));

  const nameWrap = el("div", "field");
  nameWrap.appendChild(el("span", null, "Nom (aussi ton pseudo au classement)"));
  const nameInp = el("input");
  nameInp.type = "text"; nameInp.placeholder = "Ton pseudo"; nameInp.maxLength = 18;
  nameWrap.appendChild(nameInp);
  b.appendChild(nameWrap);

  const posWrap = el("div", "field");
  posWrap.appendChild(el("span", null, "Poste"));
  const posRow = el("div", "opts cols-3");
  let selectedPos = DATA.POSITIONS[0].id;
  DATA.POSITIONS.forEach((p) => {
    const btn = el("button", "opt" + (p.id === selectedPos ? " on" : ""));
    btn.type = "button";
    btn.appendChild(el("div", "opt-h", p.label));
    btn.onclick = () => {
      selectedPos = p.id;
      posRow.querySelectorAll(".opt").forEach((x) => x.classList.remove("on"));
      btn.classList.add("on");
    };
    posRow.appendChild(btn);
  });
  posWrap.appendChild(posRow);
  b.appendChild(posWrap);

  const msg = el("p", "duel-msg", "");
  const createBtn = el("button", "btn btn-accent btn-block", "Créer mon joueur");
  createBtn.onclick = () => {
    const name = nameInp.value.trim();
    if (!name) { msg.textContent = "Entre un nom d'abord."; return; }
    DUEL.createCharacter(name, selectedPos);
    worldDrawHome();
  };
  b.appendChild(createBtn);
  b.appendChild(msg);
}

/* ─── écran d'entrée du monde multijoueur ─── */
function worldDrawHome() {
  const c = DUEL.getCharacter();
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Monde multijoueur"));

  const card = el("div", "duel-seat-row ready");
  const posLabel = (DATA.POSITIONS.find((p) => p.id === c.position) || {}).label || "";
  card.appendChild(el("span", "duel-seat-name", ENG.name(c) + " · " + posLabel));
  card.appendChild(el("span", "duel-seat-ovr", "OVR " + ENG.ovr(c)));
  const gradeEl = el("span", "duel-seat-state", "…");
  card.appendChild(gradeEl);
  b.appendChild(card);
  DUEL.getMyRating((rating) => { gradeEl.textContent = DUEL.rankLabel(rating) + " · " + rating; });

  if ((c.badges || []).length) {
    const badgeRow = el("p", "duel-msg", "Badges : " + c.badges.map((bd) => bd.label || bd).join(" · "));
    b.appendChild(badgeRow);
  }

  const redoBtn = el("button", "btn btn-quiet btn-block", "Recommencer avec un nouveau joueur");
  redoBtn.onclick = () => {
    ask({
      kicker: "Confirmation", head: "Recréer ton joueur multijoueur ?",
      body: "Ton personnage actuel (attributs, franchise, badges) sera remplacé. Ta cote au classement général n'est pas affectée.",
      chain: false,
      choices: [
        { h: "Non, garder ce joueur", d: "", t: "", pick: () => { setActionEnabled(true); worldDrawHome(); } },
        { h: "Oui, recommencer", d: "", t: "", danger: true,
          pick: () => { setActionEnabled(true); worldDrawCreateCharacter(); } },
      ],
    });
  };
  b.appendChild(redoBtn);

  const boardBtn = el("button", "btn btn-quiet btn-block", "Voir le classement général");
  boardBtn.onclick = () => duelOpenLeaderboard();
  b.appendChild(boardBtn);

  b.appendChild(el("div", "duel-or", "— — —"));

  const seasonBtn = el("button", "btn btn-accent btn-block", "Jouer une saison");
  seasonBtn.onclick = () => worldOpenSeason();
  b.appendChild(seasonBtn);
  b.appendChild(el("div", "duel-or", "— ou —"));

  const msg = el("p", "duel-msg", "");

  const randomBtn = el("button", "btn btn-quiet btn-block", "Adversaire aléatoire");
  randomBtn.onclick = () => {
    const av = DUEL.getCharacter();
    DUEL_UI.avatar = av;
    randomBtn.disabled = true;
    duelDrawSearching();
    DUEL.joinQueue(av, (code, err, status) => {
      if (status === "waiting") { return; }
      if (status === "error") { worldDrawHome(); $("duel-lobby-body").querySelector(".duel-msg").textContent = err || "Échec de la recherche."; return; }
      DUEL_UI.mode = "online";
      DUEL_UI.mySeat = DUEL.seat; DUEL_UI.code = code; DUEL_UI.isHost = status === "host";
      duelDrawWaiting();
    });
  };
  b.appendChild(randomBtn);
  b.appendChild(el("div", "duel-or", "— ou —"));

  const createBtn = el("button", "btn btn-quiet btn-block", "Créer un salon pour un ami");
  createBtn.onclick = () => {
    const av = DUEL.getCharacter();
    createBtn.disabled = true; msg.textContent = "Création du salon…";
    DUEL.createRoom(av, (code, err) => {
      createBtn.disabled = false;
      if (!code) { msg.textContent = err || "Échec de la création."; return; }
      DUEL_UI.mode = "online";
      DUEL_UI.avatar = av; DUEL_UI.mySeat = "A"; DUEL_UI.code = code; DUEL_UI.isHost = true;
      duelDrawWaiting();
    });
  };
  b.appendChild(createBtn);

  const codeWrap = el("div", "field");
  codeWrap.appendChild(el("span", null, "Code reçu de ton ami"));
  const codeInp = el("input");
  codeInp.type = "text"; codeInp.placeholder = "K7XQ4M"; codeInp.maxLength = 6;
  codeInp.style.textTransform = "uppercase";
  codeWrap.appendChild(codeInp);
  b.appendChild(codeWrap);

  const joinBtn = el("button", "btn btn-quiet btn-block", "Rejoindre");
  joinBtn.onclick = () => {
    const av = DUEL.getCharacter();
    const code = codeInp.value.trim().toUpperCase();
    if (!code) { msg.textContent = "Entre le code de ton ami."; return; }
    joinBtn.disabled = true; msg.textContent = "Connexion…";
    DUEL.joinRoom(code, av, (ok, err) => {
      joinBtn.disabled = false;
      if (!ok) { msg.textContent = err || "Échec de la connexion."; return; }
      DUEL_UI.mode = "online";
      DUEL_UI.avatar = av; DUEL_UI.mySeat = "B"; DUEL_UI.code = code; DUEL_UI.isHost = false;
      duelDrawWaiting();
    });
  };
  b.appendChild(joinBtn);
  b.appendChild(msg);
}

function duelDrawSearching() {
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Recherche…"));
  b.appendChild(el("p", "duel-msg", "On cherche un adversaire disponible. Ça peut prendre un moment si personne d'autre n'est en ligne."));
  const cancelBtn = el("button", "btn btn-quiet btn-block", "Annuler");
  cancelBtn.onclick = () => { DUEL.leaveQueue(); worldDrawHome(); };
  b.appendChild(cancelBtn);
}

let DUEL_LB_REF = null;

function duelOpenLeaderboard() {
  show("screen-duel-leaderboard");
  const box = $("duel-leaderboard-body");
  box.innerHTML = "";
  if (!DUEL.ready()) {
    box.appendChild(el("div", "empty-note", "Le duel en direct n'est pas encore configuré sur ce site."));
    return;
  }
  box.appendChild(el("div", "empty-note", "Chargement…"));
  if (DUEL_LB_REF) { DUEL_LB_REF.off(); DUEL_LB_REF = null; }
  DUEL.ensureAuth(() => {
    DUEL_LB_REF = DUEL.listenLeaderboard((rows) => {
      box.innerHTML = "";
      if (!rows.length) {
        box.appendChild(el("div", "empty-note", "Personne au classement pour l'instant. Sois le premier à jouer."));
        return;
      }
      rows.forEach((r, i) => {
        const row = el("div", "pan-row");
        row.appendChild(el("div", "pan-score", String(r.rating != null ? r.rating : 0)));
        const mid = el("div");
        mid.appendChild(el("div", "pan-name", (i + 1) + ". " + (r.name || "Joueur")));
        mid.appendChild(el("div", "pan-sub", `${r.wins || 0} victoires · ${r.losses || 0} défaites`));
        row.appendChild(mid);
        box.appendChild(row);
      });
    });
  });
}

function duelDrawWaiting() {
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Salon " + DUEL_UI.code));
  if (DUEL_UI.isHost) {
    b.appendChild(el("p", "duel-msg", "Partage ce code avec ton ami :"));
    b.appendChild(el("div", "duel-code-big", DUEL_UI.code));
  } else {
    b.appendChild(el("p", "duel-msg", "Connecté au salon de ton ami."));
  }

  const seatsBox = el("div", "duel-seats");
  b.appendChild(seatsBox);

  const readyBtn = el("button", "btn btn-accent btn-block", "Je suis prêt");
  readyBtn.onclick = () => {
    DUEL.markReady(); readyBtn.disabled = true; readyBtn.textContent = "En attente de l'adversaire…";
  };
  b.appendChild(readyBtn);

  const backBtn = el("button", "btn btn-quiet btn-block", "Annuler");
  backBtn.onclick = () => { duelReset(); show("screen-duel-lobby"); worldDrawHome(); };
  b.appendChild(backBtn);

  DUEL.listenSeats((seats) => {
    seatsBox.innerHTML = "";
    ["A", "B"].forEach((s) => {
      const seat = seats[s];
      const row = el("div", "duel-seat-row" + (seat && seat.ready ? " ready" : ""));
      row.appendChild(el("span", "duel-seat-name", seat ? seat.name : "En attente…"));
      row.appendChild(el("span", "duel-seat-ovr", seat ? "OVR " + seat.ovr : ""));
      row.appendChild(el("span", "duel-seat-state", seat ? (seat.ready ? "Prêt" : "…") : ""));
      seatsBox.appendChild(row);
    });
  });

  DUEL.listenRoom((room) => duelOnRoomChange(room));
}

/* Une fois le salon « live », chacun démarre sa propre série de
   situations et ne dépend plus jamais de l'autre pour avancer —
   seul le tableau des scores et le chrono sont partagés. */
function duelOnRoomChange(room) {
  if (!DUEL_UI || DUEL_UI.enteredLive) return;
  if (room.status !== "live") return;
  DUEL_UI.enteredLive = true;
  DUEL_UI.competition = "regular";
  DUEL_UI.roundsTotal = DUEL.ROUNDS_REGULAR;
  const otherSeat = DUEL_UI.mySeat === "A" ? "B" : "A";
  const theirs = DUEL.seatsCache[otherSeat] || {};
  duelShowScoutingThen(theirs.name || "l'adversaire", theirs.attrs, () => {
    show("screen-duel-live");
    duelRenderScorebugShell();
    DUEL.startMyRun(DUEL_UI.avatar.position, DUEL.signatureUsesForCharacter(DUEL_UI.avatar));
    DUEL_UI.oppProgress = { score: 0, count: 0 };
    DUEL.listenProgress((progress) => duelOnProgressChange(progress));
  });
}

/* ─── démarrage d'un match contre une IA locale (mode Saison) ───
   Aucun salon Firebase : le côté adverse est calculé sur place, round
   par round, avec la même DUEL.resolveChoice qu'un vrai joueur. */
function worldStartAiMatch(aiAttrs, aiName, onDone, competition) {
  duelReset();
  DUEL_UI.mode = "ai";
  DUEL_UI.competition = competition === "playoffs" ? "playoffs" : "regular";
  DUEL_UI.roundsTotal = DUEL_UI.competition === "playoffs" ? DUEL.ROUNDS_PLAYOFFS : DUEL.ROUNDS_REGULAR;
  DUEL_UI.avatar = DUEL.getCharacter();
  DUEL_UI.aiAttrs = aiAttrs;
  DUEL_UI.aiName = aiName;
  DUEL_UI.aiOnDone = onDone;
  DUEL_UI.mySeat = "A";
  DUEL_UI.enteredLive = true;
  show("screen-duel-live");
  duelRenderScorebugShell();
  const sc = DUEL.pickScenario(DUEL_UI.avatar.position);
  const tell = DUEL.pickTell();
  DUEL_UI.myProgress = { score: 0, count: 0, scenarioId: sc.id, tellId: tell.id, lastOutcome: null,
    momentum: 0, lastMech: null, mechStreak: 0, sigUsesLeft: DUEL.signatureUsesForCharacter(DUEL_UI.avatar) };
  DUEL_UI.oppProgress = { score: 0, count: 0 };
  duelUpdateScoreDisplay();
  duelRenderMySituation();
}

function duelRenderScorebugShell() {
  const sb = $("duel-scorebug");
  sb.innerHTML = "";
  const mineName = DUEL_UI.mode === "ai" ? ENG.name(DUEL_UI.avatar)
    : ((DUEL.seatsCache[DUEL_UI.mySeat] && DUEL.seatsCache[DUEL_UI.mySeat].name) || "Toi");
  const theirsName = DUEL_UI.mode === "ai" ? DUEL_UI.aiName
    : ((DUEL.seatsCache[DUEL_UI.mySeat === "A" ? "B" : "A"] && DUEL.seatsCache[DUEL_UI.mySeat === "A" ? "B" : "A"].name) || "Adversaire");

  const mineEl = el("div", "duel-sb-side");
  const mineNameRow = el("div", "duel-sb-name-row");
  mineNameRow.appendChild(el("span", "duel-sb-name", mineName));
  const mineFire = el("span", "duel-fire-tag hidden", "🔥"); mineFire.id = "duel-my-fire";
  mineNameRow.appendChild(mineFire);
  mineEl.appendChild(mineNameRow);
  const myScoreEl = el("div", "duel-sb-score", "0"); myScoreEl.id = "duel-my-score";
  mineEl.appendChild(myScoreEl);

  const mid = el("div", "duel-sb-mid", "0 / " + DUEL_UI.roundsTotal); mid.id = "duel-round-counter";

  const theirsEl = el("div", "duel-sb-side");
  const theirsNameRow = el("div", "duel-sb-name-row");
  theirsNameRow.appendChild(el("span", "duel-sb-name", theirsName));
  const theirsFire = el("span", "duel-fire-tag hidden", "🔥"); theirsFire.id = "duel-opp-fire";
  theirsNameRow.appendChild(theirsFire);
  theirsEl.appendChild(theirsNameRow);
  const oppScoreEl = el("div", "duel-sb-score", "0"); oppScoreEl.id = "duel-opp-score";
  theirsEl.appendChild(oppScoreEl);

  sb.appendChild(mineEl); sb.appendChild(mid); sb.appendChild(theirsEl);

  const quitBtn = el("button", "btn-icon duel-quit", "✕");
  quitBtn.setAttribute("aria-label", "Abandonner");
  quitBtn.onclick = () => {
    ask({
      kicker: "Abandonner", head: "Quitter ce match ?",
      body: "Ça compte comme une défaite immédiate.",
      chain: false,
      choices: [
        { h: "Non, continuer", d: "", t: "", pick: () => setActionEnabled(true) },
        { h: "Oui, abandonner", d: "", t: "", danger: true, pick: () => { setActionEnabled(true); duelAbandon(); } },
      ],
    });
  };
  sb.appendChild(quitBtn);

  const strip = $("duel-status-strip");
  strip.innerHTML = "";
  const commentEl = el("div", "duel-commentator", "C'est parti !"); commentEl.id = "duel-commentator";
  strip.appendChild(commentEl);
  if (DUEL_UI.competition === "playoffs") {
    const crowdWrap = el("div", "duel-crowd");
    const crowdFill = el("div", "duel-crowd-fill"); crowdFill.id = "duel-crowd-fill";
    crowdWrap.appendChild(crowdFill);
    strip.appendChild(crowdWrap);
  }

  $("duel-feed").innerHTML = "";
}

function duelRenderFeed() {
  const box = $("duel-feed");
  if (!box) return;
  box.innerHTML = "";
  (DUEL_UI.feed || []).forEach((line) => box.appendChild(el("div", "duel-feed-line", line)));
}

let DUEL_TAUNT_H = null;
function duelShowTauntBanner(text) {
  const strip = $("duel-status-strip");
  if (!strip) return;
  strip.querySelectorAll(".duel-taunt-banner").forEach((x) => x.remove());
  const banner = el("div", "duel-taunt-banner", text);
  strip.appendChild(banner);
  if (DUEL_TAUNT_H) clearTimeout(DUEL_TAUNT_H);
  DUEL_TAUNT_H = setTimeout(() => { banner.remove(); }, 3500);
}

/* Abandon volontaire (bouton ✕) : compte comme une défaite immédiate.
   Pour un match en ligne, l'adversaire n'est pas coupé de force — il
   verra simplement un score qui ne bouge plus de mon côté. */
function duelAbandon() {
  if (!DUEL_UI || DUEL_UI.ended) return;
  DUEL_UI.ended = true;
  duelClearCountdown();
  DUEL.recordResult(false, false);
  if (DUEL_UI.mode === "ai") {
    const onDone = DUEL_UI.aiOnDone;
    duelReset();
    if (onDone) onDone(false, false, 0, 0);
  } else {
    DUEL.deleteRoom(DUEL_UI.code);
    duelReset();
    show("screen-duel-lobby");
    worldDrawHome();
  }
}

function duelUpdateScoreDisplay() {
  const mine = DUEL_UI.myProgress, theirs = DUEL_UI.oppProgress;
  const myScoreEl = $("duel-my-score"); if (myScoreEl && mine) myScoreEl.textContent = String(mine.score || 0);
  const oppScoreEl = $("duel-opp-score"); if (oppScoreEl && theirs) oppScoreEl.textContent = String(theirs.score || 0);
  const mid = $("duel-round-counter");
  if (mid && mine) mid.textContent = Math.min(mine.count, DUEL_UI.roundsTotal) + " / " + DUEL_UI.roundsTotal;

  const myFire = $("duel-my-fire");
  if (myFire) myFire.classList.toggle("hidden", !(mine && (mine.momentum || 0) >= 2));
  const oppFire = $("duel-opp-fire");
  if (oppFire) oppFire.classList.toggle("hidden", !(theirs && (theirs.momentum || 0) >= 2));

  const commentEl = $("duel-commentator");
  if (commentEl && mine) {
    commentEl.textContent = DUEL.commentatorLine(mine.score || 0, (theirs && theirs.score) || 0, mine.count, DUEL_UI.roundsTotal);
  }

  const crowdFill = $("duel-crowd-fill");
  if (crowdFill && mine) {
    const heat = ENG.clamp((((mine.momentum || 0) + ((theirs && theirs.momentum) || 0)) + 3) / 6 * 100, 8, 100);
    crowdFill.style.width = heat + "%";
  }
}

function duelOnProgressChange(progress) {
  if (!DUEL_UI || DUEL_UI.ended || DUEL_UI.mode !== "online") return;
  const otherSeat = DUEL_UI.mySeat === "A" ? "B" : "A";
  const mine = progress[DUEL_UI.mySeat];
  const theirs = progress[otherSeat];

  if (theirs && (!DUEL_UI.oppProgress || DUEL_UI.oppProgress.count !== theirs.count) && theirs.lastOutcome) {
    DUEL_UI.feed = (DUEL_UI.feed || []).concat(theirs.lastOutcome.headline || "…").slice(-4);
    duelRenderFeed();
  }
  if (theirs && theirs.taunt && (!DUEL_UI.oppProgress || !DUEL_UI.oppProgress.taunt || DUEL_UI.oppProgress.taunt.at !== theirs.taunt.at)) {
    duelShowTauntBanner(theirs.taunt.text);
  }
  DUEL_UI.oppProgress = theirs || DUEL_UI.oppProgress;

  const isNew = mine && (!DUEL_UI.myProgress || DUEL_UI.myProgress.count !== mine.count);
  if (isNew && mine.lastOutcome && !mine.lastOutcome.success) DUEL_UI.perfect = false;
  if (mine) DUEL_UI.myProgress = mine;
  duelUpdateScoreDisplay();

  if (isNew) {
    const half = DUEL_UI.roundsTotal / 2;
    const willHalftime = !DUEL_UI.halfShown && mine.count === half;
    duelRenderMySituation(willHalftime);
    if (willHalftime) { DUEL_UI.halfShown = true; duelShowHalftime(mine); }
  }

  if (mine && mine.count >= DUEL_UI.roundsTotal && theirs && theirs.count >= DUEL_UI.roundsTotal) {
    setTimeout(duelEndMatch, 1200);
  }
}

let DUEL_COUNTDOWN_H = null;
function duelClearCountdown() {
  if (DUEL_COUNTDOWN_H) { clearInterval(DUEL_COUNTDOWN_H); DUEL_COUNTDOWN_H = null; }
}

/* Mi-temps : un choix à faible enjeu qui ajuste légèrement les
   chances pour la seconde moitié — réutilise ask(), pas un nouvel
   écran HTML. `mine` sert juste à afficher le score au moment de la
   pause. */
function duelShowHalftime(mine) {
  const theirScore = DUEL_UI.oppProgress ? (DUEL_UI.oppProgress.score || 0) : 0;
  ask({
    kicker: "Mi-temps", head: `${mine.score} – ${theirScore}`,
    body: "Un ajustement pour la seconde moitié :",
    chain: false,
    choices: [
      { h: "Resserrer la défense", d: "Un jeu plus posé, moins d'erreurs.", t: "Bonus stable",
        pick: () => { setActionEnabled(true); DUEL_UI.halfBonus = 0.03; DUEL_UI.halfBonusMechs = null; duelRenderMySituation(); } },
      { h: "Accélérer le rythme", d: "Plus de tirs et de pénétrations tentés.", t: "Bonus offensif",
        pick: () => { setActionEnabled(true); DUEL_UI.halfBonus = 0.06; DUEL_UI.halfBonusMechs = ["shoot", "drive"]; duelRenderMySituation(); } },
    ],
  });
}

/* skipNext : quand la mi-temps va s'afficher juste après, on montre
   le résultat de la dernière action mais pas encore la suivante — la
   modale de mi-temps rappelle duelRenderMySituation() une fois le
   choix fait, cette fois sans skipNext. */
function duelRenderMySituation(skipNext) {
  duelClearCountdown();
  const arena = $("duel-arena");
  const mine = DUEL_UI.myProgress;
  if (!mine) return;
  const sc = DUEL.LIB.find((t) => t.id === mine.scenarioId) || DUEL.LIB[0];
  const framing = sc.clutchWeighted ? "clutch" : null;

  arena.innerHTML = "";

  if (mine.lastOutcome) {
    const panel = el("div", "manga-panel-wrap");
    panel.innerHTML = MANGA.compose(mine.lastOutcome, { offChoice: mine.lastOutcome.mech, framing });
    arena.appendChild(panel);
    const card = el("div", "duel-outcome");
    card.appendChild(el("div", "duel-outcome-who", mine.lastOutcome.choiceH));
    card.appendChild(el("div", "duel-outcome-headline", mine.lastOutcome.headline));
    card.appendChild(el("div", "duel-outcome-body", mine.lastOutcome.text));
    arena.appendChild(card);

    if (DUEL_UI.mode === "online" && mine.lastOutcome.success) {
      DUEL_UI.tauntSentThisRound = false;
      const tauntBox = el("div", "duel-taunts");
      DUEL.TAUNTS.forEach((text) => {
        const tbtn = el("button", "duel-taunt-btn", text);
        tbtn.onclick = () => {
          if (DUEL_UI.tauntSentThisRound) return;
          DUEL_UI.tauntSentThisRound = true;
          DUEL.sendTaunt(text);
          tauntBox.querySelectorAll(".duel-taunt-btn").forEach((x) => { x.disabled = true; });
        };
        tauntBox.appendChild(tbtn);
      });
      arena.appendChild(tauntBox);
    }
  }

  if (skipNext) return;

  if (mine.count >= DUEL_UI.roundsTotal) {
    arena.appendChild(el("p", "duel-msg", "Match terminé — calcul du résultat…"));
    return;
  }

  const panel = el("div", "manga-panel-wrap");
  panel.innerHTML = MANGA.composeSetup({ framing, label: sc.head });
  arena.appendChild(panel);

  const tell = DUEL.TELLS.find((t) => t.id === mine.tellId);
  if (tell && tell.favors) arena.appendChild(el("div", "duel-tell", "👁 " + tell.label));

  const card = el("div", "duel-situation");
  card.appendChild(el("div", "duel-situation-kicker", "Situation " + (mine.count + 1) + " / " + DUEL_UI.roundsTotal));
  card.appendChild(el("div", "duel-situation-head", sc.head));
  card.appendChild(el("div", "duel-situation-body", sc.body));
  arena.appendChild(card);

  if ((mine.mechStreak || 0) >= 2 && mine.lastMech) {
    arena.appendChild(el("p", "duel-fatigue-note", "Fatigue : à force de répéter le même choix, son efficacité baisse."));
  }

  const timeEl = el("div", "duel-countdown", String(DUEL.CHOICE_SECONDS));
  arena.appendChild(timeEl);

  const choiceBox = el("div", "modal-choices");
  let answered = false;
  const lockChoices = () => choiceBox.querySelectorAll(".choice").forEach((x) => { x.disabled = true; x.style.opacity = .5; });
  const halfBonusFor = (mech) => (DUEL_UI.halfBonus && (!DUEL_UI.halfBonusMechs || DUEL_UI.halfBonusMechs.includes(mech))) ? DUEL_UI.halfBonus : 0;

  sc.ch.forEach((c, idx) => {
    const btn = el("button", "choice");
    btn.appendChild(el("div", "choice-h", c.h));
    if (c.d) btn.appendChild(el("div", "choice-d", c.d));
    if (c.t) btn.appendChild(el("div", "choice-t", "→ " + c.t));
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      duelClearCountdown();
      lockChoices();
      duelSubmitChoice(idx, halfBonusFor(c.mech), false);
    };
    choiceBox.appendChild(btn);
  });

  if ((mine.sigUsesLeft || 0) > 0) {
    const sigMech = DUEL.bestMech(DUEL_UI.avatar.attrs);
    const sigBtn = el("button", "choice choice-signature");
    sigBtn.appendChild(el("div", "choice-h", "🌟 Coup signature"));
    sigBtn.appendChild(el("div", "choice-d", "Ton geste fétiche, un net avantage."));
    sigBtn.appendChild(el("div", "choice-t", "→ " + mine.sigUsesLeft + " restant(s)"));
    sigBtn.onclick = () => {
      if (answered) return;
      answered = true;
      duelClearCountdown();
      lockChoices();
      const idx = sc.ch.findIndex((c) => c.mech === sigMech);
      duelSubmitChoice(idx >= 0 ? idx : 0, halfBonusFor(sigMech), true);
    };
    choiceBox.appendChild(sigBtn);
  }

  arena.appendChild(choiceBox);

  /* Sur petit écran, le récap de l'action précédente (panneau manga +
     texte) pousse le compte à rebours hors de l'écran — sans ça, le
     joueur perd un temps précieux à faire défiler avant de voir qu'il
     doit choisir. On amène directement le chrono à l'écran. */
  requestAnimationFrame(() => { timeEl.scrollIntoView({ behavior: "smooth", block: "start" }); });

  let remain = DUEL.CHOICE_SECONDS;
  DUEL_COUNTDOWN_H = setInterval(() => {
    remain--;
    timeEl.textContent = String(Math.max(0, remain));
    if (remain <= 0) {
      duelClearCountdown();
      if (answered) return;
      answered = true;
      lockChoices();
      duelSubmitTimeout();
    }
  }, 1000);
}

function duelSubmitChoice(idx, extraBonus, useSignature) {
  if (DUEL_UI.mode === "ai") aiApplyMyRound(idx, extraBonus, useSignature);
  else DUEL.submitMyChoice(idx, DUEL_UI.avatar.attrs, DUEL_UI.avatar.position, useSignature, extraBonus);
}

function duelSubmitTimeout() {
  if (DUEL_UI.mode === "ai") aiApplyMyRound(null, 0, false);
  else DUEL.submitTimeout(DUEL_UI.avatar.position);
}

/* ─── résolution locale d'un round contre l'IA ───
   Mon choix (ou l'absence de choix) se résout avec DUEL.resolveChoice,
   exactement comme un vrai joueur — même lecture de défense, momentum,
   fatigue et coup signature que le chemin en ligne (DUEL.submitMyChoice),
   juste sans salon Firebase. L'IA joue son propre round au même rythme,
   résolu simplement (pas de tell/momentum de son côté). */
function aiApplyMyRound(idx, extraBonus, useSignature) {
  const mine = DUEL_UI.myProgress;
  const sc = DUEL.LIB.find((t) => t.id === mine.scenarioId) || DUEL.LIB[0];
  const choice = idx != null ? (sc.ch[idx] || sc.ch[0]) : null;
  const tell = DUEL.TELLS.find((t) => t.id === mine.tellId) || null;

  let outcome;
  if (choice) {
    const bonus = DUEL.deriveBonus(mine, tell, choice.mech, useSignature) + (extraBonus || 0);
    outcome = DUEL.resolveChoice(sc, choice.mech, DUEL_UI.avatar.attrs, !!sc.clutchWeighted, bonus);
    if (useSignature) outcome = DUEL.applySignatureFlavor(outcome);
  } else {
    outcome = { points: 0, success: false, headline: "Temps écoulé",
      text: "L'horloge tourne trop vite, l'occasion est passée.", flags: { turnover: true } };
  }
  if (!outcome.success) DUEL_UI.perfect = false;

  const nextSc = DUEL.pickScenario(DUEL_UI.avatar.position);
  const nextTell = DUEL.pickTell();
  const newCount = mine.count + 1;
  DUEL_UI.myProgress = {
    score: mine.score + (outcome.points || 0),
    count: newCount,
    scenarioId: nextSc.id,
    tellId: nextTell.id,
    lastOutcome: Object.assign({}, outcome, {
      scenarioId: mine.scenarioId, choiceH: choice ? choice.h : "—", mech: choice ? choice.mech : null }),
    momentum: DUEL.nextMomentum(mine, outcome.success),
    lastMech: choice ? choice.mech : null,
    mechStreak: choice ? DUEL.nextMechStreak(mine, choice.mech) : 0,
    sigUsesLeft: Math.max(0, (mine.sigUsesLeft || 0) - (useSignature ? 1 : 0)),
  };

  const aiSc = DUEL.pickScenario();
  const aiChoice = ENG.R.pick(aiSc.ch);
  const aiOutcome = DUEL.resolveChoice(aiSc, aiChoice.mech, DUEL_UI.aiAttrs, !!aiSc.clutchWeighted, 0);
  DUEL_UI.oppProgress = { score: (DUEL_UI.oppProgress.score || 0) + (aiOutcome.points || 0), count: newCount };

  duelUpdateScoreDisplay();

  const half = DUEL_UI.roundsTotal / 2;
  const willHalftime = !DUEL_UI.halfShown && newCount === half;
  duelRenderMySituation(willHalftime);
  if (willHalftime) { DUEL_UI.halfShown = true; duelShowHalftime(DUEL_UI.myProgress); }

  if (newCount >= DUEL_UI.roundsTotal) setTimeout(duelEndMatch, 1200);
}

function duelEndMatch() {
  if (!DUEL_UI || DUEL_UI.ended) return;
  DUEL_UI.ended = true;
  duelClearCountdown();
  duelShowResult();
}

function duelCheckPerfectBadge(won) {
  if (!won || !DUEL_UI.perfect) return;
  const c = DUEL.getCharacter();
  if (c && DUEL.awardBadge(c, "perfect", "Sans-faute")) DUEL.setCharacter(c);
}

function duelShowResult() {
  const myScore = (DUEL_UI.myProgress && DUEL_UI.myProgress.score) || 0;
  const oppScore = (DUEL_UI.oppProgress && DUEL_UI.oppProgress.score) || 0;
  const won = myScore > oppScore, tie = myScore === oppScore;
  duelCheckPerfectBadge(won);

  if (DUEL_UI.mode === "ai") {
    DUEL.recordResult(won, tie);
    const onDone = DUEL_UI.aiOnDone;
    duelReset();
    if (onDone) onDone(won, tie, myScore, oppScore);
    return;
  }

  const seats = DUEL.seatsCache;
  const otherSeat = DUEL_UI.mySeat === "A" ? "B" : "A";
  const myName = (seats[DUEL_UI.mySeat] && seats[DUEL_UI.mySeat].name) || "Toi";
  const oppName = (seats[otherSeat] && seats[otherSeat].name) || "Adversaire";

  DUEL.saveHistory({ at: Date.now(), code: DUEL_UI.code, opponent: oppName, won, tie, myScore, oppScore });
  DUEL.recordResult(won, tie);

  show("screen-duel-result");
  const shell = $("duel-result-shell");
  shell.innerHTML = "";
  const hero = el("div", "end-hero");
  hero.appendChild(el("div", "end-verdict", won ? "Victoire !" : tie ? "Match nul" : "Défaite"));
  hero.appendChild(el("div", "end-name", `${myName} ${myScore} – ${oppScore} ${oppName}`));
  shell.appendChild(hero);

  const again = el("button", "btn btn-accent btn-block", "Retour au monde multijoueur");
  again.onclick = () => { DUEL.deleteRoom(DUEL_UI.code); duelOpenLobby(); };
  shell.appendChild(again);

  const home = el("button", "btn btn-quiet btn-block", "Retour à l'accueil");
  home.onclick = () => { DUEL.deleteRoom(DUEL_UI.code); duelReset(); show("screen-boot"); };
  shell.appendChild(home);
}

/* ═══════════════ MODE SAISON ═══════════════
   Personnage MP, sa propre franchise, un calendrier de conférence joué
   contre des adversaires IA (mêmes mécaniques que Ami/Aléatoire), puis
   des playoffs joués au meilleur des trois. Couche à part : ne touche
   ni ENG.simSeason ni la carrière solo. */

function worldTeamStrength(teamId) {
  const t = teamOf(teamId);
  return (t && t.prestige) || 60;
}

/* Résolution instantanée (bouton "Simuler") : même esprit que la
   difficulté IA (ENG.worldAiAttrs), mais réduite à une seule
   probabilité au lieu de 8 situations jouées. */
function worldSimulateWinProb(c, oppTeam) {
  const myOvr = ENG.ovr(c);
  const aiCenter = ENG.clamp(28 + (oppTeam.prestige || 60) * 0.5, 25, 78);
  return ENG.clamp(0.5 + (myOvr - aiCenter) * 0.02, 0.15, 0.85);
}

function worldOpenSeason() {
  const c = DUEL.getCharacter();
  if (!c) { worldDrawCreateCharacter(); return; }
  if (!c.season || c.season.stage === "done") worldDrawTeamPicker();
  else worldDrawSeasonScreen();
}

function worldDrawTeamPicker() {
  show("screen-duel-lobby");
  const b = $("duel-lobby-body");
  b.innerHTML = "";
  b.appendChild(el("h2", "create-title", "Choisis ta franchise"));
  b.appendChild(el("p", "duel-msg", "Deux matchs contre chaque équipe de ta conférence, puis des playoffs au meilleur des trois."));

  [["E", "Conférence Est"], ["O", "Conférence Ouest"]].forEach(([conf, label]) => {
    b.appendChild(el("div", "duel-or", label));
    const grid = el("div", "opts cols-2");
    DATA.TEAMS.filter((t) => t.conf === conf).forEach((t) => {
      const btn = el("button", "opt");
      btn.type = "button";
      btn.appendChild(el("div", "opt-h", t.full));
      btn.onclick = () => worldStartNewSeason(t.id);
      grid.appendChild(btn);
    });
    b.appendChild(grid);
  });

  const cancelBtn = el("button", "btn btn-quiet btn-block", "Annuler");
  cancelBtn.onclick = () => worldDrawHome();
  b.appendChild(cancelBtn);
}

function worldStartNewSeason(teamId) {
  const c = DUEL.getCharacter();
  c.teamId = teamId;
  c.season = { teamId, schedule: ENG.worldBuildSchedule(teamId), wins: 0, losses: 0, stage: "regular", bracket: null, resultText: null };
  DUEL.setCharacter(c);
  worldDrawSeasonScreen();
}

function worldDrawSeasonScreen() {
  show("screen-world-season");
  const c = DUEL.getCharacter();
  const s = c.season;
  if (s.stage === "regular" && !s.schedule.some((g) => !g.played)) worldFinishRegularSeason(c, s);
  if (s.stage === "playoffs") worldAdvancePlayoffs(c, s);

  const myTeam = teamOf(s.teamId);
  $("world-season-title").textContent = myTeam.full;
  const box = $("world-season-body");
  box.innerHTML = "";

  if (s.stage === "regular") {
    const remaining = s.schedule.filter((g) => !g.played);
    const row = el("div", "pan-row");
    row.appendChild(el("div", "pan-score", s.wins + "-" + s.losses));
    const mid = el("div");
    mid.appendChild(el("div", "pan-name", "Prochain match : " + teamOf(remaining[0].opp).full));
    mid.appendChild(el("div", "pan-sub", remaining.length + " match(s) restant(s) cette saison"));
    row.appendChild(mid);
    box.appendChild(row);

    const playBtn = el("button", "btn btn-accent btn-block", "Jouer ce match");
    playBtn.onclick = () => worldPlayScheduleGame(c, remaining[0]);
    box.appendChild(playBtn);

    const simBtn = el("button", "btn btn-quiet btn-block", "Simuler");
    simBtn.onclick = () => worldSimulateScheduleGame(c, remaining[0]);
    box.appendChild(simBtn);

    if (remaining.length > 1) {
      box.appendChild(el("p", "duel-msg", "Ensuite : " + remaining.slice(1, 7).map((g) => teamOf(g.opp).full).join(" · ") + (remaining.length > 7 ? "…" : "")));
    }
  } else if (s.stage === "playoffs") {
    worldRenderBracket(box, c, s);
  } else if (s.stage === "done") {
    box.appendChild(el("div", "empty-note", s.resultText || "Saison terminée."));
    const newBtn = el("button", "btn btn-accent btn-block", "Nouvelle saison");
    newBtn.onclick = () => worldDrawTeamPicker();
    box.appendChild(newBtn);
  }

  const backBtn = el("button", "btn btn-quiet btn-block", "Retour au monde multijoueur");
  backBtn.onclick = () => { show("screen-duel-lobby"); worldDrawHome(); };
  box.appendChild(backBtn);
}

function worldPlayScheduleGame(c, slot) {
  const oppTeam = teamOf(slot.opp);
  const aiAttrs = ENG.worldAiAttrs(oppTeam);
  duelShowScoutingThen(oppTeam.full, aiAttrs, () => {
    worldStartAiMatch(aiAttrs, oppTeam.full, (won, tie) => {
      const iWon = tie ? ENG.R.chance(0.5) : won;
      slot.played = true;
      slot.result = { won: iWon };
      if (iWon) c.season.wins++; else c.season.losses++;
      DUEL.setCharacter(c);
      worldDrawSeasonScreen();
    }, "regular");
  });
}

function worldSimulateScheduleGame(c, slot) {
  const oppTeam = teamOf(slot.opp);
  const won = ENG.R.chance(worldSimulateWinProb(c, oppTeam));
  slot.played = true;
  slot.result = { won, simulated: true };
  if (won) c.season.wins++; else c.season.losses++;
  DUEL.recordResult(won, false);
  DUEL.setCharacter(c);
  worldDrawSeasonScreen();
}

/* Bascule vers les playoffs si la conférence est qualifiée, sinon la
   saison s'arrête ici — pure mutation d'état, appelée avant le rendu. */
function worldFinishRegularSeason(c, s) {
  const standings = ENG.worldConferenceStandings(s.teamId, s.wins, s.schedule.length);
  const top8 = standings.slice(0, 8);
  if (top8.findIndex((r) => r.id === s.teamId) < 0) {
    s.stage = "done";
    s.resultText = `Saison terminée : ${s.wins} V — ${s.losses} D. Ton équipe ne finit pas dans le top 8 de la conférence, pas de playoffs cette fois.`;
    DUEL.setCharacter(c);
    return;
  }
  s.stage = "playoffs";
  s.bracket = worldBuildBracket(top8, s.teamId);
  DUEL.setCharacter(c);
}

function worldBuildBracket(top8, myTeamId) {
  const pairIdx = [[0, 7], [3, 4], [2, 5], [1, 6]];
  const series = pairIdx.map(([a, b]) => {
    const aId = top8[a].id, bId = top8[b].id;
    return { aId, bId, aWins: 0, bWins: 0, involvesMe: aId === myTeamId || bId === myTeamId, done: false, winnerId: null };
  });
  return { round: 1, series };
}

function worldResolveSeriesInstant(series) {
  const strA = worldTeamStrength(series.aId), strB = worldTeamStrength(series.bId);
  const res = ENG.worldSeriesWin(strA, strB, 0);
  const parts = res.score.split("-").map(Number);
  series.aWins = parts[0]; series.bWins = parts[1];
  series.done = true;
  series.winnerId = res.win ? series.aId : series.bId;
}

function worldSeriesOpponent(c, series) {
  const myTeamId = c.season.teamId;
  const iAmA = series.aId === myTeamId;
  return { iAmA, oppTeam: teamOf(iAmA ? series.bId : series.aId) };
}

function worldApplySeriesGameResult(c, series, iAmA, iWon) {
  if (iAmA) { if (iWon) series.aWins++; else series.bWins++; }
  else { if (iWon) series.bWins++; else series.aWins++; }
  if (series.aWins >= 2 || series.bWins >= 2) {
    series.done = true;
    series.winnerId = series.aWins >= 2 ? series.aId : series.bId;
  }
  DUEL.setCharacter(c);
  worldDrawSeasonScreen();
}

function worldPlaySeriesGame(c, series) {
  const { iAmA, oppTeam } = worldSeriesOpponent(c, series);
  const aiAttrs = ENG.worldAiAttrs(oppTeam);
  duelShowScoutingThen(oppTeam.full, aiAttrs, () => {
    worldStartAiMatch(aiAttrs, oppTeam.full, (won, tie) => {
      const iWon = tie ? ENG.R.chance(0.5) : won;
      worldApplySeriesGameResult(c, series, iAmA, iWon);
    }, "playoffs");
  });
}

function worldSimulateSeriesGame(c, series) {
  const { iAmA, oppTeam } = worldSeriesOpponent(c, series);
  const iWon = ENG.R.chance(worldSimulateWinProb(c, oppTeam));
  DUEL.recordResult(iWon, false);
  worldApplySeriesGameResult(c, series, iAmA, iWon);
}

const WORLD_ROUND_NAMES = { 1: "1er tour", 2: "Demi-finale de conférence", 3: "Finale de conférence" };

/* Résout les séries qui ne me concernent pas et fait avancer le bracket
   d'un round dès que tout est joué — pure mutation d'état, en boucle
   jusqu'à ce qu'il ne reste plus qu'à attendre mon prochain match (ou
   que la saison se termine). Jamais de rendu ici. */
function worldAdvancePlayoffs(c, s) {
  while (s.stage === "playoffs") {
    const br = s.bracket;
    let changed = false;
    br.series.forEach((se) => { if (!se.done && !se.involvesMe) { worldResolveSeriesInstant(se); changed = true; } });

    const mySeries = br.series.find((se) => se.involvesMe && !se.done);
    if (mySeries) { if (changed) DUEL.setCharacter(c); return; }

    const myTeamId = s.teamId;
    const mySeriesDone = br.series.find((se) => se.involvesMe);
    const iSurvived = !mySeriesDone || mySeriesDone.winnerId === myTeamId;
    if (!iSurvived) {
      s.stage = "done";
      s.resultText = `Éliminé en playoffs (${WORLD_ROUND_NAMES[br.round]}). Saison terminée.`;
      DUEL.setCharacter(c);
      return;
    }
    if (br.round >= 3) {
      s.stage = "done";
      s.resultText = "Champion de conférence !";
      DUEL.awardBadge(c, "conf-champ", "Champion de conférence");
      DUEL.setCharacter(c);
      return;
    }
    const winners = br.series.map((se) => se.winnerId);
    const nextPairs = [[0, 1], [2, 3]];
    const nextSeries = nextPairs.map(([a, b]) => ({
      aId: winners[a], bId: winners[b], aWins: 0, bWins: 0,
      involvesMe: winners[a] === myTeamId || winners[b] === myTeamId, done: false, winnerId: null,
    }));
    s.bracket = { round: br.round + 1, series: nextSeries };
    DUEL.setCharacter(c);
    /* la boucle continue : le round suivant peut lui-même se résoudre
       entièrement d'un coup si je n'y suis pas impliqué */
  }
}

function worldRenderBracket(box, c, s) {
  const br = s.bracket;
  box.appendChild(el("div", "empty-note", WORLD_ROUND_NAMES[br.round] || ("Round " + br.round)));

  br.series.forEach((se) => {
    const row = el("div", "pan-row");
    row.appendChild(el("div", "pan-score", se.aWins + "-" + se.bWins));
    const mid = el("div");
    mid.appendChild(el("div", "pan-name", teamOf(se.aId).full + " vs " + teamOf(se.bId).full));
    mid.appendChild(el("div", "pan-sub", se.done ? "Terminé" : se.involvesMe ? "En cours" : "…"));
    row.appendChild(mid);
    box.appendChild(row);
  });

  const mySeries = br.series.find((se) => se.involvesMe && !se.done);
  if (mySeries) {
    const playBtn = el("button", "btn btn-accent btn-block", "Jouer le prochain match de la série");
    playBtn.onclick = () => worldPlaySeriesGame(c, mySeries);
    box.appendChild(playBtn);

    const simBtn = el("button", "btn btn-quiet btn-block", "Simuler");
    simBtn.onclick = () => worldSimulateSeriesGame(c, mySeries);
    box.appendChild(simBtn);
  }
}

/* ═══════════════ ÉVÉNEMENTS DOM ═══════════════ */

document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("afterbegin", MANGA.DEFS_SVG);
  boot();

  /* Les boîtes de dialogue natives (confirm) sont bloquées dans une page
     embarquée : elles renvoient false sans rien afficher, et le bouton
     paraît mort. On passe donc par la modale du jeu, qui marche partout. */
  const confirmReplace = (onYes) => {
    const saved = loadSave();
    if (!saved) { onYes(); return; }
    /* Nommer précisément ce qui disparaît évite toute ambiguïté : seule
       cette carrière inachevée est en jeu, jamais le Panthéon ni les
       carrières déjà terminées. */
    const savedName = saved.p ? `${saved.p.first} ${saved.p.last}` : "cette carrière";
    ask({
      kicker: "Attention", head: "Une carrière est déjà en cours",
      body: `${savedName} a une partie non terminée. La remplacer par une nouvelle carrière n'efface qu'elle : ton Panthéon et tes carrières déjà achevées restent intacts, quoi que tu choisisses.`,
      chain: false, cancelable: true,
      choices: [
        { h: "Reprendre la carrière en cours", d: `Revenir à ${savedName}, là où tu t'étais arrêté.`, t: "Rien n'est perdu",
          pick: () => { resume(); } },
        { h: "Remplacer par une nouvelle carrière", d: `Seule la partie non terminée de ${savedName} sera perdue.`, t: "Le Panthéon n'est pas touché",
          pick: () => { wipe(); onYes(); } },
      ],
    });
    setActionEnabled(true);
  };

  $("btn-new").onclick = () => confirmReplace(() => startCreate());
  $("btn-resume").onclick = resume;
  $("btn-pantheon").onclick = showPantheon;
  $("btn-mp").onclick = () => confirmReplace(() => mpSetup());
  $("btn-duel").onclick = () => duelOpenLobby();
  $("btn-duel-back").onclick = () => { duelReset(); S && S.p ? backToGame() : boot(); };
  $("btn-duel-leaderboard-back").onclick = () => {
    if (DUEL_LB_REF) { DUEL_LB_REF.off(); DUEL_LB_REF = null; }
    show("screen-duel-lobby");
    worldDrawHome();
  };
  $("btn-world-season-back").onclick = () => { show("screen-duel-lobby"); worldDrawHome(); };

  $("btn-menu").onclick = () => {
    if (!S || !S.p) { boot(); return; }
    ask({
      kicker: "Menu", head: "Que veux-tu faire ?",
      body: `${ENG.name(S.p)}, ${S.p.age} ans · ${DATA.PHASES[S.phase]}. La progression est enregistrée automatiquement.`,
      defer: true, chain: false,
      choices: [
        { h: "Reprendre la partie", d: "Retourner au terrain.", t: "Rien ne change",
          pick: () => { setActionEnabled(true); } },
        { h: "Retour à l'accueil", d: "La carrière reste enregistrée, tu la retrouveras.", t: "Sauvegarde conservée",
          pick: () => { save(); boot(); } },
        { h: "Abandonner cette carrière", d: "Elle sera définitivement effacée.", t: "Action irréversible", danger: true,
          pick: () => {
            ask({
              kicker: "Confirmation", head: "Abandonner définitivement ?",
              body: `${ENG.name(S.p)} disparaîtra. Cette action ne peut pas être annulée.`,
              chain: false,
              choices: [
                { h: "Non, revenir en arrière", d: "", t: "",
                  pick: () => { setActionEnabled(true); } },
                { h: "Oui, effacer cette carrière", d: "", t: "", danger: true,
                  pick: () => { wipe(); S = null; boot(); } },
              ],
            });
          } },
      ],
    });
  };
  $("btn-profile").onclick = () => showProfiles();
  $("btn-profile-back").onclick = () => boot();

  /* le badge de marque ramène à l'accueil depuis n'importe quel écran ;
     la partie est sauvegardée avant de sortir, et on ignore le clic si
     une décision est ouverte pour ne pas la couper au milieu */
  $("brand-corner").onclick = () => {
    if (modalOpen()) return;
    if (S && S.p) save();
    boot();
  };
  $("btn-pantheon-back").onclick = () => (S && S.p && S.phase !== "retired" ? backToGame() : boot());
  $("btn-create-back").onclick = boot;

  /* pas de bouton : on touche le fil, ou la pastille de rappel en bas */
  const handleAdvance = () => {
    if (!S || !S.p) return;
    if (modalOpen()) return;
    if ($("screen-game").classList.contains("hidden")) return;
    if (!TAP_ENABLED) return;
    const next = S.queue[0];
    pump();
    if (!TERMINAL[next]) autoChain();
  };
  $("pane-feed").addEventListener("click", handleAdvance);
  $("tap-hint").addEventListener("click", (e) => { e.stopPropagation(); handleAdvance(); });

  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
      const c = document.querySelector(".console");
      c.className = "console show-" + t.dataset.tab;
    };
  });
  document.querySelector(".console").className = "console show-feed";

  window.addEventListener("resize", () => { if (S) drawArc(); });
});
