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
