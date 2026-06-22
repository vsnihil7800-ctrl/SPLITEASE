# Deploying SplitEase Stay

A step-by-step guide to take the app from local dev to live, in three stages:

**MongoDB Atlas** (database) → **Render** (backend API + Socket.io) → **Vercel** (frontend)

Do them in this order — each stage needs a value produced by the one before it. Budget ~20–30 minutes total.

---

## Stage 1 — MongoDB Atlas (database)

1. Log into [cloud.mongodb.com](https://cloud.mongodb.com).
2. If you don't already have a free cluster: **Database** → **Build a Database** → pick the **free M0** tier → choose any region close to you → **Create**.
3. **Create a database user** (Database Access → Add New Database User):
   - Username/password auth, autogenerate a secure password, **save it somewhere** — you'll need it in a moment.
4. **Allow network access** (Network Access → Add IP Address):
   - For this project, click **Allow Access from Anywhere** (`0.0.0.0/0`). Render's IPs aren't static on the free tier, so this is the practical option for a hobby/resume project. (Not ideal for a real production app with sensitive data, but fine here.)
5. **Get your connection string**: Database → **Connect** → **Drivers** → Node.js. Copy the string, it looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
   ```
6. Edit it:
   - Replace `<username>` and `<password>` with the database user you just created (not your Atlas login).
   - Add a database name before the `?`, e.g. `.../splitease-stay?retryWrites=true&w=majority`.

✅ **Checkpoint** — you should now have a full `MONGO_URI` string like:
```
mongodb+srv://splitease_user:yourpassword@cluster0.xxxxx.mongodb.net/splitease-stay?retryWrites=true&w=majority
```
Keep this handy for Stage 2.

---

## Stage 2 — Render (backend)

1. Log into [render.com](https://render.com), connect your GitHub if you haven't (Render deploys from a git repo — push this project to GitHub first if it isn't already there).
2. **New** → **Web Service** → pick the repo containing this project.
3. Configure:
   | Field | Value |
   |---|---|
   | Name | `splitease-stay-backend` (or anything) |
   | Root Directory | `backend` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |
4. **Environment Variables** (Render's "Environment" tab) — add these, matching `backend/.env.example`:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | the connection string from Stage 1 |
   | `JWT_SECRET` | any long random string (generate one — see tip below) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | leave as `http://localhost:5173` for now — **you'll update this in Stage 3** once you have the real Vercel URL |
   | `NODE_ENV` | `production` |

   > **Generating `JWT_SECRET`**: any long random string works. If you have a terminal handy: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Or just mash the keyboard for 40+ characters.

5. **Create Web Service**. Render will install dependencies and start the server — watch the build log.
6. Once live, Render gives you a URL like `https://splitease-stay-backend.onrender.com`. Test it:
   - Visit `https://splitease-stay-backend.onrender.com/api/health` in a browser — should return `{"status":"ok",...}`.

✅ **Checkpoint** — note your Render URL. You'll need it twice in Stage 3: once as `VITE_API_URL` (with `/api` appended) and once as `VITE_SOCKET_URL` (without it).

> **Free tier note**: Render's free web services spin down after ~15 minutes of inactivity and take 30–60 seconds to wake back up on the next request. That's normal — not a bug — for a free-tier demo.

---

## Stage 3 — Vercel (frontend)

1. Log into [vercel.com](https://vercel.com), connect GitHub if needed.
2. **Add New** → **Project** → import the same repo.
3. Configure:
   | Field | Value |
   |---|---|
   | Root Directory | `frontend` |
   | Framework Preset | Vite (should auto-detect) |
   | Build Command | `npm run build` (default) |
   | Output Directory | `dist` (default) |
4. **Environment Variables** — add these, matching `frontend/.env.example`:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render URL + `/api`, e.g. `https://splitease-stay-backend.onrender.com/api` |
   | `VITE_SOCKET_URL` | your Render URL with **no** `/api`, e.g. `https://splitease-stay-backend.onrender.com` |
5. **Deploy**. Vercel gives you a URL like `https://splitease-stay.vercel.app`.

---

## Stage 4 — close the loop: update CORS on Render

The backend's `CLIENT_URL` still points at `localhost:5173`. Now that you have a real Vercel URL:

1. Back in **Render** → your backend service → **Environment** → edit `CLIENT_URL` → set it to your real Vercel URL (e.g. `https://splitease-stay.vercel.app`, no trailing slash).
2. Save — Render will automatically redeploy with the new value.

This matters because `server.js` reads `CLIENT_URL` into a single `clientUrl` variable (line 24) that's used for **both** the Express CORS middleware (line 37) and the Socket.io CORS config (line 28) — without this step, the deployed frontend's API calls and chat socket connections will be blocked by CORS.

---

## Stage 5 — verify end to end

1. Open your Vercel URL.
2. Register a new account, create a group, copy the invite code.
3. Add an expense, check the Balances panel computes correctly.
4. Add a bill, mark a share paid.
5. Open the group's chat — send a message. (Open the same group in a second browser/incognito tab logged in as a different user to confirm live delivery.)
6. Check the Analytics tab renders charts once there's at least one expense or bill.

If something doesn't work, the most common culprits, in order:
- **CORS errors in browser console** → `CLIENT_URL` on Render doesn't exactly match the Vercel URL (check for trailing slash mismatches, `http` vs `https`).
- **Chat won't connect** → `VITE_SOCKET_URL` missing the right origin, or still pointing at `localhost`.
- **401s on every request** → `JWT_SECRET` wasn't actually saved on Render, or the frontend is calling the wrong `VITE_API_URL`.
- **Backend won't start on Render** → check the build log; usually a missing/malformed `MONGO_URI` (Atlas network access not set to allow Render's IPs, or wrong password).

---

## Reference: full environment variable list

**Backend (Render)**
```
PORT          — Render sets this automatically, you don't need to set it
MONGO_URI     — from MongoDB Atlas, Stage 1
JWT_SECRET    — any long random string
JWT_EXPIRES_IN — 7d
CLIENT_URL    — your Vercel URL (Stage 4)
NODE_ENV      — production
```

**Frontend (Vercel)**
```
VITE_API_URL    — your Render URL + /api
VITE_SOCKET_URL — your Render URL, no /api
```
