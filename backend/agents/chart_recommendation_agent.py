import pandas as pd
from backend.utils.logger import logger

class ChartRecommendationAgent:
    def __init__(self, df):
        self.df = df

    def recommend_charts(self):
        recommendations = []
        for col in self.df.columns:
            if pd.api.types.is_datetime64_any_dtype(self.df[col]):
                recommendations.append({'column': col, 'type': 'line'})
            elif pd.api.types.is_numeric_dtype(self.df[col]):
                recommendations.append({'column': col, 'type': 'bar'})
            else:
                recommendations.append({'column': col, 'type': 'pie'})
        logger.info(f"Chart recommendations: {recommendations}")
        return recommendations
