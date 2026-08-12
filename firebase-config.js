/* ═══════════════════════════════════════════════════════════
   PARQUET — configuration Firebase (duel en direct)
   Ce fichier n'est PAS inclus dans bundle.js (voir build.sh) :
   il reste modifiable sans reconstruire le bundle, et garde les
   clés du projet hors du fichier généré.

   Ces valeurs viennent de la console Firebase du projet créé
   pour PARQUET : Paramètres du projet → Vos applications → l'app
   web (icône </>) → objet de config affiché. Colle-les ci-dessous
   telles quelles. Elles ne sont pas secrètes (Firebase les conçoit
   pour vivre dans du code client), mais autant garder ce fichier
   propre au projet.

   Tant que databaseURL est vide, le duel en direct reste
   désactivé proprement (DUEL.ready() renvoie false) — le reste
   du jeu fonctionne normalement.
   ═══════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkiAU6Ly1yDpBW-dZ5okivPTwGKiPKd6A",
  authDomain: "parquet-duel.firebaseapp.com",
  databaseURL: "https://parquet-duel-default-rtdb.firebaseio.com",
  projectId: "parquet-duel",
  storageBucket: "parquet-duel.firebasestorage.app",
  messagingSenderId: "321612677309",
  appId: "1:321612677309:web:6d7efb18af2956c4feb7d4",
};

/* Web client ID OAuth (Firebase Console → Authentication → Sign-in
   method → Google → Configuration du SDK web, ou Google Cloud Console
   → Identifiants). Sert à Google Identity Services (voir duel.js,
   DUEL.linkGoogle) pour obtenir un jeton Google en direct depuis
   accounts.google.com, sans jamais passer par le domaine
   parquet-duel.firebaseapp.com — c'est ce détour que Safari (ITP)
   bloquait et qui rendait la connexion impossible sur iPhone. Pas
   secret non plus (même statut que FIREBASE_CONFIG ci-dessus). */
const GOOGLE_WEB_CLIENT_ID = "321612677309-02esjvfu7bek8jogp6kjp7eiqmrjo3e5.apps.googleusercontent.com";
