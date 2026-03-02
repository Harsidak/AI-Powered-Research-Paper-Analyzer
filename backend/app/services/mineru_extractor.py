import os
import json
import logging
from pathlib import Path

# --- PaddlePaddle OneDNN fix (must be set BEFORE paddle is imported) ---
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import logging
from pathlib import Path

from app.services.markdown_generator import MarkdownGenerator

logger = logging.getLogger(__name__)

class MinerUExtractor:
    def __init__(self, output_dir: str = "/tmp/mineru_outputs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._md_generator = MarkdownGenerator()
        
    def extract_document(self, file_path: str) -> dict:
        """
        Extracts document structure (text, equations, tables) using MinerU's optical parsing.
        
        Returns a dict with keys:
            - markdown_content: The full linearized Markdown string
            - markdown_path: Path to the saved .md file
            - images_dir: Path to the directory containing extracted images
            - metadata: The raw pdf_info_dict from MinerU
        """
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise FileNotFoundError(f"PDF not found at {file_path}")
            
        file_name = file_path_obj.name
        doc_name = file_name.replace(".pdf", "")
        doc_output_dir = self.output_dir / doc_name
        doc_output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
                
            # MinerU 0.6.x syntax requires grabbing the models first, then handing them off
            logger.info(f"Running layout analysis on {file_name}...")
            image_writer = DiskReaderWriter(str(doc_output_dir))
            
            # 1. Run inference (layout detection + formula detection + OCR)
            pdf_models = doc_analyze(pdf_bytes, ocr=True)
            
            # 2. Parse layout using the universal pipeline
            pdf_info_dict = parse_union_pdf(
                pdf_bytes,
                pdf_models,
                image_writer,
                is_debug=False,
                start_page=0
            )
            
            # 3. Generate linearized Markdown from the structured output
            logger.info(f"Generating Markdown for {file_name}...")
            markdown_content = self._md_generator.generate(pdf_info_dict)
            
            # 4. Save the Markdown file alongside extracted images
            md_path = doc_output_dir / f"{doc_name}.md"
            md_path.write_text(markdown_content, encoding="utf-8")
            
            # 5. Also save the raw JSON for debugging/downstream use
            json_path = doc_output_dir / f"{doc_name}_info.json"
            json_path.write_text(
                json.dumps(pdf_info_dict, indent=2, ensure_ascii=False, default=str),
                encoding="utf-8"
            )
            
            logger.info(f"Extraction complete for {file_name}. "
                        f"Markdown: {md_path}, Images: {doc_output_dir}")
            
            return {
                "markdown_content": markdown_content,
                "markdown_path": str(md_path),
                "images_dir": str(doc_output_dir),
                "metadata": pdf_info_dict,
            }
            
        except Exception as e:
            logger.error(f"Failed to extract document {file_path} with MinerU: {str(e)}")
            raise

