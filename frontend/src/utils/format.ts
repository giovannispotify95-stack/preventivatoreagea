/**
 * Utility di formattazione per valori italiani.
 */

/** Formatta un numero come valuta € italiana */
export function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/** Formatta un numero come percentuale italiana */
export function formatPerc(val: number): string {
  return `${val.toFixed(1).replace('.', ',')}%`;
}

/** Formatta un numero con separatore italiano */
export function formatNum(val: number, decimals = 2): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/** Restituisce il colore CSS associato a una compagnia */
export function colorCompagnia(compagnia: string): string {
  switch (compagnia) {
    case 'Generali':
      return '#c8102e';
    case 'REVO':
      return '#1e40af';
    case 'RealeMutua':
      return '#065f46';
    default:
      return '#6b7280';
  }
}

/** Label breve della compagnia */
export function labelCompagnia(compagnia: string): string {
  switch (compagnia) {
    case 'RealeMutua':
      return 'Reale Mutua';
    default:
      return compagnia;
  }
}
