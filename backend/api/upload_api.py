from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.agents.file_upload_agent import FileUploadAgent
from backend.core.agent_orchestrator import orchestrator
from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
import os

from backend.config import LARGE_FILE_THRESHOLD_BYTES

router = APIRouter()

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    try:
        upload_agent = FileUploadAgent()
        payload = upload_agent.upload_file(file.file, file.filename)
        return {
            **payload,
            "message": "File uploaded successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-dataset/{upload_id}")
async def analyze_dataset(upload_id: int):
    """Automatically analyze uploaded dataset for structure and intelligence"""
    try:
        result = await orchestrator.execute_workflow(
            'dataset_intelligence',
            {'upload_id': upload_id}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/uploads")
def list_uploads(limit: int = 20):
    db = SessionLocal()
    try:
        uploads = (
            db.query(Upload)
            .order_by(Upload.uploaded_at.desc())
            .limit(max(1, min(limit, 100)))
            .all()
        )
        return {
            "uploads": [
                {
                    "id": upload.id,
                    "filename": upload.filename,
                    "file_type": upload.file_type,
                    "status": upload.status,
                    "uploaded_at": upload.uploaded_at.isoformat() if upload.uploaded_at else None,
                    "file_size": os.path.getsize(upload.file_path) if upload.file_path and os.path.exists(upload.file_path) else None,
                    "large_file": bool(
                        upload.file_path
                        and os.path.exists(upload.file_path)
                        and os.path.getsize(upload.file_path) >= LARGE_FILE_THRESHOLD_BYTES
                    ),
                }
                for upload in uploads
            ]
        }
    finally:
        db.close()
