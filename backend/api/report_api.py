import logging
import os
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import RedirectResponse

from backend.agents.report_generator_agent import ConsultingReportGenerator
from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.services.advanced_dashboard_service import advanced_dashboard_service
from backend.services.realtime_analysis_service import realtime_analysis_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/generate-consulting-report/{upload_id}")
async def generate_consulting_report(upload_id: int):
    """
    Generate a professional consulting-style analytics report with structured sections.
    """
    try:
        db = SessionLocal()
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        db.close()

        if not upload:
            raise HTTPException(status_code=404, detail=f"Upload {upload_id} not found")

        analysis_data = await _run_comprehensive_analysis(upload_id)

        generator = ConsultingReportGenerator(upload_id)
        pdf_path = generator.generate_report(analysis_data)

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="Failed to generate report")

        with open(pdf_path, "rb") as file_handle:
            pdf_content = file_handle.read()

        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=consulting-analytics-report-{upload_id}.pdf"},
        )
    except Exception as exc:
        logger.error("Error generating consulting report: %s", exc)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(exc)}")


async def _run_comprehensive_analysis(upload_id: int) -> dict:
    """
    Build the report payload from the same rich dashboard analytics used in the UI.
    """
    analysis = realtime_analysis_service.get_analysis(upload_id)
    if not analysis:
        realtime_analysis_service.start_analysis(upload_id)

    dashboard = advanced_dashboard_service.build_dashboard(upload_id)
    return _map_dashboard_to_report_payload(dashboard)


def _map_dashboard_to_report_payload(dashboard: Dict[str, Any]) -> Dict[str, Any]:
    dataset = dashboard.get("dataset", {})
    kpis = dashboard.get("kpis", {})
    cards = list(kpis.get("cards", []))
    charts = list(dashboard.get("charts", []))
    narrative = dashboard.get("narrative", {})
    insight_cards = dashboard.get("insightCards", [])
    alerts = dashboard.get("alerts", [])
    quality_report = dashboard.get("qualityReport", {})
    forecast = dashboard.get("forecast", {})
    benchmark = dashboard.get("benchmark", {})
    target_tracking = dashboard.get("targetTracking", {})
    comparison = dashboard.get("comparison", {})

    chart_slots = charts[:6] + [None] * max(0, 6 - len(charts[:6]))
    total_sales = float(kpis.get("totalSales", 0) or 0)
    total_expenses = float(kpis.get("totalExpenses", 0) or 0)
    total_profit = float(kpis.get("profit", total_sales - total_expenses) or 0)
    profit_margin = (total_profit / total_sales * 100.0) if total_sales else 0.0

    recommendations = _combine_unique_text(
        narrative.get("recommendations", []),
        quality_report.get("recommendations", []),
    )
    ai_insights = _combine_unique_text(
        [card.get("body", "") for card in insight_cards],
        [alert.get("description", "") for alert in alerts],
        [section.get("body", "") for section in narrative.get("sections", [])],
    )

    return {
        "upload_id": dashboard.get("uploadId"),
        "file_name": dashboard.get("fileName"),
        "dataset_info": {
            "rows": dataset.get("rows", 0),
            "columns": dataset.get("columns", 0),
            "dataset_type": dataset.get("datasetType", "general"),
            "data_quality_score": dataset.get("completeness", 0),
            "filtered_rows": dataset.get("filteredRows", dataset.get("rows", 0)),
            "active_metric": dataset.get("activeMetric"),
            "active_category_column": dataset.get("activeCategoryColumn"),
            "active_date_column": dataset.get("activeDateColumn"),
        },
        "column_types": {
            column.get("name", ""): {
                "type": column.get("type", "unknown"),
                "confidence": 1.0,
                "sample_values": column.get("sampleValues", []),
                "unique_values": column.get("uniqueCount", 0),
            }
            for column in dashboard.get("columnSummary", [])
            if column.get("name")
        },
        "data_quality": quality_report,
        "kpi_cards": cards,
        "dataset_overview_chart": chart_slots[0],
        "kpi_trend_chart": next((chart for chart in charts if chart.get("chartType") == "line"), chart_slots[0]),
        "sales_analysis": {
            "total_sales": total_sales,
            "insights": _take_non_empty(
                [card.get("body", "") for card in insight_cards[:2]],
                [section.get("body", "") for section in narrative.get("sections", [])[:1]],
            ),
            "interpretation": _first_non_empty(
                narrative.get("sections", [{}])[0].get("body") if narrative.get("sections") else "",
                "Sales performance is summarized using the primary metric and the strongest trend visual from the dashboard.",
            ),
            "sales_chart": chart_slots[0],
        },
        "expense_analysis": {
            "total_expenses": total_expenses,
            "insights": _take_non_empty(
                [alert.get("description", "") for alert in alerts[:2]],
                quality_report.get("recommendations", [])[:2],
            ),
            "interpretation": _first_non_empty(
                quality_report.get("recommendations", [])[:1][0] if quality_report.get("recommendations") else "",
                "Expense commentary blends data-quality findings with operating alerts so the section feels more practical.",
            ),
            "expense_chart": chart_slots[1],
        },
        "profit_analysis": {
            "total_profit": total_profit,
            "avg_profit_margin": profit_margin,
            "profit_margin": profit_margin,
            "insights": _take_non_empty(
                [section.get("body", "") for section in narrative.get("sections", [])[1:3]],
                [card.get("body", "") for card in insight_cards[2:4]],
            ),
            "interpretation": _first_non_empty(
                comparison.get("cards", [{}])[0].get("title") if comparison.get("cards") else "",
                "Profitability is tied back to the KPI layer so the report does not drift into generic narration.",
            ),
            "profit_chart": chart_slots[2],
        },
        "customer_analysis": {
            "insights": _take_non_empty(
                [chart.get("caption", "") for chart in charts if chart.get("chartType") in {"bar", "pie"}][:3],
                [card.get("body", "") for card in insight_cards[1:3]],
            ),
            "interpretation": _first_non_empty(
                benchmark.get("baselineLabel"),
                "Category-level visuals and comparison context are used to keep this section insight-heavy.",
            ),
            "customer_chart": chart_slots[3],
        },
        "cash_flow_analysis": {
            "net_cash_flow": total_profit,
            "insights": _take_non_empty(
                [alert.get("description", "") for alert in alerts[2:4]],
                [card.get("subtitle", "") for card in cards[2:4]],
            ),
            "interpretation": _first_non_empty(
                forecast.get("description"),
                "Cash-flow style commentary is derived from the broader metric and alert stack until a dedicated cash dataset is present.",
            ),
            "cash_flow_chart": chart_slots[4],
        },
        "forecast_analysis": {
            "predictions": _build_prediction_table(forecast, target_tracking, benchmark),
            "insights": _take_non_empty(
                [forecast.get("description", "")],
                [alert.get("description", "") for alert in alerts if alert.get("kind") == "forecast"],
                [f"{section.get('heading')}: {section.get('body')}" for section in narrative.get("sections", [])[3:4]],
            ),
            "explanation": _build_forecast_explanation(forecast, target_tracking, benchmark),
            "forecast_chart": _build_forecast_chart(forecast),
        },
        "ai_insights": ai_insights[:10],
        "recommendations": recommendations[:10],
    }


