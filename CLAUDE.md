# PARQUET — résumé du projet

Simulateur de carrière NBA façon BitLife, en français, site statique
(HTML/CSS/JS vanilla, sans framework). Déployé sur Vercel (projet
`parquet-hoop-destiny`, repo GitHub `dkassoum29-stack/parquet`).

**Répondre en français dans ce projet.**

## Règle d'or : bundle.js

`index.html` charge **`bundle.js`**, jamais les fichiers source
directement. `build.sh` concatène les fichiers dans cet ordre :
`profile.js data.js engine.js meta.js cast.js scenarios.js duel.js
manga.js app.js`. **Après toute modification d'un `.js` source, relancer
`./build.sh`** avant de tester ou de commiter — sinon le site charge
l'ancienne version.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app.js` | Tous les écrans/UI — carrière solo ET monde multijoueur (~3400 lignes, le plus gros fichier) |
| `engine.js` | Simulation de carrière solo : `ENG.newPlayer`, `ENG.simSeason` (formule agrégée, PAS de simulation match par match), draft, standings/playoffs de la carrière solo, + helpers `ENG.world*` pour le mode Saison multijoueur |
| `duel.js` | Moteur du monde multijoueur : personnage persistant, Firebase (salons/queue/classement), bibliothèque de situations `DUEL.LIB` (51 actuellement), résolution des choix |
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
- **Ami** : code de salon partagé (Firebase Realtime Database).
- **Aléatoire** : file d'attente de matchmaking (Firebase).

Format de match commun aux trois : 10 situations normales / 12 en
playoffs (coupées en deux mi-temps), compte à rebours de 15s par choix,
lecture de défense (tell), momentum (main chaude/glaciale), fatigue de
mécanique, coup signature (débloqué par badge), commentateur, fiche de
scouting adverse, chambrage (Ami/Aléatoire uniquement).

**Important** : `ENG.simSeason` (carrière solo) n'est JAMAIS touché par
le multijoueur — c'est une couche additive à part, pour préserver le
calibrage déjà en place (taux de MVP, draft, etc.).

## Firebase

Realtime Database (**pas Firestore**), projet `parquet-duel`. Trois
nœuds : `parquet_duels` (salons de match), `parquet_queue` (matchmaking),
`parquet_leaderboard` (classement général, cote simple +15/-10/+2, pas
un vrai ELO). Règles déjà publiées par l'utilisateur (`.read`/`.write`
au niveau du nœud parent pour permettre la lecture en liste, `.write`
scopé par uid pour les écritures individuelles).

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
