import asyncio
import json
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Body
from fastapi.responses import JSONResponse, StreamingResponse

from backend.services.advanced_dashboard_service import advanced_dashboard_service
from backend.services.realtime_analysis_service import realtime_analysis_service

router = APIRouter()


@router.get("/run-analysis/{upload_id}")
def run_analysis(upload_id: int, background_tasks: BackgroundTasks):
    payload = realtime_analysis_service.start_analysis(upload_id, background_tasks)
    return payload


@router.get("/analysis-status/{upload_id}")
def get_analysis_status(upload_id: int):
    return realtime_analysis_service.get_status(upload_id)


@router.get("/analysis-status-stream/{upload_id}")
async def get_analysis_status_stream(upload_id: int):
    async def event_stream():
        while True:
            payload = realtime_analysis_service.get_status(upload_id)
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["status"] in {"completed", "failed"}:
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/analytics/{upload_id}")
def get_analytics(upload_id: int, background_tasks: BackgroundTasks):
    analysis = realtime_analysis_service.get_analysis(upload_id)
    if analysis:
        return advanced_dashboard_service.build_dashboard(upload_id)

    payload = realtime_analysis_service.start_analysis(upload_id, background_tasks)
    return JSONResponse(status_code=202, content=payload)


@router.post("/analytics/{upload_id}/interactive")
def get_interactive_analytics(
    upload_id: int,
    background_tasks: BackgroundTasks,
    request: Dict[str, Any] = Body(default_factory=dict),
):
    analysis = realtime_analysis_service.get_analysis(upload_id)
    if analysis:
        return advanced_dashboard_service.build_dashboard(upload_id, request)

    payload = realtime_analysis_service.start_analysis(upload_id, background_tasks)
    return JSONResponse(status_code=202, content=payload)


@router.get("/insights/{upload_id}")
def get_insights(upload_id: int, background_tasks: BackgroundTasks):
    analysis = realtime_analysis_service.get_analysis(upload_id)
    if analysis:
        return {"kpis": analysis["kpis"], "dataset": analysis["dataset"]}

    payload = realtime_analysis_service.start_analysis(upload_id, background_tasks)
    return JSONResponse(status_code=202, content=payload)


@router.get("/charts/{upload_id}")
def get_charts(upload_id: int, background_tasks: BackgroundTasks):
    analysis = realtime_analysis_service.get_analysis(upload_id)
    if analysis:
        return {"charts": analysis["charts"]}

    payload = realtime_analysis_service.start_analysis(upload_id, background_tasks)
    return JSONResponse(status_code=202, content=payload)
