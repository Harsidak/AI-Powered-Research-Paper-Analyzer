import fitz  # PyMuPDF
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def validate_pdf(file_bytes: bytes) -> Tuple[bool, str]:
    """
    The Safety Shield: Defends against malformed, malicious, or DRM-locked files.
    Opens the byte stream utilizing PyMuPDF to parse fundamental object streams.
    
    Args:
        file_bytes (bytes): The raw PDF byte stream uploaded by the client.
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message). True if valid.
    """
    try:
        # Open PDF from memory stream
        pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
        
        # 1. Check if the Document is Encrypted/DRM-Locked
        if pdf_document.is_encrypted:
            pdf_document.close()
            return False, "File is DRM protected or encrypted. Please remove password protection."
            
        # 2. Check for fundamentally broken pages / zero content
        if pdf_document.page_count == 0:
            pdf_document.close()
            return False, "File contains zero valid pages."
            
        # 3. Check for specific markers of malformed inputs (basic check)
        # Verify that we can at least load the first page without an aggressive exception.
        try:
            first_page = pdf_document.load_page(0)
            if not first_page:
                pdf_document.close()
                return False, "Failed to initialize page object stream."
        except Exception as e:
            pdf_document.close()
            logger.warning(f"Error loading first page of PDF: {e}")
            return False, "File layout is critically malformed."
            
        pdf_document.close()
        return True, "Valid PDF"
        
    except fitz.FileDataError as e:
        logger.warning(f"PyMuPDF FileDataError: {e}")
        return False, "The file does not appear to be a valid PDF format."
    except Exception as e:
        logger.error(f"Unexpected error during PDF validation: {e}")
        return False, "An internal error occurred while inspecting the file structure."
