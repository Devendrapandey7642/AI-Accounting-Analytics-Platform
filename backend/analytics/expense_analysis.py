# Expense analysis
def calculate_total_expenses(df):
    if 'Expense' in df.columns:
        return df['Expense'].sum()
    return 0
