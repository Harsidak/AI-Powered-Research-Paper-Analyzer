import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# We default to typical Redis Docker ports for local development if not in environment
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize the Celery App
celery_app = Celery(
    "ai_paper_analyzer",
    broker=redis_url,
    backend=redis_url,
    include=["app.services.extraction_worker"]
)

# Optional Configuration for production scaling
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Prevent a single massive PDF extraction from dragging down the worker pool indefinitely
    task_soft_time_limit=1800,  # 30 minutes soft limit
    task_time_limit=2000,       # Hard kill after ~33 minutes
)
