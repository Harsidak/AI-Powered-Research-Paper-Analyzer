# Core Execution Pipeline: AI-Powered Research Paper Analyzer

*A detailed breakdown of the production-level system architecture and data flow, tracing a PDF from upload to deterministic user interaction.*

---

## The 5-Stage System Architecture

The application is structured into five distinct, highly decoupled stages. This isolation (achieved via Docker Compose) ensures that no single point of failure—such as a corrupted PDF—can crash the main API server.

1. **Ingestion & Validation Security (The API Gateway)**
2. **Asynchronous Orchestration (The Message Broker)**
3. **Multi-Modal Data Extraction (The Vision Parsers)**
4. **The Dual-Engine Analytics (Statistics & Memory)**
5. **The Neumorphic Presentation (Client Polling)**

---

### Stage 1: Ingestion & Validation Security (The API Gateway)
*The system receives a file and immediately defends itself against malformed or malicious inputs.*

1. **The Upload Event**: A user uploads a 50-page PDF (`research.pdf`) via the React frontend.
2. **FastAPI Inception (`api-gateway` container)**: The Python FastAPI server receives the binary payload at `POST /api/v1/upload`.
3. **The Safety Shield (PyMuPDF Middleware)**: Before any heavy AI processing begins, a middleware layer (`app/core/security/pdf_validator.py`) uses **PyMuPDF/QPDF** to open the file at the byte level. It verifies:
   * Is it actually a PDF? (Not an executable disguised as `.pdf`)
   * Is it encrypted or DRM-locked?
   * Does it contain a fundamentally broken object stream?
4. **Quarantine or Accept**: 
   * *If Invalid*: FastAPI immediately returns a `422 Unprocessable Entity` with a strictly typed JSON error message (e.g., `{"error": "pdf_encrypted", "message": "File is DRM protected"}`).
   * *If Valid*: The file is written to secure, temporary **Blob Storage** (`/app/data/temp_files/`, mounted to an AWS S3 bucket in production).
5. **Database Registration**: The API creates a new record in the **PostgreSQL** (`db-postgres` container) `documents` table, generating a UUID and setting `status: 'PENDING'`.

---

### Stage 2: Asynchronous Orchestration (The Message Broker)
*The heavy lifting is decoupled from the web server so the API remains 100% responsive for other users.*

1. **Ticket Generation**: FastAPI pushes a structured JSON "Job Ticket" to **Redis** (`db-redis` container, Port `6379`). 
   * *Payload Example*: `{"task_id": "uuid-123", "action": "process_pdf", "file_path": "/app/data/temp_files/research.pdf", "user_id": "987"}`
2. **The 202 Response**: Within milliseconds, FastAPI returns a `202 Accepted` HTTP response to the React frontend: `{"status": "accepted", "task_id": "uuid-123"}`.
3. **The Hand-off**: The user's HTTP request connects, uploads, and disconnects instantly. The `api-gateway` ASGI worker thread is immediately freed to handle the next user, ensuring zero server blockage.
4. **Worker Activation (`ai-worker` container)**: In a completely separate Docker container, a background Python worker (managed by **Celery**) continuously monitors the Redis queue. It detects the new Job Ticket, pulls it from the queue, and begins the actual NLP processing. The worker issues an `UPDATE` to PostgreSQL changing the document status to `status: 'EXTRACTING_LAYOUT'`.

---

### Stage 3: Multi-Modal Data Extraction (The Vision Parsers)
*The background worker converts the visual PDF into structured, mathematically usable data.*

1. **MinerU / LayoutLMv3 Execution**: The Celery worker passes the PDF into the core open-source extraction engine. Instead of blindly scraping text, the computer vision models map the physical bounding boxes of the layout.
   * *Two-column layouts* are read sequentially (`y-axis` sorting prioritized within column bounding boxes).
   * *Headers, Footers, and Citations* are classified and separated from body text into discrete JSON arrays.
2. **Specialized Element Routing**:
   * *Equations*: Bounding boxes labeled `equation` are routed to **UniMERNet/PaddleOCR** to be translated perfectly into LaTeX strings (e.g., `\sum_{i=1}^{n} a_i`).
   * *Tables*: Bounding boxes labeled `table` are routed to **TableMaster** to be converted directly into clean HTML/Markdown grids.
