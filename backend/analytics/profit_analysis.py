# Profit analysis
def calculate_total_profit(df):
    if 'Profit' in df.columns:
        return df['Profit'].sum()
    return 0
