from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import logging

from app.core.security.pdf_validator import validate_pdf

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
    # We read it entirely here for PyMuPDF validation.
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
        
    # TODO: Save to Blob Storage
    # TODO: Update PostgreSQL
    # TODO: Push to Redis Message Broker
    
    # Mock task_id generation for Phase 1
    task_id = "mock-uuid-1234-abcd"

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
