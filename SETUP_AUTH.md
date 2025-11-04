# 🔐 Configuration de l'authentification

## ✅ Ce qui est déjà fait:

- NextAuth.js configuré
- Page de login fonctionnelle (`/login`)
- Utilisateur de test créé dans la base de données
- Protection des routes activée

## 📋 Identifiants de test:

```
Email: admin@example.com
Password: password123
```

## 🚀 Configuration requise sur Vercel (2 minutes):

### Étape 1: Ajouter AUTH_SECRET sur Vercel

1. Allez sur: https://vercel.com/jonathangaudette-ai/market-intelligence/settings/environment-variables

2. Cliquez sur "Add New" et ajoutez:
   - **Name**: `AUTH_SECRET`
   - **Value**: `GrddWPLjAZYhwNdkW0GFUOcfHBe6mplpZZW2zK7YXQ0=`
   - **Environment**: Cochez toutes les options (Production, Preview, Development)

3. Cliquez sur "Save"

### Étape 2: Redéployer l'application

Option A - Automatic (recommandé):
- Faites un commit et push sur GitHub
- Vercel détectera le changement et redéployera automatiquement

Option B - Manual:
- Allez sur: https://vercel.com/jonathangaudette-ai/market-intelligence
- Cliquez sur "Deployments"
- Cliquez sur "Redeploy" sur le dernier déploiement

## ✨ C'est tout!

Après le redéploiement (1-2 minutes), l'authentification sera fonctionnelle:

1. Visitez: https://market-intelligence-kappa.vercel.app
2. Vous serez redirigé vers `/login`
3. Connectez-vous avec les identifiants ci-dessus
4. Vous serez redirigé vers `/companies/demo-company/dashboard`

## 🛠️ Développement local

Pour tester en local, l'authentification fonctionne déjà grâce au fichier `.env.local`:

```bash
npm run dev
# Ouvrez http://localhost:3000
```

## 🔒 Sécurité

- Les mots de passe sont hachés avec bcrypt
- Les sessions utilisent JWT signés
- AUTH_SECRET est requis pour signer les tokens JWT
