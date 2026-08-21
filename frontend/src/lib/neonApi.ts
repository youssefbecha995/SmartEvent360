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
  active?: boolean;
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

// ─── PRESTATAIRES (Providers) ──────────────────────────────────────────────

export interface ProviderComposition {
  id: string;
  role: string;
  quantity: number;
  description: string | null;
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAvailability {
  id: string;
  date: string;
  status: 'DISPONIBLE' | 'RESERVEE' | 'INDISPONIBLE' | 'MAINTENANCE';
  notes: string | null;
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email?: string };
}

export interface ProviderGallery {
  id: string;
  imageUrl: string;
  caption: string | null;
  displayOrder: number;
  providerId: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  originalPrice: number | null;
  isAvailable: boolean;
  active: boolean;
  rating: number | null;
  reviewCount: number;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  displayOrder: number;
  metadata: any;
  serviceId: string;
  createdAt: string;
  updatedAt: string;
  service?: { id: string; name: string; icon: string | null };
  composition?: ProviderComposition[];
  availability?: ProviderAvailability[];
  reviews?: ProviderReview[];
  gallery?: ProviderGallery[];
  _count?: { composition: number; packServices: number; reviews?: number };
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export interface ServiceType {
  id: string; name: string; slug: string; icon: string | null; color: string | null;
  active: boolean; displayOrder: number;
  _count?: { services: number };
}

export interface ServiceItem {
  id: string; name: string; code: string | null; description: string | null;
  shortDescription: string | null; icon: string | null; image: string | null;
  basePrice: number; priceMin: number | null; priceMax: number | null;
  priceType: string; active: boolean; featured: boolean; displayOrder: number;
  visibleOnStore: boolean; visibleForClients: boolean;
  minAdvanceDays: number; minDuration: number | null; availabilityMode: string;
  translations: any; createdAt: string; updatedAt: string;
  typeId: string | null;
  type?: ServiceType;
  resources?: any[];
  parameters?: any[];
  packServices?: any[];
  providers?: Provider[]; // NOUVEAU : Liste des prestataires associés
  _count?: { resources: number; parameters: number; packServices: number; providers: number };
}

export interface ServiceParameter {
  id: string; name: string; type: string; options: any; defaultValue: any;
  required: boolean; displayOrder: number; group: string | null;
  description: string | null; serviceId: string;
}

export interface ServiceResource {
  country: string;
  id: string; name: string; description: string | null; image: string | null;
  basePrice: number | null; capacity: number | null;
  location: string | null; city: string | null;
  availability: string; active: boolean; displayOrder: number; metadata: any;
  serviceId: string;
}

export interface FavoriteService {
  id: string; createdAt: string; serviceId: string;
  service: ServiceItem;
}

export interface ServiceStats {
  total: number; active: number; featured: number;
  withResources: number; withPacks: number; withProviders: number;
  popularServices: { id: string; name: string; icon: string | null; packCount: number; resourceCount: number; favoriteCount: number }[];
}

// ─── PACKS ────────────────────────────────────────────────────────────────────

export interface NeonPackService {
  id: string;
  quantity: number;
  duration: number | null;
  status: string;
  config: any;
  displayOrder: number;
  priceOverride: number | null;
  packId: string;
  serviceId: string;
  resourceId: string | null;
  providerId: string | null; // NOUVEAU : Prestataire choisi pour ce service
  service: {
    id: string;
    name: string;
    icon: string | null;
    image?: string | null;
    parameters?: any[];
    resources?: any[];
  };
  resource: { id: string; name: string } | null;
  provider: Provider | null; // NOUVEAU : Prestataire avec tous ses détails
}

export interface NeonPack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  pricePerPerson: number | null;
  depositPercent: number | null;
  cancellationFee: number | null;
  duration: number;
  maxGuests: number;
  minGuests: number;
  badge: string | null;
  imageUrl: string | null;
  images: string[] | null;
  videoUrl: string | null;
  features: string[] | null;
  category: string | null;
  isPopular: boolean;
  isActive: boolean;
  isCustomizable: boolean;
  status: string;
  eventType: string | null;
  promoCode: string | null;
  negotiable: boolean;
  isCombo: boolean;
  isSeasonalPromo: boolean;
  promoStartDate: string | null;
  promoEndDate: string | null;
  visibleOnStore: boolean;
  visibleForClients: boolean;
  createdAt: string;
  updatedAt: string;
  packServices?: NeonPackService[];
  _count?: { packServices: number };
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
  adminList: () => request<NeonPack[]>('/packs/admin'),
  get:    (id: string) => request<NeonPack>(`/packs/${id}`),
  create: (body: Record<string, unknown>) => request<NeonPack>('/packs', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) => request<NeonPack>(`/packs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/packs/${id}`, { method: 'DELETE' }),
  addService: (packId: string, body: Record<string, unknown>) => {
    // body peut contenir : serviceId, providerId, quantity, duration, status, priceOverride, config
    return request<NeonPackService>(`/packs/${packId}/services`, { 
      method: 'PATCH', 
      body: JSON.stringify({ action: 'add', ...body }) 
    });
  },
  removeService: (packId: string, serviceId: string) =>
    request<void>(`/packs/${packId}/services`, { method: 'PATCH', body: JSON.stringify({ action: 'remove', serviceId }) }),
  calculatePrice: (packId: string, discountPercent?: number) =>
    request<{ totalServices: number; discountPercent: number; discountAmount: number; finalPrice: number; breakdown: any[] }>(
      `/packs/${packId}/calculate-price`,
      { method: 'POST', body: JSON.stringify({ discountPercent }) },
    ),
};

