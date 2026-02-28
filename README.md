# AI-Powered Research Paper Analyzer

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

## Problem
Academic researchers often face an overwhelmingly complex literature landscape. Identifying research gaps and parsing complex PDF layouts (which contain two-column text, intricate tables, and raw mathematical equations) is highly manual and time-consuming. Traditional RAG systems fail when parsing structured academic papers because they treat documents as mere blobs of text, resulting in hallucinatory outputs and poor analytical reasoning when trying to connect distinct methodologies.

## Solution
This project provides a sophisticated, deterministic LLM pipeline designed specifically for academic literature. It processes documents through a highly specific extraction and analysis architecture:
1. **Multi-Modal Vision Parsing**: Accurately maps physical document geometry using LayoutLMv3/YOLOv8 to appropriately ingest two-column texts, tables, and mathematically transform equations to LaTeX natively.
2. **Dual-Engine Analytics**: Uniquely splits the extracted schemas. A Statistical Engine runs complex mathematical computations (Trend & Saturation Analysis, Methodology Matrix) using Pandas, while a Relational Engine builds a highly interconnected, traversable Knowledge Graph (NetworkX/LanceDB) powered by the Cognee framework.

## Impact
By systematically digesting and vectorizing papers conceptually, researchers save hundreds of hours on literature reviews. The architecture guarantees mathematically sound source grounding, dramatically reducing LLM hallucination. Users can effortlessly spot critical "Contradictions" in the field and rapidly unearth new research avenues through the dynamic "Gap Radar", completely transforming the pace of academic innovation and discovery.

## Features
- **Deterministic GraphRAG Extraction**: Creates deterministic knowledge graphs where an LLM explicitly maps structural "Triplets" *(e.g., `Author -> CITES -> Paper -> USES -> Metric`)*.
- **Dual-Engine Analytics**: Computes strict mathematical operations via Pandas (Statistical) and maps semantic memory via Cognee (Relational).
- **Nuemorphic Copilot UI**: A visually stunning, strictly typed React dashboard built with TailwindCSS that features a seamlessly integrated CopilotKit AI Assistant.
- **Ingestion Security Shield**: Byte-level middleware validating uploads against DRM or corruption via PyMuPDF.
- **Continuous Async Orchestration**: Non-blocking extraction workflows scaled efficiently via a Celery worker pool and a Redis message broker.

## Tech Stack
- **Frontend**: React (Vite, TypeScript), TailwindCSS (Nuemorphic constraints), CopilotKit, React Query, Lucide-React.
- **Backend Application**: Python 3.11, FastAPI, Pydantic V2, Uvicorn.
- **Message Broker & Queues**: Celery, Redis.
- **Data Layer**: PostgreSQL, LanceDB, NetworkX.
- **AI/ML Pipeline**: Cognee, LangExtract, PyMuPDF, Pandas, NumPy.
- **Infrastructure**: Docker Compose, `uv` (Ultra-fast Rust-based Python package resolver).

## Setup Instructions

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Running)
*   [Node.js](https://nodejs.org/) (v18+)

### 1. The One-Click Launch (Docker) 
The recommended pathway. Instantly launches the deeply isolated service layers (PostgreSQL, Redis, FastAPI, Celery Workers).

```bash
# Clone the repository
git clone https://github.com/your-org/research-paper-analyzer.git
cd research-paper-analyzer

# Boot the isolated backend containers in the background
docker compose up -d
```

### 2. Booting the Dashboard (Frontend)
Run the React Development server to access the Nuemorphic interface.

```bash
cd frontend
npm install
npm run dev
```

The system will connect automatically, accessible at `http://localhost:5173`. 

### Local Backend Verification (Without Docker)
If you require direct Python manipulation, ensure you utilize the `uv` toolchain for deterministic package resolution.

```bash
cd backend
# If uv is not installed: curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv .venv
# Activate venv depending on your OS (e.g., .\.venv\Scripts\activate on Windows)
uv pip install -r requirements.txt
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## License
This project is licensed under the Apache License 2.0.