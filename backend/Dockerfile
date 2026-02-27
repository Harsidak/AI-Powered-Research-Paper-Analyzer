# Use the official Python lightweight image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for PyMuPDF, Pandas, and building extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install uv for blazingly fast, deterministic package resolution
RUN pip install uv

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install dependencies using uv
RUN uv pip install --system -r requirements.txt

# Copy the rest of the backend codebase
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Command to run the unified ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
