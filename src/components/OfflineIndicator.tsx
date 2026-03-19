import { useOnlineStatus, useSyncStatus } from "@/hooks/useOffline";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const syncStatus = useSyncStatus();

  // Don't show anything when online and idle
  if (online && syncStatus !== "syncing") return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-all",
        !online
          ? "bg-amber-500 text-white"
          : "bg-primary text-primary-foreground"
      )}
    >
      {!online ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline mode — changes will sync when connected</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing your changes...</span>
        </>
      )}
    </div>
  );
}
