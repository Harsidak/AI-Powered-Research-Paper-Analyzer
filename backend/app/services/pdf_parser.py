import logging
import fitz # PyMuPDF Fallback

logger = logging.getLogger(__name__)

def parse_pdf_document(file_path: str) -> str:
    """
    Core function for extracting text while attempting to respect Layout.
    In a full production environment, this function wraps MinerU or PDF-Extract-Kit.
    For this deterministic implementation, we use PyMuPDF's layout-aware parsing as the fallback.
    
    Args:
        file_path (str): The path to the PDF file on disk.
        
    Returns:
        str: The clean, layout-preserved extracted text.
    """
    logger.info(f"Starting multi-modal extraction for: {file_path}")
    
    extracted_text = ""
    try:
        # Open the PDF Document
        pdf_document = fitz.open(file_path)
        
        # Iterate over pages and extract text blocks
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            
            # Using 'blocks' maintains the visual reading order better than raw text scraping
            # It helps mitigate issues with two-column academic formats.
            blocks = page.get_text("blocks")
            
            # Sort blocks by vertical position, then horizontal to approximate reading order
            # blocks format: (x0, y0, x1, y1, "lines in block", block_no, block_type)
            blocks.sort(key=lambda b: (b[1], b[0]))
            
            for b in blocks:
                # Type 0 is text. Ignore images (type 1) for this specific text-only fallback
                if b[6] == 0: 
                    extracted_text += b[4] + "\n"
                    
            extracted_text += "\n--- PAGE BREAK ---\n"
            
        pdf_document.close()
        logger.info(f"Successfully extracted {len(extracted_text)} characters.")
        
        return extracted_text

    except Exception as e:
        logger.error(f"Failed to parse PDF {file_path}: {e}")
        # In the pipeline, if the fallback vision parser entirely fails, we must hard-fail the task
        raise ValueError("Multi-modal extraction pipeline failed natively.")