def _build_prediction_table(
    forecast: Dict[str, Any],
    target_tracking: Dict[str, Any],
    benchmark: Dict[str, Any],
) -> Dict[str, Dict[str, Any]]:
    predictions: Dict[str, Dict[str, Any]] = {}

    forecast_points = forecast.get("points", [])
    if forecast_points:
        last_point = forecast_points[-1]
        if last_point.get("forecast") is not None:
            predictions["forecast_metric"] = {
                "value": float(last_point.get("forecast", 0)),
                "confidence": "Trend-based",
            }

    if target_tracking.get("enabled"):
        predictions["target_variance"] = {
            "value": float(target_tracking.get("variance", 0)),
            "confidence": str(target_tracking.get("status", "on_track")).replace("_", " ").title(),
        }

    if benchmark.get("enabled"):
        predictions["benchmark_delta"] = {
            "value": float(benchmark.get("delta", 0)),
            "confidence": f"{float(benchmark.get('deltaPercent', 0)):.1f}%",
        }

    return predictions


def _build_forecast_chart(forecast: Dict[str, Any]) -> Dict[str, Any]:
    if not forecast.get("enabled") or not forecast.get("points"):
        return {}

    records: List[Dict[str, Any]] = []
    for point in forecast.get("points", []):
        record = {"label": point.get("label", "")}
        if point.get("actual") is not None:
            record["actual"] = float(point.get("actual", 0))
        if point.get("forecast") is not None:
            record["forecast"] = float(point.get("forecast", 0))
        records.append(record)

    y_keys = [key for key in ["actual", "forecast"] if any(key in record for record in records)]
    return {
        "title": "Forecast trajectory",
        "chartType": "line",
        "description": forecast.get("description", "Forecast summary generated from dashboard time-series output."),
        "caption": "Actual values transition into projected values across the last available periods.",
        "data": records,
        "xKey": "label",
        "yKeys": y_keys,
        "seriesLabels": {"actual": "Actual", "forecast": "Forecast"},
    }


def _build_forecast_explanation(
    forecast: Dict[str, Any],
    target_tracking: Dict[str, Any],
    benchmark: Dict[str, Any],
) -> str:
    parts = [forecast.get("description", "").strip()]
    if target_tracking.get("enabled"):
        parts.append(
            f"Target tracking shows a {float(target_tracking.get('variancePercent', 0)):.1f}% variance versus target."
        )
    if benchmark.get("enabled"):
        direction = "above" if float(benchmark.get("delta", 0)) >= 0 else "below"
        parts.append(
            f"The current metric is {abs(float(benchmark.get('deltaPercent', 0))):.1f}% {direction} the benchmark baseline."
        )
    return " ".join(part for part in parts if part)


def _combine_unique_text(*groups: List[str]) -> List[str]:
    seen = set()
    items: List[str] = []
    for group in groups:
        for item in group:
            text = str(item).strip()
            normalized = text.lower()
            if text and normalized not in seen:
                seen.add(normalized)
                items.append(text)
    return items


def _take_non_empty(*groups: List[str]) -> List[str]:
    return _combine_unique_text(*groups)[:5]


def _first_non_empty(*values: Any) -> str:
    for value in values:
        text = str(value).strip()
        if text:
            return text
    return ""


@router.get("/generate-report/{upload_id}")
def generate_report(upload_id: int):
    """
    Legacy report generation endpoint - redirects to new consulting report.
    """
    return RedirectResponse(
        url=f"/api/generate-consulting-report/{upload_id}",
        status_code=302,
    )
