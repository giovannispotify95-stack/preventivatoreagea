import React, { useState } from 'react';
import type { PreventivoResponse } from '../types';
import { formatEuro, formatPerc, labelCompagnia } from '../utils/format';

interface Props {
  readonly risultato: PreventivoResponse;
}

type RankConfig = {
  borderColor: string;
  headerGradient: string;
  nettoColor: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  label: string;
  ringColor: string;
  tableBorder: string;
  tableHead: string;
};

function getRankConfig(rank: number): RankConfig {
  if (rank === 0) {
    return {
      borderColor: 'border-green-400',
      headerGradient: 'from-green-600 to-green-700',
      nettoColor: 'text-green-700',
      bgLight: 'bg-green-50',
      badgeBg: 'bg-white/25',
      badgeText: 'text-white',
      ringColor: 'ring-green-300',
      tableBorder: 'border-green-200',
      tableHead: 'bg-green-100 text-green-800',
      icon: '🏆',
      label: 'PIÙ CONVENIENTE',
    };
  }
  if (rank === 1) {
    return {
      borderColor: 'border-orange-300',
      headerGradient: 'from-orange-500 to-orange-600',
      nettoColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
      badgeBg: 'bg-white/25',
      badgeText: 'text-white',
      ringColor: 'ring-orange-200',
      tableBorder: 'border-orange-200',
      tableHead: 'bg-orange-100 text-orange-800',
      icon: '⚖️',
      label: 'NELLA MEDIA',
    };
  }
  return {
    borderColor: 'border-red-300',
    headerGradient: 'from-red-600 to-red-700',
    nettoColor: 'text-red-700',
    bgLight: 'bg-red-50',
    badgeBg: 'bg-white/25',
    badgeText: 'text-white',
    ringColor: 'ring-red-200',
    tableBorder: 'border-red-200',
    tableHead: 'bg-red-100 text-red-800',
    icon: '💸',
    label: 'PIÙ CARO',
  };
}

