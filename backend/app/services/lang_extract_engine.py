import logging
import os
from typing import Dict, Any
from app.models.extraction import ExtractedInsights
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert academic research assistant and data extraction engine.
Your task is to read the provided structured Markdown/text extracted from a research paper or document.
You must extract the information exactly as required by the requested JSON schema.
Ensure all extracted data, especially methodologies, metrics, and limitations, is grounded in the source text.
If a field is not present in the text, leave it empty or use an appropriate default rather than hallucinating.
"""

def run_lang_extract_pipeline(clean_text: str) -> ExtractedInsights:
    """
    Forces the LLM to map unstructured academic text into our strict Pydantic V2 schemas.
    To maintain 100% Deterministic execution per the Researcher Pivot standard,
    we utilize `langchain_google_genai` wrapped precisely around the Pydantic models.
    
    Args:
        clean_text (str): The structured string output from the Vision Parser.
        
    Returns:
        ExtractedInsights: The validated, type-safe data payload.
    """
    
    logger.info("Initializing Custom LangExtract Schema Enforcement Pipeline...")
    
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set.")

    try:
        # Initialize the Gemini model via LangChain
        # We use gemini-2.5-flash for speed and cost-effectiveness in extraction tasks
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.0, # Zero temperature for deterministic extraction
        )
        
        # Enforce the Pydantic schema
        structured_llm = llm.with_structured_output(ExtractedInsights)
        
        logger.info("Invoking Gemini to extract structured insights...")
        
        # We pass the system prompt and the raw text
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"EXTRACT THE FOLLOWING DOCUMENT:\n\n{clean_text}")
        ]
        
        validated_insights: ExtractedInsights = structured_llm.invoke(messages)
        
        logger.info(f"Successfully bound LLM extraction to Pydantic constraints. Title: {validated_insights.metadata.title}")
        return validated_insights
        
    except Exception as e:
        logger.error(f"LLM hallucinated outside schema constraints or API call failed: {e}")
        raise ValueError(f"Non-deterministic LLM output detected. Validation failed: {e}")
