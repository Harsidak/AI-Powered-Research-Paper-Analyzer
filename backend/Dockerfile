# ── Stage: Base ──────────────────────────────────────────────────────────────
# We use the official PyTorch image which already includes C++ compilers and core math libraries
FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLAGS_use_mkldnn=0
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# ── Stage: System Dependencies ───────────────────────────────────────────────
# Only install the absolute minimum required for OpenCV (MinerU vision)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── Stage: Package Manager (The 'uv' Upgrade) ────────────────────────────────
# Pull the lightning-fast uv package manager directly from the official source
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# ── Stage: Dependencies (Cached Layer) ───────────────────────────────────────
COPY requirements.txt ./

# Use uv to install. We force the CPU index for PyTorch to prevent 4GB CUDA bloat crashes
# --system tells uv to install into the Docker container's global Python environment
RUN uv pip install --system --no-cache -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

# ── Stage: Application Code ──────────────────────────────────────────────────
COPY . .

RUN mkdir -p /app/data/temp_files /app/test_output

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]