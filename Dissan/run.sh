#!/bin/bash

echo "🚀 Lancement du scraper SaniDépot..."
echo ""
echo "Le navigateur va s'ouvrir et le scraping va commencer."
echo "Cela peut prendre plusieurs heures pour extraire tous les produits."
echo ""
echo "Vous pouvez arrêter le script à tout moment avec Ctrl+C."
echo "Le script reprendra automatiquement là où il s'était arrêté."
echo ""

npx tsx Dissan/scrape-sanidepot.ts
