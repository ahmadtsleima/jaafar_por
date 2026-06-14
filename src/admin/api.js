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

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Remove Content-Type for FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) delete headers["Content-Type"];

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// XHR-based upload with real progress events
function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api${path}`);
    xhr.timeout = 120000;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.upload.addEventListener("load", () => onProgress(100));

    xhr.addEventListener("load", () => {
      if (xhr.status === 401) { clearToken(); window.location.reload(); return; }
      const fallbackMessage = xhr.responseText?.slice(0, 240) || xhr.statusText || `HTTP ${xhr.status}`;
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(data.error || xhr.statusText));
        else resolve(data);
      } catch {
        if (xhr.status >= 400) reject(new Error(fallbackMessage));
        else resolve({});
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out after 120 seconds")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    xhr.send(formData);
  });
}

export const api = {
  login: (password) =>
    apiFetch("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),

  stats: () => apiFetch("/admin/stats"),

  photos: {
    list: (category) =>
      apiFetch(`/admin/photos${category ? `?category=${category}` : ""}`),
    upload: (formData, onProgress) =>
      uploadWithProgress("/admin/photos", formData, onProgress ?? (() => {})),
    update: (id, data) =>
      apiFetch(`/admin/photos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id) =>
      apiFetch(`/admin/photos/${id}`, { method: "DELETE" }),
    reorder: (items) =>
      apiFetch("/admin/photos/reorder", { method: "PATCH", body: JSON.stringify({ items }) }),
  },

  videos: {
    list: (slot = "scroll_scrub") => apiFetch(`/admin/videos?slot=${slot}`),
    upload: (formData, onProgress) =>
      uploadWithProgress("/admin/videos", formData, onProgress ?? (() => {})),
    publish: (id) =>
      apiFetch(`/admin/videos/${id}/publish`, { method: "PATCH", body: JSON.stringify({}) }),
    remove: (id) =>
      apiFetch(`/admin/videos/${id}`, { method: "DELETE" }),
  },
};
