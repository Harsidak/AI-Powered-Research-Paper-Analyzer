import logging
import asyncio
from app.core.celery_app import celery_app
from app.services.mineru_extractor import MinerUExtractor
from app.services.lang_extract_engine import run_lang_extract_pipeline
from app.services.statistical_engine import statistical_compute
from app.services.relational_engine import relational_builder

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
        
        # 1. Multi-Modal Vision Parsing (MinerU)
        logger.info(f"[{task_id}] Initializing Vision Parser (MinerU)...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "EXTRACTING_LAYOUT", "progress": 10})
        
        extractor = MinerUExtractor()
        mineru_result = extractor.extract_document(file_path=file_path)
        extracted_text = mineru_result["markdown"]
        
        # 2. Strict Pydantic Execution Pipeline
        logger.info(f"[{task_id}] Executing LangExtract Schema Validation...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "ANALYZING", "progress": 50})
        
        structured_data = run_lang_extract_pipeline(clean_text=extracted_text)
        
        logger.info(f"[{task_id}] LLM Extraction successful. Found Title: {structured_data.metadata.title}")

        # 2b. Statistical Engine (Path A - Pandas)
        logger.info(f"[{task_id}] Computing Matrix Trends with Statistical Engine...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "CRUNCHING_MATRIX", "progress": 65})
        raw_json = structured_data.model_dump()
        df = statistical_compute.format_matrix(raw_json)
        logger.info(f"[{task_id}] Pandas Matrix Created: {df.shape if not df.empty else 'Empty'}")
        
        # 3. Relational Path (Cognee GraphRAG)
        logger.info(f"[{task_id}] Running Cognee ECL Pipeline to Neo4j/LanceDB...")
        if self:
            self.update_state(state="PROGRESS", meta={"status": "BUILDING_GRAPH", "progress": 80})
        
        # Run the async Cognee builder inside the sync celery thread
        # Note: In a true prod env with heavy concurrency, we'd want a separate async worker queue
        asyncio.run(relational_builder.build_knowledge_graph(
            raw_text=extracted_text, 
            document_title=structured_data.metadata.title
        ))
        logger.info(f"[{task_id}] Knowledge Graph Built Successfully.")
        
        # TODO: Update DB Status to COMPLETE
        logger.info(f"Job {task_id} completed successfully.")
        return {"status": "COMPLETE", "task_id": task_id}

    except Exception as e:
        logger.error(f"Failed to process document {task_id}: {e}", exc_info=True)
        # We re-raise to let Celery's built in retry/failure mechanisms catch it
        if self:
            raise self.retry(exc=e, countdown=60, max_retries=3)
        raise e
