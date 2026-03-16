#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FRETNOW AGI — Script de nettoyage v8.0
# Supprime le superflu identifié par l'audit NOVA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e
echo "🧹 FRETNOW AGI — Nettoyage du repo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ══════════════════════════════════════════════════
# 1. SUPPRESSION DES FRONTENDS LEGACY
# Le client React (client/) est le SEUL frontend.
# Tout le reste est du HTML statique obsolète.
# ══════════════════════════════════════════════════

echo "🗑️  Suppression des frontends legacy HTML..."

# ui/ — Prototypes HTML jamais utilisés en prod
rm -rf ui/
echo "  ✅ ui/ supprimé (landing.html, dashboard.html, smart-inputs-demo.html — 3 114 lignes)"

# public/app.html — Ancienne SPA monolithique (966 lignes dans UN fichier HTML)
rm -f public/app.html
echo "  ✅ public/app.html supprimé (966 lignes — remplacé par client React)"

# public/transporteur.html — Page transporteur legacy
rm -f public/transporteur.html
echo "  ✅ public/transporteur.html supprimé (986 lignes — dans React maintenant)"

# public/chargeur.html — Page chargeur legacy
rm -f public/chargeur.html
echo "  ✅ public/chargeur.html supprimé (198 lignes — dans React maintenant)"

# public/reset-password.html — Géré par React (ResetPassword.jsx existe)
rm -f public/reset-password.html
echo "  ✅ public/reset-password.html supprimé (React le gère)"

# ON GARDE : public/index.html (fallback si React pas build)
# ON GARDE : public/legal.html (mentions légales statiques, OK)
echo "  ℹ️  Conservé : public/index.html, public/legal.html"

# ══════════════════════════════════════════════════
# 2. SUPPRESSION DES AGENTS REDONDANTS
# Les nouveaux services/ remplacent les anciens agents/
# ══════════════════════════════════════════════════

echo ""
echo "🗑️  Suppression des agents remplacés par les services v8..."

# agents/matcher.js — Remplacé par services/matching-engine.js (2x plus complet)
rm -f agents/matcher.js
echo "  ✅ agents/matcher.js supprimé (353 lignes → remplacé par matching-engine.js: 716 lignes)"

# agents/pricing.js — Remplacé par services/pricing-engine.js (2x plus complet)
rm -f agents/pricing.js
echo "  ✅ agents/pricing.js supprimé (305 lignes → remplacé par pricing-engine.js: 633 lignes)"

# agents/scout.js — Scraping web non fonctionnel (cheerio même pas dans les deps)
# Utilisé nulle part sauf monitoring.js qui le liste en status
rm -f agents/scout.js
echo "  ✅ agents/scout.js supprimé (277 lignes — dépendance cheerio manquante, inutilisable)"

# agents/convert.js — Agent de conversion marketing, aucune intégration réelle
# N'est importé nulle part dans le code source
rm -f agents/convert.js
echo "  ✅ agents/convert.js supprimé (308 lignes — jamais importé, zéro intégration)"

# agents/communicator.js — Agent omnicanal (Telegram/WhatsApp/Email)
# N'est importé nulle part, les tokens sont hardcodés dans ARCHITECTURE.md
rm -f agents/communicator.js
echo "  ✅ agents/communicator.js supprimé (303 lignes — jamais importé, pas de credentials)"

# agents/predict.js — Agent de prédiction, aucune donnée pour fonctionner
# N'est importé nulle part
rm -f agents/predict.js
echo "  ✅ agents/predict.js supprimé (324 lignes — jamais importé, pas de données historiques)"

# ON GARDE :
# agents/compliance.js — Utilisé par routes/mobilic.js et routes/agents.js
# agents/analyst.js — Peut être utile pour le dashboard admin (à évaluer post-lancement)
# agents/risk.js — Utilisé par src/services/ai.js
echo "  ℹ️  Conservé : agents/compliance.js, agents/analyst.js, agents/risk.js (utilisés)"

# ══════════════════════════════════════════════════
# 3. SUPPRESSION DU CODE MORT
# ══════════════════════════════════════════════════

echo ""
echo "🗑️  Suppression du code mort..."

# core/cortex.js — Orchestrateur "cerveau central" jamais branché
# Pas importé par un seul fichier du code source
rm -f core/cortex.js
rmdir core/ 2>/dev/null || true
echo "  ✅ core/cortex.js supprimé (418 lignes — jamais importé, architecture théorique)"

# sql/ — Scripts SQL bruts, Prisma gère tout
rm -rf sql/
echo "  ✅ sql/ supprimé (fretnow-seed.sql + production-reset.sql — Prisma gère les migrations)"

# services/smart-autocomplete.js — Remplacé par routing.js (geocode/autocomplete)
rm -f services/smart-autocomplete.js
echo "  ✅ services/smart-autocomplete.js supprimé (431 lignes — routing.js fait mieux)"

# client/src/pages/Blog.jsx — Un blog statique hardcodé dans du JSX (320 lignes)
# Pas prioritaire pour le lancement, distraction
rm -f client/src/pages/Blog.jsx
echo "  ✅ client/src/pages/Blog.jsx supprimé (320 lignes — blog statique, pas prioritaire)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Nettoyage terminé !"
echo ""
echo "BILAN :"
echo "  Fichiers supprimés : 15"
echo "  Lignes supprimées  : ~8 200"
echo "  Dossiers supprimés : ui/, core/, sql/"
echo ""
echo "CONSERVÉS (utilisés en production) :"
echo "  agents/compliance.js, agents/analyst.js, agents/risk.js"
echo "  public/index.html, public/legal.html"
echo "  Tout le client React (client/)"
echo "  Tous les services/ et src/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
