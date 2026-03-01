import os
import json
import logging
from pathlib import Path

# --- PaddlePaddle OneDNN fix (must be set BEFORE paddle is imported) ---
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

# The official MinerU 0.6.x API
from magic_pdf.rw.DiskReaderWriter import DiskReaderWriter
from magic_pdf.user_api import parse_union_pdf
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
import magic_pdf.model as model_config

# Force MinerU to run the ML models locally instead of crashing
model_config.__use_inside_model__ = True

logger = logging.getLogger(__name__)

class MinerUExtractor:
    def __init__(self, output_dir: str = "/tmp/mineru_outputs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def extract_document(self, file_path: str):
        """
        Extracts document structure (text, equations, tables) using MinerU's optical parsing.
        """
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise FileNotFoundError(f"PDF not found at {file_path}")
            
        file_name = file_path_obj.name
        doc_output_dir = self.output_dir / file_name.replace(".pdf", "")
        doc_output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
                
            # MinerU 0.6.x syntax requires grabbing the models first, then handing them off
            logger.info(f"Running layout analysis on {file_name}...")
            image_writer = DiskReaderWriter(str(doc_output_dir))
            
            # 1. Run inference
            pdf_models = doc_analyze(pdf_bytes, ocr=True)
            
            # 2. Parse layout into markdown using the universal pipeline
            pdf_info_dict = parse_union_pdf(
                pdf_bytes,
                pdf_models,
                image_writer,
                is_debug=False,
                start_page=0
            )
            
            # The dictionary contains the markdown string under `pdf_info_dict["_text"]` or similar depending on internals
            # However `magic_pdf` usually delegates output tracking directly via the writer right now.
            logger.info(f"Extraction complete for {file_name}. Outputs saved to {doc_output_dir}")
            
            return {
                "metadata": pdf_info_dict,
                "output_dir": str(doc_output_dir)
            }
            
        except Exception as e:
            logger.error(f"Failed to extract document {file_path} with MinerU: {str(e)}")
            raise
