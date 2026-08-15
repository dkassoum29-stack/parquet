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

/* uid du compte Google relié en ce moment, ou null si personne n'est
   connecté — délégué à DUEL (duel.js) qui porte la vraie session
   Firebase ; PROFILE ne fait qu'y lire pour savoir à qui rattacher un
   profil. */
PROFILE.currentGoogleUid = function () {
  return (typeof DUEL !== "undefined" && DUEL.googleLinkedUid) ? DUEL.googleLinkedUid() : null;
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
  /* profil créé pendant qu'un compte Google est relié : privé à ce
     compte (invisible aux autres utilisateurs de cet appareil, et à
     ce compte seulement dès qu'il se déconnecte — voir visibleList).
     Créé hors connexion, il reste visible par tout le monde sur cet
     appareil, comme avant cette fonctionnalité. */
  const owner = PROFILE.currentGoogleUid();
  if (owner) prof.ownerUid = owner;
  l.push(prof);
  PROFILE.saveList(l);
  PROFILE.switchTo(id);
  return prof;
};

/* Liste filtrée pour l'affichage : cache les profils privés à un
   autre compte Google que celui relié en ce moment (ou à aucun, si
   personne n'est connecté). Ne jamais utiliser pour la logique interne
   (synchro, suppression…) qui doit voir tous les profils réels de
   l'appareil — seulement pour ce que l'écran des profils propose. */
PROFILE.visibleList = function () {
  const uid = PROFILE.currentGoogleUid();
  return PROFILE.list().filter((p) => !p.ownerUid || p.ownerUid === uid);
};

/* Le profil actif, mais seulement s'il est visible avec la connexion
   actuelle — sinon (compte propriétaire déconnecté) on le traite comme
   s'il n'y avait pas de profil actif du tout, plutôt que de laisser le
   joueur continuer sur un profil qui n'est plus censé lui être montré. */
