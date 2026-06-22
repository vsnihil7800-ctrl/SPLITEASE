# SplitEase Stay

A full-stack expense management app for roommates, hostels, sports teams, and college groups. Splitwise-style expense splitting, recurring bill tracking, UPI settlement, and real-time group chat — with an analytics dashboard to see where the money's actually going.

Built as a clean, deployable, resume-worthy MVP.

---

## Features

- **Auth** — JWT-based register/login, passwords hashed with bcryptjs
- **Groups** — create or join via a 6-character invite code (Stay / Trip / Sports Team / General)
- **Expenses** — equal or custom splits, 8 categories (Rent, Electricity, Food, Travel, WiFi, Groceries, Sports, Misc)
- **Balance calculation & debt simplification** — every member's net position, plus a greedy algorithm that reduces group debts to the minimum number of payments (≤ N−1 for N members)
- **UPI settlement** — one-tap `upi://pay` deep links (opens GPay/PhonePe/Paytm/etc.) for any suggested payment, plus a settlement record/mark-paid flow
- **Bills & payment tracker** — recurring bills (Rent, Electricity, WiFi, Water, Maid, Groceries, Misc) with due dates and per-member paid/pending status
- **Real-time group chat** — Socket.io, one room per group, JWT-authenticated socket connections, membership-checked on every join/send
- **Analytics dashboard** — spend-over-time chart, category breakdown, and per-member contribution totals, per group

---

## Tech stack

**Frontend:** React (Vite) · Tailwind CSS v4 · React Router · Axios · Socket.io client · Recharts

**Backend:** Node.js · Express · MongoDB + Mongoose · JWT · bcryptjs · Socket.io

---

## Project structure

```
splitease/
├── backend/
│   ├── config/         # MongoDB connection
│   ├── controllers/    # request handlers (one per resource)
│   ├── middleware/      # auth (JWT) + centralized error handling
│   ├── models/         # Mongoose schemas: User, Group, Expense, Bill, Settlement, Message
│   ├── routes/         # Express routers, mounted in server.js
│   ├── utils/          # pure-logic helpers: balanceEngine, analyticsEngine, generateToken
│   └── server.js       # Express app + HTTP server + Socket.io setup
│
└── frontend/
    ├── src/
    │   ├── api/         # axios instance + one file per resource (groups, expenses, bills, …)
    │   ├── components/   # reusable UI + self-contained feature panels
    │   ├── context/      # AuthContext (login/register/logout state)
    │   ├── pages/        # route-level pages (Landing, Login, Register, Dashboard, GroupDetail)
    │   └── routes/        # ProtectedRoute wrapper
    └── vite.config.js    # dev proxy: /api -> http://localhost:5000
```

---

## Local setup

You'll need Node.js 18+ and a MongoDB connection (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Any long random string — used to sign auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Frontend origin, for CORS (`http://localhost:5173` for local dev) |

```bash
npm run dev
```

Runs at `http://localhost:5000`. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`. In dev, `VITE_API_URL` can stay unset — Vite proxies `/api/*` to `localhost:5000` (see `vite.config.js`). `VITE_SOCKET_URL` can also stay unset; the chat socket connects straight to the backend origin (derived from `VITE_API_URL`, or `localhost:5000`) since the Vite HTTP proxy doesn't carry WebSocket upgrades.

Open `http://localhost:5173`, register an account, and create or join a group to get started.

---

## API reference

All routes except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <token>`. Group-scoped routes also check that the caller is a member of that group.

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me                       returns { id, name, email, upiId }

Groups
  POST   /api/groups                        create a group
  GET    /api/groups                        groups the user belongs to
  POST   /api/groups/join                   join via invite code
  GET    /api/groups/:id                    group details + members
  GET    /api/groups/:id/balances           net balances + suggested settling payments
  GET    /api/groups/:id/settlements        settlement history for the group
  GET    /api/groups/:id/analytics          ?granularity=month|day — spend over time,
                                             category breakdown, member contributions

Expenses
  POST   /api/expenses                      create (equal or custom split)
  GET    /api/expenses/group/:groupId       list for a group
  DELETE /api/expenses/:id                  only the original payer can delete

Settlements
  GET    /api/settlements/group/:groupId    list for a group
  POST   /api/settlements                   record a payment (both parties must be members)
  PATCH  /api/settlements/:id/mark-paid     only the fromUser or toUser can confirm

Bills
  GET    /api/bills/group/:groupId          sorted by due date, soonest first
  POST   /api/bills                         create (equal or custom split)
  PATCH  /api/bills/:billId/mark-paid       body { userId } — that member or the bill creator
  DELETE /api/bills/:billId                 only the bill's creator

Messages
  GET    /api/messages/group/:groupId       chat history, ?limit & ?before for pagination
                                             (sending is Socket.io-only, see below)
```

### Socket.io events

Connect with `io(url, { auth: { token } })` using the same JWT as REST calls. Unauthenticated connections are rejected before `"connection"` fires.

```
joinGroup(groupId, callback)          membership-checked, joins the room, acks {ok, message?}
leaveGroup(groupId)                   leaves the room, no ack
sendMessage({groupId, text}, callback) membership-checked, persists + broadcasts to the room
                                       (including the sender), acks {ok, message?}
newMessage(message)                   server → client broadcast of a new message
```

---

## Design system

The frontend uses a "digital passbook" theme — tokens live in `frontend/src/index.css` under `@theme`:

- **Colors:** `paper` (background), `ink` (text), `accent` (amber), `success` (green), `danger` (red), `hairline` (borders), `muted` (secondary text)
- **Fonts:** `font-display` (Sora, headings), `font-body` (Inter, body text), `font-ledger` (JetBrains Mono, money amounts — applied via the `.ledger-amount` class)
- **Status colors:** green = paid/settled/owed-to-you, red = owes/overdue, amber = pending

---

## Notes on the balance engine

`backend/utils/balanceEngine.js` is the core money logic, fully decoupled from the database:

- `computeNetBalances(expenses)` — nets out who's owed vs. who owes, per member
- `simplifyDebts(netMap, memberMap)` — a greedy two-pointer algorithm (largest creditor ↔ largest debtor) that collapses everyone's debts into the minimum number of payments
- All amounts use "round half away from zero" rounding to 2 decimal places, with a half-paisa epsilon for near-zero comparisons

This logic was fuzz-tested with 5,000 randomized trials (random group sizes, expense counts, amounts, and participant subsets) checking that net balances always sum to zero and that the simplified payment count never exceeds N−1. `backend/utils/analyticsEngine.js` (spend-over-time, category breakdown, contribution totals) follows the same pure-logic, fuzz-tested approach.

---

## Deployment

Not deployed yet — see [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full step-by-step walkthrough (MongoDB Atlas → Render → Vercel), including the environment variables each platform needs.

---

## License

Personal project — no license specified yet.
