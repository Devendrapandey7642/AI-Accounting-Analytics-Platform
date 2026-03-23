import os
import shutil
from backend.config import LARGE_FILE_THRESHOLD_BYTES, MAX_UPLOAD_BYTES, UPLOAD_DIR
from backend.utils.helpers import generate_unique_filename, get_file_type
from backend.database.db_manager import SessionLocal
from backend.database.models import Upload
from backend.utils.logger import logger

class FileUploadAgent:
    def __init__(self, user_id=1):  # Default user for simplicity
        self.user_id = user_id

    def upload_file(self, file, filename):
        try:
            file_type = get_file_type(filename)
            if file_type == 'unknown':
                raise ValueError("Unsupported file type")

            try:
                file.seek(0, os.SEEK_END)
                file_size = int(file.tell())
                file.seek(0)
            except Exception:
                file_size = 0

            if file_size and file_size > MAX_UPLOAD_BYTES:
                max_mb = round(MAX_UPLOAD_BYTES / 1024 / 1024)
                raise ValueError(f"File is too large. Maximum supported size is {max_mb} MB.")

            unique_filename = generate_unique_filename(filename)
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            # Use streaming for large files to avoid memory issues
            with open(file_path, "wb") as buffer:
                chunk_size = 8192  # 8KB chunks
                while True:
                    chunk = file.read(chunk_size)
                    if not chunk:
                        break
                    buffer.write(chunk)
                    if file_size == 0:
                        file_size += len(chunk)

            # Save to database
            db = SessionLocal()
            upload = Upload(
                filename=filename,
                file_path=file_path,
                file_type=file_type,
                user_id=self.user_id
            )
            db.add(upload)
            db.commit()
            db.refresh(upload)
            db.close()

            logger.info(f"File uploaded: {filename} ({os.path.getsize(file_path)} bytes)")
            warnings = []
            if file_size >= LARGE_FILE_THRESHOLD_BYTES:
                warnings.append(
                    "Large file mode enabled. Analysis may take longer while the backend streams and validates the dataset."
                )

            return {
                "upload_id": upload.id,
                "file_size": file_size,
                "large_file": bool(file_size >= LARGE_FILE_THRESHOLD_BYTES),
                "warnings": warnings,
            }
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            raise
