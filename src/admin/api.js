const TOKEN_KEY = "js_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Remove Content-Type for FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) delete headers["Content-Type"];

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  login: (password) =>
    apiFetch("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),

  stats: () => apiFetch("/admin/stats"),

  photos: {
    list: (category) =>
      apiFetch(`/admin/photos${category ? `?category=${category}` : ""}`),
    upload: (formData) =>
      apiFetch("/admin/photos", { method: "POST", body: formData }),
    update: (id, data) =>
      apiFetch(`/admin/photos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id) =>
      apiFetch(`/admin/photos/${id}`, { method: "DELETE" }),
    reorder: (items) =>
      apiFetch("/admin/photos/reorder", { method: "PATCH", body: JSON.stringify({ items }) }),
  },

  videos: {
    list: (slot = "scroll_scrub") => apiFetch(`/admin/videos?slot=${slot}`),
    upload: (formData) =>
      apiFetch("/admin/videos", { method: "POST", body: formData }),
    publish: (id) =>
      apiFetch(`/admin/videos/${id}/publish`, { method: "PATCH", body: JSON.stringify({}) }),
    remove: (id) =>
      apiFetch(`/admin/videos/${id}`, { method: "DELETE" }),
  },
};
