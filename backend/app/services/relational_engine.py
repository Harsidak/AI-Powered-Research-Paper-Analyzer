import os
import asyncio
import logging
from typing import Dict, Any
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
        # Ensure Cognee respects local LLM setup if API keys are missing, 
        # or defaults to basic embedding models if needed
        self.is_initialized = False

    async def _setup_cognee(self):
        """Lazy initialization of cognee async settings"""
        if not self.is_initialized:
            # Setting environment variables programmatically allows for 
            # local-first overrides based on tech_stack.md requirements
            os.environ["LANCEDB_DIR"] = os.path.abspath("./lancedb_data")
            os.environ["NETWORKX_DIR"] = os.path.abspath("./networkx_data")
            self.is_initialized = True
            logger.info("Cognee Relational Engine initialized.")

    async def build_knowledge_graph(self, raw_text: str, document_title: str) -> bool:
        """
        Executes the ECL pipeline:
        1. Extract: Uses unstructured/vision parsers (handled upstream in our arch)
        2. Cognify: Identifies triplets (Entity->Relationship->Entity)
        3. Load: Saves to NetworkX and LanceDB
        """
        try:
            await self._setup_cognee()
            
            logger.info(f"Adding document '{document_title}' to Cognee cognitive memory...")
            # We utilize the async context properly inside the celery worker wrapper
            await add(raw_text, document_title)
            
            logger.info(f"Cognifying document '{document_title}' into GraphRAG structures...")
            await cognify()
            
            return True
            
        except Exception as e:
            logger.error(f"Cognee graph creation failed for {document_title}: {str(e)}")
            return False

# Exported singleton
relational_builder = RelationalEngine()
