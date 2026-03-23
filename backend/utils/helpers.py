import os
import uuid
from datetime import datetime

def generate_unique_filename(original_filename):
    ext = os.path.splitext(original_filename)[1]
    return f"{uuid.uuid4()}{ext}"

def get_file_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.csv', '.tsv', '.txt']:
        return 'csv'
    elif ext in ['.xlsx', '.xls']:
        return 'excel'
    elif ext == '.xml':
        return 'tally'
    else:
        return 'unknown'

def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def format_currency(amount):
    return f"₹{amount:,.2f}"
