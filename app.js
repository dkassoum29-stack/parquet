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
