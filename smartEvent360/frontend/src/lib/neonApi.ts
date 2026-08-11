/**
 * neonApi.ts — Client HTTP vers le backend Express / Neon DB
 * Base URL : http://localhost:3001/api
 *
 * Toutes les pages Admin et les pages Client (devis, paiements) l'utilisent.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function token() {
  return localStorage.getItem('se360-token') || localStorage.getItem('token') || '';
}

function clearSessionAndRedirect() {
  localStorage.removeItem('se360-token');
  localStorage.removeItem('se360-user');
  localStorage.removeItem('se360-profile');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/connexion-admin')) {
    window.location.href = '/connexion-admin';
  }
}

function headers(json = true): HeadersInit {
  const h: HeadersInit = { Authorization: `Bearer ${token()}` };
  if (json) (h as Record<string, string>)['Content-Type'] = 'application/json';
  return h;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) } as HeadersInit,
  });
  if (res.status === 401) {
    clearSessionAndRedirect();
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ─── Types communs ────────────────────────────────────────────────────────────

export interface NeonUser {
  id: string; email: string; name: string; role: string; createdAt: string;
  nom: string | null; prenom: string | null;
  address: string | null; city: string | null; postalCode: string | null;
  profession: string | null;
  phone: string | null; phone2: string | null; email2: string | null;
  company: string | null; cin: string | null; matfisc: string | null;
  notes: string | null; clientType: string | null;
}

export interface NeonEvent {
  id: string; title: string; description: string | null; location: string;
  date: string; imageUrl: string | null; capacity: number; price: number;
  isPublished: boolean; organizerId: string; categoryId: string | null;
  clientId: string | null;
  createdAt: string; updatedAt: string;
  organizer?: { id: string; name: string };
  client?: { id: string; name: string; company: string | null } | null;
  category?: { id: string; name: string; slug: string; color: string | null } | null;
  _count?: { bookings: number };
}

export interface NeonBooking {
  id: string; status: string; qrCode: string | null; createdAt: string; updatedAt: string;
  userId: string; eventId: string;
  user?: { id: string; name: string; email: string };
  event?: { id: string; title: string; date: string; location: string; price: number };
}

export interface NeonPack {
  id: string; name: string; description: string | null; price: number;
  duration: number; maxGuests: number; badge: string | null;
  imageUrl: string | null;
  features: string[] | null;
  isPopular: boolean; isActive: boolean; createdAt: string; updatedAt: string;
}

export interface BookingStats {
  totals: { total: number; confirmed: number; pending: number; cancelled: number };
  topEvents: { id: string; title: string; date: string; location: string; bookingCount: number }[];
}

export interface NeonNotification {
  id: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  lien: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => request<NeonUser>('/auth/me'),
  updateMe: (body: Record<string, unknown>) =>
    request<NeonUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Events ───────────────────────────────────────────────────────────────────

export const eventsApi = {
  list: (p?: { page?: number; limit?: number; category?: string }) => {
    const qs = new URLSearchParams();
    if (p?.page)     qs.set('page',     String(p.page));
    if (p?.limit)    qs.set('limit',    String(p.limit));
    if (p?.category) qs.set('category', p.category);
    return request<{ data: NeonEvent[]; total: number; page: number; limit: number }>(
      `/events?${qs}`
    );
  },
  get:    (id: string) => request<NeonEvent>(`/events/${id}`),
  create: (body: Partial<NeonEvent>) => request<NeonEvent>('/events', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<NeonEvent>) => request<NeonEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/events/${id}`, { method: 'DELETE' }),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  list:   (p?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (p?.status) qs.set('status', p.status);
    if (p?.page)   qs.set('page',   String(p.page));
    qs.set('limit', String(p?.limit ?? 50));
    return request<{ data: NeonBooking[]; total: number }>(`/bookings?${qs}`);
  },
  stats:  () => request<BookingStats>('/bookings/stats'),
  create: (body: { userId: string; eventId: string; status?: string }) =>
    request<NeonBooking>('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  patch:  (id: string, status: string) => request<NeonBooking>(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: string) => request<void>(`/bookings/${id}`, { method: 'DELETE' }),
};

// ─── Packs ────────────────────────────────────────────────────────────────────

export const packsApi = {
  list:   () => request<NeonPack[]>('/packs'),
  get:    (id: string) => request<NeonPack>(`/packs/${id}`),
  create: (body: Partial<NeonPack>) => request<NeonPack>('/packs', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<NeonPack>) => request<NeonPack>(`/packs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/packs/${id}`, { method: 'DELETE' }),
};

// ─── Users (admin) ────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request<NeonUser[]>('/users'),
  get: (id: string) => request<NeonUser>(`/users/${id}`),
  create: (body: Record<string, unknown>) =>
    request<NeonUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    request<NeonUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ─── Uploads (enregistrements vocaux d'appels) ───────────────────────────────

export const uploadApi = {
  audio: async (blob: Blob): Promise<{ url: string }> => {
    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: blob,
    });
    if (res.status === 401) {
      clearSessionAndRedirect();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const fileUrl = data.url as string;
    return { url: `${BASE.replace(/\/api$/, '')}${fileUrl}` };
  },
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => request<{ status: string; db: string; timestamp: string }>('/health'),
};

// ─── Client (devis, paiements, événements, rendez-vous, contrats) ────────────

export const clientApi = {
  devis:      () => request<Record<string, any>[]>('/client/devis'),
  devisGet:   (id: string) => request<Record<string, any>>(`/client/devis/${id}`),
  acceptDevis: (id: string, signature_data: string) =>
    request<Record<string, any>>(`/client/devis/${id}/accept`, { method: 'POST', body: JSON.stringify({ signature_data }) }),
  refuseDevis: (id: string, reason: string) =>
    request<Record<string, any>>(`/client/devis/${id}/refuse`, { method: 'POST', body: JSON.stringify({ reason }) }),
  payments:   () => request<Record<string, any>[]>('/client/payments'),
  pay:        (id: string, methode: string) =>
    request<Record<string, any>>(`/client/payments/${id}/pay`, { method: 'POST', body: JSON.stringify({ methode }) }),
  events:       () => request<Record<string, any>[]>('/client/events'),
  eventsGet:    (id: string) => request<Record<string, any>>(`/client/events/${id}`),
  appointments:       () => request<Record<string, any>[]>('/client/appointments'),
  createAppointment:  (body: Record<string, unknown>) =>
    request<Record<string, any>>('/client/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment:  (id: string, body: Record<string, unknown>) =>
    request<Record<string, any>>(`/client/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  contracts:  () => request<Record<string, any>[]>('/client/contracts'),
  // ── Mes packs ──
  packs: () => request<Record<string, any>[]>('/client/packs'),
  packCheckAvailability: (packId: string, date: string) =>
    request<{ available: boolean; message?: string }>('/client/packs/check-availability', { method: 'POST', body: JSON.stringify({ packId, date }) }),
  addPack: (body: { packId: string; date: string; quantite?: number; notes?: string }) =>
    request<Record<string, any>>('/client/packs', { method: 'POST', body: JSON.stringify(body) }),
  cancelPack: (id: string) =>
    request<Record<string, any>>(`/client/packs/${id}`, { method: 'PATCH', body: JSON.stringify({ statut: 'annule' }) }),
  // ── Demande de devis depuis le site (client connecté) ──
  createQuote: (body: Record<string, unknown>) =>
    request<Record<string, any>>('/client/quotes', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Public (site vitrine : services, demandes de devis / contact / RDV) ─────

export const publicApi = {
  services: () => request<Record<string, any>[]>('/public/services'),
  submit:   (kind: 'quote_requests' | 'contact_messages' | 'appointment_requests', body: Record<string, unknown>) =>
    request<Record<string, any>>(`/public/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Notifications (cloche) ───────────────────────────────────────────────────

export const notificationsApi = {
  list:   (limit = 20) => request<{ data: NeonNotification[]; unread: number }>(`/notifications?limit=${limit}`),
  markRead: (id: string) => request<NeonNotification>(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
  readAll:  () => request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),
};
