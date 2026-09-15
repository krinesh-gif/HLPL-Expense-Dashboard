"use client";

/**
 * Entries recorded while the phone has no signal.
 *
 * Kept in IndexedDB rather than localStorage so a queued expense survives the tab
 * being closed, the phone running out of battery, or the app being swapped out —
 * all of which happen in a warehouse. Each entry carries a clientId generated on
 * the device; the server treats that as an idempotency key, so a retry after a
 * half-completed request cannot record the same spend twice.
 */

const DB = "hlpl-outbox";
const STORE = "pending";
const VERSION = 1;

export type PendingExpense = {
  clientId: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  paymentMode: string;
  paidTo?: string;
  description?: string;
  billNo?: string;
  queuedAt: number;
  attempts: number;
  lastError?: string;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueue(e: PendingExpense): Promise<void> {
  await tx("readwrite", (s) => s.put(e));
}

export async function all(): Promise<PendingExpense[]> {
  try {
    const rows = await tx<PendingExpense[]>("readonly", (s) => s.getAll() as IDBRequest<PendingExpense[]>);
    return rows.sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

export async function remove(clientId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(clientId) as unknown as IDBRequest<undefined>);
}

export async function count(): Promise<number> {
  try {
    return await tx<number>("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

export async function markFailed(e: PendingExpense, message: string): Promise<void> {
  await enqueue({ ...e, attempts: e.attempts + 1, lastError: message });
}

/** Whether IndexedDB is usable at all — private windows and locked-down browsers vary. */
export async function isAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === "undefined") return false;
    (await open()).close();
    return true;
  } catch {
    return false;
  }
}
