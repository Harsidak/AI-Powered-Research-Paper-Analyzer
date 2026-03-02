from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging

from app.core.database import get_db
from app.models.task import ExtractionTask

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics Engine"]
)

@router.get("/methodologies/{task_id}")
def get_methodologies(task_id: str, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieves the extracted Methodology Matrix from the LangExtract engine.
    """
    task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "COMPLETE":
        raise HTTPException(status_code=400, detail=f"Task is not complete. Current status: {task.status}")

    # result_data contains the full Pydantic dump from the worker
    if not task.result_data:
        return []

    return task.result_data.get("methodologies", [])

@router.get("/gap-radar/{task_id}")
def get_research_gaps(task_id: str, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieves extracted Limitations that drive the Research Gap Radar.
    """
    task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "COMPLETE":
        raise HTTPException(status_code=400, detail=f"Task is not complete. Current status: {task.status}")

    if not task.result_data:
        return []

    return task.result_data.get("limitations", [])

@router.get("/contradictions/{task_id}")
def get_contradictions(task_id: str, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieves extracted methodology/claim contradictions.
    """
    task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "COMPLETE":
        raise HTTPException(status_code=400, detail=f"Task is not complete. Current status: {task.status}")

    if not task.result_data:
        return []

    return task.result_data.get("contradictions", [])

@router.get("/summary/{task_id}")
def get_extraction_summary(task_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Retrieves a high-level summary of the paper metadata and extraction results.
    """
    task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.result_data or "metadata" not in task.result_data:
        # If the task is incomplete, provide a basic status summary
        return {
            "task_id": task_id,
            "status": task.status,
            "paper_title": task.paper_title,
            "metadata": None
        }

    metadata = task.result_data.get("metadata", {})
    return {
        "task_id": task_id,
        "status": task.status,
        "paper_title": task.paper_title or metadata.get("title"),
        "metadata": metadata,
        "counts": {
            "methodologies": len(task.result_data.get("methodologies", [])),
            "limitations": len(task.result_data.get("limitations", [])),
            "contradictions": len(task.result_data.get("contradictions", []))
        }
    }
