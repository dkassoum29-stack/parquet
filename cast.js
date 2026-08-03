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
