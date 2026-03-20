import { useState } from 'react';
import type { PreventivoRequest, PreventivoResponse } from './types';
import { calcolaPreventivo } from './api';
import PreventivoForm from './components/PreventivoForm';
import TabellaComparativa from './components/TabellaComparativa';
import ExportButtons from './components/ExportButtons';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [risultato, setRisultato] = useState<PreventivoResponse | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [ultimaRichiesta, setUltimaRichiesta] = useState<PreventivoRequest | null>(null);

  async function handleCalcola(req: PreventivoRequest) {
    setLoading(true);
    setErrore(null);
    setRisultato(null);
    setUltimaRichiesta(req);

    try {
      const res = await calcolaPreventivo(req);
      setRisultato(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrore(err.message);
      } else {
        setErrore('Errore imprevisto durante il calcolo del preventivo.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setRisultato(null);
    setErrore(null);
    setUltimaRichiesta(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 via-green-800 to-green-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-gaa.jpg" alt="GAA Confagricoltura" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Preventivatore Polizze Agro-Meteorologiche
              </h1>
              <p className="text-green-200 text-sm mt-1">
                Confronto multiplo tra Compagnie &mdash; AGEA / ISMEA
              </p>
            </div>
          </div>
          <div className="text-right text-green-200 text-xs hidden md:block">
            <p>Generali &middot; REVO &middot; Reale Mutua</p>
            <p className="mt-0.5">Anno {new Date().getFullYear()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Form Card */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            Dati del Preventivo
          </h2>
          <PreventivoForm onSubmit={handleCalcola} loading={loading} />
        </section>

        {/* Errore */}
        {errore && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 shadow">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl font-bold">!</span>
              <div>
                <h3 className="font-bold text-red-800">Errore nel calcolo</h3>
                <p className="text-red-700 text-sm mt-1">{errore}</p>
              </div>
            </div>
          </div>
        )}

        {/* Risultato */}
        {risultato && (
          <>
            {/* Tabella Comparativa */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  Confronto Preventivo
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Nuovo preventivo
                </button>
              </div>
              <TabellaComparativa risultato={risultato} />
            </section>

            {/* Export */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                Esportazione
              </h2>
              <ExportButtons
                risultato={risultato}
                richiesta={ultimaRichiesta}
              />
            </section>
          </>
        )}

        {/* Informativa */}
        {!risultato && !errore && (
          <section className="text-center text-gray-400 py-12">
            <p className="text-sm">
              Compila il form sopra per ottenere il confronto tra le compagnie.
            </p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          <p>
            Preventivatore Polizze Agro-Meteorologiche &copy;{' '}
            {new Date().getFullYear()} — Tutti i diritti riservati.
          </p>
          <p className="mt-1">
            I dati sono indicativi e soggetti a verifica. Le tariffe vengono
            aggiornate tramite i listini ufficiali delle compagnie.
          </p>
        </div>
      </footer>
    </div>
  );
}
