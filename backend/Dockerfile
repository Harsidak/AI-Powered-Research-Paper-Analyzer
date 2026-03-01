# Use the official Python lightweight image (3.10 for better compatibility with MinerU/PaddlePaddle)
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for PyMuPDF, OpenCV, OCR, and building extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install uv for blazingly fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the dependency files
COPY pyproject.toml .

# Install dependencies using uv (direct into system python for the container)
RUN uv pip install --system --no-cache .

# Copy the rest of the backend codebase
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Command to run the unified ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

