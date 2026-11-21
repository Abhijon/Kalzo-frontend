/** Persist in-progress artist profile across DigiLocker redirects / remounts. */

const META_KEY = "kalzo_artist_profile_draft_v1";
const IDB_NAME = "kalzo-artist-profile-draft";
const IDB_STORE = "files";

export type DraftForm = Record<string, unknown>;

export type DraftMeta = {
  form: DraftForm;
  customSub: boolean;
  savedCity: string;
  fileNames: {
    photo: string | null;
    artPhoto: string | null;
    faceVideo: string | null;
    reels: (string | null)[];
  };
  savedAt: number;
};

export type DraftFiles = {
  photo: File | null;
  artPhoto: File | null;
  faceVideo: Blob | null;
  reels: (File | null)[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbPut(key: string, value: Blob | File | null) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    if (value) store.put(value, key);
    else store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
  db.close();
}

async function idbGet(key: string): Promise<Blob | File | null> {
  const db = await openDb();
  const value = await new Promise<Blob | File | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | File | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  db.close();
  return value;
}

async function idbClear() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
  });
  db.close();
}

function asFile(blob: Blob | File | null, fallbackName: string): File | null {
  if (!blob) return null;
  if (blob instanceof File) return blob;
  const type = blob.type || "application/octet-stream";
  return new File([blob], fallbackName, { type });
}

export function readDraftMeta(): DraftMeta | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftMeta;
    if (!parsed?.form || typeof parsed.form !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveArtistProfileDraft(input: {
  form: DraftForm;
  files: DraftFiles;
  customSub: boolean;
  savedCity: string;
}): Promise<void> {
  if (typeof sessionStorage === "undefined") return;
  const meta: DraftMeta = {
    form: input.form,
    customSub: input.customSub,
    savedCity: input.savedCity,
    fileNames: {
      photo: input.files.photo?.name ?? null,
      artPhoto: input.files.artPhoto?.name ?? null,
      faceVideo:
        input.files.faceVideo instanceof File
          ? input.files.faceVideo.name
          : input.files.faceVideo
            ? "face.webm"
            : null,
      reels: input.files.reels.map((r) => r?.name ?? null),
    },
    savedAt: Date.now(),
  };
  sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  await Promise.all([
    idbPut("photo", input.files.photo),
    idbPut("artPhoto", input.files.artPhoto),
    idbPut("faceVideo", input.files.faceVideo),
    idbPut("reel-0", input.files.reels[0] ?? null),
    idbPut("reel-1", input.files.reels[1] ?? null),
    idbPut("reel-2", input.files.reels[2] ?? null),
    idbPut("reel-3", input.files.reels[3] ?? null),
  ]);
}

export async function loadArtistProfileDraft(): Promise<{
  form: DraftForm;
  files: DraftFiles;
  customSub: boolean;
  savedCity: string;
} | null> {
  const meta = readDraftMeta();
  if (!meta) return null;
  try {
    const [photo, artPhoto, faceVideo, r0, r1, r2, r3] = await Promise.all([
      idbGet("photo"),
      idbGet("artPhoto"),
      idbGet("faceVideo"),
      idbGet("reel-0"),
      idbGet("reel-1"),
      idbGet("reel-2"),
      idbGet("reel-3"),
    ]);
    return {
      form: meta.form,
      customSub: !!meta.customSub,
      savedCity: meta.savedCity || "",
      files: {
        photo: asFile(photo, meta.fileNames.photo || "photo.jpg"),
        artPhoto: asFile(artPhoto, meta.fileNames.artPhoto || "art.jpg"),
        faceVideo: faceVideo,
        reels: [
          asFile(r0, meta.fileNames.reels[0] || "reel-1.mp4"),
          asFile(r1, meta.fileNames.reels[1] || "reel-2.mp4"),
          asFile(r2, meta.fileNames.reels[2] || "reel-3.mp4"),
          asFile(r3, meta.fileNames.reels[3] || "reel-4.mp4"),
        ],
      },
    };
  } catch {
    return {
      form: meta.form,
      customSub: !!meta.customSub,
      savedCity: meta.savedCity || "",
      files: {
        photo: null,
        artPhoto: null,
        faceVideo: null,
        reels: [null, null, null, null],
      },
    };
  }
}

export async function clearArtistProfileDraft() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(META_KEY);
  try {
    await idbClear();
  } catch {
    // ignore
  }
}
