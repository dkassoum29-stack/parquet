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
  DUEL.scheduleMpCloudPush();
};

DUEL.createCharacter = function (name, positionId) {
  const p = DUEL.quickAvatar(name, positionId);
  p.teamId = null;
  p.badges = [];
  DUEL.setCharacter(p);
  DUEL.setAlias(ENG.name(p));
  return p;
};

/* ═══════════════ rang (façon REP NBA 2K) ═══════════════
   Paliers lisibles au-dessus de la cote numérique — purement cosmétique,
   ne débloque rien. Chaque palier a sa couleur et une progression
   visible vers le suivant (barre affichée par l'UI). */
DUEL.RANK_TIERS = [
  { id: "rookie",  label: "Rookie",    min: 0,   max: 100, color: "var(--text-3)" },
  { id: "starter", label: "Titulaire", min: 100, max: 150, color: "var(--gain)" },
  { id: "pro",     label: "Pro",       min: 150, max: 200, color: "var(--teal)" },
  { id: "allstar", label: "All-Star",  min: 200, max: 260, color: "var(--leather)" },
  { id: "elite",   label: "Élite",     min: 260, max: 320, color: "var(--gold)" },
  { id: "legend",  label: "Légende",   min: 320, max: Infinity, color: "var(--grape)" },
];

DUEL.rankInfo = function (rating) {
  const r = rating || 0;
  let tier = DUEL.RANK_TIERS[0], idx = 0;
  DUEL.RANK_TIERS.forEach((t, i) => { if (r >= t.min) { tier = t; idx = i; } });
  const next = DUEL.RANK_TIERS[idx + 1];
  const progress = next ? Math.max(0, Math.min(1, (r - tier.min) / (tier.max - tier.min))) : 1;
  return { label: tier.label, color: tier.color, progress, next: next ? next.label : null, rating: r };
};

DUEL.rankLabel = function (rating) { return DUEL.rankInfo(rating).label; };

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

/* Le SDK Firebase (3 scripts externes + config) n'est plus chargé au
   boot du site : il ne sert qu'au monde multijoueur, donc on ne paie
   son poids que si le joueur y entre vraiment. Chargement séquentiel
   (firebase-app doit exister avant les compat auth/database) via une
   promesse mise en cache pour ne le déclencher qu'une fois. */
DUEL._sdkPromise = null;
DUEL.loadFirebaseSDK = function () {
  if (DUEL._sdkPromise) return DUEL._sdkPromise;
  if (DUEL.ready()) { DUEL._sdkPromise = Promise.resolve(); return DUEL._sdkPromise; }
  const urls = [
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js",
    "firebase-config.js",
  ];
  const loadOne = (src) => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  DUEL._sdkPromise = urls.reduce((p, src) => p.then(() => loadOne(src)), Promise.resolve());
  return DUEL._sdkPromise;
};

DUEL.initFirebase = function () {
  if (DUEL.db) return;
  if (!DUEL.ready()) throw new Error("Firebase non configuré");
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  DUEL.db = firebase.database();
};

/* onError optionnel : si l'auth anonyme de base échoue, la plupart des
   appelants (salons, classement…) n'ont rien de mieux à faire que
   réessayer plus tard donc l'ignorent — mais DUEL.linkGoogle en a
   besoin pour ne pas laisser le joueur devant une fenêtre « Connexion
   en cours… » qui ne se refermera jamais.

   Au chargement de la page, Firebase met un instant à relire la
   session persistée (IndexedDB) — tant que ce premier événement n'est
   pas arrivé, `signInAnonymously()` ne sait pas encore qu'une session
   Google déjà reliée existe. Appeler `signInAnonymously()` tout de
   suite, sans attendre ce premier événement, créait donc une toute
   nouvelle session anonyme à chaque rechargement et écrasait la
   session Google déjà reliée — obligeant à se reconnecter à chaque
   fois alors que le lien avait pourtant été fait (constaté en usage
   réel le 2026-08-15 : la connexion tient tant que l'onglet reste
   ouvert, mais saute au moindre redémarrage). On attend maintenant ce
   premier événement ; si (et seulement si) il n'y a vraiment aucune
   session à restaurer, on crée l'anonyme. */
DUEL.ensureAuth = function (cb, onError) {
  DUEL.initFirebase();
  if (DUEL.uid) { cb(DUEL.uid); return; }
  let resolved = false;
  firebase.auth().onAuthStateChanged((u) => {
    if (u) { DUEL.uid = u.uid; cb(u.uid); return; }
    if (resolved) return;
    resolved = true;
    firebase.auth().signInAnonymously().catch((e) => { console.error("Auth duel :", e); onError && onError(e); });
  });
};

/* Identité "carrière multijoueur". Jusqu'ici classement, pseudo, amis
   et défis étaient tous rangés sous le seul uid Firebase — donc
   partagés par tous les profils locaux du même appareil/compte : un
   tout nouveau personnage multijoueur héritait des victoires/défaites
   d'un profil complètement différent (constaté en usage réel le
   2026-08-15). Clé composite uid+profil : chaque profil a maintenant
   sa propre carrière multijoueur, même sous le même compte Google. */
DUEL.playerKey = function (uid) {
  const u = uid || DUEL.uid;
  const pid = (typeof PROFILE !== "undefined" && PROFILE.activeId) ? PROFILE.activeId() : null;
  return pid ? u + "__" + pid : u;
};

/* ═══════════════ Compte Google ═══════════════
   Le joueur reste d'abord authentifié anonymement (ensureAuth) : se
   connecter avec Google ne crée pas un nouveau compte, ça relie
   l'identité Google à l'uid anonyme déjà utilisé pour son personnage,
   son classement et ses amis — rien n'est perdu. */
