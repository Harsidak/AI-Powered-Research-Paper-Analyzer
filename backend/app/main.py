from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import json
from datetime import datetime, timezone

from app.core.security.pdf_validator import validate_pdf
from app.services.mineru_extractor import MinerUExtractor
from app.services.lang_extract_engine import run_lang_extract_pipeline
from app.services.statistical_engine import statistical_compute
from app.services.relational_engine import relational_builder
import uuid
import os

# Configure logging for global exception routing
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize database tables (graceful — won't crash if Postgres is down)
try:
    from app.core.database import init_db
    init_db()
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.warning(f"Database unavailable (local mode): {e}")

app = FastAPI(
    title="AI-Powered Research Paper Analyzer",
    description="Deterministic GraphRAG LLM Pipeline API",
    version="1.0.0",
    docs_url="/swagger"
)

# CORS Configuration for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount CopilotKit (graceful — won't crash if dependency is broken)
try:
    from app.api.v1.copilot_router import copilotkit_sdk
    from copilotkit.integrations.fastapi import add_fastapi_endpoint
    add_fastapi_endpoint(app, copilotkit_sdk, "/api/v1/copilotkit")
except Exception as e:
    logger.warning(f"CopilotKit unavailable: {e}")

# Register Analytics Endpoints (graceful)
try:
    from app.api.v1.endpoints.analytics import router as analytics_router
    app.include_router(analytics_router, prefix="/api/v1")
except Exception as e:
    logger.warning(f"Analytics router unavailable: {e}")

TEMP_DIR = "/app/data/temp_files/"
DATA_DIR = "/app/data/"
if not os.path.exists("/app/data"):
    TEMP_DIR = "./data/temp_files/"
    DATA_DIR = "./data/"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

# ─── In-memory store for the last analysis (local dev) ───────────────────────
_last_analysis: Dict[str, Any] = {}


# ─── JSON File-Based History Store ───────────────────────────────────────────
def _load_history() -> List[Dict[str, Any]]:
    """Load all history entries from the JSON file."""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        logger.warning("History file corrupted, starting fresh.")
        return []


def _save_history(entries: List[Dict[str, Any]]):
    """Persist the full history list to disk."""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, default=str)


def _save_to_history(analysis_id: str, filename: str, result: Dict[str, Any]):
    """Append a new analysis result to history."""
    entry = {
        "id": analysis_id,
        "filename": filename,
        "title": result.get("extracted_data", {}).get("metadata", {}).get("title", "Untitled"),
        "authors": [a.get("name", "") for a in result.get("extracted_data", {}).get("metadata", {}).get("authors", [])],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "pipeline": result.get("pipeline", {}),
        "extracted_data": result.get("extracted_data", {}),
    }
    history = _load_history()
    history.insert(0, entry)  # newest first
    _save_history(history)
    logger.info(f"Saved analysis '{entry['title']}' to history (ID: {analysis_id})")

