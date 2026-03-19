import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const APK_DOWNLOAD_URL = `https://sibqdtnvhggkzzussrup.supabase.co/storage/v1/object/public/app-releases/focusflow.apk`;

function isMobileWeb(): boolean {
  if (typeof window === "undefined") return false;
  // If running inside Capacitor native shell, don't show
  if ((window as any).Capacitor?.isNativePlatform?.()) return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
}

export function AppInstallBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("app-install-dismissed");
    if (!wasDismissed && isMobileWeb()) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("app-install-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Get the FocusFlow App</p>
          <p className="text-xs text-muted-foreground">
            I-install para sa alarms, notifications, at offline access!
          </p>
        </div>
      </div>

      <Button
        asChild
        className="mt-3 w-full gap-2 rounded-xl"
        size="sm"
      >
        <a href={APK_DOWNLOAD_URL} download="FocusFlow.apk">
          <Download className="h-4 w-4" />
          Download App (APK)
        </a>
      </Button>
    </div>
  );
}
