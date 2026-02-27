import logging
from app.core.celery_app import celery_app
from app.services.pdf_parser import parse_pdf_document
from app.services.lang_extract_engine import run_lang_extract_pipeline

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="process_pdf_extraction")
def process_pdf_extraction(self, task_id: str, file_path: str, user_id: str):
    """
    The core background job for Stage 3 & 4 (Vision Parsers & Analytics).
    Runs entirely decoupled from the FastAPI request thread.
    """
    logger.info(f"Worker picked up job {task_id} for {file_path}")
    
    try:
        # TODO: Update DB Status to EXTRACTING_LAYOUT
        
        # 1. Multi-Modal Vision Parsing (PyMuPDF Fallback)
        logger.info(f"[{task_id}] Initializing Vision Parser...")
        self.update_state(state="PROGRESS", meta={"status": "EXTRACTING_LAYOUT", "progress": 10})
        
        extracted_text = parse_pdf_document(file_path=file_path)
        
        # 2. Strict Pydantic Execution Pipeline
        logger.info(f"[{task_id}] Executing LangExtract Schema Validation...")
        self.update_state(state="PROGRESS", meta={"status": "ANALYZING", "progress": 50})
        
        structured_data = run_lang_extract_pipeline(clean_text=extracted_text)
        
        logger.info(f"[{task_id}] LLM Extraction successful. Found Title: {structured_data.metadata.title}")

        # 3. Relational Path (Cognee GraphRAG)
        logger.info(f"[{task_id}] Running Cognee ECL Pipeline to Neo4j/LanceDB...")
        self.update_state(state="PROGRESS", meta={"status": "BUILDING_GRAPH", "progress": 80})
        
        # For Phase 3, we simply acknowledge the structured dataset exists
        # In a later phase, this will push `structured_data.model_dump()` into PostgreSQL and LanceDB
        
        # TODO: Update DB Status to COMPLETE
        logger.info(f"Job {task_id} completed successfully.")
        return {"status": "COMPLETE", "task_id": task_id}

    except Exception as e:
        logger.error(f"Failed to process document {task_id}: {e}", exc_info=True)
        # We re-raise to let Celery's built in retry/failure mechanisms catch it
        raise self.retry(exc=e, countdown=60, max_retries=3)
