import { useState, useEffect, useSyncExternalStore } from "react";
import {
  isOnline,
  addPendingMutation,
  getCachedData,
  setCachedData,
  syncPendingMutations,
  onSyncStatus,
} from "@/lib/offlineStorage";

// ─── useOnlineStatus hook ─────────────────────────────
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ─── useSyncStatus hook ───────────────────────────────
export function useSyncStatus() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");

  useEffect(() => {
    return onSyncStatus((s) => setStatus(s));
  }, []);

  return status;
}

// ─── Offline mutation helper ──────────────────────────
/**
 * Wraps a supabase mutation to work offline.
 * If online, executes normally. If offline, queues for later sync.
 */
export async function offlineMutation(params: {
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, any>;
  matchColumn?: string;
  matchValue?: string;
  cacheKey?: string;
  optimisticUpdate?: (cached: any) => any;
  onlineFn: () => Promise<{ error: any; data?: any }>;
}): Promise<{ offline: boolean; error?: any; data?: any }> {
  if (isOnline()) {
    const result = await params.onlineFn();
    return { offline: false, ...result };
  }

  // Queue for sync
  await addPendingMutation({
    table: params.table,
    operation: params.operation,
    data: params.data,
    matchColumn: params.matchColumn,
    matchValue: params.matchValue,
  });

  // Optimistically update cache
  if (params.cacheKey && params.optimisticUpdate) {
    const cached = await getCachedData(params.cacheKey);
    if (cached) {
      await setCachedData(params.cacheKey, params.optimisticUpdate(cached));
    }
  }

  return { offline: true };
}