export default function TabellaComparativa({ risultato }: Props) {
  const { compagnie } = risultato;
  const [detailOpen, setDetailOpen] = useState<Record<string, boolean>>({});

  const compagnieDisponibili = compagnie.filter((c) => c.disponibile);
  const compagnieNonDisponibili = compagnie.filter((c) => !c.disponibile);

  if (compagnieDisponibili.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">
          Nessuna compagnia ha tariffe disponibili per la combinazione selezionata.
        </p>
      </div>
    );
  }

  const sorted = [...compagnieDisponibili].sort((a, b) => a.premio_netto - b.premio_netto);

  const toggleDetail = (compagnia: string) =>
    setDetailOpen((prev) => ({ ...prev, [compagnia]: !prev[compagnia] }));

  // Produzione totale e prezzo unitario
  const prodTotale = risultato.superficie_ha * (risultato.quintali_ha ?? 0);

  return (
    <div className="space-y-6">

      {/* ── Header riepilogo ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-xl p-5">
        <h2 className="text-xl font-bold mb-3">Preventivo Comparativo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Coltura</span>
            <p className="font-semibold">{risultato.coltura_descrizione || risultato.coltura_codice}</p>
          </div>
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Comune</span>
            <p className="font-semibold">{risultato.comune_nome} ({risultato.provincia})</p>
          </div>
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Regime</span>
            <p className="font-semibold">{risultato.regime === 'agevolato' ? 'Agevolato' : 'Non Agevolato'}</p>
          </div>
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Superficie</span>
            <p className="font-semibold">{risultato.superficie_ha} Ha</p>
          </div>
          {risultato.quintali_ha != null && (
            <div>
              <span className="opacity-60 text-xs uppercase tracking-wide">Resa</span>
              <p className="font-semibold">{risultato.quintali_ha} q/Ha
                {prodTotale > 0 && (
                  <span className="ml-1 opacity-70 font-normal text-xs">
                    ({prodTotale.toFixed(0)} q tot.)
                  </span>
                )}
              </p>
            </div>
          )}
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Prezzo unitario</span>
            <p className="font-semibold">{risultato.prezzo_unitario.toFixed(2)} €/q</p>
          </div>
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Valore Assicurato</span>
            <p className="font-bold text-base text-yellow-300">{formatEuro(risultato.capitale)}</p>
          </div>
          <div>
            <span className="opacity-60 text-xs uppercase tracking-wide">Contributo AGEA</span>
            <p className="font-bold text-base text-green-300">{risultato.contributo_agea_perc}%</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <span className="text-xs opacity-60 uppercase tracking-wide">Garanzie:</span>
          {risultato.garanzie_selezionate.map((g) => (
            <span key={g} className="inline-block bg-white/20 rounded px-1.5 py-0.5 text-xs font-medium">
              {g.toUpperCase().split('_').join(' ')}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3 Card compagnie ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sorted.map((c, index) => {
          const cfg = getRankConfig(index);
          const isOpen = detailOpen[c.compagnia] ?? true; // default aperto

          return (
            <div
              key={c.compagnia}
              className={`rounded-2xl border-2 ${cfg.borderColor} shadow-lg ring-1 ${cfg.ringColor} overflow-hidden flex flex-col`}
            >
              {/* Header card */}
              <div className={`bg-gradient-to-br ${cfg.headerGradient} text-white p-4`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-extrabold tracking-tight leading-none">
                    {labelCompagnia(c.compagnia)}
                  </span>
                  <span className="text-3xl leading-none">{cfg.icon}</span>
                </div>
                <span className={`inline-block text-xs font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText} mt-1`}>
                  {cfg.label}
                </span>
              </div>

              {/* Premio Netto in evidenza */}
              <div className={`px-4 pt-4 pb-3 border-b border-gray-100 ${cfg.bgLight}`}>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-0.5">
                  Premio Netto (a carico agricoltore)
                </p>
                <p className={`text-3xl font-extrabold font-mono ${cfg.nettoColor}`}>
                  {formatEuro(c.premio_netto)}
                </p>
              </div>

              {/* ── Tabella garanzie con TUTTI i dati ─────────────── */}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => toggleDetail(c.compagnia)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide border-b border-gray-100 ${cfg.tableHead} transition-colors`}
                >
                  <span>Tassi &amp; Premi per Garanzia</span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={`${cfg.tableHead} border-b ${cfg.tableBorder}`}>
                          <th className="text-left px-3 py-2 font-semibold">Garanzia</th>
                          <th className="text-center px-2 py-2 font-semibold whitespace-nowrap">Tipo</th>
                          <th className="text-center px-2 py-2 font-semibold whitespace-nowrap">Fr. %</th>
                          <th className="text-right px-2 py-2 font-semibold whitespace-nowrap">Tasso Ag. %</th>
                          <th className="text-right px-2 py-2 font-semibold whitespace-nowrap">Tasso N.Ag. %</th>
                          <th className="text-right px-2 py-2 font-semibold whitespace-nowrap">Premio Ag.</th>
                          <th className="text-right px-2 py-2 font-semibold whitespace-nowrap">Premio N.Ag.</th>
                          <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Subtotale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.dettaglio_garanzie.map((g, i) => (
                          <tr
                            key={g.garanzia}
                            className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 ${
                                g.tipo === 'frequenziale' ? 'bg-blue-400' : 'bg-emerald-400'
                              }`} />
                              {g.garanzia_label}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                g.tipo === 'frequenziale'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {g.tipo === 'frequenziale' ? 'FR' : 'CAT'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center font-mono text-gray-600">
                              {g.franchigia > 0 ? `${g.franchigia}%` : '—'}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-blue-700">
                              {g.tasso_agevolato > 0 ? `${g.tasso_agevolato.toFixed(4)}` : '—'}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-gray-500">
                              {g.tasso_non_agevolato > 0 ? `${g.tasso_non_agevolato.toFixed(4)}` : '—'}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-gray-700">
                              {g.premio_agevolato > 0 ? formatEuro(g.premio_agevolato) : '—'}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-gray-700">
                              {g.premio_non_agevolato > 0 ? formatEuro(g.premio_non_agevolato) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                              {formatEuro(g.subtotale)}
                            </td>
                          </tr>
                        ))}
                        {/* Riga totali agevolato/non agevolato */}
                        <tr className={`border-t-2 ${cfg.tableBorder} font-semibold ${cfg.bgLight}`}>
                          <td colSpan={5} className="px-3 py-2 text-gray-700 text-right">Totale agevolato / non agevolato</td>
                          <td className="px-2 py-2 text-right font-mono text-blue-700">{formatEuro(c.totale_agevolato)}</td>
                          <td className="px-2 py-2 text-right font-mono text-gray-600">{formatEuro(c.totale_non_agevolato)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">{formatEuro(c.premio_lordo)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Breakdown finanziario ──────────────────────────── */}
              <div className="px-4 py-3 space-y-1.5 border-t border-gray-100 bg-white">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Premio Lordo</span>
                  <span className="font-mono font-bold text-gray-800">{formatEuro(c.premio_lordo)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span className="flex items-center gap-1">
                    {'− Contributo AGEA'}
                    <span className="text-xs text-green-600 bg-green-100 px-1 rounded">{formatPerc(risultato.contributo_agea_perc)}</span>
                  </span>
                  <span className="font-mono">{`− ${formatEuro(c.contributo_agea_eur)}`}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span className="flex items-center gap-1">
                    {'+ Imposta Premi'}
                    <span className="text-xs text-red-500 bg-red-100 px-1 rounded">{formatPerc(c.imposta_premi_perc)}</span>
                  </span>
                  <span className="font-mono">{`+ ${formatEuro(c.imposta_premi_eur)}`}</span>
                </div>
                {c.contributo_consorzio > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span className="flex items-center gap-1">
                      {'+ Consorzio Difesa'}
                      <span className="text-xs text-orange-500 bg-orange-100 px-1 rounded">{formatPerc(c.consorzio_perc)}</span>
                    </span>
                    <span className="font-mono">{`+ ${formatEuro(c.contributo_consorzio)}`}</span>
                  </div>
                )}
                <div className={`border-t-2 border-gray-200 pt-2 mt-1 flex justify-between font-extrabold text-base ${cfg.nettoColor}`}>
                  <span>= NETTO FINALE</span>
                  <span className="font-mono">{formatEuro(c.premio_netto)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Compagnie non disponibili ─────────────────────────────── */}
      {compagnieNonDisponibili.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <p className="text-sm text-gray-500 font-medium mb-2">Compagnie senza tariffe disponibili:</p>
          <div className="flex flex-wrap gap-2">
            {compagnieNonDisponibili.map((c) => (
              <span key={c.compagnia} className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {labelCompagnia(c.compagnia)}{c.messaggio ? `: ${c.messaggio}` : ': N/D'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Note ─────────────────────────────────────────────────── */}
      <div className="text-xs text-gray-400 space-y-0.5 px-1">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 items-center">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span>FR = Frequenziale</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>CAT = Catastrofale</span>
          </span>
          <span>Fr. % = Franchigia &nbsp;·&nbsp; Tassi espressi in % sul capitale assicurato</span>
          <span>Imposta calcolata sul Premio Lordo &nbsp;·&nbsp; Consorzio sul Valore Assicurato ({formatEuro(risultato.capitale)})</span>
        </div>
        <p className="mt-1">I dati sono indicativi e soggetti a verifica. Le tariffe vengono aggiornate tramite i listini ufficiali delle compagnie.</p>
      </div>
    </div>
  );
}
