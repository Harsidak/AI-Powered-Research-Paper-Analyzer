#!/usr/bin/env python3
"""
test_full_pipeline.py — Robust MinerU + LangExtract Integration Test
=====================================================================
Runs both engines against a sample PDF and saves all intermediate and final
results to test_output/ for manual inspection.

Usage:
    cd backend
    uv run python test_full_pipeline.py
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pipeline_test")

# ── Load .env ────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

# ── Imports (after env is loaded) ────────────────────────────────────────────
from app.services.mineru_extractor import MinerUExtractor
from app.services.lang_extract_engine import run_lang_extract_pipeline
from app.services.statistical_engine import statistical_compute

# ── Paths (anchored to script location) ──────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
SAMPLE_PDF   = (SCRIPT_DIR / ".." / "data" / "Shazad.pdf").resolve()
OUTPUT_DIR   = SCRIPT_DIR / "test_output"
RESULTS_DIR  = OUTPUT_DIR / "pipeline_results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def save_json(data: dict, filename: str):
    """Helper to save a dict as pretty-printed JSON."""
    path = RESULTS_DIR / filename
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    logger.info(f"  ✓ Saved → {path}")
    return path


def save_text(text: str, filename: str):
    """Helper to save a string as a text/markdown file."""
    path = RESULTS_DIR / filename
    path.write_text(text, encoding="utf-8")
    logger.info(f"  ✓ Saved → {path}")
    return path


def test_mineru(pdf_path: Path) -> dict:
    """Phase 1: Run MinerU Vision Parser and save all outputs."""
    logger.info("=" * 60)
    logger.info("PHASE 1 — MinerU (Vision Parser)")
    logger.info("=" * 60)

    t0 = time.time()
    extractor = MinerUExtractor(output_dir=str(OUTPUT_DIR))
    result = extractor.extract_document(file_path=str(pdf_path))
    elapsed = round(time.time() - t0, 2)

    markdown_text = result["markdown"]
    pdf_info      = result.get("pdf_info", {})

    # Determine if we got real or mock data
    is_mock = "high-fidelity mock" in markdown_text.lower() or "mock result" in markdown_text.lower()
    source_label = "MOCK (DLL fallback)" if is_mock else "REAL MinerU"

    logger.info(f"  Source     : {source_label}")
    logger.info(f"  Chars      : {len(markdown_text)}")
    logger.info(f"  Pages      : {len(pdf_info.get('pdf_info', []))}")
    logger.info(f"  Time       : {elapsed}s")

    # Save outputs
    save_text(markdown_text, "01_mineru_extracted.md")
    save_json(pdf_info, "01_mineru_pdf_info.json")
    save_json({
        "source": source_label,
        "chars_extracted": len(markdown_text),
        "pages": len(pdf_info.get("pdf_info", [])),
        "elapsed_seconds": elapsed,
        "images_dir": result.get("images_dir", ""),
    }, "01_mineru_summary.json")

    return result


def test_langextract(markdown_text: str) -> object:
    """Phase 2: Run LangExtract (Gemini LLM → Pydantic Schema) and save all outputs."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("PHASE 2 — LangExtract (LLM Schema Enforcement)")
    logger.info("=" * 60)

    t0 = time.time()
    structured_data = run_lang_extract_pipeline(clean_text=markdown_text)
    elapsed = round(time.time() - t0, 2)

    # Convert to JSON for saving
    raw_dump = structured_data.model_dump()

    # Extract key fields for summary
    title          = structured_data.metadata.title
    authors        = [a.name for a in structured_data.metadata.authors]
    year           = structured_data.metadata.publication_year
    abstract       = structured_data.metadata.abstract
    methodologies  = raw_dump.get("methodologies", [])
    limitations    = raw_dump.get("limitations", [])
    contradictions = raw_dump.get("contradictions", [])

    logger.info(f"  Title             : {title}")
    logger.info(f"  Authors           : {', '.join(authors) if authors else 'N/A'}")
    logger.info(f"  Year              : {year or 'N/A'}")
    logger.info(f"  Methodologies     : {len(methodologies)}")
    logger.info(f"  Limitations       : {len(limitations)}")
    logger.info(f"  Contradictions    : {len(contradictions)}")
    logger.info(f"  Time              : {elapsed}s")

    # Save outputs
    save_json(raw_dump, "02_langextract_full_output.json")
    save_json({
        "title": title,
        "authors": authors,
        "publication_year": year,
        "abstract_preview": abstract[:200] + "..." if len(abstract) > 200 else abstract,
        "methodology_count": len(methodologies),
        "limitation_count": len(limitations),
        "contradiction_count": len(contradictions),
        "elapsed_seconds": elapsed,
    }, "02_langextract_summary.json")

    # Save a human-readable report
    report_lines = [
        f"# LangExtract Report",
        f"**Generated**: {datetime.now().isoformat()}",
        f"",
        f"## Metadata",
        f"- **Title**: {title}",
        f"- **Authors**: {', '.join(authors) if authors else 'N/A'}",
        f"- **Year**: {year or 'N/A'}",
        f"",
        f"## Abstract",
        abstract,
        f"",
        f"## Methodologies ({len(methodologies)})",
    ]
    for i, m in enumerate(methodologies, 1):
        report_lines.append(f"### Methodology {i}")
        report_lines.append(f"- **Datasets**: {', '.join(m.get('datasets', []))}")
        report_lines.append(f"- **Base Models**: {', '.join(m.get('base_models', []))}")
        report_lines.append(f"- **Metrics**: {', '.join(m.get('metrics', []))}")
        report_lines.append(f"- **Optimization**: {m.get('optimization', 'N/A')}")
        report_lines.append("")

    report_lines.append(f"## Limitations ({len(limitations)})")
    for i, lim in enumerate(limitations, 1):
        report_lines.append(f"{i}. {lim.get('description', 'N/A')}")
        report_lines.append(f"   > *\"{lim.get('source_context', '')}\"*")
        report_lines.append("")

    report_lines.append(f"## Contradictions ({len(contradictions)})")
    for i, c in enumerate(contradictions, 1):
        report_lines.append(f"{i}. **Claim**: {c.get('claim', '')}")
        report_lines.append(f"   **Opposing**: {c.get('opposing_claim', '')}")
        report_lines.append(f"   **Confidence**: {c.get('confidence_score', 0)}")
        report_lines.append("")

    save_text("\n".join(report_lines), "02_langextract_report.md")

    return structured_data


