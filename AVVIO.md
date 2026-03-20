# Come avviare il Preventivatore AGEA

## Requisiti
- Python 3.9+ con venv nella cartella `backend/venv/`
- Node.js + npm con dipendenze installate in `frontend/node_modules/`

---

## Avvio Backend (FastAPI)

Apri un terminale e lancia:

```bash
cd /Users/giovannipucariello/Desktop/PreventivatoreAndre/preventivatoreagea/backend
/Users/giovannipucariello/Desktop/PreventivatoreAndre/preventivatoreagea/backend/venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend pronto quando vedi: `Application startup complete.`

- API disponibile su: http://localhost:8000
- Documentazione Swagger: http://localhost:8000/docs

---

## Avvio Frontend (React + Vite)

Apri un **secondo terminale** e lancia:

```bash
cd /Users/giovannipucariello/Desktop/PreventivatoreAndre/preventivatoreagea/frontend
npm run dev
```

✅ Frontend pronto quando vedi: `Local: http://localhost:5173/`

- Applicazione disponibile su: http://localhost:5173

---

## Ordine di avvio

> ⚠️ Avvia **sempre il backend prima** del frontend.

1. Terminale 1 → backend (porta 8000)
2. Terminale 2 → frontend (porta 5173)
3. Apri il browser su http://localhost:5173

---

## Riavvio (se qualcosa è già in esecuzione)

```bash
pkill -f "uvicorn"
pkill -f "vite"
```

Poi rilancia backend e frontend come sopra.

---

## Note
- Il database SQLite si trova in `backend/preventivatoreagea.db`
- I file Excel delle tariffe si caricano tramite l'interfaccia su http://localhost:5173 (sezione Upload)
- Il backend usa `--reload`: si riavvia automaticamente ad ogni modifica ai file `.py`
