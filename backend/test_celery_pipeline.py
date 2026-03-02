import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the python path
root_dir = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(root_dir))

from app.services.extraction_worker import process_pdf_extraction

def run_celery_test():
    print("Testing Complete Extraction Pipeline (MinerU -> LangExtract -> Pandas/Cognee)")
    
    # We need a sample PDF file to run through MinerU
    sample_pdf = Path(root_dir) / "tests" / "sample_paper.pdf"
    
    print(f"Triggering pipeline on {sample_pdf}")
    try:
        # Call the Celery task directly (synchronously for testing)
        # Note: Cognee's Neo4j/LanceDB components might fail if their docker containers aren't running
        result = process_pdf_extraction(None, task_id="test-task-123", file_path=str(sample_pdf), user_id="test-user")
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\nPipeline Exception: {e}")

if __name__ == "__main__":
    run_celery_test()
