import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/database/analytics.db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
PROCESSED_DIR = os.getenv("PROCESSED_DIR", "data/processed")
REPORTS_DIR = os.getenv("REPORTS_DIR", "reports")
PDF_REPORTS_DIR = os.getenv("PDF_REPORTS_DIR", "reports/pdf_reports")
PPT_REPORTS_DIR = os.getenv("PPT_REPORTS_DIR", "reports/ppt_reports")
REDIS_URL = os.getenv("REDIS_URL", "")
APP_ENV = os.getenv("APP_ENV", "development")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(250 * 1024 * 1024)))
LARGE_FILE_THRESHOLD_BYTES = int(os.getenv("LARGE_FILE_THRESHOLD_BYTES", str(20 * 1024 * 1024)))

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()] or DEFAULT_ALLOWED_ORIGINS

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(PDF_REPORTS_DIR, exist_ok=True)
os.makedirs(PPT_REPORTS_DIR, exist_ok=True)