def test_statistical(structured_data) -> dict:
    """Phase 3: Run Pandas Statistical Engine and save results."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("PHASE 3 — Statistical Engine (Pandas)")
    logger.info("=" * 60)

    raw_json = structured_data.model_dump()
    df = statistical_compute.format_matrix(raw_json)

    if not df.empty:
        logger.info(f"  Matrix Shape   : {df.shape}")
        logger.info(f"  Columns        : {list(df.columns)}")

        # Save as CSV
        csv_path = RESULTS_DIR / "03_methodology_matrix.csv"
        df.to_csv(csv_path, index=False)
        logger.info(f"  ✓ Saved → {csv_path}")

        # Save as JSON
        save_json(df.to_dict(orient="records"), "03_methodology_matrix.json")
    else:
        logger.info("  Matrix is empty (no methodologies extracted)")
        save_json({"status": "empty", "reason": "No methodologies in extracted data"}, "03_methodology_matrix.json")

    return {"shape": list(df.shape) if not df.empty else [0, 0]}


def main():
    logger.info("")
    logger.info("╔════════════════════════════════════════════════════════╗")
    logger.info("║   MinerU + LangExtract — Robust Integration Test      ║")
    logger.info("╚════════════════════════════════════════════════════════╝")
    logger.info(f"  PDF         : {SAMPLE_PDF}")
    logger.info(f"  Output Dir  : {RESULTS_DIR}")
    logger.info(f"  Timestamp   : {datetime.now().isoformat()}")
    logger.info("")

    if not SAMPLE_PDF.exists():
        logger.error(f"Sample PDF not found at {SAMPLE_PDF}")
        sys.exit(1)

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set in .env")
        sys.exit(1)

    overall_t0 = time.time()
    all_results = {"timestamp": datetime.now().isoformat(), "pdf": str(SAMPLE_PDF)}

    try:
        # ── Phase 1: MinerU ──────────────────────────────────────────
        mineru_result = test_mineru(SAMPLE_PDF)
        all_results["phase1_mineru"] = "SUCCESS"

        # ── Phase 2: LangExtract ─────────────────────────────────────
        structured = test_langextract(mineru_result["markdown"])
        all_results["phase2_langextract"] = "SUCCESS"

        # ── Phase 3: Statistical Engine ──────────────────────────────
        stats_result = test_statistical(structured)
        all_results["phase3_statistical"] = "SUCCESS"
        all_results["statistical_shape"] = stats_result["shape"]

    except Exception as e:
        logger.error(f"PIPELINE FAILED: {e}", exc_info=True)
        all_results["error"] = str(e)

    total_time = round(time.time() - overall_t0, 2)
    all_results["total_elapsed_seconds"] = total_time

    # ── Final Summary ────────────────────────────────────────────────
    save_json(all_results, "00_test_summary.json")

    logger.info("")
    logger.info("╔════════════════════════════════════════════════════════╗")
    logger.info("║                  TEST COMPLETE                        ║")
    logger.info("╚════════════════════════════════════════════════════════╝")
    logger.info(f"  Total Time  : {total_time}s")
    logger.info(f"  Results at  : {RESULTS_DIR}")
    logger.info("")
    logger.info("  Files created:")
    for f in sorted(RESULTS_DIR.iterdir()):
        size = f.stat().st_size
        logger.info(f"    {f.name:45s}  {size:>8,} bytes")


if __name__ == "__main__":
    main()
