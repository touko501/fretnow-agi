# 🚛 FRETNOW AGI — Plateforme Intelligente du Transport Routier

> **NOVA** est l'IA Managing Partner (90%) qui gère cette plateforme. Touko (Tarek Jaziri) est l'associé opérationnel (10%).

## Le Problème

**58% des camions roulent à moitié vides** — 80 milliards $ de pertes annuelles mondiales. Les courtiers traditionnels prennent 25% de commission et paient à 60-90 jours.

## La Solution FRETNOW

| | Courtiers | **FRETNOW** |
|---|---|---|
| Commission | 25% | **10%** |
| Paiement | 60-90 jours | **J+1** |
| Matching | Manuel | **IA (10 agents)** |
| Conformité | À la charge du transporteur | **Mobilic intégré** |
| Trésorerie nécessaire | Oui | **0€** |

## Architecture v7.3.0

### Backend (Node.js + Express + Prisma + PostgreSQL)
- **114 endpoints API** couvrant : auth, missions, bids, wallet, véhicules, conducteurs, messagerie/express, Mobilic, agents IA, admin, monitoring, RGPD
- **33 modèles Prisma** + 20 enums
- **~9 700 lignes de code** backend

### Frontend React (Vite + Tailwind v4)
- **19 pages** : Landing, Login, Register, Dashboard, Missions, CreateMission, MissionDetail, Messagerie, Mobilic, Compliance, Agents, Wallet, Vehicles, Profile, Notifications
- **2 019 lignes** React
- SPA avec JWT refresh, responsive sidebar, rôles CHARGEUR/TRANSPORTEUR/ADMIN

### 10 Agents IA
| # | Agent | Fonction |
|---|-------|----------|
| 001 | MatchingAgent | Matching multi-critères mission ↔ transporteur |
| 002 | PricingAgent | Tarification dynamique (indices CNR) |
| 003 | LeadGenAgent | Prospection automatisée |
| 004 | CommunicationAgent | Notifications et relances |
| 005 | ConversionAgent | Optimisation conversion leads |
| 006 | RiskAgent | Évaluation risques |
| 007 | PredictionAgent | Prédictions demande/capacité |
| 008 | AnalyticsAgent | Analytics et KPIs |
| 009 | NOVA (Cortex) | Orchestrateur IA central |
| 010 | ComplianceAgent | Conformité Mobilic, certification |

### 4 Verticales
- 🚛 **Fret lourd** — Lots complets, retours optimisés
- 📦 **Messagerie** — Colis, palettes, 24-72h
- ⚡ **Express** — J+1 garanti, SLA et pénalités
- 🏙️ **Dernier km** — Livraison urbaine e-commerce

### Intégrations
- **Mobilic** (DGITM) — OAuth2, temps de travail, conformité légale
- **BAN** — Géocodage adresses françaises
- **SIRENE** — Vérification entreprises
- **Carburants** — Prix temps réel
- **ZFE** — Zones à faibles émissions
- **Open-Meteo** — Conditions météo
- **OSRM / GraphHopper** — Routage et distances
- **Email** — Resend / SendGrid

## Déploiement

- **GitHub** : `touko501/fretnow-agi`
- **Render** : `fretnow-agi` (Frankfurt)
- **BDD** : PostgreSQL (Render)
- **Auto-deploy** : push main → Render redéploie

### Variables d'environnement
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
MOBILIC_CLIENT_ID=...        # En attente sandbox
MOBILIC_CLIENT_SECRET=...     # En attente sandbox
RESEND_API_KEY=...            # Ou SENDGRID_API_KEY
```

### Lancer en local
```bash
npm install
cd client && npm install && npm run build && cd ..
npx prisma migrate dev
npm run dev
```

## Stack

Node.js 20 · Express · Prisma · PostgreSQL · React 18 · Vite 6 · Tailwind CSS v4 · JWT · Render

## Licence

Propriétaire — FRETNOW AGI © 2026
