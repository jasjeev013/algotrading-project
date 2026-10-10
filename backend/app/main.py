from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import backtest, history, live, market_data, root, walk_forward
from app.services.live_bot import bot_controller

app = FastAPI(title="QuantDash API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.on_event("shutdown")
async def on_shutdown():
    if bot_controller.is_running():
        await bot_controller.stop()


# Allow React frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(root.router)
app.include_router(market_data.router)
app.include_router(backtest.router)
app.include_router(walk_forward.router)
app.include_router(live.router)
app.include_router(history.router)
