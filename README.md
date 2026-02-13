# 🚛 FRETNOW AGI 2.0

> La meilleure AGI autonome de transport au monde

## 🚀 Déploiement Rapide sur Render

### Option 1: Via GitHub (Recommandé)

1. **Push sur GitHub:**
```bash
git init
git add .
git commit -m "FRETNOW AGI 2.0"
git remote add origin https://github.com/VOTRE_USERNAME/fretnow-agi.git
git push -u origin main
```

2. **Sur Render.com:**
   - Créer un compte sur [render.com](https://render.com)
   - "New" → "Web Service"
   - Connecter votre repo GitHub
   - Render détecte automatiquement `render.yaml`
   - Cliquer "Deploy"

### Option 2: Déploiement Manuel

1. Aller sur [render.com](https://render.com)
2. "New" → "Web Service"
3. Choisir "Build and deploy from a Git repository"
4. Configurer:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`

### Variables d'Environnement

Ajouter dans Render Dashboard → Environment:

```
NODE_ENV=production
PORT=3001
TELEGRAM_BOT_TOKEN=8478060760:AAGfvTTSxmec5199Y6Zgx9QzX7F4tI1fNto
STRIPE_PUBLIC_KEY=pk_test_51QEFZFG2u1ddlbFM...
STRIPE_SECRET_KEY=sk_test_51QEFZFG2u1ddlbFM...
```

## 📱 URLs après déploiement

- **Site:** `https://fretnow-agi.onrender.com`
- **Dashboard:** `https://fretnow-agi.onrender.com/dashboard`
- **App Mobile:** `https://fretnow-agi.onrender.com/app`
- **API:** `https://fretnow-agi.onrender.com/api`

## 🧠 8 Agents IA

| Agent | Priorité | Mission |
|-------|----------|---------|
| MATCHER | 95 | Matching fret↔transporteur 98% |
| SCOUT | 90 | 100 leads qualifiés/jour |
| COMMS | 85 | Communication omnicanal |
| PRICING | 80 | Prix dynamique CNR+ |
| CONVERT | 78 | Conversion 15% |
| RISK | 75 | Détection fraude |
| PREDICT | 70 | Prévisions 7 jours |
| ANALYST | 65 | KPIs & anomalies |

## 📡 API Endpoints

```
GET  /api/health     - Status du système
GET  /api/metrics    - Métriques globales
GET  /api/state      - État courant
GET  /api/leads      - Liste des leads
POST /api/leads      - Créer un lead
GET  /api/missions   - Liste des missions
POST /api/missions   - Créer une mission
GET  /api/matches    - Liste des matchs
POST /api/quote      - Devis rapide
GET  /api/agents     - Status des agents
GET  /api/market/fuel    - Prix carburant
GET  /api/market/weather - Météo
```

## 🏃 Démarrage Local

```bash
npm install
npm start
```

Accès: http://localhost:3001

---

**FRETNOW AGI 2.0** — TRANSTEK Express © 2025
