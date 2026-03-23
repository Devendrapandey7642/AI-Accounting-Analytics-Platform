# Correlation analysis
import pandas as pd

def calculate_correlations(df):
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 1:
        return df[numeric_cols].corr()
    return None
