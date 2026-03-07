import os
import io
import json
import logging
from pathlib import Path
from typing import Any
from PIL import Image

logger = logging.getLogger(__name__)

class MinerUExtractor:
    def __init__(self, output_dir: str = "test_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.model = None

    def _load_model(self):
        if self.model is None:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO
            
            logger.info("Downloading/Loading YOLOv8 DocLayNet model...")
            model_path = hf_hub_download('vaivTA/yolov8n_doclaynet', 'weights/best.pt')
            self.model = YOLO(model_path)
            logger.info("YOLO model loaded.")
        return self.model

    def extract_document(self, file_path: str) -> dict:
        """
        Extracts document structure (text, equations, tables) using YOLOv8 DocLayNet + PyMuPDF.
        Replaces MinerU completely.

        Returns a dict with keys:
            - markdown: The full linearized Markdown string
            - pdf_info: Metdata
            - images_dir: Path to the directory containing extracted images
        """
        import fitz  # PyMuPDF
        
        file_path_obj = Path(file_path).resolve()
        if not file_path_obj.exists():
            raise FileNotFoundError(f"PDF not found at {file_path}")

        file_name = file_path_obj.name
        doc_name = file_name.replace(".pdf", "")
        doc_output_dir = self.output_dir / doc_name
        images_dir = doc_output_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Custom DLA: Beginning PDF extraction for {file_name}")

        try:
            model = self._load_model()
            doc = fitz.open(file_path_obj)
            
            markdown_body = []
            
            # Use 150 DPI for good image crops and YOLO detection
            DPI = 150
            zoom = DPI / 72.0 
            mat = fitz.Matrix(zoom, zoom)
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # 1. Rasterize Page for YOLO and Cropping
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))
                
                # 2. YOLO Inference
                results = model(img, verbose=False)[0]
                
                crops_on_page = []
                # Target classes for cropping
                target_classes = ["Table", "Picture", "Formula"]
                
                for i, box in enumerate(results.boxes):
                    class_id = int(box.cls[0].item())
                    class_name = model.names[class_id]
                    
                    if class_name in target_classes:
                        # YOLO Bounting box in Image coords (DPI = 150)
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        # Save the crop
                        cropped = img.crop((x1, y1, x2, y2))
                        crop_filename = f"page_{page_num+1}_{class_name}_{i}.png"
                        crop_path = images_dir / crop_filename
                        cropped.save(crop_path)
                        
                        # Convert bbox back to PDF point coords (DPI = 72) for intersection
                        pdf_rect = fitz.Rect(x1/zoom, y1/zoom, x2/zoom, y2/zoom)
                        
                        crops_on_page.append({
                            "type": class_name,
                            "rect": pdf_rect,
                            "path": crop_path.absolute().as_posix(),  # Absolute path for LLM/Markdown context
                            "img_y0": pdf_rect.y0 # For sorting
                        })
                
                # 3. Extract PyMuPDF Text Blocks
                blocks = page.get_text("blocks")
                text_items = []
                
                for b in blocks:
                    x0, y0, x1, y1, text, block_no, block_type = b
                    b_rect = fitz.Rect(x0, y0, x1, y1)
                    
                    # Filter out Text block if it heavily overlaps with a Table, Picture, or Formula 
                    # We don't want garbled PyMuPDF text of a table when we already cropped the table.
                    is_contained = False
                    for crop in crops_on_page:
                        intersect = b_rect.intersect(crop["rect"])
                        if intersect.get_area() > 0.5 * b_rect.get_area():
                            is_contained = True
                            break
                            
                    if not is_contained and text.strip():
                        # Standardize text block as an item
                        text_items.append({
                            "type": "Text",
                            "rect": b_rect,
                            "text": text.strip(),
                            "img_y0": y0
                        })
                
                # 4. Splice Text and Image Links together (Top-to-Bottom sorting)
                all_items = crops_on_page + text_items
                all_items = sorted(all_items, key=lambda x: x["img_y0"])
                
                for item in all_items:
                    if item["type"] == "Text":
                        markdown_body.append(item["text"])
                    else:
                        markdown_body.append(f"\n![{item['type']}]({item['path']})\n")
                
                markdown_body.append("\n---\n") # Page separator

            final_markdown = "\n\n".join(markdown_body)
            
            pdf_info_dict = {"yolo_custom_pipeline": True, "pages_processed": len(doc)}
            self._save_outputs(doc_output_dir, doc_name, final_markdown, pdf_info_dict)
            
            logger.info(f"Custom DLA: Feature extraction successful for {file_name}")
            
            return {
                "markdown": final_markdown,
                "pdf_info": pdf_info_dict,
                "images_dir": str(images_dir.absolute()),
                "source": "yolo_doclaynet",
            }

        except Exception as e:
            logger.error(f"Custom DLA: Processing failed: {str(e)}", exc_info=True)
            raise


    def _save_outputs(self, doc_output_dir: Path, doc_name: str, markdown: str, pdf_info: dict):
        """Save markdown and JSON outputs for debugging."""
        md_path = doc_output_dir / f"{doc_name}.md"
        md_path.write_text(markdown, encoding="utf-8")

        json_path = doc_output_dir / f"{doc_name}_info.json"
        json_path.write_text(
            json.dumps(pdf_info, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
