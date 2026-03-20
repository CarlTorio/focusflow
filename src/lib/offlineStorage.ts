/**
 * Offline-first storage & sync system
 * 
 * - Queues mutations (insert/update/delete) when offline
 * - Caches query results locally for offline reads
 * - Syncs pending mutations when back online
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────
export interface PendingMutation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, any>;
  matchColumn?: string; // for update/delete, e.g. "id"
  matchValue?: string;
  createdAt: number;
}

// ─── IndexedDB helpers ───────────────────────────────────────────
const DB_NAME = "focusflow_offline";
const DB_VERSION = 1;
const QUEUE_STORE = "pending_mutations";
const CACHE_STORE = "query_cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Pending mutation queue ──────────────────────────────────────
export async function addPendingMutation(mutation: Omit<PendingMutation, "id" | "createdAt">): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: PendingMutation = { ...mutation, id, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Query cache ─────────────────────────────────────────────────
export async function setCachedData(key: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readwrite");
    tx.objectStore(CACHE_STORE).put({ key, data, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData<T = any>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const req = tx.objectStore(CACHE_STORE).get(key);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Online status ───────────────────────────────────────────────
export function isOnline(): boolean {
  return navigator.onLine;
}

// ─── Sync engine ─────────────────────────────────────────────────
let isSyncing = false;
const syncListeners: Array<(status: "syncing" | "done" | "error") => void> = [];

export function onSyncStatus(listener: (status: "syncing" | "done" | "error") => void) {
  syncListeners.push(listener);
  return () => {
    const idx = syncListeners.indexOf(listener);
    if (idx >= 0) syncListeners.splice(idx, 1);
  };
}

function notifySyncListeners(status: "syncing" | "done" | "error") {
  syncListeners.forEach((fn) => fn(status));
}

export async function syncPendingMutations(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || !isOnline()) return { synced: 0, failed: 0 };
  isSyncing = true;
  notifySyncListeners("syncing");

  let synced = 0;
  let failed = 0;

  try {
    const mutations = await getPendingMutations();
    for (const m of mutations) {
      try {
        let error: any = null;
        if (m.operation === "insert") {
          const res = await (supabase as any).from(m.table).insert(m.data);
          error = res.error;
        } else if (m.operation === "update") {
          const res = await (supabase as any).from(m.table).update(m.data).eq(m.matchColumn!, m.matchValue!);
          error = res.error;
        } else if (m.operation === "delete") {
          const res = await (supabase as any).from(m.table).delete().eq(m.matchColumn!, m.matchValue!);
          error = res.error;
        }

        if (error) {
          // If it's a duplicate key (already synced), just remove it
          if (error.code === "23505") {
            await removePendingMutation(m.id);
            synced++;
          } else {
            console.error("[sync] Failed mutation:", error);
            failed++;
          }
        } else {
          await removePendingMutation(m.id);
          synced++;
        }
      } catch (e) {
        console.error("[sync] Error processing mutation:", e);
        failed++;
      }
    }
    notifySyncListeners(failed > 0 ? "error" : "done");
  } catch (e) {
    console.error("[sync] Fatal sync error:", e);
    notifySyncListeners("error");
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

// ─── Auto-sync on reconnect ─────────────────────────────────────
let initialized = false;

export function initOfflineSync(onSynced?: () => void) {
  if (initialized) return;
  initialized = true;

  const handleOnline = async () => {
    console.log("[offline] Back online, syncing...");
    const result = await syncPendingMutations();
    if (result.synced > 0 && onSynced) onSynced();
  };

  window.addEventListener("online", handleOnline);
}

