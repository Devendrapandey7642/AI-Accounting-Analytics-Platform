import pandas as pd
from sklearn.ensemble import IsolationForest
from backend.utils.logger import logger

class FraudDetectionAgent:
    def __init__(self, df):
        self.df = df
        self.anomalies = []

    def detect_anomalies(self):
        numeric_cols = self.df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            model = IsolationForest(contamination=0.1)
            self.df['anomaly'] = model.fit_predict(self.df[numeric_cols])
            anomalies = self.df[self.df['anomaly'] == -1]
            self.anomalies = anomalies.index.tolist()
            logger.info(f"Detected {len(self.anomalies)} anomalies")

    def detect(self):
        self.detect_anomalies()
        return self.anomalies
