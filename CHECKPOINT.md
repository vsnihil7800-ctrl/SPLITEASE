# SplitEase Stay — Project Handoff Summary
(Paste this whole thing into a new chat with Claude, along with the latest checkpoint zip, to resume exactly where we left off.)

## What this is
Full-stack MVP called **SplitEase Stay** — a roommate/hostel/sports-team/college-group expense management app. Splitwise-style expense splitting + recurring bill tracking + UPI settlement + paid/unpaid status + real-time group chat + analytics. Goal: clean, deployable, resume-worthy MVP.

## Tech stack
- Frontend: React (Vite) + Tailwind CSS v4 + React Router + Axios
- Backend: Node.js + Express + MongoDB + Mongoose + JWT + **bcryptjs** (not bcrypt — same API, no native compile step, deploy-safer) + Socket.io

## My (the user's) preferences — please follow these
- I already have MongoDB Atlas + Render + Vercel accounts set up (used this exact stack before). Deployment happens as a guided, step-by-step walkthrough only at the very end, once all features are built.
- Build in phases: one phase at a time, verify it actually works (not just "looks done"), then package a checkpoint zip.
- After every phase, zip the **entire project** (backend + frontend together, not just the new part) and give it to me, so I only ever need to keep the latest zip.
- Don't over-explain or ask permission before every phase — just keep building and check in at real milestones or actual decisions.
- Keep responses and verification efficient — focus deep testing on real business logic (debt simplification, balance math, UPI links), not boilerplate.

## Build order (from original spec) — ✅ = done
1. ✅ Backend setup
2. ✅ MongoDB connection
3. ✅ Auth system
4. ✅ Frontend setup
5. ✅ Login/register pages
6. ✅ Groups
7. ✅ Expenses
8. ✅ Balance calculation
9. ✅ Debt simplification algorithm
10. ✅ UPI settlement
11. ✅ Bills/payment tracker
12. ✅ Group chat (Socket.io)
13. ✅ Analytics dashboard
14. ✅ Final README
15. 🔶 Guided deployment (MongoDB Atlas → Render → Vercel) ← **guide written this session, live walkthrough with user in progress**

## Phases 1–7 summary
See previous CHECKPOINT notes — fully captured. Short version: full backend (Express, Mongoose models for User/Group/Expense/Bill/Settlement/Message, JWT auth, all routes), full frontend auth + groups + expenses UI, "digital passbook" design theme.

## Phase 8+9+10 — Balance Calculation + Debt Simplification + UPI Settlement (DONE)

These three were built together as one phase since they're tightly coupled.

### Backend

**`backend/utils/balanceEngine.js`** — new pure-logic utility (no DB, no Express dependency — fully unit/fuzz testable in isolation):
- `computeNetBalances(expenses)` — takes a list of populated Expense docs, returns a `Map<userId, net>` where positive = is owed money, negative = owes money. For each expense: payer is credited the full amount, each split participant is debited their share. Values rounded to 2 decimal places throughout.
- `simplifyDebts(netMap, memberMap)` — greedy two-pointer algorithm: separates into creditors/debtors sorted by absolute value, matches largest creditor to largest debtor, producing ≤ N-1 transactions for N participants. Returns `[{ from: {id,name,email,upiId}, to: {id,name,email,upiId}, amount }]`.
- `round2(n)` — shared rounding utility, "round half away from zero", same strategy as Phase 7's `buildEqualSplits`.
- `EPSILON = 0.005` — half a paisa, used as near-zero threshold throughout.

**`backend/controllers/groupController.js`** — `getGroupBalances` stub replaced with real implementation:
- Fetches all group expenses (with populated paidBy + splits.userId)
- Builds memberMap from populated group.members
- Calls `computeNetBalances` + `simplifyDebts`
- Ensures every member appears in `netBalances` even if they have no expenses yet (net = 0)
- Response: `{ netBalances: [{user:{id,name,email,upiId}, net}], suggestedPayments: [{from,to,amount}], totalExpenses }`

**`backend/controllers/settlementController.js`** — new:
- `createSettlement` — `POST /api/settlements`. Body: `{groupId, fromUser, toUser, amount}`. Validates both parties are group members. The caller must also be a member. Creates a `pending` Settlement document.
- `markSettlementPaid` — `PATCH /api/settlements/:id/mark-paid`. Only the `fromUser` or `toUser` of the specific settlement can call this.
- `getGroupSettlements` — `GET /api/settlements/group/:groupId`. Returns all settlements (pending + paid) for a group, newest first.

**`backend/routes/settlementRoutes.js`** — filled in (was empty stub): `GET /group/:groupId`, `POST /`, `PATCH /:id/mark-paid`.

### Frontend

**`frontend/src/api/settlements.js`** — new: `getGroupBalancesRequest`, `createSettlementRequest`, `markSettlementPaidRequest`, `getGroupSettlementsRequest`.

**`frontend/src/components/BalancesPanel.jsx`** — new, the most complex frontend component so far. Renders:
- **Per-member net balances** table: each member's net shown as a color-coded pill (success=owed, danger=owes, muted=settled). Current user labeled "(you)".
- **Suggested payments** section: each `{ from → to, amount }` row. If the current user is the `from` person: shows a "Pay via UPI" deep-link (`upi://pay?pa=...&pn=...&am=...&cu=INR`) if the receiver has a UPI ID, PLUS a "Record payment" button that calls `createSettlementRequest`.
- **Settlement history** — collapsible toggle (hidden until at least one settlement exists). Each row: from→to, date, amount, status. Current user (fromUser or toUser) sees "Mark paid" button; others see "Pending" badge; paid ones show "Paid ✓".
- UPI link builder: `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR&tn=SplitEase Stay` — opens any UPI app installed on the device.

