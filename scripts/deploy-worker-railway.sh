#!/bin/bash
###############################################################################
# Script de Déploiement Railway Worker
# Usage: ./scripts/deploy-worker-railway.sh
###############################################################################

set -e  # Exit on error

echo "🚀 Déploiement du Railway Worker"
echo "================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier les prérequis
echo "📋 Vérification des prérequis..."

if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI non installé${NC}"
    echo "   Installez avec: npm install -g @railway/cli"
    exit 1
fi

if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL non installé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tous les prérequis installés${NC}"
echo ""

# Naviguer vers le dossier worker
cd "$(dirname "$0")/../worker" || exit 1

# Vérifier si déjà connecté à Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Connexion à Railway..."
    railway login
fi

echo -e "${GREEN}✅ Connecté à Railway${NC}"
echo ""

# Vérifier si projet existe
if ! railway status &> /dev/null; then
    echo "📦 Création du projet Railway..."
    railway init
    echo -e "${GREEN}✅ Projet créé${NC}"
else
    echo -e "${YELLOW}ℹ️  Projet Railway déjà existant${NC}"
fi
echo ""

# Générer API Key (si pas déjà définie)
echo "🔑 Configuration des variables d'environnement..."

# Vérifier si API_KEY existe déjà
if railway variables get API_KEY &> /dev/null; then
    echo -e "${YELLOW}ℹ️  API_KEY déjà définie, on garde celle existante${NC}"
    EXISTING_API_KEY=$(railway variables get API_KEY 2>/dev/null || echo "")
    if [ -n "$EXISTING_API_KEY" ]; then
        echo -e "${GREEN}🔑 API Key existante: ${EXISTING_API_KEY:0:10}...${NC}"
    fi
else
    # Générer nouvelle API key
    API_KEY=$(openssl rand -base64 32)
    echo -e "${GREEN}🔑 Nouvelle API Key générée${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Sauvegardez cette clé pour Vercel:${NC}"
    echo -e "${GREEN}$API_KEY${NC}"
    echo ""
    read -p "Appuyez sur ENTER pour continuer (après avoir copié la clé)..."

    railway variables set API_KEY="$API_KEY"
fi

# Définir les autres variables
railway variables set NODE_ENV=production
railway variables set PLAYWRIGHT_HEADLESS=true
railway variables set LOG_LEVEL=info

echo -e "${GREEN}✅ Variables d'environnement configurées${NC}"
echo ""

# Afficher les variables (masquer API_KEY)
echo "📊 Variables configurées:"
railway variables | grep -v "API_KEY" || true
echo "   API_KEY: [MASKED]"
echo ""

# Demander confirmation avant déploiement
read -p "🚀 Lancer le déploiement? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Déploiement annulé${NC}"
    exit 0
fi

# Déployer
echo ""
echo "📤 Déploiement en cours..."
echo "   (Cela peut prendre 5-10 minutes pour la première fois)"
echo ""

railway up

echo ""
echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""

# Obtenir l'URL
echo "🌐 Obtention de l'URL du worker..."
WORKER_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -n "$WORKER_URL" ]; then
    echo -e "${GREEN}✅ URL du worker: $WORKER_URL${NC}"
    echo ""

    # Test health check
    echo "🏥 Test du health check..."
    sleep 5  # Attendre que le service démarre

    if curl -s "$WORKER_URL/health" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Worker opérationnel!${NC}"
    else
        echo -e "${YELLOW}⚠️  Worker démarré mais health check échoue (peut prendre quelques minutes)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  URL non disponible (vérifiez le dashboard Railway)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Déploiement Railway terminé!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Prochaines étapes:"
echo ""
echo "1. Copiez l'URL du worker ci-dessus"
echo ""
echo "2. Configurez Vercel avec ces variables:"
echo -e "   ${YELLOW}RAILWAY_WORKER_URL${NC}=$WORKER_URL"
echo -e "   ${YELLOW}RAILWAY_WORKER_API_KEY${NC}=[votre API key]"
echo ""
echo "3. Via Vercel CLI:"
echo "   vercel env add RAILWAY_WORKER_URL production"
echo "   vercel env add RAILWAY_WORKER_API_KEY production"
echo ""
echo "4. Redéployez Next.js:"
echo "   git push  (ou: vercel --prod)"
echo ""
echo "📚 Documentation complète:"
echo "   cat DEPLOIEMENT_PRODUCTION.md"
echo ""
echo "🔍 Surveiller les logs:"
echo "   railway logs --follow"
echo ""
