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
  pour que le profil d'un joueur soit consultable par les autres) :
  règles déjà publiées par l'utilisateur.
- `parquet_names` (registre pseudo→uid pour l'unicité des noms),
  `parquet_friends` (liste d'amis par uid), `parquet_challenges` (défi
  direct entre amis), `parquet_careers` (sauvegarde cloud de la
  carrière solo par uid, voir section Compte Google) : **règles PAS
  encore publiées** — le code se dégrade proprement en attendant
  (pseudo non bloqué, ami non ajoutable avec message d'erreur clair,
  sync cloud silencieusement inactive), mais il faut ajouter dans la
  console Firebase (Realtime Database → Règles) :
  ```json
  "parquet_names": { ".read": "auth != null", ".write": "auth != null" },
  "parquet_friends": { ".read": "auth != null", ".write": "auth != null" },
  "parquet_challenges": { ".read": "auth != null", ".write": "auth != null" },
  "parquet_careers": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    }
  }
  ```

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
- Règles Firebase pour `parquet_names`/`parquet_friends`/`parquet_challenges`
  à publier par l'utilisateur (voir section Firebase ci-dessus) — sans
  ça, pseudo unique et système d'amis restent en dégradé.
- Compte Google, y compris pour la carrière solo : code en place.
  `DUEL.linkGoogle`/`DUEL.googleLinkedInfo`/`DUEL.checkGoogleRedirect`
  (`duel.js`) relient le compte Google à l'uid anonyme existant
  (`linkWithPopup`, secours `linkWithRedirect` si popup bloqué) — rien
  n'est perdu, pas de nouveau compte créé. **Pas d'icône Google
  séparée** : le compte s'ouvre via le logo 🏀 fixe en haut à droite
  (`brand-corner` dans `index.html`, câblé dans `app.js` près de la fin
  de `boot()`/l'init des écrans) — un clic dessus ouvre un tableau de
  bord (`openAccountMenu` dans `app.js`) avec Accueil / Mes profils /
  Se connecter avec Google, **depuis n'importe quel écran**, pas
  seulement l'écran des comptes ou l'onglet Profil du monde
  multijoueur. Si le compte Google choisi est déjà relié à un autre
  uid (autre appareil, ou session anonyme précédente sur celui-ci) —
  cas fréquent, provoquait avant un échec sec sans solution —,
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
  et rassurant (`infoDialog` dans `app.js`) — plus jamais un clic qui
  ne semble rien faire.
  Toujours pas fonctionnel : il faut que l'utilisateur active le
  fournisseur Google dans la console Firebase (Authentication →
  Sign-in method → Google) **et** publie les règles `parquet_careers`
  (voir section Firebase ci-dessus). Sans ça, le bouton échoue
  proprement avec un message clair (`auth/operation-not-allowed`).
  Non testable de bout en bout depuis l'agent (nécessite un vrai
  compte Google dans un vrai navigateur, et deux appareils pour
  vérifier la sync/les conflits) — le popup Google est aussi bloqué
  dans le navigateur sandboxé de l'agent (politique de l'organisation
  sur le domaine accounts.google.com).
- Nouvelle finition de carte profil : 5 propositions visuelles dans un
  artefact (Onyx Élite / Ambre Prestige / Améthyste Royale / Glacier
  Diamant / Opale Galactique, façon tirages 2K MyTEAM), toujours pas
  branchées sur `.duel-hero-card` — en attente du choix de l'utilisateur
  (une seule par défaut, ou les 5 comme objets de boutique).
- Classement de prod (`parquet_leaderboard`) pollué par plusieurs lignes
  de comptes de test créés pendant les sessions de dev (ex. "Ghost
  Preview", "Card Test") — à nettoyer à la main dans la console Firebase
  si besoin, pas d'accès pour le faire depuis l'agent.
