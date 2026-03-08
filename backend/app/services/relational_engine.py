import os
import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.graph_db import memory_manager

logger = logging.getLogger(__name__)

# ─── Pydantic Models for Triplet Extraction ─────────────────────────────────

class Triplet(BaseModel):
    """A single knowledge graph triplet: Subject → Predicate → Object."""
    subject: str = Field(description="The source entity (e.g., an author name, paper title, model name, or dataset).")
    predicate: str = Field(description="The relationship type in UPPER_SNAKE_CASE (e.g., USES_MODEL, EVALUATES_ON, AUTHORED_BY, CITES, HAS_LIMITATION, CONTRADICTS, OPTIMIZED_WITH, ACHIEVES_METRIC).")
    object: str = Field(description="The target entity (e.g., a metric value, dataset name, or specific claim).")

class KnowledgeGraph(BaseModel):
    """A complete knowledge graph extracted from a research paper's structured data."""
    triplets: List[Triplet] = Field(
        description="A comprehensive list of knowledge graph triplets capturing all key relationships in the paper."
    )


# ─── System Prompt ───────────────────────────────────────────────────────────

TRIPLET_EXTRACTION_PROMPT = """You are a world-class academic knowledge graph builder.
Given the STRUCTURED JSON data already extracted from a research paper, produce a comprehensive list of knowledge graph triplets.

RELATIONSHIP TYPES to use (use ONLY these predicates):
- AUTHORED_BY: Paper → Author
- AFFILIATED_WITH: Author → Institution
- USES_MODEL: Paper/Methodology → Base Model or Algorithm
- EVALUATES_ON: Paper/Methodology → Dataset
- MEASURES_WITH: Paper/Methodology → Evaluation Metric
- OPTIMIZED_WITH: Paper/Methodology → Optimization Algorithm
- HAS_LIMITATION: Paper → Limitation description
- CONTRADICTS: Claim → Opposing Claim
- PUBLISHED_IN: Paper → Year

RULES:
1. Extract ALL entities and relationships present in the structured data — be exhaustive.
2. Use exact names from the data (no paraphrasing). If the paper mentions "ResNet50", use "ResNet50", not "ResNet".
3. The paper title should be the central hub node connected to authors, methodologies, etc.
4. For each methodology entry, create triplets linking it to its datasets, models, metrics, and optimization.
5. For contradictions, create CONTRADICTS edges between the claim and opposing claim.
6. For limitations, create HAS_LIMITATION edges from the paper to each limitation description.
7. Aim for 15-50 triplets depending on the paper's complexity.
"""


class RelationalEngine:
    """
    Path B of the Dual-Engine Analytics.
    Replaces Cognee's expensive ECL pipeline (100+ API calls) with a single
    LLM call that extracts knowledge graph triplets from the already-structured
    LangExtract output and loads them into NetworkX via GraphMemoryManager.
    """

    def __init__(self):
        self._api_key = None

    def _get_api_key(self) -> str:
        """Lazy-load the API key."""
        if not self._api_key:
            load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
            self._api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not self._api_key:
                raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not found in environment.")
        return self._api_key

    def build_knowledge_graph(self, structured_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts triplets from the already-structured LangExtract JSON using a
        single Gemini LLM call, then loads them into the NetworkX graph.

        Args:
            structured_data: The raw dict from ExtractedInsights.model_dump()

        Returns:
            Dict with graph stats: {success, node_count, edge_count, triplet_count}
        """
        try:
            api_key = self._get_api_key()
            paper_title = structured_data.get("metadata", {}).get("title", "Unknown Paper")

            logger.info(f"Extracting knowledge graph triplets for '{paper_title}' (single LLM call)...")

            # Initialize Gemini with structured output
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.0,  # Deterministic extraction
            )
            structured_llm = llm.with_structured_output(KnowledgeGraph)

            # Build the prompt with the structured data
            import json
            data_str = json.dumps(structured_data, indent=2, default=str)

            messages = [
                SystemMessage(content=TRIPLET_EXTRACTION_PROMPT),
                HumanMessage(content=f"Extract all knowledge graph triplets from this structured research paper data:\n\n{data_str}"),
            ]

            # Single LLM call → structured triplets
            kg: KnowledgeGraph = structured_llm.invoke(messages)

            # Load triplets into NetworkX graph
            for triplet in kg.triplets:
                memory_manager.add_triplet(
                    subject=triplet.subject,
                    predicate=triplet.predicate,
                    object_target=triplet.object,
                    context={"paper": paper_title}
                )

            graph_stats = memory_manager.get_graph_summary()
            logger.info(
                f"Knowledge graph built for '{paper_title}': "
                f"{graph_stats['node_count']} nodes, {graph_stats['edge_count']} edges "
                f"({len(kg.triplets)} triplets extracted in 1 API call)"
            )

            return {
                "success": True,
                "triplet_count": len(kg.triplets),
                "node_count": graph_stats["node_count"],
                "edge_count": graph_stats["edge_count"],
                "sample_triplets": [
                    {"subject": t.subject, "predicate": t.predicate, "object": t.object}
                    for t in kg.triplets[:5]
                ],
            }

        except Exception as e:
            logger.error(f"Knowledge graph extraction failed for paper: {e}", exc_info=True)
            return {"success": False, "error": str(e), "triplet_count": 0, "node_count": 0, "edge_count": 0}


# Exported singleton
relational_builder = RelationalEngine()
