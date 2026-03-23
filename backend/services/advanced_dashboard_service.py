from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from backend.services.realtime_analysis_service import realtime_analysis_service
from backend.utils.file_reader import read_file


class AdvancedDashboardService:
    def build_dashboard(self, upload_id: int, request: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        upload = realtime_analysis_service._get_upload(upload_id)
        raw_df = read_file(upload.file_path, upload.file_type)
        if raw_df is None or raw_df.empty:
            raise ValueError("Uploaded file is empty or unsupported.")

        prepared_df, _ = realtime_analysis_service._prepare_dataframe(raw_df)
        quality_report = self._build_quality_report(prepared_df)
        cleaning_request = self._normalize_cleaning((request or {}).get("cleaning", {}))
        transformation_request = self._normalize_transformations(
            (request or {}).get("transformations", {}),
            prepared_df.columns.tolist(),
        )
        current_df = self._apply_cleaning(prepared_df, cleaning_request)
        current_df = self._apply_transformations(current_df, transformation_request)
        current_df = self._add_derived_metrics(current_df)
        current_df, current_column_summary = realtime_analysis_service._prepare_dataframe(current_df)
        current_dataset = realtime_analysis_service._build_dataset_summary(
            current_df, current_column_summary, upload.filename
        )
        normalized_request = self._normalize_request(
            {
                **(request or {}),
                "cleaning": cleaning_request,
                "transformations": transformation_request,
            },
            current_dataset,
        )
        external_comparison_df, external_comparison = self._build_external_upload_comparison(
            normalized_request["workspace"],
            normalized_request["cleaning"],
        )
        analysis_df = current_df
        analysis_column_summary = current_column_summary
        analysis_dataset = current_dataset
        merge_summary = self._build_merge_summary(normalized_request["workspace"])
        join_summary = self._build_join_summary(normalized_request["workspace"])

        if normalized_request["workspace"]["mode"] == "append":
            analysis_df, merge_summary = self._append_workspace_data(
                current_df,
                external_comparison_df,
                external_comparison,
            )
            analysis_df, analysis_column_summary = realtime_analysis_service._prepare_dataframe(analysis_df)
            analysis_dataset = realtime_analysis_service._build_dataset_summary(
                analysis_df, analysis_column_summary, upload.filename
            )
            normalized_request = self._normalize_request(normalized_request, analysis_dataset)
        elif normalized_request["workspace"]["mode"] == "join":
            analysis_df, join_summary = self._join_workspace_data(
                current_df,
                external_comparison_df,
                external_comparison,
                normalized_request["workspace"],
            )
            analysis_df, analysis_column_summary = realtime_analysis_service._prepare_dataframe(analysis_df)
            analysis_dataset = realtime_analysis_service._build_dataset_summary(
                analysis_df, analysis_column_summary, upload.filename
            )
            normalized_request = self._normalize_request(normalized_request, analysis_dataset)

        analysis_df = self._add_derived_metrics(analysis_df)
        analysis_df, analysis_column_summary = realtime_analysis_service._prepare_dataframe(analysis_df)
        analysis_dataset = realtime_analysis_service._build_dataset_summary(
            analysis_df, analysis_column_summary, upload.filename
        )
        normalized_request = self._normalize_request(normalized_request, analysis_dataset)

        filtered_df = self._apply_filters(analysis_df, normalized_request)
        filtered_df = self._add_derived_metrics(filtered_df)
        filtered_dataset = realtime_analysis_service._build_dataset_summary(
            filtered_df, analysis_column_summary, upload.filename
        )

        preferences = normalized_request["preferences"]
        filter_options = self._build_filter_options(analysis_df, analysis_dataset)
        numeric_summary = self._build_numeric_summary(filtered_df, filtered_dataset["numericColumns"])
        comparison = self._build_comparison(
            analysis_df, filtered_df, normalized_request, preferences, external_comparison
        )
        charts, anomalies = self._build_charts_and_anomalies(
            analysis_df,
            filtered_df,
            filtered_dataset,
            normalized_request,
            preferences,
            comparison,
            external_comparison_df,
            external_comparison,
        )
        insights = self._build_insights(
            filtered_df,
            filtered_dataset,
            preferences,
            comparison,
            anomalies,
            numeric_summary,
            external_comparison,
            merge_summary,
        )
        custom_chart = self._build_custom_chart(filtered_df, normalized_request, filtered_dataset)
        if custom_chart:
            charts = [custom_chart] + charts
        charts = self._prioritize_charts(charts, normalized_request)[:6]
        kpis = realtime_analysis_service._build_kpis(filtered_df, filtered_dataset)
        kpis = self._augment_kpis_for_role(
            kpis,
            preferences["dashboardRole"],
            quality_report,
            filtered_df,
            normalized_request,
        )
        forecast = self._build_forecast_summary(filtered_df, normalized_request, preferences)
        target_tracking = self._build_target_tracking(filtered_df, normalized_request, preferences)
        benchmark = self._build_benchmark_summary(
            filtered_df,
            normalized_request,
            preferences,
            external_comparison,
        )
        alerts = self._build_alerts(
            quality_report,
            anomalies,
            comparison,
            merge_summary,
            forecast,
            target_tracking,
            benchmark,
        )
        drillthrough = self._build_drillthrough(filtered_df, analysis_column_summary, normalized_request)
        narrative = self._build_narrative(
            filtered_df,
            filtered_dataset,
            preferences,
            comparison,
            anomalies,
            quality_report,
            target_tracking,
            merge_summary,
            join_summary,
            benchmark,
        )
        preview = self._build_preview(filtered_df, analysis_column_summary)

        filtered_dataset["filteredRows"] = int(filtered_df.shape[0])
        filtered_dataset["activeMetric"] = preferences["metric"]
        filtered_dataset["activeSecondaryMetric"] = preferences["secondaryMetric"]
        filtered_dataset["activeCategoryColumn"] = normalized_request["filters"]["categoryColumn"]
        filtered_dataset["activeDateColumn"] = normalized_request["filters"]["dateColumn"]
        filtered_dataset["dashboardRole"] = preferences["dashboardRole"]

        return realtime_analysis_service._to_native(
            {
                "uploadId": upload_id,
                "fileName": upload.filename,
                "status": "completed",
                "dataset": filtered_dataset,
                "kpis": kpis,
                "charts": charts,
                "columnSummary": analysis_column_summary,
                "filterOptions": filter_options,
                "numericSummary": numeric_summary,
                "insightCards": insights,
                "anomalies": anomalies,
                "comparison": comparison,
                "externalComparison": external_comparison,
                "mergeSummary": merge_summary,
                "joinSummary": join_summary,
                "benchmark": benchmark,
                "alerts": alerts,
                "forecast": forecast,
                "targetTracking": target_tracking,
                "narrative": narrative,
                "drillthrough": drillthrough,
                "qualityReport": quality_report,
                "dataPreview": preview,
                "activeRequest": normalized_request,
            }
        )

    def _add_derived_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        enriched = df.copy()
        numeric_columns = [
            column
            for column in enriched.columns
            if pd.api.types.is_numeric_dtype(enriched[column])
        ]
        sales_column = realtime_analysis_service._find_metric_by_keywords(
            numeric_columns, ["sales", "revenue", "income", "amount"]
        )
        expense_column = realtime_analysis_service._find_metric_by_keywords(
            numeric_columns, ["expense", "cost", "spend", "payment"]
        )
        profit_column = realtime_analysis_service._find_metric_by_keywords(
            numeric_columns, ["profit", "margin", "net"]
        )

        if not profit_column and sales_column and expense_column:
            enriched["Profit"] = enriched[sales_column].fillna(0) - enriched[expense_column].fillna(0)

        return enriched

    def _prioritize_charts(
        self,
        charts: List[Dict[str, Any]],
        request: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        preferred_type = request.get("preferences", {}).get("chartPreference", "auto")
        active_chart_type = request.get("chartBuilder", {}).get("chartType")
        has_category_focus = bool(
            request.get("filters", {}).get("categoryColumn")
            or request.get("filters", {}).get("categories")
            or request.get("filters", {}).get("drilldownValue")
        )
        has_date_focus = bool(request.get("filters", {}).get("dateColumn"))

        def score(chart: Dict[str, Any]) -> tuple[int, str]:
            chart_score = 0
            role = chart.get("role")
            chart_type = chart.get("chartType")

            if chart.get("id") == "custom_chart" or role == "custom":
                chart_score += 200
            if request.get("scenario", {}).get("enabled") and role in {"trend", "custom"}:
                chart_score += 120
            if request.get("targets", {}).get("enabled") and role in {"trend", "custom"}:
                chart_score += 90
            if request.get("preferences", {}).get("compareMode") and role == "trend":
                chart_score += 85
            if preferred_type != "auto" and chart_type == preferred_type:
                chart_score += 60
            if active_chart_type and chart_type == active_chart_type:
                chart_score += 40
            if has_category_focus and role in {"breakdown", "share", "custom"}:
                chart_score += 35
            if has_date_focus and role == "trend":
                chart_score += 25
            if role == "relationship":
                chart_score += 10
            if role == "distribution":
                chart_score -= 5

            return chart_score, chart.get("title", "")

        return sorted(charts, key=score, reverse=True)

    def _normalize_cleaning(self, cleaning: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "dropDuplicates": bool(cleaning.get("dropDuplicates", True)),
            "removeEmptyColumns": bool(cleaning.get("removeEmptyColumns", True)),
            "trimText": bool(cleaning.get("trimText", True)),
            "numericNullStrategy": cleaning.get("numericNullStrategy", "keep"),
            "textNullStrategy": cleaning.get("textNullStrategy", "keep"),
        }

    def _normalize_transformations(
        self,
        transformations: Dict[str, Any],
        columns: List[str],
    ) -> Dict[str, Any]:
        rename_columns: List[Dict[str, str]] = []
        seen_sources: set[str] = set()
        seen_targets: set[str] = set(columns)

        for item in transformations.get("renameColumns", []):
            source = item.get("source")
            target = str(item.get("target", "")).strip()
            if (
                source in columns
                and source not in seen_sources
                and target
                and target not in seen_targets
                and target != source
            ):
                rename_columns.append({"source": source, "target": target})
                seen_sources.add(source)
                seen_targets.add(target)

        return {"renameColumns": rename_columns}

    def _normalize_request(
        self, request: Optional[Dict[str, Any]], dataset: Dict[str, Any]
    ) -> Dict[str, Any]:
        payload = request or {}
        filters = payload.get("filters", {})
        preferences = payload.get("preferences", {})
        cleaning = self._normalize_cleaning(payload.get("cleaning", {}))
        workspace = payload.get("workspace", {})
        transformations = payload.get("transformations", {})

        date_columns = dataset["dateColumns"]
        numeric_columns = dataset["numericColumns"]
        categorical_columns = dataset["categoricalColumns"]
        all_columns = date_columns + numeric_columns + categorical_columns

        metric = preferences.get("metric")
        if metric not in numeric_columns:
            metric = numeric_columns[0] if numeric_columns else None

        secondary_metric = preferences.get("secondaryMetric")
        if secondary_metric == metric or secondary_metric not in numeric_columns:
            secondary_metric = numeric_columns[1] if len(numeric_columns) > 1 else None

        date_column = filters.get("dateColumn")
        if date_column not in date_columns:
            date_column = date_columns[0] if date_columns else None

        category_column = filters.get("categoryColumn")
        if category_column not in categorical_columns:
            category_column = categorical_columns[0] if categorical_columns else None

        categories = filters.get("categories") or []
        if isinstance(categories, str):
            categories = [categories]

        workspace_mode = workspace.get("mode", "compare")
        if workspace_mode not in {"compare", "append", "join", "benchmark"}:
            workspace_mode = "compare"

        join_type = workspace.get("joinType", "inner")
        if join_type not in {"inner", "left", "outer"}:
            join_type = "inner"

        chart_builder_payload = payload.get("chartBuilder", {})
        chart_builder_x = chart_builder_payload.get("xColumn")
        if chart_builder_x not in all_columns:
            chart_builder_x = date_column or category_column or metric

        chart_builder_type = chart_builder_payload.get("chartType", "bar")
        if chart_builder_type not in {"bar", "line", "pie", "scatter"}:
            chart_builder_type = "bar"

        target_payload = payload.get("targets", {})
        target_metric = target_payload.get("metric")
        if target_metric not in numeric_columns:
            target_metric = metric

        rename_columns = [
            {
                "source": str(item.get("source")),
                "target": str(item.get("target")).strip(),
            }
            for item in transformations.get("renameColumns", [])
            if item.get("source") and item.get("target")
        ]

        return {
            "filters": {
                "dateColumn": date_column,
                "startDate": filters.get("startDate") or "",
                "endDate": filters.get("endDate") or "",
                "categoryColumn": category_column,
                "categories": categories,
                "drilldownColumn": filters.get("drilldownColumn"),
                "drilldownValue": filters.get("drilldownValue") or "",
            },
            "preferences": {
                "metric": metric,
                "secondaryMetric": secondary_metric,
                "aggregation": preferences.get("aggregation", "sum"),
                "granularity": preferences.get("granularity", "auto"),
                "topN": max(3, min(int(preferences.get("topN", 8)), 20)),
                "sortOrder": preferences.get("sortOrder", "desc"),
                "compareMode": bool(preferences.get("compareMode", False)),
                "dashboardRole": preferences.get("dashboardRole", "analyst"),
                "chartPreference": (
                    preferences.get("chartPreference", "auto")
                    if preferences.get("chartPreference", "auto") in {"auto", "line", "bar", "pie", "scatter"}
                    else "auto"
                ),
            },
            "cleaning": cleaning,
            "workspace": {
                "compareUploadId": int(workspace["compareUploadId"]) if workspace.get("compareUploadId") else None,
                "mode": workspace_mode,
                "joinKeys": [
                    key
                    for key in workspace.get("joinKeys", [])
                    if key in all_columns
                ],
                "joinType": join_type,
            },
            "chartBuilder": {
                "enabled": bool(chart_builder_payload.get("enabled", False)),
                "chartType": chart_builder_type,
                "xColumn": chart_builder_x,
                "yColumns": [
                    column
                    for column in chart_builder_payload.get("yColumns", [])
                    if column in numeric_columns
                ][:2],
                "title": chart_builder_payload.get("title", ""),
            },
            "scenario": {
                "enabled": bool(payload.get("scenario", {}).get("enabled", False)),
                "metric": (
                    payload.get("scenario", {}).get("metric")
                    if payload.get("scenario", {}).get("metric") in numeric_columns
                    else metric
                ),
                "adjustmentPercent": float(payload.get("scenario", {}).get("adjustmentPercent", 10)),
            },
            "targets": {
                "enabled": bool(target_payload.get("enabled", False)),
                "metric": target_metric,
                "targetValue": float(target_payload.get("targetValue", 0)),
            },
            "transformations": {
                "renameColumns": rename_columns,
            },
        }

    def _apply_filters(self, df: pd.DataFrame, request: Dict[str, Any]) -> pd.DataFrame:
        filtered = df.copy()
        filters = request["filters"]

        date_column = filters["dateColumn"]
        if date_column and date_column in filtered.columns:
            date_series = pd.to_datetime(filtered[date_column], errors="coerce")
            if filters.get("startDate"):
                filtered = filtered[date_series >= pd.to_datetime(filters["startDate"])]
                date_series = pd.to_datetime(filtered[date_column], errors="coerce")
            if filters.get("endDate"):
                filtered = filtered[date_series <= pd.to_datetime(filters["endDate"])]

        category_column = filters["categoryColumn"]
        categories = filters.get("categories") or []
        if category_column and category_column in filtered.columns and categories:
            normalized = filtered[category_column].astype(str)
            filtered = filtered[normalized.isin([str(item) for item in categories])]

        drilldown_column = filters.get("drilldownColumn")
        drilldown_value = filters.get("drilldownValue")
        if drilldown_column and drilldown_value and drilldown_column in filtered.columns:
            filtered = filtered[filtered[drilldown_column].astype(str) == str(drilldown_value)]

        return filtered.reset_index(drop=True)

    def _apply_cleaning(self, df: pd.DataFrame, cleaning: Dict[str, Any]) -> pd.DataFrame:
        cleaned = df.copy()

        if cleaning.get("trimText"):
            for column in cleaned.columns:
                if cleaned[column].dtype == object:
                    cleaned[column] = cleaned[column].map(
                        lambda value: value.strip() if isinstance(value, str) else value
                    )

        if cleaning.get("numericNullStrategy") in {"zero", "mean"}:
            numeric_columns = [
                column
                for column in cleaned.columns
                if pd.api.types.is_numeric_dtype(cleaned[column])
            ]
            for column in numeric_columns:
                if cleaning["numericNullStrategy"] == "zero":
                    cleaned[column] = cleaned[column].fillna(0)
                elif cleaned[column].notna().any():
                    cleaned[column] = cleaned[column].fillna(cleaned[column].mean())

        if cleaning.get("textNullStrategy") == "empty":
            for column in cleaned.columns:
                if cleaned[column].dtype == object:
                    cleaned[column] = cleaned[column].fillna("")
        elif cleaning.get("textNullStrategy") == "drop":
            object_columns = [column for column in cleaned.columns if cleaned[column].dtype == object]
            if object_columns:
                cleaned = cleaned.dropna(subset=object_columns)

        if cleaning.get("removeEmptyColumns"):
            cleaned = cleaned.dropna(axis=1, how="all")

        if cleaning.get("dropDuplicates"):
            cleaned = cleaned.drop_duplicates()

        return cleaned.reset_index(drop=True)

    def _apply_transformations(
        self,
        df: pd.DataFrame,
        transformations: Dict[str, Any],
    ) -> pd.DataFrame:
        renamed = df.copy()
        rename_map = {
            item["source"]: item["target"]
            for item in transformations.get("renameColumns", [])
            if item.get("source") in renamed.columns and item.get("target")
        }
        if rename_map:
            renamed = renamed.rename(columns=rename_map)
        return renamed

    def _build_quality_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        duplicate_rows = int(df.duplicated().sum())
        empty_columns = [column for column in df.columns if df[column].isna().all()]
        high_null_columns = [
            {
                "column": column,
                "nullPercent": round(float(df[column].isna().mean() * 100), 1),
            }
            for column in df.columns
            if df[column].isna().mean() >= 0.2
        ]
        high_null_columns = sorted(high_null_columns, key=lambda item: item["nullPercent"], reverse=True)[:6]
        coercion_candidates: List[Dict[str, str]] = []
        recommendations: List[str] = []

        for column in df.columns:
            if df[column].dtype != object:
                continue

            sample_series = df[column].dropna().astype(str)
            if sample_series.empty:
                continue

            numeric_ratio = float(pd.to_numeric(sample_series, errors="coerce").notna().mean())
            date_ratio = float(pd.to_datetime(sample_series, errors="coerce").notna().mean())
            if numeric_ratio >= 0.7:
                coercion_candidates.append(
                    {
                        "column": column,
                        "suggestedType": "number",
                        "sample": sample_series.iloc[0],
                    }
                )
            elif date_ratio >= 0.7:
                coercion_candidates.append(
                    {
                        "column": column,
                        "suggestedType": "date",
                        "sample": sample_series.iloc[0],
                    }
                )

        if duplicate_rows:
            recommendations.append("Remove duplicate rows before exporting summaries.")
        if empty_columns:
            recommendations.append("Drop completely empty columns to simplify the schema.")
        if high_null_columns:
            recommendations.append("Review high-null columns and apply fill or drop strategies.")
        if coercion_candidates:
            recommendations.append("Some text columns look numeric or date-like and can be recast.")

        return {
            "duplicateRows": duplicate_rows,
            "emptyColumns": empty_columns,
            "highNullColumns": high_null_columns,
            "recommendations": recommendations,
            "coercionCandidates": coercion_candidates[:6],
        }

    def _build_external_upload_comparison(
        self,
        workspace: Dict[str, Any],
        cleaning: Dict[str, Any],
    ) -> tuple[Optional[pd.DataFrame], Dict[str, Any]]:
        compare_upload_id = workspace.get("compareUploadId")
        if not compare_upload_id:
            return None, {"enabled": False}

        compare_upload = realtime_analysis_service._get_upload(compare_upload_id)
        compare_df = read_file(compare_upload.file_path, compare_upload.file_type)
        if compare_df is None or compare_df.empty:
            return None, {"enabled": False}

        prepared_df, _ = realtime_analysis_service._prepare_dataframe(compare_df)
        cleaned_df = self._apply_cleaning(prepared_df, cleaning)
        cleaned_df, column_summary = realtime_analysis_service._prepare_dataframe(cleaned_df)
        dataset = realtime_analysis_service._build_dataset_summary(cleaned_df, column_summary, compare_upload.filename)
        kpis = realtime_analysis_service._build_kpis(cleaned_df, dataset)
        numeric_summary = self._build_numeric_summary(cleaned_df, dataset["numericColumns"])

        return cleaned_df, {
            "enabled": True,
            "uploadId": compare_upload_id,
            "fileName": compare_upload.filename,
            "dataset": dataset,
            "kpis": kpis,
            "numericSummary": numeric_summary,
        }

    def _build_merge_summary(self, workspace: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "enabled": False,
            "mode": workspace.get("mode", "compare"),
        }

    def _build_join_summary(self, workspace: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "enabled": False,
            "fileName": None,
            "joinKeys": workspace.get("joinKeys", []),
            "joinType": workspace.get("joinType", "inner"),
            "matchedRows": 0,
            "unmatchedRows": 0,
            "availableKeys": [],
        }

    def _append_workspace_data(
        self,
        current_df: pd.DataFrame,
        external_df: Optional[pd.DataFrame],
        external_comparison: Dict[str, Any],
    ) -> tuple[pd.DataFrame, Dict[str, Any]]:
        if external_df is None or external_df.empty or not external_comparison.get("enabled"):
            return current_df, {"enabled": False, "mode": "append"}

        common_columns = [column for column in current_df.columns if column in external_df.columns]
        if not common_columns:
            return current_df, {
                "enabled": False,
                "mode": "append",
                "fileName": external_comparison.get("fileName"),
                "rowsAdded": 0,
                "totalRows": int(current_df.shape[0]),
                "commonColumns": [],
            }

        merged_df = pd.concat(
            [current_df[common_columns], external_df[common_columns]],
            ignore_index=True,
        )
        return merged_df.reset_index(drop=True), {
            "enabled": True,
            "mode": "append",
            "fileName": external_comparison.get("fileName"),
            "rowsAdded": int(external_df.shape[0]),
            "totalRows": int(merged_df.shape[0]),
            "commonColumns": common_columns[:10],
        }

    def _join_workspace_data(
        self,
        current_df: pd.DataFrame,
        external_df: Optional[pd.DataFrame],
        external_comparison: Dict[str, Any],
        workspace: Dict[str, Any],
    ) -> tuple[pd.DataFrame, Dict[str, Any]]:
        available_keys = (
            [column for column in current_df.columns if external_df is not None and column in external_df.columns]
            if external_df is not None
            else []
        )
        summary = {
            "enabled": False,
            "fileName": external_comparison.get("fileName"),
            "joinKeys": [],
            "joinType": workspace.get("joinType", "inner"),
            "matchedRows": 0,
            "unmatchedRows": 0,
            "availableKeys": available_keys[:12],
        }

        if external_df is None or external_df.empty or not external_comparison.get("enabled"):
            return current_df, summary

        join_keys = [key for key in workspace.get("joinKeys", []) if key in current_df.columns and key in external_df.columns]
        if not join_keys and available_keys:
            join_keys = available_keys[:1]
        if not join_keys:
            return current_df, summary

        join_type = workspace.get("joinType", "inner")
        merged_df = current_df.merge(
            external_df,
            how=join_type,
            on=join_keys,
            suffixes=("_current", "_external"),
            indicator="_merge",
        )
        matched_rows = int((merged_df["_merge"] == "both").sum())
        unmatched_rows = int(merged_df.shape[0] - matched_rows)
        merged_df = merged_df.drop(columns=["_merge"])

        summary.update(
            {
                "enabled": True,
                "joinKeys": join_keys,
                "matchedRows": matched_rows,
                "unmatchedRows": unmatched_rows,
            }
        )
        return merged_df.reset_index(drop=True), summary

    def _build_filter_options(self, df: pd.DataFrame, dataset: Dict[str, Any]) -> Dict[str, Any]:
        category_values: Dict[str, List[str]] = {}
        date_ranges: Dict[str, Dict[str, Optional[str]]] = {}

        for column in dataset["categoricalColumns"]:
            values = (
                df[column]
                .dropna()
                .astype(str)
                .value_counts()
                .head(30)
                .index.tolist()
            )
            category_values[column] = values

        for column in dataset["dateColumns"]:
            date_series = pd.to_datetime(df[column], errors="coerce").dropna()
            date_ranges[column] = {
                "min": date_series.min().date().isoformat() if not date_series.empty else None,
                "max": date_series.max().date().isoformat() if not date_series.empty else None,
            }

        return {
            "metrics": dataset["numericColumns"],
            "categoricalColumns": dataset["categoricalColumns"],
            "dateColumns": dataset["dateColumns"],
            "categoryValues": category_values,
            "dateRanges": date_ranges,
            "aggregations": ["sum", "mean", "count"],
            "granularities": ["auto", "day", "week", "month"],
            "sortOrders": ["desc", "asc"],
            "dashboardRoles": ["analyst", "accountant", "manager", "founder"],
            "numericNullStrategies": ["keep", "zero", "mean"],
            "textNullStrategies": ["keep", "empty", "drop"],
        }

    def _build_numeric_summary(
        self, df: pd.DataFrame, numeric_columns: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        summary: Dict[str, Dict[str, Any]] = {}

        for column in numeric_columns:
            series = df[column].dropna()
            summary[column] = {
                "sum": float(series.sum()) if not series.empty else 0.0,
                "mean": float(series.mean()) if not series.empty else 0.0,
                "min": float(series.min()) if not series.empty else 0.0,
                "max": float(series.max()) if not series.empty else 0.0,
                "count": int(series.count()),
                "unit": "currency" if realtime_analysis_service._looks_currency(column) else "number",
            }

        return summary

    def _build_comparison(
        self,
        base_df: pd.DataFrame,
        filtered_df: pd.DataFrame,
        request: Dict[str, Any],
        preferences: Dict[str, Any],
        external_comparison: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not preferences.get("compareMode") and not external_comparison.get("enabled"):
            return {"enabled": False, "label": "", "baselineLabel": "", "cards": []}

        metric = preferences.get("metric")
        date_column = request["filters"].get("dateColumn")
        baseline_df = base_df
        baseline_label = "Full dataset"
        workspace_mode = request.get("workspace", {}).get("mode", "compare")

        if external_comparison.get("enabled"):
            baseline_label = external_comparison["fileName"]
            if workspace_mode == "benchmark":
                baseline_label = f"Benchmark - {baseline_label}"
            baseline_metric = float(external_comparison["dataset"]["rows"])
            if metric:
                metric_summary = external_comparison.get("numericSummary", {}).get(metric)
                if metric_summary:
                    baseline_metric = float(
                        metric_summary.get(preferences["aggregation"], metric_summary.get("sum", 0.0))
                    )
            current_metric = self._aggregate_metric(filtered_df, metric, preferences["aggregation"])
            baseline_rows = float(external_comparison["dataset"]["rows"])
            current_rows = float(filtered_df.shape[0])
            cards = [
                self._comparison_card(
                    "active_metric",
                    metric or "Active metric",
                    current_metric,
                    baseline_metric,
                    "currency" if metric and realtime_analysis_service._looks_currency(metric) else "number",
                ),
                self._comparison_card("rows", "Rows", current_rows, baseline_rows, "number"),
            ]
            return {
                "enabled": True,
                "label": "Current filtered view",
                "baselineLabel": baseline_label,
                "cards": cards,
            }

        if date_column and request["filters"].get("startDate") and request["filters"].get("endDate"):
            start = pd.to_datetime(request["filters"]["startDate"])
            end = pd.to_datetime(request["filters"]["endDate"])
            duration = max(end - start, timedelta(days=1))
            baseline_end = start - timedelta(days=1)
            baseline_start = baseline_end - duration
            date_series = pd.to_datetime(base_df[date_column], errors="coerce")
            baseline_df = base_df[(date_series >= baseline_start) & (date_series <= baseline_end)]
            baseline_label = "Previous matching period"

        current_metric = self._aggregate_metric(filtered_df, metric, preferences["aggregation"])
        baseline_metric = self._aggregate_metric(baseline_df, metric, preferences["aggregation"])
        current_rows = float(filtered_df.shape[0])
        baseline_rows = float(baseline_df.shape[0])

        cards = [
            self._comparison_card(
                "active_metric",
                metric or "Active metric",
                current_metric,
                baseline_metric,
                "currency" if metric and realtime_analysis_service._looks_currency(metric) else "number",
            ),
            self._comparison_card("rows", "Rows", current_rows, baseline_rows, "number"),
        ]

        if metric and metric in filtered_df.columns:
            cards.append(
                self._comparison_card(
                    "average_metric",
                    f"Average {metric}",
                    float(filtered_df[metric].mean()) if not filtered_df.empty else 0.0,
                    float(baseline_df[metric].mean()) if not baseline_df.empty else 0.0,
                    "currency" if realtime_analysis_service._looks_currency(metric) else "number",
                )
            )

        return {
            "enabled": True,
            "label": "Current filtered view",
            "baselineLabel": baseline_label,
            "cards": cards,
        }

    def _comparison_card(
        self,
        card_id: str,
        title: str,
        current: float,
        previous: float,
        unit: str,
    ) -> Dict[str, Any]:
        delta = current - previous
        delta_percent = (delta / previous * 100.0) if previous not in {0, 0.0} else 0.0
        return {
            "id": card_id,
            "title": title,
            "current": current,
            "previous": previous,
            "delta": delta,
            "deltaPercent": delta_percent,
            "unit": unit,
        }

    def _aggregate_metric(
        self, df: pd.DataFrame, metric: Optional[str], aggregation: str
    ) -> float:
        if metric is None:
            return float(df.shape[0])

        if aggregation == "count":
            return float(df[metric].dropna().count())

        if df.empty or metric not in df.columns:
            return 0.0

        if aggregation == "mean":
            return float(df[metric].mean())

        return float(df[metric].sum())

    def _build_charts_and_anomalies(
        self,
        base_df: pd.DataFrame,
        filtered_df: pd.DataFrame,
        dataset: Dict[str, Any],
        request: Dict[str, Any],
        preferences: Dict[str, Any],
        comparison: Dict[str, Any],
        external_comparison_df: Optional[pd.DataFrame],
        external_comparison: Dict[str, Any],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        charts: List[Dict[str, Any]] = []
        anomalies: List[Dict[str, Any]] = []

        metric = preferences["metric"]
        secondary_metric = preferences["secondaryMetric"]
        category_column = request["filters"]["categoryColumn"]
        date_column = request["filters"]["dateColumn"]
        chart_preference = preferences.get("chartPreference", "auto")

        if date_column and metric:
            trend_chart, trend_anomalies = self._build_trend_chart(
                base_df,
                filtered_df,
                date_column,
                metric,
                preferences,
                comparison,
                external_comparison_df,
                external_comparison,
            )
            if trend_chart:
                if chart_preference == "bar":
                    trend_chart["chartType"] = "bar"
                charts.append(trend_chart)
                anomalies.extend(trend_anomalies)

        if category_column and metric:
            preferred_category_types = (
                [chart_preference]
                if chart_preference in {"bar", "pie"}
                else ["bar", "pie"]
            )
            bar_chart = self._build_category_chart(
                filtered_df,
                category_column,
                metric,
                preferences,
                "bar",
            ) if "bar" in preferred_category_types else None
            pie_chart = self._build_category_chart(
                filtered_df,
                category_column,
                metric,
                preferences,
                "pie",
            ) if "pie" in preferred_category_types else None
            if bar_chart:
                charts.append(bar_chart)
            if pie_chart:
                charts.append(pie_chart)

        if metric and secondary_metric:
            scatter_chart = realtime_analysis_service._build_scatter_chart(
                filtered_df, metric, secondary_metric
            )
            if scatter_chart:
                scatter_chart["role"] = "relationship"
                charts.append(scatter_chart)

            correlation_chart = realtime_analysis_service._build_correlation_chart(
                filtered_df, metric, dataset["numericColumns"]
            )
            if correlation_chart:
                correlation_chart["role"] = "correlation"
                charts.append(correlation_chart)

        if metric:
            distribution_chart = realtime_analysis_service._build_distribution_chart(filtered_df, metric)
            if distribution_chart:
                distribution_chart["role"] = "distribution"
                charts.append(distribution_chart)

        if not charts and category_column:
            fallback = realtime_analysis_service._build_frequency_chart(filtered_df, category_column)
            if fallback:
                fallback["role"] = "frequency"
                charts.append(fallback)

        if not charts:
            empty_chart = realtime_analysis_service._build_empty_chart(dataset)
            empty_chart["role"] = "empty"
            charts.append(empty_chart)

        return charts[:6], anomalies[:5]

    def _build_trend_chart(
        self,
        base_df: pd.DataFrame,
        filtered_df: pd.DataFrame,
        date_column: str,
        metric: str,
        preferences: Dict[str, Any],
        comparison: Dict[str, Any],
        external_comparison_df: Optional[pd.DataFrame],
        external_comparison: Dict[str, Any],
    ) -> tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        current_records = self._aggregate_time_series(
            filtered_df,
            date_column,
            [metric],
            preferences["aggregation"],
            preferences["granularity"],
        )
        if not current_records:
            return None, []

        anomalies = self._detect_series_anomalies(current_records, "metric_1", metric)

        if comparison.get("enabled"):
            comparison_frame = base_df
            if (
                external_comparison.get("enabled")
                and external_comparison_df is not None
                and date_column in external_comparison_df.columns
            ):
                comparison_frame = external_comparison_df
            comparison_records = self._aggregate_time_series(
                comparison_frame,
                date_column,
                [metric],
                preferences["aggregation"],
                preferences["granularity"],
            )
            if comparison_records:
                aligned = current_records[:]
                baseline_values = [record["metric_1"] for record in comparison_records[-len(aligned):]]
                while len(baseline_values) < len(aligned):
                    baseline_values.insert(0, 0.0)
                for index, record in enumerate(aligned):
                    record["metric_2"] = float(baseline_values[index])

                return (
                    {
                        "id": f"trend_{realtime_analysis_service._slug(metric)}",
                        "title": f"{metric} trend and comparison",
                        "role": "trend",
                        "chartType": "line",
                        "description": f"This chart tracks {metric} over time and compares it with {comparison['baselineLabel'].lower()}.",
                        "caption": f"Grouped by {date_column} using {preferences['aggregation']} aggregation.",
                        "data": aligned,
                        "xKey": "label",
                        "yKeys": ["metric_1", "metric_2"],
                        "seriesLabels": {"metric_1": metric, "metric_2": comparison["baselineLabel"]},
                    },
                    anomalies,
                )

        return (
            {
                "id": f"trend_{realtime_analysis_service._slug(metric)}",
                "title": f"{metric} trend over time",
                "role": "trend",
                "chartType": "line",
                "description": f"This chart tracks {metric} over time using the detected {date_column} field.",
                "caption": f"Grouped by {date_column} using {preferences['aggregation']} aggregation.",
                "data": current_records,
                "xKey": "label",
                "yKeys": ["metric_1"],
                "seriesLabels": {"metric_1": metric},
            },
            anomalies,
        )

    def _build_category_chart(
        self,
        df: pd.DataFrame,
        category_column: str,
        metric: str,
        preferences: Dict[str, Any],
        chart_type: str,
    ) -> Optional[Dict[str, Any]]:
        records = self._aggregate_category(
            df,
            category_column,
            metric,
            preferences["aggregation"],
            preferences["topN"],
            preferences["sortOrder"],
        )
        if not records:
            return None

        description = (
            f"This chart compares {metric} across {category_column} values."
            if chart_type == "bar"
            else f"This chart shows the share of {metric} contributed by each {category_column}."
        )
        caption = (
            f"Top {len(records)} categories ranked using {preferences['aggregation']} aggregation."
            if chart_type == "bar"
            else "Click a slice to drill into that category."
        )

        payload = {
            "id": f"{chart_type}_{realtime_analysis_service._slug(category_column)}_{realtime_analysis_service._slug(metric)}",
            "title": f"{metric} by {category_column}",
            "role": "breakdown" if chart_type == "bar" else "share",
            "chartType": chart_type,
            "description": description,
            "caption": caption,
            "data": records,
            "seriesLabels": {"metric_1": metric},
            "interaction": {"filterColumn": category_column, "labelKey": "label"},
        }

        if chart_type == "bar":
            payload["xKey"] = "label"
            payload["yKeys"] = ["metric_1"]
        else:
            payload["nameKey"] = "label"
            payload["valueKey"] = "metric_1"

        return payload

    def _aggregate_time_series(
        self,
        df: pd.DataFrame,
        date_column: str,
        metrics: List[str],
        aggregation: str,
        granularity: str,
    ) -> List[Dict[str, Any]]:
        if df.empty or date_column not in df.columns or not metrics:
            return []

        frame = df[[date_column] + metrics].dropna(subset=[date_column]).copy()
        if frame.empty:
            return []

        frame[date_column] = pd.to_datetime(frame[date_column], errors="coerce")
        frame = frame.dropna(subset=[date_column])
        if frame.empty:
            return []

        if granularity == "auto":
            date_range = frame[date_column].max() - frame[date_column].min()
            if date_range.days > 180:
                granularity = "month"
            elif date_range.days > 45:
                granularity = "week"
            else:
                granularity = "day"

        if granularity == "month":
            frame["label"] = frame[date_column].dt.to_period("M").astype(str)
        elif granularity == "week":
            frame["label"] = frame[date_column].dt.to_period("W").astype(str)
        else:
            frame["label"] = frame[date_column].dt.strftime("%Y-%m-%d")

        grouped = frame.groupby("label")
        records: List[Dict[str, Any]] = []
        for label, group in grouped:
            item: Dict[str, Any] = {"label": str(label)}
            for index, metric in enumerate(metrics, start=1):
                if aggregation == "count":
                    value = float(group[metric].dropna().count())
                elif aggregation == "mean":
                    value = float(group[metric].mean())
                else:
                    value = float(group[metric].sum())
                item[f"metric_{index}"] = value
            records.append(item)

        return records[:24]

    def _aggregate_category(
        self,
        df: pd.DataFrame,
        category_column: str,
        metric: str,
        aggregation: str,
        top_n: int,
        sort_order: str,
    ) -> List[Dict[str, Any]]:
        if df.empty or category_column not in df.columns or metric not in df.columns:
            return []

        frame = df[[category_column, metric]].dropna(subset=[category_column])
        if frame.empty:
            return []

        grouped = frame.groupby(category_column)[metric]
        if aggregation == "count":
            aggregated = grouped.count()
        elif aggregation == "mean":
            aggregated = grouped.mean()
        else:
            aggregated = grouped.sum()

        aggregated = aggregated.sort_values(ascending=sort_order != "desc").head(top_n)

        if sort_order == "desc":
            aggregated = aggregated.sort_values(ascending=False)
        else:
            aggregated = aggregated.sort_values(ascending=True)

        values = aggregated.tolist()
        median = float(np.median(values)) if values else 0.0
        records = []
        for label, value in aggregated.items():
            records.append(
                {
                    "label": str(label),
                    "metric_1": float(value),
                    "isAnomaly": bool(median and value > median * 1.8),
                }
            )
        return records

    def _detect_series_anomalies(
        self, records: List[Dict[str, Any]], key: str, metric: str
    ) -> List[Dict[str, Any]]:
        if len(records) < 4:
            return []

        values = np.array([float(record[key]) for record in records], dtype=float)
        std = values.std()
        if std == 0:
            return []

        mean = values.mean()
        anomalies: List[Dict[str, Any]] = []
        for record, value in zip(records, values):
            z_score = (value - mean) / std
            if abs(z_score) >= 1.8:
                record["isAnomaly"] = True
                anomalies.append(
                    {
                        "id": f"anomaly_{record['label']}",
                        "title": f"{metric} anomaly at {record['label']}",
                        "description": f"{metric} deviates strongly from the normal pattern at {record['label']}.",
                        "severity": "high" if abs(z_score) >= 2.5 else "medium",
                        "metric": metric,
                        "label": record["label"],
                        "value": float(value),
                    }
                )
            else:
                record["isAnomaly"] = False
        return anomalies

    def _build_custom_chart(
        self,
        df: pd.DataFrame,
        request: Dict[str, Any],
        dataset: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        config = request.get("chartBuilder", {})
        if not config.get("enabled"):
            return None

        chart_type = config.get("chartType", "bar")
        x_column = config.get("xColumn")
        y_columns = [column for column in config.get("yColumns", []) if column in df.columns]
        title = config.get("title") or "Custom chart"

        if not x_column or x_column not in df.columns or not y_columns:
            return None

        if chart_type == "pie":
            category_column = x_column
            metric = y_columns[0]
            records = self._aggregate_category(
                df,
                category_column,
                metric,
                request["preferences"]["aggregation"],
                request["preferences"]["topN"],
                request["preferences"]["sortOrder"],
            )
            if not records:
                return None
            return {
                "id": "custom_chart",
                "title": title,
                "role": "custom",
                "chartType": "pie",
                "description": f"Custom share chart for {metric} by {category_column}.",
                "caption": "Built from your chart builder settings.",
                "data": records,
                "nameKey": "label",
                "valueKey": "metric_1",
                "seriesLabels": {"metric_1": metric},
                "interaction": {"filterColumn": category_column, "labelKey": "label"},
            }

        if chart_type == "scatter":
            if len(y_columns) < 2:
                return None
            scatter_records = (
                df[[y_columns[0], y_columns[1]]]
                .dropna()
                .head(120)
                .rename(columns={y_columns[0]: "x_value", y_columns[1]: "y_value"})
                .to_dict(orient="records")
            )
            if not scatter_records:
                return None
            return {
                "id": "custom_chart",
                "title": title,
                "role": "custom",
                "chartType": "scatter",
                "description": f"Custom scatter view comparing {y_columns[0]} and {y_columns[1]}.",
                "caption": "Built from your chart builder settings.",
                "data": scatter_records,
                "xKey": "x_value",
                "yKeys": ["y_value"],
                "xLabel": y_columns[0],
                "yLabel": y_columns[1],
                "seriesLabels": {"y_value": y_columns[1]},
            }

        if x_column in dataset["dateColumns"]:
            records = self._aggregate_time_series(
                df,
                x_column,
                y_columns[:2],
                request["preferences"]["aggregation"],
                request["preferences"]["granularity"],
            )
            if not records:
                return None
            return {
                "id": "custom_chart",
                "title": title,
                "role": "custom",
                "chartType": chart_type if chart_type in {"line", "bar"} else "line",
                "description": f"Custom time-based chart using {x_column}.",
                "caption": "Built from your chart builder settings.",
                "data": records,
                "xKey": "label",
                "yKeys": [f"metric_{index}" for index in range(1, len(y_columns[:2]) + 1)],
                "seriesLabels": {
                    f"metric_{index}": column for index, column in enumerate(y_columns[:2], start=1)
                },
            }

        metric = y_columns[0]
        records = self._aggregate_category(
            df,
            x_column,
            metric,
            request["preferences"]["aggregation"],
            request["preferences"]["topN"],
            request["preferences"]["sortOrder"],
        )
        if not records:
            return None
        return {
            "id": "custom_chart",
            "title": title,
            "role": "custom",
            "chartType": chart_type if chart_type in {"bar", "line"} else "bar",
            "description": f"Custom chart for {metric} by {x_column}.",
            "caption": "Built from your chart builder settings.",
            "data": records,
            "xKey": "label",
            "yKeys": ["metric_1"],
            "seriesLabels": {"metric_1": metric},
            "interaction": {"filterColumn": x_column, "labelKey": "label"},
        }

    def _build_forecast_summary(
        self,
        df: pd.DataFrame,
        request: Dict[str, Any],
        preferences: Dict[str, Any],
    ) -> Dict[str, Any]:
        metric = request.get("scenario", {}).get("metric") or preferences.get("metric")
        date_column = request["filters"].get("dateColumn")
        if not metric or not date_column or date_column not in df.columns or metric not in df.columns:
            return {
                "enabled": False,
                "metric": metric,
                "description": "Select a date column and numeric metric to unlock forecasting.",
                "periods": 0,
                "points": [],
                "scenarioImpact": None,
            }

        current_records = self._aggregate_time_series(
            df,
            date_column,
            [metric],
            preferences["aggregation"],
            preferences["granularity"],
        )
        if len(current_records) < 3:
            return {
                "enabled": False,
                "metric": metric,
                "description": "Not enough historical periods are available for a meaningful forecast.",
                "periods": 0,
                "points": [],
                "scenarioImpact": None,
            }

        history = current_records[-12:]
        y_values = np.array([float(point["metric_1"]) for point in history], dtype=float)
        x_values = np.arange(len(y_values), dtype=float)
        slope, intercept = np.polyfit(x_values, y_values, 1)

        forecast_points: List[Dict[str, Any]] = []
        for step in range(1, 4):
            forecast_points.append(
                {
                    "label": f"Forecast {step}",
                    "forecast": max(0.0, float(intercept + slope * (len(y_values) + step - 1))),
                }
            )

        scenario = request.get("scenario", {})
        scenario_impact = None
        if scenario.get("enabled"):
            baseline = float(y_values[-1])
            adjustment_percent = float(scenario.get("adjustmentPercent", 0))
            projected = baseline * (1 + adjustment_percent / 100.0)
            scenario_impact = {
                "baseline": baseline,
                "projected": projected,
                "delta": projected - baseline,
                "adjustmentPercent": adjustment_percent,
            }

        points = [
            {
                "label": point["label"],
                "actual": float(point["metric_1"]),
            }
            for point in history
        ] + forecast_points

        return {
            "enabled": True,
            "metric": metric,
            "description": f"Projected next 3 periods for {metric} using a linear trend over the active time series.",
            "periods": 3,
            "points": points,
            "scenarioImpact": scenario_impact,
        }

    def _build_target_tracking(
        self,
        df: pd.DataFrame,
        request: Dict[str, Any],
        preferences: Dict[str, Any],
    ) -> Dict[str, Any]:
        target_request = request.get("targets", {})
        metric = target_request.get("metric") or preferences.get("metric")
        if not target_request.get("enabled") or not metric or metric not in df.columns:
            return {
                "enabled": False,
                "metric": metric,
                "targetValue": float(target_request.get("targetValue", 0)),
                "actualValue": 0.0,
                "variance": 0.0,
                "variancePercent": 0.0,
                "status": "on_track",
            }

        target_value = float(target_request.get("targetValue", 0))
        actual_value = self._aggregate_metric(df, metric, preferences["aggregation"])
        variance = actual_value - target_value
        variance_percent = (variance / target_value * 100.0) if target_value not in {0, 0.0} else 0.0

        if abs(variance_percent) <= 5:
            status = "on_track"
        elif variance > 0:
            status = "ahead"
        else:
            status = "behind"

        return {
            "enabled": True,
            "metric": metric,
            "targetValue": target_value,
            "actualValue": actual_value,
            "variance": variance,
            "variancePercent": variance_percent,
            "status": status,
        }

    def _build_benchmark_summary(
        self,
        df: pd.DataFrame,
        request: Dict[str, Any],
        preferences: Dict[str, Any],
        external_comparison: Dict[str, Any],
    ) -> Dict[str, Any]:
        metric = preferences.get("metric")
        if request.get("workspace", {}).get("mode") != "benchmark" or not external_comparison.get("enabled"):
            return {
                "enabled": False,
                "baselineLabel": "",
                "metric": metric,
                "current": 0.0,
                "baseline": 0.0,
                "delta": 0.0,
                "deltaPercent": 0.0,
            }

        current = self._aggregate_metric(df, metric, preferences["aggregation"])
        baseline = float(external_comparison["dataset"]["rows"])
        if metric:
            metric_summary = external_comparison.get("numericSummary", {}).get(metric)
            if metric_summary:
                baseline = float(metric_summary.get(preferences["aggregation"], metric_summary.get("sum", 0.0)))
        delta = current - baseline
        delta_percent = (delta / baseline * 100.0) if baseline not in {0, 0.0} else 0.0
        return {
            "enabled": True,
            "baselineLabel": external_comparison.get("fileName", "Benchmark dataset"),
            "metric": metric,
            "current": current,
            "baseline": baseline,
            "delta": delta,
            "deltaPercent": delta_percent,
        }

    def _build_drillthrough(
        self,
        df: pd.DataFrame,
        column_summary: List[Dict[str, Any]],
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        has_drillthrough = bool(
            request["filters"].get("drilldownValue") or request["filters"].get("categories")
        )
        preview_columns = [column["name"] for column in column_summary[:10]]
        preview_rows: List[Dict[str, Any]] = []
        for _, row in df[preview_columns].head(25).iterrows():
            preview_rows.append(
                {column: realtime_analysis_service._stringify(row[column]) for column in preview_columns}
            )

        title = "Drill-through rows"
        if request["filters"].get("drilldownValue"):
            title = f"Rows for {request['filters']['drilldownValue']}"
        elif request["filters"].get("categories"):
            title = "Rows for selected categories"

        return {
            "enabled": has_drillthrough,
            "title": title,
            "columns": preview_columns,
            "rows": preview_rows,
            "totalRows": int(df.shape[0]),
            "sampled": bool(df.shape[0] > 25),
        }

    def _build_narrative(
        self,
        df: pd.DataFrame,
        dataset: Dict[str, Any],
        preferences: Dict[str, Any],
        comparison: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        quality_report: Dict[str, Any],
        target_tracking: Dict[str, Any],
        merge_summary: Dict[str, Any],
        join_summary: Dict[str, Any],
        benchmark: Dict[str, Any],
    ) -> Dict[str, Any]:
        metric = preferences.get("metric") or "selected metric"
        sections: List[Dict[str, str]] = [
            {
                "id": "overview",
                "heading": "Executive Overview",
                "body": f"The current workspace contains {dataset['rows']} active rows across {dataset['columns']} columns with {dataset['completeness']}% completeness.",
            },
            {
                "id": "performance",
                "heading": "Performance Story",
                "body": f"The dashboard is centered on {metric} using {preferences['aggregation']} aggregation and {preferences['granularity']} granularity.",
            },
        ]

        if comparison.get("enabled") and comparison.get("cards"):
            primary_card = comparison["cards"][0]
            sections.append(
                {
                    "id": "comparison",
                    "heading": "Comparison View",
                    "body": f"{primary_card['title']} moved by {primary_card['deltaPercent']:.1f}% versus {comparison['baselineLabel']}.",
                }
            )

        if benchmark.get("enabled"):
            sections.append(
                {
                    "id": "benchmark",
                    "heading": "Benchmark Position",
                    "body": f"The current view is {benchmark['deltaPercent']:.1f}% {'above' if benchmark['delta'] >= 0 else 'below'} benchmark file {benchmark['baselineLabel']}.",
                }
            )

        if target_tracking.get("enabled"):
            sections.append(
                {
                    "id": "target",
                    "heading": "Target Tracking",
                    "body": f"Actual {target_tracking['metric']} is {target_tracking['actualValue']:.2f} against a target of {target_tracking['targetValue']:.2f}, leaving a variance of {target_tracking['variance']:.2f}.",
                }
            )

        risk_parts: List[str] = []
        if anomalies:
            risk_parts.append(anomalies[0]["description"])
        if quality_report.get("duplicateRows"):
            risk_parts.append(f"{quality_report['duplicateRows']} duplicate rows were identified before cleaning.")
        if merge_summary.get("enabled"):
            risk_parts.append(f"{merge_summary.get('rowsAdded', 0)} rows were appended from {merge_summary.get('fileName', 'another file')}.")
        if join_summary.get("enabled"):
            risk_parts.append(f"Join mode used {', '.join(join_summary.get('joinKeys', []))} and matched {join_summary.get('matchedRows', 0)} rows.")
        if risk_parts:
            sections.append(
                {
                    "id": "risk",
                    "heading": "Risk and Data Quality",
                    "body": " ".join(risk_parts),
                }
            )

        recommendations = list(quality_report.get("recommendations", []))
        if target_tracking.get("enabled") and target_tracking.get("status") == "behind":
            recommendations.append("Investigate the gap against target and review category drivers.")
        if benchmark.get("enabled") and benchmark.get("delta") < 0:
            recommendations.append("Review benchmark underperformance and identify lagging segments.")
        if not recommendations:
            recommendations.append("Keep monitoring the active metric and refresh the dashboard after new uploads.")

        return {
            "title": "Executive Narrative",
            "sections": sections[:5],
            "recommendations": recommendations[:5],
        }

    def _build_alerts(
        self,
        quality_report: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        comparison: Dict[str, Any],
        merge_summary: Dict[str, Any],
        forecast: Dict[str, Any],
        target_tracking: Dict[str, Any],
        benchmark: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        alerts: List[Dict[str, Any]] = []

        for anomaly in anomalies[:3]:
            alerts.append(
                {
                    "id": anomaly["id"],
                    "title": anomaly["title"],
                    "description": anomaly["description"],
                    "severity": anomaly["severity"],
                    "kind": "anomaly",
                }
            )

        if quality_report.get("duplicateRows"):
            alerts.append(
                {
                    "id": "quality_duplicates",
                    "title": "Duplicate rows detected",
                    "description": f"{quality_report['duplicateRows']} duplicate rows were found before cleaning.",
                    "severity": "medium",
                    "kind": "quality",
                }
            )

        if quality_report.get("highNullColumns"):
            top_column = quality_report["highNullColumns"][0]
            alerts.append(
                {
                    "id": "quality_nulls",
                    "title": "High missing-value risk",
                    "description": f"{top_column['column']} has {top_column['nullPercent']}% missing values.",
                    "severity": "high" if top_column["nullPercent"] >= 40 else "medium",
                    "kind": "quality",
                }
            )

        if comparison.get("enabled") and comparison.get("cards"):
            primary_card = comparison["cards"][0]
            if primary_card["delta"] < 0:
                alerts.append(
                    {
                        "id": "comparison_decline",
                        "title": "Metric below baseline",
                        "description": f"{primary_card['title']} is down {abs(primary_card['deltaPercent']):.1f}% versus {comparison['baselineLabel']}.",
                        "severity": "high" if abs(primary_card["deltaPercent"]) >= 15 else "medium",
                        "kind": "comparison",
                    }
                )

        if merge_summary.get("enabled"):
            alerts.append(
                {
                    "id": "merge_append",
                    "title": "Workspace append active",
                    "description": f"{merge_summary.get('rowsAdded', 0)} rows were added from {merge_summary.get('fileName', 'the secondary file')}.",
                    "severity": "low",
                    "kind": "merge",
                }
            )

        if forecast.get("enabled") and forecast.get("scenarioImpact"):
            scenario_impact = forecast["scenarioImpact"]
            alerts.append(
                {
                    "id": "forecast_scenario",
                    "title": "What-if scenario active",
                    "description": f"Projected impact is {scenario_impact['delta']:.2f} at {scenario_impact['adjustmentPercent']:.1f}% adjustment.",
                    "severity": "low",
                    "kind": "forecast",
                }
            )

        if target_tracking.get("enabled") and target_tracking.get("status") != "on_track":
            alerts.append(
                {
                    "id": "target_tracking",
                    "title": "Target variance detected",
                    "description": f"{target_tracking['metric']} is {abs(target_tracking['variancePercent']):.1f}% {'above' if target_tracking['variance'] >= 0 else 'below'} target.",
                    "severity": "high" if abs(target_tracking["variancePercent"]) >= 15 else "medium",
                    "kind": "target",
                }
            )

        if benchmark.get("enabled"):
            alerts.append(
                {
                    "id": "benchmark_status",
                    "title": "Benchmark comparison active",
                    "description": f"Current metric is {benchmark['deltaPercent']:.1f}% {'above' if benchmark['delta'] >= 0 else 'below'} {benchmark['baselineLabel']}.",
                    "severity": "medium" if benchmark["delta"] < 0 else "low",
                    "kind": "benchmark",
                }
            )

        return alerts[:6]

    def _build_insights(
        self,
        df: pd.DataFrame,
        dataset: Dict[str, Any],
        preferences: Dict[str, Any],
        comparison: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        numeric_summary: Dict[str, Dict[str, Any]],
        external_comparison: Dict[str, Any],
        merge_summary: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        role = preferences.get("dashboardRole", "analyst")
        cards: List[Dict[str, Any]] = [
            {
                "id": "dataset_health",
                "title": f"{role.title()} view",
                "body": f"{dataset['rows']} rows are active in the current view with {dataset['completeness']}% completeness.",
                "tone": "info",
            }
        ]

        metric = preferences.get("metric")
        if metric and metric in numeric_summary:
            metric_summary = numeric_summary[metric]
            cards.append(
                {
                    "id": "metric_summary",
                    "title": f"{metric} summary",
                    "body": f"Current {preferences['aggregation']} value is {metric_summary['sum']:.2f} and the average is {metric_summary['mean']:.2f}.",
                    "tone": "positive",
                }
            )

        if preferences.get("secondaryMetric"):
            cards.append(
                {
                    "id": "relationship_hint",
                    "title": "Relationship view ready",
                    "body": f"Scatter and correlation charts compare {preferences['metric']} with {preferences['secondaryMetric']}.",
                    "tone": "info",
                }
            )

        if anomalies:
            cards.append(
                {
                    "id": "anomaly_alert",
                    "title": "Anomaly detected",
                    "body": anomalies[0]["description"],
                    "tone": "warning",
                }
            )

        if comparison.get("enabled") and comparison.get("cards"):
            comparison_card = comparison["cards"][0]
            cards.append(
                {
                    "id": "comparison_card",
                    "title": "Compare mode",
                    "body": f"{comparison_card['title']} changed by {comparison_card['deltaPercent']:.1f}% versus {comparison['baselineLabel'].lower()}.",
                    "tone": "positive" if comparison_card["delta"] >= 0 else "warning",
                }
            )

        if external_comparison.get("enabled"):
            cards.append(
                {
                    "id": "external_compare",
                    "title": "Cross-upload comparison",
                    "body": f"Current view is being compared with {external_comparison['fileName']}.",
                    "tone": "info",
                }
            )

        if merge_summary.get("enabled"):
            cards.append(
                {
                    "id": "merge_workspace",
                    "title": "Append workspace active",
                    "body": f"{merge_summary.get('rowsAdded', 0)} additional rows were appended from {merge_summary.get('fileName', 'the selected file')}.",
                    "tone": "info",
                }
            )

        role_guidance = {
            "founder": "This preset prioritizes headline revenue movement, comparison, and anomaly alerts.",
            "manager": "This preset emphasizes operational trends, category performance, and execution shifts.",
            "accountant": "This preset emphasizes data quality, completeness, and cost-focused monitoring.",
            "analyst": "This preset keeps the broadest analytical view across trends, relationships, and distributions.",
        }
        cards.append(
            {
                "id": "role_guidance",
                "title": f"{role.title()} guidance",
                "body": role_guidance.get(role, role_guidance["analyst"]),
                "tone": "info",
            }
        )

        return cards[:5]

    def _augment_kpis_for_role(
        self,
        kpis: Dict[str, Any],
        role: str,
        quality_report: Dict[str, Any],
        filtered_df: pd.DataFrame,
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        cards = list(kpis.get("cards", []))

        if role == "founder":
            cards = sorted(cards, key=lambda card: 0 if "Total" in card["title"] else 1)
        elif role == "accountant":
            cards.append(
                {
                    "id": "duplicate_rows",
                    "title": "Duplicate Rows",
                    "value": quality_report["duplicateRows"],
                    "unit": "number",
                    "subtitle": "Potential duplicates detected before cleaning",
                    "color": "from-rose-500 to-orange-500",
                }
            )
        elif role == "manager":
            category_column = request["filters"].get("categoryColumn")
            active_categories = (
                int(filtered_df[category_column].dropna().astype(str).nunique())
                if category_column and category_column in filtered_df.columns
                else 0
            )
            cards.append(
                {
                    "id": "active_categories",
                    "title": "Active Categories",
                    "value": active_categories,
                    "unit": "number",
                    "subtitle": "Unique category coverage in the current view",
                    "color": "from-cyan-500 to-blue-500",
                }
            )

        kpis["cards"] = cards[:4]
        return kpis

    def _build_preview(
        self, df: pd.DataFrame, column_summary: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        preview_columns = [column["name"] for column in column_summary[:8]]
        preview_rows: List[Dict[str, Any]] = []
        for _, row in df[preview_columns].head(12).iterrows():
            preview_rows.append(
                {column: realtime_analysis_service._stringify(row[column]) for column in preview_columns}
            )

        return {
            "columns": preview_columns,
            "rows": preview_rows,
            "totalRows": int(df.shape[0]),
            "sampled": bool(df.shape[0] > 12),
        }


advanced_dashboard_service = AdvancedDashboardService()
