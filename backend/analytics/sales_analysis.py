# Sales analysis functions
def calculate_total_sales(df):
    if 'Sales' in df.columns:
        return df['Sales'].sum()
    return 0

def calculate_avg_sales(df):
    if 'Sales' in df.columns:
        return df['Sales'].mean()
    return 0
