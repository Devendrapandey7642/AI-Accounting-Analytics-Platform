from backend.utils.logger import logger

class QueryAgent:
    def __init__(self, df, query):
        self.df = df
        self.query = query
        self.result = None

    def process_query(self):
        # Simple query processing, e.g., if query contains "total sales"
        if "total sales" in self.query.lower():
            self.result = self.df['Sales'].sum() if 'Sales' in self.df.columns else "No sales data"
        # Add more NLP logic if needed
        logger.info(f"Processed query: {self.query}, result: {self.result}")
        return self.result