PROFILE.activeVisible = function () {
  const a = PROFILE.active();
  if (!a || !a.ownerUid) return a;
  return a.ownerUid === PROFILE.currentGoogleUid() ? a : null;
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

/* ═══════════════════════════════════════════════════════════
   SYNCHRONISATION CLOUD (compte Google, facultatif)
   Sans compte Google, tout reste local comme avant — rien ne change.
   Connecté, chaque compte de cet appareil est copié dans Firebase
   (parquet_careers/<uid gmail>/<id du compte>), ce qui permet de le
   retrouver sur un autre appareil connecté au même compte Google.
   Comparaison par horodatage (updatedAt) : la version la plus récente
   l'emporte automatiquement, sauf en cas de vrai conflit (les deux
   appareils ont joué sans se resynchroniser) où on demande à
   l'utilisateur plutôt que d'effacer silencieusement une progression.
   S'appuie sur l'auth Firebase déjà en place pour le monde
   multijoueur (DUEL.ensureAuth/DUEL.db) — même compte, même uid. */
PROFILE.CLOUD_ROOT = "parquet_careers";
PROFILE.CLOUD_FLAG = "parquet_google_linked";

PROFILE.rememberGoogleLinked = function () {
  try { localStorage.setItem(PROFILE.CLOUD_FLAG, "1"); } catch (e) {}
};
PROFILE.forgetGoogleLinked = function () {
  try { localStorage.removeItem(PROFILE.CLOUD_FLAG); } catch (e) {}
};
PROFILE.wasGoogleLinked = function () {
  try { return localStorage.getItem(PROFILE.CLOUD_FLAG) === "1"; } catch (e) { return false; }
};

const syncKey = (id) => "parquet_sync_v1__" + id;
PROFILE.touchedNow = function (id) {
  try { localStorage.setItem(syncKey(id), String(Date.now())); } catch (e) {}
};
PROFILE.lastTouched = function (id) {
  try { return Number(localStorage.getItem(syncKey(id))) || 0; } catch (e) { return 0; }
};

/* état local complet d'un compte, prêt à partir vers le cloud */
PROFILE.snapshot = function (id) {
  const prof = PROFILE.list().find((p) => p.id === id);
  if (!prof) return null;
  let save = null, pantheon = [], meta = null;
  try { save = JSON.parse(localStorage.getItem("parquet_save_v2__" + id) || "null"); } catch (e) {}
  try { pantheon = JSON.parse(localStorage.getItem("parquet_pantheon_v2__" + id) || "[]"); } catch (e) {}
  try { meta = JSON.parse(localStorage.getItem("parquet_meta_v1__" + id) || "null"); } catch (e) {}
  return { profile: prof, save, pantheon, meta, updatedAt: PROFILE.lastTouched(id) || Date.now() };
};

/* remplace l'état local d'un compte par un instantané reçu du cloud.
   ownerUid : uniquement pour un profil qui n'existait pas du tout sur
   cet appareil avant (littéralement « créé » par ce compte, ailleurs)
   — un profil déjà présent ici et juste mis à jour par une résolution
   de conflit ne devient pas rétroactivement privé. */
PROFILE.applySnapshot = function (id, snap, ownerUid) {
  const list = PROFILE.list();
  const i = list.findIndex((p) => p.id === id);
  const prof = Object.assign({}, snap.profile || {}, { id });
  if (ownerUid) prof.ownerUid = ownerUid;
  if (i >= 0) list[i] = prof; else list.push(prof);
  PROFILE.saveList(list);
  try {
    if (snap.save) localStorage.setItem("parquet_save_v2__" + id, JSON.stringify(snap.save));
    else localStorage.removeItem("parquet_save_v2__" + id);
    localStorage.setItem("parquet_pantheon_v2__" + id, JSON.stringify(snap.pantheon || []));
    if (snap.meta) localStorage.setItem("parquet_meta_v1__" + id, JSON.stringify(snap.meta));
  } catch (e) {}
  try { localStorage.setItem(syncKey(id), String(snap.updatedAt || Date.now())); } catch (e) {}
  if (typeof META !== "undefined") META.state = null;
};

PROFILE.pushToCloud = function (id, cb) {
  if (typeof DUEL === "undefined" || !DUEL.ready()) { cb && cb(false); return; }
  DUEL.ensureAuth((uid) => {
    const snap = PROFILE.snapshot(id);
    if (!snap) { cb && cb(false); return; }
    snap.updatedAt = Date.now();
    DUEL.db.ref(PROFILE.CLOUD_ROOT + "/" + uid + "/" + id).set(snap)
      .then(() => { PROFILE.touchedNow(id); cb && cb(true); })
      .catch(() => cb && cb(false));
  });
};

/* appelé après chaque écriture locale (save(), Panthéon, mémoire
   longue) — regroupe les écritures rapprochées en un seul envoi
   plutôt que de spammer Firebase à chaque situation jouée. */
let PROFILE_PUSH_T = null;
PROFILE.scheduleCloudPush = function () {
  if (!PROFILE.wasGoogleLinked()) return;
  const id = PROFILE.activeId();
  if (!id) return;
  clearTimeout(PROFILE_PUSH_T);
  PROFILE_PUSH_T = setTimeout(() => PROFILE.pushToCloud(id, () => {}), 2500);
};

/* Au premier lien (ou à chaque démarrage si déjà lié) : aligne les
   comptes de cet appareil avec le cloud.
   - un compte que le cloud seul connaît  -> téléchargé ici
   - un compte que cet appareil seul connaît -> envoyé au cloud
   - présent des deux côtés avec une version distante nettement plus
     récente -> signalé comme conflit, laissé au choix de l'utilisateur
     (jamais d'écrasement silencieux d'une progression) */
PROFILE.reconcileWithCloud = function (cb) {
  if (typeof DUEL === "undefined" || !DUEL.ready()) { cb && cb({ error: "unavailable" }); return; }
  DUEL.ensureAuth((uid) => {
    DUEL.db.ref(PROFILE.CLOUD_ROOT + "/" + uid).once("value")
      .then((snap) => {
        const cloud = snap.val() || {};
        const local = PROFILE.list();
        const pulled = [], pushed = [], conflicts = [];

        Object.keys(cloud).forEach((id) => {
          const cSnap = cloud[id];
          const existsLocally = local.some((p) => p.id === id);
          if (!existsLocally) { PROFILE.applySnapshot(id, cSnap, uid); pulled.push(id); return; }
          const localAt = PROFILE.lastTouched(id);
          const cloudAt = cSnap.updatedAt || 0;
          if (cloudAt > localAt + 2000) conflicts.push({ id, cloudAt, localAt, cSnap, kind: "career", name: cSnap.profile && cSnap.profile.name });
        });

        local.forEach((p) => { if (!cloud[p.id]) { PROFILE.pushToCloud(p.id, () => {}); pushed.push(p.id); } });

        cb && cb({ pulled, pushed, conflicts });
      })
      .catch((e) => cb && cb({ error: e.message }));
  });
};
