# SplitEase Stay — Frontend

React + Vite + Tailwind CSS v4 frontend for SplitEase Stay.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`. In dev, API calls to `/api/*` are proxied to
`http://localhost:5000` (see `vite.config.js`) — so make sure the backend is
running locally too.

## Build for production

```bash
npm run build
```

Outputs to `dist/`. Before building for a real deployment, set `VITE_API_URL`
in `.env` to your deployed backend URL (e.g. your Render URL + `/api`).

## Structure

```
src/
  api/          axios instance + endpoint helpers
  context/      AuthContext (login/register/logout state) + useAuth hook
  components/   reusable UI pieces (Logo, Button, Input, LedgerPreview)
  pages/        route-level pages
  routes/       ProtectedRoute wrapper for auth-gated pages
```

## Design system

Tokens live in `src/index.css` under `@theme`:
- Colors: `paper`, `ink`, `accent`, `success`, `danger`, `hairline`, `muted`
- Fonts: `font-display` (Sora), `font-body` (Inter), `font-ledger` (JetBrains Mono — used for all money amounts via the `.ledger-amount` class)

Keep using these tokens (e.g. `bg-paper`, `text-danger`, `font-display`) rather
than introducing new ad-hoc colors, so new pages stay visually consistent.
