import { unwrapData } from "@/lib/api";

const CLIENT_KEY = "kalzo_digilocker_client_id";
const DIGIBOOST_CDN =
  "https://cdn.jsdelivr.net/gh/surepassio/surepass-digiboost-web-sdk@latest/index.min.js";

export type DigilockerSession = {
  clientId: string;
  token?: string | null;
  url?: string | null;
  expirySeconds?: number | null;
};

declare global {
  interface Window {
    DigiboostSdk?: (opts: {
      gateway: string;
      token: string;
      selector?: string;
      onSuccess?: (data: unknown) => void;
      onFailure?: (error: unknown) => void;
    }) => void;
  }
}

export function storeDigilockerClientId(clientId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CLIENT_KEY, clientId);
}

export function readDigilockerClientId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(CLIENT_KEY);
}

export function clearDigilockerClientId() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(CLIENT_KEY);
}

export function digilockerSessionFrom(payload: unknown): DigilockerSession | null {
  const data = unwrapData(payload) as { session?: Record<string, unknown> } | null;
  const session = data?.session;
  if (!session || typeof session !== "object") return null;
  const clientId = String(session["clientId"] ?? session["client_id"] ?? "").trim();
  if (!clientId) return null;
  return {
    clientId,
    token: (session["token"] as string | null | undefined) ?? null,
    url: (session["url"] as string | null | undefined) ?? null,
    expirySeconds:
      (session["expirySeconds"] as number | null | undefined) ??
      (session["expiry_seconds"] as number | null | undefined) ??
      null,
  };
}

function digiboostGateway(): "sandbox" | "production" {
  const env =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.["VITE_SUREPASS_GATEWAY"]) ||
    "sandbox";
  return env === "production" ? "production" : "sandbox";
}

function loadDigiboostScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("DigiLocker needs a browser"));
  if (window.DigiboostSdk) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${DIGIBOOST_CDN}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Digiboost SDK")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DIGIBOOST_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Digiboost SDK"));
    document.head.appendChild(script);
  });
}

/**
 * Open Digilocker.
 * Prefer Digiboost SDK (`token`) locally so onSuccess can return to Kalzo
 * without a public redirect_url. Fall back to Via Link `url` when no token.
 */
export async function openDigilockerSession(session: DigilockerSession): Promise<"redirect" | "sdk"> {
  storeDigilockerClientId(session.clientId);

  if (session.token) {
    await loadDigiboostScript();
    if (!window.DigiboostSdk) {
      throw new Error("Digiboost SDK failed to initialize");
    }

    return new Promise((resolve, reject) => {
      const hostId = "kalzo-digiboost-host";
      let host = document.getElementById(hostId);
      if (!host) {
        host = document.createElement("div");
        host.id = hostId;
        host.style.position = "fixed";
        host.style.inset = "0";
        host.style.zIndex = "80";
        host.style.display = "grid";
        host.style.placeItems = "center";
        host.style.background = "rgba(10, 10, 12, 0.45)";
        document.body.appendChild(host);
      }
      host.innerHTML = "";
      const mount = document.createElement("div");
      mount.id = "kalzo-digiboost-button";
      host.appendChild(mount);

      window.DigiboostSdk!({
        gateway: digiboostGateway(),
        token: session.token!,
        selector: "#kalzo-digiboost-button",
        onSuccess: () => {
          host?.remove();
          window.location.assign("/artist/kyc/callback");
          resolve("sdk");
        },
        onFailure: () => {
          host?.remove();
          reject(new Error("Digilocker verification was cancelled or failed"));
        },
      });

      // Auto-click the injected button so the user doesn't see an extra UI step.
      requestAnimationFrame(() => {
        const btn = mount.querySelector("button, a, [role='button']") as HTMLElement | null;
        btn?.click();
      });
    });
  }

  if (session.url) {
    window.location.assign(session.url);
    return "redirect";
  }

  throw new Error("Surepass did not return a Digilocker link or token");
}