3. **LangExtract Structuring**: Utilizing Google's LangExtract, the chaotic text is forced into strict, deterministic JSON schemas validated by Pydantic (e.g., `{"authors": ["Smith", "Jones"], "limitations": ["Small dataset", "High latency"]}`). The `ai-worker` updates PostgreSQL to `status: 'ANALYZING'`.

---

### Stage 4: The Dual-Engine Analytics (Statistics & Memory)
*The structured data is split into two specialized analytical paths.*

#### Path A: The Statistical Engine (Dashboard Data)
* Handles standard mathematical and lexical analytics.
* **Pandas / NumPy** ingest the structured JSON from Stage 3. 
* Calculations are performed to generate **Trend & Saturation Analysis** (TF-IDF keyword frequencies exported as `[{"keyword": "attention", "weight": 0.85}]`), the **Methodology & Dataset Matrix**, and structural metadata.
* Results are saved directly to the **PostgreSQL** Database (`document_analytics` table, `jsonb` columns) for instant `GET` retrieval by the React charts.

#### Path B: The Relational Engine (Cognee GraphRAG)
* Handles the complex semantic memory required for the **Contradiction Engine**, **Citation Hierarchy (Roots)**, and hallucination-free AI Assistant responses.
* The clean text is passed into the integrated **Cognee** pipeline (`Extract -> Cognify -> Load`).
* An LLM (via litellm/OpenAI) reads the text and extracts precise structural "Triplets" defined dynamically by DSPy. (e.g., `(Node: Paper_A) -> [Edge: USES_METRIC] -> (Node: Accuracy)`).
* **Storage Split**:
  * *Vector Embeddings*: 512-token chunks are pushed to **LanceDB** (`/app/data/lancedb/`) for rapid semantic similarity searches (e.g., "Find chunks talking about batch sizes").
  * *Relationships*: The Triplets are pushed to a Graph Database (**Neo4j** container or local **NetworkX**) to build a mathematically traversable map of the paper's logical structure.
* The worker issues a final `UPDATE` to PostgreSQL: `status: 'COMPLETE'`.

---

### Stage 5: The Neumorphic Presentation (Client Polling)
*The user experiences a fluid, uninterrupted interface while the backend works.*

1. **Silent Polling (React Query)**: From the moment it received the `task_id` in Stage 2, the React frontend has been silently pinging the backend API (`GET /api/v1/jobs/{task_id}/status`) every 3 seconds.
2. **Graceful Micro-interactions**: As PostgreSQL updates from `PENDING` -> `EXTRACTING_LAYOUT` -> `ANALYZING`, the API responds with `{"status": "ANALYZING", "progress": 45}`. The Neumorphic UI reflects these states via soft, continuously animating ring spinners and descriptive sub-text, rather than jarring full-page reloads.
3. **Job Completion**: When the API polling finally returns `{"status": "COMPLETE"}`, React Query triggers the final data fetch (`GET /api/v1/documents/{task_id}/analytics`).
4. **The Dashboard Unlocks**: 
   * The Statistical Engine data populates the **Trend & Saturation Analysis** (rendering the `[{"keyword": "attention", "weight": 0.85}]` array), **Methodology Matrix**, and **Research Topography** visuals.
   * The Relational Engine (Cognee) activates the **Supercharged MathBot AI** (GraphRAG Assistant) via **CopilotKit**. The CopilotKit React SDK is pre-loaded with researcher-specific prompts and maintains a bidirectional data stream (`ws://api/v1/chat/{task_id}`).
5. **Deterministic Interaction & State Sharing (CopilotKit)**: When the user asks the Assistant a complex question about a citation, CopilotKit inherently knows what Document or Matrix the user is currently viewing in the app state. It passes this context to the system, which directly traverses the Neo4j Knowledge Graph via a Cypher query (e.g., `MATCH (p1:Paper)-[:CLAIMS]->(c1) WHERE...`), guaranteeing a mathematically accurate, 100% hallucination-free response.
6. **Agentic Actions (Export to LaTeX)**: Because the AI is integrated via CopilotKit, it has permission to execute frontend actions. The researcher can type "Export my findings to LaTeX," and the AI triggers the Neumorphic "Export" button (`GET /api/v1/documents/{task_id}/export?format=latex`) to compile the Methodology Matrix and Citation Graph directly into a clean template.
