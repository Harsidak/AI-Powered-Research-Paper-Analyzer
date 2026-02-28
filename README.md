# AI-Powered Research Paper Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

An enterprise-grade, deterministic, multi-modal LLM pipeline strictly designed for deep academic literature review and research gap identification. By abandoning broad text scrapers and generic vector databases, this architecture ensures mathematically sound "source grounding" and prevents hallucination through a specialized Dual-Engine GraphRAG approach.

---

## 🏗️ High-Level System Overview

The system processes highly complex academic PDFs through a 5-Stage decoupled pipeline:

1. **Ingestion Security (The Safety Shield)**: A byte-level middleware utilizes PyMuPDF/QPDF to aggressively validate uploads against DRM, corruption, or concealed payloads.
2. **Asynchronous Orchestration**: Uploads are decoupled from the main thread via a distributed **Celery** worker pool and **Redis** message broker, allowing non-blocking UI responsiveness.
3. **Multi-Modal Vision Parsing**: Uses underlying layout-aware computer vision models (YOLOv8, LayoutLMv3) to physically map document geometry—preserving two-column logic, tables, and mathematically converting equations to LaTeX natively.
4. **The Dual-Engine Analytics**: Extracted JSON schemas power parallel processing (Statistical vs Relational).
5. **Nuemorphic Copilot UI**: A strictly typed, React-based nuemorphic dashboard streaming bidirectional context with the integrated CopilotKit AI Assistant.

---

## 🧠 The Dual-Engine Architecture

To prevent the classic failure points of simple RAG (Retrieval-Augmented Generation), analytical state is divided:

### Path A: The Statistical Engine (Dashboard Metrics)
Strict mathematical computations powered by **Pandas** and **NumPy**. This path aggregates TF-IDF arrays and structured Pydantic methodology models extracted via Google's LangExtract into relational tables. It drives the deterministic **Trend & Saturation Analysis** and **Methodology Matrix**. 

*Stored in: PostgreSQL (Rapid UI Lookups).*

### Path B: The Relational Engine (Cognee GraphRAG)
Complex semantic memory mapping powered by the **Cognee** framework. Rather than blindly chunking text, an LLM dictates explicit structural "Triplets" *(e.g. `Author -> CITES -> Paper -> USES -> Metric`)*.
This mathematically traversable map ensures the integrated "MathBot" assistant provides 100% accurate answers regarding citation roots and explicitly flags **Contradictions**.

*Stored across: LanceDB (Semantic Vectors) & NetworkX/Neo4j (Knowledge Graph).*

---

## 🛠️ The Tech Stack

*   **Frontend**: React (Vite, TypeScript), TailwindCSS (Nuemorphic strict constraints), CopilotKit, React Query, Lucide-React.
*   **Backend Application**: Python 3.11, FastAPI, Pydantic V2 (Rust-backed validation), Uvicorn.
*   **Message Broker & Queues**: Celery, Redis.
*   **Data Layer**: PostgreSQL, LanceDB, NetworkX.
*   **AI/ML Pipeline**: Cognee, LangExtract, PyMuPDF, Pandas, NumPy.
*   **Infrastructure**: Docker Compose, `uv` (Ultra-fast Rust-based Python package resolver).

---

## 🚀 Setup Instructions

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

---

### Local Backend Verification (Without Docker)
If you require direct Python manipulation, ensure you utilize the `uv` toolchain for deterministic package resolution.

```bash
cd backend
npm install -g uv  # If uv is not installed
uv venv .venv
# Activate venv depending on your OS (e.g., .\.venv\Scripts\activate on Windows)
uv pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```