**`frontend/src/pages/Dashboard.jsx`** — updated:
- After fetching groups, fires `Promise.allSettled` on parallel `getGroupBalancesRequest` calls for all groups.
- Extracts current user's `net` from each group's `netBalances` array.
- Passes `myNet` prop to each `GroupCard`.
- `user` added to `useEffect` dependency array (ESLint exhaustive-deps requirement).

**`frontend/src/components/GroupCard.jsx`** — updated:
- Accepts `myNet` prop (number | undefined).
- Shows net in color-coded `.ledger-amount` text: success (green) if positive, danger (red) if negative, muted "Settled up" if ~zero, muted "—" if undefined (still loading).

**`frontend/src/pages/GroupDetail.jsx`** — updated:
- The "coming soon" placeholder at the bottom replaced with `<BalancesPanel groupId={id} />`.
- `BalancesPanel` is imported and self-contained — no additional state needed in GroupDetail.

### Verified (not just assumed) — this phase

**Balance engine — fuzz-tested hard:**
- 19 unit tests: 2-person splits, classic ₹100÷3 rounding, multi-expense netting, already-settled zero case, 4-person simplification, debt chain collapse. All passed.
- Net conservation invariant (`sum of all nets = 0`) checked in every trial.
- Simplification transaction count checked (`≤ N-1`) in every trial.
- **5,000-iteration randomized fuzz test**: random group sizes (2–11), random expense counts (1–8), random amounts (₹0.01–₹9,999.99), random participant subsets — 5,000/5,000 trials passed. Zero conservation violations, zero simplification failures.

**Full browser E2E — 12 scenarios, all passed:**
1. GroupCard shows Bob's negative net (he owes) in danger color
2. Balances section heading present on GroupDetail
3. Total group spend shows ₹360
4. Alice shows as owed (positive net, success color) — ₹+200
5. Bob shows as owing (negative net, danger color) — ₹-130
6. Carol shows as owing (negative net) — ₹-70
7. "Suggested payments" section appears
8. Bob → Alice payment row visible with ₹130
9. "Record payment" button visible for Bob (the current user = payer)
10. "Pay via UPI" link appears (Alice has alice@upi)
11. Recording a payment shows settlement history toggle and "Mark paid" button (Bob is fromUser, so he sees "Mark paid" not "Pending" — correct by design; non-participants see "Pending")
12. "Mark paid" changes status to "Paid ✓"

**A subtle UX design decision documented:** The "Pending" badge in settlement history is intentionally only shown to non-participants (users who are neither the payer nor receiver of that specific settlement). Participants see "Mark paid" directly — no intermediate "Pending" state for them. This is correct behavior and the E2E reflects it.

## Phase 11 — Bills/payment tracker (DONE)

### Backend

