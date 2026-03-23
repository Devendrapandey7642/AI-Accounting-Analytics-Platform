from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)  # csv, excel, tally
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="uploaded")  # uploaded, processed, failed

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    metric_name = Column(String)
    value = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Chart(Base):
    __tablename__ = "charts"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    chart_type = Column(String)
    chart_data = Column(Text)  # JSON or path to image
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Insight(Base):
    __tablename__ = "insights"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    insight_text = Column(Text)
    category = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    report_type = Column(String)  # pdf, ppt
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkspaceState(Base):
    __tablename__ = "workspace_states"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), unique=True, index=True)
    payload_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkspaceShare(Base):
    __tablename__ = "workspace_shares"
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), index=True)
    share_token = Column(String, unique=True, index=True)
    label = Column(String, nullable=True)
    request_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
