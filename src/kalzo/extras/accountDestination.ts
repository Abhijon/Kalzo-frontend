export function accountDestination(hasArtistProfile: boolean, audience?: string) {
  return hasArtistProfile || audience === "artist" ? "/artist" : "/account";
}