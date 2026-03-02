import os
import json
import logging
from pathlib import Path
from typing import Any

# --- PaddlePaddle OneDNN fix (must be set BEFORE paddle is imported) ---
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

logger = logging.getLogger(__name__)


class MinerUExtractor:
    def __init__(self, output_dir: str = "test_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._md_generator = None

    def extract_document(self, file_path: str) -> dict:
        """
        Extracts document structure (text, equations, tables) using MinerU's optical parsing.
        Falls back to PyMuPDF-based extraction if MinerU's full pipeline is unavailable.

        Returns a dict with keys:
            - markdown: The full linearized Markdown string
            - pdf_info: The raw pdf_info_dict from MinerU (or structured page data)
            - images_dir: Path to the directory containing extracted images
        """
        file_path_obj = Path(file_path).resolve()
        if not file_path_obj.exists():
            raise FileNotFoundError(f"PDF not found at {file_path}")

        file_name = file_path_obj.name
        doc_name = file_name.replace(".pdf", "")
        doc_output_dir = self.output_dir / doc_name
        images_dir = doc_output_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        try:
            # ── Attempt 1: Full MinerU Pipeline (requires PyTorch) ───────
            logger.info(f"MinerU: Attempting full pipeline for {file_name}...")
            try:
                from magic_pdf.data.data_reader_writer import FileBasedDataWriter
                from magic_pdf.data.dataset import PymuDocDataset
                from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
                from app.services.markdown_generator import MarkdownGenerator

                if not self._md_generator:
                    self._md_generator = MarkdownGenerator()

                pdf_bytes = file_path_obj.read_bytes()
                dataset = PymuDocDataset(pdf_bytes)
                image_writer = FileBasedDataWriter(str(images_dir))
                inference_result = doc_analyze(dataset)
                pipe_result = inference_result.pipe_txt_mode(image_writer)
                pdf_info_dict = json.loads(pipe_result.get_middle_json())
                markdown_content = self._md_generator.generate(pdf_info_dict)

                self._save_outputs(doc_output_dir, doc_name, markdown_content, pdf_info_dict)
                logger.info(f"MinerU: Full pipeline extraction complete for {file_name}.")

                return {
                    "markdown": markdown_content,
                    "pdf_info": pdf_info_dict,
                    "images_dir": str(images_dir),
                    "source": "mineru_full",
                }

            except (ImportError, OSError) as e:
                logger.warning(f"MinerU: Full pipeline unavailable ({type(e).__name__}: {e})")
                logger.info("MinerU: Falling back to PyMuPDF text extraction...")

            # ── Attempt 2: PyMuPDF Direct Extraction (no PyTorch needed) ─
            return self._extract_with_pymupdf(file_path_obj, doc_output_dir, doc_name, images_dir)

        except Exception as e:
            logger.error(f"MinerU: All extraction paths failed: {str(e)}", exc_info=True)
            raise

    def _extract_with_pymupdf(self, file_path: Path, doc_output_dir: Path, doc_name: str, images_dir: Path) -> dict:
        """
        Real PDF extraction using PyMuPDF (fitz). Extracts text, images, and 
        structures them into markdown — no PyTorch required.
        """
        import fitz  # pymupdf

        doc = fitz.open(str(file_path))
        total_pages = len(doc)
        logger.info(f"MinerU (PyMuPDF): Opened {file_path.name} — {total_pages} pages")

        md_lines = [f"# {file_path.stem}\n"]
        pdf_info_pages = []
        image_count = 0

        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text("text")

            if not text.strip():
                continue

            # ── Extract images from this page ────────────────────────────
            image_list = page.get_images(full=True)
            for img_idx, img_info in enumerate(image_list):
                try:
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    if base_image:
                        img_ext = base_image.get("ext", "png")
                        img_data = base_image["image"]
                        img_name = f"page{page_num + 1}_img{img_idx + 1}.{img_ext}"
                        img_path = images_dir / img_name
                        img_path.write_bytes(img_data)
                        image_count += 1
                except Exception:
                    pass  # Skip problematic images

            # ── Build markdown for this page ──────────────────────────────
            # Simple heuristic: first line is often a heading/section title
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if lines:
                # Check if first line looks like a section heading (short, no period)
                first_line = lines[0]
                if len(first_line) < 80 and not first_line.endswith("."):
                    md_lines.append(f"\n## {first_line}\n")
                    body = "\n".join(lines[1:])
                else:
                    body = "\n".join(lines)

                md_lines.append(body)
                md_lines.append("")  # blank line between pages

            # ── Build pdf_info structure ──────────────────────────────────
            pdf_info_pages.append({
                "page_no": page_num,
                "text": text,
                "char_count": len(text),
                "image_count": len(image_list),
            })

        doc.close()

        markdown_content = "\n".join(md_lines)
        pdf_info_dict = {
            "pdf_info": pdf_info_pages,
            "total_pages": total_pages,
            "total_images": image_count,
            "extraction_method": "pymupdf_direct",
        }

        self._save_outputs(doc_output_dir, doc_name, markdown_content, pdf_info_dict)

        logger.info(f"MinerU (PyMuPDF): Extracted {len(markdown_content)} chars, "
                     f"{total_pages} pages, {image_count} images from {file_path.name}")

        return {
            "markdown": markdown_content,
            "pdf_info": pdf_info_dict,
            "images_dir": str(images_dir),
            "source": "pymupdf_fallback",
        }

    def _save_outputs(self, doc_output_dir: Path, doc_name: str, markdown: str, pdf_info: dict):
        """Save markdown and JSON outputs for debugging."""
        md_path = doc_output_dir / f"{doc_name}.md"
        md_path.write_text(markdown, encoding="utf-8")

        json_path = doc_output_dir / f"{doc_name}_info.json"
        json_path.write_text(
            json.dumps(pdf_info, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
