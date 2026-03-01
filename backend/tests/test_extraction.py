"""
End-to-end test for the MinerU extraction pipeline.

Usage:
    .venv\Scripts\python.exe test_extraction.py

Requires a PDF in the ../data/ folder (e.g. attention.pdf).
"""
import os
import sys

# Disable broken Intel MKL hardware acceleration in PaddlePaddle
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

from pathlib import Path

# Add the backend to the python path so we can import the service
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.services.mineru_extractor import MinerUExtractor


def test_mineru():
    print("Testing MinerU Extraction Pipeline...")

    # Locate a PDF to test with
    pdf_dir = backend_dir.parent / "data"
    sample_pdf = pdf_dir / "sample.pdf"

    if not sample_pdf.exists():
        pdfs = list(pdf_dir.rglob("*.pdf"))
        if not pdfs:
            print("No PDF files found in the data/ directory to test with.")
            print("Please drop a sample research paper in the 'data' folder and try again.")
            sys.exit(1)
        sample_pdf = pdfs[0]

    print(f"Found test PDF: {sample_pdf.name}")

    output_folder = backend_dir / "test_output"
    output_folder.mkdir(exist_ok=True)
    extractor = MinerUExtractor(output_dir=str(output_folder))

    try:
        result = extractor.extract_document(str(sample_pdf))

        print("\n--- Extraction Complete! ---")
        print(f"  Markdown file : {result['markdown_path']}")
        print(f"  Images dir    : {result['images_dir']}")
        print(f"  Markdown size : {len(result['markdown_content']):,} chars")

        # Count extracted images
        images_dir = Path(result["images_dir"])
        image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
        print(f"  Images found  : {len(image_files)}")

        # Show first 500 chars of markdown as a preview
        print("\n--- Markdown Preview (first 500 chars) ---")
        print(result["markdown_content"][:500])

    except Exception as e:
        print(f"Extraction failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_mineru()
