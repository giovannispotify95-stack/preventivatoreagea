import React, { useState, useEffect } from 'react';
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

  const [queryComune, setQueryComune] = useState('');
  const [comuniSuggestions, setComuniSuggestions] = useState<ComuneResult[]>([]);
  const [comuneSelezionato, setComuneSelezionato] = useState<ComuneResult | null>(null);
  const [showComuniDropdown, setShowComuniDropdown] = useState(false);

  const [queryColtura, setQueryColtura] = useState('');
  const [coltureSuggestions, setColtureSuggestions] = useState<ColturaResult[]>([]);
  const [colturaSelezionata, setColturaSelezionata] = useState<ColturaResult | null>(null);
  const [showColtureDropdown, setShowColtureDropdown] = useState(false);

  const [superficieHa, setSuperficieHa] = useState<string>('');
  const [prezzoUnitario, setPrezzoUnitario] = useState<string>('');
  const [tipoPrezzo, setTipoPrezzo] = useState<'ismea' | 'max' | 'med' | 'min' | 'custom'>('med');
  const [regime, setRegime] = useState<Regime>('agevolato');

  const [garanzieSelezionate, setGaranzieSelezionate] = useState<Set<string>>(
    new Set(['grandine'])
  );
  const [franchigie, setFranchigie] = useState<Record<string, number>>({
    grandine: 10,
  });

  // ── Carica province all'avvio ────────────────────────────────────
  useEffect(() => {
    listaProvince().then(setProvince).catch(() => {});
  }, []);

  // ── Ricerca comuni ───────────────────────────────────────────────
  useEffect(() => {
    if (queryComune.length < 2) {
      setComuniSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      cercaComuni(queryComune, provinciaSelezionata)
        .then((res) => {
          setComuniSuggestions(res);
          setShowComuniDropdown(true);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [queryComune, provinciaSelezionata]);

  // ── Ricerca colture ──────────────────────────────────────────────
  useEffect(() => {
    if (queryColtura.length < 2) {
      setColtureSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      cercaColture(queryColtura)
        .then((res) => {
          setColtureSuggestions(res);
          setShowColtureDropdown(true);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [queryColtura]);

  // ── Aggiorna prezzo quando cambia tipo o coltura ─────────────────
  useEffect(() => {
    if (!colturaSelezionata || tipoPrezzo === 'custom') return;
    const prezzi: Record<string, number | undefined> = {
      ismea: colturaSelezionata.prezzo_ismea,
      max: colturaSelezionata.prezzo_max,
      med: colturaSelezionata.prezzo_med,
      min: colturaSelezionata.prezzo_min,
    };
    const val = prezzi[tipoPrezzo];
    if (val !== undefined) {
      setPrezzoUnitario(val.toString());
    }
  }, [tipoPrezzo, colturaSelezionata]);

  // ── Handlers ─────────────────────────────────────────────────────
  function selezionaComune(c: ComuneResult) {
    setComuneSelezionato(c);
    setQueryComune(`${c.comune_nome} (${c.comune_istat})`);
    setShowComuniDropdown(false);
    if (c.provincia) setProvinciaSelezionata(c.provincia);
  }

  function selezionaColtura(c: ColturaResult) {
    setColturaSelezionata(c);
    setQueryColtura(`${c.descrizione}${c.varieta ? ` - ${c.varieta}` : ''}`);
    setShowColtureDropdown(false);
    // Auto-set prezzo
    if (c.prezzo_med) {
      setPrezzoUnitario(c.prezzo_med.toString());
      setTipoPrezzo('med');
    }
  }

  function toggleGaranzia(id: string) {
    setGaranzieSelezionate((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Rimuovi anche le garanzie che dipendono da questa
        if (id === 'vento_forte') {
          next.delete('eccesso_pioggia');
          // Rimuovi catastrofali
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
  }

  function changeFranchigia(garanzia: string, valore: number) {
    setFranchigie((prev) => ({ ...prev, [garanzia]: valore }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!comuneSelezionato) return;
    if (!colturaSelezionata) return;
    if (!superficieHa || !prezzoUnitario) return;

    const req: PreventivoRequest = {
      comune_istat: comuneSelezionato.comune_istat,
      coltura_codice: colturaSelezionata.codice_ciag,
      superficie_ha: parseFloat(superficieHa),
      prezzo_unitario: parseFloat(prezzoUnitario),
      regime,
      garanzie: Array.from(garanzieSelezionate),
      franchigie,
    };

    onSubmit(req);
  }

  // ── Render ───────────────────────────────────────────────────────
  const capitale = superficieHa && prezzoUnitario
    ? (parseFloat(superficieHa) * parseFloat(prezzoUnitario))
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Riga: Provincia + Comune */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia
          </label>
          <select
            value={provinciaSelezionata}
            onChange={(e) => {
              setProvinciaSelezionata(e.target.value);
              setComuneSelezionato(null);
              setQueryComune('');
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutte le province</option>
            {province.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comune *
          </label>
          <input
            type="text"
            value={queryComune}
            onChange={(e) => {
              setQueryComune(e.target.value);
              setComuneSelezionato(null);
            }}
            placeholder="Cerca per nome, ISTAT o CIAG..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {showComuniDropdown && comuniSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {comuniSuggestions.map((c) => (
                <button
                  key={`${c.comune_istat}-${c.comune_nome}`}
                  type="button"
                  onClick={() => selezionaComune(c)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100"
                >
                  <span className="font-medium">{c.comune_nome}</span>
                  <span className="text-gray-500 ml-2">({c.provincia})</span>
                  <span className="text-gray-400 ml-2 text-xs">ISTAT: {c.comune_istat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coltura */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coltura / Specie *
        </label>
        <input
          type="text"
          value={queryColtura}
          onChange={(e) => {
            setQueryColtura(e.target.value);
            setColturaSelezionata(null);
          }}
          placeholder="Cerca coltura..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        {showColtureDropdown && coltureSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {coltureSuggestions.map((c) => (
              <button
                key={`${c.codice_ciag}-${c.varieta || ''}`}
                type="button"
                onClick={() => selezionaColtura(c)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100"
              >
                <span className="font-medium">{c.descrizione}</span>
                {c.varieta && <span className="text-gray-500 ml-1">- {c.varieta}</span>}
                <span className="text-gray-400 ml-2 text-xs">CIAG: {c.codice_ciag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Superficie + Prezzo */}
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
            placeholder="10"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo Prezzo
          </label>
          <select
            value={tipoPrezzo}
            onChange={(e) => setTipoPrezzo(e.target.value as typeof tipoPrezzo)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ismea">ISMEA</option>
            <option value="max">Massimo</option>
            <option value="med">Medio</option>
            <option value="min">Minimo</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prezzo Unitario (€/Ha) *
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
            placeholder="100"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* Capitale */}
      {capitale > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-700">
            💰 Valore Assicurato (Capitale): <strong className="text-lg">
              {new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: 'EUR',
              }).format(capitale)}
            </strong>
          </span>
        </div>
      )}

      {/* Regime */}
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

      {/* Selezione Garanzie */}
      <GaranzieSelector
        garanzieSelezionate={garanzieSelezionate}
        franchigie={franchigie}
        onToggleGaranzia={toggleGaranzia}
        onChangeFranchigia={changeFranchigia}
      />

      {/* Banner AGEA */}
      <AgeaBanner garanzieSelezionate={garanzieSelezionate} regime={regime} />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !comuneSelezionato || !colturaSelezionata || !superficieHa || !prezzoUnitario}
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
          '📊 Calcola Preventivo Comparativo'
        )}
      </button>
    </form>
  );
}
