import { api, unwrapData } from "@/lib/api";

export type UploadPurpose = "photo" | "artPhoto" | "faceVideo" | "reel";

type StartSingle = {
  mode: "single";
  key: string;
  uploadUrl: string;
  expiresIn: number;
  partSize: number;
};

type StartMultipart = {
  mode: "multipart";
  key: string;
  uploadId: string;
  partSize: number;
  partCount: number;
  expiresIn: number;
};

type StartResult = StartSingle | StartMultipart;

function normalizeContentType(file: Blob, purpose: UploadPurpose): string {
  const raw = ((file.type || "").split(";")[0] ?? "").trim().toLowerCase();
  if (purpose === "photo" || purpose === "artPhoto") {
    if (raw === "image/jpeg" || raw === "image/png" || raw === "image/webp") return raw;
    return "image/jpeg";
  }
  if (raw === "video/mp4" || raw === "video/webm" || raw === "video/quicktime") return raw;
  if (raw === "video/x-matroska") return "video/webm";
  return "video/webm";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * PUT bytes to a presigned URL; returns ETag when present (multipart needs it).
 * Pass contentType only for single-object puts (it was signed into the URL).
 * Multipart part URLs must not send Content-Type or the signature can fail.
 * Uses XHR when onProgress is set so byte-level % can update for single puts.
 */
async function putToPresignedUrl(
  url: string,
  body: Blob,
  contentType?: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  if (!onProgress) {
    const headers = new Headers();
    if (contentType) headers.set("Content-Type", contentType);
    const res = await fetch(url, { method: "PUT", body, headers });
    if (!res.ok) {
      const err = new Error(`S3 upload failed (${res.status})`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return (res.headers.get("ETag") || res.headers.get("etag") || "").replaceAll('"', "");
  }

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || ev.total <= 0) return;
      onProgress(Math.min(1, Math.max(0, ev.loaded / ev.total)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = (xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "").replaceAll(
          '"',
          "",
        );
        onProgress(1);
        resolve(etag);
        return;
      }
      const err = new Error(`S3 upload failed (${xhr.status})`) as Error & { status?: number };
      err.status = xhr.status;
      reject(err);
    };
    xhr.onerror = () => reject(new Error("S3 upload failed (network)"));
    xhr.send(body);
  });
}

async function putWithRetry(
  getUrl: () => Promise<string>,
  body: Blob,
  contentType: string | undefined,
  attempts = 3,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const url = await getUrl();
      return await putToPresignedUrl(url, body, contentType, onProgress);
    } catch (err) {
      lastErr = err;
      if (i >= attempts - 1) break;
      const status = (err as { status?: number })?.status;
      // 401/403 → refresh URL on next getUrl(); otherwise brief backoff
      if (status !== 403 && status !== 401) await sleep(400 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed");
}

/**
 * Direct-to-S3 upload via backend presigns.
 * ≤5MB → single PUT; larger → 5MB multipart parts with per-part retry.
 */
export async function uploadArtistMedia(
  file: Blob,
  purpose: UploadPurpose,
  opts?: {
    fileName?: string | undefined;
    onProgress?: ((ratio: number) => void) | undefined;
  },
): Promise<string> {
  const contentType = normalizeContentType(file, purpose);
  const startRes = await api.media.startUpload({
    purpose,
    contentType,
    fileSize: file.size,
    fileName: opts?.fileName,
  });
  if (startRes.error) throw new Error(startRes.error.message || "Could not start upload");

  const start = unwrapData(startRes.data) as StartResult;
  if (!start?.key) throw new Error("Upload start response missing key");

  if (start.mode === "single") {
    let key = start.key;
    let cachedUrl: string | null = start.uploadUrl;
    await putWithRetry(
      async () => {
        if (cachedUrl) {
          const url = cachedUrl;
          cachedUrl = null;
          return url;
        }
        // URL expired / failed — start a fresh single upload session
        const again = await api.media.startUpload({
          purpose,
          contentType,
          fileSize: file.size,
          fileName: opts?.fileName,
        });
        if (again.error) throw new Error(again.error.message);
        const data = unwrapData(again.data) as StartSingle;
        if (data.mode !== "single" || !data.uploadUrl) {
          throw new Error("Expected a single-part upload URL");
        }
        key = data.key;
        return data.uploadUrl;
      },
      file,
      contentType,
      3,
      opts?.onProgress,
    );
    opts?.onProgress?.(1);
    return key;
  }

  const partSize = start.partSize || 5 * 1024 * 1024;
  const partCount = start.partCount || Math.ceil(file.size / partSize);
  const parts: Array<{ partNumber: number; etag: string }> = [];

  try {
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const from = (partNumber - 1) * partSize;
      const chunk = file.slice(from, Math.min(from + partSize, file.size));
      const base = (partNumber - 1) / partCount;
      const span = 1 / partCount;
      const etag = await putWithRetry(
        async () => {
          const res = await api.media.presignPart({
            key: start.key,
            uploadId: start.uploadId,
            partNumber,
          });
          if (res.error) throw new Error(res.error.message);
          const data = unwrapData(res.data) as { uploadUrl?: string };
          if (!data?.uploadUrl) throw new Error("Missing part upload URL");
          return data.uploadUrl;
        },
        chunk,
        undefined, // multipart part signature has no Content-Type
        3,
        (ratio) => opts?.onProgress?.(base + span * ratio),
      );
      if (!etag) {
        throw new Error(
          "S3 did not return an ETag. Ensure the bucket CORS ExposeHeaders includes ETag.",
        );
      }
      parts.push({ partNumber, etag });
      opts?.onProgress?.(partNumber / partCount);
    }

    const done = await api.media.completeUpload({
      key: start.key,
      uploadId: start.uploadId,
      parts,
    });
    if (done.error) throw new Error(done.error.message || "Could not complete upload");
    return start.key;
  } catch (err) {
    await api.media.abortUpload({ key: start.key, uploadId: start.uploadId }).catch(() => {});
    throw err;
  }
}
