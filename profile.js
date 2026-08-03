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
