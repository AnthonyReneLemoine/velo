# Vélo Tracker

Cette version du projet transforme le compteur Google Apps Script en application web statique déployable sur **GitHub Pages**, avec persistance des données dans **Firebase Firestore**.

## Contenu

- `index.html` : interface utilisateur.
- `styles.css` : styles de l’application.
- `app.js` : logique front-end et synchronisation Firebase.
- `config.js` : configuration Firebase déjà renseignée pour le projet `velo-b57a2`.
- `.github/workflows/deploy-pages.yml` : publication automatique sur GitHub Pages.
- `firebase.json` / `firestore.rules` : configuration Firebase.
- `Code.gs` : script Google Apps Script historique conservé comme référence.

## Configuration Firebase déjà branchée

Le dépôt est maintenant configuré pour l’application web Firebase suivante :

- **Project ID** : `velo-b57a2`
- **Auth domain** : `velo-b57a2.firebaseapp.com`
- **Storage bucket** : `velo-b57a2.firebasestorage.app`

À faire côté console Firebase :

1. Activer **Authentication > Anonymous**.
2. Activer **Firestore Database**.
3. Déployer les règles Firestore :

```bash
firebase deploy --only firestore:rules
```

## Déploiement GitHub Pages

1. Poussez le dépôt sur GitHub.
2. Activez **Settings > Pages > Build and deployment > GitHub Actions**.
3. Le workflow `.github/workflows/deploy-pages.yml` publiera automatiquement les fichiers statiques.

## Développement local

Vous pouvez ouvrir `index.html` directement dans un navigateur moderne. L’application utilisera Firebase si le projet est correctement activé côté console ; sinon, elle basculera automatiquement sur le mode local de secours.
