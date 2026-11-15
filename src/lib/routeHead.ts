export function kalzoHead(title: string, description: string, privatePage = false) {
  return {
    meta: [
      { title: title + " — Kalzo" },
      { name: "description", content: description },
      { property: "og:title", content: title + " — Kalzo" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...(privatePage ? [{ name: "robots", content: "noindex" }] : []),
    ],
  };
}
