/**
 * True when `path` is media owned by this artist account.
 * Supports:
 * - legacy: `{ownerId}/file.jpg`
 * - Node / S3 keys: `artists/{ownerId}/…` · `artist-profile-images/{ownerId}/…`
 */
export function ownsArtistMedia(owner: string, path: string) {
  if (!owner || !path) return false;
  if (/[%\\?#]/.test(path)) return false;
  if (path.split("/").some((part) => part === "." || part === "..")) return false;

  const legacy = owner + "/";
  if (path.startsWith(legacy) && path.length > legacy.length) return true;

  for (const folder of ["artists", "artist-profile-images"]) {
    const prefix = `${folder}/${owner}/`;
    if (path.startsWith(prefix) && path.length > prefix.length) return true;
  }
  return false;
}
