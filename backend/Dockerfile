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

WORKDIR /app

# ── Stage: Dependencies (Cached Layer) ───────────────────────────────────────
COPY requirements.txt ./

# Use pip to install.
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage: Application Code ──────────────────────────────────────────────────
COPY . .

RUN mkdir -p /app/data/temp_files /app/test_output

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]