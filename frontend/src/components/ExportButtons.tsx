import React from 'react';
import type { PreventivoResponse } from '../types';
import { formatEuro } from '../utils/format';

interface Props {
  readonly risultato: PreventivoResponse;
}

export default function ExportButtons({ risultato }: Props) {

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Preventivo Comparativo - Polizze Agro-Meteorologiche', 14, 20);

    doc.setFontSize(10);
    doc.text(`Coltura: ${risultato.coltura_descrizione || risultato.coltura_codice}`, 14, 30);
    doc.text(`Comune: ${risultato.comune_nome} (${risultato.provincia})`, 14, 36);
    doc.text(`Superficie: ${risultato.superficie_ha} Ha`, 14, 42);
    doc.text(`Valore Assicurato: ${formatEuro(risultato.capitale)}`, 14, 48);
    doc.text(`Regime: ${risultato.regime === 'agevolato' ? 'Agevolato' : 'Non Agevolato'}`, 14, 54);
    doc.text(`Contributo AGEA: ${risultato.contributo_agea_perc}%`, 14, 60);

    const compDisp = risultato.compagnie.filter(c => c.disponibile);
    const headers = ['Voce', ...compDisp.map(c => c.compagnia)];

    const garanzieRef = compDisp[0]?.dettaglio_garanzie || [];
    const rows: string[][] = [];

    for (const g of garanzieRef) {
      rows.push([
        `${g.garanzia_label} - Agev.`,
        ...compDisp.map(c => {
          const det = c.dettaglio_garanzie.find(d => d.garanzia === g.garanzia);
          return det ? formatEuro(det.premio_agevolato) : '—';
        }),
      ]);
      rows.push([
        `${g.garanzia_label} - Non Agev.`,
        ...compDisp.map(c => {
          const det = c.dettaglio_garanzie.find(d => d.garanzia === g.garanzia);
          return det ? formatEuro(det.premio_non_agevolato) : '—';
        }),
      ]);
    }

    rows.push(['Premio Lordo', ...compDisp.map(c => formatEuro(c.premio_lordo))]);
    rows.push([`- AGEA (${risultato.contributo_agea_perc}%)`, ...compDisp.map(c => `- ${formatEuro(c.contributo_agea_eur)}`)]);
    rows.push([`+ Imposta (2,5%)`, ...compDisp.map(c => `+ ${formatEuro(c.imposta_premi_eur)}`)]);
    rows.push([`+ Consorzio (0,4%)`, ...compDisp.map(c => `+ ${formatEuro(c.contributo_consorzio)}`)]);
    rows.push(['PREMIO NETTO', ...compDisp.map(c => formatEuro(c.premio_netto))]);

    autoTable(doc, {
      startY: 68,
      head: [headers],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`preventivo_${risultato.comune_nome}_${risultato.coltura_descrizione || 'coltura'}.pdf`);
  }

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const compDisp = risultato.compagnie.filter(c => c.disponibile);
    const garanzieRef = compDisp[0]?.dettaglio_garanzie || [];

    const data: Record<string, string | number>[] = [];

    for (const g of garanzieRef) {
      const rowAgev: Record<string, string | number> = { Voce: `${g.garanzia_label} - Agevolato` };
      const rowNon: Record<string, string | number> = { Voce: `${g.garanzia_label} - Non Agevolato` };
      for (const c of compDisp) {
        const det = c.dettaglio_garanzie.find(d => d.garanzia === g.garanzia);
        rowAgev[c.compagnia] = det?.premio_agevolato ?? 0;
        rowNon[c.compagnia] = det?.premio_non_agevolato ?? 0;
      }
      data.push(rowAgev, rowNon);
    }

    const rowLordo: Record<string, string | number> = { Voce: 'Premio Lordo' };
    const rowAgea: Record<string, string | number> = { Voce: `Contributo AGEA (${risultato.contributo_agea_perc}%)` };
    const rowImposta: Record<string, string | number> = { Voce: 'Imposta Premi (2,5%)' };
    const rowConsorzio: Record<string, string | number> = { Voce: 'Consorzio Difesa (0,4%)' };
    const rowNetto: Record<string, string | number> = { Voce: 'PREMIO NETTO FINALE' };

    for (const c of compDisp) {
      rowLordo[c.compagnia] = c.premio_lordo;
      rowAgea[c.compagnia] = -c.contributo_agea_eur;
      rowImposta[c.compagnia] = c.imposta_premi_eur;
      rowConsorzio[c.compagnia] = c.contributo_consorzio;
      rowNetto[c.compagnia] = c.premio_netto;
    }

    data.push(rowLordo, rowAgea, rowImposta, rowConsorzio, rowNetto);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Preventivo');
    XLSX.writeFile(wb, `preventivo_${risultato.comune_nome}.xlsx`);
  }

  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={exportPDF}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        📄 Esporta PDF
      </button>
      <button
        onClick={exportExcel}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
      >
        📊 Esporta Excel
      </button>
    </div>
  );
}
