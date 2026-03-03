import os
import asyncio
import logging
from typing import Dict, Any
from dotenv import load_dotenv

# --- Monkey patch for cognee compatibility with older starlette ---
import starlette.status
if not hasattr(starlette.status, "HTTP_422_UNPROCESSABLE_CONTENT"):
    starlette.status.HTTP_422_UNPROCESSABLE_CONTENT = starlette.status.HTTP_422_UNPROCESSABLE_ENTITY

import cognee
from cognee.api.v1.add import add
from cognee.api.v1.cognify import cognify

logger = logging.getLogger(__name__)

class RelationalEngine:
    """
    Path B of the Dual-Engine Analytics.
    Uses Cognee's ECL (Extract, Cognify, Load) pipeline to build 
    deterministic knowledge graphs from extracted methodologies and contradictions.
    """
    
    def __init__(self):
        self.is_initialized = False

    async def _setup_cognee(self):
        """Lazy initialization of cognee async settings"""
        if not self.is_initialized:
            # Load .env from project root
            load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
            api_key = os.getenv("GEMINI_API_KEY")
            
            if not api_key:
                logger.error("GEMINI_API_KEY not found. Cognee setup will likely fail.")

            # Configure Cognee for Gemini (ECL Pipeline)
            cognee.config.set_llm_provider("gemini")
            cognee.config.set_llm_model("gemini/gemini-2.5-flash")
            cognee.config.set_llm_api_key(api_key)
            
            # Cognee 0.5.3 uses env vars for embedding provider config
            os.environ["EMBEDDING_PROVIDER"] = "gemini"
            os.environ["EMBEDDING_MODEL"] = "gemini/gemini-embedding-001"
            os.environ["EMBEDDING_API_KEY"] = api_key
            
            # Ensure LiteLLM (used by Cognee) picks up the key
            os.environ["GOOGLE_API_KEY"] = api_key
            
            # Configure Chunking to avoid LLM output overflow on large papers
            cognee.config.set_chunk_size(400)
            cognee.config.set_chunk_overlap(50)
            
            # Set data directories
            cognee.config.system_root_directory = os.path.abspath("./data/cognee_system")
            cognee.config.data_root_directory = os.path.abspath("./data/cognee_data")
            
            # Run cognee database migrations and internal setup
            from cognee.modules.engine.operations.setup import setup
            await setup()
            
            self.is_initialized = True
            logger.info("Cognee Relational Engine initialized with Gemini 2.5.")

    async def build_knowledge_graph(self, raw_text: str, document_title: str) -> bool:
        """
        Executes the ECL pipeline:
        1. Extract: Uses unstructured/vision parsers (handled upstream in our arch)
        2. Cognify: Identifies triplets (Entity->Relationship->Entity)
        3. Load: Saves to NetworkX and LanceDB
        """
        try:
            await self._setup_cognee()
            
            # Cognee strictly requires dataset names to not have spaces or dots
            import re
            dataset_name = re.sub(r'[\s\.]+', '_', document_title).lower()
            # Truncate to avoid overly long dataset names which might cause DB issues
            dataset_name = dataset_name[:50].strip('_')
            if not dataset_name:
                dataset_name = "default_dataset"
            
            logger.info(f"Adding document '{document_title}' to Cognee cognitive memory (dataset: {dataset_name})...")
            await add(raw_text, dataset_name)
            
            logger.info(f"Cognifying document '{document_title}' into GraphRAG structures...")
            await cognify()
            
            return True
            
        except Exception as e:
            logger.error(f"Cognee graph creation failed for {document_title}: {str(e)}", exc_info=True)
            return False

# Exported singleton
relational_builder = RelationalEngine()
