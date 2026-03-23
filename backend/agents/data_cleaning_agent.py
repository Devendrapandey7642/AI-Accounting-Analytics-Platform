from backend.utils.data_cleaner import clean_data
from backend.utils.logger import logger

class DataCleaningAgent:
    def __init__(self, df):
        self.df = df

    def clean(self):
        self.df = clean_data(self.df)
        logger.info("Data cleaned")
        return self.df
