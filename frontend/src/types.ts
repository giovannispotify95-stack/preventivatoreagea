// ── Tipi TypeScript per il Preventivatore ──────────────────────────

export interface ComuneResult {
  comune_istat: string;
  comune_nome: string;
  provincia: string;
  comune_ciag?: string;
}

export interface ColturaResult {
  codice_ciag: string;
  codice_ania?: string;
  descrizione: string;
  varieta?: string;
  prezzo_ismea?: number;
  prezzo_max?: number;
  prezzo_med?: number;
  prezzo_min?: number;
}

export interface PreventivoRequest {
  comune_istat: string;
  coltura_codice: string;
  superficie_ha: number;
  quintali_ha: number;
  prezzo_unitario: number;
  regime: 'agevolato' | 'non_agevolato';
  garanzie: string[];
  franchigie: Record<string, number>;
  tipo_tariffa_rm?: 'normale' | 'sconti';
  note?: string;
}

export interface DettaglioGaranzia {
  garanzia: string;
  garanzia_label: string;
  tipo: string;
  franchigia: number;
  tasso_agevolato: number;
  tasso_non_agevolato: number;
  premio_agevolato: number;
  premio_non_agevolato: number;
  subtotale: number;
}

export interface PreventivoCompagnia {
  compagnia: string;
  disponibile: boolean;
  messaggio?: string;
  dettaglio_garanzie: DettaglioGaranzia[];
  totale_agevolato: number;
  totale_non_agevolato: number;
  premio_lordo: number;
  perc_agea: number;
  contributo_agea_eur: number;
  imposta_premi_perc: number;
  imposta_premi_eur: number;
  consorzio_perc: number;
  contributo_consorzio: number;
  premio_netto: number;
}

export interface PreventivoResponse {
  comune_istat: string;
  comune_nome: string;
  provincia: string;
  coltura_codice: string;
  coltura_descrizione: string;
  superficie_ha: number;
  quintali_ha: number;
  prezzo_unitario: number;
  capitale: number;
  regime: string;
  garanzie_selezionate: string[];
  contributo_agea_perc: number;
  compagnie: PreventivoCompagnia[];
  migliore?: string;
  preventivo_id?: number;
}

// ── Costanti Garanzie ────────────────────────────────────────────────

export const GARANZIE_FREQUENZIALI = [
  { id: 'grandine', label: 'Grandine', obbligatoria: true },
  { id: 'vento_forte', label: 'Vento Forte', obbligatoria: false },
  { id: 'eccesso_pioggia', label: 'Eccesso di Pioggia', obbligatoria: false },
] as const;

export const GARANZIE_CATASTROFALI = [
  { id: 'gelo_brina', label: 'Gelo / Brina' },
  { id: 'siccita', label: 'Siccità' },
  { id: 'alluvione', label: 'Alluvione' },
  { id: 'eccesso_neve', label: 'Eccesso di Neve' },
  { id: 'colpo_sole_vento_caldo', label: 'Colpo di Sole / Vento Caldo' },
  { id: 'sbalzo_termico', label: 'Sbalzo Termico / Ondata di Calore' },
] as const;

export const FRANCHIGIE_DISPONIBILI = [10, 15, 20, 30] as const;

export type Regime = 'agevolato' | 'non_agevolato';

export const GARANZIE_LABELS: Record<string, string> = {
  grandine: 'Grandine',
  vento_forte: 'Vento Forte',
  eccesso_pioggia: 'Eccesso di Pioggia',
  gelo_brina: 'Gelo / Brina',
  siccita: 'Siccità',
  alluvione: 'Alluvione',
  eccesso_neve: 'Eccesso di Neve',
  colpo_sole_vento_caldo: 'Colpo di Sole / Vento Caldo',
  sbalzo_termico: 'Sbalzo Termico / Ondata di Calore',
};
