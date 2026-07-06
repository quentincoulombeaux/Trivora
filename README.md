# Trivora

**Plateforme de gestion de la performance pour triathlètes et sportifs d'endurance.**
Course à pied · Cyclisme · Natation.

Trivora n'est pas un simple carnet d'entraînement : c'est une fondation pensée pour
accompagner un athlète sur plusieurs années (planification, suivi, analyses, objectifs,
records, charge d'entraînement).

## Lancer l'application

Prérequis : **Node.js 18.18+** (recommandé : Node 20 ou 22).

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement (http://localhost:3000)
npm run dev
```

Pour une version optimisée :

```bash
npm run build
npm run start
```

## Stack technique

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** — design system clair/sombre avec tokens CSS
- **Framer Motion** — animations et micro-interactions
- **Recharts** — graphiques interactifs (style TradingView)
- **Zustand** (+ persist) — état global persisté dans le navigateur (localStorage)
- **lucide-react**, **date-fns**

## Fonctionnalités (v1)

| Page | Contenu |
|------|---------|
| **Dashboard** | Accueil personnalisé, prochains entraînements, records (run/vélo/natation), résumé d'activité, répartition des disciplines, objectifs |
| **Course / Vélo / Natation** | Saisie de séances avec calculs automatiques (allure, vitesse, SWOLF), détection de records, tendances |
| **Calendrier** | Vues semaine/mois, planification de séances futures, glisser-déposer pour replanifier |
| **Historique** | Recherche, filtres (discipline / période), tri, pagination, vue tableau + chronologie |
| **Analyses** | Volume, charge d'entraînement (modèle CTL/ATL), tendances par discipline |
| **Coach IA** | Page placeholder (« disponible prochainement ») |
| **Paramètres** | Profil, langue (FR/EN), unités (métrique/impérial), thème, export/import JSON, export CSV |

## Données

Toutes les données vivent dans le navigateur (localStorage). Au premier lancement,
un jeu de données d'exemple (~6 mois d'entraînement) est chargé pour explorer l'app.
Réinitialisez ou videz tout depuis **Paramètres → Données & sauvegarde**.

Sauvegarde / restauration : export et import JSON complet (profil + séances + objectifs).

## Architecture & évolutivité

```
src/
├── app/            # Routes (App Router) — une vraie page par section
├── components/     # UI réutilisable (cards, modal de séance, charts, navigation)
└── lib/
    ├── types.ts        # Modèle de données
    ├── store.ts        # Zustand + persistance localStorage
    ├── calc.ts         # Allure, SWOLF, charge, détection de records
    ├── selectors.ts    # Séries temporelles pour les graphiques
    ├── format.ts       # Formatage unités métrique/impérial
    └── i18n/           # Internationalisation FR/EN
```

Le modèle de données et la couche de stockage sont conçus pour migrer vers un backend
(API + base de données) et accueillir l'import GPX/FIT/TCX et les intégrations
Garmin / Coros / Strava / Polar / Suunto.

## Pistes v2

Coach IA, parsing réel des fichiers GPX/FIT/TCX, intégrations montres connectées,
modèles de séances et semaines récurrentes, backend multi-appareils.
"# Trivora" 
