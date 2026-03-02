import logging
import asyncio
from app.core.celery_app import celery_app
from app.services.mineru_extractor import MinerUExtractor
from app.services.lang_extract_engine import run_lang_extract_pipeline
from app.services.statistical_engine import statistical_compute
from app.services.relational_engine import relational_builder
from app.core.database import SessionLocal
from app.models.task import ExtractionTask

logger = logging.getLogger(__name__)

def update_db_task(task_id: str, status: str, progress: float, error_message: str = None, paper_title: str = None, result_data: dict = None):
    """Helper to update the PostgreSQL tracking table."""
    try:
        with SessionLocal() as db:
            task = db.query(ExtractionTask).filter(ExtractionTask.id == task_id).first()
            if task:
                task.status = status
                task.progress = progress
                if error_message:
                    task.error_message = error_message
                if paper_title:
                    task.paper_title = paper_title
                if result_data:
                    task.result_data = result_data
                db.commit()
    except Exception as e:
        logger.error(f"Failed to update task {task_id} in DB: {e}")

@celery_app.task(bind=True, name="process_pdf_extraction")
def process_pdf_extraction(self, task_id: str, file_path: str, user_id: str):
    """
    The core background job for Stage 3 & 4 (Vision Parsers & Analytics).
    Runs entirely decoupled from the FastAPI request thread.
    """
    logger.info(f"Worker picked up job {task_id} for {file_path}")
    
    try:
        # 1. Multi-Modal Vision Parsing (MinerU)
        logger.info(f"[{task_id}] Initializing Vision Parser (MinerU)...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "EXTRACTING_LAYOUT", "progress": 10})
        update_db_task(task_id, "EXTRACTING_LAYOUT", 10.0)
        
        extractor = MinerUExtractor()
        mineru_result = extractor.extract_document(file_path=file_path)
        extracted_text = mineru_result["markdown"]
        
        # 2. Strict Pydantic Execution Pipeline
        logger.info(f"[{task_id}] Executing LangExtract Schema Validation...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "ANALYZING", "progress": 50})
        update_db_task(task_id, "ANALYZING", 50.0)
        
        structured_data = run_lang_extract_pipeline(clean_text=extracted_text)
        paper_title = structured_data.metadata.title
        logger.info(f"[{task_id}] LLM Extraction successful. Found Title: {paper_title}")
        update_db_task(task_id, "ANALYZING", 60.0, paper_title=paper_title)

        # 2b. Statistical Engine (Path A - Pandas)
        logger.info(f"[{task_id}] Computing Matrix Trends with Statistical Engine...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "CRUNCHING_MATRIX", "progress": 65})
        update_db_task(task_id, "CRUNCHING_MATRIX", 65.0)
        
        raw_json = structured_data.model_dump()
        df = statistical_compute.format_matrix(raw_json)
        logger.info(f"[{task_id}] Pandas Matrix Created: {df.shape if not df.empty else 'Empty'}")
        
        # 3. Relational Path (Cognee GraphRAG)
        logger.info(f"[{task_id}] Running Cognee ECL Pipeline to Neo4j/LanceDB...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "BUILDING_GRAPH", "progress": 80})
        update_db_task(task_id, "BUILDING_GRAPH", 80.0)
        
        # Run the async Cognee builder inside the sync celery thread
        # Note: In a true prod env with heavy concurrency, we'd want a separate async worker queue
        asyncio.run(relational_builder.build_knowledge_graph(
            raw_text=extracted_text, 
            document_title=paper_title
        ))
        logger.info(f"[{task_id}] Knowledge Graph Built Successfully.")
        
        if self:
            self.update_state(state="SUCCESS", meta={"status": "COMPLETE", "progress": 100})
        update_db_task(task_id, "COMPLETE", 100.0, result_data=raw_json)
            
        logger.info(f"Job {task_id} completed successfully.")
        return {"status": "COMPLETE", "task_id": task_id}

    except Exception as e:
        logger.error(f"Failed to process document {task_id}: {e}", exc_info=True)
        update_db_task(task_id, "FAILED", 0.0, error_message=str(e))
        # We re-raise to let Celery's built in retry/failure mechanisms catch it
        if self:
            raise self.retry(exc=e, countdown=60, max_retries=3)
        raise e
