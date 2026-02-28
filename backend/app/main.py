from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import logging

from app.services.extraction_worker import process_pdf_extraction
from app.core.security.pdf_validator import validate_pdf
from app.api.v1.copilot_router import copilotkit_router # Added import

# Configure logging for global exception routing
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI-Powered Research Paper Analyzer",
    description="Deterministic GraphRAG LLM Pipeline API",
    version="1.0.0"
)

# CORS Configuration for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import uuid
import os
TEMP_DIR = "/app/data/temp_files/"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/v1/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Ingestion & Validation Gateway.
    Accepts PDF files, inspects them at the byte-level via pdf_validator, 
    and defers processing to the asynchronous worker queue if valid.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={"error": "invalid_format", "message": "Only PDF files are supported"}
        )

    # Read binary payload into memory safely
    # Note: For extremely large files, chunked reading and immediate streaming to disk is preferred.
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading file bytes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "read_failure", "message": "Failed to read file payload"}
        )

    # Perform Defensive Validation (The Safety Shield)
    is_valid, validation_msg = validate_pdf(file_bytes)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "validation_failed", "message": validation_msg}
        )
        
    # Generate Unique Tracking IDs
    task_id = str(uuid.uuid4())
    user_id = "mock-user-1" 
    
    # Save to Local Blob Storage temporarily for Celery Worker to pick up
    temp_file_path = os.path.join(TEMP_DIR, f"{task_id}.pdf")
    try:
         with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
         logger.error(f"Failed to write physical file for celery worker: {e}")
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "write_failure", "message": "Failed to persist file to disk"}
        )

    # PUSH TO MESSAGE BROKER (Async Orchestration)
    # The '.delay()' command instantly places the payload into Redis and returns immediately
    try:
        process_pdf_extraction.delay(task_id, temp_file_path, user_id)
        logger.info(f"Successfully queued Task ID: {task_id}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis Broker: {e}")
        # Consider a 503 Service Unavailable if the queue is fundamentally down
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "broker_unavailable", "message": "The asynchronous processing queue is currently down."}
        )

    return {
        "status": "accepted",
        "task_id": task_id,
        "message": "File successfully validated and queued for extraction."
    }

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Fallback handler to prevent unstructured server crashes."""
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return {
        "error": "internal_error",
        "message": "An unexpected server error occurred."
    }, status.HTTP_500_INTERNAL_SERVER_ERROR
