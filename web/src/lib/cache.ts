/** Tiny IndexedDB key-value store: tags per Spotify track id, so a run can resume and never redoes work. */
const DB = "spotify-sorter";
const STORE = "tags";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(): Promise<Record<string, T>> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out: Record<string, T> = {};
    const req = db.transaction(STORE).objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return resolve(out);
      out[String(c.key)] = c.value as T;
      c.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function put<T>(key: string, value: T) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  const db = await open();
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
  });
}
