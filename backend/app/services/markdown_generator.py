"""
Robust Markdown Generator for MinerU v0.6.1 pdf_info output.

Converts MinerU's structured page-level JSON (preproc_blocks + para_blocks)
into a clean, linearized Markdown document with:
  - Heading hierarchy (title → ## by default, or auto-detected)
  - Inline and display-mode LaTeX equations ($...$ and $$...$$)
  - Image references (relative paths to extracted JPEGs)
  - Table placeholders (images of table regions)
  - Correct reading order (already sorted by MinerU's layout engine)
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


# ── Block-type constants (from magic_pdf) ──────────────────────────────────
BLOCK_TITLE = "title"
BLOCK_TEXT  = "text"
BLOCK_IMAGE = "image"
BLOCK_TABLE = "table"

# ── Span-type constants ────────────────────────────────────────────────────
SPAN_TEXT              = "text"
SPAN_INLINE_EQUATION   = "inline_equation"
SPAN_INTERLINE_EQUATION = "interline_equation"
SPAN_IMAGE             = "image"
SPAN_TABLE             = "table"


class MarkdownGenerator:
    """Converts MinerU's ``pdf_info`` dict into a Markdown string."""

    def __init__(self, images_dir: str | Path | None = None):
        """
        Args:
            images_dir: Optional path that extracted images live under.
                        Used to build relative ``![](...)`` links.
        """
        self.images_dir = Path(images_dir) if images_dir else None

    # ── Public API ─────────────────────────────────────────────────────────

    def generate(self, pdf_info_dict: dict[str, Any]) -> str:
        """
        Walk the entire ``pdf_info`` list and emit Markdown page-by-page,
        respecting the reading order computed by MinerU's layout engine.

        Returns:
            A single Markdown string for the whole document.
        """
        pages = pdf_info_dict.get("pdf_info", [])
        md_parts: list[str] = []

        for page_idx, page in enumerate(pages):
            page_md = self._render_page(page, page_idx)
            if page_md.strip():
                md_parts.append(page_md)

        return "\n\n---\n\n".join(md_parts)

    # ── Page-level rendering ───────────────────────────────────────────────

    def _render_page(self, page: dict, page_idx: int) -> str:
        """Render a single page dict into Markdown.

        MinerU exposes two useful block lists:
        * ``para_blocks`` — paragraph-segmented, best for flowing text
        * ``preproc_blocks`` — raw layout blocks before paragraph merge

        We prefer ``para_blocks`` when available because they group logical
        paragraphs together. Fall back to ``preproc_blocks`` otherwise.
        """
        blocks = page.get("para_blocks") or page.get("preproc_blocks", [])
        parts: list[str] = []

        for block in blocks:
            rendered = self._render_block(block)
            if rendered and rendered.strip():
                parts.append(rendered)

        return "\n\n".join(parts)

    # ── Block-level rendering ──────────────────────────────────────────────

    def _render_block(self, block: dict) -> str:
        block_type = block.get("type", "")

        if block_type == BLOCK_TITLE:
            return self._render_title(block)
        elif block_type == BLOCK_TEXT:
            return self._render_text_block(block)
        elif block_type == BLOCK_IMAGE:
            return self._render_image_block(block)
        elif block_type == BLOCK_TABLE:
            return self._render_table_block(block)
        else:
            # Unknown block type — still try to extract any readable spans
            return self._render_text_block(block)

    # ── Title ──────────────────────────────────────────────────────────────

    def _render_title(self, block: dict) -> str:
        text = self._extract_text_from_lines(block.get("lines", []))
        text = text.strip()
        if not text:
            return ""
        # Use ## for section headings (since # is typically the paper title)
        # Heuristic: if short (< 60 chars) and only one line, treat as heading
        if len(text) < 80:
            return f"## {text}"
        return f"**{text}**"

    # ── Text block ─────────────────────────────────────────────────────────

    def _render_text_block(self, block: dict) -> str:
        lines = block.get("lines", [])
        return self._extract_text_from_lines(lines)

    # ── Image block ────────────────────────────────────────────────────────

    def _render_image_block(self, block: dict) -> str:
        """Render an image block (may contain sub-blocks like image_body + image_caption)."""
        sub_blocks = block.get("blocks", [])
        parts: list[str] = []

        image_path: str | None = None
        caption_text = ""

        for sub in sub_blocks:
            sub_type = sub.get("type", "")
            if sub_type == "image_body":
                # Extract the image file path from spans
                for line in sub.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("type") == SPAN_IMAGE and span.get("image_path"):
                            image_path = span["image_path"]
            elif sub_type == "image_caption":
                caption_text = self._extract_text_from_lines(sub.get("lines", []))

        # Fallback: try lines directly on the block
        if not image_path:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if span.get("type") == SPAN_IMAGE and span.get("image_path"):
                        image_path = span["image_path"]

        if image_path:
            alt = caption_text.strip() if caption_text else "Figure"
            parts.append(f"![{alt}]({image_path})")
        if caption_text.strip():
            parts.append(f"*{caption_text.strip()}*")

        return "\n\n".join(parts) if parts else ""

    # ── Table block ────────────────────────────────────────────────────────

    def _render_table_block(self, block: dict) -> str:
        """Tables are captured as images by MinerU. Render as image + caption."""
        sub_blocks = block.get("blocks", [])
        parts: list[str] = []

        table_image: str | None = None
        caption_text = ""

        for sub in sub_blocks:
            sub_type = sub.get("type", "")
            if sub_type in ("table_body", "image_body"):
                for line in sub.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("image_path"):
                            table_image = span["image_path"]
            elif sub_type in ("table_caption", "image_caption"):
                caption_text = self._extract_text_from_lines(sub.get("lines", []))

        # Fallback: direct lines
        if not table_image:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if span.get("image_path"):
                        table_image = span["image_path"]

        if table_image:
            alt = caption_text.strip() if caption_text else "Table"
            parts.append(f"![{alt}]({table_image})")
        if caption_text.strip():
            parts.append(f"*{caption_text.strip()}*")

        return "\n\n".join(parts) if parts else ""

    # ── Span-level text extraction ─────────────────────────────────────────

    def _extract_text_from_lines(self, lines: list[dict]) -> str:
        """Walk lines → spans, concatenate text, and wrap equations in LaTeX delimiters."""
        line_texts: list[str] = []

        for line in lines:
            span_parts: list[str] = []
            for span in line.get("spans", []):
                span_type = span.get("type", SPAN_TEXT)
                content   = span.get("content", "")

                if span_type == SPAN_TEXT:
                    span_parts.append(content)
                elif span_type == SPAN_INLINE_EQUATION:
                    # Wrap in single $ for inline math
                    latex = content.strip()
                    if latex:
                        span_parts.append(f" ${latex}$ ")
                elif span_type == SPAN_INTERLINE_EQUATION:
                    # Wrap in double $$ for display math (on its own line)
                    latex = content.strip()
                    if latex:
                        span_parts.append(f"\n\n$${latex}$$\n\n")
                elif span_type == SPAN_IMAGE:
                    img_path = span.get("image_path", "")
                    if img_path:
                        span_parts.append(f"![Figure]({img_path})")
                elif span_type == SPAN_TABLE:
                    img_path = span.get("image_path", "")
                    if img_path:
                        span_parts.append(f"![Table]({img_path})")
                else:
                    # Unknown span type — just append content if present
                    if content:
                        span_parts.append(content)

            line_text = "".join(span_parts).strip()
            if line_text:
                line_texts.append(line_text)

        # Join lines: collapse consecutive text lines into paragraphs
        return self._join_lines(line_texts)

    def _join_lines(self, lines: list[str]) -> str:
        """Intelligently join text lines into paragraphs.

        Rules:
        - Lines ending with a hyphen → join without space (word continuation)
        - Lines containing display math ($$) → keep separated
        - Otherwise → join with a single space (natural reading flow)
        """
        if not lines:
            return ""

        result_parts: list[str] = []
        for line in lines:
            # If the line is a display equation, keep it isolated
            if line.strip().startswith("$$"):
                result_parts.append(line)
                continue

            # If previous part ended with hyphen, merge (hyphenated word)
            if result_parts and result_parts[-1].endswith("-"):
                result_parts[-1] = result_parts[-1][:-1] + line
            else:
                result_parts.append(line)

        return " ".join(result_parts)


def generate_markdown(pdf_info_dict: dict[str, Any], images_dir: str | None = None) -> str:
    """Convenience function: convert pdf_info_dict → Markdown string."""
    gen = MarkdownGenerator(images_dir=images_dir)
    return gen.generate(pdf_info_dict)
