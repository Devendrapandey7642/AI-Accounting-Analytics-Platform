from backend.utils.logger import logger

class RecommendationAgent:
    def __init__(self, metrics):
        self.metrics = metrics
        self.recommendations = []

    def generate_recommendations(self):
        if 'total_profit' in self.metrics and self.metrics['total_profit'] < 0:
            self.recommendations.append("Consider reducing expenses to improve profitability")
        # Add more logic
        logger.info(f"Generated recommendations: {self.recommendations}")
        return self.recommendations
