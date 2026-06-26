import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token found. Please use the link from your email.");
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-hairline bg-surface p-7 shadow-[0_12px_32px_-16px_rgba(22,36,61,0.15)] text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-muted">Verifying your email…</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">
                ✅
              </div>
              <h1 className="font-display text-xl font-semibold text-ink">Email verified!</h1>
              <p className="mt-2 text-sm text-muted">Your account is confirmed. You can now sign in.</p>
              <Link
                to="/login"
                className="mt-5 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
              >
                Go to sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-2xl">
                ❌
              </div>
              <h1 className="font-display text-xl font-semibold text-ink">Verification failed</h1>
              <p className="mt-2 text-sm text-muted">{message}</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
