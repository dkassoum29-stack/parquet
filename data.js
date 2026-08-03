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
  T("BOS","Boston","Émeraude","E","Atlantique",4,92,"#0E7A4E","#C6A664"),
  T("BKN","Brooklyn","Monarques","E","Atlantique",5,68,"#26262A","#B9B4AC"),
  T("NYK","New York","Empire","E","Atlantique",5,80,"#F0692B","#1D3A8A"),
  T("PHI","Philadelphie","Liberté","E","Atlantique",4,78,"#C8102E","#125BA6"),
  T("TOR","Toronto","Boréal","E","Atlantique",4,72,"#8C2447","#E4DED2"),
  /* — Est / Central — */
  T("CHI","Chicago","Rafale","E","Central",5,82,"#B8202E","#1A1A1A"),
  T("CLE","Cleveland","Fonderie","E","Central",2,70,"#7A2A3E","#E0A03C"),
  T("DET","Détroit","Mécanique","E","Central",3,64,"#1D5AA8","#C8102E"),
  T("IND","Indiana","Vitesse","E","Central",2,69,"#EDB52C","#1B2A5E"),
  T("MIL","Milwaukee","Fauves","E","Central",2,74,"#186B45","#E6DCC0"),
  /* — Est / Sud-Est — */
  T("ATL","Atlanta","Phénix","E","Sud-Est",4,66,"#D62B3E","#F0A02E"),
  T("CHA","Charlotte","Reine","E","Sud-Est",2,56,"#17968B","#5E3E92"),
  T("MIA","Miami","Néon","E","Sud-Est",4,84,"#DE1F7C","#15C0BE"),
  T("ORL","Orlando","Comètes","E","Sud-Est",3,62,"#2183C8","#AEBCC4"),
  T("WAS","Washington","Sénateurs","E","Sud-Est",4,58,"#182F55","#C8102E"),
  /* — Ouest / Nord-Ouest — */
  T("DEN","Denver","Altitude","O","Nord-Ouest",3,79,"#173A69","#EFB53A"),
  T("MIN","Minnesota","Aurore","O","Nord-Ouest",3,65,"#227E90","#6D4FBE"),
  T("OKC","Oklahoma City","Cyclone","O","Nord-Ouest",1,73,"#0E82C4","#E6602F"),
  T("POR","Portland","Cascade","O","Nord-Ouest",2,67,"#C8102E","#141414"),
  T("UTA","Utah","Sommets","O","Nord-Ouest",1,63,"#2F5636","#E4B03C"),
  /* — Ouest / Pacifique — */
  T("GSW","Golden State","Séisme","O","Pacifique",5,90,"#2166BE","#EDB52C"),
  T("LAA","Los Angeles","Astres","O","Pacifique",5,94,"#63329A","#F2C63C"),
  T("LAC","Los Angeles","Corsaires","O","Pacifique",5,64,"#C8102E","#2166BE"),
  T("PHX","Phoenix","Fournaise","O","Pacifique",3,71,"#E4622C","#4E2C79"),
  T("SAC","Sacramento","Ruée","O","Pacifique",3,57,"#63409A","#B9B4AC"),
  /* — Ouest / Sud-Ouest — */
  T("DAL","Dallas","Cavalerie","O","Sud-Ouest",4,76,"#2374BE","#1A2740"),
  T("HOU","Houston","Orbite","O","Sud-Ouest",4,72,"#C8102E","#1F1F1F"),
  T("MEM","Memphis","Delta","O","Sud-Ouest",2,66,"#52779F","#EDB52C"),
  T("NOP","New Orleans","Vaudou","O","Sud-Ouest",2,60,"#16294A","#B58F43"),
  T("SAS","San Antonio","Missions","O","Sud-Ouest",3,86,"#232326","#C6CBCE"),
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
    mods: { midrange:+6, freeThrow:+5, clutch:+5, perimeterD:-4, rep:-0 },
    rep: 5, pot: [75, 95],
    tag: "Tir pur, aucune exposition",
  },
  {
    id: "streetlegend", label: "Légende du tournoi d'été",
    desc: "Ton nom circule dans toute la ville depuis tes quinze ans, mais aucun club officiel ne t'a jamais vu.",
    mods: { handle:+8, passing:+6, athleticism:+4, defense:0, perimeterD:-6, iq:-4 },
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
