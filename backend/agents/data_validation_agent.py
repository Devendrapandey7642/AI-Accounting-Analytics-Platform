import pandas as pd
from backend.utils.logger import logger

class DataValidationAgent:
    def __init__(self, df):
        self.df = df
        self.errors = []

    def check_invalid_values(self):
        for col in self.df.columns:
            if self.df[col].isnull().any():
                self.errors.append(f"Missing values in column {col}")
            if pd.api.types.is_numeric_dtype(self.df[col]):
                if (self.df[col] < 0).any():
                    self.errors.append(f"Negative values in numeric column {col}")

    def check_incorrect_dates(self):
        for col in self.df.columns:
            if 'date' in col.lower():
                try:
                    pd.to_datetime(self.df[col])
                except:
                    self.errors.append(f"Invalid dates in column {col}")

    def validate(self):
        self.check_invalid_values()
        self.check_incorrect_dates()
        if self.errors:
            logger.warning(f"Validation errors: {self.errors}")
        else:
            logger.info("Data validation passed")
        return self.errors
