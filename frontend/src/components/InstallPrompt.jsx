import { useEffect, useState } from "react";
import Button from "./Button";

const DISMISS_KEY = "splitease_pwa_dismissed";

// Mounted once at the App level (not per-page) since the install opportunity
// is global, not tied to any one route. Renders nothing until the browser
// actually fires beforeinstallprompt — Chrome/Edge on Android & desktop
// only fire it once the manifest+service-worker installability criteria
// are met; Safari/iOS never fires it at all (no banner there — "Add to
// Home Screen" lives in the native Share sheet instead, nothing this
// component can hook into).
export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredEvent || dismissed) return null;

  const handleInstall = async () => {
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    // The captured event is single-use either way, so drop it regardless
    // of outcome. Only persist the "don't ask again" dismissal if the
    // person actually declined — if they installed, the browser won't
    // fire beforeinstallprompt again for an installed app anyway.
    setDeferredEvent(null);
    if (outcome !== "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 shadow-[0_12px_32px_-16px_rgba(22,36,61,0.25)]">
        <span
          className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent"
          aria-hidden="true"
        />
        <p className="flex-1 text-sm text-ink">
          Install SplitEase Stay for quick access from your home screen.
        </p>
        <Button variant="accent" className="!px-3 !py-1.5 text-sm" onClick={handleInstall}>
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-muted hover:text-ink"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
