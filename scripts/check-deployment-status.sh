#!/bin/bash

# Check Vercel deployment status for market-intelligence

PROD_URL="https://market-intelligence-kappa.vercel.app"
MAX_ATTEMPTS=30
SLEEP_TIME=10

echo "🔍 Vérification du déploiement Vercel..."
echo "URL: $PROD_URL"
echo ""

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Tentative $i/$MAX_ATTEMPTS..."

  # Check HTTP status
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo "HTTP Status: $HTTP_CODE"
    echo "URL: $PROD_URL"
    echo ""
    echo "🎉 L'application est en ligne!"
    exit 0
  elif [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "⚠️  Erreur serveur (HTTP $HTTP_CODE) - Déploiement en cours..."
  else
    echo "⏳ En attente (HTTP $HTTP_CODE)..."
  fi

  if [ $i -lt $MAX_ATTEMPTS ]; then
    sleep $SLEEP_TIME
  fi
done

echo ""
echo "⏱️  Timeout: Le déploiement prend plus de temps que prévu"
echo "Vérifiez manuellement: https://vercel.com/jonathans-projects-5c41fef5/market-intelligence"
exit 1
