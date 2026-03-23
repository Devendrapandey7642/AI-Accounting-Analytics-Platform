from fastapi import APIRouter, HTTPException
from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.agents.forecasting_agent import ForecastingAgent
import pandas as pd
import os
from backend.config import UPLOAD_DIR

router = APIRouter()


def _resolve_upload_path(upload: Upload) -> str:
    """Prefer the stored file path, with a legacy fallback for older rows."""
    candidate_paths = [
        upload.file_path,
        os.path.join(UPLOAD_DIR, upload.filename),
    ]

    for path in candidate_paths:
        if path and os.path.exists(path):
            return path

    raise HTTPException(status_code=404, detail="Data file not found")

@router.get("/predictions/{upload_id}")
def get_predictions(upload_id: int):
    """Get AI predictions with explanations"""
    try:
        # Get upload record
        db = SessionLocal()
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        db.close()

        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        # Load the data
        file_path = _resolve_upload_path(upload)

        # Read data
        if upload.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif upload.filename.endswith('.xlsx'):
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Run forecasting with explanations
        agent = ForecastingAgent(df)
        results = agent.forecast()

        return {
            "upload_id": upload_id,
            "predictions": results['predictions'],
            "explanations": results['explanations'],
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/prediction-insights/{upload_id}")
def get_prediction_insights(upload_id: int):
    """Get detailed prediction insights for dashboard"""
    try:
        # Get upload record
        db = SessionLocal()
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        db.close()

        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        # Load the data
        file_path = _resolve_upload_path(upload)

        # Read data
        if upload.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif upload.filename.endswith('.xlsx'):
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Sample data for faster processing (take up to 1000 rows)
        if len(df) > 1000:
            df = df.sample(n=1000, random_state=42).reset_index(drop=True)

        # Run forecasting
        agent = ForecastingAgent(df)
        results = agent.forecast()

        # Format for dashboard display
        insights = {
            "sales_forecast": results['predictions'].get('sales', {}),
            "expense_forecast": results['predictions'].get('expenses', {}),
            "profit_forecast": results['predictions'].get('profit', {}),
            "explanation_summary": {}
        }

        # Add explanation summaries
        for key in ['sales', 'expenses', 'profit']:
            if key in results['explanations']:
                exp = results['explanations'][key]
                insights['explanation_summary'][key] = {
                    'top_factors': exp.get('top_factors', [])[:5],
                    'model_type': results['predictions'].get(key, {}).get('model_type', 'Unknown'),
                    'confidence': results['predictions'].get(key, {}).get('confidence', 0)
                }

        return insights

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction insights failed: {str(e)}")
