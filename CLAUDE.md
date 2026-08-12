# PARQUET — résumé du projet

Simulateur de carrière NBA façon BitLife, en français, site statique
(HTML/CSS/JS vanilla, sans framework). Déployé sur Vercel (projet
`parquet-hoop-destiny`, repo GitHub `dkassoum29-stack/parquet`).

**Répondre en français dans ce projet.**

## Règle d'or : bundle.js et parquet.min.css

`index.html` charge **`bundle.js`** (chargé avec `defer`) et
**`parquet.min.css`**, jamais les fichiers source directement.
`build.sh` concatène les fichiers JS dans cet ordre : `profile.js
data.js engine.js meta.js cast.js scenarios.js duel.js manga.js
app.js`, puis minifie le résultat avec `terser` (→ `bundle.js`) et
minifie `parquet.css` avec `csso` (→ `parquet.min.css`). Les deux
outils sont des devDependencies locales (`npm install` une fois après
un clone). **Après toute modification d'un `.js` source OU de
`parquet.css`, relancer `./build.sh`** avant de tester ou de commiter —
sinon le site charge l'ancienne version.

Le SDK Firebase (3 scripts `firebasejs` + `firebase-config.js`) n'est
**plus chargé au boot** : `DUEL.loadFirebaseSDK()` (`duel.js`) l'injecte
dynamiquement seulement quand le joueur entre dans le monde
multijoueur (`duelOpenLobby()` dans `app.js`), pour ne pas payer son
poids sur la carrière solo.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app.js` | Tous les écrans/UI — carrière solo ET monde multijoueur (le plus gros fichier) |
| `engine.js` | Simulation de carrière solo : `ENG.newPlayer`, `ENG.simSeason` (formule agrégée, PAS de simulation match par match), draft, standings/playoffs de la carrière solo, + helpers `ENG.world*` pour le mode Saison multijoueur |
| `duel.js` | Moteur du monde multijoueur : personnage persistant, Firebase (salons/queue/classement/amis/défis/pseudos), bibliothèque de situations `DUEL.LIB` (51 actuellement), résolution des choix, rang à paliers, badges à paliers, boutique (jetons + cosmétiques) |
| `data.js` | Données statiques : équipes (`DATA.TEAMS`, conf E/O), postes (`DATA.POSITIONS`: PG/SG/SF/PF/C), attributs, origines, etc. |
| `manga.js` | Panneaux illustrés en SVG procédural (halftone, éclats, lignes de vitesse) pour les résolutions de duel — pas de vraies images |
| `meta.js`, `profile.js`, `cast.js`, `scenarios.js` | Comptes locaux, profils, casting NPC, bibliothèque d'événements de la carrière solo |
| `parquet.css` | Tous les styles, thème clair/sombre, mobile-first |
| `firebase-config.js` | Config Firebase du projet `parquet-duel` — **pas secrète** (Firebase la conçoit pour vivre côté client), volontairement exclue du bundle pour rester modifiable sans rebuild |
| `scripts/generate-situation-images.mjs` | Script pour générer des illustrations par situation via une API externe — nécessite `scripts/.env` (jamais commité, gitignored) |

## Architecture du multijoueur (monde à part, séparé de la carrière solo)

Décision explicite de l'utilisateur : le multijoueur est un monde
séparé (comme MyCareer vs The City dans NBA 2K), pas greffé dans la
carrière solo. Un **personnage multijoueur persistant** (`DUEL.getCharacter`/
`setCharacter`, stocké en `localStorage`) sert pour les trois sous-modes :

- **Saison** : choix de franchise, calendrier léger (2 matchs par
  adversaire de sa conférence, ~28 matchs), playoffs joués au meilleur
  des 3 (bracket top 8, les séries qui ne concernent pas le joueur se
  résolvent seules via `ENG.worldSeriesWin`). Contre l'IA locale
  (`ENG.worldAiAttrs`), aucun salon Firebase nécessaire.
- **Ami** : liste d'amis persistante (ajout par pseudo, résolu via
  `parquet_names`) avec défi direct (`DUEL.challengeFriend` crée le
  salon et dépose une notif temps réel dans `parquet_challenges` de
  l'ami), ou toujours le classique code de salon partagé.
- **Aléatoire** : file d'attente de matchmaking (Firebase).

L'accueil du monde multijoueur (`worldDrawHome`) est organisé en 5
onglets : **Saison / Aléatoire / Ami / Boutique / Profil**, avec une
carte joueur toujours visible en haut (`duelBuildHeroCard`, réutilisée
aussi par l'écran « profil complet ») : nom, emblème, titre, poste, OVR,
5 stats (rang / cote / V-N-D / % victoires / matchs joués), barre de
progression de rang, et une rangée de trophées (un badge = une icône,
pas juste le badge de victoires).

Format de match commun aux trois : 10 situations normales / 12 en
playoffs (coupées en deux mi-temps), compte à rebours de 15s par choix,
lecture de défense (tell), momentum (main chaude/glaciale), fatigue de
mécanique, coup signature (débloqué par badge), commentateur, fiche de
scouting adverse, chambrage (Ami/Aléatoire uniquement, taunts extensibles
via la boutique).

**Important** : `ENG.simSeason` (carrière solo) n'est JAMAIS touché par
le multijoueur — c'est une couche additive à part, pour préserver le
calibrage déjà en place (taux de MVP, draft, etc.). De la même façon,
**`DUEL.recordResult` (classement public, rang, badges à palier) est
réservé aux vrais matchs Ami/Aléatoire** — les matchs de Saison passent
par `DUEL.recordSeasonResult` (jetons seulement) pour ne jamais polluer
le classement PvP avec des résultats IA.

### Rang, badges, boutique (façon NBA 2K MyCareer)

- **Rang** (`DUEL.rankInfo`, `DUEL.RANK_TIERS`) : 6 paliers Rookie →
  Titulaire → Pro → All-Star → Élite → Légende, calculés depuis la cote
  Firebase, avec couleur par palier et barre de progression vers le
  suivant.
- **Badge de victoires à palier** (`DUEL.winsBadgeTier`, calculé en
  direct, pas stocké) : Bronze (10V) → Argent (50V) → Or (150V) → Hall
  of Fame (300V), en plus des badges événementiels classiques
  (Sans-faute, Champion de conférence…).
- **Boutique** (onglet dédié, `duelRenderShop`) : jetons gagnés en
  jouant en ligne (+20V/+5N-D, +50 bonus à chaque changement de rang),
  dépensables sur ~47 objets cosmétiques en 4 familles — thèmes de
  couleur pour la carte, emblèmes, titres, taunts. Thème/emblème/titre
  équipés sont synchronisés sur `parquet_leaderboard` (`DUEL.syncCosmetics`)
  pour être visibles par les autres joueurs, pas seulement en local.

## Firebase

Realtime Database (**pas Firestore**), projet `parquet-duel`. Nœuds :

- `parquet_duels` (salons de match), `parquet_queue` (matchmaking),
  `parquet_leaderboard` (classement général — cote simple +15/-10/+2,
  pas un vrai ELO ; contient aussi position/ovr/badges/theme/emblem/title
  pour que le profil d'un joueur soit consultable par les autres),
  `parquet_names` (registre pseudo→uid pour l'unicité des noms),
  `parquet_friends` (liste d'amis par uid), `parquet_challenges` (défi
  direct entre amis), `parquet_careers` (sauvegarde cloud de la
  carrière solo par uid, voir section Compte Google) : **règles toutes
  publiées** par l'utilisateur (2026-08-12).

## Workflow attendu

- Ne jamais commit sans demande explicite.
- Le mot **"go"** de l'utilisateur = pousser sur `git push origin main`
  immédiatement (Vercel redéploie automatiquement, pas d'étape en plus).
- Preview locale : servir avec `python3 -m http.server` depuis le
  dossier du projet (ou voir `.claude/launch.json`, qui pointe vers un
  mirroir dans le scratchpad — ce chemin change à chaque session, le
  recréer si `preview_start` échoue avec une erreur de dossier introuvable).

## En suspens

- Images de situations (illustrations par action) : script prêt
  (`scripts/generate-situation-images.mjs`) mais le service testé
  (Pollinations.ai) n'a plus de niveau gratuit fonctionnel. Alternatives
  à explorer si demandé : recharger Pollinations, Google AI Studio
  (clé gratuite), ou Stable Diffusion en local.
- Compte Google, y compris pour la carrière solo : code en place.
  **Pas d'icône Google séparée** : le compte s'ouvre via le logo 🏀
  fixe en haut à droite (`brand-corner` dans `index.html`, câblé dans
  `app.js` près de la fin de `boot()`/l'init des écrans) — un clic
  dessus ouvre un tableau de bord (`openAccountMenu` dans `app.js`)
  avec Accueil / Mes profils / Se connecter avec Google, **depuis
  n'importe quel écran**.

  **Connexion via Google Identity Services (GIS), pas le
  popup/redirect Firebase natif.** `linkWithPopup`/`linkWithRedirect`
  ont été abandonnés (2026-08-12) : sur Safari/iOS, la protection
  anti-traçage bloque le transfert de résultat qui passe par le
  domaine de connexion Firebase (`parquet-duel.firebaseapp.com`) —
  confirmé en usage réel, popup ET redirection étaient touchées, la
  connexion ne fonctionnait jamais sur iPhone. `DUEL.linkGoogle`
  (`duel.js`) utilise maintenant `google.accounts.oauth2.initTokenClient`
  (script `accounts.google.com/gsi/client`, chargé à la demande via
  `DUEL.loadGoogleIdentity`) : ça parle en direct avec
  `accounts.google.com`, sans repasser par `firebaseapp.com`. Le jeton
  obtenu est relié au compte Firebase existant via
  `GoogleAuthProvider.credential(null, accessToken)` +
  `linkWithCredential`. Nécessite le **Web client ID** OAuth (Firebase
  Console → Authentication → Sign-in method → Google → Configuration
  du SDK web, ou Google Cloud Console → Identifiants) dans
  `GOOGLE_WEB_CLIENT_ID` (`firebase-config.js`, même fichier que
  `FIREBASE_CONFIG`, même statut non-secret) — **et** ce même client
  OAuth doit avoir le domaine du site (et `localhost` en dev) dans ses
  **Authorized JavaScript origins** côté Google Cloud Console
  (Identifiants → cliquer le client Web → ajouter l'origine), sans
  quoi `requestAccessToken()` échoue — pas encore confirmé fait par
  l'utilisateur, à vérifier si la connexion échoue encore après ce
  changement.

  La fenêtre Google doit s'ouvrir dans le même tick que le clic du
  joueur pour ne pas être bloquée par Safari : `openAccountMenu`
  précharge donc le SDK Firebase, GIS et l'auth anonyme dès l'ouverture
  du menu Compte (pas seulement au clic sur "Se connecter"), pour que
  `DUEL.linkGoogle` reste synchrone dans le cas courant
  (`doLinkGoogle`, `app.js`).

  Si le compte Google choisi est déjà relié à un autre uid (autre
  appareil, ou session anonyme précédente sur celui-ci) — cas fréquent,
  provoquait avant un échec sec sans solution —,
  `DUEL._adoptExistingCredential` bascule automatiquement dessus via
  `signInWithCredential` plutôt que d'échouer : c'est une vraie
  connexion à un compte existant, pas juste un lien à sens unique.
  Connecté, la carrière solo active de chaque compte local est copiée
  dans `parquet_careers/<uid>/<idCompte>` (`PROFILE.pushToCloud`/
  `scheduleCloudPush`, débit sur `save()`, `addToPantheon()`,
  `META.flush()`) pour être retrouvée sur un autre appareil connecté au
  même compte Google. Résolution par horodatage
  (`PROFILE.reconcileWithCloud`, appelée au lien et, discrètement, à
  chaque démarrage si l'appareil a déjà été relié) : le plus récent
  l'emporte automatiquement, un vrai conflit (deux appareils ont joué
  sans se resynchroniser) affiche un choix explicite
  (`resolveGoogleConflicts`) plutôt que d'écraser en silence. Chaque
  étape (connexion en cours, erreur, succès) affiche un message clair
  et rassurant (`infoDialog`/`googleFailDialog`/`googleErrorLabel` dans
  `app.js`) — plus jamais un clic qui ne semble rien faire.

  Règles `parquet_careers` publiées (2026-08-12, voir section Firebase
  ci-dessus). Fournisseur Google activé côté Firebase (confirmé —
  l'erreur `auth/operation-not-allowed` avait disparu avant même ce
  changement de méthode).
  Non testable de bout en bout depuis l'agent (nécessite un vrai
  compte Google dans un vrai navigateur) — le popup Google est bloqué
  dans le navigateur sandboxé de l'agent (politique de l'organisation
  sur le domaine accounts.google.com), et un bug de cache HTTP propre
  à l'outil de preview local de l'agent a aussi empêché de vérifier
  `GOOGLE_WEB_CLIENT_ID` en conditions réelles depuis l'agent (le
  fichier servi était confirmé correct via `curl` direct, seul le
  navigateur de test gardait une version périmée en cache).
- Nouvelle finition de carte profil : 5 propositions visuelles dans un
  artefact (Onyx Élite / Ambre Prestige / Améthyste Royale / Glacier
  Diamant / Opale Galactique, façon tirages 2K MyTEAM), toujours pas
  branchées sur `.duel-hero-card` — en attente du choix de l'utilisateur
  (une seule par défaut, ou les 5 comme objets de boutique).
- Classement de prod (`parquet_leaderboard`) pollué par plusieurs lignes
  de comptes de test créés pendant les sessions de dev (ex. "Ghost
  Preview", "Card Test") — à nettoyer à la main dans la console Firebase
  si besoin, pas d'accès pour le faire depuis l'agent.
