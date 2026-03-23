import pandas as pd

from backend.config import LARGE_FILE_THRESHOLD_BYTES
from backend.utils.logger import logger


def read_csv(file_path):
    try:
        file_size = 0
        try:
            import os

            file_size = os.path.getsize(file_path)
        except OSError:
            file_size = 0

        if file_size >= LARGE_FILE_THRESHOLD_BYTES:
            logger.info("Reading large CSV in chunked mode: %s", file_path)
            chunks = pd.read_csv(
                file_path,
                sep=None,
                engine="python",
                chunksize=50000,
            )
            return pd.concat(chunks, ignore_index=True)

        return pd.read_csv(file_path, sep=None, engine="python")
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        raise ValueError(f"Could not read CSV file: {e}") from e


def read_excel(file_path):
    try:
        return pd.read_excel(file_path)
    except ImportError as e:
        logger.error(f"Error reading Excel: {e}")
        raise ValueError(
            "Excel support requires openpyxl 3.1.5 or newer. "
            "Please upgrade dependencies with `pip install -r requirements.txt`."
        ) from e
    except Exception as e:
        logger.error(f"Error reading Excel: {e}")
        raise ValueError(f"Could not read Excel file: {e}") from e


def read_tally(file_path):
    try:
        if file_path.endswith(".xml"):
            return pd.read_xml(file_path)
        return read_excel(file_path)
    except Exception as e:
        logger.error(f"Error reading Tally file: {e}")
        raise ValueError(f"Could not read XML/Tally file: {e}") from e


def read_file(file_path, file_type):
    if file_type == "csv":
        return read_csv(file_path)
    if file_type == "excel":
        return read_excel(file_path)
    if file_type == "tally":
        return read_tally(file_path)

    logger.error(f"Unsupported file type: {file_type}")
    raise ValueError(f"Unsupported file type: {file_type}")
