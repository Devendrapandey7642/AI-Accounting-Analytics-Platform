import pandas as pd
from backend.utils.logger import logger

class TransformationAgent:
    def __init__(self, df):
        self.df = df

    def create_derived_columns(self):
        # Assume columns like Sales, Expense
        if 'Sales' in self.df.columns and 'Expense' in self.df.columns:
            self.df['Profit'] = self.df['Sales'] - self.df['Expense']
            logger.info("Created Profit column")
        # Add more transformations as needed
        return self.df

    def transform(self):
        self.df = self.create_derived_columns()
        logger.info("Data transformed")
        return self.df
