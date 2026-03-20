import React from 'react';
import type { PreventivoResponse, PreventivoCompagnia } from '../types';
import { formatEuro, formatPerc, labelCompagnia, colorCompagnia } from '../utils/format';

interface Props {
  readonly risultato: PreventivoResponse;
}

export default function TabellaComparativa({ risultato }: Props) {
  const { compagnie, migliore } = risultato;
  const compagnieDisponibili = compagnie.filter((c) => c.disponibile);

  if (compagnieDisponibili.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">
          Nessuna compagnia ha tariffe disponibili per la combinazione selezionata.
        </p>
      </div>
    );
  }

  // Prendi tutte le garanzie dalla prima compagnia disponibile come riferimento
  const garanzieRef = compagnieDisponibili[0]?.dettaglio_garanzie || [];

  return (
    <div className="overflow-x-auto">
      {/* Header riepilogo */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-t-xl p-5">
        <h2 className="text-xl font-bold mb-2">Preventivo Comparativo</h2>
        <div className="flex flex-wrap gap-4 text-sm opacity-90">
          <span>Coltura: <strong>{risultato.coltura_descrizione || risultato.coltura_codice}</strong></span>
          <span>Comune: <strong>{risultato.comune_nome}</strong></span>
          <span>Superficie: <strong>{risultato.superficie_ha} Ha</strong></span>
          <span>Regime: <strong>{risultato.regime === 'agevolato' ? 'Agevolato' : 'Non Agevolato'}</strong></span>
          <span>Valore Assicurato: <strong>{formatEuro(risultato.capitale)}</strong></span>
          <span>
            Garanzie:{' '}
            {risultato.garanzie_selezionate.map((g) => (
              <span key={g} className="inline-block bg-white/20 rounded px-1.5 py-0.5 mx-0.5 text-xs">
                {g.toUpperCase().replace(/_/g, ' ')}
              </span>
            ))}
          </span>
        </div>
        <div className="mt-2 text-sm">
          Contributo AGEA: <strong>{risultato.contributo_agea_perc}%</strong>
        </div>
      </div>

      {/* Tabella */}
      <table className="w-full border-collapse bg-white shadow-lg rounded-b-xl overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b-2 border-gray-200 w-1/4">
              Voce
            </th>
            {compagnieDisponibili.map((c) => (
              <th
                key={c.compagnia}
                className="text-right py-3 px-4 font-bold border-b-2 border-gray-200"
                style={{ color: colorCompagnia(c.compagnia) }}
              >
                {labelCompagnia(c.compagnia)}
                {c.compagnia === migliore && (
                  <span className="block text-xs text-green-600 font-medium">PIU CONVENIENTE</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Dettaglio per garanzia */}
          {garanzieRef.map((garRef, idx) => (
            <React.Fragment key={garRef.garanzia}>
              {/* Nome garanzia */}
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={compagnieDisponibili.length + 1} className="py-2 px-4">
                  <span className="font-semibold text-gray-800">
                    {garRef.garanzia_label}
                  </span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    garRef.tipo === 'frequenziale'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {garRef.tipo === 'frequenziale' ? 'FR' : 'CAT'}
                  </span>
                </td>
              </tr>
              {/* Agevolato */}
              <tr className="hover:bg-blue-50/30">
                <td className="py-1.5 px-4 pl-8 text-sm text-gray-600">└ Agevolato</td>
                {compagnieDisponibili.map((c) => {
                  const det = c.dettaglio_garanzie.find((d) => d.garanzia === garRef.garanzia);
                  return (
                    <td key={c.compagnia} className="text-right py-1.5 px-4 text-sm font-mono">
                      {det ? formatEuro(det.premio_agevolato) : '—'}
                    </td>
                  );
                })}
              </tr>
              {/* Non Agevolato */}
              <tr className="hover:bg-blue-50/30">
                <td className="py-1.5 px-4 pl-8 text-sm text-gray-600">└ Non Agevolato</td>
                {compagnieDisponibili.map((c) => {
                  const det = c.dettaglio_garanzie.find((d) => d.garanzia === garRef.garanzia);
                  return (
                    <td key={c.compagnia} className="text-right py-1.5 px-4 text-sm font-mono">
                      {det ? formatEuro(det.premio_non_agevolato) : '—'}
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>
          ))}

          {/* Separatore */}
          <tr>
            <td colSpan={compagnieDisponibili.length + 1} className="border-t-2 border-gray-300"></td>
          </tr>

          {/* Premio Lordo */}
          <tr className="bg-gray-50 font-semibold">
            <td className="py-3 px-4 text-gray-800">Premio Lordo</td>
            {compagnieDisponibili.map((c) => (
              <td key={c.compagnia} className="text-right py-3 px-4 font-mono">
                {formatEuro(c.premio_lordo)}
              </td>
            ))}
          </tr>

          {/* Contributo AGEA */}
          <tr className="text-green-700">
            <td className="py-2 px-4 text-sm">
              − Contributo AGEA ({formatPerc(risultato.contributo_agea_perc)})
            </td>
            {compagnieDisponibili.map((c) => (
              <td key={c.compagnia} className="text-right py-2 px-4 text-sm font-mono">
                − {formatEuro(c.contributo_agea_eur)}
              </td>
            ))}
          </tr>

          {/* Imposta Premi */}
          <tr className="text-red-600">
            <td className="py-2 px-4 text-sm">
              + Imposta Premi ({formatPerc(compagnieDisponibili[0].imposta_premi_perc)})
            </td>
            {compagnieDisponibili.map((c) => (
              <td key={c.compagnia} className="text-right py-2 px-4 text-sm font-mono">
                + {formatEuro(c.imposta_premi_eur)}
              </td>
            ))}
          </tr>

          {/* Contributo Consorzio */}
          <tr className="text-orange-600">
            <td className="py-2 px-4 text-sm">
              + Consorzio Difesa ({formatPerc(compagnieDisponibili[0].consorzio_perc)})
            </td>
            {compagnieDisponibili.map((c) => (
              <td key={c.compagnia} className="text-right py-2 px-4 text-sm font-mono">
                + {formatEuro(c.contributo_consorzio)}
              </td>
            ))}
          </tr>

          {/* Separatore finale */}
          <tr>
            <td colSpan={compagnieDisponibili.length + 1} className="border-t-2 border-gray-400"></td>
          </tr>

          {/* PREMIO NETTO FINALE */}
          <tr className="bg-gradient-to-r from-blue-50 to-green-50 font-bold text-lg">
            <td className="py-4 px-4 text-gray-900">
              PREMIO NETTO FINALE
              <br />
              <span className="text-xs font-normal text-gray-500">(a carico dell'agricoltore)</span>
            </td>
            {compagnieDisponibili.map((c) => (
              <td
                key={c.compagnia}
                className={`text-right py-4 px-4 font-mono ${
                  c.compagnia === migliore ? 'text-green-700' : 'text-gray-900'
                }`}
              >
                {formatEuro(c.premio_netto)}
                {c.compagnia === migliore && (
                  <span className="block text-xs text-green-600 mt-1">MIGLIORE</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Note a piè di tabella */}
      <div className="mt-3 text-xs text-gray-500 space-y-1 px-2">
        <p>Imposta calcolata sul Premio Lordo</p>
        <p>Consorzio calcolato sul Valore Assicurato ({formatEuro(risultato.capitale)})</p>
        <p>Contributo Consorzio uguale per tutte le compagnie</p>
      </div>
    </div>
  );
}
