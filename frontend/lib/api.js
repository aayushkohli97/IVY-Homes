
const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-01F5888E9D57';

// ──────────────────────────────────────────────────────────────────────────────
// Token management (stored in localStorage, silently refreshed)
// ──────────────────────────────────────────────────────────────────────────────
function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('ivy_auth') || 'null');
  } catch {
    return null;
  }
}

function setAuth(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ivy_auth', JSON.stringify(data));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ivy_auth');
}

export function getStoredUser() {
  const auth = getAuth();
  return auth ? auth.user : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Silently refresh token if it has expired / is about to expire
// ──────────────────────────────────────────────────────────────────────────────
async function refreshIfNeeded() {
  const auth = getAuth();
  if (!auth) return null;

  const expiresAt = auth.expires_at; // epoch ms we stored
  const now = Date.now();

  // Refresh if less than 60 s remaining
  if (expiresAt - now > 60_000) return auth.access_token;

  try {
    const res = await fetch(`${BASE_URL}${auth.refresh_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });

    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    const newAuth = {
      ...auth,
      access_token: data.access_token,
      refresh_token: data.refresh_token || auth.refresh_token,
      expires_at: Date.now() + (data.expires_in || 900) * 1000,
    };
    setAuth(newAuth);
    return newAuth.access_token;
  } catch {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper – attaches auth + API key headers
// ──────────────────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = await refreshIfNeeded();
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }

  const data = await res.json();

  setAuth({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    refresh_url: data.refresh_url || '/auth/refresh',
    expires_at: Date.now() + (data.expires_in || 900) * 1000,
    user: data.user || { email },
  });

  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Listings – fetch one page (offset-based)
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchListingsPage({ offset = 0, limit = 50, locality, bedroom, furnishing } = {}) {
  const params = new URLSearchParams({ offset, limit });
  if (locality) params.append('locality', locality);
  if (bedroom)  params.append('bedroom', bedroom);
  if (furnishing) params.append('furnishing', furnishing);

  return apiFetch(`/v1/listings?${params}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Single listing
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchListing(id) {
  return apiFetch(`/v1/listings/${id}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Rentals
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchRentalsPage({ offset = 0, limit = 50 } = {}) {
  return apiFetch(`/v1/rentals?offset=${offset}&limit=${limit}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchProjectsPage({ offset = 0, limit = 50 } = {}) {
  return apiFetch(`/v1/projects?offset=${offset}&limit=${limit}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Favourites
// ──────────────────────────────────────────────────────────────────────────────
export async function fetchFavourites() {
  return apiFetch('/v1/favourites');
}

export async function addFavourite(listing_id) {
  return apiFetch('/v1/favourites', {
    method: 'POST',
    body: JSON.stringify({ listing_id }),
  });
}

export async function removeFavourite(listing_id) {
  return apiFetch(`/v1/favourites/${listing_id}`, { method: 'DELETE' });
}

// ──────────────────────────────────────────────────────────────────────────────
// Price normaliser for projects (Crores / Lakhs → rupees)
// ──────────────────────────────────────────────────────────────────────────────
export function normaliseProjectPrice(val) {
  if (val === null || val === undefined) return 0;
  // < 20  → Crores;  >= 20 → Lakhs
  return val < 20 ? val * 1_00_00_000 : val * 1_00_000;
}

// ──────────────────────────────────────────────────────────────────────────────
// Area normaliser – values < 500 are likely sqm, convert to sqft
// ──────────────────────────────────────────────────────────────────────────────
export function normaliseSqft(val) {
  if (!val) return 0;
  return val < 500 ? Math.round(val * 10.764) : val;
}

// ──────────────────────────────────────────────────────────────────────────────
// Format helpers
// ──────────────────────────────────────────────────────────────────────────────
export function formatPrice(rupees) {
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  if (rupees >= 1_00_000)    return `₹${(rupees / 1_00_000).toFixed(1)} L`;
  return `₹${rupees.toLocaleString('en-IN')}`;
}
