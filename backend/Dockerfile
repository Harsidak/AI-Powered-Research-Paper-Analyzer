# ── Stage: Base ──────────────────────────────────────────────────────────────
# Python 3.10 slim for MinerU/PaddlePaddle compatibility
FROM python:3.10-slim AS base

# Prevent .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# PaddlePaddle fixes
ENV FLAGS_use_mkldnn=0
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# ── Stage: System Dependencies ───────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Stage: UV Package Manager ────────────────────────────────────────────────
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# ── Stage: Dependencies (cached layer) ───────────────────────────────────────
# Copy only dependency files first for better Docker layer caching
COPY pyproject.toml uv.lock* ./

# Install all Python dependencies into the system Python
RUN uv pip install --system --no-cache .

# ── Stage: Application Code ──────────────────────────────────────────────────
COPY . .

# Create directories for runtime data
RUN mkdir -p /app/data/temp_files /app/test_output

# Expose the FastAPI port
EXPOSE 8000

# Default: run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
