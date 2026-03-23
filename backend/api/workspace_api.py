import json
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.database.db_manager import SessionLocal
from backend.database.models import Upload, WorkspaceShare, WorkspaceState

router = APIRouter()


class WorkspaceStatePayload(BaseModel):
    savedViews: List[Dict[str, Any]] = Field(default_factory=list)
    customKpis: List[Dict[str, Any]] = Field(default_factory=list)
    comments: List[Dict[str, Any]] = Field(default_factory=list)
    scenarioTemplates: List[Dict[str, Any]] = Field(default_factory=list)
    chartTemplates: List[Dict[str, Any]] = Field(default_factory=list)
    alertRules: List[Dict[str, Any]] = Field(default_factory=list)
    workflowTasks: List[Dict[str, Any]] = Field(default_factory=list)
    recentCommands: List[str] = Field(default_factory=list)
    lastRequest: Optional[Dict[str, Any]] = None


class WorkspaceShareRequest(BaseModel):
    request: Dict[str, Any]
    label: Optional[str] = None
    expires_in_days: int = Field(default=30, ge=1, le=365)


def _ensure_upload_exists(db, upload_id: int) -> Upload:
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {upload_id} not found")
    return upload


def _normalize_workspace_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    base = WorkspaceStatePayload().model_dump()
    if not payload:
        return base

    normalized = {**base}
    for key in base:
        value = payload.get(key)
        if value is None:
            continue
        if isinstance(base[key], list) and not isinstance(value, list):
            continue
        normalized[key] = value
    return normalized


@router.get("/workspace/{upload_id}")
def get_workspace_state(upload_id: int):
    db = SessionLocal()
    try:
        _ensure_upload_exists(db, upload_id)
        state = db.query(WorkspaceState).filter(WorkspaceState.upload_id == upload_id).first()
        payload = _normalize_workspace_payload(
            json.loads(state.payload_json) if state and state.payload_json else None
        )
        return {
            **payload,
            "updated_at": state.updated_at.isoformat() if state and state.updated_at else None,
        }
    finally:
        db.close()


@router.put("/workspace/{upload_id}")
def save_workspace_state(upload_id: int, payload: WorkspaceStatePayload):
    db = SessionLocal()
    try:
        _ensure_upload_exists(db, upload_id)
        state = db.query(WorkspaceState).filter(WorkspaceState.upload_id == upload_id).first()
        serialized_payload = json.dumps(
            _normalize_workspace_payload(payload.model_dump()), ensure_ascii=True
        )

        if state is None:
            state = WorkspaceState(upload_id=upload_id, payload_json=serialized_payload)
            db.add(state)
        else:
            state.payload_json = serialized_payload
            state.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(state)
        return {
            **_normalize_workspace_payload(payload.model_dump()),
            "updated_at": state.updated_at.isoformat() if state.updated_at else None,
        }
    finally:
        db.close()


@router.post("/workspace/{upload_id}/share")
def create_workspace_share(upload_id: int, payload: WorkspaceShareRequest):
    db = SessionLocal()
    try:
        _ensure_upload_exists(db, upload_id)
        share_token = secrets.token_urlsafe(12)
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
        share = WorkspaceShare(
            upload_id=upload_id,
            share_token=share_token,
            label=(payload.label or "").strip() or None,
            request_json=json.dumps(payload.request, ensure_ascii=True),
            expires_at=expires_at,
        )
        db.add(share)
        db.commit()
        db.refresh(share)
        return {
            "upload_id": upload_id,
            "share_token": share_token,
            "label": share.label,
            "expires_at": share.expires_at.isoformat() if share.expires_at else None,
            "shared_url_path": f"/dashboard/{upload_id}?share={share_token}",
        }
    finally:
        db.close()


@router.get("/workspace-share/{share_token}")
def get_workspace_share(share_token: str):
    db = SessionLocal()
    try:
        share = db.query(WorkspaceShare).filter(WorkspaceShare.share_token == share_token).first()
        if not share:
            raise HTTPException(status_code=404, detail="Shared workspace not found")
        if share.expires_at and share.expires_at < datetime.utcnow():
            raise HTTPException(status_code=410, detail="Shared workspace has expired")

        return {
            "upload_id": share.upload_id,
            "label": share.label,
            "request": json.loads(share.request_json) if share.request_json else {},
            "created_at": share.created_at.isoformat() if share.created_at else None,
            "expires_at": share.expires_at.isoformat() if share.expires_at else None,
        }
    finally:
        db.close()
