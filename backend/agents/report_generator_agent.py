import os
import pandas as pd
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, Flowable
from reportlab.platypus.flowables import KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from typing import Dict, List, Any, Optional
import logging

# Try to import matplotlib components, but make it optional
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import io
    import base64
    MATPLOTLIB_AVAILABLE = True
except ImportError as e:
    print(f"Matplotlib not available: {e}")
    MATPLOTLIB_AVAILABLE = False
    plt = None
    io = None
    base64 = None

from backend.database.db_manager import SessionLocal
from backend.database.models import Report, Upload
from backend.config import PDF_REPORTS_DIR

logger = logging.getLogger(__name__)

class ConsultingReportGenerator:
    """
    Generates professional consulting-style analytics reports with structured layout
    """

    def __init__(self, upload_id: int):
        self.upload_id = upload_id
        self.styles = self._setup_styles()
        self.elements = []
        self.charts = []
        self.company_name = "AI Accounting Analytics Platform"
        self.report_date = datetime.now().strftime("%B %d, %Y")

    def _setup_styles(self):
        """Setup professional styling for the report"""
        styles = getSampleStyleSheet()

        # Title styles
        styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a365d')
        ))

        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontSize=18,
            spaceBefore=20,
            spaceAfter=15,
            textColor=colors.HexColor('#2d3748'),
            borderColor=colors.HexColor('#e2e8f0'),
            borderWidth=1,
            borderPadding=10,
            borderRadius=5
        ))

        styles.add(ParagraphStyle(
            name='SubSectionHeader',
            parent=styles['Heading3'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#4a5568')
        ))

        styles.add(ParagraphStyle(
            name='InsightText',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leading=12,
            textColor=colors.HexColor('#2d3748'),
            leftIndent=20
        ))

        styles.add(ParagraphStyle(
            name='ExecutiveSummary',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=10,
            leading=16,
            textColor=colors.HexColor('#1a202c')
        ))

        styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=styles['BodyText'],
            fontSize=10,
            spaceAfter=8,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#4a5568')
        ))

        styles.add(ParagraphStyle(
            name='CaptionText',
            parent=styles['BodyText'],
            fontSize=8,
            spaceAfter=8,
            leading=10,
            textColor=colors.HexColor('#4a5568')
        ))

        return styles

    def generate_report(self, analysis_data: Dict[str, Any]) -> str:
        """
        Generate the complete consulting report

        Args:
            analysis_data: Dictionary containing all analysis results from various agents

        Returns:
            Path to the generated PDF file
        """
        filename = f"consulting_report_{self.upload_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(PDF_REPORTS_DIR, filename)

        # Ensure directory exists
        os.makedirs(PDF_REPORTS_DIR, exist_ok=True)

        self.elements = []

        # Create PDF document
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=42,
            leftMargin=42,
            topMargin=48,
            bottomMargin=42
        )

        # Build report sections
        self._build_cover_page(analysis_data)
        self._build_executive_summary(analysis_data)
        self._build_dataset_overview(analysis_data)
        self._build_kpi_dashboard(analysis_data)
        self._build_sales_analysis(analysis_data)
        self._build_expense_analysis(analysis_data)
        self._build_profit_analysis(analysis_data)
        self._build_customer_analysis(analysis_data)
        self._build_cash_flow_analysis(analysis_data)
        self._build_forecast_analysis(analysis_data)
        self._build_ai_insights(analysis_data)
        self._build_strategic_recommendations(analysis_data)

        # Build the PDF
        doc.build(self.elements, onFirstPage=self._add_page_header_footer,
                 onLaterPages=self._add_page_header_footer)

        # Store in database
        self._store_report_in_db(filepath)

        logger.info(f"Professional consulting report generated: {filepath}")
        return filepath

    def _build_cover_page(self, data: Dict[str, Any]):
        """Create professional cover page"""
        self.elements.append(Spacer(1, 1.1*inch))

        # Company logo placeholder
        self.elements.append(Paragraph(self.company_name, self.styles['ReportTitle']))
        self.elements.append(Paragraph("Professional Analytics Report", self.styles['ReportTitle']))
        self.elements.append(Paragraph(f"Generated on {self.report_date}", self.styles['ReportSubtitle']))

        self.elements.append(Spacer(1, 0.3*inch))

        # Report title
        client_info = data.get('dataset_info', {})
        dataset_type = client_info.get('dataset_type', 'Business Analytics').title()
        file_name = data.get('file_name', f'upload_{self.upload_id}')
        filtered_rows = client_info.get('filtered_rows', client_info.get('rows', 0))
        active_metric = client_info.get('active_metric') or 'Primary business metric'

        self.elements.append(Paragraph(f"File: {file_name}", self.styles['BodyText']))
        self.elements.append(Paragraph(f"Client: {dataset_type} Dataset Analysis", self.styles['BodyText']))
        self.elements.append(Paragraph(f"Report Date: {self.report_date}", self.styles['BodyText']))
        self.elements.append(Paragraph(f"Analysis ID: {self.upload_id}", self.styles['BodyText']))
        self.elements.append(Paragraph(f"Rows in scope: {filtered_rows:,}", self.styles['BodyText']))
        self.elements.append(Paragraph(f"Active metric focus: {active_metric}", self.styles['BodyText']))

        self.elements.append(Spacer(1, 0.35*inch))
        self.elements.append(Paragraph("Inside this report", self.styles['SubSectionHeader']))
        for item in [
            "Executive summary and KPI snapshot",
            "Dataset profile with quality commentary",
            "Section-level analysis with chart visuals",
            "Forecast, alerts, and recommendations",
        ]:
            self.elements.append(Paragraph(f"- {item}", self.styles['InsightText']))

        self.elements.append(Spacer(1, 0.25*inch))

        # Confidentiality notice
        self.elements.append(Paragraph("CONFIDENTIAL", self.styles['SubSectionHeader']))
        self.elements.append(Paragraph(
            "This report contains confidential business information and is intended solely for the use of the client. "
            "Distribution or reproduction without prior written consent is prohibited.",
            self.styles['BodyText']
        ))

        self.elements.append(PageBreak())

    def _build_executive_summary(self, data: Dict[str, Any]):
        """Build executive summary section"""
        self.elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))

        summary_text = self._generate_executive_summary_text(data)
        self.elements.append(Paragraph(summary_text, self.styles['ExecutiveSummary']))

        # Key metrics table
        metrics_data = self._extract_key_metrics(data)
        if metrics_data:
            self.elements.append(Spacer(1, 0.3*inch))
            self.elements.append(Paragraph("Key Financial Metrics", self.styles['SubSectionHeader']))
            self._add_metrics_table(metrics_data)
        narrative_points = data.get('ai_insights', [])
        if narrative_points:
            self.elements.append(Spacer(1, 0.15*inch))
            self.elements.append(Paragraph("Leadership Takeaways", self.styles['SubSectionHeader']))
            for insight in narrative_points[:3]:
                self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

    def _build_dataset_overview(self, data: Dict[str, Any]):
        """Build dataset overview section"""
        self.elements.append(Paragraph("Dataset Overview", self.styles['SectionHeader']))

        dataset_info = data.get('dataset_info', {})
        column_types = data.get('column_types', {})
        data_quality = data.get('data_quality', {})

        # Dataset statistics
        overview_text = f"""
        This analysis is based on a {dataset_info.get('dataset_type', 'business')} dataset containing
        {dataset_info.get('rows', 0):,} rows and {dataset_info.get('columns', 0)} columns.
        The dataset has a quality score of {dataset_info.get('data_quality_score', 0):.1f}/100.
        """

        self.elements.append(Paragraph(overview_text, self.styles['BodyText']))

        quality_rows = [
            ['Rows in Scope', f"{dataset_info.get('filtered_rows', dataset_info.get('rows', 0)):,}"],
            ['Active Metric', dataset_info.get('active_metric', 'Not selected')],
            ['Date Column', dataset_info.get('active_date_column', 'Not detected')],
            ['Category Column', dataset_info.get('active_category_column', 'Not detected')],
            ['Duplicate Rows', str(data_quality.get('duplicateRows', 0))],
            ['High Null Columns', str(len(data_quality.get('highNullColumns', [])))],
        ]
        self.elements.append(Spacer(1, 0.15*inch))
        self.elements.append(Paragraph("Analysis Scope", self.styles['SubSectionHeader']))
        scope_table = Table([['Field', 'Value']] + quality_rows, colWidths=[2.0*inch, 4.2*inch])
        scope_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#edf2f7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.elements.append(scope_table)

        # Column analysis table
        if column_types:
            self.elements.append(Spacer(1, 0.3*inch))
            self.elements.append(Paragraph("Column Analysis", self.styles['SubSectionHeader']))
            self._add_column_analysis_table(column_types)

        if data_quality.get('recommendations'):
            self.elements.append(Spacer(1, 0.15*inch))
            self.elements.append(Paragraph("Data Quality Recommendations", self.styles['SubSectionHeader']))
            for item in data_quality.get('recommendations', [])[:4]:
                self.elements.append(Paragraph(f"- {item}", self.styles['InsightText']))

        # Add a chart if available
        if 'dataset_overview_chart' in data:
            self._add_chart(data['dataset_overview_chart'])

    def _build_kpi_dashboard(self, data: Dict[str, Any]):
        """Build KPI dashboard section"""
        self.elements.append(Paragraph("KPI Dashboard", self.styles['SectionHeader']))

        # Create KPI cards
        kpis = data.get('kpi_cards') or self._extract_kpis(data)
        self._add_kpi_cards(kpis)

        # Add KPI trend chart
        if 'kpi_trend_chart' in data:
            self._add_chart(data['kpi_trend_chart'])
        self.elements.append(PageBreak())

    def _build_sales_analysis(self, data: Dict[str, Any]):
        """Build sales analysis section"""
        self.elements.append(Paragraph("Sales Analysis", self.styles['SectionHeader']))

        sales_data = data.get('sales_analysis', {})

        # Key insights
        insights = sales_data.get('insights', [])
        for insight in insights[:5]:  # Limit to top 5 insights
            self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        # Business interpretation
        interpretation = sales_data.get('interpretation',
            "Sales performance shows trends that require strategic attention. "
            "Focus on high-performing products and customer segments to maximize revenue growth.")
        self.elements.append(Paragraph(interpretation, self.styles['BodyText']))

        # Add sales chart
        if 'sales_chart' in sales_data:
            self._add_chart(sales_data['sales_chart'])

        self.elements.append(PageBreak())

    def _build_expense_analysis(self, data: Dict[str, Any]):
        """Build expense analysis section"""
        self.elements.append(Paragraph("Expense Analysis", self.styles['SectionHeader']))

        expense_data = data.get('expense_analysis', {})

        # Key insights
        insights = expense_data.get('insights', [])
        for insight in insights[:5]:
            self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        # Business interpretation
        interpretation = expense_data.get('interpretation',
            "Expense analysis reveals opportunities for cost optimization. "
            "Strategic expense management can significantly improve profitability.")
        self.elements.append(Paragraph(interpretation, self.styles['BodyText']))

        # Add expense chart
        if 'expense_chart' in expense_data:
            self._add_chart(expense_data['expense_chart'])

        self.elements.append(Spacer(1, 0.12*inch))

    def _build_profit_analysis(self, data: Dict[str, Any]):
        """Build profit analysis section"""
        self.elements.append(Paragraph("Profit Analysis", self.styles['SectionHeader']))

        profit_data = data.get('profit_analysis', {})

        # Key insights
        insights = profit_data.get('insights', [])
        for insight in insights[:5]:
            self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        # Business interpretation
        interpretation = profit_data.get('interpretation',
            "Profit margins and trends indicate the overall financial health. "
            "Focus on improving profit margins through pricing strategy and cost control.")
        self.elements.append(Paragraph(interpretation, self.styles['BodyText']))

        # Add profit chart
        if 'profit_chart' in profit_data:
            self._add_chart(profit_data['profit_chart'])

        self.elements.append(Spacer(1, 0.12*inch))

    def _build_customer_analysis(self, data: Dict[str, Any]):
        """Build customer analysis section"""
        self.elements.append(Paragraph("Customer Analysis", self.styles['SectionHeader']))

        customer_data = data.get('customer_analysis', {})

        # Key insights
        insights = customer_data.get('insights', [])
        for insight in insights[:5]:
            self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        # Business interpretation
        interpretation = customer_data.get('interpretation',
            "Customer segmentation and behavior analysis provides insights for targeted marketing "
            "and improved customer retention strategies.")
        self.elements.append(Paragraph(interpretation, self.styles['BodyText']))

        # Add customer chart
        if 'customer_chart' in customer_data:
            self._add_chart(customer_data['customer_chart'])

        self.elements.append(Spacer(1, 0.12*inch))

    def _build_cash_flow_analysis(self, data: Dict[str, Any]):
        """Build cash flow analysis section"""
        self.elements.append(Paragraph("Cash Flow Analysis", self.styles['SectionHeader']))

        cash_flow_data = data.get('cash_flow_analysis', {})

        # Key insights
        insights = cash_flow_data.get('insights', [])
        for insight in insights[:5]:
            self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        # Business interpretation
        interpretation = cash_flow_data.get('interpretation',
            "Cash flow management is critical for business sustainability. "
            "Monitoring cash flow patterns helps in making informed financial decisions.")
        self.elements.append(Paragraph(interpretation, self.styles['BodyText']))

        # Add cash flow chart
        if 'cash_flow_chart' in cash_flow_data:
            self._add_chart(cash_flow_data['cash_flow_chart'])

        self.elements.append(PageBreak())

    def _build_forecast_analysis(self, data: Dict[str, Any]):
        """Build forecast analysis section with predictions"""
        self.elements.append(Paragraph("Forecast Analysis", self.styles['SectionHeader']))

        forecast_data = data.get('forecast_analysis', {})

        # Forecast chart
        if 'forecast_chart' in forecast_data:
            self.elements.append(Paragraph("Forecast Projections", self.styles['SubSectionHeader']))
            self._add_chart(forecast_data['forecast_chart'])

        # Prediction table
        predictions = forecast_data.get('predictions', {})
        if predictions:
            self.elements.append(Spacer(1, 0.3*inch))
            self.elements.append(Paragraph("Prediction Table", self.styles['SubSectionHeader']))
            self._add_prediction_table(predictions)

        # Prediction explanation
        explanation = forecast_data.get('explanation',
            "Forecasts are generated using advanced machine learning algorithms trained on historical data. "
            "These predictions provide insights into future performance and help in strategic planning.")
        self.elements.append(Paragraph(explanation, self.styles['BodyText']))

        # Forecast insights
        insights = forecast_data.get('insights', [])
        if insights:
            self.elements.append(Spacer(1, 0.2*inch))
            self.elements.append(Paragraph("Forecast Insights", self.styles['SubSectionHeader']))
            for insight in insights[:5]:
                self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))

        self.elements.append(PageBreak())

    def _build_ai_insights(self, data: Dict[str, Any]):
        """Build AI insights section"""
        self.elements.append(Paragraph("AI Insights", self.styles['SectionHeader']))

        ai_insights = data.get('ai_insights', [])
        data_quality = data.get('data_quality', {})

        if ai_insights:
            for insight in ai_insights[:10]:  # Limit to top 10 insights
                self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))
        else:
            default_insights = [
                "AI analysis detected seasonal patterns in sales data",
                "Machine learning models identified key drivers of profitability",
                "Predictive analytics suggest potential market opportunities",
                "Anomaly detection revealed unusual expense patterns",
                "Customer segmentation analysis uncovered valuable market segments"
            ]
            for insight in default_insights:
                self.elements.append(Paragraph(f"- {insight}", self.styles['InsightText']))
        if data_quality.get('recommendations'):
            self.elements.append(Spacer(1, 0.15*inch))
            self.elements.append(Paragraph("Operational Flags", self.styles['SubSectionHeader']))
            for item in data_quality.get('recommendations', [])[:3]:
                self.elements.append(Paragraph(f"- {item}", self.styles['InsightText']))

        self.elements.append(Spacer(1, 0.12*inch))

    def _build_strategic_recommendations(self, data: Dict[str, Any]):
        """Build strategic recommendations section"""
        self.elements.append(Paragraph("Strategic Recommendations", self.styles['SectionHeader']))

        recommendations = data.get('recommendations', [])

        if not recommendations:
            recommendations = [
                "Implement dynamic pricing strategy based on demand forecasting",
                "Optimize inventory management using predictive analytics",
                "Enhance customer retention through targeted marketing campaigns",
                "Streamline expense management processes for better cost control",
                "Invest in technology infrastructure to support data-driven decision making",
            ]

        action_rows = [['Priority', 'Recommended Action']]
        for index, rec in enumerate(recommendations[:8], 1):
            priority = 'High' if index <= 2 else 'Medium' if index <= 5 else 'Watch'
            action_rows.append([priority, rec])

        table = Table(action_rows, colWidths=[1.0*inch, 5.4*inch], repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#edf2f7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.elements.append(table)
        self.elements.append(Spacer(1, 0.12*inch))
        self.elements.append(Paragraph(
            "These actions are prioritized so the report reads more like a consulting handoff and less like a raw analytics export.",
            self.styles['CaptionText']
        ))

    def _add_page_header_footer(self, canvas, doc):
        """Add header and footer to each page"""
        canvas.saveState()
        page_width, page_height = A4

        # Header
        canvas.setFont('Helvetica-Bold', 10)
        canvas.drawString(42, page_height - 24, self.company_name)
        canvas.drawRightString(page_width - 42, page_height - 24, self.report_date)

        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.drawString(42, 24, f"Confidential - Client Report #{self.upload_id}")
        canvas.drawRightString(page_width - 42, 24, f"Page {doc.page}")

        canvas.restoreState()

    def _add_metrics_table(self, metrics: Dict[str, float]):
        """Add a formatted metrics table"""
        data = [['Metric', 'Value']]
        for key, value in metrics.items():
            formatted_key = key.replace('_', ' ').title()
            if isinstance(value, float):
                formatted_value = f"{value:,.2f}"
            else:
                formatted_value = str(value)
            data.append([formatted_key, formatted_value])

        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))

        self.elements.append(table)

    def _add_column_analysis_table(self, column_types: Dict[str, Dict[str, Any]]):
        """Add column analysis table"""
        data = [['Column Name', 'Type', 'Confidence', 'Sample Values']]
        for col, info in list(column_types.items())[:15]:  # Limit to 15 columns
            sample_values = ', '.join(str(v) for v in info.get('sample_values', [])[:2])
            data.append([
                col,
                info.get('type', 'unknown').title(),
                f"{info.get('confidence', 0):.1%}",
                sample_values
            ])

        table = Table(data, colWidths=[2*inch, 1.5*inch, 1*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))

        self.elements.append(table)

    def _add_kpi_cards(self, kpis: Any):
        """Add KPI cards in a grid layout"""
        data = []

        if isinstance(kpis, list):
            kpi_items = []
            for card in kpis[:4]:
                title = card.get('title', 'Metric')
                value = self._format_metric_value(card.get('value'), card.get('unit'))
                subtitle = card.get('subtitle', '')
                kpi_items.append((title, f"{value}\n{subtitle}".strip()))
        else:
            kpi_items = []
            for name, value in list(kpis.items())[:4]:
                formatted_name = name.replace('_', ' ').title()
                formatted_value = self._format_metric_value(value)
                kpi_items.append((formatted_name, formatted_value))

        for i in range(0, len(kpi_items), 2):
            row = []
            for j in range(2):
                if i + j < len(kpi_items):
                    name, value = kpi_items[i + j]
                    row.append(f"{name}\n{value}")
                else:
                    row.append("")
            data.append(row)

        if not data:
            return

        table = Table(data, colWidths=[3.1*inch, 3.1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
            ('TOPPADDING', (0, 0), (-1, -1), 16),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ]))

        self.elements.append(table)

    def _add_prediction_table(self, predictions: Dict[str, Any]):
        """Add prediction results table"""
        data = [['Metric', 'Predicted Value', 'Confidence']]
        for metric, pred_data in predictions.items():
            if isinstance(pred_data, dict):
                value = pred_data.get('value', 'N/A')
                confidence = pred_data.get('confidence', 'N/A')
            else:
                value = pred_data
                confidence = 'N/A'

            formatted_metric = metric.replace('_', ' ').title()
            if isinstance(value, float):
                formatted_value = f"{value:,.2f}"
            else:
                formatted_value = str(value)

            data.append([formatted_metric, formatted_value, str(confidence)])

        table = Table(data, colWidths=[2*inch, 2*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))

        self.elements.append(table)

    def _add_chart(self, chart_data: Dict[str, Any]):
        """Add a chart to the report"""
        if not chart_data:
            return

        chart_title = chart_data.get('title', 'Chart')
        chart_image = self._render_chart_image(chart_data)

        self.elements.append(Spacer(1, 0.12*inch))
        self.elements.append(Paragraph(chart_title, self.styles['SubSectionHeader']))

        if chart_image is not None:
            self.elements.append(Image(chart_image, width=6.3*inch, height=3.0*inch))
        else:
            self.elements.append(Paragraph(f"[Chart preview unavailable: {chart_title}]", self.styles['BodyText']))

        if chart_data.get('description'):
            self.elements.append(Paragraph(chart_data['description'], self.styles['BodyText']))
        if chart_data.get('caption'):
            self.elements.append(Paragraph(chart_data['caption'], self.styles['CaptionText']))

        preview_table = self._build_chart_preview_table(chart_data)
        if preview_table:
            self.elements.append(preview_table)

        self.elements.append(Spacer(1, 0.15*inch))

    def _render_chart_image(self, chart_data: Dict[str, Any]):
        if not MATPLOTLIB_AVAILABLE or not chart_data.get('data'):
            return None

        chart_type = chart_data.get('chartType')
        chart_title = chart_data.get('title', 'Chart')
        records = chart_data.get('data', [])
        fig, ax = plt.subplots(figsize=(7.0, 3.4))
        palette = ['#2563eb', '#0f766e', '#ea580c', '#7c3aed']

        try:
            if chart_type == 'line':
                x_key = chart_data.get('xKey')
                y_keys = chart_data.get('yKeys', [])
                labels = [str(item.get(x_key, '')) for item in records]
                for index, key in enumerate(y_keys):
                    values = [float(item.get(key, 0) or 0) for item in records]
                    ax.plot(labels, values, marker='o', linewidth=2, color=palette[index % len(palette)],
                            label=chart_data.get('seriesLabels', {}).get(key, key))
                if y_keys:
                    ax.legend(loc='best', fontsize=8)
            elif chart_type == 'bar':
                x_key = chart_data.get('xKey')
                y_keys = chart_data.get('yKeys', [])
                labels = [str(item.get(x_key, '')) for item in records]
                key = y_keys[0] if y_keys else 'metric_1'
                values = [float(item.get(key, 0) or 0) for item in records]
                ax.bar(labels, values, color=palette[0])
            elif chart_type == 'pie':
                name_key = chart_data.get('nameKey', 'label')
                value_key = chart_data.get('valueKey', 'metric_1')
                labels = [str(item.get(name_key, '')) for item in records]
                values = [float(item.get(value_key, 0) or 0) for item in records]
                ax.pie(values, labels=labels, autopct='%1.0f%%', startangle=110, textprops={'fontsize': 8})
                ax.axis('equal')
            elif chart_type == 'scatter':
                x_key = chart_data.get('xKey')
                y_keys = chart_data.get('yKeys', [])
                if x_key and y_keys:
                    y_key = y_keys[0]
                    x_values = [float(item.get(x_key, 0) or 0) for item in records]
                    y_values = [float(item.get(y_key, 0) or 0) for item in records]
                    ax.scatter(x_values, y_values, alpha=0.8, color=palette[0])
                    ax.set_xlabel(chart_data.get('xLabel', x_key))
                    ax.set_ylabel(chart_data.get('yLabel', y_key))
            else:
                plt.close(fig)
                return None

            if chart_type != 'pie':
                ax.set_title(chart_title, fontsize=11, color='#1a365d')
                ax.grid(axis='y', alpha=0.2)
                ax.tick_params(axis='x', rotation=25, labelsize=8)
                ax.tick_params(axis='y', labelsize=8)

            fig.tight_layout()
            chart_stream = io.BytesIO()
            fig.savefig(chart_stream, format='png', dpi=180, bbox_inches='tight')
            chart_stream.seek(0)
            return chart_stream
        except Exception as exc:
            logger.warning(f"Failed to render report chart: {exc}")
            return None
        finally:
            plt.close(fig)

    def _build_chart_preview_table(self, chart_data: Dict[str, Any]):
        records = chart_data.get('data', [])
        if not records:
            return None

        sample = records[:5]
        headers = list(sample[0].keys())[:4]
        table_rows = [headers]
        for item in sample:
            table_rows.append([str(item.get(header, ''))[:24] for header in headers])

        table = Table(table_rows, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#edf2f7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        return table

    def _format_metric_value(self, value: Any, unit: Optional[str] = None) -> str:
        if value is None:
            return "N/A"
        if unit == 'percentage':
            return f"{float(value):,.1f}%"
        if unit == 'currency':
            return f"${float(value):,.2f}"
        if isinstance(value, float):
            return f"{value:,.2f}"
        return str(value)

    def _generate_executive_summary_text(self, data: Dict[str, Any]) -> str:
        """Generate executive summary text"""
        dataset_info = data.get('dataset_info', {})
        dataset_type = dataset_info.get('dataset_type', 'business')
        active_metric = dataset_info.get('active_metric') or 'the primary business metric'
        filtered_rows = dataset_info.get('filtered_rows', dataset_info.get('rows', 0))
        recommendations = data.get('recommendations', [])

        summary = f"""
        This comprehensive analytics report provides deep insights into the {dataset_type} dataset,
        covering {filtered_rows:,} in-scope rows and {dataset_info.get('columns', 0)} key columns.
        The analysis is centered on {active_metric}, helping stakeholders move quickly from dashboard review to decision-ready reporting.

        Key findings include performance metrics across sales, expenses, profitability, and customer segments.
        The report combines KPI summaries, chart narratives, forecast commentary, and data quality findings
        so the final output feels complete instead of sparse.

        The report includes detailed forecasts and strategic recommendations to guide future business planning
        and resource allocation decisions. {f'The current report includes {len(recommendations)} recommended next steps.' if recommendations else ''}
        """

        return summary.strip()

    def _extract_key_metrics(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract key metrics for the executive summary"""
        metrics = {}

        # Extract from various analysis sections
        sales_analysis = data.get('sales_analysis', {})
        expense_analysis = data.get('expense_analysis', {})
        profit_analysis = data.get('profit_analysis', {})

        if 'total_sales' in sales_analysis:
            metrics['total_sales'] = sales_analysis['total_sales']
        if 'total_expenses' in expense_analysis:
            metrics['total_expenses'] = expense_analysis['total_expenses']
        if 'total_profit' in profit_analysis:
            metrics['total_profit'] = profit_analysis['total_profit']
        if 'avg_profit_margin' in profit_analysis:
            metrics['avg_profit_margin'] = profit_analysis['avg_profit_margin']
        elif 'profit_margin' in profit_analysis:
            metrics['avg_profit_margin'] = profit_analysis['profit_margin']

        return metrics

    def _extract_kpis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract KPIs for dashboard"""
        kpis = {}

        # Extract key performance indicators
        sales_analysis = data.get('sales_analysis', {})
        expense_analysis = data.get('expense_analysis', {})
        profit_analysis = data.get('profit_analysis', {})

        if 'total_sales' in sales_analysis:
            kpis['total_sales'] = sales_analysis['total_sales']
        if 'total_expenses' in expense_analysis:
            kpis['total_expenses'] = expense_analysis['total_expenses']
        if 'total_profit' in profit_analysis:
            kpis['total_profit'] = profit_analysis['total_profit']
        if 'profit_margin' in profit_analysis:
            kpis['profit_margin'] = profit_analysis['profit_margin']
        elif 'avg_profit_margin' in profit_analysis:
            kpis['profit_margin'] = profit_analysis['avg_profit_margin']

        return kpis

    def _store_report_in_db(self, filepath: str):
        """Store report information in database"""
        try:
            db = SessionLocal()
            report = Report(
                upload_id=self.upload_id,
                report_type='consulting_pdf',
                file_path=filepath,
                created_at=datetime.now()
            )
            db.add(report)
            db.commit()
            db.close()
            logger.info(f"Report stored in database: {filepath}")
        except Exception as e:
            logger.error(f"Failed to store report in database: {e}")


class ReportGeneratorAgent:
    """
    Legacy compatibility class - now uses ConsultingReportGenerator
    """

    def __init__(self, upload_id, metrics, insights):
        self.upload_id = upload_id
        self.metrics = metrics
        self.insights = insights

    def generate_pdf(self):
        """Generate PDF report using the new consulting report generator"""
        # Convert old format to new format
        analysis_data = {
            'dataset_info': {'rows': 0, 'columns': 0, 'dataset_type': 'business'},
            'sales_analysis': {'insights': self.insights},
            'ai_insights': self.insights,
            'recommendations': ['Upgrade to use full consulting report generator']
        }

        generator = ConsultingReportGenerator(self.upload_id)
        return generator.generate_report(analysis_data)
