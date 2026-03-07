# ══════════════════════════════════════════════════════════════════════════════
# Backend Dockerfile — AI-Powered Research Paper Analyzer
# Uses: Custom YOLO DLA + LangExtract + Pandas + Cognee
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Base ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ── Stage 2: System Dependencies ─────────────────────────────────────────────
# OpenCV headless needs libgl1, PyMuPDF needs libmupdf, ultralytics needs libglib
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Stage 3: Python Dependencies (Cached Layer) ─────────────────────────────
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 4: Application Code ───────────────────────────────────────────────
COPY . .

# Create data directories for temp files and YOLO model cache
RUN mkdir -p /app/data/temp_files /app/data/yolo_output

# Pre-download the YOLOv8 DocLayNet model so it's cached in the image
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null || true

EXPOSE 8000

# Health check for Docker Compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/swagger || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]