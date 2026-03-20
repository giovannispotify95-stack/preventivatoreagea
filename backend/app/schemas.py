"""
Schemi Pydantic per validazione request/response API.
"""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


# ── Request Schemas ──────────────────────────────────────────────────

class PreventivoRequest(BaseModel):
    """Richiesta di calcolo preventivo."""
    comune_istat: str = Field(..., description="Codice ISTAT del comune")
    comune_ciag: Optional[str] = Field(default=None, description="Codice CIAG del comune (necessario per REVO)")
    coltura_codice: str = Field(..., description="Codice coltura (CIAG o ANIA)")
    superficie_ha: float = Field(..., gt=0, description="Superficie in ettari")
    quintali_ha: float = Field(default=1.0, gt=0, description="Quintali per ettaro (resa)")
    prezzo_unitario: float = Field(..., gt=0, description="Prezzo per quintale in €")
    regime: str = Field(..., pattern="^(agevolato|non_agevolato)$")
    garanzie: list[str] = Field(
        ...,
        description="Lista garanzie normalizzate selezionate",
        min_length=1,
    )
    franchigie: dict[str, float] = Field(
        default_factory=dict,
        description="Franchigia per garanzia: {'grandine': 10, 'vento_forte': 15, ...}",
    )
    tipo_tariffa_rm: Optional[str] = Field(
        default="normale",
        description="Tipo tariffa Reale Mutua: 'normale' o 'sconti'",
    )
    applica_consorzio: bool = Field(
        default=True,
        description="Se applicare il contributo Consorzio di Difesa (0,4% sul valore assicurato)",
    )
    note: Optional[str] = None


# ── Response Schemas ─────────────────────────────────────────────────

class DettaglioGaranzia(BaseModel):
    garanzia: str
    garanzia_label: str
    tipo: str
    franchigia: float
    tasso_agevolato: float
    tasso_non_agevolato: float
    premio_agevolato: float
    premio_non_agevolato: float
    subtotale: float


class PreventivoCompagnia(BaseModel):
    compagnia: str
    disponibile: bool = True
    messaggio: Optional[str] = None
    dettaglio_garanzie: list[DettaglioGaranzia] = []
    totale_agevolato: float = 0.0
    totale_non_agevolato: float = 0.0
    premio_lordo: float = 0.0
    perc_agea: float = 0.0
    contributo_agea_eur: float = 0.0
    imposta_premi_perc: float = 2.5
    imposta_premi_eur: float = 0.0
    consorzio_perc: float = 0.4
    contributo_consorzio: float = 0.0
    premio_netto: float = 0.0


class PreventivoResponse(BaseModel):
    """Risposta con confronto preventivi tra compagnie."""
    comune_istat: str
    comune_nome: str
    provincia: str
    coltura_codice: str
    coltura_descrizione: str
    superficie_ha: float
    quintali_ha: float
    prezzo_unitario: float
    capitale: float
    regime: str
    garanzie_selezionate: list[str]
    contributo_agea_perc: float
    compagnie: list[PreventivoCompagnia]
    migliore: Optional[str] = None
    preventivo_id: Optional[int] = None


# ── Ricerca Schemas ──────────────────────────────────────────────────

class ComuneResult(BaseModel):
    comune_istat: str
    comune_nome: str
    provincia: str
    comune_ciag: Optional[str] = None


class ColturaResult(BaseModel):
    codice_ciag: str
    codice_ania: Optional[str] = None
    descrizione: str
    varieta: Optional[str] = None
    prezzo_ismea: Optional[float] = None
    prezzo_max: Optional[float] = None
    prezzo_med: Optional[float] = None
    prezzo_min: Optional[float] = None


class TariffaDisponibile(BaseModel):
    compagnia: str
    garanzia: str
    tipo_garanzia: str
    franchigia_min: Optional[float] = None
    tasso_agevolato: float
    tasso_non_agevolato: float


# ── Upload Schemas ───────────────────────────────────────────────────

class UploadResponse(BaseModel):
    success: bool
    compagnia: str
    records_importati: int
    messaggio: str
    versione: int


class VersioneListinoResponse(BaseModel):
    id: int
    compagnia: str
    nome_file: str
    anno_validita: int
    data_caricamento: datetime
    num_record: int
    attivo: bool
    versione: int


# ── Mapping Garanzie ─────────────────────────────────────────────────

GARANZIE_LABELS = {
    "grandine": "Grandine",
    "vento_forte": "Vento Forte",
    "eccesso_pioggia": "Eccesso di Pioggia",
    "gelo_brina": "Gelo / Brina",
    "siccita": "Siccità",
    "alluvione": "Alluvione",
    "eccesso_neve": "Eccesso di Neve",
    "colpo_sole_vento_caldo": "Colpo di Sole / Vento Caldo",
    "sbalzo_termico": "Sbalzo Termico / Ondata di Calore",
}
