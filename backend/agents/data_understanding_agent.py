import pandas as pd
from backend.utils.file_reader import read_file
from backend.utils.logger import logger

class DataUnderstandingAgent:
    def __init__(self, file_path, file_type):
        self.file_path = file_path
        self.file_type = file_type
        self.df = None

    def load_data(self):
        self.df = read_file(self.file_path, self.file_type)
        if self.df is None:
            raise ValueError("Failed to load data")

    def detect_columns(self):
        if self.df is None:
            self.load_data()
        columns = list(self.df.columns)
        logger.info(f"Detected columns: {columns}")
        return columns

    def identify_column_types(self):
        if self.df is None:
            self.load_data()
        types = {}
        for col in self.df.columns:
            if pd.api.types.is_numeric_dtype(self.df[col]):
                types[col] = 'numeric'
            elif pd.api.types.is_datetime64_any_dtype(self.df[col]) or 'date' in col.lower():
                types[col] = 'date'
            else:
                types[col] = 'categorical'
        self.column_types = types
        logger.info(f"Column types: {types}")
        return types
