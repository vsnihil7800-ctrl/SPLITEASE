import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import ThemeToggle from "../components/ThemeToggle";

const FEATURES = [
  { icon: "🍽️", title: "Split anything", desc: "Food, rent, travel, utilities — equal or custom splits assigned instantly." },
  { icon: "⚡", title: "Recurring bills", desc: "Monthly rent, electricity, WiFi — track who paid and who hasn't every cycle." },
  { icon: "💸", title: "Settle via UPI", desc: "Fewest payments needed. Tap Pay Now to open GPay, PhonePe, or Paytm." },
  { icon: "📊", title: "Analytics", desc: "Donut charts, spend over time, and category breakdown per group." },
  { icon: "🔔", title: "Notifications", desc: "Real-time alerts when expenses are added or payments confirmed." },
  { icon: "📄", title: "Export", desc: "Download your group's full history as CSV or PDF anytime." },
];

const STEPS = [
  { step: "1", title: "Create a group", desc: "Name it, pick a type — flatmates, trip, sports team." },
  { step: "2", title: "Share the code", desc: "Members join with a 6-digit invite code. No email needed." },
  { step: "3", title: "Add expenses", desc: "Pick category, who paid, split equally or custom." },
  { step: "4", title: "Settle up", desc: "Pay via UPI with one tap. Confirm receipt. Done." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/register"><Button variant="accent">Get started →</Button></Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
        <span className="mb-4 inline-block rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-muted">
          Built for roommates, hostels &amp; college groups 🇮🇳
        </span>
        <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-6xl">
          Know exactly who owes who.
          <br />
          <span className="text-accent">Settle it in one tap.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
          SplitEase Stay is a free expense-splitting app built for Indian groups —
          track shared rent, food, and bills, then settle with GPay or PhonePe in seconds.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register">
            <Button variant="accent" className="px-7 py-3 text-base">Create your group free</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" className="px-7 py-3 text-base">Sign in</Button>
          </Link>
        </div>

        {/* Social proof strip */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted">
          <span>✓ Free forever</span>
          <span>✓ No ads</span>
          <span>✓ UPI built-in</span>
          <span>✓ Works offline (PWA)</span>
          <span>✓ Dark mode</span>
        </div>
      </main>

      {/* Mock UI preview */}
      <section className="mx-auto max-w-2xl px-6 pb-16">
        <div className="rounded-2xl border border-hairline bg-surface shadow-sm overflow-hidden">
          {/* Mock header */}
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div>
              <p className="font-display text-base font-semibold text-ink">Goa Trip 🏖️</p>
              <p className="text-xs text-muted">4 members · ₹12,400 total</p>
            </div>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">All settled ✓</span>
          </div>
          {/* Mock expense rows */}
          {[
            { icon: "🍽️", title: "Beach shack dinner", cat: "Food", who: "Rahul", amount: "₹2,400.00", you: true },
            { icon: "🏠", title: "Airbnb 2 nights", cat: "Rent", who: "Priya", amount: "₹6,000.00", you: false },
            { icon: "✈️", title: "Cab to airport", cat: "Travel", who: "You", amount: "₹800.00", you: true },
          ].map((e) => (
            <div key={e.title} className={`flex items-center justify-between gap-4 px-5 py-3.5 border-b border-hairline last:border-0 ${e.you ? "border-l-2 border-success" : "border-l-2 border-danger"}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-dim text-base">{e.icon}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-xs text-muted">{e.cat} · Paid by {e.who}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`ledger-amount text-sm font-semibold ${e.you ? "text-success" : "text-danger"}`}>{e.amount}</p>
                <p className={`text-[10px] font-medium ${e.you ? "text-success" : "text-danger"}`}>{e.you ? "You paid" : "You owe"}</p>
              </div>
            </div>
          ))}
          {/* Mock balance row */}
          <div className="border-t border-hairline bg-paper px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-soft">Rahul → You</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="ledger-amount text-sm font-semibold text-ink">₹600.00</span>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">Pay via UPI</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">↑ What your group looks like inside SplitEase</p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="font-display text-2xl font-bold text-ink text-center mb-10">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-2xl border border-hairline bg-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white text-sm font-bold mb-3">{s.step}</span>
              <h3 className="font-display text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="font-display text-2xl font-bold text-ink text-center mb-10">Everything your group needs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-hairline bg-surface p-5 flex gap-4">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <h3 className="font-display text-sm font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-hairline bg-surface p-10">
          <h2 className="font-display text-2xl font-bold text-ink">Ready to stop chasing people for money?</h2>
          <p className="mt-3 text-sm text-muted">Free, no ads, no credit card. Just create a group and share the code.</p>
          <Link to="/register" className="mt-6 inline-block">
            <Button variant="accent" className="px-8 py-3 text-base">Get started free →</Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 border-t border-hairline flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
        <span>© {new Date().getFullYear()} SplitEase Stay</span>
        <span>Built for the people who keep the group running 💛</span>
      </footer>
    </div>
  );
}