DUEL.googleLinkedInfo = function () {
  /* le logo 🏀 (compte) peut être cliqué avant même que le SDK
     Firebase soit chargé (il est lazy, voir loadFirebaseSDK) : à ce
     stade `firebase` peut exister sans qu'aucune app par défaut ne
     soit encore initialisée, et firebase.auth() lève alors une
     exception plutôt que de renvoyer un état vide. */
  if (!DUEL.ready() || typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
  const u = firebase.auth().currentUser;
  if (!u) return null;
  const g = u.providerData.find((p) => p.providerId === "google.com");
  return g ? { email: g.email, name: g.displayName } : null;
};

/* uid du compte Google relié, ou null — sert à PROFILE pour savoir à
   quel compte rattacher un profil créé pendant qu'on est connecté
   (voir PROFILE.currentGoogleUid, profile.js). */
DUEL.googleLinkedUid = function () {
  if (!DUEL.ready() || typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
  const u = firebase.auth().currentUser;
  if (!u) return null;
  const g = u.providerData.find((p) => p.providerId === "google.com");
  return g ? u.uid : null;
};

/* Retire le lien Google de cet appareil (utile pour tester avec un
   autre compte, ou repartir à zéro) — ne touche jamais aux profils
   locaux ni à la progression, qui restent sur l'appareil comme avant
   tout lien. Une fois déconnecté, on rouvre tout de suite une session
   anonyme fraîche pour que le monde multijoueur continue de fonctionner
   normalement (classement, salons…), simplement plus reliée à personne. */
DUEL.signOutGoogle = function (cb) {
  if (!DUEL.ready() || typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) { cb && cb(); return; }
  firebase.auth().signOut().then(() => {
    DUEL.uid = null;
    DUEL.ensureAuth(() => cb && cb(), () => cb && cb());
  }).catch(() => cb && cb());
};

/* Ce compte Google est déjà relié à un autre uid Firebase — un autre
   appareil, ou une session anonyme antérieure sur celui-ci — donc le
   lien échoue avec credential-already-in-use. Plutôt que de laisser
   le joueur bloqué sans solution (« il n'y a pas moyen de se
   connecter à un compte existant »), on bascule directement dessus :
   il suffit de se connecter avec ce credential pour adopter cet uid
   existant. reconcileWithCloud (appelé juste après par l'appelant)
   rapatriera ensuite ses carrières sur cet appareil, avec le même
   mécanisme de fusion par horodatage qu'une resynchro multi-appareils
   normale.
   `sentCredential` (celui qu'on vient de construire nous-mêmes dans
   linkGoogle, pas `e.credential`) : avec un credential Google monté à
   la main depuis un jeton GIS (plutôt qu'obtenu via le popup natif de
   Firebase), Firebase ne réattache pas toujours le credential sur
   l'erreur — s'appuyer dessus laissait la connexion échouer en silence
   avec `credential-already-in-use` malgré ce garde-fou (observé en
   usage réel le 2026-08-15). */
DUEL._adoptExistingCredential = function (e, sentCredential, cb) {
  if (e.code !== "auth/credential-already-in-use") { cb(e); return; }
  const cred = e.credential || sentCredential;
  if (!cred) { console.error("Adoption Google : ni e.credential ni le credential envoyé ne sont disponibles.", e); cb(e); return; }
  firebase.auth().signInWithCredential(cred)
    .then((result) => { DUEL.uid = result.user.uid; cb(null, { email: result.user.email, name: result.user.displayName, switched: true }); })
    .catch((e2) => {
      console.error("Adoption Google (signInWithCredential) a échoué :", e2);
      cb({ code: "auth/adopt-failed", detail: e2.code || (e2.message || "").slice(0, 60) });
    });
};

/* Google Identity Services (accounts.google.com/gsi/client), chargé à
   la demande comme le SDK Firebase. Remplace linkWithPopup/
   linkWithRedirect : ceux-ci passent par le domaine de connexion de
   Firebase (parquet-duel.firebaseapp.com), un détour que la protection
   anti-traçage de Safari bloque sur iPhone (popup ET redirection étaient
   concernées, confirmé en usage réel) — le résultat de connexion se
   perdait en route sans jamais revenir. GIS parle en direct avec
   accounts.google.com, sans repasser par ce domaine intermédiaire. */
DUEL._gisPromise = null;
DUEL.loadGoogleIdentity = function () {
  if (DUEL._gisPromise) return DUEL._gisPromise;
  if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
    DUEL._gisPromise = Promise.resolve(true);
    return DUEL._gisPromise;
  }
  DUEL._gisPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return DUEL._gisPromise;
};
DUEL._gisReady = function () {
  return typeof google !== "undefined" && !!(google.accounts && google.accounts.oauth2);
};

/* La fenêtre Google (requestAccessToken) doit s'ouvrir dans le même
   tick que le clic du joueur pour ne pas être bloquée par Safari —
   c'est pourquoi openAccountMenu() précharge le SDK Firebase, GIS et
   l'auth anonyme dès l'ouverture du menu Compte, pas seulement au
   clic sur "Se connecter". */
DUEL.linkGoogle = function (cb) {
  if (typeof GOOGLE_WEB_CLIENT_ID === "undefined" || !GOOGLE_WEB_CLIENT_ID) { cb({ code: "auth/operation-not-allowed" }); return; }
  if (!DUEL._gisReady()) { cb({ code: "auth/internal-error", message: "Google Identity Services non chargé" }); return; }
  DUEL.ensureAuth(() => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: "openid email profile",
      callback: (resp) => {
        if (!resp || resp.error || !resp.access_token) { cb({ code: "auth/popup-closed-by-user" }); return; }
        const credential = firebase.auth.GoogleAuthProvider.credential(null, resp.access_token);
        firebase.auth().currentUser.linkWithCredential(credential)
          .then((result) => cb(null, { email: result.user.email, name: result.user.displayName }))
          .catch((e) => DUEL._adoptExistingCredential(e, credential, cb));
      },
      error_callback: (err) => {
        const t = err && err.type;
        if (t === "popup_closed" || t === "user_logout_or_cancel") { cb({ code: "auth/popup-closed-by-user" }); return; }
        if (t === "popup_failed_to_open") { cb({ code: "auth/popup-blocked" }); return; }
        cb({ code: "auth/internal-error", message: (err && err.message) || t });
      },
    });
    client.requestAccessToken();
  }, (e) => cb(e));
};