**`backend/controllers/billController.js`** — new:
- `buildEqualShares(amount, userIds)` / `sharesSumMatchesAmount(shares, amount)` — same rounding strategy as `expenseController`'s `buildEqualSplits`/`splitsSumMatchesAmount` (remainder paisa goes to the first user, so shares always sum exactly to the total).
- `createBill` — `POST /api/bills`. Body: `{groupId, title, amount, dueDate, category, splitType, members}`. Mirrors `createExpense`'s `splitType` pattern exactly: `splitType: "equal"` + omitted/partial `members` defaults to splitting amount across all group members (or an explicit subset, sent as bare `{userId}` — amount computed server-side); `splitType: "custom"` requires `members: [{userId, amount}]` summing to the total (half-paisa tolerance). **Caught and fixed a bug during this phase**: an earlier draft inferred equal-vs-custom from whether `members` was present at all, which silently broke for an explicit equal-split subset (bare `{userId}`, no `amount` key) — same trap `expenseController` already had to solve with an explicit `splitType` flag. Fixed to use the same flag-based branching before this ever hit the frontend.
- `getBillsByGroup` — `GET /api/bills/group/:groupId`. Populates `members.userId` and `createdBy`, sorted by `dueDate` ascending (soonest due first).
- `markBillPaid` — `PATCH /api/bills/:billId/mark-paid`. Body: `{userId}`. Marks one member's share paid. Caller must be either that member themself *or* the bill's creator (creator can pay on someone's behalf, e.g. landlord/admin collecting rent). Calls the `Bill` model's existing `recomputeStatus()` method to keep the bill's overall `status` (`pending`/`partially paid`/`paid`) in sync.
- `deleteBill` — `DELETE /api/bills/:billId`. Creator-only, same ownership pattern as `deleteExpense`.

**`backend/routes/billRoutes.js`** — filled in (was empty stub): `GET /group/:groupId`, `POST /`, `PATCH /:billId/mark-paid`, `DELETE /:billId`. Already mounted at `/api/bills` in `server.js` from Phase 1 — no server.js changes needed.

### Frontend

**`frontend/src/api/bills.js`** — new: `createBillRequest`, `getBillsByGroupRequest`, `markBillPaidRequest`, `deleteBillRequest`.

**`frontend/src/components/AddBillForm.jsx`** — new, structurally a near-twin of `AddExpenseForm.jsx`: title, amount, category (Bill categories, not Expense categories), due date picker, Equal/Custom split toggle with the same checkbox-list / per-person-amount-input patterns and the same "remaining to allocate" live validation.

**`frontend/src/components/BillCard.jsx`** — new: collapsed row shows category icon, title, due date, `paidCount/total paid`, total amount, and a status badge (`Paid ✓` / `Overdue` / `Partially paid` / `Pending` — overdue computed client-side as `status !== "paid" && dueDate < now`). Expands (click anywhere on the row) to show each member's share with a per-member "Mark paid" button (visible to that member or the bill creator; otherwise shows a "Pending"/"Paid" pill) and, for the creator, a "Delete bill" button.

**`frontend/src/components/BillsPanel.jsx`** — new, self-contained container (same shape as `BalancesPanel`): fetches bills for the group, renders the "+ Add bill" button + `Modal` + `AddBillForm`, and the list of `BillCard`s. Bills are sorted unpaid-first (by soonest due date), with fully-paid bills pushed to the bottom.

**`frontend/src/pages/GroupDetail.jsx`** — updated: `BillsPanel` inserted between the Expenses section and `BalancesPanel`, passed `groupId` and `group.members`. No new local state needed — same self-contained-panel pattern as `BalancesPanel`.

### Verified (not just assumed) — this phase

**Important environment change this phase: no npm registry access.** Unlike earlier phases (see Sandbox notes below — previously had npm/github access), this sandbox session returned `403 host_not_allowed` for `registry.npmjs.org`, and no `node_modules` existed already. This meant the full real-Vite-dev-server + headless-Chromium E2E flow used in Phases 1–10 **could not be run this phase**. Verification was adapted accordingly, still without skipping real checks:
- **Backend logic — fuzz-tested in isolation** (same bar as `balanceEngine`): re-implemented `buildEqualShares`/`sharesSumMatchesAmount`/the full `createBill` member-resolution branching as standalone functions (no mongoose import) and ran them directly with Node. 7 targeted scenarios (equal-default-all, equal-explicit-subset, ₹100÷3 rounding, custom-split-exact, custom-split-mismatch-rejected, equal-split-rejects-non-member) all passed, plus a 3,000-iteration fuzz test randomizing subset size and amount — zero conservation failures. This fuzz test is what caught the equal/custom branching bug described above, *before* it could reach the frontend.
- **`recomputeStatus` logic** (from the pre-existing `Bill` model) re-verified standalone: all-pending → `pending`, all-paid → `paid`, mixed → `partially paid`.
- **Backend syntax**: `node --check` on `billController.js` and `billRoutes.js` — clean.
- **Frontend syntax/JSX**: no bundler available, so used the globally-installed `typescript` package's `transpileModule` (JSX emit mode) to parse every new/modified frontend file (`api/bills.js`, `AddBillForm.jsx`, `BillCard.jsx`, `BillsPanel.jsx`, `GroupDetail.jsx`) — zero diagnostics on all five.
- **Manual data-shape trace** (in place of a real running E2E): traced the full create-bill round trip — `AddBillForm` payload shape → `BillsPanel`'s `createBillRequest` call → `billController`'s destructured `req.body` fields — confirming `splitType` is actually sent (this is what the bug fix above depends on); traced `Bill` model's `members.userId` schema → controller's `.populate("members.userId", ...)` → `BillCard`'s `member.userId?._id`/`member.userId?.name` usage, confirming populated-doc shape matches; cross-checked id-field conventions against the existing, already-verified `ExpenseRow.jsx` (`expense.paidBy?._id`) to make sure `BillCard` followed the same raw-Mongoose-doc-uses-`_id` vs normalized-auth-user-uses-`.id` distinction already established in `BalancesPanel.jsx`.
- **What this phase's verification does NOT cover, that previous phases' did**: no real Mongoose validation round-trip (e.g. actually hitting `Bill.create()` against a DB), no real browser rendering/click-through, no real HTTP request/response cycle. The next session should re-run a full Vite+mock-backend+headless-Chromium E2E pass over the Bills feature (and ideally Phases 1–10 as a regression check) the moment npm registry access is available again, before trusting this phase as fully "browser-verified" the way Phase 8 was.

## Phase 12 — Group chat / Socket.io (DONE)

### Backend

**`backend/server.js`** — this is where almost all the real work happened (the Message model and `joinGroup`/`leaveGroup` scaffolding already existed from Phase 1; this phase made them real):
- **`io.use(...)` auth middleware** — new. Every socket connection must present a JWT at handshake time via `io(url, { auth: { token } })`. Verifies with `jwt.verify` against `JWT_SECRET` (same secret/pattern as the REST `protect` middleware), loads the user via `User.findById(decoded.id).select("-password")`, and attaches it as `socket.user`. Connections without a valid token are rejected before `"connection"` fires — **this closes a real hole**: the pre-Phase-12 scaffolding let any socket join any group's room with zero auth or membership checks.
- **`joinGroup` handler** — rewritten. Was a no-check `socket.join(groupId)`; now verifies `socket.user` is actually a member of that group (`Group.findById` + membership check) before joining the room, and acks back `{ok, message?}` so the frontend knows if a join was rejected.
- **`leaveGroup`** — unchanged (`socket.leave(groupId)`; leaving needs no auth check).
- **`sendMessage` handler** — new. Body: `{groupId, text}`. Validates text is a non-empty string (trimmed, capped at 2000 chars — generous, no hard schema limit existed), re-checks group membership (defense in depth — a socket could have joined a group's room before being removed from the group), persists via `Message.create` with `messageType: "user"` and a denormalized `senderName` (so history renders even if a `sender` ref is ever null, e.g. future deleted-user case), then **broadcasts the populated doc to the entire room including the sender** (`io.to(groupId).emit("newMessage", populated)`) rather than having the frontend optimistically echo its own message — avoids any sender-side state ever diverging from the server's source of truth. Acks back `{ok, message?}` to the sender for inline error display.

**`backend/controllers/messageController.js`** — new: `getMessagesByGroup` — `GET /api/messages/group/:groupId`. Membership-checked like every other group-scoped endpoint. Supports `?limit` (default 50, hard-capped at 200) and `?before=<ISO date>` for backward pagination; fetches newest-first internally then reverses to chronological order for rendering (so a future "load older messages" button can page backward without changing the render-order contract).

**`backend/routes/messageRoutes.js`** — filled in (was empty stub): `GET /group/:groupId` only. Sending messages is Socket.io-only by design — there's no `POST /api/messages`, since a message that bypassed the socket broadcast would never reach anyone live.

### Frontend

**`frontend/src/api/socket.js`** — new: a singleton Socket.io client wrapper. `getSocket(token)` creates (or reuses) one authenticated connection per browser tab; `disconnectSocket()` tears it down. Resolves the connection URL via `VITE_SOCKET_URL` if set, else strips the trailing `/api` off `VITE_API_URL`, else falls back to `http://localhost:5000` for local dev (Vite's HTTP proxy doesn't carry WebSocket upgrades the way the `/api` REST proxy does, so the socket always connects directly to the backend origin, bypassing the Vite proxy).

**`frontend/src/api/messages.js`** — new: `getMessagesByGroupRequest(groupId, params)` for chat history.

**`frontend/src/components/ChatPanel.jsx`** — new, self-contained (same shape as `BalancesPanel`/`BillsPanel`):
- Loads history once via REST on mount, then opens a socket connection, joins the group's room (with an ack-checked callback), and subscribes to `newMessage` for live updates — with a defensive de-dupe by `_id` in case of any race between an ack and a broadcast.
- Renders messages as chat bubbles (sender's own messages right-aligned/dark, others left-aligned/light, with avatar initials), auto-scrolls to bottom on new messages, shows a live "Live"/"Connecting…" indicator.
- Send box is a `<textarea>` with Enter-to-send / Shift+Enter-for-newline, emits `sendMessage` with an ack callback, clears the draft only on success (relies on the broadcast loop-back to actually render the sent message — no optimistic local append, see `sendMessage` handler notes above).
- `messageType: "system"` rendering path exists (centered pill, no avatar) for future system messages (e.g. "Alice added an expense") even though nothing emits them yet.

**`frontend/src/pages/GroupDetail.jsx`** — updated: `ChatPanel` added as the last section (after Balances). Also added a page-level `useEffect` cleanup that calls `disconnectSocket()` on unmount, so navigating away from a group page fully tears down the socket rather than leaking a connection that's still joined to a room.

**`frontend/package.json`** — added `socket.io-client` to dependencies (backend already had `socket.io`).

**`frontend/.env.example`** — documented the new optional `VITE_SOCKET_URL` var.

### Verified (not just assumed) — this phase

**Same npm-registry-unavailable situation as Phase 11** (see Sandbox notes — `registry.npmjs.org` still returning `403 host_not_allowed` this session), so again no real Vite+mock-backend+headless-Chromium E2E run. Verification:
- **Backend syntax**: `node --check` across every backend file (not just the new ones — a full sweep of `server.js`, all controllers, routes, middleware, utils, models, config) — all clean. Specifically re-checked `server.js` carefully since it changed the most.
- **Frontend syntax/JSX**: same `typescript` `transpileModule` JSX-parse trick as Phase 11, run against `api/messages.js`, `api/socket.js`, `components/ChatPanel.jsx`, `pages/GroupDetail.jsx` — zero diagnostics.
- **Socket auth/membership/validation logic — fuzz/scenario-tested in isolation**: re-implemented the `joinGroup` and `sendMessage` handlers' core logic (membership check, text validation, trim, 2000-char cap) as standalone functions with no Express/Socket.io/Mongo dependency, ran 11 targeted scenarios (member can join, non-member rejected, nonexistent-group join rejected, member can send, non-member send rejected, empty/whitespace-only/non-string text rejected, missing groupId rejected, text correctly trimmed, long text correctly capped at 2000) — all 11 passed.
- **Manual trace, auth middleware against the existing `protect` pattern**: confirmed the new `io.use()` socket middleware uses the exact same `jwt.verify(token, process.env.JWT_SECRET)` + `User.findById(decoded.id).select("-password")` calls as the already-trusted REST `protect` middleware — no parallel, possibly-inconsistent auth logic introduced.
- **Manual trace, id-field conventions**: confirmed `ChatPanel`'s `isMe` check (`(m.sender?._id || m.sender) === user?.id`) follows the same populated-raw-Mongoose-doc-uses-`_id` vs normalized-auth-user-uses-`.id` split already established and verified in `ExpenseRow`/`BillCard`/`BalancesPanel` — not a new pattern, reuses the proven one.
- **Manual trace, Message schema → controller → frontend**: confirmed `Message.create({groupId, sender, senderName, text, messageType})` matches the schema exactly, that both the REST history endpoint and the socket broadcast populate `sender` the same way (`"name email upiId"`), and that `ChatPanel`'s `MessageBubble` reads `message.sender?.name || message.senderName` (so it degrades gracefully to the denormalized name if `sender` is ever unpopulated or null).
- **Manual trace, malformed-input safety**: confirmed both `joinGroup` and `sendMessage` wrap their logic in `try/catch`, so a malformed `groupId` (which makes `Group.findById` throw a Mongoose `CastError` rather than return `null`) is caught and resolves to a clean `{ok: false}` ack instead of crashing the handler or leaving the client's ack callback hanging forever.
- **What this phase's verification does NOT cover**: no real running Socket.io server/client pair, no real concurrent-multi-socket test (e.g. two browser tabs actually seeing each other's messages live), no real JWT round-trip against a running server, no real MongoDB writes. **This phase has the least amount of real-environment verification of any phase so far**, precisely because it's the first phase where the feature *is* the network layer (sockets) rather than something that degrades to "just HTTP" for testing purposes. Strongly recommend the next session run a full real E2E pass — ideally with two simulated socket clients — over Chat before building Analytics on top of it, the moment npm/registry access is back.

## Phase 13 — Analytics dashboard (DONE)

No new models needed, as predicted — purely aggregation over existing `Expense`/`Bill` collections, plus a charting library on the frontend.

### Backend

**`backend/utils/analyticsEngine.js`** — new pure-logic utility (no DB, no Express — same philosophy as `balanceEngine.js`, fully unit/fuzz-testable in isolation):
- `buildCategoryBreakdown(expenses, bills)` — combines spend from both collections under shared category labels, returns `[{category, amount, count}]` sorted by amount descending. Missing/undefined category defaults to `"Misc"` (matches both schemas' own default).
- `buildSpendOverTime(expenses, bills, granularity)` — buckets into calendar months (`"YYYY-MM"`) or days (`"YYYY-MM-DD"`) using UTC (deterministic regardless of server timezone), returns chronologically-sorted `[{period, expenses, bills, total}]`. Expenses bucket by `expense.date` (falls back to `createdAt` if `date` is ever absent); bills deliberately bucket by `bill.createdAt`, **not** `dueDate` — a bill's due date can be in the future and would skew a "spend over time" chart toward dates that haven't happened yet. This was a deliberate design decision, not an oversight.
- `buildMemberContributions(expenses, memberMap)` — gross amount each member has *paid* (fronted) across all expenses, descending. Deliberately distinct from net balance (Phase 8's `computeNetBalances`, which nets out what they owe back) — this answers "who's actually been putting money down," not "who's currently owed." Every member appears even with zero expenses (mirrors `getGroupBalances`' existing "every member appears" guarantee). Handles both populated (`paidBy._id`) and unpopulated (`paidBy` as raw ObjectId/string) shapes.
- `round2(n)` — same "round half away from zero" rounding utility, copied for module independence rather than imported from `balanceEngine.js` (kept the two engines decoupled on purpose, same reasoning as not cross-importing between `expenseController`/`billController`'s near-twin split-building helpers).

**`backend/controllers/groupController.js`** — new `getGroupAnalytics`:
- `GET /api/groups/:id/analytics?granularity=month|day` (default `"month"`).
- Same membership-check-then-fetch-then-compute shape as `getGroupBalances`: loads the group + members, fetches all `Expense` and `Bill` docs for the group in parallel (`Promise.all`), builds a `memberMap` the same way `getGroupBalances` does, calls the three `analyticsEngine` functions, returns `{totalExpenses, totalBills, totalSpend, expenseCount, billCount, categoryBreakdown, spendOverTime, memberContributions}`.
- Local `round2Sum` helper sums an array and rounds once at the end (avoids compounding float drift from rounding every addend individually before summing).

**`backend/routes/groupRoutes.js`** — added `GET /:id/analytics`, same `protect`-wrapped pattern as the other group sub-routes.

### Frontend

**`frontend/src/api/analytics.js`** — new: `getGroupAnalyticsRequest(groupId, granularity)`.

**`frontend/src/components/AnalyticsPanel.jsx`** — new, self-contained (same shape as `BalancesPanel`/`BillsPanel`/`ChatPanel`). Uses **Recharts** (newly added to `frontend/package.json`, same pattern as `socket.io-client` in Phase 12):
- Month/day granularity toggle (re-fetches on change).
- Summary strip: total spend, total expenses (+ count), total bills (+ count).
- **Spend over time**: stacked bar chart (expenses + bills per period), custom tooltip using the existing `.ledger-amount`/design-token colors rather than Recharts' default styling.
- **By category**: donut chart (Recharts `Pie` with `innerRadius`) + a legend list with color swatches, amounts formatted via a local `fmtInr` (same `toLocaleString("en-IN")` pattern as `BalancesPanel`).
- **Who's fronted the most**: ranked list of member contributions with proportional bar-width indicators (relative to the top contributor), current user labeled "(you)" (same convention as `BalancesPanel`'s net-balances table).
- Empty state when a group has zero expenses and zero bills.
- All chart colors reference the existing CSS custom properties (`var(--color-accent)`, `var(--color-ink)`, etc.) rather than introducing new ad-hoc colors — per the established design-token convention.

**`frontend/src/pages/GroupDetail.jsx`** — updated: `AnalyticsPanel` inserted between `BalancesPanel` and `ChatPanel`, passed only `groupId` — no additional state needed, same self-contained-panel pattern as the others.

**`frontend/package.json`** — added `recharts` to dependencies.

### Verified (not just assumed) — this phase

**Same npm-registry-unavailable situation as Phases 11–12** (`registry.npmjs.org` still `403 host_not_allowed`, no cached `node_modules` for either package) — third phase in a row now. No real Vite+mock-backend+headless-Chromium E2E run was possible. Verification:
- **Backend logic — fuzz-tested in isolation**, same bar as `balanceEngine`/Phase 11's bill-share logic: re-ran `analyticsEngine.js`'s three functions directly with Node (no Mongoose import needed — they're pure). 10 targeted scenarios (empty inputs, category combination across expenses+bills with correct sort order, missing-category defaults to Misc, month-bucketing with multiple expenses/bills in the same and different months, day-granularity bucketing, date-field fallback to `createdAt`, member contributions with populated vs. raw-ObjectId `paidBy`, zero-expense members still appearing, ₹33.33×2+33.34 rounding-to-exactly-100 check) all passed, plus a **3,000-iteration fuzz test** randomizing member count (2–9), expense count (1–8), bill count (0–4), amounts (₹0.01–₹9,999.99), categories, and dates across the year — checking three invariants every trial: (1) category-breakdown total conserves expense-total + bill-total, and category counts sum to total doc count; (2) spend-over-time total also conserves, and periods are returned in chronological sort order; (3) member-contribution total conserves expense-total exactly, and every known member appears exactly once. 3,000/3,000 trials passed, zero conservation violations.
- **Backend syntax**: `node --check` across the entire backend (full sweep, not just new files) — all clean.
- **Frontend syntax/JSX**: same `typescript` `transpileModule` JSX-parse trick as Phases 11–12, run against `api/analytics.js`, `components/AnalyticsPanel.jsx`, `pages/GroupDetail.jsx` — zero diagnostics on all three.
- **Manual data-shape trace** (in place of a real running E2E): confirmed every top-level key the backend's `res.json({...})` actually sends (`totalExpenses`, `totalBills`, `totalSpend`, `expenseCount`, `billCount`, `categoryBreakdown`, `spendOverTime`, `memberContributions`) is read by `AnalyticsPanel.jsx` under the exact same names — no shape drift. Also traced the nested shapes specifically: `categoryBreakdown[].{category,amount,count}` against the `Pie`/legend's `c.category`/`c.amount` usage and `dataKey="amount"`/`nameKey="category"`; `spendOverTime[].{period,expenses,bills,total}` against the `BarChart`'s `dataKey="expenses"`/`dataKey="bills"` (Recharts reads object keys directly off the array, doesn't need explicit property-access syntax, so this was checked by inspecting the `dataKey` strings against the engine's returned object keys rather than via grep on `p.expenses`-style access); `memberContributions[].{user:{id,name,...},amount}` against the ranked-list's `m.user.id`/`m.user.name`/`m.amount` usage.
- **What this phase's verification does NOT cover, same caveat as Phases 11–12**: no real Mongoose aggregation round-trip (e.g. actually hitting `Expense.find()`/`Bill.find()` against a real DB with realistic populated docs), no real browser rendering of the Recharts components (can't verify they actually render correctly in a real DOM — only that the JSX parses and the data contract lines up), no real HTTP request/response cycle through Express. **Strongly recommend the next session run a full real Vite+mock-backend+headless-Chromium E2E pass over Analytics** (and ideally Bills + Chat as a regression check, per Phase 12's same recommendation, now three phases deep) the moment npm registry access is back — Recharts in particular has enough rendering subtlety (responsive containers needing real layout, SVG output) that "the JSX parses and props look right" is a meaningfully weaker guarantee than for the simpler list/table-based panels in earlier phases.

## Phase 14 — Final README (DONE)

No code changes — this phase added documentation only.

**`README.md`** — new, at the project root (sits alongside `CHECKPOINT.md`, one level above `backend/` and `frontend/`). The existing `frontend/README.md` (a short, frontend-scoped setup doc from Phase 4) was left as-is rather than merged — it's still accurate and useful for someone working inside `frontend/` specifically; the new root README is the top-level entry point covering the whole project. Sections:
- Feature list (one line per build-order item, Phases 1–13)
- Tech stack
- Project structure tree (backend + frontend, one line per folder's purpose)
- Local setup: step-by-step for both `backend/` and `frontend/`, including an env-var table for `backend/.env` (cross-checked line-by-line against the real `backend/.env.example`) and the proxy/socket-URL notes for `frontend/.env` (cross-checked against `frontend/.env.example`)
- Full API reference — every REST route plus the Socket.io event contract, copied from this CHECKPOINT's "API routes built so far" section and **re-verified against the actual route files** (`authRoutes.js`, `expenseRoutes.js`, `messageRoutes.js`, etc.) rather than trusted blindly from old notes, since this is the one artifact most likely to get read by someone unfamiliar with the codebase (e.g. a recruiter, or future-me after a long break) and silently-stale docs would be actively misleading
- Design system summary (colors/fonts/status-color conventions, condensed from this CHECKPOINT's "Conventions" section)
- A short, accurate explainer of `balanceEngine.js`'s two core functions and how it was fuzz-tested, since debt simplification is the most "resume-worthy" piece of logic in the project
- Deployment: explicitly says "not deployed yet," points to `CHECKPOINT.md` for the planned walkthrough — no invented deployment URLs or false claims of being live

### Verified (not just assumed) — this phase

Since this phase is pure documentation, "verification" meant cross-checking every concrete claim against the actual source rather than against memory of earlier checkpoint notes (which could themselves have drifted):
- Diffed the README's env-var tables against the real `backend/.env.example` / `frontend/.env.example` line by line — exact match.
- Diffed the README's full route list against `routes/authRoutes.js`, `routes/expenseRoutes.js`, `routes/messageRoutes.js`, `routes/groupRoutes.js`, `routes/billRoutes.js`, `routes/settlementRoutes.js` directly (not against old checkpoint prose) — exact match, including the Phase 13 analytics route and its `?granularity` query param.
- Confirmed the Socket.io event list against `server.js` directly.
- Confirmed package lists (frontend `recharts`/`socket.io-client`, backend `bcryptjs`/`socket.io`/etc.) against the real `package.json` files, not assumed from memory.

## Phase 15 — Guided deployment (IN PROGRESS — this is the interactive final phase)

Per the user's stated preference at the top of this doc ("Deployment happens as a guided, step-by-step walkthrough only at the very end, once all features are built") — that point has now arrived. This phase is explicitly meant to be done *with* the user live, not unattended. What's been prepared so far:

**`DEPLOYMENT.md`** — new, at the project root. A full step-by-step guide covering, in order (each stage depends on a value from the previous one):
1. **MongoDB Atlas** — create/confirm free M0 cluster, create a DB user, set network access to allow-from-anywhere (`0.0.0.0/0` — the practical choice given Render's free tier doesn't have static IPs; explicitly noted as not ideal for a real-sensitive-data production app, but fine here), get and assemble the `MONGO_URI`.
2. **Render** — deploy `backend/` as a Web Service (root dir `backend`, build `npm install`, start `npm start`), set all 5 env vars (`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` — temporarily still localhost at this stage — `NODE_ENV`), verify via `/api/health`. Includes a one-liner to generate a real `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and a note about Render free-tier cold starts (~30–60s wake-up after 15 min idle — normal, not a bug).
3. **Vercel** — deploy `frontend/` (root dir `frontend`, Vite auto-detected), set `VITE_API_URL` (Render URL + `/api`) and `VITE_SOCKET_URL` (Render URL, no `/api`).
4. **Close the loop** — go back to Render and update `CLIENT_URL` to the real Vercel URL now that it exists, since the backend's CORS (both Express and Socket.io) reads from that single env var. This step is easy to forget and was called out explicitly with the exact `server.js` line numbers it affects (verified against the real file, not assumed: `clientUrl` declared line 24, used for Socket.io CORS line 28, Express CORS line 37).
5. **End-to-end verification checklist** — register, create group, add expense, check balances, add a bill, mark paid, send a chat message (ideally from two tabs/users to confirm live delivery), check Analytics renders.
6. **Troubleshooting** — the four most likely failure modes in order of likelihood (CORS mismatch, chat socket URL wrong, JWT/env var not actually saved, Atlas network access or bad connection string) with their symptoms.
7. **Reference env-var list** for both platforms, condensed.

**`README.md`** — updated: the "Deployment" section now links to `DEPLOYMENT.md` instead of just saying "see CHECKPOINT.md."

### Why this wasn't auto-completed in the sandbox

This phase requires creating real accounts/resources in three external dashboards (Atlas, Render, Vercel) and the user pasting back real values (passwords, connection strings, deployed URLs) that don't exist until they click through those UIs themselves. That's fundamentally not something to fabricate or simulate — the guide was written, verified against the actual codebase (CORS env var usage, exact `.env.example` variable names, `package.json` scripts), and the user is being walked through it step-by-step in the same conversation rather than the zip shipping a "done" deployment that was never actually verified live.

### What to do when resuming this phase in a new session

If the zip is reopened in a fresh chat mid-walkthrough: check in on which Stage (1–5 above) the user actually reached last time before assuming the whole thing needs restarting — `DEPLOYMENT.md` itself is a finished, reusable artifact regardless of how far the live walkthrough got. Once the user confirms the app is actually live and the Stage 5 verification checklist passes for real (not just "looks deployed"), mark Build order item 15 ✅ and treat the MVP as complete.

## Conventions to keep following in later phases
- Currency: ₹ (INR), formatted with `toLocaleString("en-IN")`
- Every money amount in the UI uses the `.ledger-amount` class + mono font
- Status colors: success/green = paid/settled/owed-to-you, danger/red = owes/overdue, accent/amber = pending
- Reuse existing `Button`/`Input`/`Logo`/`Modal` components — don't reinvent
- Stick to the existing design tokens (`bg-paper`, `text-ink`, etc.) rather than new ad-hoc colors
- Expense categories: Rent, Electricity, Food, Travel, WiFi, Groceries, Sports, Misc
- Bill categories: Rent, Electricity, WiFi, Water, Maid, Groceries, Misc
- Group types: Stay, Trip, Sports Team, General
- `useEffect` async pattern: declare the async function inside the effect body. If the same logic needs to be a button handler too, write a separate named function (see `refreshGroups`, `refreshExpenses`, `fetchBalances`, `fetchSettlements` patterns).
- Route ordering in Express: static routes before dynamic `/:id` routes.
- Auth response shape `{ id, name, email, upiId }` — all auth endpoints (register, login, me) return this normalized shape. Do not return raw Mongoose docs.
- Money-handling code gets fuzz-tested (balance engine, split math). Keep this bar for any future money logic.
- `Promise.allSettled` for parallel best-effort fetches (e.g. Dashboard balance fetches per group) — failures are non-fatal, silently ignored, cards fall back to "—".
- Socket.io: one shared authenticated connection per tab via `getSocket(token)`/`disconnectSocket()` in `api/socket.js` — don't create ad-hoc `io()` calls elsewhere. Every emit that expects a response uses an ack callback (`{ok, message?}`), not a separate listener — keeps request/response pairing obvious at the call site. Membership checks happen server-side on every socket event that touches a group (`joinGroup`, `sendMessage`), never trusted from the client alone.

## API routes built so far
```
Auth:        POST /api/auth/register
             POST /api/auth/login
             GET  /api/auth/me        (protected, returns normalized {id, name, email, upiId})

Groups:      POST /api/groups                         (protected)
             GET  /api/groups                          (protected)
             POST /api/groups/join                     (protected)
             GET  /api/groups/:id                      (protected, membership-checked)
             GET  /api/groups/:id/balances             (protected, membership-checked, REAL — returns netBalances + suggestedPayments + totalExpenses)
             GET  /api/groups/:id/settlements          (protected, membership-checked — alias, same as below)
             GET  /api/groups/:id/analytics            (protected, membership-checked, ?granularity=month|day — returns totals + categoryBreakdown + spendOverTime + memberContributions)

Expenses:    POST   /api/expenses                     (protected, membership-checked, equal/custom split)
             GET    /api/expenses/group/:groupId       (protected, membership-checked)
             DELETE /api/expenses/:id                  (protected, only original payer can delete)

Settlements: GET    /api/settlements/group/:groupId   (protected, membership-checked)
             POST   /api/settlements                   (protected, both parties must be members)
             PATCH  /api/settlements/:id/mark-paid    (protected, only fromUser or toUser)

Bills:       GET    /api/bills/group/:groupId          (protected, membership-checked, sorted by dueDate asc)
             POST   /api/bills                          (protected, membership-checked, equal/custom split — same splitType pattern as expenses)
             PATCH  /api/bills/:billId/mark-paid       (protected, body {userId}, only that member or the bill's creator)
             DELETE /api/bills/:billId                 (protected, only the bill's creator)

Messages:    GET /api/messages/group/:groupId           (protected, membership-checked, ?limit & ?before for pagination, chronological order)

Socket.io events (auth via {auth:{token}} JWT at handshake — see server.js):
             joinGroup(groupId, callback)    — membership-checked, joins the room, acks {ok, message?}
             leaveGroup(groupId)             — leaves the room, no ack
             sendMessage({groupId,text}, callback) — membership-checked, persists + broadcasts "newMessage" to the room (including sender), acks {ok, message?}
             newMessage(message)             — server → client broadcast of a new persisted message
```

## API routes NOT yet built
All originally-planned routes are now built, including Analytics (Phase 13). Remaining work (Final README, deployment) doesn't need new REST routes — see build order above.

## Sandbox/environment notes
- No internet access to real MongoDB or fonts.googleapis.com — network restricted to npm/github.
- **Phase 11 update**: in the session that built Phase 11, even npm/github access was unavailable (`registry.npmjs.org` returned `403 host_not_allowed`) and no `node_modules` existed yet for either package. This is apparently variable between sessions — don't assume npm access is there; check early (`npm install` or a registry HEAD request) and fall back to static analysis (Node's `--check`, or the globally-installed `typescript` package's `transpileModule` for JSX syntax-checking without a real bundler) plus isolated standalone-function fuzz tests if it's unavailable. Flag clearly in the checkpoint when this happens, since it changes how much the "verified" claims can be trusted.
- **Phase 12 update**: same restriction held again this session (`403 host_not_allowed`, no cached `node_modules`). Two phases in a row now with no npm access — worth checking at the very start of each new session rather than assuming either way.
- **Phase 13 update**: same restriction held a *third* consecutive session (`403 host_not_allowed`, no cached `node_modules` for either `recharts` or any prior unreleased package). This is now a consistent pattern across Phases 11–13, not a one-off — plan verification strategy accordingly from the start of each new session rather than attempting a real npm install first.
- **Phase 14 update**: checked again — `403 host_not_allowed`, fourth consecutive session. No code was written this phase (docs only), so this didn't block anything, but flagging it for the record since Phase 15 (deployment) will need real `npm install` + a real running dev server to walk through deployment meaningfully — worth checking access status again at the very start of that session before assuming either way, same as every phase since 11.
- Backend logic tested directly (pure-function unit tests, fuzz tests) in throwaway scripts.
- Full UI flows tested via real Vite dev server + throwaway mock Express backend (proxied through Vite's `/api` → `localhost:5000`) + headless Chromium at `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` — **when npm access is available**.
- **Mock backend must mirror real response shapes exactly** — this has caught real bugs before.
- Background processes: `setsid bash -c '...' < /dev/null > /tmp/log.log 2>&1 &` as a **standalone command**, not chained. Start it alone, then verify with separate `curl` call.
- Mock backend's in-memory state accumulates across test runs in the same session — restart it between full E2E runs to get a clean state. (Or the tests should be written to be state-tolerant — see Phase 8's "Mark paid" lesson.)

## Deployment plan (Phase 15, guide written — live walkthrough in progress)
Accounts already exist for MongoDB Atlas, Render, and Vercel. Full step-by-step guide now lives in `DEPLOYMENT.md` at the project root — see Phase 15 section above for what it covers. `CLIENT_URL` (backend env) and `VITE_API_URL`/`VITE_SOCKET_URL` (frontend env) need to point at each other's deployed URLs; `DEPLOYMENT.md` Stage 4 exists specifically because `CLIENT_URL` has to be set *after* the Vercel URL exists, which is easy to miss in a strict linear walkthrough.

## Latest checkpoint zip
`splitease-stay-PHASE15-deployment.zip` — contains full `backend/` + `frontend/` + root `README.md` + new root `DEPLOYMENT.md` + this `CHECKPOINT.md`. Replaces all earlier zips. No code changes this phase (deployment-prep docs only) — `npm install` needs are unchanged from Phase 14.

---
**Next step when resuming:** Finish the Phase 15 live walkthrough with the user through `DEPLOYMENT.md`'s 5 stages (Atlas → Render → Vercel → CORS loop-closing → end-to-end verification). If resuming in a fresh session, ask the user which stage they actually reached rather than assuming the whole thing needs restarting from scratch — `DEPLOYMENT.md` itself doesn't need to be rewritten unless something about the codebase's env-var contract changes. Once the user confirms the live app passes the Stage 5 checklist for real, mark Build order item 15 ✅ and the MVP is complete. **Also still outstanding, lower priority than finishing deployment**: if npm registry access is ever available in a session, run the full real Vite+mock-backend+headless-Chromium E2E regression pass that's been deferred since Phase 11 (Bills, Chat with two simulated socket clients, Analytics/Recharts rendering) — though once the app is actually deployed and manually verified end-to-end per Stage 5, this becomes less urgent than it was, since real-browser-against-real-backend behavior will have been confirmed by hand regardless.
