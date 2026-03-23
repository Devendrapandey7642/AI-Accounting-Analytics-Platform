from backend.utils.logger import logger

class InsightAgent:
    def __init__(self, df, metrics):
        self.df = df
        self.metrics = metrics
        self.insights = []

    def generate_insights(self):
        if 'total_sales' in self.metrics:
            self.insights.append(f"Total sales: {self.metrics['total_sales']}")
        if 'total_profit' in self.metrics:
            self.insights.append(f"Total profit: {self.metrics['total_profit']}")
        # Add more logic for insights
        logger.info(f"Generated insights: {self.insights}")
        return self.insights
