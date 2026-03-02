from sqlalchemy import Column, String, Integer, DateTime, JSON, Float
from sqlalchemy.sql import func
from app.core.database import Base

class ExtractionTask(Base):
    __tablename__ = "extraction_tasks"

    id = Column(String, primary_key=True, index=True) # This will be our task_id (UUID)
    user_id = Column(String, index=True)
    file_path = Column(String)
    status = Column(String, default="PENDING") # PENDING, EXTRACTING_LAYOUT, ANALYZING, CRUNCHING_MATRIX, BUILDING_GRAPH, COMPLETE, FAILED
    progress = Column(Float, default=0.0)
    
    # Metadata extracted
    paper_title = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Result storage (optional, could also be in a separate table)
    result_data = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
