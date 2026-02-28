import pandas as pd
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class StatisticalEngine:
    """
    Path A of the Dual-Engine Analytics.
    Uses Pandas and NumPy to compute mathematical frequencies, trends, and saturation
    across the extracted Pydantic models (Methodology Matrix).
    """

    def __init__(self):
        self._history_df = pd.DataFrame()

    def calculate_trend_saturation(self, methodologies: List[str]) -> Dict[str, float]:
        """
        Calculates a mock TF-IDF saturation score for methodologies to determine
        if a research technique is considered 'novel' or 'saturated'.
        """
        if not methodologies:
            return {}
            
        try:
            # Convert list to Pandas Series for vectorized operations
            s = pd.Series(methodologies)
            # Calculate simple frequency bounds
            counts = s.value_counts(normalize=True)
            
            saturation_scores = {}
            for method, freq in counts.items():
                # A toy heuristic: > 0.5 normalize freq is "highly saturated" (close to 1.0)
                score = np.clip(freq * 1.5, 0.1, 0.99)
                saturation_scores[method] = round(float(score), 4)
                
            return saturation_scores
            
        except Exception as e:
            logger.error(f"Failed to calculate trend saturation in Pandas: {str(e)}")
            return {}

    def format_matrix(self, raw_pydantic_payload: Dict[str, Any]) -> pd.DataFrame:
        """
        Converts the raw nested dictionary from LangExtract into a flat 
        Pandas DataFrame suitable for Dashboard rendering or CSV export.
        """
        try:
            # Flatten methodologies
            methods = raw_pydantic_payload.get("methodologies", [])
            if methods:
                df = pd.json_normalize(methods)
                return df
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"Failed to format Methodology Matrix: {str(e)}")
            return pd.DataFrame()
            
    def build_dynamic_gap_radar(self, extracted_limitations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Synthesizes individual limitation schemas into a consolidated Risk/Gap score.
        """
        if not extracted_limitations:
            return {"primary_gap": "None calculated", "risk_index": 0.0}
            
        try:
            df = pd.json_normalize(extracted_limitations)
            
            # Identify the most frequent limitation category (mock logic)
            # Real logic would use embedding similarity across all documents
            primary_gap = "The model is currently restricted to unimodal input."
            
            # Simple severity scalar
            risk_index = round(min(len(extracted_limitations) * 0.2, 1.0), 2)
            
            return {
                "primary_gap": primary_gap,
                "risk_index": risk_index,
                "synthesized_from_count": len(extracted_limitations)
            }
        except Exception as e:
            logger.error(f"Failed to build dynamic gap radar: {e}")
            return {"primary_gap": "Error calculating", "risk_index": -1.0}

# Singleton instance
statistical_compute = StatisticalEngine()
