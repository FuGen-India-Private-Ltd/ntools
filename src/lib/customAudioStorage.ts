// IndexedDB Storage for User Custom Alarm Songs & Audio Files

const DB_NAME = 'ntools_custom_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'alarm_audio_tracks';

export interface CustomAudioTrack {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  addedAt: number;
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomAudioTrack(file: File): Promise<CustomAudioTrack> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const track: CustomAudioTrack = {
          id: `custom-track-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // remove extension for clean title
          size: file.size,
          type: file.type || 'audio/mpeg',
          dataUrl,
          addedAt: Date.now(),
        };

        const db = await openAudioDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(track);

        tx.oncomplete = () => resolve(track);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function getCustomAudioTrack(id: string): Promise<CustomAudioTrack | null> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getAllCustomAudioTracks(): Promise<CustomAudioTrack[]> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteCustomAudioTrack(id: string): Promise<void> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
