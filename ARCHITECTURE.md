# 🚛 FRETNOW AGI 2.0 — Architecture Complète

## 🎯 Vision
La meilleure AGI autonome de transport au monde. Inspirée des leaders (C.H. Robinson, Uber Freight, Convoy) mais en mieux.

---

## 🏗️ Architecture Multi-Agent

```
                         ┌─────────────────────────────────┐
                         │         🧠 CORTEX               │
                         │     (Orchestrateur Central)     │
                         │                                 │
                         │  • Gestion priorités agents     │
                         │  • État global partagé          │
                         │  • Génération insights          │
                         │  • Auto-optimisation            │
                         └──────────────┬──────────────────┘
                                        │
       ┌────────────────────────────────┼────────────────────────────────┐
       │                                │                                │
       ▼                                ▼                                ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ 🤖 MATCHER   │              │ 🔍 SCOUT     │              │ 💬 COMMS     │
│   (P: 95)    │              │   (P: 90)    │              │   (P: 85)    │
│              │              │              │              │              │
│ Matching 98% │              │ 100 leads/j  │              │ Omnicanal    │
│ Retours      │              │ Scoring 0-100│              │ Gratuit      │
└──────────────┘              └──────────────┘              └──────────────┘
       │                                │                                │
       ├────────────────────────────────┼────────────────────────────────┤
       │                                │                                │
       ▼                                ▼                                ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ 💰 PRICING   │              │ 🎯 CONVERT   │              │ 🛡️ RISK      │
│   (P: 80)    │              │   (P: 78)    │              │   (P: 75)    │
│              │              │              │              │              │
│ CNR dynamique│              │ 15% objectif │              │ Anti-fraude  │
│ 6 ajustements│              │ A/B testing  │              │ Scoring      │
└──────────────┘              └──────────────┘              └──────────────┘
       │                                │                                │
       └────────────────────────────────┼────────────────────────────────┘
                                        │
       ┌────────────────────────────────┴────────────────────────────────┐
       ▼                                                                 ▼
┌──────────────┐                                                ┌──────────────┐
│ 📈 PREDICT   │                                                │ 📊 ANALYST   │
│   (P: 70)    │                                                │   (P: 65)    │
│              │                                                │              │
│ Prévisions 7j│                                                │ KPIs temps   │
│ Opportunités │                                                │ réel + alert │
└──────────────┘                                                └──────────────┘
```

---

## 🤖 Les 8 Agents

### 1. MATCHER (Priorité 95)
**Mission:** 98% de précision matching fret ↔ transporteur

**Formule:**
```
SM = 0.25×proximité + 0.20×véhicule + 0.20×historique + 
     0.15×disponibilité + 0.10×réputation + 0.10×préférence
```

**Fonctionnalités:**
- Détection opportunités retour (-45% km à vide)
- Prédiction taux d'acceptation
- Résolution conflits multi-match

---

### 2. SCOUT (Priorité 90)
**Mission:** 100 leads qualifiés par jour

**Scoring Lead (0-100):**
```
SL = ancienneté(20) + flotte(25) + diversité(15) + 
     capital(15) + employés(15) + région(10)
```

**Sources:**
- Pappers, Societe.com, Annuaires pro
- Vérification SIRET automatique
- Ciblage géographique intelligent

---

### 3. COMMS (Priorité 85)
**Mission:** Engagement personnalisé à grande échelle

**Canaux (TOUS GRATUITS):**
- Telegram Bot API
- WhatsApp (whatsapp-web.js)
- Email (Nodemailer)

**Optimisations:**
- Sélection canal optimal par lead
- Timing intelligent (8h-19h)
- Anti-spam intégré

---

### 4. PRICING (Priorité 80)
**Mission:** Prix optimal en temps réel

**Formule CNR+:**
```
PPO = (CK×D + CC×T + CJ×N) × Δcarburant × Δtrafic × Δmétéo × Δdemande / (1-M)
```

**Ajustements dynamiques:**
- Prix carburant temps réel (API data.gouv)
- Conditions météo (Open-Meteo)
- Niveau de trafic
- Indice demande/offre
- Urgence

---

### 5. CONVERT (Priorité 78)
**Mission:** 15% taux de conversion

**Fonctionnalités:**
- Scoring conversion 0-100
- Parcours personnalisé (Fast/Standard/Nurture)
- Relances intelligentes (5 max)
- A/B testing automatique

---

### 6. RISK (Priorité 75)
**Mission:** Zéro mauvaise surprise

**Facteurs de risque:**
- Entreprise récente (<2 ans)
- Capital faible (<10k€)
- Absence d'historique
- Données incohérentes
- SIRET blacklisté

**Output:** Score fiabilité 0-100

---

### 7. PREDICT (Priorité 70)
**Mission:** Voir le futur du marché

**Prévisions:**
- Demande à 7 jours
- Pics saisonniers
- Tendances prix
- Événements spéciaux (jours fériés, vacances)

---

### 8. ANALYST (Priorité 65)
**Mission:** Transformer les données en décisions

**KPIs surveillés:**
- Taux conversion
- Score moyen leads
- Taux matching
- Temps réponse
- Taux risque

**Alertes:** Détection anomalies (>2σ)

---

## 🔌 APIs Externes (Gratuites)

| Service | API | Usage |
|---------|-----|-------|
| Carburant | data.gouv.fr | Prix diesel temps réel |
| Météo | Open-Meteo | Conditions transport |
| Entreprises | SIRENE/data.gouv | Vérification SIRET |
| Adresses | api-adresse.data.gouv.fr | Géocodage |

---

## 📱 Interfaces

### Landing Page (`/`)
- Design glassmorphism dark
- Formulaire inscription
- Comparatif concurrence

### Dashboard AGI (`/dashboard`)
- Métriques temps réel
- Statut 8 agents
- Graphiques performance

### App Transporteur (`/app`)
- PWA mobile-first
- Swipe pour accepter missions
- Suivi gains J+1

---

## 🚀 Démarrage

```bash
# 1. Installer
npm install

# 2. Lancer
npm start

# 3. Accéder
# Site:      http://localhost:3001
# Dashboard: http://localhost:3001/dashboard
# App:       http://localhost:3001/app
```

---

## 📊 Avantages Compétitifs

| Métrique | Industrie | FRETNOW |
|----------|-----------|---------|
| Matching | 85% | **98%** |
| Paiement | 60j | **J+1** |
| Commission | 25% | **10%** |
| Km vide | 30% | **15%** |
| Agents IA | 0-5 | **8** |

---

## 🔐 Variables d'Environnement

⚠️ **SÉCURITÉ** : Ne JAMAIS committer de clés API en clair.
Voir `.env.example` pour la liste des variables requises.
Configurer sur Render → Environment Variables.

---

*FRETNOW AGI 2.0 — Créé par FRETNOW AGI*
