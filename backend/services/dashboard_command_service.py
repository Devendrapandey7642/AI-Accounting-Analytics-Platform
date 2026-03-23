from __future__ import annotations

import calendar
import re
from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional

from backend.services.advanced_dashboard_service import advanced_dashboard_service


class DashboardCommandService:
    ROLE_KEYWORDS = {
        "founder": "founder",
        "manager": "manager",
        "accountant": "accountant",
        "analyst": "analyst",
    }

    METRIC_ALIASES = {
        "sales": ["sales", "revenue", "income", "amount", "gmv"],
        "expense": ["expense", "expenses", "cost", "costs", "spend", "spending", "payment"],
        "profit": ["profit", "profits", "margin", "earnings", "net"],
        "cash": ["cash", "balance", "liquidity"],
        "count": ["count", "transactions", "orders", "records", "rows"],
    }

    GROUPING_HINTS = [
        "category",
        "categories",
        "region",
        "department",
        "customer",
        "segment",
        "product",
        "channel",
        "team",
        "branch",
        "location",
    ]

    BREAKDOWN_KEYWORDS = (
        "top",
        "bottom",
        "breakdown",
        "share",
        "category",
        "categories",
        "region",
        "department",
        "segment",
        "product",
        "channel",
    )

    TREND_KEYWORDS = (
        "trend",
        "over time",
        "timeline",
        "forecast",
        "daily",
        "weekly",
        "monthly",
        "yearly",
        "last ",
        "ytd",
        "mtd",
        "qtd",
        "this month",
        "this year",
    )

    FOLLOW_UP_FILLERS = {
        "ab",
        "abhi",
        "now",
        "next",
        "then",
        "also",
        "please",
        "kindly",
        "just",
        "sirf",
        "only",
        "show",
        "me",
        "it",
        "make",
    }

    MONTH_LOOKUP = {
        month.lower(): index for index, month in enumerate(calendar.month_name) if month
    }

    def interpret_command(
        self,
        upload_id: int,
        query: str,
        current_request: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        current_dashboard = advanced_dashboard_service.build_dashboard(upload_id, current_request)
        next_request = deepcopy(current_dashboard["activeRequest"])
        normalized_query = self._normalize_query(query)
        notes: list[str] = []
        filter_options = current_dashboard["filterOptions"]

        metric = self._match_metric(normalized_query, filter_options["metrics"])
        if metric and metric != next_request["preferences"].get("metric"):
            next_request["preferences"]["metric"] = metric
            notes.append(f"metric set to {metric}")

        secondary_metric = self._match_secondary_metric(
            normalized_query,
            filter_options["metrics"],
            next_request["preferences"]["metric"],
        )
        if secondary_metric and secondary_metric != next_request["preferences"].get("secondaryMetric"):
            next_request["preferences"]["secondaryMetric"] = secondary_metric
            notes.append(f"secondary metric set to {secondary_metric}")

        aggregation = self._match_aggregation(normalized_query)
        if aggregation and aggregation != next_request["preferences"].get("aggregation"):
            next_request["preferences"]["aggregation"] = aggregation
            notes.append(f"aggregation switched to {aggregation}")

        granularity = self._match_granularity(normalized_query)
        if granularity and granularity != next_request["preferences"].get("granularity"):
            next_request["preferences"]["granularity"] = granularity
            notes.append(f"granularity set to {granularity}")

        role = self._match_role(normalized_query)
        if role and role != next_request["preferences"].get("dashboardRole"):
            next_request["preferences"]["dashboardRole"] = role
            notes.append(f"role preset switched to {role}")

        workspace_mode = self._match_workspace_mode(normalized_query)
        if workspace_mode and workspace_mode != next_request["workspace"].get("mode"):
            next_request["workspace"]["mode"] = workspace_mode
            notes.append(f"workspace mode switched to {workspace_mode}")

        compare_upload_id = self._match_compare_upload(normalized_query)
        if compare_upload_id is not None and compare_upload_id != next_request["workspace"].get("compareUploadId"):
            next_request["workspace"]["compareUploadId"] = compare_upload_id
            notes.append(f"using upload {compare_upload_id} as comparison source")

        if any(keyword in normalized_query for keyword in ["compare", "versus", "vs", "previous"]):
            if not next_request["preferences"].get("compareMode"):
                notes.append("compare mode enabled")
            next_request["preferences"]["compareMode"] = True

        top_n = self._match_top_n(normalized_query)
        if top_n and top_n != next_request["preferences"].get("topN"):
            next_request["preferences"]["topN"] = top_n
            notes.append(f"top {top_n} view enabled")

        sort_order = self._match_sort_order(normalized_query)
        if sort_order and sort_order != next_request["preferences"].get("sortOrder"):
            next_request["preferences"]["sortOrder"] = sort_order
            notes.append(f"sort order switched to {sort_order}")

        self._apply_business_intents(normalized_query, next_request, current_dashboard, notes)

        chart_type = self._match_chart_type(normalized_query)
        if chart_type:
            next_request["preferences"]["chartPreference"] = chart_type
            next_request["chartBuilder"]["chartType"] = chart_type
            notes.append(f"chart preference changed to {chart_type}")

        self._apply_date_phrase(normalized_query, next_request, filter_options, notes)

        grouping_column = self._match_grouping_column(normalized_query, current_dashboard)
        if grouping_column and grouping_column != next_request["filters"].get("categoryColumn"):
            next_request["filters"]["categoryColumn"] = grouping_column
            notes.append(f"grouped by {grouping_column}")

        category_result = self._match_category_value(normalized_query, filter_options["categoryValues"])
        if category_result:
            next_request["filters"]["categoryColumn"] = category_result["column"]
            next_request["filters"]["categories"] = [category_result["value"]]
            next_request["filters"]["drilldownColumn"] = category_result["column"]
            next_request["filters"]["drilldownValue"] = category_result["value"]
            notes.append(f"filtered {category_result['column']} to {category_result['value']}")

        self._apply_cleaning_phrase(normalized_query, next_request, notes)
        self._apply_chart_builder_phrase(normalized_query, next_request, current_dashboard, notes)
        self._apply_scenario_phrase(normalized_query, next_request, current_dashboard, notes)
        self._apply_target_phrase(normalized_query, next_request, current_dashboard, notes)
        self._apply_join_phrase(normalized_query, next_request, current_dashboard, notes)
        self._apply_rename_phrase(query, next_request, current_dashboard, notes)
        self._apply_intent_defaults(normalized_query, next_request, current_dashboard, notes)

        preview_dashboard = advanced_dashboard_service.build_dashboard(upload_id, next_request)
        response = self._build_response(normalized_query, notes, preview_dashboard)
        details = self._build_details(
            normalized_query,
            notes,
            preview_dashboard,
            current_dashboard["activeRequest"],
            current_request is not None,
        )

        return {
            "response": response,
            "dashboard_action": preview_dashboard["activeRequest"],
            "preview": {
                "dataset": preview_dashboard["dataset"],
                "kpis": preview_dashboard["kpis"],
                "chartCount": len(preview_dashboard["charts"]),
            },
            "details": details,
        }

    def _normalize_query(self, query: str) -> str:
        normalized = self._normalize_phrase(query)
        tokens = normalized.split()
        while tokens and tokens[0] in self.FOLLOW_UP_FILLERS and len(tokens) > 1:
            tokens.pop(0)
        return " ".join(tokens)

    def _normalize_phrase(self, value: str) -> str:
        cleaned = re.sub(r"[^a-z0-9_]+", " ", value.lower())
        return re.sub(r"\s+", " ", cleaned).strip()

    def _match_metric(self, query: str, metrics: list[str]) -> Optional[str]:
        mentions = self._metric_mentions(query, metrics)
        return mentions[0] if mentions else None

    def _match_secondary_metric(
        self,
        query: str,
        metrics: list[str],
        primary_metric: Optional[str],
    ) -> Optional[str]:
        for metric in self._metric_mentions(query, metrics):
            if metric != primary_metric:
                return metric

        if ("scatter" in query or "correlation" in query) and len(metrics) > 1:
            for metric in metrics:
                if metric != primary_metric:
                    return metric

        return None

    def _metric_mentions(self, query: str, metrics: list[str]) -> list[str]:
        matches: list[tuple[int, int, str]] = []
        for index, metric in enumerate(metrics):
            positions = [query.find(keyword) for keyword in self._metric_keywords(metric)]
            positions = [position for position in positions if position >= 0]
            if positions:
                matches.append((min(positions), index, metric))

        matches.sort()
        return [metric for _, _, metric in matches]

    def _metric_keywords(self, metric: str) -> list[str]:
        normalized_metric = self._normalize_phrase(metric)
        keywords = {normalized_metric}
        keywords.update(token for token in normalized_metric.split() if len(token) >= 3)

        for alias_group, aliases in self.METRIC_ALIASES.items():
            if alias_group in normalized_metric or any(alias in normalized_metric for alias in aliases):
                keywords.update(aliases)

        return sorted(keywords, key=len, reverse=True)

    def _match_aggregation(self, query: str) -> Optional[str]:
        if "average" in query or "avg" in query or "mean" in query:
            return "mean"
        if "count" in query or "how many" in query:
            return "count"
        if "sum" in query or "total" in query:
            return "sum"
        return None

    def _match_granularity(self, query: str) -> Optional[str]:
        if any(keyword in query for keyword in ["per month", "by month", "month over month", "monthly trend", "monthly chart", "monthly view"]):
            return "month"
        if any(keyword in query for keyword in ["per week", "by week", "week over week", "weekly trend", "weekly chart", "weekly view"]):
            return "week"
        if any(keyword in query for keyword in ["per day", "by day", "day by day", "daily trend", "daily chart", "daily view"]):
            return "day"
        return None

    def _match_role(self, query: str) -> Optional[str]:
        for keyword, role in self.ROLE_KEYWORDS.items():
            if keyword in query:
                return role
        return None

    def _match_compare_upload(self, query: str) -> Optional[int]:
        match = re.search(r"(?:compare with|benchmark(?: against)?|join with|append|against|upload)\s+(\d+)", query)
        return int(match.group(1)) if match else None

    def _match_workspace_mode(self, query: str) -> Optional[str]:
        if "benchmark" in query:
            return "benchmark"
        if "join" in query:
            return "join"
        if "append" in query or "merge" in query or "combine" in query:
            return "append"
        if "compare" in query or "versus" in query or "vs" in query:
            return "compare"
        return None

    def _match_top_n(self, query: str) -> Optional[int]:
        match = re.search(r"(?:top|bottom)\s+(\d+)", query)
        return int(match.group(1)) if match else None

    def _match_sort_order(self, query: str) -> Optional[str]:
        if any(keyword in query for keyword in ["bottom", "lowest", "smallest", "ascending", "low to high"]):
            return "asc"
        if any(keyword in query for keyword in ["top", "highest", "largest", "descending", "high to low"]):
            return "desc"
        return None

    def _match_chart_type(self, query: str) -> Optional[str]:
        if any(keyword in query for keyword in ["scatter", "correlation"]):
            return "scatter"
        if any(keyword in query for keyword in ["pie", "donut"]):
            return "pie"
        if any(keyword in query for keyword in ["line", "trend", "forecast", "timeline"]):
            return "line"
        if any(keyword in query for keyword in ["bar", "column"]):
            return "bar"
        return None

    def _apply_business_intents(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        metrics = dashboard["filterOptions"].get("metrics", [])
        profit_metric = self._closest_column_match("profit", metrics)

        if (
            profit_metric
            and any(keyword in query for keyword in ["loss", "loss making", "loss-making", "unprofitable"])
            and any(keyword in query for keyword in self.BREAKDOWN_KEYWORDS)
        ):
            request["preferences"]["metric"] = profit_metric
            request["preferences"]["sortOrder"] = "asc"
            if request["preferences"].get("topN", 8) == 8:
                request["preferences"]["topN"] = 3
            notes.append(f"loss analysis focused on {profit_metric}")

        if profit_metric and any(keyword in query for keyword in ["profit kyu", "profit why", "why profit", "profit gira", "profit down", "profit drop"]):
            request["preferences"]["metric"] = profit_metric
            notes.append(f"profit reasoning focused on {profit_metric}")

        if len([month_name for month_name in self.MONTH_LOOKUP if month_name in query]) >= 2 and any(
            keyword in query for keyword in ["compare", "versus", "vs"]
        ):
            request["preferences"]["granularity"] = "month"
            request["preferences"]["compareMode"] = True
            notes.append("month-over-month comparison enabled")

    def _match_grouping_column(
        self,
        query: str,
        dashboard: Dict[str, Any],
    ) -> Optional[str]:
        categorical_columns = dashboard["filterOptions"].get("categoricalColumns", [])
        if not categorical_columns:
            return None

        group_match = re.search(r"(?:group by|breakdown by|break down by|by)\s+([a-z0-9_ ]+)", query)
        if group_match:
            column = self._closest_column_match(group_match.group(1), categorical_columns)
            if column:
                return column

        for column in categorical_columns:
            normalized_column = self._normalize_phrase(column)
            if normalized_column and normalized_column in query:
                return column

        for hint in self.GROUPING_HINTS:
            if hint in query:
                for column in categorical_columns:
                    normalized_column = self._normalize_phrase(column)
                    if hint.rstrip("s") in normalized_column or normalized_column in hint:
                        return column

        return None

    def _match_category_value(
        self,
        query: str,
        category_values: Dict[str, list[str]],
    ) -> Optional[Dict[str, str]]:
        for column, values in category_values.items():
            normalized_column = self._normalize_phrase(column)
            for value in values:
                normalized_value = self._normalize_phrase(value)
                if len(normalized_value) < 3:
                    continue

                patterns = [
                    f"for {normalized_value}",
                    f"in {normalized_value}",
                    f"only {normalized_value}",
                    f"just {normalized_value}",
                    f"sirf {normalized_value}",
                    f"ab {normalized_value}",
                    f"ab sirf {normalized_value}",
                    f"{normalized_column} {normalized_value}",
                    f"{normalized_column} is {normalized_value}",
                ]
                if (
                    any(pattern in query for pattern in patterns)
                    or query == normalized_value
                    or query.endswith(f" {normalized_value}")
                ):
                    return {"column": column, "value": value}

        return None

    def _apply_date_phrase(
        self,
        query: str,
        request: Dict[str, Any],
        filter_options: Dict[str, Any],
        notes: list[str],
    ) -> None:
        date_column = request["filters"].get("dateColumn") or (
            filter_options["dateColumns"][0] if filter_options["dateColumns"] else None
        )
        if not date_column:
            return

        request["filters"]["dateColumn"] = date_column

        if any(keyword in query for keyword in ["all time", "full dataset", "entire dataset", "reset date filter"]):
            if request["filters"].get("startDate") or request["filters"].get("endDate"):
                notes.append("date filter cleared")
            request["filters"]["startDate"] = ""
            request["filters"]["endDate"] = ""
            return

        anchor_date = self._reference_date(filter_options, date_column)
        min_date = self._boundary_date(filter_options, date_column, "min")
        start_date: Optional[date] = None
        end_date: Optional[date] = anchor_date

        days_match = re.search(r"last\s+(\d+)\s+days", query)
        months_match = re.search(r"last\s+(\d+)\s+months", query)
        years_match = re.search(r"last\s+(\d+)\s+years", query)

        if days_match:
            days = max(1, int(days_match.group(1)))
            start_date = anchor_date - timedelta(days=days - 1)
        elif months_match:
            months = max(1, int(months_match.group(1)))
            start_date = anchor_date - timedelta(days=months * 30 - 1)
        elif years_match:
            years = max(1, int(years_match.group(1)))
            start_date = anchor_date - timedelta(days=years * 365 - 1)
        elif "last week" in query:
            start_date = anchor_date - timedelta(days=6)
        elif "last month" in query:
            start_date = anchor_date - timedelta(days=29)
        elif "last quarter" in query:
            start_date = anchor_date - timedelta(days=89)
        elif "last year" in query:
            start_date = anchor_date - timedelta(days=364)
        elif "year to date" in query or "ytd" in query or "this year" in query:
            start_date = date(anchor_date.year, 1, 1)
        elif "month to date" in query or "mtd" in query or "this month" in query:
            start_date = date(anchor_date.year, anchor_date.month, 1)
        elif "quarter to date" in query or "qtd" in query:
            quarter_start_month = ((anchor_date.month - 1) // 3) * 3 + 1
            start_date = date(anchor_date.year, quarter_start_month, 1)

        month_window = self._match_month_window(query, anchor_date)
        if month_window:
            start_date, end_date = month_window

        if not start_date:
            return

        if min_date and start_date < min_date:
            start_date = min_date

        request["filters"]["startDate"] = start_date.isoformat()
        request["filters"]["endDate"] = end_date.isoformat()
        notes.append(f"date range set to {start_date.isoformat()} through {end_date.isoformat()}")

    def _match_month_window(self, query: str, anchor_date: date) -> Optional[tuple[date, date]]:
        mentioned_months = [
            month_number
            for month_name, month_number in self.MONTH_LOOKUP.items()
            if month_name in query
        ]
        if not mentioned_months:
            return None

        selected_months = sorted(set(mentioned_months))
        year = anchor_date.year
        if selected_months[0] > anchor_date.month:
            year -= 1

        start_month = selected_months[0]
        end_month = selected_months[-1]
        start_date = date(year, start_month, 1)
        if end_month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, end_month + 1, 1) - timedelta(days=1)
        return start_date, end_date

    def _reference_date(self, filter_options: Dict[str, Any], date_column: str) -> date:
        max_value = filter_options.get("dateRanges", {}).get(date_column, {}).get("max")
        if max_value:
            return date.fromisoformat(max_value)
        return datetime.utcnow().date()

    def _boundary_date(
        self,
        filter_options: Dict[str, Any],
        date_column: str,
        boundary: str,
    ) -> Optional[date]:
        boundary_value = filter_options.get("dateRanges", {}).get(date_column, {}).get(boundary)
        return date.fromisoformat(boundary_value) if boundary_value else None

    def _apply_cleaning_phrase(self, query: str, request: Dict[str, Any], notes: list[str]) -> None:
        if any(keyword in query for keyword in ["remove duplicates", "drop duplicates", "dedupe"]):
            request["cleaning"]["dropDuplicates"] = True
            notes.append("duplicate rows will be removed")
        if "keep duplicates" in query:
            request["cleaning"]["dropDuplicates"] = False
            notes.append("duplicate rows will be kept")
        if any(keyword in query for keyword in ["fill missing with zero", "fill null with zero"]):
            request["cleaning"]["numericNullStrategy"] = "zero"
            notes.append("numeric nulls will be filled with zero")
        if "fill missing with mean" in query:
            request["cleaning"]["numericNullStrategy"] = "mean"
            notes.append("numeric nulls will be filled with the mean")
        if "keep missing" in query:
            request["cleaning"]["numericNullStrategy"] = "keep"
        if "trim text" in query:
            request["cleaning"]["trimText"] = True
            notes.append("text values will be trimmed")
        if any(keyword in query for keyword in ["remove empty columns", "drop empty columns"]):
            request["cleaning"]["removeEmptyColumns"] = True
            notes.append("empty columns will be removed")
        if "keep empty columns" in query:
            request["cleaning"]["removeEmptyColumns"] = False
            notes.append("empty columns will be kept")

    def _apply_chart_builder_phrase(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        chart_builder_before = deepcopy(request["chartBuilder"])
        columns = [column["name"] for column in dashboard.get("columnSummary", [])]
        metrics = dashboard["filterOptions"]["metrics"]

        if any(keyword in query for keyword in ["clear chart builder", "reset chart builder"]):
            request["chartBuilder"]["enabled"] = False
            request["chartBuilder"]["title"] = ""
            request["chartBuilder"]["xColumn"] = (
                request["filters"].get("dateColumn") or request["filters"].get("categoryColumn")
            )
            request["chartBuilder"]["yColumns"] = []
            if chart_builder_before.get("enabled"):
                notes.append("custom chart builder cleared")
            return

        x_axis_match = re.search(r"(?:x axis|group by|plot by)\s+([a-z0-9_ ]+?)(?:\s+using|\s+y axis|$)", query)
        if x_axis_match:
            column = self._closest_column_match(x_axis_match.group(1), columns)
            if column:
                request["chartBuilder"]["xColumn"] = column
                request["chartBuilder"]["enabled"] = True

        y_axis_match = re.search(r"(?:y axis|using)\s+([a-z0-9_ ]+?)(?:\s+by|$)", query)
        if y_axis_match:
            metric = self._closest_column_match(y_axis_match.group(1), metrics)
            if metric:
                request["chartBuilder"]["yColumns"] = [metric]
                request["chartBuilder"]["enabled"] = True

        chart_type = self._match_chart_type(query)
        metric_matches = self._metric_mentions(query, metrics)
        if chart_type and metric_matches:
            request["chartBuilder"]["enabled"] = True
            request["chartBuilder"]["chartType"] = chart_type
            request["chartBuilder"]["yColumns"] = metric_matches[: 2 if chart_type == "scatter" else 1]

        if request["chartBuilder"].get("enabled") and not request["chartBuilder"].get("xColumn"):
            fallback_column = request["filters"].get("dateColumn") or request["filters"].get("categoryColumn")
            if fallback_column:
                request["chartBuilder"]["xColumn"] = fallback_column

        if request["chartBuilder"].get("enabled") and not request["chartBuilder"].get("title"):
            title_metric = (
                request["chartBuilder"]["yColumns"][0]
                if request["chartBuilder"]["yColumns"]
                else request["preferences"].get("metric")
            )
            title_dimension = request["chartBuilder"].get("xColumn") or "workspace"
            request["chartBuilder"]["title"] = f"{title_metric} by {title_dimension}"

        if request["chartBuilder"] != chart_builder_before:
            notes.append("custom chart updated")

    def _apply_scenario_phrase(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        if any(keyword in query for keyword in ["clear scenario", "reset scenario"]):
            if request["scenario"].get("enabled"):
                notes.append("scenario cleared")
            request["scenario"]["enabled"] = False
            return

        metrics = dashboard["filterOptions"]["metrics"]
        scenario_match = re.search(
            r"(increase|decrease|up|down)\s+([a-z0-9_ ]+?)\s+by\s+(\d+(?:\.\d+)?)",
            query,
        )
        if not scenario_match:
            return

        direction, metric_phrase, amount = scenario_match.groups()
        metric = self._closest_column_match(metric_phrase.strip(), metrics) or request["preferences"]["metric"]
        if not metric:
            return

        adjustment = float(amount)
        if direction in {"decrease", "down"}:
            adjustment *= -1

        request["scenario"]["enabled"] = True
        request["scenario"]["metric"] = metric
        request["scenario"]["adjustmentPercent"] = adjustment
        notes.append(f"scenario set to {adjustment:.1f}% for {metric}")

    def _apply_target_phrase(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        if any(keyword in query for keyword in ["clear target", "reset target"]):
            if request["targets"].get("enabled"):
                notes.append("target cleared")
            request["targets"]["enabled"] = False
            return

        metrics = dashboard["filterOptions"]["metrics"]
        target_match = re.search(r"target\s+([a-z0-9_ ]+?)\s+(?:at|to)\s+(\d+(?:\.\d+)?)", query)
        if not target_match:
            return

        metric_phrase, amount = target_match.groups()
        metric = self._closest_column_match(metric_phrase.strip(), metrics) or request["preferences"]["metric"]
        if not metric:
            return

        request["targets"]["enabled"] = True
        request["targets"]["metric"] = metric
        request["targets"]["targetValue"] = float(amount)
        notes.append(f"target set for {metric} at {float(amount):.2f}")

    def _apply_join_phrase(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        if request["workspace"].get("mode") != "join":
            return

        columns = [column["name"] for column in dashboard.get("columnSummary", [])]
        join_type_match = re.search(r"\b(inner|left|outer)\s+join\b", query)
        if join_type_match:
            request["workspace"]["joinType"] = join_type_match.group(1)
            notes.append(f"join type set to {join_type_match.group(1)}")

        join_key_match = re.search(r"join on\s+([a-z0-9_ ]+?)(?:\s+and|,|$)", query)
        if join_key_match:
            matched_key = self._closest_column_match(join_key_match.group(1), columns)
            if matched_key:
                request["workspace"]["joinKeys"] = [matched_key]
                notes.append(f"join key set to {matched_key}")

    def _apply_rename_phrase(
        self,
        raw_query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        columns = [column["name"] for column in dashboard.get("columnSummary", [])]
        rename_match = re.search(r"rename\s+(.+?)\s+to\s+(.+)", raw_query, re.IGNORECASE)
        if not rename_match:
            return

        source_phrase, target_phrase = rename_match.groups()
        actual_source = self._closest_column_match(source_phrase, columns)
        target = target_phrase.strip()
        if not actual_source or not target:
            return

        request["transformations"]["renameColumns"] = [
            item
            for item in request["transformations"].get("renameColumns", [])
            if item.get("source") != actual_source
        ] + [{"source": actual_source, "target": target}]
        if request["preferences"].get("metric") == actual_source:
            request["preferences"]["metric"] = target
        if request["preferences"].get("secondaryMetric") == actual_source:
            request["preferences"]["secondaryMetric"] = target
        if request["scenario"].get("metric") == actual_source:
            request["scenario"]["metric"] = target
        if request["targets"].get("metric") == actual_source:
            request["targets"]["metric"] = target
        if request["chartBuilder"].get("xColumn") == actual_source:
            request["chartBuilder"]["xColumn"] = target
        request["chartBuilder"]["yColumns"] = [
            target if column == actual_source else column
            for column in request["chartBuilder"].get("yColumns", [])
        ]
        notes.append(f"column {actual_source} will be renamed to {target}")

    def _apply_intent_defaults(
        self,
        query: str,
        request: Dict[str, Any],
        dashboard: Dict[str, Any],
        notes: list[str],
    ) -> None:
        chart_builder_before = deepcopy(request["chartBuilder"])
        metric = request["preferences"].get("metric")
        secondary_metric = request["preferences"].get("secondaryMetric")
        category_column = request["filters"].get("categoryColumn")
        date_column = request["filters"].get("dateColumn")
        requested_chart_type = self._match_chart_type(query)

        if any(keyword in query for keyword in ["scatter", "correlation"]) and metric and secondary_metric:
            request["chartBuilder"]["enabled"] = True
            request["chartBuilder"]["chartType"] = "scatter"
            request["chartBuilder"]["xColumn"] = metric
            request["chartBuilder"]["yColumns"] = [metric, secondary_metric]
            request["chartBuilder"]["title"] = f"{metric} versus {secondary_metric}"
        elif any(keyword in query for keyword in self.BREAKDOWN_KEYWORDS) and category_column and metric:
            request["chartBuilder"]["enabled"] = True
            request["chartBuilder"]["chartType"] = (
                requested_chart_type if requested_chart_type in {"bar", "pie"} else "bar"
            )
            request["chartBuilder"]["xColumn"] = category_column
            request["chartBuilder"]["yColumns"] = [metric]
            request["chartBuilder"]["title"] = f"{metric} by {category_column}"
        elif any(keyword in query for keyword in self.TREND_KEYWORDS) and date_column and metric:
            request["chartBuilder"]["enabled"] = True
            request["chartBuilder"]["chartType"] = (
                requested_chart_type if requested_chart_type in {"line", "bar"} else "line"
            )
            request["chartBuilder"]["xColumn"] = date_column
            request["chartBuilder"]["yColumns"] = [metric]
            request["chartBuilder"]["title"] = f"{metric} over time"

        if request["scenario"].get("enabled") and date_column and metric:
            request["chartBuilder"]["enabled"] = True
            request["chartBuilder"]["chartType"] = "line"
            request["chartBuilder"]["xColumn"] = date_column
            request["chartBuilder"]["yColumns"] = [metric]
            request["chartBuilder"]["title"] = f"{metric} what-if scenario"

        if request["chartBuilder"] != chart_builder_before:
            notes.append("chart layout aligned to the command intent")

    def _build_response(
        self,
        query: str,
        notes: list[str],
        dashboard: Dict[str, Any],
    ) -> str:
        summary = self._build_summary(query, dashboard)
        unique_notes = list(dict.fromkeys(notes))
        if unique_notes:
            note_text = "; ".join(unique_notes[:4])
            return f"{summary} Updated workspace: {note_text}."
        return summary

    def _build_details(
        self,
        query: str,
        notes: list[str],
        dashboard: Dict[str, Any],
        previous_request: Dict[str, Any],
        used_existing_context: bool,
    ) -> Dict[str, Any]:
        active_request = dashboard["activeRequest"]
        return {
            "intent": self._detect_intent(query, active_request),
            "summary": self._build_summary(query, dashboard),
            "appliedChanges": list(dict.fromkeys(notes))[:6],
            "activeFilters": self._describe_filters(active_request),
            "focusMetric": dashboard["dataset"].get("activeMetric"),
            "focusDimension": dashboard["dataset"].get("activeCategoryColumn") or dashboard["dataset"].get("activeDateColumn"),
            "generatedCharts": list(dict.fromkeys(chart["title"] for chart in dashboard.get("charts", [])[:4])),
            "followUpSuggestions": self._suggest_follow_ups(query, dashboard),
            "usedExistingContext": used_existing_context and self._request_changed(previous_request, active_request),
        }

    def _build_summary(self, query: str, dashboard: Dict[str, Any]) -> str:
        if dashboard.get("benchmark", {}).get("enabled"):
            benchmark = dashboard["benchmark"]
            direction = "above" if benchmark["delta"] >= 0 else "below"
            return (
                f"{benchmark['metric'] or 'Active metric'} is {self._format_number(benchmark['current'])}, "
                f"{abs(benchmark['deltaPercent']):.1f}% {direction} benchmark {benchmark['baselineLabel']}."
            )

        if dashboard.get("targetTracking", {}).get("enabled"):
            target = dashboard["targetTracking"]
            status = target["status"].replace("_", " ")
            return (
                f"{target['metric'] or 'Active metric'} is {self._format_number(target['actualValue'])} "
                f"against a target of {self._format_number(target['targetValue'])}, currently {status}."
            )

        if "forecast" in query and dashboard.get("forecast", {}).get("enabled"):
            forecast_summary = self._summarize_forecast(dashboard["forecast"])
            if forecast_summary:
                return forecast_summary

        if dashboard.get("comparison", {}).get("enabled") and any(
            keyword in query for keyword in ["compare", "versus", "vs", "previous"]
        ):
            cards = dashboard["comparison"].get("cards", [])
            if cards:
                card = cards[0]
                direction = "up" if card["delta"] >= 0 else "down"
                return (
                    f"{card['title']} is {self._format_number(card['current'])}, "
                    f"{direction} {abs(card['deltaPercent']):.1f}% versus {dashboard['comparison']['baselineLabel']}."
                )

        if any(keyword in query for keyword in ["anomaly", "anomalies", "outlier", "fraud"]):
            if dashboard.get("anomalies"):
                anomaly = dashboard["anomalies"][0]
                return f"{anomaly['title']}: {anomaly['description']}"
            return "No material anomalies were detected in the active view."

        if any(keyword in query for keyword in ["why", "kyu", "reason", "gira", "gir", "drop", "down"]):
            driver_summary = self._summarize_driver(dashboard)
            if driver_summary:
                return driver_summary

        breakdown_summary = self._summarize_breakdown(dashboard)
        if breakdown_summary and any(keyword in query for keyword in self.BREAKDOWN_KEYWORDS):
            return breakdown_summary

        trend_summary = self._summarize_trend(dashboard)
        if trend_summary and any(
            keyword in query
            for keyword in (*self.TREND_KEYWORDS, "line", "increase", "decrease", "up", "down")
        ):
            return trend_summary

        if breakdown_summary:
            return breakdown_summary
        if trend_summary:
            return trend_summary

        dataset = dashboard["dataset"]
        metric = dataset.get("activeMetric") or "the active metric"
        return (
            f"{dataset['filteredRows']} rows are active with {metric} selected and "
            f"{len(dashboard.get('charts', []))} charts ready."
        )

    def _detect_intent(self, query: str, request: Dict[str, Any]) -> str:
        if any(keyword in query for keyword in ["why", "kyu", "reason"]):
            return "reasoning"
        if request.get("scenario", {}).get("enabled"):
            return "scenario"
        if request.get("targets", {}).get("enabled"):
            return "target"
        if request.get("workspace", {}).get("mode") in {"append", "join", "benchmark"}:
            return request["workspace"]["mode"]
        if any(keyword in query for keyword in ["compare", "versus", "vs"]):
            return "comparison"
        if any(keyword in query for keyword in self.BREAKDOWN_KEYWORDS):
            return "breakdown"
        if any(keyword in query for keyword in self.TREND_KEYWORDS):
            return "trend"
        return "analysis"

    def _describe_filters(self, request: Dict[str, Any]) -> list[str]:
        filters = request.get("filters", {})
        descriptions: list[str] = []
        if filters.get("startDate") or filters.get("endDate"):
            start = filters.get("startDate") or "start"
            end = filters.get("endDate") or "today"
            descriptions.append(f"Date: {start} to {end}")
        if filters.get("categoryColumn") and filters.get("categories"):
            descriptions.append(
                f"{filters['categoryColumn']}: {', '.join(str(item) for item in filters['categories'][:3])}"
            )
        if filters.get("drilldownColumn") and filters.get("drilldownValue"):
            descriptions.append(f"Drill-down: {filters['drilldownColumn']} = {filters['drilldownValue']}")
        return descriptions

    def _request_changed(self, previous_request: Dict[str, Any], next_request: Dict[str, Any]) -> bool:
        return previous_request != next_request

    def _suggest_follow_ups(self, query: str, dashboard: Dict[str, Any]) -> list[str]:
        metric = dashboard["dataset"].get("activeMetric") or "metric"
        category_column = dashboard["dataset"].get("activeCategoryColumn") or "category"
        suggestions = [
            f"show top 5 {category_column.lower()} by {metric.lower()}",
            f"make it a pie chart by {category_column.lower()}",
            f"compare previous period for {metric.lower()}",
            f"show anomalies for {metric.lower()}",
            f"only top {category_column.lower()} and forecast {metric.lower()}",
        ]

        if any(keyword in query for keyword in ["why", "kyu", "reason"]):
            suggestions.insert(0, f"show lowest {category_column.lower()} by {metric.lower()}")

        deduped: list[str] = []
        for suggestion in suggestions:
            if suggestion not in deduped:
                deduped.append(suggestion)
        return deduped[:4]

    def _summarize_driver(self, dashboard: Dict[str, Any]) -> Optional[str]:
        trend_summary = self._summarize_trend(dashboard)
        breakdown = self._summarize_breakdown(dashboard)
        if trend_summary and breakdown:
            return f"{trend_summary} Biggest visible driver in the breakdown is: {breakdown}"
        return trend_summary or breakdown

    def _summarize_breakdown(self, dashboard: Dict[str, Any]) -> Optional[str]:
        for chart in dashboard.get("charts", []):
            if chart.get("role") not in {"custom", "breakdown", "share"}:
                continue
            if chart.get("chartType") not in {"bar", "pie"} and chart.get("role") == "custom":
                continue
            records = chart.get("data", [])
            if not records:
                continue
            top_record = records[0]
            label = top_record.get("label") or top_record.get("name")
            value = top_record["metric_1"] if "metric_1" in top_record else top_record.get("value")
            group_name = chart.get("interaction", {}).get("filterColumn") or "group"
            metric_name = chart.get("seriesLabels", {}).get("metric_1") or dashboard["dataset"].get("activeMetric")
            if label is None or value is None:
                continue
            return (
                f"Top {group_name} is {label} at {self._format_number(float(value))} "
                f"for {metric_name} across {len(records)} groups."
            )
        return None

    def _summarize_trend(self, dashboard: Dict[str, Any]) -> Optional[str]:
        for chart in dashboard.get("charts", []):
            if chart.get("role") not in {"custom", "trend"}:
                continue
            records = chart.get("data", [])
            if not records:
                continue
            first = records[0]
            last = records[-1]
            first_value = float(first.get("metric_1", 0.0))
            last_value = float(last.get("metric_1", 0.0))
            metric_name = chart.get("seriesLabels", {}).get("metric_1") or dashboard["dataset"].get("activeMetric")
            if len(records) == 1:
                return f"{metric_name} is {self._format_number(last_value)} for {last.get('label', 'the latest period')}."
            direction = "up" if last_value > first_value else "down" if last_value < first_value else "flat"
            return (
                f"{metric_name} moves from {self._format_number(first_value)} on {first.get('label')} "
                f"to {self._format_number(last_value)} on {last.get('label')}, trending {direction}."
            )
        return None

    def _summarize_forecast(self, forecast: Dict[str, Any]) -> Optional[str]:
        if not forecast.get("enabled"):
            return None

        forecast_points = [point for point in forecast.get("points", []) if "forecast" in point]
        actual_points = [point for point in forecast.get("points", []) if "actual" in point]
        if not forecast_points:
            return None

        latest_forecast = forecast_points[-1]
        latest_actual = actual_points[-1] if actual_points else None
        if latest_actual:
            return (
                f"{forecast.get('metric') or 'Active metric'} is projected to reach "
                f"{self._format_number(float(latest_forecast['forecast']))} by {latest_forecast['label']}, "
                f"up from {self._format_number(float(latest_actual['actual']))} in the latest actual period."
            )

        return (
            f"{forecast.get('metric') or 'Active metric'} is projected at "
            f"{self._format_number(float(latest_forecast['forecast']))} by {latest_forecast['label']}."
        )

    def _format_number(self, value: float) -> str:
        if abs(value) >= 1000:
            return f"{value:,.2f}".rstrip("0").rstrip(".")
        if float(value).is_integer():
            return str(int(value))
        return f"{value:.2f}".rstrip("0").rstrip(".")

    def _closest_column_match(self, phrase: str, candidates: list[str]) -> Optional[str]:
        normalized_phrase = self._normalize_phrase(phrase)
        if not normalized_phrase:
            return None

        phrase_tokens = set(normalized_phrase.split())
        best_match: Optional[tuple[int, int, str]] = None

        for index, candidate in enumerate(candidates):
            normalized_candidate = self._normalize_phrase(candidate)
            if not normalized_candidate:
                continue

            score = 0
            if normalized_candidate == normalized_phrase:
                score = 100
            elif normalized_candidate in normalized_phrase or normalized_phrase in normalized_candidate:
                score = 70
            else:
                overlap = phrase_tokens.intersection(normalized_candidate.split())
                if overlap:
                    score = 10 * len(overlap)

            if score == 0:
                continue

            candidate_match = (score, -index, candidate)
            if best_match is None or candidate_match > best_match:
                best_match = candidate_match

        return best_match[2] if best_match else None


dashboard_command_service = DashboardCommandService()
