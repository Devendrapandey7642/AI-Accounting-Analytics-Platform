from backend.database.db_manager import SessionLocal
from backend.database.models import AnalysisResult, Chart, Insight
from backend.utils.logger import logger

class MemoryAgent:
    def __init__(self, upload_id):
        self.upload_id = upload_id

    def store_metrics(self, metrics):
        db = SessionLocal()
        for name, value in metrics.items():
            result = AnalysisResult(upload_id=self.upload_id, metric_name=name, value=value)
            db.add(result)
        db.commit()
        db.close()
        logger.info("Metrics stored")

    def store_charts(self, charts):
        db = SessionLocal()
        for chart in charts:
            # Store chart data as JSON or path
            chart_data = chart['type']  # Placeholder
            c = Chart(upload_id=self.upload_id, chart_type=chart['type'], chart_data=chart_data, title=chart['type'])
            db.add(c)
        db.commit()
        db.close()
        logger.info("Charts stored")

    def store_insights(self, insights):
        db = SessionLocal()
        for insight in insights:
            i = Insight(upload_id=self.upload_id, insight_text=insight, category='general')
            db.add(i)
        db.commit()
        db.close()
        logger.info("Insights stored")
