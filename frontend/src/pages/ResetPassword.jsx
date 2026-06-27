import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Button from "../components/Button";
import ThemeToggle from "../components/ThemeToggle";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!token) setError("Missing reset token. Request a new link."); }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
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
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">✅</div>
              <h1 className="font-display text-xl font-semibold text-ink">Password reset!</h1>
              <p className="mt-2 text-sm text-muted">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-ink">Set new password</h1>
              <p className="mt-1 text-sm text-muted">Choose a strong password for your account.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input label="New password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={handleChange} placeholder="At least 6 characters" required />
                <Input label="Confirm password" type="password" name="confirm" autoComplete="new-password" value={form.confirm} onChange={handleChange} placeholder="Same password again" required />
                {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
                <Button type="submit" variant="accent" className="w-full justify-center py-2.5" disabled={submitting || !token}>
                  {submitting ? "Resetting…" : "Reset password"}
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