// ─── PRESTATAIRES (Providers) API ────────────────────────────────────────────

export const providersApi = {
  // Liste des prestataires
  list: (p?: { serviceId?: string; city?: string; active?: string; search?: string; available?: string }) => {
    const qs = new URLSearchParams();
    if (p?.serviceId) qs.set('serviceId', p.serviceId);
    if (p?.city) qs.set('city', p.city);
    if (p?.active) qs.set('active', p.active);
    if (p?.available) qs.set('available', p.available);
    if (p?.search) qs.set('search', p.search);
    return request<Provider[]>(`/providers?${qs}`);
  },
  
  // Liste publique (uniquement disponibles)
  publicList: (p?: { serviceId?: string; city?: string }) => {
    const qs = new URLSearchParams();
    if (p?.serviceId) qs.set('serviceId', p.serviceId);
    if (p?.city) qs.set('city', p.city);
    return request<Provider[]>(`/providers/public?${qs}`);
  },
  
  // Récupérer un prestataire
  get: (id: string) => request<Provider>(`/providers/${id}`),
  
  // CRUD
  create: (body: Partial<Provider> & { composition?: Partial<ProviderComposition>[] }) =>
    request<Provider>('/providers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Provider>) =>
    request<Provider>(`/providers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/providers/${id}`, { method: 'DELETE' }),
  
  // Toggle disponibilité
  toggleStatus: (id: string) => request<Provider>(`/providers/${id}/status`, { method: 'PATCH' }),
  
  // ── Composition ──
  getCompositions: (providerId: string) => request<ProviderComposition[]>(`/providers/${providerId}/composition`),
  addComposition: (providerId: string, body: { role: string; quantity?: number; description?: string }) =>
    request<ProviderComposition>(`/providers/${providerId}/composition`, { method: 'POST', body: JSON.stringify(body) }),
  updateComposition: (memberId: string, body: { role?: string; quantity?: number; description?: string }) =>
    request<ProviderComposition>(`/providers/composition/${memberId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteComposition: (memberId: string) => request<void>(`/providers/composition/${memberId}`, { method: 'DELETE' }),
  
  // ── Disponibilité ──
  getAvailability: (providerId: string, start?: string, end?: string) => {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return request<ProviderAvailability[]>(`/providers/${providerId}/availability?${qs}`);
  },
  setAvailability: (providerId: string, body: { date: string; status: string; notes?: string }) =>
    request<ProviderAvailability>(`/providers/${providerId}/availability`, { method: 'POST', body: JSON.stringify(body) }),
  bulkAvailability: (providerId: string, body: { dates: string[]; status: string }) =>
    request<ProviderAvailability[]>(`/providers/${providerId}/availability/bulk`, { method: 'POST', body: JSON.stringify(body) }),
  checkAvailability: (providerId: string, date: string) =>
    request<{ available: boolean; status: string; message?: string }>(`/providers/${providerId}/check-availability?date=${date}`),
  
  // ── Reviews ──
  getReviews: (providerId: string) => request<ProviderReview[]>(`/providers/${providerId}/reviews`),
  addReview: (providerId: string, body: { rating: number; comment?: string }) =>
    request<ProviderReview>(`/providers/${providerId}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
  deleteReview: (reviewId: string) => request<void>(`/providers/reviews/${reviewId}`, { method: 'DELETE' }),
  
  // ── Gallery ──
  getGallery: (providerId: string) => request<ProviderGallery[]>(`/providers/${providerId}/gallery`),
  addGalleryPhoto: (providerId: string, body: { imageUrl: string; caption?: string; displayOrder?: number }) =>
    request<ProviderGallery>(`/providers/${providerId}/gallery`, { method: 'POST', body: JSON.stringify(body) }),
  deleteGalleryPhoto: (photoId: string) => request<void>(`/providers/gallery/${photoId}`, { method: 'DELETE' }),
  
  // ── Stats ──
  stats: () => request<{ total: number; active: number; withComposition: number; inPacks: number }>('/providers/admin/stats'),
};

// ─── Services API ────────────────────────────────────────────────────────────

export const servicesApi = {
  // ── Types ──
  types: () => request<ServiceType[]>('/services/types'),
  createType: (body: { name: string; icon?: string; color?: string; displayOrder?: number }) =>
    request<ServiceType>('/services/types', { method: 'POST', body: JSON.stringify(body) }),
  updateType: (id: string, body: Partial<ServiceType>) =>
    request<ServiceType>(`/services/types/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteType: (id: string) => request<void>(`/services/types/${id}`, { method: 'DELETE' }),

  // ── Admin CRUD ──
  list: (p?: { page?: number; limit?: number; search?: string; typeId?: string; active?: string; featured?: string }) => {
    const qs = new URLSearchParams();
    if (p?.page) qs.set('page', String(p.page));
    if (p?.limit) qs.set('limit', String(p.limit));
    if (p?.search) qs.set('search', p.search);
    if (p?.typeId) qs.set('typeId', p.typeId);
    if (p?.active) qs.set('active', p.active);
    if (p?.featured) qs.set('featured', p.featured);
    return request<{ data: ServiceItem[]; total: number; page: number; limit: number }>(`/services?${qs}`);
  },
  get: (id: string) => request<ServiceItem>(`/services/${id}`),
  create: (body: Partial<ServiceItem>) => request<ServiceItem>('/services', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ServiceItem>) => request<ServiceItem>(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/services/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => request<ServiceItem>(`/services/${id}/status`, { method: 'PATCH' }),
  toggleFeatured: (id: string) => request<ServiceItem>(`/services/${id}/featured`, { method: 'PATCH' }),

  // ── Parameters ──
  getParameters: (serviceId: string) => request<ServiceParameter[]>(`/services/${serviceId}/parameters`),
  createParameter: (serviceId: string, body: Partial<ServiceParameter>) =>
    request<ServiceParameter>(`/services/${serviceId}/parameters`, { method: 'POST', body: JSON.stringify(body) }),
  updateParameter: (id: string, body: Partial<ServiceParameter>) =>
    request<ServiceParameter>(`/services/service-parameters/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteParameter: (id: string) => request<void>(`/services/service-parameters/${id}`, { method: 'DELETE' }),

  // ── Resources ──
  getResources: (serviceId: string) => request<ServiceResource[]>(`/services/${serviceId}/resources`),
  createResource: (serviceId: string, body: Partial<ServiceResource>) =>
    request<ServiceResource>(`/services/${serviceId}/resources`, { method: 'POST', body: JSON.stringify(body) }),
  updateResource: (id: string, body: Partial<ServiceResource>) =>
    request<ServiceResource>(`/services/service-resources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteResource: (id: string) => request<void>(`/services/service-resources/${id}`, { method: 'DELETE' }),

  // ── Prestataires associés au service ──
  getProviders: (serviceId: string) => request<Provider[]>(`/services/${serviceId}/providers`),
  addProvider: (serviceId: string, providerId: string) =>
    request<{ success: boolean }>(`/services/${serviceId}/providers/${providerId}`, { method: 'POST' }),
  removeProvider: (serviceId: string, providerId: string) =>
    request<void>(`/services/${serviceId}/providers/${providerId}`, { method: 'DELETE' }),

  // ── Public ──
  publicCategories: () => request<ServiceType[]>('/services/public/categories'),
  publicList: (p?: { typeId?: string; featured?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (p?.typeId) qs.set('typeId', p.typeId);
    if (p?.featured) qs.set('featured', p.featured);
    if (p?.search) qs.set('search', p.search);
    return request<ServiceItem[]>(`/services/public?${qs}`);
  },
  publicGet: (id: string) => request<ServiceItem>(`/services/public/${id}`),

  // ── Client ──
  clientList: (p?: { typeId?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (p?.typeId) qs.set('typeId', p.typeId);
    if (p?.search) qs.set('search', p.search);
    return request<ServiceItem[]>(`/services/client/list?${qs}`);
  },
  clientGet: (id: string) => request<ServiceItem & { isFavorited: boolean }>(`/services/client/${id}`),
  clientAvailability: (id: string, date: string) =>
    request<{ available: boolean; availableCount: number; totalCount: number; resources: any[] }>(`/services/client/${id}/availability?date=${date}`),
  clientQuoteRequest: (id: string, body: Record<string, unknown>) =>
    request<any>(`/services/client/${id}/quote-request`, { method: 'POST', body: JSON.stringify(body) }),
  clientEstimate: (id: string, body: Record<string, unknown>) =>
    request<{ total: number; currency: string; breakdown: { label: string; amount: number }[]; disclaimer: string }>(`/services/client/${id}/estimate`, { method: 'POST', body: JSON.stringify(body) }),

  // ── Favorites ──
  favorites: () => request<FavoriteService[]>('/services/favorites'),
  addFavorite: (serviceId: string) =>
    request<any>(`/services/favorites/${serviceId}`, { method: 'POST' }),
  removeFavorite: (serviceId: string) =>
    request<void>(`/services/favorites/${serviceId}`, { method: 'DELETE' }),

  // ── Admin Stats ──
  stats: () => request<ServiceStats>('/services/admin/stats'),
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
