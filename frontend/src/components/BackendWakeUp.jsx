import { useEffect, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "/api";

// Pings the backend health endpoint. If it takes > 3s, shows a
// "server is waking up" banner so users don't think the app is broken.
export default function BackendWakeUp() {
  const [slow, setSlow] = useState(false);
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    let timer;
    let done = false;

    const ping = async () => {
      timer = setTimeout(() => {
        if (!done) setSlow(true);
      }, 3000);

      try {
        await fetch(`${BACKEND_URL}/health`);
        done = true;
        clearTimeout(timer);
        setSlow(false);
        setAwake(true);
        // Hide "awake" banner after 2s
        setTimeout(() => setAwake(false), 2000);
      } catch {
        done = true;
        clearTimeout(timer);
        setSlow(false);
      }
    };

    ping();
    return () => clearTimeout(timer);
  }, []);

  if (awake) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-4 py-2 text-xs font-medium text-success shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Server ready
      </div>
    );
  }

  if (!slow) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-medium text-muted shadow-sm">
      <svg className="h-3 w-3 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Server is waking up, please wait…
    </div>
  );
}
