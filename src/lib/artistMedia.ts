export function ownsArtistMedia(owner: string, path: string) {
  return (
    path.startsWith(owner + "/") &&
    path.length > owner.length + 1 &&
    !/[%\\?#]/.test(path) &&
    !path.split("/").some((part) => part === "." || part === "..")
  );
}
