# Finora

Personal finance workspace — local-first, private by default.

**Live:** https://finora.fun

---

## Features

- **Accounts** — cash, bank, e-wallet, credit card, savings, investment, debt / BNPL (with credit limit tracking)
- **Transactions** — income, expense, transfer with categories, tags, and payment methods
- **Budgets** — monthly total budget, per-category budgets, rollover support
- **Analytics** — monthly trends, top categories, savings rate, projected spending
- **Recurring transactions** — daily / weekly / monthly / yearly schedules
- **Google Drive sync** — optional backup to Drive app data (no server required)
- **Bilingual** — English and Thai (ภาษาไทย)
- **In-app guide center** — contextual help for every page and common use cases

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19, Tailwind CSS 3, Radix UI, Lucide |
| Routing | React Router 7 |
| State | Zustand 5 |
| Forms | React Hook Form + Zod |
| Storage | Dexie (IndexedDB) |
| Charts | Recharts |
| i18n | i18next + react-i18next |
| Auth | @react-oauth/google |
| Build | Vite 8, TypeScript 6 |
| Tests | Vitest, React Testing Library, Playwright |

## Getting started

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | No | OAuth client ID for Google Drive sync |

Google Drive sync is disabled if the variable is not set — the rest of the app works without it.

### Setting up Google Drive sync

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project
2. Enable the **Google Drive API**
3. Create an **OAuth 2.0 Web Client** credential
4. Add `http://localhost:5173` (dev) and `https://finora.fun` (prod) to Authorized JavaScript Origins
5. Copy the Client ID into `VITE_GOOGLE_CLIENT_ID`

## Scripts

```bash
npm run dev          # start dev server
npm run build        # typecheck + production build
npm run preview      # preview production build locally
npm run typecheck    # TypeScript check only
npm run lint         # ESLint
npm test             # unit tests (single run)
npm run test:watch   # unit tests (watch mode)
npm run e2e          # Playwright end-to-end tests
```

## Data and privacy

All finance data is stored in **IndexedDB in the local browser**. No data is sent to any server unless you explicitly enable Google Drive sync, which only writes to your own Google account's app data folder.

Restoring a JSON backup replaces all local data — export a backup first if you want to keep it.

## Project structure

```
src/
├── components/
│   ├── help/          # HelpButton, HelpDialog, UseCaseCard, GuideCenter
│   └── ui/            # Design system primitives
├── domain/            # Types, schemas, calculations, backup, guides
├── pages/             # Route-level page components
├── storage/           # Dexie DB and repository layer
├── store/             # Zustand finance store
├── sync/              # Google Drive sync logic and decisions
├── locales/           # en.json, th.json
└── data/              # Demo data builder
```
