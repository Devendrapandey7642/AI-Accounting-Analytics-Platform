from backend.utils.logger import logger

class AnalyticsAgent:
    def __init__(self, df):
        self.df = df
        self.metrics = {}

    def calculate_metrics(self):
        if 'Sales' in self.df.columns:
            self.metrics['total_sales'] = float(self.df['Sales'].sum())
        if 'Expense' in self.df.columns:
            self.metrics['total_expenses'] = float(self.df['Expense'].sum())
        if 'Profit' in self.df.columns:
            self.metrics['total_profit'] = float(self.df['Profit'].sum())
            self.metrics['avg_profit'] = float(self.df['Profit'].mean())
        logger.info(f"Calculated metrics: {self.metrics}")
        return self.metrics
