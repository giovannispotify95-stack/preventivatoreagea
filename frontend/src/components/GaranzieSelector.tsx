import React from 'react';
import { GARANZIE_FREQUENZIALI, GARANZIE_CATASTROFALI, FRANCHIGIE_DISPONIBILI } from '../types';

interface Props {
  readonly garanzieSelezionate: Set<string>;
  readonly franchigie: Record<string, number>;
  readonly onToggleGaranzia: (garanzia: string) => void;
  readonly onChangeFranchigia: (garanzia: string, valore: number) => void;
}

export default function GaranzieSelector({
  garanzieSelezionate,
  franchigie,
  onToggleGaranzia,
  onChangeFranchigia,
}: Props) {
  const hasGrandine = garanzieSelezionate.has('grandine');
  const hasVentoForte = garanzieSelezionate.has('vento_forte');
  const hasEccessoPioggia = garanzieSelezionate.has('eccesso_pioggia');
  const pacchettoFreqCompleto = hasGrandine && hasVentoForte && hasEccessoPioggia;

  function isFreqAbilitata(id: string): boolean {
    if (id === 'grandine') return true; // sempre attiva
    if (id === 'vento_forte') return hasGrandine;
    if (id === 'eccesso_pioggia') return hasGrandine && hasVentoForte;
    return false;
  }

  return (
    <div className="space-y-6">
      {/* Garanzie Frequenziali */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Garanzie Frequenziali
          <span className="text-xs font-normal text-gray-500 ml-2">
            (progressive — obbligatorie in ordine)
          </span>
        </h3>
        <div className="space-y-2">
          {GARANZIE_FREQUENZIALI.map((g) => {
            const abilitata = isFreqAbilitata(g.id);
            const selezionata = garanzieSelezionate.has(g.id);
            return (
              <div
                key={g.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selezionata
                    ? 'bg-blue-50 border-blue-300'
                    : abilitata
                      ? 'bg-white border-gray-200 hover:border-blue-200'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selezionata}
                    disabled={g.obbligatoria || !abilitata}
                    onChange={() => onToggleGaranzia(g.id)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`font-medium ${selezionata ? 'text-blue-800' : 'text-gray-700'}`}>
                    {g.label}
                  </span>
                  {g.obbligatoria && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Obbligatoria
                    </span>
                  )}
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    FR
                  </span>
                </label>
                {selezionata && (
                  <select
                    value={franchigie[g.id] || 10}
                    onChange={(e) => onChangeFranchigia(g.id, Number(e.target.value))}
                    className="ml-3 text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                  >
                    {FRANCHIGIE_DISPONIBILI.map((f) => (
                      <option key={f} value={f}>
                        Fr. {f}%
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Garanzie Catastrofali */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Garanzie Catastrofali
          {!pacchettoFreqCompleto && (
            <span className="text-xs font-normal text-red-500 ml-2">
              (richiedono pacchetto frequenziale completo GR+VF+EP)
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GARANZIE_CATASTROFALI.map((g) => {
            const selezionata = garanzieSelezionate.has(g.id);
            return (
              <div
                key={g.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selezionata
                    ? 'bg-emerald-50 border-emerald-300'
                    : pacchettoFreqCompleto
                      ? 'bg-white border-gray-200 hover:border-emerald-200'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selezionata}
                    disabled={!pacchettoFreqCompleto}
                    onChange={() => onToggleGaranzia(g.id)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`font-medium text-sm ${selezionata ? 'text-emerald-800' : 'text-gray-700'}`}>
                    {g.label}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    CAT
                  </span>
                </label>
                {selezionata && (
                  <select
                    value={franchigie[g.id] || 30}
                    onChange={(e) => onChangeFranchigia(g.id, Number(e.target.value))}
                    className="ml-2 text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                  >
                    {FRANCHIGIE_DISPONIBILI.map((f) => (
                      <option key={f} value={f}>
                        Fr. {f}%
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
