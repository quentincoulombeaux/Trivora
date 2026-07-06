# Trivora

**Performance management platform for triathletes and endurance athletes.**
Running · Cycling · Swimming.

Trivora is more than a training log: it's a foundation built to support an athlete
over several years (planning, tracking, analytics, goals, personal records,
training load).

## Running the app

Requirements: **Node.js 18.18+** (recommended: Node 20 or 22).

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (http://localhost:3000)
npm run dev
```

For an optimized build:

```bash
npm run build
npm run start
```

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** — light/dark design system with CSS tokens
- **Framer Motion** — animations and micro-interactions
- **Recharts** — interactive charts (TradingView style)
- **Zustand** (+ persist) — global state persisted in the browser (localStorage)
- **lucide-react**, **date-fns**

## Features (v1)

| Page | Content |
|------|---------|
| **Dashboard** | Personalized home, upcoming workouts, personal records (run/bike/swim), activity summary, discipline breakdown, goals |
| **Running / Cycling / Swimming** | Log sessions with automatic calculations (pace, speed, SWOLF), record detection, trends |
| **Calendar** | Week/month views, scheduling future sessions, drag-and-drop to reschedule |
| **History** | Search, filters (discipline / period), sorting, pagination, table + timeline views |
| **Analytics** | Volume, training load (CTL/ATL model), trends by discipline |
| **AI Coach** | Placeholder page ("coming soon") |
| **Settings** | Profile, language (FR/EN), units (metric/imperial), theme, JSON export/import, CSV export |

## Data

All data lives in the browser (localStorage). On first launch, a sample dataset
(~6 months of training) is loaded so you can explore the app.
Reset or clear everything from **Settings → Data & backup**.

Backup / restore: full JSON export and import (profile + sessions + goals).

## Architecture & scalability

```
src/
├── app/            # Routes (App Router) — one real page per section
├── components/     # Reusable UI (cards, session modal, charts, navigation)
└── lib/
    ├── types.ts        # Data model
    ├── store.ts        # Zustand + localStorage persistence
    ├── calc.ts         # Pace, SWOLF, load, record detection
    ├── selectors.ts    # Time series for the charts
    ├── format.ts       # Metric/imperial unit formatting
    └── i18n/           # FR/EN internationalization
```

The data model and storage layer are designed to migrate to a backend
(API + database) and to support GPX/FIT/TCX import as well as
Garmin / Coros / Strava / Polar / Suunto integrations.

## v2 roadmap

AI Coach, real GPX/FIT/TCX file parsing, smartwatch integrations,
workout and recurring-week templates, multi-device backend.
