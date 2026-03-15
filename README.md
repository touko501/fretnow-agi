# FRETNOW AGI v8.0

**La première marketplace de fret routier B2B propulsée par l'IA en France.**

Commission 10% | Paiement J+1 | Matching IA instantané

---

## Démarrage rapide

```bash
# 1. Cloner
git clone https://github.com/touko501/fretnow-agi.git
cd fretnow-agi

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Remplir les variables dans .env (DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY)

# 4. Initialiser la base de données
npx prisma generate
npx prisma db push

# 5. Lancer
npm run dev          # Backend (port 3000)
cd client && npm run dev  # Frontend React (port 5173)
```

## Architecture

```
fretnow-agi/
├── src/                    # Serveur Express
│   ├── index.js            # Point d'entrée v8.0
│   ├── config/             # Database, env, security
│   ├── middleware/          # Auth JWT, roles, validation Zod
│   └── routes/             # 20+ routes API
│       ├── auth.js         # Inscription, login, reset password
│       ├── missions.js     # CRUD missions + enchères
│       ├── payments.js     # Stripe webhooks + factures
│       ├── agents.js       # Bridge vers services IA
│       ├── api-integrations.js  # 25 endpoints v2
│       └── ...
├── services/               # Services métier v8
│   ├── routing.js          # OSRM + GraphHopper + BAN
│   ├── matching-engine.js  # Matching IA 7 facteurs
│   ├── pricing-engine.js   # Tarification dynamique CNR
│   ├── zfe-compliance.js   # Détection ZFE automatique
│   ├── carbon-calculator.js # Éco-score ADEME A→E
│   ├── stripe-connect.js   # Paiements marketplace split
│   ├── gps-tracking.js     # Tracking GPS + geofencing
│   ├── external-apis.js    # APIs data.gouv.fr
│   ├── mobilic-api.js      # Conformité temps de travail
│   └── email.js            # Notifications email
├── agents/                 # Agents IA conservés
│   ├── compliance.js       # Conformité Mobilic
│   ├── risk.js             # Évaluation risque entreprise
│   └── analyst.js          # KPIs et analytics
├── client/                 # Frontend React + Vite + Tailwind
│   └── src/
│       ├── pages/ (17)     # Dashboard, Missions, Wallet, etc.
│       ├── components/     # Layout, Sidebar, etc.
│       └── hooks/          # useAuth, useApi
├── prisma/
│   └── schema.prisma       # 35+ modèles, 1176 lignes
└── tests/
    └── services.test.js    # 31 tests unitaires
```

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Node.js + Express 4 |
| Base de données | PostgreSQL 15 + Prisma ORM |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT + bcrypt + sessions |
| Paiements | Stripe Connect (split marketplace) |
| Validation | Zod |
| Sécurité | Helmet, CORS, rate-limiting |
| Hébergement | Render (Frankfurt) |

## APIs intégrées

| API | Usage | Auth |
|-----|-------|------|
| OSRM | Routing principal | Gratuit |
| GraphHopper | Routing fallback + optimisation | API Key (50/jour gratuit) |
| API Adresse BAN | Géocodage + autocomplétion | Gratuit |
| API SIRENE | Recherche entreprises | Gratuit |
| data.economie.gouv.fr | Prix carburants temps réel | Gratuit |
| Open-Meteo | Météo pour ajustements prix | Gratuit |
| transport.data.gouv.fr | Zones ZFE | Gratuit |
| ADEME Base Carbone | Facteurs émission CO2 | Gratuit |
| Mobilic | Conformité temps de travail | OAuth2 |
| Stripe Connect | Paiements marketplace | API Key |

## Fonctionnalités uniques (vs concurrents)

1. **Détection ZFE automatique** — Vérifie si le véhicule peut traverser les Zones à Faibles Émissions sur l'itinéraire. Aucun concurrent ne le fait.

2. **Éco-score ADEME (A-E)** — Calcul CO2 basé sur les facteurs d'émission officiels ADEME. Classement visuel comme l'immobilier.

3. **Matching retour à vide** — L'algorithme détecte les trajets retour compatibles et booste le score de +30%. Réduit les km à vide de 30% à 15%.

4. **Commission 10%** — vs 25% chez B2PWeb/Teleroute. Le transporteur garde plus.

5. **Paiement J+1** — vs 30-60 jours standard dans le secteur. Trésorerie immédiate.

## Endpoints API v2

Base URL: `/api/v2`

```
POST   /v2/route/calculate         # Calculer un itinéraire
POST   /v2/route/geocode            # Géocoder une adresse
POST   /v2/route/matrix             # Matrice de distances
POST   /v2/match/:missionId         # Trouver les meilleurs transporteurs
POST   /v2/price/calculate          # Estimer le prix
GET    /v2/price/market-rate        # Prix marché par lane
POST   /v2/zfe/check-route          # Vérifier ZFE sur itinéraire
GET    /v2/zfe/critair/:euroNorm    # Classification Crit'Air
POST   /v2/carbon/calculate         # Calcul bilan carbone
GET    /v2/carbon/eco-score         # Éco-score véhicule
POST   /v2/gps/position             # Enregistrer position GPS
GET    /v2/gps/tracking/:missionId  # Suivre une mission
POST   /v2/stripe/connect-account   # Créer compte Stripe Connect
POST   /v2/stripe/payment-intent    # Créer intention de paiement
```

## Tests

```bash
node tests/services.test.js
# 31/31 tests passing
```

## Sécurité

- JWT auth avec refresh tokens
- Rate limiting (10 tentatives login / 15min)
- Helmet + CORS strict
- Validation Zod sur toutes les entrées
- Protection SQL injection
- Secrets dans `.env` uniquement (jamais commités)
- Endpoint production-reset désactivé en production

## Déploiement

Hébergé sur **Render** (Frankfurt, free tier).
Pour passer en production :

```bash
# Upgrade Render → Starter (7$/mois) pour éviter les spin-down
# Configurer les variables d'environnement sur Render Dashboard
# Activer SSL (automatique sur Render)
```

## Modèle économique

| Type | Commission | Paiement transporteur |
|------|-----------|----------------------|
| Standard | 10% | J+1 |
| Express | 15-20% | J+1 |
| International | 20-25% | J+1 |

## Licence

Propriétaire — 2026 FRETNOW AGI. Tous droits réservés.

---

*Propulsé par NOVA — 10 agents IA au service du fret français.*
