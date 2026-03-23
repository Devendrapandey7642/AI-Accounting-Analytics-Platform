import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.config import ALLOWED_ORIGINS
from backend.database.db_manager import create_tables
from backend.api.upload_api import router as upload_router
from backend.api.analytics_api import router as analytics_router
from backend.api.query_api import router as query_router
from backend.api.report_api import router as report_router
from backend.api.predictions_api import router as predictions_router
from backend.api.workspace_api import router as workspace_router
from backend.utils.logger import logger

app = FastAPI(title="AI Accounting Analytics Platform")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
create_tables()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    started_at = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - started_at) * 1000
        logger.exception(
            "[%s] %s %s failed after %.1fms",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - started_at) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "[%s] %s %s -> %s in %.1fms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

app.include_router(upload_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Accounting Analytics Platform"}


@app.get("/api/health")
def read_health():
    return {"status": "ok", "allowed_origins": len(ALLOWED_ORIGINS)}
