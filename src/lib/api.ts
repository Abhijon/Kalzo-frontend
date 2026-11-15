/**
 * Centralized API Client for Kalzo Frontend
 * Connects all frontend endpoints to your separate backend using a single base URL.
 *
 * Configurable via VITE_API_BASE_URL (defaults to http://localhost:8000).
 */

export const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
  "http://localhost:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "kalzo_auth_token";
const USER_KEY = "kalzo_auth_user";

// Event system for reactive auth state changes across the frontend
type AuthEventListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED", session: any) => void;
const authListeners = new Set<AuthEventListener>();

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function notifyAuthChange(event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED", session: any) {
  authListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (e) {
      console.error("[API Auth Event Error]", e);
    }
  });
}

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string; status?: number; raw?: any } | null;
}

/**
 * Core HTTP Request Wrapper
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers: customHeaders, body, ...restOptions } = options;

  let url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? endpoint
    : `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) searchParams.append(key, String(val));
    });
    const qs = searchParams.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const token = getAuthToken();
  const headers = new Headers(customHeaders);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set Content-Type only if not sending FormData
  if (!(body instanceof FormData) && !headers.has("Content-Type") && body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(url, {
      ...restOptions,
      headers,
      body: body instanceof FormData || typeof body === "string" || !body ? body : JSON.stringify(body),
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const message =
        (typeof data === "object" && data && (data.error || data.message)) ||
        `Request failed with status ${res.status}`;
      return {
        data: null,
        error: { message: String(message), status: res.status, raw: data },
      };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    const message = err?.message || "Network request failed. Is the backend running at " + API_BASE_URL + "?";
    return { data: null, error: { message, status: 0, raw: err } };
  }
}

/**
 * Chainable Table Query Builder
 * Maps table CRUD operations directly to your REST backend (e.g. GET /bookings, POST /bookings).
 */
class TableQueryBuilder<T = any> {
  private tableName: string;
  private selectFields = "*";
  private filters: Record<string, string> = {};
  private orderField?: string;
  private orderAscending = true;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = "*") {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.filters[field] = String(value);
    return this;
  }

  or(filterStr: string) {
    this.filters["_or"] = filterStr;
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = opts?.ascending ?? true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then<TResult1 = ApiResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const params: Record<string, string> = { ...this.filters };
    if (this.selectFields && this.selectFields !== "*") params["_select"] = this.selectFields;
    if (this.orderField) {
      params["_sort"] = this.orderField;
      params["_order"] = this.orderAscending ? "asc" : "desc";
    }

    // If querying by specific id via eq("id", val) or single(), point to /tableName/:id if applicable
    let endpoint = this.tableName;
    if (this.filters["id"] && (this.isSingle || this.isMaybeSingle)) {
      endpoint = `${this.tableName}/${encodeURIComponent(this.filters["id"])}`;
      delete params["id"];
    }

    const res = await apiRequest<T>(endpoint, { method: "GET", params });
    if (this.isSingle && res.data && Array.isArray(res.data)) {
      res.data = (res.data[0] ?? null) as unknown as T;
    }
    if (this.isMaybeSingle && res.data && Array.isArray(res.data)) {
      res.data = (res.data[0] ?? null) as unknown as T;
    }

    if (onfulfilled) return Promise.resolve(onfulfilled(res));
    return res as unknown as TResult1;
  }

  async insert(data: any) {
    return apiRequest<T>(this.tableName, {
      method: "POST",
      body: data,
    });
  }

  async upsert(data: any, _options?: { onConflict?: string }) {
    return apiRequest<T>(this.tableName, {
      method: "PUT",
      body: data,
    });
  }

  async update(data: any) {
    let endpoint = this.tableName;
    if (this.filters["id"]) {
      endpoint = `${this.tableName}/${encodeURIComponent(this.filters["id"])}`;
    }
    return apiRequest<T>(endpoint, {
      method: "PATCH",
      params: this.filters,
      body: data,
    });
  }

  async delete() {
    let endpoint = this.tableName;
    if (this.filters["id"]) {
      endpoint = `${this.tableName}/${encodeURIComponent(this.filters["id"])}`;
    }
    return apiRequest<T>(endpoint, {
      method: "DELETE",
      params: this.filters,
    });
  }
}

/**
 * Storage adapter for media assets (Face videos, reels, photos)
 */
const storageAdapter = {
  from(_bucket = "kalzo-media") {
    return {
      async upload(path: string, file: Blob | File | ArrayBuffer) {
        const formData = new FormData();
        const blob = file instanceof Blob ? file : new Blob([file]);
        formData.append("file", blob);
        formData.append("path", path);

        return apiRequest<{ path: string; url: string }>("media/upload", {
          method: "POST",
          body: formData,
        });
      },

      async createSignedUrl(path: string, expiresIn = 3600) {
        // If the backend returns URLs directly or signs them:
        const res = await apiRequest<{ signedUrl?: string; url?: string }>("media/url", {
          method: "GET",
          params: { path, expires: expiresIn },
        });

        const signedUrl = res.data?.signedUrl || res.data?.url || `${API_BASE_URL}/media/${path}`;
        return { data: { signedUrl }, error: res.error };
      },

      getPublicUrl(path: string) {
        return {
          data: { publicUrl: `${API_BASE_URL}/media/${path}` },
        };
      },
    };
  },
};

/**
 * High-Level Auth Module
 */
