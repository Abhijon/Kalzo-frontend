/**
 * Kalzo API Client
 * Base URL: VITE_API_BASE_URL (defaults to http://localhost:8000/api/v1)
 *
 * Auth:
 *  POST /customer-signup, /artist-signup, /login, /resend-otp, /verify-otp
 *  GET  /me
 * Artist:
 *  GET  /artist/profile · POST /artist/profile (multipart)
 *  GET  /artists/verified
 * Admin:
 *  GET  /admin/artists · GET /admin/artists/:id
 *  PATCH /admin/artists/:id/verify · PATCH /admin/artists/:id/reject
 */

/** Unwrap `{ success, data }` envelopes from the Node API. */
export function unwrapData<T = any>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload && ("success" in payload || Array.isArray(payload.data) || typeof payload.data === "object")) {
    return payload.data as T;
  }
  return payload as T;
}

/** Normalize artist rows (camelCase or snake_case) for existing Kalzo UI. */
export function normalizeArtist(raw: any) {
  if (!raw || typeof raw !== "object") return raw;
  const pick = <T,>(...vals: T[]) => vals.find((v) => v !== undefined && v !== null) as T;
  const reelsRaw = pick(raw.reels, raw.reelPaths, raw.reel_paths) ?? [];
  return {
    ...raw,
    id: raw.id,
    owner_id: pick(raw.owner_id, raw.ownerId, raw.userId, raw.user_id) ?? "",
    stage_name: pick(raw.stage_name, raw.stageName) ?? "",
    legal_name: pick(raw.legal_name, raw.legalName) ?? "",
    discipline: pick(raw.discipline) ?? "",
    subcategory: pick(raw.subcategory) ?? "",
    bio: pick(raw.bio) ?? "",
    base_city: pick(raw.base_city, raw.baseCity) ?? "",
    state_name: pick(raw.state_name, raw.stateName) ?? "",
    current_city: pick(raw.current_city, raw.currentCity) ?? "",
    current_state: pick(raw.current_state, raw.currentState) ?? "",
    preferred_cities: pick(raw.preferred_cities, raw.preferredCities) ?? [],
    preferred_states: pick(raw.preferred_states, raw.preferredStates) ?? [],
    rate_inr: Number(pick(raw.rate_inr, raw.rateInr) ?? 0),
    pricing_unit: pick(raw.pricing_unit, raw.pricingUnit) ?? "hour",
    travel_setting: pick(raw.travel_setting, raw.travelSetting) ?? "including",
    travel_charge_inr: Number(pick(raw.travel_charge_inr, raw.travelChargeInr) ?? 0),
    stay_charge_inr: Number(pick(raw.stay_charge_inr, raw.stayChargeInr) ?? 0),
    city_rates: pick(raw.city_rates, raw.cityRates) ?? {},
    instagram: pick(raw.instagram) ?? "",
    photo_path: pick(raw.photo_path, raw.photoPath, raw.photo) ?? "",
    art_photo_path: pick(raw.art_photo_path, raw.artPhotoPath, raw.artPhoto) ?? "",
    face_video_path: pick(raw.face_video_path, raw.faceVideoPath, raw.faceVideo) ?? "",
    reels: Array.isArray(reelsRaw) ? reelsRaw : [],
    primary_reel: Number(pick(raw.primary_reel, raw.primaryReel) ?? 0),
    status: pick(raw.status) ?? "pending_review",
    verification_status: pick(raw.verification_status, raw.verificationStatus) ?? "unverified",
    rejection_reason: pick(raw.rejection_reason, raw.rejectionReason) ?? "",
    bank_account_holder: pick(raw.bank_account_holder, raw.bankAccountHolder) ?? "",
    bank_name: pick(raw.bank_name, raw.bankName) ?? "",
    bank_account_number: pick(raw.bank_account_number, raw.bankAccountNumber) ?? "",
    bank_ifsc: pick(raw.bank_ifsc, raw.bankIfsc) ?? "",
    email: pick(raw.email) ?? "",
    availability: pick(raw.availability) ?? [],
    created_at: pick(raw.created_at, raw.createdAt) ?? "",
    updated_at: pick(raw.updated_at, raw.updatedAt) ?? "",
  };
}

