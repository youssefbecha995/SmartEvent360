/**
 * crmApi.ts — Accès aux données CRM (équipement, personnel, maintenance, ...)
 * via le backend Express / Neon DB. Ces données sont stockées dans la table
 * `crm_records` (colonne JSON), car Supabase refuse les écritures (permission denied).
 */

import { request } from './neonApi';

export const crmApi = {
  list: (kind: string) => request<Record<string, any>[]>(`/crm/${kind}`),
  get:  (kind: string, id: string) => request<Record<string, any>>(`/crm/${kind}/${id}`),
  create: (kind: string, body: Record<string, any>) =>
    request<Record<string, any>>(`/crm/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (kind: string, id: string, body: Record<string, any>) =>
    request<Record<string, any>>(`/crm/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (kind: string, id: string) =>
    request<void>(`/crm/${kind}/${id}`, { method: 'DELETE' }),
};
