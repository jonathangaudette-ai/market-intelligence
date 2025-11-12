# Guide: Créer l'utilisateur dans la base de données

## 🎯 Objectif

Créer l'utilisateur `jonathan@mhosaic.com` dans la base de données PostgreSQL pour pouvoir vous connecter à l'application.

## 📋 Méthode 1: Via l'interface Neon Console (Recommandé)

### Étape 1: Accéder à Neon Console

1. Allez sur [console.neon.tech](https://console.neon.tech)
2. Connectez-vous avec votre compte
3. Sélectionnez votre projet `market-intelligence`
4. Cliquez sur l'onglet **"SQL Editor"**

### Étape 2: Exécuter la requête SQL

Copiez et exécutez cette requête dans l'éditeur SQL:

```sql
-- Create user jonathan@mhosaic.com
DO $$
DECLARE
  user_exists BOOLEAN;
  password_hash TEXT;
BEGIN
  -- Bcrypt hash for the password: KDkq9{Oa-O)AEo}G
  password_hash := '$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6';

  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'jonathan@mhosaic.com') INTO user_exists;

  IF user_exists THEN
    -- Update existing user
    UPDATE users
    SET password_hash = password_hash,
        is_super_admin = TRUE,
        updated_at = NOW()
    WHERE email = 'jonathan@mhosaic.com';

    RAISE NOTICE 'User updated: jonathan@mhosaic.com';
  ELSE
    -- Create new user
    INSERT INTO users (id, email, password_hash, name, is_super_admin, created_at, updated_at)
    VALUES (
      'user_' || substr(md5(random()::text), 1, 24),
      'jonathan@mhosaic.com',
      password_hash,
      'Jonathan Gaudette',
      TRUE,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'User created: jonathan@mhosaic.com';
  END IF;
END $$;

-- Verify the user was created
SELECT id, email, name, is_super_admin, created_at
FROM users
WHERE email = 'jonathan@mhosaic.com';
```

### Étape 3: Vérifier la création

Vous devriez voir un résultat comme:

```
id                              | email                   | name               | is_super_admin | created_at
--------------------------------|-------------------------|--------------------|-----------------|-----------
user_abc123...                  | jonathan@mhosaic.com    | Jonathan Gaudette  | true            | 2025-11-12 ...
```

## 📋 Méthode 2: Via script TypeScript (si DATABASE_URL est correct)

Si vous avez accès à la bonne DATABASE_URL:

```bash
# 1. Mettre à jour la DATABASE_URL dans .env.local avec la bonne URL
# 2. Exécuter le script
npx tsx scripts/create-user.ts
```

## 📋 Méthode 3: Via Vercel CLI

```bash
# 1. Se connecter à Vercel
vercel login

# 2. Créer un fichier SQL temporaire
cat > /tmp/create-user.sql << 'EOF'
INSERT INTO users (id, email, password_hash, name, is_super_admin, created_at, updated_at)
VALUES (
  'user_jg_prod_001',
  'jonathan@mhosaic.com',
  '$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6',
  'Jonathan Gaudette',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6',
  is_super_admin = TRUE,
  updated_at = NOW();
EOF

# 3. Obtenir la DATABASE_URL depuis Vercel
vercel env pull .env.production --environment=production

# 4. Exécuter via psql (si installé)
# psql "$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" -f /tmp/create-user.sql
```

## ✅ Test de connexion

Une fois l'utilisateur créé:

1. Allez sur: **https://market-intelligence-kappa.vercel.app/login**
2. Entrez:
   - **Email**: `jonathan@mhosaic.com`
   - **Mot de passe**: `KDkq9{Oa-O)AEo}G`
3. Cliquez sur **"Sign In"**

## 🔐 Sécurité Importante

⚠️ **IMPORTANT**: Changez votre mot de passe immédiatement après la première connexion!

Le mot de passe actuel a été partagé dans ce chat et doit être considéré comme compromis.

### Pour changer le mot de passe:

1. Une fois connecté, créez une page de profil ou utilisez ce script:

```typescript
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Nouveau mot de passe sécurisé
const newPassword = 'VotreNouveauMotDePasseSecurise123!';
const newHash = await hash(newPassword, 10);

await db
  .update(users)
  .set({ password_hash: newHash, updated_at: new Date() })
  .where(eq(users.email, 'jonathan@mhosaic.com'));
```

## 🆘 Dépannage

### Erreur: "User already exists"

L'utilisateur existe déjà. Essayez simplement de vous connecter.

### Erreur: "Invalid credentials"

1. Vérifiez que la requête SQL s'est bien exécutée
2. Vérifiez avec `SELECT * FROM users WHERE email = 'jonathan@mhosaic.com';`
3. Si nécessaire, mettez à jour juste le mot de passe:

```sql
UPDATE users
SET password_hash = '$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6',
    updated_at = NOW()
WHERE email = 'jonathan@mhosaic.com';
```

### Erreur: "No active company context"

Après connexion, vous devrez également créer une entreprise et vous y associer:

```sql
-- Créer une entreprise
INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
VALUES (
  'company_demo_001',
  'Demo Company',
  'demo-company',
  TRUE,
  NOW(),
  NOW()
);

-- Associer l'utilisateur à l'entreprise
INSERT INTO company_members (id, user_id, company_id, role, created_at, updated_at)
SELECT
  'member_001',
  id,
  'company_demo_001',
  'admin',
  NOW(),
  NOW()
FROM users
WHERE email = 'jonathan@mhosaic.com';
```

## 📞 Besoin d'aide?

Si vous rencontrez des problèmes, vérifiez:
- Les logs de l'application sur Vercel
- Les logs de la base de données sur Neon Console
- Que la table `users` existe bien

---

**Créé**: 2025-11-12
**Hash du mot de passe**: `$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6`
**Mot de passe temporaire**: `KDkq9{Oa-O)AEo}G` (À CHANGER!)