/** Extract a paginated or bare artist array from an API payload. */
export function artistListFrom(payload: any): any[] {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data.map(normalizeArtist);
  if (Array.isArray(data?.artists)) return data.artists.map(normalizeArtist);
  if (Array.isArray(data?.items)) return data.items.map(normalizeArtist);
  if (Array.isArray(data?.results)) return data.results.map(normalizeArtist);
  return [];
}

/**
 * Extract one artist/profile from API envelopes:
 * `{ success, data: { artist } }` · `{ profile }` · or a bare artist row.
 */
export function artistFrom(payload: any) {
  const data = unwrapData(payload);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row = data.artist ?? data.profile ?? data;
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  if (!("id" in row) && !("stageName" in row) && !("stage_name" in row)) return null;
  return normalizeArtist(row);
}

function resolveApiBaseUrl() {
  const configured = (
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
    "/api/v1"
  ).replace(/\/+$/, "");

  // Relative paths are for the browser (Vite proxy). SSR/server needs an absolute backend URL.
  if (configured.startsWith("/") && typeof window === "undefined") {
    const proxyTarget = (
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_PROXY_TARGET) ||
      (typeof process !== "undefined" && process.env?.VITE_API_PROXY_TARGET) ||
      "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");
    return `${proxyTarget}${configured}`;
  }
  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** All REST calls go through the base URL (which already includes /api/v1) */
const API_V1 = API_BASE_URL;

const TOKEN_KEY = "kalzo_auth_token";
const USER_KEY = "kalzo_auth_user";
const PROFILE_KEY = "kalzo_auth_profile";

// ─── Token / User Helpers ────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? "null"); } catch { return null; }
}

export function setStoredUser(user: any | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function getStoredProfile(): any | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); } catch { return null; }
}

export function setStoredProfile(profile: any | null) {
  if (typeof window === "undefined") return;
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  else localStorage.removeItem(PROFILE_KEY);
}

// ─── Auth Event Bus ───────────────────────────────────────────────────────────

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type AuthListener = (event: AuthEvent, session: { access_token: string; user: any } | null) => void;
const authListeners = new Set<AuthListener>();

function notifyAuth(event: AuthEvent, session: { access_token: string; user: any } | null) {
  authListeners.forEach((fn) => { try { fn(event, session); } catch {} });
}

// ─── Generic HTTP Fetch ───────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string; status?: number; raw?: any } | null;
}

