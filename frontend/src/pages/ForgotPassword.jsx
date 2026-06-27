import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Button from "../components/Button";
import ThemeToggle from "../components/ThemeToggle";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="fixed right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-hairline bg-surface p-7 shadow-[0_12px_32px_-16px_rgba(22,36,61,0.15)]">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">📬</div>
              <h1 className="font-display text-xl font-semibold text-ink">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted">If <span className="font-medium text-ink">{email}</span> is registered, you'll get a reset link. Expires in 30 minutes.</p>
              <p className="mt-4 text-sm text-muted">Didn't get it? <button onClick={() => setSent(false)} className="font-medium text-accent hover:underline">Try again</button>.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-ink">Forgot password?</h1>
              <p className="mt-1 text-sm text-muted">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
                <Button type="submit" variant="accent" className="w-full justify-center py-2.5" disabled={submitting}>
                  {submitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/login" className="font-medium text-ink hover:text-accent">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