const authModule = {
  async getUser(): Promise<{ data: { user: any | null }; error: any }> {
    const token = getAuthToken();
    if (!token) {
      setStoredUser(null);
      return { data: { user: null }, error: null };
    }

    // Return stored user immediately for instant UI rendering, while verifying in background
    const cachedUser = getStoredUser();

    // Verify / refresh user details from backend
    const res = await apiRequest<any>("auth/me", { method: "GET" });
    if (res.data) {
      const user = res.data.user || res.data;
      setStoredUser(user);
      return { data: { user }, error: null };
    }

    if (res.error && res.error.status === 401) {
      setAuthToken(null);
      setStoredUser(null);
      notifyAuthChange("SIGNED_OUT", null);
      return { data: { user: null }, error: res.error };
    }

    return { data: { user: cachedUser }, error: null };
  },

  async getSession(): Promise<{ data: { session: { access_token: string; user: any } | null }; error: any }> {
    const token = getAuthToken();
    if (!token) return { data: { session: null }, error: null };
    const { data } = await this.getUser();
    if (!data.user) return { data: { session: null }, error: null };

    return {
      data: {
        session: {
          access_token: token,
          user: data.user,
        },
      },
      error: null,
    };
  },

  async signInWithOtp(params: { email: string; options?: any }): Promise<{ error: any }> {
    const res = await apiRequest("auth/send-otp", {
      method: "POST",
      body: {
        email: params.email,
        options: params.options,
      },
    });
    return { error: res.error };
  },

  async verifyOtp(params: { email: string; token: string; type?: string }): Promise<{ error: any; data?: any }> {
    const res = await apiRequest<{ token?: string; access_token?: string; user?: any }>("auth/verify-otp", {
      method: "POST",
      body: {
        email: params.email,
        code: params.token,
        type: params.type || "email",
      },
    });

    if (res.error) return { error: res.error };

    const token = res.data?.token || res.data?.access_token;
    const user = res.data?.user || { email: params.email };

    if (token) setAuthToken(token);
    if (user) setStoredUser(user);

    notifyAuthChange("SIGNED_IN", { access_token: token, user });
    return { error: null, data: res.data };
  },

  async signInWithOAuth(provider: string, options?: { redirect_uri?: string }): Promise<{ error: any }> {
    // Redirect to backend OAuth initiation endpoint
    const redirect = options?.redirect_uri || (typeof window !== "undefined" ? window.location.origin : "");
    window.location.href = `${API_BASE_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(redirect)}`;
    return { error: null };
  },

  async updateUser(attributes: { password?: string; data?: any }): Promise<{ error: any }> {
    const res = await apiRequest("auth/me", {
      method: "PUT",
      body: attributes,
    });
    if (res.data?.user) setStoredUser(res.data.user);
    return { error: res.error };
  },

  async signOut(): Promise<{ error: any }> {
    try {
      await apiRequest("auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    setAuthToken(null);
    setStoredUser(null);
    notifyAuthChange("SIGNED_OUT", null);
    return { error: null };
  },

  onAuthStateChange(callback: (event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED", session: any) => void) {
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
};

/**
 * Universal RPC procedure caller
 */
async function rpc(procedureName: string, params: Record<string, any> = {}): Promise<{ data: any; error: any }> {
  const res = await apiRequest(`rpc/${procedureName}`, {
    method: "POST",
    body: params,
  });
  return { data: res.data, error: res.error };
}

/**
 * The Central API Object
 * Provides both structured domain methods and a fluent table builder.
 */
export const api = {
  baseUrl: API_BASE_URL,
  get: <T = any>(endpoint: string, options?: ApiFetchOptions) => apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: ApiFetchOptions) => apiRequest<T>(endpoint, { ...options, method: "POST", body }),
  put: <T = any>(endpoint: string, body?: any, options?: ApiFetchOptions) => apiRequest<T>(endpoint, { ...options, method: "PUT", body }),
  patch: <T = any>(endpoint: string, body?: any, options?: ApiFetchOptions) => apiRequest<T>(endpoint, { ...options, method: "PATCH", body }),
  delete: <T = any>(endpoint: string, options?: ApiFetchOptions) => apiRequest<T>(endpoint, { ...options, method: "DELETE" }),

  auth: authModule,
  storage: storageAdapter,
  from: <T = any>(tableName: string) => new TableQueryBuilder<T>(tableName),
  rpc,

  // Direct domain helpers
  artists: {
    list: (params?: Record<string, any>) => apiRequest("artists", { method: "GET", params }),
    getById: (id: string) => apiRequest(`artists/${id}`, { method: "GET" }),
    saveDraft: (data: any) => apiRequest("artists/draft", { method: "POST", body: data }),
    updateLocation: (data: any) => apiRequest("artists/location", { method: "PUT", body: data }),
  },

  bookings: {
    list: (params?: Record<string, any>) => apiRequest("bookings", { method: "GET", params }),
    getById: (id: string) => apiRequest(`bookings/${id}`, { method: "GET" }),
    create: (data: any) => apiRequest("bookings", { method: "POST", body: data }),
    cancel: (id: string, reason?: string) => apiRequest(`bookings/${id}/cancel`, { method: "POST", body: { reason } }),
  },

  admin: {
    getStats: () => apiRequest("admin/stats", { method: "GET" }),
    listBookings: (params?: Record<string, any>) => apiRequest("admin/bookings", { method: "GET", params }),
    listArtists: (params?: Record<string, any>) => apiRequest("admin/artists", { method: "GET", params }),
    approveArtist: (id: string) => apiRequest(`admin/artists/${id}/approve`, { method: "POST" }),
    rejectArtist: (id: string, reason: string) => apiRequest(`admin/artists/${id}/reject`, { method: "POST", body: { reason } }),
  },

  payments: {
    createOrder: (data: any) => apiRequest("payments/create-order", { method: "POST", body: data }),
    verifyPayment: (data: any) => apiRequest("payments/verify", { method: "POST", body: data }),
  },
};

export default api;
