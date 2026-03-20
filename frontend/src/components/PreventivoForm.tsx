import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ComuneResult, ColturaResult, PreventivoRequest, Regime } from '../types';
import { cercaComuni, cercaColture, listaProvince } from '../api';
import GaranzieSelector from './GaranzieSelector';
import AgeaBanner from './AgeaBanner';

interface Props {
  readonly onSubmit: (req: PreventivoRequest) => void;
  readonly loading: boolean;
}

export default function PreventivoForm({ onSubmit, loading }: Props) {
  // ── State ────────────────────────────────────────────────────────
  const [province, setProvince] = useState<string[]>([]);
  const [provinciaSelezionata, setProvinciaSelezionata] = useState('');

  // Comuni
  const [comuniList, setComuniList] = useState<ComuneResult[]>([]);
  const [comuniLoading, setComuniLoading] = useState(false);
  const [queryComune, setQueryComune] = useState('');
  const [comuneSelezionato, setComuneSelezionato] = useState<ComuneResult | null>(null);
  const [showComuniDropdown, setShowComuniDropdown] = useState(false);
  const comuneRef = useRef<HTMLDivElement>(null);

  // Colture
  const [coltureAll, setColtureAll] = useState<ColturaResult[]>([]);
  const [coltureLoading, setColtureLoading] = useState(false);
  const [queryColtura, setQueryColtura] = useState('');
  const [colturaSelezionata, setColturaSelezionata] = useState<ColturaResult | null>(null);
  const [showColtureDropdown, setShowColtureDropdown] = useState(false);
  const colturaRef = useRef<HTMLDivElement>(null);

  // Campi numerici
  const [superficieHa, setSuperficieHa] = useState<string>('');
  const [quintaliHa, setQuintaliHa] = useState<string>('');
  const [prezzoUnitario, setPrezzoUnitario] = useState<string>('');
  const [tipoPrezzo, setTipoPrezzo] = useState<'max' | 'med' | 'min' | 'custom'>('med');
  const [regime, setRegime] = useState<Regime>('agevolato');

  const [garanzieSelezionate, setGaranzieSelezionate] = useState<Set<string>>(
    new Set(['grandine'])
  );
  const [franchigie, setFranchigie] = useState<Record<string, number>>({
    grandine: 10,
  });
  const [tipoTariffaRM, setTipoTariffaRM] = useState<'normale' | 'sconti'>('normale');

  // ── Carica province all'avvio ────────────────────────────────────
  useEffect(() => {
    listaProvince().then(setProvince).catch(() => {});
  }, []);

  // ── Carica tutte le colture all'avvio ────────────────────────────
  useEffect(() => {
    setColtureLoading(true);
    cercaColture('').then((res) => {
      setColtureAll(res);
      setColtureLoading(false);
    }).catch(() => setColtureLoading(false));
  }, []);

  // ── Carica comuni quando cambia la provincia ─────────────────────
  useEffect(() => {
    if (!provinciaSelezionata) {
      setComuniList([]);
      return;
    }
    setComuniLoading(true);
    cercaComuni('', provinciaSelezionata).then((res) => {
      setComuniList(res);
      setComuniLoading(false);
    }).catch(() => setComuniLoading(false));
  }, [provinciaSelezionata]);

  // ── Filtra comuni client-side ────────────────────────────────────
  const comuniFiltrati = useMemo(() => {
    if (!queryComune) return comuniList;
    const q = queryComune.toLowerCase();
    return comuniList.filter(
      (c) =>
        c.comune_nome.toLowerCase().includes(q) ||
        c.comune_istat.includes(q) ||
        (c.comune_ciag && c.comune_ciag.includes(q))
    );
  }, [comuniList, queryComune]);

  // ── Filtra colture client-side ───────────────────────────────────
  const coltureFiltrate = useMemo(() => {
    if (!queryColtura) return coltureAll.slice(0, 100);
    const q = queryColtura.toLowerCase();
    return coltureAll.filter(
      (c) =>
        c.descrizione.toLowerCase().includes(q) ||
        (c.varieta && c.varieta.toLowerCase().includes(q)) ||
        c.codice_ciag.includes(q) ||
        (c.codice_ania && c.codice_ania.includes(q))
    ).slice(0, 100);
  }, [coltureAll, queryColtura]);

  // ── Aggiorna prezzo quando cambia tipo o coltura ─────────────────
  useEffect(() => {
    if (!colturaSelezionata || tipoPrezzo === 'custom') return;
    const prezzi: Record<string, number | undefined | null> = {
      max: colturaSelezionata.prezzo_max,
      med: colturaSelezionata.prezzo_med,
      min: colturaSelezionata.prezzo_min,
    };
    const val = prezzi[tipoPrezzo];
    if (val !== undefined && val !== null) {
      setPrezzoUnitario(val.toString());
    }
  }, [tipoPrezzo, colturaSelezionata]);

  // ── Click outside per chiudere dropdown ──────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comuneRef.current && !comuneRef.current.contains(e.target as Node)) {
        setShowComuniDropdown(false);
      }
      if (colturaRef.current && !colturaRef.current.contains(e.target as Node)) {
        setShowColtureDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  function selezionaComune(c: ComuneResult) {
    setComuneSelezionato(c);
    setQueryComune(`${c.comune_nome} (${c.comune_istat})`);
    setShowComuniDropdown(false);
  }

  function selezionaColtura(c: ColturaResult) {
    setColturaSelezionata(c);
    setQueryColtura(`${c.descrizione}${c.varieta ? ` - ${c.varieta}` : ''}`);
    setShowColtureDropdown(false);
    // Auto-set prezzo
    const prezzi: Record<string, number | undefined | null> = {
      max: c.prezzo_max,
      med: c.prezzo_med,
      min: c.prezzo_min,
    };
    const val = prezzi[tipoPrezzo];
    if (val !== undefined && val !== null) {
      setPrezzoUnitario(val.toString());
    } else if (c.prezzo_med) {
      setPrezzoUnitario(c.prezzo_med.toString());
      setTipoPrezzo('med');
    }
  }

  const toggleGaranzia = useCallback((id: string) => {
    setGaranzieSelezionate((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (id === 'vento_forte') {
          next.delete('eccesso_pioggia');
          for (const cat of ['gelo_brina', 'siccita', 'alluvione', 'eccesso_neve', 'colpo_sole_vento_caldo', 'sbalzo_termico']) {
            next.delete(cat);
          }
        }
        if (id === 'eccesso_pioggia') {
          for (const cat of ['gelo_brina', 'siccita', 'alluvione', 'eccesso_neve', 'colpo_sole_vento_caldo', 'sbalzo_termico']) {
            next.delete(cat);
          }
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const changeFranchigia = useCallback((garanzia: string, valore: number) => {
    setFranchigie((prev) => ({ ...prev, [garanzia]: valore }));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comuneSelezionato || !colturaSelezionata || !superficieHa || !prezzoUnitario || !quintaliHa) return;

    const req: PreventivoRequest = {
      comune_istat: comuneSelezionato.comune_istat,
      coltura_codice: colturaSelezionata.codice_ciag,
      superficie_ha: parseFloat(superficieHa),
      quintali_ha: parseFloat(quintaliHa),
      prezzo_unitario: parseFloat(prezzoUnitario),
      regime,
      garanzie: Array.from(garanzieSelezionate),
      franchigie,
      tipo_tariffa_rm: tipoTariffaRM,
    };

    onSubmit(req);
  }

  // ── Calcoli ──────────────────────────────────────────────────────
  const sup = parseFloat(superficieHa) || 0;
  const qha = parseFloat(quintaliHa) || 0;
  const pzu = parseFloat(prezzoUnitario) || 0;
  const produzioneTotale = sup * qha;
  const capitale = produzioneTotale * pzu;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Provincia ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia *
          </label>
          <select
            value={provinciaSelezionata}
            onChange={(e) => {
              setProvinciaSelezionata(e.target.value);
              setComuneSelezionato(null);
              setQueryComune('');
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            required
          >
            <option value="">-- Seleziona provincia --</option>
            {province.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* ── Comune ────────────────────────────────────────────── */}
        <div className="relative" ref={comuneRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comune *
          </label>
          <input
            type="text"
            value={queryComune}
            onChange={(e) => {
              setQueryComune(e.target.value);
              setComuneSelezionato(null);
              setShowComuniDropdown(true);
            }}
            onFocus={() => {
              if (provinciaSelezionata && comuniList.length > 0) {
                setShowComuniDropdown(true);
              }
            }}
            placeholder={
              !provinciaSelezionata
                ? 'Seleziona prima la provincia'
                : comuniLoading
                ? 'Caricamento comuni...'
                : 'Cerca o seleziona comune...'
            }
            disabled={!provinciaSelezionata}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            required
          />
          {comuneSelezionato && (
            <span className="absolute right-3 top-9 text-green-600 text-sm">&#10003;</span>
          )}
          {showComuniDropdown && comuniFiltrati.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {comuniFiltrati.map((c) => (
                <button
                  key={c.comune_istat}
                  type="button"
                  onClick={() => selezionaComune(c)}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 ${
                    comuneSelezionato?.comune_istat === c.comune_istat ? 'bg-blue-50 font-semibold' : ''
                  }`}
                >
                  <span className="font-medium">{c.comune_nome}</span>
                  <span className="text-gray-400 ml-2 text-xs">ISTAT: {c.comune_istat}</span>
                  {c.comune_ciag && <span className="text-gray-400 ml-1 text-xs">CIAG: {c.comune_ciag}</span>}
                </button>
              ))}
            </div>
          )}
          {showComuniDropdown && comuniFiltrati.length === 0 && queryComune.length > 0 && !comuniLoading && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3 text-sm text-gray-500">
              Nessun comune trovato
            </div>
          )}
        </div>
      </div>

      {/* ── Coltura ───────────────────────────────────────────────── */}
      <div className="relative" ref={colturaRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coltura / Specie *
        </label>
        <input
          type="text"
          value={queryColtura}
          onChange={(e) => {
            setQueryColtura(e.target.value);
            setColturaSelezionata(null);
            setPrezzoUnitario('');
            setShowColtureDropdown(true);
          }}
          onFocus={() => setShowColtureDropdown(true)}
          placeholder={coltureLoading ? 'Caricamento colture...' : 'Cerca coltura (es. frumento, vite, mais...)'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        {colturaSelezionata && (
          <span className="absolute right-3 top-9 text-green-600 text-sm">&#10003;</span>
        )}
        {showColtureDropdown && coltureFiltrate.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {coltureFiltrate.map((c, idx) => (
              <button
                key={`${c.codice_ciag}-${c.varieta || ''}-${idx}`}
                type="button"
                onClick={() => selezionaColtura(c)}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 ${
                  colturaSelezionata?.codice_ciag === c.codice_ciag && colturaSelezionata?.varieta === c.varieta
                    ? 'bg-blue-50 font-semibold'
                    : ''
                }`}
              >
                <span className="font-medium">{c.descrizione}</span>
                {c.varieta && <span className="text-gray-500 ml-1">- {c.varieta}</span>}
                <span className="text-gray-400 ml-2 text-xs">CIAG: {c.codice_ciag}</span>
                {c.prezzo_med != null && (
                  <span className="text-green-600 ml-2 text-xs font-medium">
                    {c.prezzo_med.toFixed(2)} €/q
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {showColtureDropdown && coltureFiltrate.length === 0 && queryColtura.length > 1 && !coltureLoading && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3 text-sm text-gray-500">
            Nessuna coltura trovata
          </div>
        )}
      </div>

      {/* ── Info Prezzi Coltura selezionata ──────────────────────── */}
      {colturaSelezionata && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <div className="text-sm text-emerald-800 font-medium mb-2">
            Prezzi disponibili per: {colturaSelezionata.descrizione}
            {colturaSelezionata.varieta ? ` (${colturaSelezionata.varieta})` : ''}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {colturaSelezionata.prezzo_min != null && (
              <div className={`px-3 py-2 rounded border cursor-pointer transition-all ${
                tipoPrezzo === 'min'
                  ? 'border-emerald-500 bg-emerald-100 font-semibold'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`} onClick={() => setTipoPrezzo('min')}>
                <div className="text-gray-500 text-xs">Minimo</div>
                <div className="text-emerald-700 font-medium">{colturaSelezionata.prezzo_min.toFixed(2)} €/q</div>
              </div>
            )}
            {colturaSelezionata.prezzo_med != null && (
              <div className={`px-3 py-2 rounded border cursor-pointer transition-all ${
                tipoPrezzo === 'med'
                  ? 'border-emerald-500 bg-emerald-100 font-semibold'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`} onClick={() => setTipoPrezzo('med')}>
                <div className="text-gray-500 text-xs">Medio</div>
                <div className="text-emerald-700 font-medium">{colturaSelezionata.prezzo_med.toFixed(2)} €/q</div>
              </div>
            )}
            {colturaSelezionata.prezzo_max != null && (
              <div className={`px-3 py-2 rounded border cursor-pointer transition-all ${
                tipoPrezzo === 'max'
                  ? 'border-emerald-500 bg-emerald-100 font-semibold'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`} onClick={() => setTipoPrezzo('max')}>
                <div className="text-gray-500 text-xs">Massimo</div>
                <div className="text-emerald-700 font-medium">{colturaSelezionata.prezzo_max.toFixed(2)} €/q</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Superficie + Quintali/Ha + Prezzo ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Superficie (Ha) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={superficieHa}
            onChange={(e) => setSuperficieHa(e.target.value)}
            placeholder="es. 10"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resa (Quintali/Ha) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={quintaliHa}
            onChange={(e) => setQuintaliHa(e.target.value)}
            placeholder="es. 50"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prezzo (€/Quintale) *
            {tipoPrezzo !== 'custom' && (
              <span className="ml-1 text-xs text-emerald-600 font-normal">
                ({tipoPrezzo === 'max' ? 'Massimo' : tipoPrezzo === 'med' ? 'Medio' : 'Minimo'})
              </span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={prezzoUnitario}
            onChange={(e) => {
              setPrezzoUnitario(e.target.value);
              setTipoPrezzo('custom');
            }}
            placeholder={colturaSelezionata ? 'Seleziona prezzo sopra' : 'Seleziona prima coltura'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* ── Riepilogo Capitale ────────────────────────────────────── */}
      {capitale > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
            <div>
              Produzione totale: <strong>{produzioneTotale.toFixed(2)} q</strong>
              <span className="text-blue-500 ml-1">({sup} Ha x {qha} q/Ha)</span>
            </div>
            <div>
              Valore Assicurato: <strong className="text-lg">
                {new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(capitale)}
              </strong>
              <span className="text-blue-500 ml-1">({produzioneTotale.toFixed(0)} q x {pzu.toFixed(2)} €/q)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Regime ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Regime
        </label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
            regime === 'agevolato'
              ? 'border-green-500 bg-green-50 text-green-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="regime"
              value="agevolato"
              checked={regime === 'agevolato'}
              onChange={() => setRegime('agevolato')}
              className="text-green-600"
            />
            <span className="font-medium">Agevolato</span>
          </label>
          <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
            regime === 'non_agevolato'
              ? 'border-amber-500 bg-amber-50 text-amber-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="regime"
              value="non_agevolato"
              checked={regime === 'non_agevolato'}
              onChange={() => setRegime('non_agevolato')}
              className="text-amber-600"
            />
            <span className="font-medium">Non Agevolato</span>
          </label>
        </div>
      </div>

      {/* ── Selezione Garanzie ────────────────────────────────────── */}
      <GaranzieSelector
        garanzieSelezionate={garanzieSelezionate}
        franchigie={franchigie}
        onToggleGaranzia={toggleGaranzia}
        onChangeFranchigia={changeFranchigia}
      />

      {/* ── Banner AGEA ───────────────────────────────────────────── */}
      <AgeaBanner garanzieSelezionate={garanzieSelezionate} regime={regime} />

      {/* ── Tipo Tariffa Reale Mutua ──────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tariffa Reale Mutua
        </label>
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
            tipoTariffaRM === 'normale'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="tipoTariffaRM"
              value="normale"
              checked={tipoTariffaRM === 'normale'}
              onChange={() => setTipoTariffaRM('normale')}
              className="text-emerald-600"
            />
            <span className="font-medium">Tariffa Normale</span>
          </label>
          <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
            tipoTariffaRM === 'sconti'
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="tipoTariffaRM"
              value="sconti"
              checked={tipoTariffaRM === 'sconti'}
              onChange={() => setTipoTariffaRM('sconti')}
              className="text-blue-600"
            />
            <span className="font-medium">Tariffa Sconti</span>
          </label>
        </div>
      </div>

      {/* ── Submit ────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || !comuneSelezionato || !colturaSelezionata || !superficieHa || !quintaliHa || !prezzoUnitario}
        className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Calcolo in corso...
          </span>
        ) : (
          'Calcola Preventivo Comparativo'
        )}
      </button>
    </form>
  );
}
