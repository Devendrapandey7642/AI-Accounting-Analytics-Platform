# Customer analysis
def analyze_customers(df):
    if 'Customer' in df.columns:
        return df['Customer'].value_counts()
    return None
