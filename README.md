# AI-Powered Research Paper Analyzer

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

## Problem
Academic researchers often face an overwhelmingly complex literature landscape. Identifying research gaps and parsing complex PDF layouts (which contain two-column text, intricate tables, and raw mathematical equations) is highly manual and time-consuming. Traditional RAG systems fail when parsing structured academic papers because they treat documents as mere blobs of text, resulting in hallucinatory outputs and poor analytical reasoning when trying to connect distinct methodologies.

## Solution
This project provides a sophisticated, deterministic LLM pipeline designed specifically for academic literature. It processes documents through a highly specific extraction and analysis architecture using multi-modal vision parsing and dual-engine analytics.

---

## 📚 Documentation & Deep Dives
For a comprehensive understanding of the project, please refer to the following detailed documentation:

- **[Features & Capabilities](DOCS/Features.md)**: A deep dive into core functionalities like the "Research Gap" Radar, Contradiction Engine, and Ingestion Security Shield.
- **[System Architecture & Pipeline](DOCS/pipeline.md)**: A 5-stage technical breakdown of the production-level data flow, from upload to deterministic user interaction.
- **[Technology Stack](DOCS/tech_stack.md)**: Detailed overview of the strategically chosen tools for handles robust PDF extraction, asynchronous processing, and AI memory.
- **[Cognify Technical Report](Cognify_Technical_Report.docx)**: The full technical project report (DOCX).

## 🏗️ System Architecture
![System Architecture Diagram](DOCS/Rough%20working.svg)
*Refer to the [Core Execution Pipeline](DOCS/pipeline.md) for a detailed walkthrough of each stage.*

## Key Features
- **Deterministic GraphRAG**: LLM-mapped structural "Triplets" for hallucination-free retrieval.
- **Dual-Engine Analytics**: Statistical (Pandas) and Relational (Cognee) processing paths.
- **Premium Neumorphic UI**: A visually stunning React dashboard with integrated CopilotKit AI.
- **Industrial Security Shield**: Byte-level middleware (PyMuPDF) validating all uploads.
- **Asynchronous Orchestration**: Scalable Celery/Redis worker pool for non-blocking processing.

## Tech Stack Highlights
- **Backend**: FastAPI, Celery, Redis, `uv`, Pydantic V2.
- **Frontend**: React (Vite), TailwindCSS, CopilotKit, React Query.
- **AI/ML**: Cognee (Memory Layer), LangExtract (Structured Extraction), MinerU (Vision Parsing).
- **Data**: PostgreSQL (Metadata), LanceDB (Vectors), NetworkX (Graphs).

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