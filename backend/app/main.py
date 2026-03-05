from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from app.services.extraction_worker import process_pdf_extraction
from app.core.security.pdf_validator import validate_pdf
from app.api.v1.copilot_router import copilotkit_sdk
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from app.core.database import init_db, get_db
from app.models.task import ExtractionTask
from app.api.v1.endpoints.analytics import router as analytics_router
from app.services.mineru_extractor import MinerUExtractor
from app.services.lang_extract_engine import run_lang_extract_pipeline
from app.services.statistical_engine import statistical_compute
from app.services.relational_engine import relational_builder
import uuid
import os

# Configure logging for global exception routing
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize database tables
try:
    init_db()
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")

app = FastAPI(
    title="AI-Powered Research Paper Analyzer",
    description="Deterministic GraphRAG LLM Pipeline API",
    version="1.0.0",
    docs_url="/swagger"
)

# CORS Configuration for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the CopilotKit Router
add_fastapi_endpoint(app, copilotkit_sdk, "/api/v1/copilotkit")

# Register Analytics Endpoints
app.include_router(analytics_router, prefix="/api/v1")

TEMP_DIR = "/app/data/temp_files/"
# For local dev without docker, fallback to relative path if absolute fails
if not os.path.exists("/app/data"):
    TEMP_DIR = "./data/temp_files/"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/v1/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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

    # Create Task Record in Database
    try:
        new_task = ExtractionTask(
            id=task_id,
            user_id=user_id,
            file_path=temp_file_path,
            status="PENDING",
            progress=0.0
        )
        db.add(new_task)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to create task in DB: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "db_failure", "message": "Failed to initialize tracking task"}
        )

    # PUSH TO MESSAGE BROKER (Async Orchestration)
    # The '.delay()' command instantly places the payload into Redis and returns immediately
    try:
        process_pdf_extraction.delay(task_id, temp_file_path, user_id)
        logger.info(f"Successfully queued Task ID: {task_id}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis Broker: {e}")
        # Consider a 503 Service Unavailable if the queue is fundamentally down
        # We might also want to mark the DB task as FAILED here
        new_task.status = "FAILED"
        new_task.error_message = "Broker unavailable"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "broker_unavailable", "message": "The asynchronous processing queue is currently down."}
        )

    return {
        "status": "accepted",
        "task_id": task_id,
        "message": "File successfully validated and queued for extraction."
    }

@app.get("/api/v1/status/{task_id}")
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    """Retrieve the current status and progress of an extraction task."""
    task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return {
        "task_id": task.id,
        "status": task.status,
        "progress": task.progress,
        "paper_title": task.paper_title,
        "error_message": task.error_message,
        "result_data": task.result_data,
        "created_at": task.created_at,
        "updated_at": task.updated_at
    }

# Global Exception Handlers
@app.post("/api/v1/analyze-sync", status_code=status.HTTP_200_OK)
async def analyze_document_sync(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Synchronous full-pipeline execution for testing via Swagger UI.
    Upload a PDF, it runs MinerU -> LangExtract -> Pandas -> Cognee and returns the payload.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported"
        )

    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading file bytes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "read_failure", "message": "Failed to read file payload"}
        )

    # Validate PDF
    is_valid, validation_msg = validate_pdf(file_bytes)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "validation_failed", "message": validation_msg}
        )

    temp_file_path = os.path.join(TEMP_DIR, f"sync_test_{uuid.uuid4()}.pdf")
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.error(f"Failed to write file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "write_failure", "message": "Failed to persist file to disk"}
        )

    try:
        # 1. MinerU Vision Parsing
        logger.info(f"Starting synchronous MinerU extraction for {temp_file_path}")
        extractor = MinerUExtractor()
        mineru_result = extractor.extract_document(file_path=temp_file_path)
        extracted_text = mineru_result["markdown"]
        
        # 2. Strict Pydantic Execution Pipeline
        logger.info(f"Executing LangExtract pipeline...")
        structured_data = run_lang_extract_pipeline(clean_text=extracted_text)
        paper_title = structured_data.metadata.title
        raw_json = structured_data.model_dump()

        # 3. Statistical Engine (Path A - Pandas)
        logger.info(f"Computing matrix trends...")
        df = statistical_compute.format_matrix(raw_json)
        matrix_shape = list(df.shape) if not df.empty else [0, 0]
        
        # 4. Relational Path (Cognee GraphRAG)
        logger.info(f"Running Cognee ECL Pipeline...")
        success = await relational_builder.build_knowledge_graph(
            raw_text=extracted_text, 
            document_title=paper_title or "Unknown Document"
        )
        
        return {
            "status": "success",
            "message": "Pipeline executed successfully",
            "mineru": {
                "chars_extracted": len(extracted_text)
            },
            "pandas": {
                "matrix_shape": matrix_shape
            },
            "cognee": {
                "success": success
            },
            "extracted_data": raw_json
        }
    except Exception as e:
        logger.error(f"Sync pipeline failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Fallback handler to prevent unstructured server crashes."""
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return {
        "error": "internal_error",
        "message": "An unexpected server error occurred."
    }, status.HTTP_500_INTERNAL_SERVER_ERROR
