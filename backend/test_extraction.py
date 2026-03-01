import os
import sys
import json

# Disable broken Intel MKL hardware acceleration in PaddlePaddle
os.environ["FLAGS_use_mkldnn"] = "0"
from pathlib import Path

# Add the backend to the python path so we can import the service
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.services.mineru_extractor import MinerUExtractor

def test_mineru():
    print("Testing MinerU Extraction Pipeline...")
    
    # Check if a sample PDF exists in the data folder, otherwise find one or warn the user.
    sample_pdf = backend_dir.parent / "data" / "sample.pdf"
    
    # If there is no exact sample, just grab the first PDF we can find in the data folder.
    if not sample_pdf.exists():
        pdf_dir = backend_dir.parent / "data"
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
        print("✅ Extraction Complete!")
        print(f"Output saved to: {result['output_dir']}")
        
        # Calculate some rapid stats
        elements = result.get('structured_elements', [])
        
        # Tally the different visual layout features
        stats = {}
        for block in elements:
            etype = block.get('type', 'unknown')
            stats[etype] = stats.get(etype, 0) + 1
            
        print("\n📊 Extracted Elements Breakdown:")
        for k, v in stats.items():
            print(f"   • {k}: {v}")
            
    except Exception as e:
        print(f"❌ Extraction failed: {e}")

if __name__ == "__main__":
    test_mineru()