DUEL.seatPayload = function (uid, p) {
  return {
    uid, playerKey: DUEL.playerKey(uid), name: ENG.name(p), ovr: ENG.ovr(p), attrs: p.attrs,
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

/* ═══════════════ boutique (jetons + cosmétiques, multijoueur) ═══════════════
   Monnaie et possessions purement locales (pas de Firebase, pas de
   nouvelle règle à publier) : des jetons gagnés à chaque match, dépensés
   sur quatre familles d'objets cosmétiques — thèmes de couleur pour la
   carte profil, emblèmes affichés à côté du nom, titres, et taunts en
   plus pour le chambrage. Thèmes/emblèmes/titres s'équipent un par un ;
   les taunts s'accumulent tous dans le même pool. */
DUEL.TOKENS_KEY = "mp_tokens_v1";
DUEL.OWNED_KEY = "mp_owned_v1";
DUEL.EQUIP_KEYS = { theme: "mp_theme_v1", emblem: "mp_emblem_v1", title: "mp_title_v1" };

/* Repart complètement de zéro sur le personnage multijoueur de CE
   profil : perso, jetons, cosmétiques possédés/équipés, pseudo local —
   tout ce qui est purement local (voir plus haut). Plus radical que
   « Nouveau joueur » (qui recrée juste l'avatar sans toucher jetons ni
   boutique) — pensé pour repartir vraiment à zéro en test. Ne touche
   jamais au classement public (parquet_leaderboard) ni aux amis/défis. */
DUEL.resetCharacter = function () {
  [DUEL.CHARACTER_KEY, DUEL.TOKENS_KEY, DUEL.OWNED_KEY,
   DUEL.EQUIP_KEYS.theme, DUEL.EQUIP_KEYS.emblem, DUEL.EQUIP_KEYS.title,
   "duel_alias_v1"].forEach((k) => {
    try { localStorage.removeItem(PROFILE.key(k)); } catch (e) {}
  });
};

DUEL.SHOP_ITEMS = [
  /* — thèmes de couleur (carte profil), façon tirages 2K MyTEAM —
     chacun a sa vraie finition dans parquet.css (.hero-theme-*), pas
     juste une couleur : color ici sert seulement de teinte pour la
     puce de la liste boutique et la bordure de la carte jetons. */
  { id: "theme-corail",    type: "theme", label: "Aube Corail",         cost: 90,  color: "#FF8B6B" },
  { id: "theme-chrome",    type: "theme", label: "Chrome Platine",      cost: 110, color: "#AEB4B8" },
  { id: "theme-emeraude",  type: "theme", label: "Émeraude Franchise",  cost: 130, color: "#2E9E68" },
  { id: "theme-sang",      type: "theme", label: "Sang Écarlate",       cost: 150, color: "#B32B2B" },
  { id: "theme-ambre",     type: "theme", label: "Ambre Prestige",      cost: 170, color: "#E2622C" },
  { id: "theme-neon",      type: "theme", label: "Néon Rétro",          cost: 190, color: "#10A0A0" },
  { id: "theme-glacier",   type: "theme", label: "Glacier Diamant",     cost: 210, color: "#10A0A0" },
  { id: "theme-onyx",      type: "theme", label: "Onyx Élite",          cost: 230, color: "#C9C2B4" },
  { id: "theme-amethyste", type: "theme", label: "Améthyste Royale",    cost: 260, color: "#6D4FBE" },
  { id: "theme-opale",     type: "theme", label: "Opale Galactique",    cost: 320, color: "#E3B23C" },

  /* — emblèmes (affichés à côté du nom) — */
  { id: "emblem-goat",   type: "emblem", label: "GOAT",       cost: 30, icon: "🐐" },
  { id: "emblem-fire",   type: "emblem", label: "Feu",        cost: 30, icon: "🔥" },
  { id: "emblem-bolt",   type: "emblem", label: "Éclair",     cost: 30, icon: "⚡" },
  { id: "emblem-eagle",  type: "emblem", label: "Aigle",      cost: 40, icon: "🦅" },
  { id: "emblem-wolf",   type: "emblem", label: "Loup",       cost: 40, icon: "🐺" },
  { id: "emblem-lion",   type: "emblem", label: "Lion",       cost: 40, icon: "🦁" },
  { id: "emblem-wave",   type: "emblem", label: "Vague",      cost: 40, icon: "🌊" },
  { id: "emblem-crown",  type: "emblem", label: "Couronne",   cost: 90, icon: "👑" },
  { id: "emblem-target", type: "emblem", label: "Précision",  cost: 60, icon: "🎯" },
  { id: "emblem-gem",    type: "emblem", label: "Diamant",    cost: 90, icon: "💎" },
  { id: "emblem-snake",  type: "emblem", label: "Serpent",    cost: 50, icon: "🐍" },
  { id: "emblem-shark",  type: "emblem", label: "Requin",     cost: 60, icon: "🦈" },
  { id: "emblem-ninja",  type: "emblem", label: "Ninja",      cost: 60, icon: "🥷" },
  { id: "emblem-skull",  type: "emblem", label: "Tête de mort", cost: 70, icon: "💀" },
  { id: "emblem-rocket", type: "emblem", label: "Fusée",      cost: 70, icon: "🚀" },

  /* — titres (affichés sous le nom) — */
  { id: "title-clutch",   type: "title", label: "Le Clutch" ,          cost: 60 },
  { id: "title-sniper",   type: "title", label: "Sniper" ,             cost: 60 },
  { id: "title-metro",    type: "title", label: "Le Métronome" ,       cost: 70 },
  { id: "title-wall",     type: "title", label: "Mur Défensif" ,       cost: 70 },
  { id: "title-ghost",    type: "title", label: "Fantôme" ,            cost: 80 },
  { id: "title-prodige",  type: "title", label: "Le Prodige" ,         cost: 80 },
  { id: "title-king",     type: "title", label: "Roi du Parquet" ,     cost: 130 },
  { id: "title-tank",     type: "title", label: "L'Increvable" ,       cost: 90 },
  { id: "title-surgeon",  type: "title", label: "Le Chirurgien" ,      cost: 100 },
  { id: "title-bucket",   type: "title", label: "Machine à Buckets" ,  cost: 110 },

  /* — taunts (chambrage, Ami / Aléatoire) — */
  { id: "taunt-1",  type: "taunt", label: "« Ez »",              cost: 40,  text: "Ez 🧊" },
  { id: "taunt-2",  type: "taunt", label: "« Encore ? »",        cost: 40,  text: "Encore ? 🔁" },
  { id: "taunt-3",  type: "taunt", label: "« T'es debout ? »",   cost: 60,  text: "T'es encore debout ? 😤" },
  { id: "taunt-4",  type: "taunt", label: "« GG mais non »",     cost: 60,  text: "GG... mais non 🙃" },
  { id: "taunt-5",  type: "taunt", label: "« Nice try »",        cost: 50,  text: "Nice try 😏" },
  { id: "taunt-6",  type: "taunt", label: "« Revanche ? »",      cost: 50,  text: "Tu veux une revanche ? 🔁" },
  { id: "taunt-7",  type: "taunt", label: "« C'est tout ? »",    cost: 50,  text: "C'est tout ce que t'as ? 🤨" },
  { id: "taunt-8",  type: "taunt", label: "« Assieds-toi »",     cost: 70,  text: "Assieds-toi 🪑" },
  { id: "taunt-9",  type: "taunt", label: "« Au suivant »",      cost: 70,  text: "Merci, au suivant 👋" },
  { id: "taunt-10", type: "taunt", label: "« Régal »",           cost: 60,  text: "Un régal 🍽️" },
  { id: "taunt-11", type: "taunt", label: "« On refait ça ? »",  cost: 60,  text: "On se refait ça quand tu veux 😌" },
  { id: "taunt-12", type: "taunt", label: "« Petit joueur »",    cost: 80,  text: "Petit joueur 😴" },
];

DUEL.getTokens = function () {
  try { return parseInt(localStorage.getItem(PROFILE.key(DUEL.TOKENS_KEY)) || "0", 10) || 0; }
  catch (e) { return 0; }
};

DUEL.addTokens = function (n) {
  const v = Math.max(0, DUEL.getTokens() + n);
  try { localStorage.setItem(PROFILE.key(DUEL.TOKENS_KEY), String(v)); } catch (e) {}
  DUEL.scheduleMpCloudPush();
  return v;
};

DUEL.getOwned = function () {
  try { return JSON.parse(localStorage.getItem(PROFILE.key(DUEL.OWNED_KEY)) || "[]"); }
  catch (e) { return []; }
};

DUEL.isOwned = function (id) { return DUEL.getOwned().includes(id); };

DUEL.getEquipped = function (type) {
  try { return localStorage.getItem(PROFILE.key(DUEL.EQUIP_KEYS[type])) || "default"; }
  catch (e) { return "default"; }
};

DUEL.setEquipped = function (type, id) {
  try { localStorage.setItem(PROFILE.key(DUEL.EQUIP_KEYS[type]), id); } catch (e) {}
  DUEL.syncCosmetics();
  DUEL.scheduleMpCloudPush();
};

/* Publie les cosmétiques équipés sur l'entrée du classement (nœud déjà
   autorisé, aucune règle Firebase supplémentaire à publier) — c'est ce
   qui permet à un autre joueur de les voir sur ton profil. Best-effort :
   si ça échoue (hors ligne, pas encore de personnage…), tant pis, le
   prochain DUEL.recordResult les republiera de toute façon. */
DUEL.syncCosmetics = function () {
  if (!DUEL.ready() || !DUEL.uid) return;
  DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${DUEL.playerKey()}`).update({
    theme: DUEL.getEquipped("theme"),
    emblem: DUEL.getEquipped("emblem"),
    title: DUEL.getEquipped("title"),
  }).catch(() => {});
};

/* alias conservés pour compat (le thème était le premier objet équipable) */
DUEL.getTheme = function () { return DUEL.getEquipped("theme"); };
DUEL.setTheme = function (id) { DUEL.setEquipped("theme", id); };

DUEL.themeColorFor = function (id) {
  const item = DUEL.SHOP_ITEMS.find((i) => i.id === id && i.type === "theme");
  return item ? item.color : "var(--gain)";
};
DUEL.emblemIconFor = function (id) {
  const item = DUEL.SHOP_ITEMS.find((i) => i.id === id && i.type === "emblem");
  return item ? item.icon : "";
};
DUEL.titleTextFor = function (id) {
  const item = DUEL.SHOP_ITEMS.find((i) => i.id === id && i.type === "title");
  return item ? item.label : "";
};

DUEL.themeColor = function () { return DUEL.themeColorFor(DUEL.getEquipped("theme")); };
DUEL.emblemIcon = function () { return DUEL.emblemIconFor(DUEL.getEquipped("emblem")); };
DUEL.titleText = function () { return DUEL.titleTextFor(DUEL.getEquipped("title")); };

DUEL.buyItem = function (id) {
  const item = DUEL.SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return { ok: false, msg: "Objet introuvable." };
  if (DUEL.isOwned(id)) return { ok: false, msg: "Déjà possédé." };
  if (DUEL.getTokens() < item.cost) return { ok: false, msg: "Pas assez de jetons." };
  DUEL.addTokens(-item.cost);
  const owned = DUEL.getOwned();
  owned.push(id);
  try { localStorage.setItem(PROFILE.key(DUEL.OWNED_KEY), JSON.stringify(owned)); } catch (e) {}
  if (DUEL.EQUIP_KEYS[item.type]) DUEL.setEquipped(item.type, id);
  return { ok: true };
};

/* ═══════════════ synchro cloud du personnage multijoueur (compte Google) ═══════════════
   Même principe que PROFILE.reconcileWithCloud pour la carrière solo
   (voir profile.js) mais pour le personnage multijoueur, ses jetons et
   ses cosmétiques — jusqu'ici purement locaux, donc perdus en changeant
   d'appareil même une fois connecté avec le même compte Google. Un
   instantané par compte local (id PROFILE), sous
   parquet_mp_characters/<uid>/<idCompte>. */
DUEL.CHARACTER_CLOUD_ROOT = "parquet_mp_characters";

const mpSyncKey = (id) => "parquet_mp_sync_v1__" + id;
DUEL.mpTouchedNow = function (id, ts) {
  try { localStorage.setItem(mpSyncKey(id), String(ts || Date.now())); } catch (e) {}
};
DUEL.mpLastTouched = function (id) {
  try { return Number(localStorage.getItem(mpSyncKey(id))) || 0; } catch (e) { return 0; }
};

DUEL._mpKey = function (base, id) { return "parquet_" + base + (id ? "__" + id : ""); };

DUEL.mpSnapshot = function (id) {
  let character = null, tokens = 0, owned = [];
  try { character = JSON.parse(localStorage.getItem(DUEL._mpKey(DUEL.CHARACTER_KEY, id)) || "null"); } catch (e) {}
  try { tokens = parseInt(localStorage.getItem(DUEL._mpKey(DUEL.TOKENS_KEY, id)) || "0", 10) || 0; } catch (e) {}
  try { owned = JSON.parse(localStorage.getItem(DUEL._mpKey(DUEL.OWNED_KEY, id)) || "[]"); } catch (e) {}
  if (!character && !tokens && !owned.length) return null;
  const theme = localStorage.getItem(DUEL._mpKey(DUEL.EQUIP_KEYS.theme, id)) || "default";
  const emblem = localStorage.getItem(DUEL._mpKey(DUEL.EQUIP_KEYS.emblem, id)) || "default";
  const title = localStorage.getItem(DUEL._mpKey(DUEL.EQUIP_KEYS.title, id)) || "default";
  return { character, tokens, owned, theme, emblem, title, updatedAt: DUEL.mpLastTouched(id) || Date.now() };
};

DUEL.mpApplySnapshot = function (id, snap) {
  try {
    if (snap.character) localStorage.setItem(DUEL._mpKey(DUEL.CHARACTER_KEY, id), JSON.stringify(snap.character));
    localStorage.setItem(DUEL._mpKey(DUEL.TOKENS_KEY, id), String(snap.tokens || 0));
    localStorage.setItem(DUEL._mpKey(DUEL.OWNED_KEY, id), JSON.stringify(snap.owned || []));
    localStorage.setItem(DUEL._mpKey(DUEL.EQUIP_KEYS.theme, id), snap.theme || "default");
    localStorage.setItem(DUEL._mpKey(DUEL.EQUIP_KEYS.emblem, id), snap.emblem || "default");
    localStorage.setItem(DUEL._mpKey(DUEL.EQUIP_KEYS.title, id), snap.title || "default");
  } catch (e) {}
  DUEL.mpTouchedNow(id, snap.updatedAt);
  if (PROFILE.activeId() === id) DUEL.syncCosmetics();
};

DUEL.pushMpToCloud = function (id, cb) {
  if (!DUEL.ready()) { cb && cb(false); return; }
  DUEL.ensureAuth((uid) => {
    const snap = DUEL.mpSnapshot(id);
    if (!snap) { cb && cb(false); return; }
    snap.updatedAt = Date.now();
    DUEL.db.ref(DUEL.CHARACTER_CLOUD_ROOT + "/" + uid + "/" + id).set(snap)
      .then(() => { DUEL.mpTouchedNow(id, snap.updatedAt); cb && cb(true); })
      .catch(() => cb && cb(false));
  });
};

/* regroupe les écritures rapprochées (recordResult, achats boutique…)
   en un seul envoi, même motif que PROFILE.scheduleCloudPush. */
let DUEL_MP_PUSH_T = null;
DUEL.scheduleMpCloudPush = function () {
  if (typeof PROFILE === "undefined" || !PROFILE.wasGoogleLinked()) return;
  const id = PROFILE.activeId();
  if (!id) return;
  clearTimeout(DUEL_MP_PUSH_T);
  DUEL_MP_PUSH_T = setTimeout(() => DUEL.pushMpToCloud(id, () => {}), 2500);
};

/* même logique que PROFILE.reconcileWithCloud : ce que le cloud seul
   connaît est téléchargé, ce que cet appareil seul connaît est envoyé,
   un vrai conflit (versions différentes des deux côtés) est signalé
   plutôt qu'écrasé en silence. */
DUEL.reconcileMpWithCloud = function (cb) {
  if (!DUEL.ready()) { cb && cb({ error: "unavailable" }); return; }
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(DUEL.CHARACTER_CLOUD_ROOT + "/" + uid).once("value")
      .then((snap) => {
        const cloud = snap.val() || {};
        const localIds = PROFILE.list().map((p) => p.id);
        const pulled = [], pushed = [], conflicts = [];

        Object.keys(cloud).forEach((id) => {
          const cSnap = cloud[id];
          const localSnap = DUEL.mpSnapshot(id);
          if (!localSnap) { DUEL.mpApplySnapshot(id, cSnap); pulled.push(id); return; }
          const localAt = DUEL.mpLastTouched(id);
          const cloudAt = cSnap.updatedAt || 0;
          if (cloudAt > localAt + 2000) {
            const prof = PROFILE.list().find((p) => p.id === id);
            conflicts.push({ id, cloudAt, localAt, cSnap, kind: "character",
              name: (prof ? prof.name : "ce compte") + " (multijoueur)" });
          }
        });

        localIds.forEach((id) => {
          if (!cloud[id] && DUEL.mpSnapshot(id)) { DUEL.pushMpToCloud(id, () => {}); pushed.push(id); }
        });

        cb && cb({ pulled, pushed, conflicts });
      })
      .catch((e) => cb && cb({ error: e.message }));
  });
};

DUEL.availableTaunts = function () {
  const owned = DUEL.getOwned();
  const extra = DUEL.SHOP_ITEMS.filter((i) => i.type === "taunt" && owned.includes(i.id)).map((i) => i.text);
  return DUEL.TAUNTS.concat(extra);
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

/* ═══════════════ unicité des pseudos ═══════════════
   Registre séparé nom→uid (parquet_names), indépendant du classement
   qui lui n'existe qu'après un premier match. Transaction Firebase :
   le nom n'est accordé que si libre ou déjà à moi. */
DUEL.NAMES_ROOT = "parquet_names";

DUEL.normalizeName = function (name) {
  return (name || "").trim().toLowerCase();
};

DUEL.reserveName = function (name, cb) {
  DUEL.ensureAuth((uid) => {
    const key = DUEL.normalizeName(name);
    if (!key) { cb(false, "Entre un nom d'abord."); return; }
    const pk = DUEL.playerKey(uid);
    const prevKey = DUEL.normalizeName(DUEL.getAlias());
    DUEL.db.ref(`${DUEL.NAMES_ROOT}/${key}`).transaction(
      (cur) => (cur === null || cur.playerKey === pk) ? { uid, playerKey: pk, name } : undefined,
      (error, committed) => {
        /* Si le nœud parquet_names n'a pas encore de règles publiées
           (permission_denied), on n'empêche pas la création du perso —
           l'unicité redevient simplement best-effort le temps que les
           règles Firebase soient ajoutées. */
        if (error) { console.warn("Réservation de pseudo indisponible :", error); cb(true); return; }
        if (!committed) { cb(false, "Ce nom est déjà pris, choisis-en un autre."); return; }
        if (prevKey && prevKey !== key) {
          DUEL.db.ref(`${DUEL.NAMES_ROOT}/${prevKey}`).transaction(
            (cur) => (cur && cur.playerKey === pk) ? null : cur
          );
        }
        cb(true);
      }
    );
  });
};

/* ═══════════════ amis ═══════════════
   Liste à sens unique par joueur (comme des contacts), résolue via
   parquet_names — pas besoin que l'autre accepte. Permet de le défier
   directement : ça crée un salon et dépose une « invitation » dans
   son propre coin (parquet_challenges), qu'il voit s'il est sur
   l'accueil du monde multijoueur au même moment. */
DUEL.FRIENDS_ROOT = "parquet_friends";
DUEL.CHALLENGES_ROOT = "parquet_challenges";
DUEL._friendsRef = null;
DUEL._challengeRef = null;

DUEL.addFriend = function (name, cb) {
  DUEL.ensureAuth((uid) => {
    const key = DUEL.normalizeName(name);
    if (!key) { cb(false, "Entre un pseudo d'abord."); return; }
    const myKey = DUEL.playerKey(uid);
    DUEL.db.ref(`${DUEL.NAMES_ROOT}/${key}`).get().then((snap) => {
      const v = snap.val();
      if (!v) { cb(false, "Aucun joueur avec ce pseudo."); return; }
      const friendKey = v.playerKey || v.uid;
      if (friendKey === myKey) { cb(false, "C'est ton propre pseudo."); return; }
      DUEL.db.ref(`${DUEL.FRIENDS_ROOT}/${myKey}/${friendKey}`).set({
        name: v.name, addedAt: firebase.database.ServerValue.TIMESTAMP,
      }).then(() => cb(true)).catch(() => cb(false, "Erreur réseau, réessaie."));
    }).catch(() => cb(false, "Erreur réseau, réessaie."));
  });
};

DUEL.removeFriend = function (friendKey) {
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(`${DUEL.FRIENDS_ROOT}/${DUEL.playerKey(uid)}/${friendKey}`).remove();
  });
};

DUEL.listenFriends = function (cb) {
  DUEL.ensureAuth((uid) => {
    if (DUEL._friendsRef) DUEL._friendsRef.off();
    DUEL._friendsRef = DUEL.db.ref(`${DUEL.FRIENDS_ROOT}/${DUEL.playerKey(uid)}`);
    DUEL._friendsRef.on("value", (snap) => {
      const v = snap.val() || {};
      cb(Object.keys(v).map((fKey) => ({ key: fKey, name: v[fKey].name })));
    });
  });
};

DUEL.stopListenFriends = function () {
  if (DUEL._friendsRef) { DUEL._friendsRef.off(); DUEL._friendsRef = null; }
};

DUEL.challengeFriend = function (friendKey, avatar, cb) {
  DUEL.ensureAuth((uid) => {
    DUEL.createRoom(avatar, (code, err) => {
      if (!code) { cb(null, err); return; }
      DUEL.db.ref(`${DUEL.CHALLENGES_ROOT}/${friendKey}`).set({
        fromKey: DUEL.playerKey(uid), fromName: DUEL.getAlias() || ENG.name(avatar), code,
        at: firebase.database.ServerValue.TIMESTAMP,
      });
      cb(code, null);
    });
  });
};

DUEL.listenChallenges = function (cb) {
  DUEL.ensureAuth((uid) => {
    if (DUEL._challengeRef) DUEL._challengeRef.off();
    DUEL._challengeRef = DUEL.db.ref(`${DUEL.CHALLENGES_ROOT}/${DUEL.playerKey(uid)}`);
    DUEL._challengeRef.on("value", (snap) => { const v = snap.val(); if (v) cb(v); });
  });
};

DUEL.stopListenChallenges = function () {
  if (DUEL._challengeRef) { DUEL._challengeRef.off(); DUEL._challengeRef = null; }
};

DUEL.clearChallenge = function () {
  DUEL.ensureAuth((uid) => { DUEL.db.ref(`${DUEL.CHALLENGES_ROOT}/${DUEL.playerKey(uid)}`).remove(); });
};

/* ═══════════════ badges (multijoueur uniquement, cosmétique) ═══════════════ */
DUEL.awardBadge = function (character, id, label) {
  character.badges = character.badges || [];
  if (character.badges.some((b) => b.id === id)) return false;
  character.badges.push({ id, label, at: Date.now() });
  return true;
};

/* Alimente le classement public, le rang, les badges à palier et les
   jetons — pour les vrais matchs contre une autre personne (Ami /
   Aléatoire) ET, depuis le choix explicite de l'utilisateur, pour les
   matchs de Saison contre l'IA aussi (voir DUEL.recordSeasonResult,
   simple relais vers ici avec des jetons plus modestes). Décision
   assumée : la cote de rang mélange donc désormais résultats contre
   IA et contre de vrais joueurs.

   cb (optionnel) : appelé une fois l'écriture Firebase vraiment
   passée — sans ça, DUEL.getMyProfile appelé juste après (typiquement
   en revenant à l'accueil) pouvait relire l'ancienne cote/V-N-D si la
   lecture arrivait avant que cette écriture asynchrone soit terminée
   (constaté en usage réel : stats pas à jour après un match).

   tokenRates (optionnel) : {win, tie, loss} — permet à
   recordSeasonResult de créditer moins de jetons qu'un vrai match en
   ligne sans dupliquer toute la logique de classement.

   Transaction Firebase plutôt qu'un get() puis un set() séparés : ces
   deux étapes n'étaient pas atomiques, donc enchaîner plusieurs
   matchs rapidement (typiquement en Saison, avec "Simuler" ou
   plusieurs matchs de suite) pouvait faire lire à un match la cote
   d'avant l'écriture du match précédent, puis écraser cette écriture
   avec des chiffres partis de données déjà périmées — une victoire
   entière disparaissait silencieusement du classement (constaté en
   usage réel : les stats ne montaient plus après un match de Saison). */

/* ═══════════════ progression du personnage multijoueur ═══════════════
   Contrairement à la carrière solo (ENG.progress, cycle annuel avec
   déclin lié à l'âge — jamais touché depuis ici, voir note en tête de
   fichier), une progression simple et directe : quelques points
   d'attribut crédités après chaque match compté (tout ce qui passe par
   DUEL.recordResult, donc Ami/Aléatoire ET Saison), mis de côté dans
   une réserve (c.attrPoints) plutôt qu'appliqués automatiquement — le
   joueur choisit lui-même où les mettre (DUEL.spendAttrPoint, écran
   « profil complet » dans app.js). Plafonnés par le potentiel tiré à
   la création (p.potential, même champ que la carrière solo —
   ENG.newPlayer le fixe déjà pour tout personnage multijoueur via
   DUEL.quickAvatar, simplement jamais exploité jusqu'ici). Pèse
   vraiment sur les matchs : DUEL.resolveChoice déplace la probabilité
   de réussite d'environ 0.8 point par point d'attribut, donc quelques
   victoires bien réparties se ressentent en jeu, pas juste sur le
   papier. */
DUEL.MP_GROWTH = { win: 3, tie: 1, loss: 0 };

DUEL.addAttrPoints = function (c, n) {
  if (!c || !(n > 0)) return;
  c.attrPoints = (c.attrPoints || 0) + n;
};

/* Dépense un point de la réserve sur un attribut précis, choisi par le
   joueur — plafonné au potentiel comme la répartition automatique
   l'était. Sauvegarde le personnage elle-même (appelée directement
   depuis un clic, pas depuis DUEL.recordResult). */
DUEL.spendAttrPoint = function (c, attrId) {
  if (!c || !c.attrs || !(c.attrPoints > 0)) return false;
  const cap = ENG.clamp(c.potential || 75, 30, 99);
  if ((c.attrs[attrId] || 0) >= cap) return false;
  c.attrs[attrId] = Math.min(cap, (c.attrs[attrId] || 0) + 1);
  c.attrPoints -= 1;
  DUEL.setCharacter(c);
  return true;
};

/* Retire un point d'un attribut pour le remettre dans la réserve —
   permet de corriger une répartition sans perdre de points au total
   (juste un aller-retour attribut ↔ réserve). */
DUEL.refundAttrPoint = function (c, attrId) {
  if (!c || !c.attrs || !((c.attrs[attrId] || 0) > 0)) return false;
  c.attrs[attrId] -= 1;
  c.attrPoints = (c.attrPoints || 0) + 1;
  DUEL.setCharacter(c);
  return true;
};

DUEL.recordResult = function (won, tie, cb, tokenRates) {
  const rates = tokenRates || { win: 20, tie: 5, loss: 5 };
  DUEL.ensureAuth((uid) => {
    const ref = DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${DUEL.playerKey(uid)}`);
    const c = DUEL.getCharacter();
    let ratingBefore = 100;
    ref.transaction((cur) => {
      const base = cur || { name: DUEL.getAlias() || "Joueur", rating: 100, wins: 0, draws: 0, losses: 0 };
      ratingBefore = base.rating || 100;
      const delta = tie ? 2 : (won ? 15 : -10);
      return {
        name: DUEL.getAlias() || base.name || "Joueur",
        rating: Math.max(0, ratingBefore + delta),
        wins: (base.wins || 0) + (won ? 1 : 0),
        draws: (base.draws || 0) + (tie ? 1 : 0),
        losses: (base.losses || 0) + (!won && !tie ? 1 : 0),
        position: c ? c.position : (base.position || null),
        ovr: c ? ENG.ovr(c) : (base.ovr != null ? base.ovr : null),
        badges: c && c.badges ? c.badges.map((bd) => bd.label || bd) : (base.badges || []),
        theme: DUEL.getEquipped("theme"),
        emblem: DUEL.getEquipped("emblem"),
        title: DUEL.getEquipped("title"),
      };
    }, (error, committed, snapshot) => {
      /* err passé à cb pour affichage direct dans l'UI — trop
         d'échecs silencieux jusqu'ici (impossibles à diagnostiquer
         sans accès à la console du joueur). */
      if (error) { console.error("recordResult (transaction) :", error); cb && cb(error); return; }
      if (!committed) { console.warn("recordResult : transaction non validée (abandonnée)"); cb && cb(new Error("transaction non validée")); return; }
      const final = snapshot ? snapshot.val() : null;
      if (!final) { cb && cb(null); return; }
      /* firebase.database.ServerValue.TIMESTAMP (le sentinel horodatage
         serveur) n'est pas fiable À L'INTÉRIEUR d'une transaction — le
         SDK doit pouvoir recalculer/comparer la valeur localement pour
         gérer les collisions, ce qu'un placeholder résolu côté serveur
         seulement empêche. Utilisé là, il pouvait faire échouer toute
         l'écriture en silence (constaté en usage réel : le nœud
         parquet_leaderboard n'était même plus créé après un match). Un
         update() séparé, hors transaction, n'a pas cette restriction. */
      ref.update({ updatedAt: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
      /* Toujours attribué (même palier bronze) : c'est ce badge, pas
         le palier affiché plus haut, qui débloque le coup signature
         via DUEL.signatureUsesForCharacter — voir plus bas. */
      let badgeGained = false;
      if (final.wins >= 10 && c && DUEL.awardBadge(c, "wins10", "10 victoires")) badgeGained = true;
      const pointsEarned = won ? DUEL.MP_GROWTH.win : tie ? DUEL.MP_GROWTH.tie : DUEL.MP_GROWTH.loss;
      if (c && pointsEarned > 0) DUEL.addAttrPoints(c, pointsEarned);
      if (c && (badgeGained || pointsEarned > 0)) DUEL.setCharacter(c);
      /* Jetons de boutique : un peu à chaque match, un bonus si le
         palier de rang change (façon Rep NBA 2K qui récompense la
         montée de niveau). */
      let earned = tie ? rates.tie : (won ? rates.win : rates.loss);
      if (DUEL.rankInfo(ratingBefore).label !== DUEL.rankInfo(final.rating).label) earned += 50;
      DUEL.addTokens(earned);
      cb && cb(null, pointsEarned > 0 ? pointsEarned : null);
    });
  }, (authErr) => {
    /* si l'auth échoue (réseau, etc.), cb ne partait jamais avant —
       silence total, aucun moyen de savoir pourquoi rien ne s'écrivait. */
    console.error("recordResult (auth) :", authErr);
    cb && cb(authErr);
  });
};

/* Matchs de Saison (contre l'IA) : même classement public/rang/badges
   qu'un vrai match désormais (voir DUEL.recordResult ci-dessus),
   uniquement moins de jetons — pour que grinder l'IA en Saison ne
   rapporte pas autant que de vrais matchs Ami/Aléatoire. */
DUEL.recordSeasonResult = function (won, tie, cb) {
  DUEL.recordResult(won, tie, cb, { win: 8, tie: 4, loss: 2 });
};

DUEL.getMyRating = function (cb) {
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${DUEL.playerKey(uid)}`).get().then((snap) => {
      const v = snap.val();
      cb(v ? (v.rating || 0) : 100);
    }).catch(() => cb(100));
  });
};

/* ═══════════════ badge de victoires à paliers (façon badges 2K) ═══════════════
   Contrairement aux badges événementiels (Sans-faute, Champion de
   conférence), celui-ci n'est jamais « attribué » une fois pour
   toutes : son palier se recalcule à chaque affichage depuis le
   nombre de victoires actuel. */
DUEL.WIN_BADGE_TIERS = [
  { id: "hof",    label: "Hall of Fame", min: 300, color: "var(--grape)" },
  { id: "gold",   label: "Or",           min: 150, color: "var(--gold)" },
  { id: "silver", label: "Argent",       min: 50,  color: "var(--g-300)" },
  { id: "bronze", label: "Bronze",       min: 10,  color: "var(--maple)" },
];

DUEL.winsBadgeTier = function (wins) {
  const w = wins || 0;
  return DUEL.WIN_BADGE_TIERS.find((t) => w >= t.min) || null;
};

/* ═══════════════ profil consultable ═══════════════
   Fusionne l'entrée du classement (publique, par uid) avec le
   personnage local quand c'est le mien — permet de voir son propre
   profil même avant le tout premier match. */
DUEL.buildProfile = function (entry, character, fallbackName) {
  const c = character;
  return {
    name: (entry && entry.name) || fallbackName || (c ? ENG.name(c) : "Joueur"),
    rating: entry ? (entry.rating || 0) : 100,
    wins: entry ? (entry.wins || 0) : 0,
    draws: entry ? (entry.draws || 0) : 0,
    losses: entry ? (entry.losses || 0) : 0,
    position: (entry && entry.position) || (c ? c.position : null),
    ovr: (entry && entry.ovr != null) ? entry.ovr : (c ? ENG.ovr(c) : null),
    badges: (entry && entry.badges) || (c && c.badges ? c.badges.map((bd) => bd.label || bd) : []),
    /* Pour ma propre carte (c fourni), l'équipement local est toujours
       la vérité la plus fraîche — l'entrée du classement n'est qu'un
       miroir public republié après coup (syncCosmetics), qui peut
       traîner d'un battement. Sans ça, rééquiper un thème pouvait
       encore afficher l'ancien sur le classement/profil complet/accueil
       tant que ce miroir n'avait pas rattrapé. Pour la carte de
       quelqu'un d'autre (c absent), l'entrée reste la seule source. */
    theme: (c ? DUEL.getEquipped("theme") : (entry && entry.theme)) || "default",
    emblem: (c ? DUEL.getEquipped("emblem") : (entry && entry.emblem)) || "default",
    title: (c ? DUEL.getEquipped("title") : (entry && entry.title)) || "default",
  };
};

DUEL.getMyProfile = function (cb) {
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${DUEL.playerKey(uid)}`).get().then((snap) => {
      cb(DUEL.buildProfile(snap.val(), DUEL.getCharacter(), DUEL.getAlias()));
    }).catch(() => cb(DUEL.buildProfile(null, DUEL.getCharacter(), DUEL.getAlias())));
  });
};

/* playerKey : la clé composite uid+profil d'un AUTRE joueur (reçue via
   une place de salon ou une entrée d'amis), pas la mienne — donc pas
   DUEL.playerKey() ici, on l'utilise telle quelle. */
DUEL.getProfileByKey = function (playerKey, fallbackName, cb) {
  DUEL.ensureAuth(() => {
    DUEL.db.ref(`${DUEL.LEADERBOARD_ROOT}/${playerKey}`).get().then((snap) => {
      cb(DUEL.buildProfile(snap.val(), null, fallbackName));
    }).catch(() => cb(null));
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
