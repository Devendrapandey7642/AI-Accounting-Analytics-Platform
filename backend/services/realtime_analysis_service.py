from __future__ import annotations

import json
import math
import os
import re
from copy import deepcopy
from datetime import datetime
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import BackgroundTasks, HTTPException

from backend.config import PROCESSED_DIR
from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.utils.file_reader import read_file


class RealtimeAnalysisService:
    STEP_TEMPLATES = [
        {
            "key": "load_data",
            "title": "Reading dataset",
            "description": "Loading the uploaded file and validating its structure.",
        },
        {
            "key": "detect_schema",
            "title": "Detecting columns",
            "description": "Finding date, numeric, category, and text fields automatically.",
        },
        {
            "key": "clean_values",
            "title": "Cleaning values",
            "description": "Normalizing dates, numbers, blanks, and duplicate rows.",
        },
        {
            "key": "build_kpis",
            "title": "Building KPIs",
            "description": "Calculating high-signal summary metrics from the dataset.",
        },
        {
            "key": "build_charts",
            "title": "Building charts",
            "description": "Generating schema-aware charts with clear labels and captions.",
        },
        {
            "key": "finalize",
            "title": "Finalizing dashboard",
            "description": "Saving analysis output for the dashboard and reports.",
        },
    ]

    DATASET_TYPE_KEYWORDS = {
        "sales": ["sale", "sales", "revenue", "order", "invoice", "transaction"],
        "finance": ["amount", "balance", "credit", "debit", "cash", "income"],
        "expense": ["expense", "cost", "spend", "payment", "bill", "budget"],
        "operations": ["region", "branch", "location", "department", "team"],
        "inventory": ["inventory", "stock", "sku", "product", "quantity"],
        "customer": ["customer", "client", "segment", "subscription", "account"],
    }

    CURRENCY_KEYWORDS = [
        "amount",
        "sales",
        "revenue",
        "income",
        "expense",
        "cost",
        "profit",
        "price",
        "payment",
        "value",
        "budget",
        "cash",
    ]

    KPI_COLORS = [
        "from-blue-500 to-cyan-500",
        "from-emerald-500 to-teal-500",
        "from-amber-500 to-orange-500",
        "from-fuchsia-500 to-rose-500",
    ]

    def __init__(self) -> None:
        self._jobs: Dict[int, Dict[str, Any]] = {}
        self._results: Dict[int, Dict[str, Any]] = {}
        self._lock = Lock()

    def start_analysis(
        self, upload_id: int, background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        self._get_upload(upload_id)

        cached = self._load_cached_result(upload_id)
        if cached:
            self._hydrate_completed_job(upload_id)
            return self.get_status(upload_id)

        with self._lock:
            existing_job = self._jobs.get(upload_id)
            if existing_job and existing_job["status"] in {"queued", "processing", "completed"}:
                return deepcopy(existing_job)

            self._jobs[upload_id] = self._new_job(upload_id)

        self._update_upload_status(upload_id, "queued")

        if background_tasks is not None:
            background_tasks.add_task(self._run_analysis, upload_id)
        else:
            self._run_analysis(upload_id)

        return self.get_status(upload_id)

    def get_status(self, upload_id: int) -> Dict[str, Any]:
        cached = self._load_cached_result(upload_id)
        if cached:
            self._hydrate_completed_job(upload_id)

        with self._lock:
            job = self._jobs.get(upload_id)
            if job:
                return deepcopy(job)

        return self._new_job(upload_id, status="not_started", progress=0)

    def get_analysis(self, upload_id: int) -> Optional[Dict[str, Any]]:
        return self._load_cached_result(upload_id)

    def _new_job(
        self, upload_id: int, status: str = "queued", progress: int = 0
    ) -> Dict[str, Any]:
        return {
            "upload_id": upload_id,
            "status": status,
            "progress": progress,
            "message": "Analysis queued.",
            "error": None,
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "steps": [
                {**template, "status": "pending"} for template in self.STEP_TEMPLATES
            ],
        }

    def _hydrate_completed_job(self, upload_id: int) -> None:
        with self._lock:
            job = self._jobs.get(upload_id)
            if job and job["status"] == "completed":
                return

            completed_steps = []
            for template in self.STEP_TEMPLATES:
                completed_steps.append({**template, "status": "completed"})

            self._jobs[upload_id] = {
                "upload_id": upload_id,
                "status": "completed",
                "progress": 100,
                "message": "Analysis completed successfully.",
                "error": None,
                "started_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "steps": completed_steps,
            }

    def _set_job_state(
        self,
        upload_id: int,
        *,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.setdefault(upload_id, self._new_job(upload_id))
            if status is not None:
                job["status"] = status
            if progress is not None:
                job["progress"] = progress
            if message is not None:
                job["message"] = message
            if error is not None:
                job["error"] = error
            job["updated_at"] = datetime.utcnow().isoformat()

    def _set_step_status(self, upload_id: int, step_key: str, status: str) -> None:
        with self._lock:
            job = self._jobs.setdefault(upload_id, self._new_job(upload_id))
            for step in job["steps"]:
                if step["key"] == step_key:
                    step["status"] = status
                    break
            job["updated_at"] = datetime.utcnow().isoformat()

    def _advance_step(
        self, upload_id: int, step_key: str, progress: int, message: str
    ) -> None:
        self._set_job_state(
            upload_id, status="processing", progress=progress, message=message, error=None
        )
        self._set_step_status(upload_id, step_key, "in_progress")

    def _complete_step(self, upload_id: int, step_key: str) -> None:
        self._set_step_status(upload_id, step_key, "completed")

    def _run_analysis(self, upload_id: int) -> None:
        try:
            self._advance_step(upload_id, "load_data", 10, "Reading uploaded dataset.")
            upload = self._get_upload(upload_id)
            raw_df = read_file(upload.file_path, upload.file_type)
            if raw_df is None or raw_df.empty:
                raise ValueError("Uploaded file is empty or unsupported.")
            self._complete_step(upload_id, "load_data")

            self._advance_step(
                upload_id, "detect_schema", 25, "Detecting dates, numbers, and category fields."
            )
            prepared_df, column_summary = self._prepare_dataframe(raw_df)
            dataset = self._build_dataset_summary(prepared_df, column_summary, upload.filename)
            self._complete_step(upload_id, "detect_schema")

            self._advance_step(
                upload_id, "clean_values", 45, "Cleaning blanks, duplicates, and malformed values."
            )
            cleaned_df = self._clean_dataframe(prepared_df)
            cleaned_df, column_summary = self._prepare_dataframe(cleaned_df)
            dataset = self._build_dataset_summary(cleaned_df, column_summary, upload.filename)
            self._complete_step(upload_id, "clean_values")

            self._advance_step(upload_id, "build_kpis", 65, "Calculating KPI cards from the cleaned data.")
            kpis = self._build_kpis(cleaned_df, dataset)
            self._complete_step(upload_id, "build_kpis")

            self._advance_step(upload_id, "build_charts", 85, "Generating dynamic chart definitions.")
            charts = self._build_charts(cleaned_df, dataset)
            self._complete_step(upload_id, "build_charts")

            self._advance_step(upload_id, "finalize", 95, "Saving the generated analysis output.")
            result = self._to_native(
                {
                    "uploadId": upload_id,
                    "fileName": upload.filename,
                    "status": "completed",
                    "dataset": dataset,
                    "kpis": kpis,
                    "charts": charts,
                    "columnSummary": column_summary,
                }
            )
            self._save_result(upload_id, result)
            self._complete_step(upload_id, "finalize")
            self._set_job_state(
                upload_id,
                status="completed",
                progress=100,
                message="Analysis completed successfully.",
                error=None,
            )
            self._update_upload_status(upload_id, "processed")
        except Exception as exc:
            self._set_job_state(
                upload_id,
                status="failed",
                progress=100,
                message="Analysis failed.",
                error=str(exc),
            )
            self._update_upload_status(upload_id, "failed")

    def _get_upload(self, upload_id: int) -> Upload:
        db = SessionLocal()
        try:
            upload = db.query(Upload).filter(Upload.id == upload_id).first()
            if not upload:
                raise HTTPException(status_code=404, detail=f"Upload {upload_id} not found")
            return upload
        finally:
            db.close()

    def _update_upload_status(self, upload_id: int, status: str) -> None:
        db = SessionLocal()
        try:
            upload = db.query(Upload).filter(Upload.id == upload_id).first()
            if upload:
                upload.status = status
                db.commit()
        finally:
            db.close()

    def _result_path(self, upload_id: int) -> str:
        return os.path.join(PROCESSED_DIR, f"{upload_id}_analysis.json")

    def _load_cached_result(self, upload_id: int) -> Optional[Dict[str, Any]]:
        if upload_id in self._results:
            return deepcopy(self._results[upload_id])

        result_path = self._result_path(upload_id)
        if not os.path.exists(result_path):
            return None

        with open(result_path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)

        self._results[upload_id] = payload
        return deepcopy(payload)

    def _save_result(self, upload_id: int, payload: Dict[str, Any]) -> None:
        self._results[upload_id] = payload
        result_path = self._result_path(upload_id)
        with open(result_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=True, indent=2)

    def _prepare_dataframe(
        self, raw_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        df = raw_df.copy()
        df.columns = [str(column).strip() for column in df.columns]

        summary: List[Dict[str, Any]] = []

        for column in list(df.columns):
            series = df[column]
            cleaned_series = series
            column_type = "text"

            if pd.api.types.is_datetime64_any_dtype(series):
                column_type = "date"
            elif pd.api.types.is_numeric_dtype(series):
                column_type = "identifier" if self._is_identifier(column, series) else "numeric"
            else:
                date_series = self._try_parse_dates(column, series)
                numeric_series = self._try_parse_numeric(series)

                if date_series is not None:
                    cleaned_series = date_series
                    column_type = "date"
                elif numeric_series is not None:
                    cleaned_series = numeric_series
                    column_type = (
                        "identifier"
                        if self._is_identifier(column, numeric_series)
                        else "numeric"
                    )
                else:
                    unique_values = series.dropna().astype(str).nunique()
                    unique_ratio = unique_values / max(len(series.dropna()), 1)
                    column_type = "categorical" if unique_values <= 40 or unique_ratio <= 0.4 else "text"

            df[column] = cleaned_series
            summary.append(
                {
                    "name": column,
                    "type": column_type,
                    "nonNullCount": int(df[column].notna().sum()),
                    "uniqueCount": int(df[column].nunique(dropna=True)),
                    "sampleValues": [
                        self._stringify(value)
                        for value in df[column].dropna().head(3).tolist()
                    ],
                }
            )

        return df, summary

    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        cleaned = df.copy()
        cleaned = cleaned.dropna(axis=1, how="all")
        cleaned = cleaned.drop_duplicates()
        return cleaned.reset_index(drop=True)

    def _build_dataset_summary(
        self, df: pd.DataFrame, column_summary: List[Dict[str, Any]], filename: str
    ) -> Dict[str, Any]:
        numeric_columns = [column["name"] for column in column_summary if column["type"] == "numeric"]
        categorical_columns = [
            column["name"] for column in column_summary if column["type"] == "categorical"
        ]
        date_columns = [column["name"] for column in column_summary if column["type"] == "date"]

        total_cells = max(df.shape[0] * max(df.shape[1], 1), 1)
        filled_cells = int(df.notna().sum().sum())
        completeness = round((filled_cells / total_cells) * 100, 1)

        return {
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "datasetType": self._detect_dataset_type(df.columns.tolist(), filename),
            "completeness": completeness,
            "dateColumns": date_columns,
            "numericColumns": numeric_columns,
            "categoricalColumns": categorical_columns,
        }

    def _build_kpis(self, df: pd.DataFrame, dataset: Dict[str, Any]) -> Dict[str, Any]:
        numeric_columns = dataset["numericColumns"]
        categorical_columns = dataset["categoricalColumns"]

        rows = int(dataset["rows"])
        completeness = float(dataset["completeness"])
        cards: List[Dict[str, Any]] = [
            {
                "id": "rows",
                "title": "Rows",
                "value": rows,
                "unit": "number",
                "subtitle": f"{dataset['columns']} columns detected",
                "color": self.KPI_COLORS[0],
            },
            {
                "id": "completeness",
                "title": "Completeness",
                "value": completeness,
                "unit": "percentage",
                "subtitle": "Filled cells across the full dataset",
                "color": self.KPI_COLORS[1],
            },
        ]

        primary_metric = self._pick_primary_metric(df, numeric_columns)
        primary_category = self._pick_primary_category(df, categorical_columns)

        if primary_metric is not None:
            cards.append(
                {
                    "id": "primary_total",
                    "title": f"Total {primary_metric}",
                    "value": float(df[primary_metric].fillna(0).sum()),
                    "unit": "currency" if self._looks_currency(primary_metric) else "number",
                    "subtitle": f"Aggregated from the {primary_metric} column",
                    "color": self.KPI_COLORS[2],
                }
            )
        else:
            cards.append(
                {
                    "id": "numeric_fields",
                    "title": "Numeric Fields",
                    "value": len(numeric_columns),
                    "unit": "number",
                    "subtitle": "Measures available for analysis",
                    "color": self.KPI_COLORS[2],
                }
            )

        if primary_category is not None:
            cards.append(
                {
                    "id": "categories",
                    "title": f"Unique {primary_category}",
                    "value": int(df[primary_category].nunique(dropna=True)),
                    "unit": "number",
                    "subtitle": f"Distinct values in {primary_category}",
                    "color": self.KPI_COLORS[3],
                }
            )
        else:
            cards.append(
                {
                    "id": "dates",
                    "title": "Date Fields",
                    "value": len(dataset["dateColumns"]),
                    "unit": "number",
                    "subtitle": "Timeline columns detected automatically",
                    "color": self.KPI_COLORS[3],
                }
            )

        sales_column = self._find_metric_by_keywords(
            numeric_columns, ["sales", "revenue", "income", "amount"]
        )
        expense_column = self._find_metric_by_keywords(
            numeric_columns, ["expense", "cost", "spend", "payment"]
        )
        profit_column = self._find_metric_by_keywords(
            numeric_columns, ["profit", "margin", "net"]
        )

        total_sales = self._sum_column(df, sales_column)
        total_expenses = self._sum_column(df, expense_column)
        profit = self._sum_column(df, profit_column)

        if profit == 0 and total_sales and total_expenses:
            profit = total_sales - total_expenses

        return {
            "totalSales": total_sales or self._sum_column(df, primary_metric),
            "totalExpenses": total_expenses,
            "profit": profit,
            "totalTransactions": rows,
            "cards": cards[:4],
        }

    def _build_charts(self, df: pd.DataFrame, dataset: Dict[str, Any]) -> List[Dict[str, Any]]:
        charts: List[Dict[str, Any]] = []
        numeric_columns: List[str] = dataset["numericColumns"]
        categorical_columns: List[str] = dataset["categoricalColumns"]
        date_columns: List[str] = dataset["dateColumns"]

        primary_metric = self._pick_primary_metric(df, numeric_columns)
        secondary_metric = self._pick_secondary_metric(df, numeric_columns, primary_metric)
        primary_category = self._pick_primary_category(df, categorical_columns)
        primary_date = date_columns[0] if date_columns else None

        if primary_date and primary_metric:
            chart = self._build_time_series_chart(
                df, primary_date, [metric for metric in [primary_metric, secondary_metric] if metric]
            )
            if chart:
                charts.append(chart)

        if primary_category and primary_metric:
            bar_chart = self._build_category_bar_chart(df, primary_category, primary_metric)
            if bar_chart:
                charts.append(bar_chart)

            pie_chart = self._build_category_pie_chart(df, primary_category, primary_metric)
            if pie_chart:
                charts.append(pie_chart)

        if primary_metric and secondary_metric:
            scatter_chart = self._build_scatter_chart(df, primary_metric, secondary_metric)
            if scatter_chart:
                charts.append(scatter_chart)

            correlation_chart = self._build_correlation_chart(
                df, primary_metric, dataset["numericColumns"]
            )
            if correlation_chart:
                charts.append(correlation_chart)

        if primary_metric:
            distribution_chart = self._build_distribution_chart(df, primary_metric)
            if distribution_chart:
                charts.append(distribution_chart)

        if not charts and primary_category:
            fallback = self._build_frequency_chart(df, primary_category)
            if fallback:
                charts.append(fallback)

        if not charts:
            charts.append(self._build_empty_chart(dataset))

        return charts[:6]

    def _build_time_series_chart(
        self, df: pd.DataFrame, date_column: str, metrics: List[str]
    ) -> Optional[Dict[str, Any]]:
        if not metrics:
            return None

        frame = df[[date_column] + metrics].dropna(subset=[date_column]).copy()
        if frame.empty:
            return None

        frame[date_column] = pd.to_datetime(frame[date_column], errors="coerce")
        frame = frame.dropna(subset=[date_column])
        if frame.empty:
            return None

        date_range = frame[date_column].max() - frame[date_column].min()
        if date_range.days > 180:
            frame["label"] = frame[date_column].dt.to_period("M").astype(str)
        elif date_range.days > 45:
            frame["label"] = frame[date_column].dt.to_period("W").astype(str)
        else:
            frame["label"] = frame[date_column].dt.strftime("%Y-%m-%d")

        grouped = frame.groupby("label")[metrics].sum().reset_index().head(24)
        if grouped.empty:
            return None

        y_keys: List[str] = []
        series_labels: Dict[str, str] = {}
        records: List[Dict[str, Any]] = []

        for index, metric in enumerate(metrics, start=1):
            key = f"metric_{index}"
            y_keys.append(key)
            series_labels[key] = metric

        for _, row in grouped.iterrows():
            item = {"label": str(row["label"])}
            for index, metric in enumerate(metrics, start=1):
                item[f"metric_{index}"] = float(row[metric])
            records.append(item)

        metrics_label = ", ".join(metrics)
        return {
            "id": f"time_{self._slug(date_column)}",
            "title": f"{metrics[0]} trend over time",
            "chartType": "line",
            "description": f"This chart tracks {metrics_label} across the detected date column.",
            "caption": f"Grouped by {date_column} to highlight change over time.",
            "data": records,
            "xKey": "label",
            "yKeys": y_keys,
            "seriesLabels": series_labels,
        }

    def _build_category_bar_chart(
        self, df: pd.DataFrame, category_column: str, metric: str
    ) -> Optional[Dict[str, Any]]:
        frame = df[[category_column, metric]].dropna()
        if frame.empty:
            return None

        grouped = (
            frame.groupby(category_column)[metric]
            .sum()
            .sort_values(ascending=False)
            .head(10)
            .reset_index()
        )
        if grouped.empty:
            return None

        records = [
            {"label": self._stringify(row[category_column]), "metric_1": float(row[metric])}
            for _, row in grouped.iterrows()
        ]
        return {
            "id": f"bar_{self._slug(category_column)}_{self._slug(metric)}",
            "title": f"{metric} by {category_column}",
            "chartType": "bar",
            "description": f"This chart compares total {metric} across each {category_column}.",
            "caption": f"Top {len(records)} {category_column} values ranked by aggregated {metric}.",
            "data": records,
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": metric},
        }

    def _build_category_pie_chart(
        self, df: pd.DataFrame, category_column: str, metric: str
    ) -> Optional[Dict[str, Any]]:
        frame = df[[category_column, metric]].dropna()
        if frame.empty:
            return None

        grouped = (
            frame.groupby(category_column)[metric]
            .sum()
            .sort_values(ascending=False)
            .head(8)
            .reset_index()
        )
        if grouped.empty:
            return None

        records = [
            {"label": self._stringify(row[category_column]), "metric_1": float(row[metric])}
            for _, row in grouped.iterrows()
        ]
        return {
            "id": f"pie_{self._slug(category_column)}_{self._slug(metric)}",
            "title": f"{metric} share by {category_column}",
            "chartType": "pie",
            "description": f"This chart shows which {category_column} values contribute most to {metric}.",
            "caption": f"Each slice represents that category's share of total {metric}.",
            "data": records,
            "nameKey": "label",
            "valueKey": "metric_1",
            "seriesLabels": {"metric_1": metric},
        }

    def _build_scatter_chart(
        self, df: pd.DataFrame, x_metric: str, y_metric: str
    ) -> Optional[Dict[str, Any]]:
        frame = df[[x_metric, y_metric]].dropna().head(500)
        if frame.empty:
            return None

        records = [
            {"x_value": float(row[x_metric]), "y_value": float(row[y_metric])}
            for _, row in frame.iterrows()
        ]
        return {
            "id": f"scatter_{self._slug(x_metric)}_{self._slug(y_metric)}",
            "title": f"{y_metric} vs {x_metric}",
            "chartType": "scatter",
            "description": f"This chart shows how {x_metric} and {y_metric} move together.",
            "caption": "Use it to spot relationships, clusters, and outliers in numeric values.",
            "data": records,
            "xKey": "x_value",
            "yKeys": ["y_value"],
            "seriesLabels": {"y_value": y_metric},
            "xLabel": x_metric,
            "yLabel": y_metric,
        }

    def _build_correlation_chart(
        self, df: pd.DataFrame, primary_metric: str, numeric_columns: List[str]
    ) -> Optional[Dict[str, Any]]:
        if len(numeric_columns) < 2:
            return None

        correlation_frame = df[numeric_columns].corr(numeric_only=True)
        if primary_metric not in correlation_frame.columns:
            return None

        correlations = (
            correlation_frame[primary_metric]
            .drop(labels=[primary_metric], errors="ignore")
            .dropna()
            .sort_values(key=lambda values: values.abs(), ascending=False)
            .head(6)
        )
        if correlations.empty:
            return None

        records = [
            {"label": column, "metric_1": float(value)}
            for column, value in correlations.items()
        ]
        return {
            "id": f"corr_{self._slug(primary_metric)}",
            "title": f"Correlation with {primary_metric}",
            "chartType": "bar",
            "description": f"This chart shows which numeric fields change most closely with {primary_metric}.",
            "caption": "Bars closer to 1 or -1 indicate stronger relationships.",
            "data": records,
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": "Correlation"},
        }

    def _build_distribution_chart(
        self, df: pd.DataFrame, metric: str
    ) -> Optional[Dict[str, Any]]:
        series = df[metric].dropna()
        if series.empty:
            return None

        bins = min(8, max(4, int(math.sqrt(len(series)))))
        counts, edges = np.histogram(series, bins=bins)
        records: List[Dict[str, Any]] = []
        for index in range(len(counts)):
            left = round(float(edges[index]), 2)
            right = round(float(edges[index + 1]), 2)
            records.append({"label": f"{left} - {right}", "metric_1": int(counts[index])})

        return {
            "id": f"dist_{self._slug(metric)}",
            "title": f"{metric} distribution",
            "chartType": "bar",
            "description": f"This chart shows how values in {metric} are distributed across ranges.",
            "caption": "Higher bars mean more rows fall within that value band.",
            "data": records,
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": "Row count"},
        }

    def _build_frequency_chart(self, df: pd.DataFrame, category_column: str) -> Optional[Dict[str, Any]]:
        series = df[category_column].dropna()
        if series.empty:
            return None

        counts = series.astype(str).value_counts().head(10)
        records = [
            {"label": label, "metric_1": int(count)}
            for label, count in counts.items()
        ]
        return {
            "id": f"freq_{self._slug(category_column)}",
            "title": f"{category_column} frequency",
            "chartType": "bar",
            "description": f"This chart shows how often each {category_column} value appears.",
            "caption": "Useful when the dataset has categories but limited numeric measures.",
            "data": records,
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": "Rows"},
        }

    def _build_empty_chart(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": "empty_chart",
            "title": "Dataset summary",
            "chartType": "bar",
            "description": "The dataset does not have enough structured numeric or date fields for advanced charts yet.",
            "caption": "Upload a file with at least one numeric field to unlock richer visualizations.",
            "data": [
                {"label": "Rows", "metric_1": dataset["rows"]},
                {"label": "Columns", "metric_1": dataset["columns"]},
            ],
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": "Count"},
        }

    def _pick_primary_metric(self, df: pd.DataFrame, numeric_columns: List[str]) -> Optional[str]:
        if not numeric_columns:
            return None

        ranked = sorted(
            numeric_columns,
            key=lambda column: (
                self._metric_priority(column),
                abs(float(df[column].fillna(0).sum())),
                df[column].notna().sum(),
            ),
            reverse=True,
        )
        return ranked[0]

    def _pick_secondary_metric(
        self, df: pd.DataFrame, numeric_columns: List[str], primary_metric: Optional[str]
    ) -> Optional[str]:
        if not primary_metric:
            return None

        candidates = [column for column in numeric_columns if column != primary_metric]
        if not candidates:
            return None

        ranked = sorted(
            candidates,
            key=lambda column: (
                self._metric_priority(column),
                abs(float(df[column].fillna(0).sum())),
            ),
            reverse=True,
        )
        return ranked[0]

    def _pick_primary_category(
        self, df: pd.DataFrame, categorical_columns: List[str]
    ) -> Optional[str]:
        if not categorical_columns:
            return None

        ranked = sorted(
            categorical_columns,
            key=lambda column: (
                -abs(df[column].nunique(dropna=True) - 8),
                df[column].notna().sum(),
            ),
            reverse=True,
        )
        return ranked[0]

    def _metric_priority(self, column_name: str) -> int:
        normalized = column_name.lower()
        score = 0
        keyword_weights = {
            "sales": 6,
            "revenue": 6,
            "income": 5,
            "amount": 5,
            "expense": 5,
            "cost": 4,
            "profit": 6,
            "margin": 4,
            "value": 3,
            "price": 3,
            "quantity": 2,
        }
        for keyword, weight in keyword_weights.items():
            if keyword in normalized:
                score += weight
        return score

    def _find_metric_by_keywords(
        self, columns: List[str], keywords: List[str]
    ) -> Optional[str]:
        for column in columns:
            normalized = column.lower()
            if any(keyword in normalized for keyword in keywords):
                return column
        return None

    def _sum_column(self, df: pd.DataFrame, column: Optional[str]) -> float:
        if column is None or column not in df.columns:
            return 0.0
        return float(df[column].fillna(0).sum())

    def _try_parse_dates(self, column_name: str, series: pd.Series) -> Optional[pd.Series]:
        non_null = series.dropna()
        if non_null.empty:
            return None

        column_hint = column_name.lower()
        sample = non_null.astype(str).head(20)
        likely_date_pattern = sample.str.contains(r"\d{1,4}[-/]\d{1,2}[-/]\d{1,4}", regex=True).mean()

        if likely_date_pattern < 0.5 and not any(
            token in column_hint for token in ["date", "time", "month", "year"]
        ):
            return None

        parsed = pd.to_datetime(series, errors="coerce")
        success_ratio = float(parsed.notna().sum()) / max(len(non_null), 1)

        if any(token in column_hint for token in ["date", "time", "month", "year"]):
            return parsed if success_ratio >= 0.5 else None

        return parsed if success_ratio >= 0.8 else None

    def _try_parse_numeric(self, series: pd.Series) -> Optional[pd.Series]:
        non_null = series.dropna()
        if non_null.empty:
            return None

        normalized = (
            series.astype(str)
            .str.strip()
            .str.replace(r"[\$,]", "", regex=True)
            .str.replace("%", "", regex=False)
            .str.replace(r"^\((.*)\)$", r"-\1", regex=True)
        )
        parsed = pd.to_numeric(normalized, errors="coerce")
        success_ratio = float(parsed.notna().sum()) / max(len(non_null), 1)
        return parsed if success_ratio >= 0.8 else None

    def _is_identifier(self, column_name: str, series: pd.Series) -> bool:
        normalized = column_name.lower()
        identifier_tokens = ["id", "code", "number", "no", "zip", "postal", "postcode", "sku"]
        measure_tokens = self.CURRENCY_KEYWORDS + ["quantity", "units", "margin", "rate", "score"]

        if any(token in normalized for token in identifier_tokens):
            return True
        if any(token in normalized for token in measure_tokens):
            return False

        non_null = series.dropna()
        if non_null.empty:
            return False

        unique_ratio = float(non_null.nunique()) / max(len(non_null), 1)
        all_integer_like = bool((non_null % 1 == 0).all()) if pd.api.types.is_numeric_dtype(non_null) else False

        # For small accounting datasets, sales or expense values can be fully unique integers.
        # Avoid treating them as identifiers unless the signal is extremely strong.
        if len(non_null) < 25:
            return False

        return unique_ratio >= 0.995 and all_integer_like

    def _detect_dataset_type(self, columns: List[str], filename: str) -> str:
        search_space = " ".join(columns + [filename]).lower()
        best_label = "general"
        best_score = 0

        for label, keywords in self.DATASET_TYPE_KEYWORDS.items():
            score = sum(search_space.count(keyword) for keyword in keywords)
            if score > best_score:
                best_label = label
                best_score = score

        return best_label

    def _looks_currency(self, column_name: str) -> bool:
        normalized = column_name.lower()
        return any(keyword in normalized for keyword in self.CURRENCY_KEYWORDS)

    def _slug(self, value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")

    def _stringify(self, value: Any) -> str:
        if isinstance(value, pd.Timestamp):
            return value.isoformat()
        if pd.isna(value):
            return ""
        return str(value)

    def _to_native(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: self._to_native(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._to_native(item) for item in value]
        if isinstance(value, tuple):
            return [self._to_native(item) for item in value]
        if isinstance(value, pd.Timestamp):
            return value.isoformat()
        if isinstance(value, np.generic):
            return value.item()
        return value


realtime_analysis_service = RealtimeAnalysisService()
