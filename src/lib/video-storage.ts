import type { Direction } from "@/lib/drill";

const DB_NAME = "split";
const STORE = "clips";

export type StoredClip = {
  id: string;
  sessionId: string;
  index: number;
  direction: Direction;
  feints: Direction[];
  mime: string;
  blob: Blob;
  createdAt: number;
  realCueMs?: number;
  durationMs?: number;
};

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("sessionId", "sessionId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open clips."));
  });
}

export async function saveClip(clip: StoredClip) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save the clip."));
      tx.objectStore(STORE).put(clip);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function listClips(sessionId?: string) {
  const db = await openDb();
  const clips = await new Promise<StoredClip[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = sessionId
      ? tx.objectStore(STORE).index("sessionId").getAll(sessionId)
      : tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as StoredClip[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read clips."));
  });
  db.close();
  return clips.sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
}

export async function latestSessionId() {
  const clips = await listClips();
  const latest = clips.reduce<StoredClip | null>((best, clip) => {
    if (!best || clip.createdAt > best.createdAt) return clip;
    return best;
  }, null);
  return latest?.sessionId ?? null;
}

export async function hasAnyClips() {
  const clips = await listClips();
  return clips.length > 0;
}
