// ── API Client ──────────────────────────────────────────────────────

import type {
  ComuneResult,
  ColturaResult,
  PreventivoRequest,
  PreventivoResponse,
} from './types';

const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || JSON.stringify(err));
  }
  return res.json();
}

// ── Ricerca ─────────────────────────────────────────────────────────

export async function cercaComuni(
  q: string,
  provincia?: string
): Promise<ComuneResult[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (provincia) params.set('provincia', provincia);
  params.set('limit', '1000');
  return fetchJSON<ComuneResult[]>(`${BASE_URL}/comuni?${params}`);
}

export async function listaProvince(): Promise<string[]> {
  return fetchJSON<string[]>(`${BASE_URL}/province`);
}

export async function cercaColture(q: string): Promise<ColturaResult[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', '2500');
  return fetchJSON<ColturaResult[]>(`${BASE_URL}/colture?${params}`);
}

export async function listaRaggruppamenti(): Promise<string[]> {
  return fetchJSON<string[]>(`${BASE_URL}/raggruppamenti`);
}

// ── Preventivo ──────────────────────────────────────────────────────

export async function calcolaPreventivo(
  req: PreventivoRequest
): Promise<PreventivoResponse> {
  return fetchJSON<PreventivoResponse>(`${BASE_URL}/calcola-preventivo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function listaPreventivi(
  limit = 50,
  offset = 0
): Promise<any[]> {
  return fetchJSON(`${BASE_URL}/preventivi-storico?limit=${limit}&offset=${offset}`);
}

export async function dettaglioPreventivo(id: number): Promise<any> {
  return fetchJSON(`${BASE_URL}/preventivo/${id}`);
}

// ── Upload ──────────────────────────────────────────────────────────

export async function uploadListino(
  compagnia: string,
  file: File,
  anno = 2026
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchJSON(
    `/api/admin/upload-listino?compagnia=${encodeURIComponent(compagnia)}&anno=${anno}`,
    { method: 'POST', body: formData }
  );
}

export async function uploadPrezzi(file: File, anno = 2026): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchJSON(`/api/admin/upload-prezzi?anno=${anno}`, {
    method: 'POST',
    body: formData,
  });
}
