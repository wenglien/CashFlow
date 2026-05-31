from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import ai, analysis, assets, chip, fundamental, market, portfolio, quant, simulation

settings = get_settings()

app = FastAPI(title="CashFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)
app.include_router(simulation.router)
app.include_router(assets.router)
app.include_router(market.router)
app.include_router(fundamental.router)
app.include_router(chip.router)
app.include_router(analysis.router)
app.include_router(quant.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
