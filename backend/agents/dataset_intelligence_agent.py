import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
import re
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DatasetIntelligenceAgent:
    """
    Automatically analyzes uploaded datasets to understand their structure,
    detect column types, and identify dataset categories.
    """

    def __init__(self):
        self.column_type_patterns = {
            'date': [
                r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
                r'^\d{2}/\d{2}/\d{4}$',  # MM/DD/YYYY
                r'^\d{2}-\d{2}-\d{4}$',  # MM-DD-YYYY
                r'^\d{4}/\d{2}/\d{2}$',  # YYYY/MM/DD
            ],
            'currency': [
                r'^\$?\d+(?:,\d{3})*(?:\.\d{2})?$',  # $1,234.56
                r'^\$?\d+(?:\.\d{3})*(?:,\d{2})?$',  # $1.234,56 (European)
            ],
            'percentage': [
                r'^\d+(?:\.\d+)?%$',  # 12.5%
            ],
            'phone': [
                r'^\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{4}$',  # +1-555-1234
            ],
            'email': [
                r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            ]
        }

        self.dataset_type_keywords = {
            'sales': ['sale', 'revenue', 'income', 'transaction', 'order', 'invoice'],
            'accounting': ['account', 'ledger', 'journal', 'debit', 'credit', 'balance'],
            'expense': ['expense', 'cost', 'expenditure', 'payment', 'bill'],
            'inventory': ['inventory', 'stock', 'product', 'item', 'quantity'],
            'customer': ['customer', 'client', 'buyer', 'user', 'member'],
            'employee': ['employee', 'staff', 'worker', 'personnel', 'payroll'],
            'financial': ['profit', 'loss', 'margin', 'cash', 'asset', 'liability']
        }

    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Main processing method for dataset intelligence"""
        upload_id = inputs.get('upload_id')
        if not upload_id:
            raise ValueError("upload_id is required")

        # Load the dataset
        df = self._load_dataset(upload_id)

        # Analyze dataset structure
        column_analysis = self._analyze_columns(df)
        dataset_type = self._identify_dataset_type(df, column_analysis)
        data_quality = self._assess_data_quality(df)

        result = {
            'upload_id': upload_id,
            'dataset_info': {
                'rows': len(df),
                'columns': len(df.columns),
                'dataset_type': dataset_type,
                'estimated_size': df.memory_usage(deep=True).sum(),
                'data_quality_score': data_quality['score']
            },
            'column_types': column_analysis,
            'data_quality': data_quality,
            'recommendations': self._generate_recommendations(column_analysis, dataset_type)
        }

        logger.info(f"Dataset intelligence analysis completed for upload {upload_id}")
        return result

    def _load_dataset(self, upload_id: int) -> pd.DataFrame:
        """Load dataset from database/file storage"""
        from backend.database.db_manager import SessionLocal
        from backend.database.models import Upload
        from backend.utils.file_reader import read_file
        import os

        db = SessionLocal()
        try:
            upload = db.query(Upload).filter(Upload.id == upload_id).first()
            if not upload:
                raise ValueError(f"Upload {upload_id} not found")

            candidate_paths = [
                upload.file_path,
                os.path.join(os.getenv('UPLOAD_DIR', 'uploads'), upload.filename),
            ]

            file_path = next((path for path in candidate_paths if path and os.path.exists(path)), None)
            if not file_path:
                raise ValueError(f"File not found for upload {upload_id}")

            df = read_file(file_path, upload.file_type)
            if df is None:
                raise ValueError(f"Unsupported file format: {upload.filename}")

            return df
        finally:
            db.close()

    def _analyze_columns(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Analyze each column to determine its type and characteristics"""
        column_analysis = {}

        for col in df.columns:
            col_data = df[col].dropna()
            if len(col_data) == 0:
                column_analysis[col] = {
                    'type': 'empty',
                    'confidence': 1.0,
                    'sample_values': [],
                    'null_percentage': 100.0
                }
                continue

            # Detect column type
            detected_type, confidence = self._detect_column_type(col_data, col)

            # Calculate statistics
            stats = self._calculate_column_stats(col_data, detected_type)

            column_analysis[col] = {
                'type': detected_type,
                'confidence': confidence,
                'sample_values': col_data.head(3).tolist(),
                'null_percentage': (len(df) - len(col_data)) / len(df) * 100,
                'unique_values': len(col_data.unique()),
                'statistics': stats
            }

        return column_analysis

    def _detect_column_type(self, series: pd.Series, col_name: str) -> Tuple[str, float]:
        """Detect the type of a column using multiple heuristics"""
        col_name_lower = col_name.lower()

        # Check for date columns by name
        if any(keyword in col_name_lower for keyword in ['date', 'time', 'created', 'updated']):
            if self._is_date_column(series):
                return 'date', 0.9

        # Check for currency columns by name
        if any(keyword in col_name_lower for keyword in ['amount', 'price', 'cost', 'salary', 'revenue']):
            if self._is_numeric_column(series):
                return 'currency', 0.8

        # Check for ID columns
        if any(keyword in col_name_lower for keyword in ['id', 'code', 'number']):
            return 'id', 0.8

        # Check for categorical columns
        if len(series.unique()) / len(series) < 0.1:  # Less than 10% unique values
            return 'categorical', 0.7

        # Pattern-based detection
        if self._matches_pattern(series, self.column_type_patterns['date']):
            return 'date', 0.8
        elif self._matches_pattern(series, self.column_type_patterns['currency']):
            return 'currency', 0.8
        elif self._matches_pattern(series, self.column_type_patterns['percentage']):
            return 'percentage', 0.8
        elif self._matches_pattern(series, self.column_type_patterns['email']):
            return 'email', 0.9
        elif self._matches_pattern(series, self.column_type_patterns['phone']):
            return 'phone', 0.8

        # Type-based detection
        if pd.api.types.is_numeric_dtype(series):
            return 'numeric', 0.9
        elif pd.api.types.is_string_dtype(series):
            return 'text', 0.6

        return 'unknown', 0.0

    def _is_date_column(self, series: pd.Series) -> bool:
        """Check if a column contains dates"""
        try:
            pd.to_datetime(series, errors='coerce')
            return True
        except:
            return False

    def _is_numeric_column(self, series: pd.Series) -> bool:
        """Check if a column is numeric"""
        try:
            pd.to_numeric(series, errors='coerce')
            return True
        except:
            return False

    def _matches_pattern(self, series: pd.Series, patterns: List[str]) -> bool:
        """Check if series values match any of the given patterns"""
        sample = series.astype(str).head(100)  # Check first 100 values
        for pattern in patterns:
            if sample.str.match(pattern).any():
                return True
        return False

    def _calculate_column_stats(self, series: pd.Series, col_type: str) -> Dict[str, Any]:
        """Calculate statistics for a column based on its type"""
        stats = {}

        try:
            if col_type in ['numeric', 'currency', 'percentage']:
                stats.update({
                    'mean': float(series.mean()),
                    'median': float(series.median()),
                    'std': float(series.std()),
                    'min': float(series.min()),
                    'max': float(series.max())
                })
            elif col_type == 'date':
                try:
                    date_series = pd.to_datetime(series, errors='coerce')
                    valid_dates = date_series.dropna()
                    if len(valid_dates) > 0:
                        stats.update({
                            'min_date': valid_dates.min().isoformat() if pd.notna(valid_dates.min()) else None,
                            'max_date': valid_dates.max().isoformat() if pd.notna(valid_dates.max()) else None,
                            'date_range_days': (valid_dates.max() - valid_dates.min()).days if pd.notna(valid_dates.min()) and pd.notna(valid_dates.max()) else None
                        })
                except Exception as e:
                    logger.warning(f"Could not calculate date stats: {e}")
            elif col_type == 'categorical':
                value_counts = series.value_counts().head(10)
                stats['top_categories'] = value_counts.to_dict()
        except Exception as e:
            logger.warning(f"Could not calculate stats for column: {e}")

        return stats

    def _identify_dataset_type(self, df: pd.DataFrame, column_analysis: Dict[str, Dict[str, Any]]) -> str:
        """Identify the overall dataset type based on column names and types"""
        column_names = [col.lower() for col in df.columns]

        # Count keyword matches for each dataset type
        type_scores = {}
        for dataset_type, keywords in self.dataset_type_keywords.items():
            score = sum(1 for col in column_names for keyword in keywords if keyword in col)
            type_scores[dataset_type] = score

        # Get the highest scoring type
        if type_scores:
            best_type = max(type_scores.items(), key=lambda x: x[1])
            if best_type[1] > 0:
                return best_type[0]

        # Fallback: analyze column types
        type_counts = {}
        for col_info in column_analysis.values():
            col_type = col_info['type']
            type_counts[col_type] = type_counts.get(col_type, 0) + 1

        if type_counts.get('currency', 0) > 2:
            return 'financial'
        elif type_counts.get('date', 0) >= 1 and type_counts.get('numeric', 0) >= 2:
            return 'transaction'
        else:
            return 'general'

    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess the overall data quality of the dataset"""
        total_cells = df.shape[0] * df.shape[1]
        null_cells = df.isnull().sum().sum()
        null_percentage = (null_cells / total_cells) * 100

        # Check for duplicates
        duplicate_rows = df.duplicated().sum()
        duplicate_percentage = (duplicate_rows / df.shape[0]) * 100

        # Calculate quality score (0-100)
        quality_score = 100 - (null_percentage * 0.5) - (duplicate_percentage * 2)

        # Ensure score is between 0 and 100
        quality_score = max(0, min(100, quality_score))

        return {
            'score': round(quality_score, 1),
            'null_percentage': round(null_percentage, 2),
            'duplicate_percentage': round(duplicate_percentage, 2),
            'total_rows': df.shape[0],
            'total_columns': df.shape[1],
            'issues': []
        }

    def _generate_recommendations(self, column_analysis: Dict[str, Dict[str, Any]], dataset_type: str) -> List[str]:
        """Generate recommendations based on the analysis"""
        recommendations = []

        # Check for high null percentages
        high_null_cols = [col for col, info in column_analysis.items() if info['null_percentage'] > 20]
        if high_null_cols:
            recommendations.append(f"High null values in columns: {', '.join(high_null_cols[:3])}")

        # Check for data quality issues
        low_confidence_cols = [col for col, info in column_analysis.items() if info['confidence'] < 0.5]
        if low_confidence_cols:
            recommendations.append(f"Low confidence column type detection for: {', '.join(low_confidence_cols[:3])}")

        # Dataset-specific recommendations
        if dataset_type == 'sales':
            recommendations.append("Consider analyzing sales trends and seasonality")
        elif dataset_type == 'accounting':
            recommendations.append("Check for balanced accounting entries")
        elif dataset_type == 'financial':
            recommendations.append("Perform ratio analysis and trend identification")

        return recommendations
