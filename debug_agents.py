from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.agents.data_understanding_agent import DataUnderstandingAgent
from backend.agents.data_validation_agent import DataValidationAgent
from backend.agents.data_cleaning_agent import DataCleaningAgent
from backend.agents.transformation_agent import TransformationAgent
from backend.agents.analytics_agent import AnalyticsAgent
from backend.agents.chart_recommendation_agent import ChartRecommendationAgent
from backend.agents.visualization_agent import VisualizationAgent
from backend.agents.insight_agent import InsightAgent
from backend.agents.forecasting_agent import ForecastingAgent

db = SessionLocal()
upload = db.query(Upload).filter(Upload.id == 3).first()
print("Upload:", upload.filename, upload.file_path)

understanding = DataUnderstandingAgent(upload.file_path, upload.file_type)
understanding.load_data()
print("DF shape:", understanding.df.shape)

df = understanding.df

validation = DataValidationAgent(df)
errors = validation.validate()
print("Errors:", errors)

cleaning = DataCleaningAgent(df)
df = cleaning.clean()

transformation = TransformationAgent(df)
df = transformation.transform()

analytics = AnalyticsAgent(df)
metrics = analytics.calculate_metrics()
print("Metrics:", metrics)

chart_rec = ChartRecommendationAgent(df)
recommendations = chart_rec.recommend_charts()
print("Recommendations:", recommendations)

visualization = VisualizationAgent(df)
charts = visualization.generate_charts()
print("Charts generated:", len(charts))

insight = InsightAgent(df, metrics)
insights = insight.generate_insights()
print("Insights:", insights)

from backend.agents.fraud_detection_agent import FraudDetectionAgent
from backend.agents.recommendation_agent import RecommendationAgent
from backend.agents.memory_agent import MemoryAgent
from backend.agents.report_generator_agent import ReportGeneratorAgent

# ... previous code ...

try:
    forecasting = ForecastingAgent(df)
    forecast = forecasting.forecast()
    print("Forecast:", forecast)

    fraud = FraudDetectionAgent(df)
    anomalies = fraud.detect()
    print("Anomalies:", anomalies)

    recommendation = RecommendationAgent(metrics)
    recommendations = recommendation.generate_recommendations()
    print("Recommendations:", recommendations)

    memory = MemoryAgent(3)  # upload_id
    memory.store_metrics(metrics)
    memory.store_charts(charts)
    memory.store_insights(insights)

    report = ReportGeneratorAgent(3, metrics, insights)
    report_path = report.generate_pdf()
    print("Report path:", report_path)

except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()