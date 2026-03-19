"""
Preventivatore Polizze Agro-Meteorologiche — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import preventivo, ricerca, upload

app = FastAPI(
    title="Preventivatore Agro-Meteorologico",
    description=(
        "Web application per la preventivazione di polizze assicurative "
        "agricole contro eventi atmosferici. Confronto tra Generali, REVO "
        "e Reale Mutua."
    ),
    version="1.0.0",
)

# CORS per frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra i router
app.include_router(preventivo.router)
app.include_router(ricerca.router)
app.include_router(upload.router)


@app.on_event("startup")
def on_startup():
    """Inizializza il database all'avvio."""
    init_db()


@app.get("/")
def root():
    return {
        "nome": "Preventivatore Agro-Meteorologico",
        "versione": "1.0.0",
        "descrizione": "API per preventivazione polizze assicurative agricole",
        "compagnie": ["Generali", "REVO", "RealeMutua"],
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
