from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.services.dashboard_command_service import dashboard_command_service

router = APIRouter()


class QueryRequest(BaseModel):
    upload_id: int
    query: str
    current_request: Optional[Dict[str, Any]] = None


def _ensure_upload_exists(upload_id: int) -> None:
    db = SessionLocal()
    try:
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")
    finally:
        db.close()


@router.post("/query")
def process_query(request: QueryRequest):
    _ensure_upload_exists(request.upload_id)
    interpreted = dashboard_command_service.interpret_command(
        request.upload_id,
        request.query,
        request.current_request,
    )
    interpreted["mode"] = "dashboard_action"
    return interpreted


@router.post("/dashboard-command")
def process_dashboard_command(request: QueryRequest):
    _ensure_upload_exists(request.upload_id)
    return dashboard_command_service.interpret_command(
        request.upload_id,
        request.query,
        request.current_request,
    )
