import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import LedgerPreview from "../components/LedgerPreview";
import ThemeToggle from "../components/ThemeToggle";

const features = [
  {
    title: "Split anything, fairly",
    desc: "Equal or custom splits across rent, food, travel, WiFi, and more — assigned to the right group instantly.",
  },
  {
    title: "Recurring bills, tracked",
    desc: "Rent, electricity, maid, groceries — see exactly who's paid and who's pending, every cycle.",
  },
  {
    title: "Settle up over UPI",
    desc: "The app does the math and minimizes transactions. Tap, pay via UPI, mark it settled.",
  },
  {
    title: "One chat per group",
    desc: "Real-time chat for every group, with automatic notes when bills and expenses are added.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="accent">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-4 inline-block rounded-full bg-paper-dim px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Built for roommates, hostels &amp; college groups
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Know exactly who owes who.
            <span className="text-accent"> Settle it in one tap.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
            SplitEase Stay keeps a running passbook for your shared rent, bills, and
            expenses — then tells you the fewest UPI payments needed to bring
            everyone back to zero.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register">
              <Button variant="primary" className="px-6 py-3 text-base">
                Create your group
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="px-6 py-3 text-base">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <LedgerPreview />
        </div>
      </main>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-hairline bg-surface p-5"
            >
              <h3 className="font-display text-base font-semibold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted">
        © {new Date().getFullYear()} SplitEase Stay. Built for the people who keep the group running.
      </footer>
    </div>
  );
}