# ═════════════════════════════════════════════════════════════════════════════
# ROUTE 1: Upload & Analyze (Synchronous — local dev)
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/upload", status_code=status.HTTP_200_OK)
async def upload_and_analyze(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Full synchronous pipeline: Upload PDF → YOLO DLA → LangExtract → Pandas → Cognee.
    Returns the complete ExtractedInsights JSON for the frontend dashboard.
    """
    global _last_analysis

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={"error": "invalid_format", "message": "Only PDF files are supported"}
        )

    MAX_FILE_SIZE = 50 * 1024 * 1024
    try:
        file_bytes = await file.read(MAX_FILE_SIZE + 1)
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": "file_too_large", "message": "File size exceeds the 50MB limit."}
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading file bytes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "read_failure", "message": "Failed to read file payload"}
        )

    # Safety Shield
    is_valid, validation_msg = validate_pdf(file_bytes)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "validation_failed", "message": validation_msg}
        )

    temp_file_path = os.path.join(TEMP_DIR, f"sync_{uuid.uuid4()}.pdf")
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.error(f"Failed to write file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "write_failure", "message": "Failed to persist file to disk"}
        )

    try:
        # 1. Custom YOLO DLA Extraction
        logger.info(f"Starting YOLO DLA extraction for {temp_file_path}")
        extractor = MinerUExtractor()
        mineru_result = extractor.extract_document(file_path=temp_file_path)
        extracted_text = mineru_result["markdown"]

        # 2. LangExtract Pydantic Schema Enforcement
        logger.info("Executing LangExtract pipeline...")
        structured_data = run_lang_extract_pipeline(clean_text=extracted_text)
        paper_title = structured_data.metadata.title
        raw_json = structured_data.model_dump()

        # 3. Statistical Engine (Pandas)
        logger.info("Computing matrix trends...")
        df = statistical_compute.format_matrix(raw_json)
        matrix_shape = list(df.shape) if not df.empty else [0, 0]

        # 4. Cognee GraphRAG (non-blocking — failure doesn't crash pipeline)
        logger.info("Running Cognee ECL Pipeline...")
        cognee_success = False
        try:
            cognee_success = await relational_builder.build_knowledge_graph(
                raw_text=extracted_text,
                document_title=paper_title or "Unknown Document"
            )
        except Exception as cognee_err:
            logger.warning(f"Cognee skipped: {cognee_err}")

        # Store in memory for MathBot chat context
        _last_analysis = {
            "extracted_text": extracted_text[:8000],
            "paper_title": paper_title,
            "raw_json": raw_json,
        }

        analysis_id = str(uuid.uuid4())
        response_payload = {
            "status": "success",
            "message": "Pipeline executed successfully",
            "id": analysis_id,
            "pipeline": {
                "chars_extracted": len(extracted_text),
                "matrix_shape": matrix_shape,
                "cognee_success": cognee_success,
            },
            "extracted_data": raw_json
        }

        # Auto-save to persistent history
        _save_to_history(analysis_id, file.filename or "unknown.pdf", response_payload)

        return response_payload
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "pipeline_failure", "message": str(e)}
        )
    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Cleaned up: {temp_file_path}")
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {cleanup_error}")


# ═════════════════════════════════════════════════════════════════════════════
# ROUTE 2: MathBot Chat (Gemini-powered research assistant)
# ═════════════════════════════════════════════════════════════════════════════
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_with_mathbot(req: ChatRequest):
    """
    MathBot AI assistant — answers research questions using paper context.
    Uses Gemini via LangChain for grounded, deterministic responses.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")

    # Build context from last analysis or from request
    paper_context = req.context or ""
    if not paper_context and _last_analysis:
        paper_context = f"Paper: {_last_analysis.get('paper_title', 'Unknown')}\n\n{_last_analysis.get('extracted_text', '')}"

    system_prompt = f"""You are MathBot, the Researcher Co-Pilot AI assistant for the AI-Powered Research Paper Analyzer.
You answer questions about uploaded research papers using the extracted data below.
Be precise, cite specific methodologies/datasets/limitations from the paper.
If the question is beyond the paper's scope, say so honestly.

PAPER CONTEXT:
{paper_context[:6000]}
"""

    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.3,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=req.message),
        ]

        response = llm.invoke(messages)
        return ChatResponse(reply=response.content)

    except Exception as e:
        logger.error(f"MathBot error: {e}")
        raise HTTPException(status_code=500, detail=f"MathBot failed: {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# ROUTE 3: Export to LaTeX / Markdown
# ═════════════════════════════════════════════════════════════════════════════
class ExportRequest(BaseModel):
    format: str = "latex"  # "latex" or "markdown"
    extracted_data: Dict[str, Any]

@app.post("/api/v1/export")
async def export_document(req: ExportRequest):
    """
    Generates a LaTeX or Markdown template from the ExtractedInsights data.
    Returns the raw text content as a downloadable file.
    """
    data = req.extracted_data
    metadata = data.get("metadata", {})
    methodologies = data.get("methodologies", [])
    limitations = data.get("limitations", [])
    contradictions = data.get("contradictions", [])

    title = metadata.get("title", "Untitled Paper")
    authors = ", ".join([a.get("name", "") for a in metadata.get("authors", [])])
    abstract = metadata.get("abstract", "")
    year = metadata.get("publication_year", "N/A")

    if req.format == "latex":
        lines = [
            r"\documentclass{article}",
            r"\usepackage[utf8]{inputenc}",
            r"\usepackage{booktabs}",
            r"\usepackage{geometry}",
            r"\geometry{margin=1in}",
            "",
            rf"\title{{{_escape_latex(title)}}}",
            rf"\author{{{_escape_latex(authors)}}}",
            rf"\date{{{year}}}",
            "",
            r"\begin{document}",
            r"\maketitle",
            "",
            r"\begin{abstract}",
            _escape_latex(abstract),
            r"\end{abstract}",
            "",
            r"\section{Methodology Matrix}",
        ]

        for i, m in enumerate(methodologies):
            lines.append(rf"\subsection{{Methodology {i+1}}}")
            lines.append(r"\begin{itemize}")
            lines.append(rf"  \item \textbf{{Datasets}}: {_escape_latex(', '.join(m.get('datasets', [])))}")
            lines.append(rf"  \item \textbf{{Base Models}}: {_escape_latex(', '.join(m.get('base_models', [])))}")
            lines.append(rf"  \item \textbf{{Metrics}}: {_escape_latex(', '.join(m.get('metrics', [])))}")
            lines.append(rf"  \item \textbf{{Optimization}}: {_escape_latex(m.get('optimization', 'N/A'))}")
            lines.append(r"\end{itemize}")
            lines.append("")

        if limitations:
            lines.append(r"\section{Research Gaps \& Limitations}")
            lines.append(r"\begin{enumerate}")
            for lim in limitations:
                lines.append(rf"  \item {_escape_latex(lim.get('description', ''))} \textit{{(p. {lim.get('page_number', '?')})}}")
            lines.append(r"\end{enumerate}")
            lines.append("")

        if contradictions:
            lines.append(r"\section{Contradictions}")
            lines.append(r"\begin{enumerate}")
            for c in contradictions:
                lines.append(rf"  \item \textbf{{Claim}}: {_escape_latex(c.get('claim', ''))}")
                lines.append(rf"        \textbf{{Opposing}}: {_escape_latex(c.get('opposing_claim', ''))}")
                lines.append(rf"        (Confidence: {c.get('confidence_score', 0):.0%})")
            lines.append(r"\end{enumerate}")

        lines.append("")
        lines.append(r"\end{document}")

        content = "\n".join(lines)
        return PlainTextResponse(content, media_type="application/x-latex",
                                 headers={"Content-Disposition": "attachment; filename=analysis.tex"})

    else:  # markdown
        lines = [
            f"# {title}",
            f"**Authors**: {authors}",
            f"**Year**: {year}",
            "",
            "## Abstract",
            abstract,
            "",
            "## Methodology Matrix",
        ]

        for i, m in enumerate(methodologies):
            lines.append(f"### Methodology {i+1}")
            lines.append(f"- **Datasets**: {', '.join(m.get('datasets', []))}")
            lines.append(f"- **Base Models**: {', '.join(m.get('base_models', []))}")
            lines.append(f"- **Metrics**: {', '.join(m.get('metrics', []))}")
            lines.append(f"- **Optimization**: {m.get('optimization', 'N/A')}")
            lines.append("")

        if limitations:
            lines.append("## Research Gaps & Limitations")
            for i, lim in enumerate(limitations):
                lines.append(f"{i+1}. {lim.get('description', '')} *(p. {lim.get('page_number', '?')})*")
            lines.append("")

        if contradictions:
            lines.append("## Contradictions")
            for i, c in enumerate(contradictions):
                lines.append(f"{i+1}. **Claim**: {c.get('claim', '')}")
                lines.append(f"   **Opposing**: {c.get('opposing_claim', '')}")
                lines.append(f"   Confidence: {c.get('confidence_score', 0):.0%}")
            lines.append("")

        content = "\n".join(lines)
        return PlainTextResponse(content, media_type="text/markdown",
                                 headers={"Content-Disposition": "attachment; filename=analysis.md"})


def _escape_latex(text: str) -> str:
    """Escape special LaTeX characters."""
    if not text:
        return ""
    replacements = {
        '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
        '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text


# ═════════════════════════════════════════════════════════════════════════════
# ROUTE 4: Analysis History
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/v1/history")
async def list_history():
    """Return all past analyses (newest first), with lightweight summaries."""
    history = _load_history()
    # Return summaries without the full extracted_data to keep responses fast
    summaries = []
    for entry in history:
        summaries.append({
            "id": entry["id"],
            "filename": entry.get("filename", "unknown.pdf"),
            "title": entry.get("title", "Untitled"),
            "authors": entry.get("authors", []),
            "analyzed_at": entry.get("analyzed_at", ""),
            "pipeline": entry.get("pipeline", {}),
        })
    return {"history": summaries, "total": len(summaries)}


@app.get("/api/v1/history/{analysis_id}")
async def get_history_entry(analysis_id: str):
    """Retrieve the full analysis data for a specific history entry."""
    history = _load_history()
    for entry in history:
        if entry["id"] == analysis_id:
            return {
                "status": "success",
                "id": entry["id"],
                "filename": entry.get("filename", "unknown.pdf"),
                "analyzed_at": entry.get("analyzed_at", ""),
                "pipeline": entry.get("pipeline", {}),
                "extracted_data": entry.get("extracted_data", {}),
            }
    raise HTTPException(status_code=404, detail="Analysis not found")


@app.delete("/api/v1/history/{analysis_id}")
async def delete_history_entry(analysis_id: str):
    """Delete a specific history entry."""
    history = _load_history()
    new_history = [e for e in history if e["id"] != analysis_id]
    if len(new_history) == len(history):
        raise HTTPException(status_code=404, detail="Analysis not found")
    _save_history(new_history)
    return {"status": "deleted", "id": analysis_id}


# ═════════════════════════════════════════════════════════════════════════════
# Global Exception Handler
# ═════════════════════════════════════════════════════════════════════════════
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Fallback handler to prevent unstructured server crashes."""
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return {"error": "internal_error", "message": "An unexpected server error occurred."}, 500
