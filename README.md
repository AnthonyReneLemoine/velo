# Vélo Tracker

Cette version du projet transforme le compteur Google Apps Script en application web statique déployable sur **GitHub Pages**, avec persistance des données dans **Firebase Firestore**.

## Contenu

- `index.html` : interface utilisateur.
- `styles.css` : styles de l’application.
- `app.js` : logique front-end, authentification Google, édition mois par mois, gestion multi-année et synchronisation Firebase.
- `config.js` : configuration Firebase déjà renseignée pour le projet `velo-b57a2`.
- `.github/workflows/deploy-pages.yml` : publication automatique sur GitHub Pages.
- `firebase.json` / `firestore.rules` : configuration Firebase.
- `Code.gs` : script Google Apps Script historique conservé comme référence.

## Configuration Firebase déjà branchée

Le dépôt est configuré pour l’application web Firebase suivante :

- **Project ID** : `velo-b57a2`
- **Auth domain** : `velo-b57a2.firebaseapp.com`
- **Storage bucket** : `velo-b57a2.firebasestorage.app`

À faire côté console Firebase :

1. Activer **Authentication > Google**.
2. Ajouter le domaine GitHub Pages utilisé dans les domaines autorisés Firebase Auth si nécessaire.
3. Activer **Firestore Database**.
4. Les données sont stockées par utilisateur Google dans un document Firestore basé sur son `uid`, avec un historique organisé par année.
5. Déployer les règles Firestore :

```bash
firebase deploy --only firestore:rules
```

## Déploiement GitHub Pages

1. Poussez le dépôt sur GitHub.
2. Activez **Settings > Pages > Build and deployment > GitHub Actions**.
3. Le workflow `.github/workflows/deploy-pages.yml` publiera automatiquement les fichiers statiques.

## Développement local

Vous pouvez ouvrir `index.html` directement dans un navigateur moderne. L’application demandera une connexion Google quand Firebase est disponible ; sinon, elle basculera automatiquement sur le mode local de secours. Chaque mois peut ensuite être corrigé directement depuis sa propre case via les boutons `+` et `−`, et l’interface permet de naviguer entre plusieurs années.