async function req<T = any>(
  url: string,
  opts: RequestInit & { params?: Record<string, any> } = {}
): Promise<ApiResponse<T>> {
  const { params, body, headers: extraHeaders, ...rest } = opts;

  let fullUrl = url;
  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    if (qs) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
  }

  const headers = new Headers(extraHeaders);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (body && !(body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  try {
    const res = await fetch(fullUrl, {
      ...rest,
      headers,
      body: body instanceof FormData || typeof body === "string" || !body
        ? body
        : JSON.stringify(body),
    });

    const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const message = (typeof data === "object" && data)
        ? (data.message || data.error || `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
      return { data: null, error: { message: String(message), status: res.status, raw: data } };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message ?? "Network error", status: 0, raw: err } };
  }
}

// ─── Auth Module ──────────────────────────────────────────────────────────────
// Maps to actual backend routes under /api/v1

const authModule = {
  /**
   * Customer signup → POST /api/v1/customer-signup
   * Body: { email, fullName, location, customerType, reasonForBooking, mobileNumber, businessName? }
   * Response: { success, data: { message, user, profile } }
   * NOTE: account is created but NOT yet active; must call verify-otp next.
   */
  async signupCustomer(params: {
    email: string;
    fullName: string;
    location: string;
    customerType: string;
    reasonForBooking: string;
    mobileNumber: string;
    businessName?: string;
  }): Promise<ApiResponse<{ message: string; user: any; profile: any }>> {
    const res = await req(`${API_V1}/customer-signup`, { method: "POST", body: params as any });
    return res as ApiResponse<{ message: string; user: any; profile: any }>;
  },

  /**
   * Artist signup → POST /api/v1/artist-signup
   * Body: { email, mobileNumber }
   * Response: { success, data: { message, user, profile } }
   * NOTE: account is created but NOT yet active; must call verify-otp next.
   */
  async signupArtist(params: {
    email: string;
    mobileNumber: string;
  }): Promise<ApiResponse<{ message: string; user: any; profile: any }>> {
    const res = await req(`${API_V1}/artist-signup`, { method: "POST", body: params as any });
    return res as ApiResponse<{ message: string; user: any; profile: any }>;
  },

  /**
   * Login (request OTP for existing account) → POST /api/v1/login
   * Body: { email }
   * Response: { success, data: { message } }
   */
  async login(email: string): Promise<ApiResponse<{ message: string }>> {
    return req(`${API_V1}/login`, { method: "POST", body: { email } as any });
  },

  /**
   * Resend OTP → POST /api/v1/resend-otp
   * Body: { email }
   */
  async resendOtp(email: string): Promise<ApiResponse<{ message: string }>> {
    return req(`${API_V1}/resend-otp`, { method: "POST", body: { email } as any });
  },

  /**
   * Verify OTP → POST /api/v1/verify-otp
   * Body: { email, otp }
   * Response: { success, data: { token, user } }
   * Saves JWT + user to localStorage and fires SIGNED_IN.
   */
  async verifyOtp(params: { email: string; otp: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    const res = await req<{ success: boolean; data: { token: string; user: any } }>(
      `${API_V1}/verify-otp`,
      { method: "POST", body: params as any }
    );
    if (res.data) {
      // Backend wraps in { success, data: { token, user } }
      const payload = (res.data as any)?.data ?? res.data;
      const token: string = payload?.token;
      const user: any = payload?.user;
      if (token) { setAuthToken(token); setStoredUser(user); notifyAuth("SIGNED_IN", { access_token: token, user }); }
      return { data: { token, user }, error: null };
    }
    return res as ApiResponse<{ token: string; user: any }>;
  },

  /**
   * Get current user and profile → GET /api/v1/me  (Bearer required)
   * Response: { success, data: { user, profile } }
   */
  async getUser(): Promise<{ data: { user: any | null; profile?: any | null }; error: any }> {
    const token = getAuthToken();
    if (!token) return { data: { user: null, profile: null }, error: null };

    const res = await req<{ success: boolean; data: { user: any; profile: any } }>(`${API_V1}/me`);
    if (res.data) {
      const payload = (res.data as any)?.data ?? res.data;
      const user = payload?.user ?? payload;
      const profile = payload?.profile ?? null;
      setStoredUser(user);
      setStoredProfile(profile);
      return { data: { user, profile }, error: null };
    }
    if (res.error?.status === 401) {
      setAuthToken(null); setStoredUser(null); setStoredProfile(null);
      notifyAuth("SIGNED_OUT", null);
    }
    // Fallback to cached user and profile to avoid UI flicker on transient errors
    return { data: { user: getStoredUser(), profile: getStoredProfile() }, error: res.error };
  },

  async getMe() {
    return this.getUser();
  },

  async getSession(): Promise<{ data: { session: { access_token: string; user: any } | null }; error: any }> {
    const token = getAuthToken();
    if (!token) return { data: { session: null }, error: null };
    const { data } = await this.getUser();
    if (!data.user) return { data: { session: null }, error: null };
    return { data: { session: { access_token: token, user: data.user } }, error: null };
  },

  async signOut(): Promise<{ error: any }> {
    setAuthToken(null); setStoredUser(null); setStoredProfile(null);
    notifyAuth("SIGNED_OUT", null);
    return { error: null };
  },

  /** OAuth: redirect to backend OAuth initiation endpoint (Google etc.) */
  async signInWithOAuth(provider: string, options?: { redirect_uri?: string }): Promise<{ error: any }> {
    const redirect = options?.redirect_uri ?? (typeof window !== "undefined" ? window.location.origin : "");
    if (typeof window !== "undefined")
      window.location.href = `${API_V1}/auth/${provider}?redirect_uri=${encodeURIComponent(redirect)}`;
    return { error: null };
  },

  /** Update user profile */
  async updateProfile(attrs: Record<string, any>): Promise<ApiResponse<any>> {
    const res = await req(`${API_V1}/me`, { method: "PATCH", body: attrs as any });
    if (res.data) {
      const payload = (res.data as any)?.data ?? res.data;
      if (payload?.user) setStoredUser(payload.user);
      if (payload?.profile) setStoredProfile(payload.profile);
    } else {
      // Optimistically update cached profile if backend doesn't reject
      const cached = getStoredProfile() ?? {};
      setStoredProfile({ ...cached, ...attrs });
    }
    return res;
  },

  /** Update user (e.g. password) */
  async updateUser(attrs: { password?: string; data?: any }): Promise<{ error: any }> {
    const res = await req(`${API_V1}/me`, { method: "PATCH", body: attrs as any });
    if (res.data) {
      const payload = (res.data as any)?.data ?? res.data;
      if (payload?.user) setStoredUser(payload.user);
    }
    return { error: res.error };
  },

  onAuthStateChange(cb: (event: AuthEvent, session: { access_token: string; user: any } | null) => void) {
    authListeners.add(cb);
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },
};

// ─── Storage Module ───────────────────────────────────────────────────────────

const storageAdapter = {
  from(_bucket = "kalzo-media") {
    return {
      async upload(path: string, file: Blob | File | ArrayBuffer) {
        const fd = new FormData();
        const blob = file instanceof Blob ? file : new Blob([file]);
        fd.append("file", blob);
        fd.append("path", path);
        return req<{ path: string; url: string }>(`${API_V1}/media/upload`, { method: "POST", body: fd });
      },

      async createSignedUrl(path: string, _expiresIn = 3600) {
        if (!path) return { data: { signedUrl: "" }, error: null };
        if (/^https?:\/\//i.test(path)) return { data: { signedUrl: path }, error: null };
        const clean = String(path).replace(/^\/+/, "");
        const res = await req(`${API_V1}/media/url`, { params: { path: clean } });
        if (!res.error) {
          const payload = unwrapData(res.data) as { signedUrl?: string; url?: string } | null;
          const signedUrl = payload?.signedUrl ?? payload?.url;
          if (signedUrl) return { data: { signedUrl }, error: null };
        }
        // Local uploads are served at GET /api/v1/media/<object-key>
        return { data: { signedUrl: `${API_BASE_URL}/media/${clean}` }, error: null };
      },

      getPublicUrl(path: string) {
        if (!path) return { data: { publicUrl: "" } };
        if (/^https?:\/\//i.test(path)) return { data: { publicUrl: path } };
        return { data: { publicUrl: `${API_BASE_URL}/media/${String(path).replace(/^\/+/, "")}` } };
      },
    };
  },
};

// ─── Table Query Builder ──────────────────────────────────────────────────────

class TableQueryBuilder<T = any> {
  private filters: Record<string, string> = {};
  private selectFields = "*";
  private orderField?: string;
  private orderAsc = true;
  private returnSingle = false;
  private returnMaybe = false;
  private limitCount?: number;

  constructor(private tableName: string) {}

  select(f = "*") { this.selectFields = f; return this; }
  eq(field: string, value: any) { this.filters[field] = String(value); return this; }
  neq(field: string, value: any) { this.filters[`${field}_neq`] = String(value); return this; }
  gt(field: string, value: any) { this.filters[`${field}_gt`] = String(value); return this; }
  gte(field: string, value: any) { this.filters[`${field}_gte`] = String(value); return this; }
  lt(field: string, value: any) { this.filters[`${field}_lt`] = String(value); return this; }
  lte(field: string, value: any) { this.filters[`${field}_lte`] = String(value); return this; }
  in(field: string, values: any[]) { this.filters[`${field}_in`] = values.join(","); return this; }
  or(f: string) { this.filters["_or"] = f; return this; }
  order(field: string, opts?: { ascending?: boolean }) { this.orderField = field; this.orderAsc = opts?.ascending ?? true; return this; }
  limit(n: number) { this.limitCount = n; return this; }
  single() { this.returnSingle = true; return this; }
  maybeSingle() { this.returnMaybe = true; return this; }

  async then<R1 = ApiResponse<T>, R2 = never>(
    ok?: ((v: ApiResponse<T>) => R1 | PromiseLike<R1>) | null,
    fail?: ((e: any) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    const params: Record<string, string> = { ...this.filters };
    if (this.selectFields !== "*") params["_select"] = this.selectFields;
    if (this.orderField) { params["_sort"] = this.orderField; params["_order"] = this.orderAsc ? "asc" : "desc"; }
    if (this.limitCount) params["_limit"] = String(this.limitCount);

    let endpoint = `${API_V1}/${this.tableName}`;
    if (this.filters["id"] && (this.returnSingle || this.returnMaybe)) {
      endpoint += `/${encodeURIComponent(this.filters["id"])}`;
      delete params["id"];
    }

    const res = await req<T>(endpoint, { params });
    if ((this.returnSingle || this.returnMaybe) && Array.isArray(res.data))
      (res as any).data = res.data[0] ?? null;

    if (ok) return Promise.resolve(ok(res));
    return res as unknown as R1;
  }

  async insert(data: any) { return req<T>(`${API_V1}/${this.tableName}`, { method: "POST", body: data }); }
  async upsert(data: any, _opts?: { onConflict?: string }) { return req<T>(`${API_V1}/${this.tableName}`, { method: "PUT", body: data }); }
  async update(data: any) {
    const id = this.filters["id"];
    const endpoint = id ? `${API_V1}/${this.tableName}/${encodeURIComponent(id)}` : `${API_V1}/${this.tableName}`;
    return req<T>(endpoint, { method: "PATCH", params: this.filters, body: data });
  }
  async delete() {
    const id = this.filters["id"];
    const endpoint = id ? `${API_V1}/${this.tableName}/${encodeURIComponent(id)}` : `${API_V1}/${this.tableName}`;
    return req<T>(endpoint, { method: "DELETE", params: this.filters });
  }
}

// ─── Main API Object ──────────────────────────────────────────────────────────

export const api = {
  /** Base URL (no trailing slash), e.g. "http://localhost:8000" */
  baseUrl: API_BASE_URL,
  /** Base URL with /api/v1 prefix */
  v1: API_V1,

  // HTTP verbs (raw, for custom endpoints not in the builder)
  get:    <T = any>(path: string, opts?: RequestInit & { params?: Record<string, any> }) => req<T>(`${API_V1}/${path.replace(/^\//, "")}`, { ...opts, method: "GET" }),
  post:   <T = any>(path: string, body?: any, opts?: RequestInit) => req<T>(`${API_V1}/${path.replace(/^\//, "")}`, { ...opts, method: "POST", body }),
  patch:  <T = any>(path: string, body?: any, opts?: RequestInit) => req<T>(`${API_V1}/${path.replace(/^\//, "")}`, { ...opts, method: "PATCH", body }),
  put:    <T = any>(path: string, body?: any, opts?: RequestInit) => req<T>(`${API_V1}/${path.replace(/^\//, "")}`, { ...opts, method: "PUT", body }),
  delete: <T = any>(path: string, opts?: RequestInit) => req<T>(`${API_V1}/${path.replace(/^\//, "")}`, { ...opts, method: "DELETE" }),

  // Modules
  auth:    authModule,
  storage: storageAdapter,

  /** Fluent table query builder (maps to REST CRUD on /api/v1/:table) */
  from: <T = any>(table: string) => new TableQueryBuilder<T>(table),

  /** RPC-style procedures → POST /api/v1/rpc/:name */
  rpc: async (name: string, args: Record<string, any> = {}) => {
    const res = await req(`${API_V1}/rpc/${name}`, { method: "POST", body: args as any });
    return { data: res.data, error: res.error };
  },

  // ─── Domain helpers ───────────────────────────────────────────────────────

  health: () => req(`${API_BASE_URL.replace(/\/api\/v1$/, "")}/health`),

  artists: {
    list:           (params?: Record<string, any>) => req(`${API_V1}/artists`, { params }),
    getById:        (id: string)                   => req(`${API_V1}/artists/${id}`),
    /** Verified artists for customers → GET /artists/verified */
    listVerified:   (params?: { page?: number; limit?: number }) =>
      req(`${API_V1}/artists/verified`, { params }),
    /** Logged-in artist onboarding profile → GET /artist/profile */
    getProfile:     () => req(`${API_V1}/artist/profile`),
    /**
     * Submit artist profile for verification → POST /artist/profile (multipart/form-data)
     * Fields: stageName, legalName, baseCity, stateName, currentCity, currentState,
     * preferredCities, preferredStates?, discipline, subcategory, bio, instagram,
     * rateInr, pricingUnit?, travelSetting?, travelChargeInr?, stayChargeInr?, cityRates?,
     * primaryReel?, bankAccountHolder, bankName, bankAccountNumber, bankIfsc,
     * files: photo, artPhoto, faceVideo, reels (2–4)
     */
    saveProfile:    (formData: FormData) =>
      req(`${API_V1}/artist/profile`, { method: "POST", body: formData }),
    saveDraft:      (data: any)                    => req(`${API_V1}/artists/draft`,    { method: "POST",  body: data }),
    updateLocation: (data: any)                    => req(`${API_V1}/artists/location`, { method: "PUT",   body: data }),
  },

  bookings: {
    list:    (params?: Record<string, any>) => req(`${API_V1}/bookings`,             { params }),
    getById: (id: string)                   => req(`${API_V1}/bookings/${id}`),
    create:  (data: any)                    => req(`${API_V1}/bookings`,             { method: "POST", body: data }),
    cancel:  (id: string, reason?: string)  => req(`${API_V1}/bookings/${id}/cancel`,{ method: "POST", body: { reason } }),
  },

  payments: {
    createOrder:   (data: any) => req(`${API_V1}/payments/create-order`, { method: "POST", body: data }),
    verifyPayment: (data: any) => req(`${API_V1}/payments/verify`,       { method: "POST", body: data }),
  },

  admin: {
    getStats:     ()                            => req(`${API_V1}/admin/stats`),
    listBookings: (params?: Record<string, any>) => req(`${API_V1}/admin/bookings`,     { params }),
    /** Paginated artist profiles → GET /admin/artists */
    listArtists:  (params?: { page?: number; limit?: number }) =>
      req(`${API_V1}/admin/artists`, { params }),
    /** One artist with media paths → GET /admin/artists/:id */
    getArtist:    (id: string) => req(`${API_V1}/admin/artists/${id}`),
    /** Mark verified → PATCH /admin/artists/:id/verify */
    verifyArtist: (id: string) =>
      req(`${API_V1}/admin/artists/${id}/verify`, { method: "PATCH" }),
    /** Reject with required comment → PATCH /admin/artists/:id/reject */
    rejectArtist: (id: string, reason: string) =>
      req(`${API_V1}/admin/artists/${id}/reject`, { method: "PATCH", body: { reason } }),
  },
};

export default api;
