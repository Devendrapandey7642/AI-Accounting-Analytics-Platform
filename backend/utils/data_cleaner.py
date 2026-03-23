import pandas as pd
from backend.utils.logger import logger

def remove_duplicates(df):
    initial_shape = df.shape
    df = df.drop_duplicates()
    logger.info(f"Removed {initial_shape[0] - df.shape[0]} duplicate rows")
    return df

def handle_missing_values(df, strategy='mean'):
    if strategy == 'drop':
        df = df.dropna()
    elif strategy == 'mean':
        for col in df.select_dtypes(include=['number']):
            df[col] = df[col].fillna(df[col].mean())
    elif strategy == 'median':
        for col in df.select_dtypes(include=['number']):
            df[col] = df[col].fillna(df[col].median())
    return df

def fix_formatting(df):
    # Convert string columns to proper case
    for col in df.select_dtypes(include=['object']):
        df[col] = df[col].astype(str).str.strip()
    return df

def clean_data(df):
    df = remove_duplicates(df)
    df = handle_missing_values(df)
    df = fix_formatting(df)
    return df
