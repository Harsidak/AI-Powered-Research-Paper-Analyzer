# State-of-the-Art Tech Stack: AI-Powered Research Paper Analyzer

To build a **production-ready, robust, and highly efficient** application processing heavy PDF files and running data science workloads, we need a modern tech stack. This updated stack replaces legacy systems with cutting-edge tools (many written in Rust or Go) to ensure maximum speed, developer experience, and scalability.

## 1. Frontend Architecture
We will use a modern meta-framework to ensure fast initial loads and a seamless developer experience.

*   **Core Framework:** Next.js 14+ (App Router) with React 18+ and TypeScript. Provides server-side rendering (SSR) and optimized routing.
*   **State Management:** Zustand (lightweight, unopinionated, out-performs Redux).
*   **Data Fetching:** TanStack Query (React Query) v5 - essential for elegant API polling, caching, and handling complex async states.
*   **Styling & UI Components:** 
    *   Tailwind CSS (utility-first styling).
    *   shadcn/ui (radix-ui based, accessible, unstyled components that copy-paste into your project).
    *   Framer Motion (for smooth micro-animations and page transitions).
*   **Data Visualization:** Tremor (React library built specifically for dashboards/analytics) or Apache ECharts (for complex network graphs of paper similarities).

## 2. Backend Architecture
The backend is built for blazing-fast async I/O and strict type safety.

*   **Core Framework:** FastAPI (State-of-the-art for Python async APIs).
*   **Language:** Python 3.11+
*   **Package Manager:** **uv** (An extremely fast Python package installer and resolver written in Rust, replacing `pip`/`poetry`).
*   **Linter/Formatter:** Ruff (Written in Rust, 10-100x faster than Flake8/Black).
*   **Data Validation:** Pydantic v2 (Written in Rust, core to FastAPI).

## 3. Data Science & Machine Learning Pipeline
This layer handles the heavy lifting. We will optimize the required stack for performance.

*   **PDF Extraction:** `unstructured.io` OR `Marker` (State-of-the-art for extracting layout-aware text from scientific PDFs, handling two-column layouts and math formulas far better than traditional tools).
*   **Data Manipulation:** Pandas 2.0 (using the **PyArrow** backend for massive speed and memory improvements) or **Polars** (written in Rust, blazingly fast DataFrame library - if we have flexibility beyond Pandas).
*   **Text Processing & NLP:** `spaCy` (with transformer pipelines) for robust Named Entity Recognition (NER) and keyword extraction.
*   **Vectorization & Similarity:** 
    *   NumPy (as per core requirements for cosine similarity).
    *   *Optionally scalable to:* **FAISS** (Facebook AI Similarity Search) or an embedded Vector DB like **ChromaDB/DuckDB** if the corpus grows to thousands of papers.

## 4. Database & Storage
Modern persistence prioritizing developer experience and type safety.

*   **Primary Database:** PostgreSQL.
*   **ORM:** Prisma Client Python OR SQLModel (combines SQLAlchemy and Pydantic for seamless typing).
*   **File Storage:** Amazon S3 or Cloudflare R2 (R2 avoids egregious egress fees when transferring large PDFs).

## 5. Async Processing & Workflow Orchestration
PDF processing is CPU-bound. Instead of legacy queues like Celery, we will use modern durable execution.

*   **Orchestration Framework:** **Temporal.io** or **Inngest**. 
    *   *Why?* Rather than managing Redis queues and Celery workers manually, Temporal guarantees that if a 5-minute PDF extraction job fails halfway through due to a server crash, it will resume exactly where it left off. It is the gold standard for robust background jobs.

## 6. Infrastructure, DevOps & Deployment
Built to scale automatically with zero downtime.

*   **Frontend Hosting:** Vercel (seamless Next.js integration, global Edge CDN).
*   **Backend Hosting:** Fly.io or Google Cloud Run (Serverless containers that scale to zero and handle high concurrency).
*   **Containerization:** Docker & Docker Compose.
*   **CI/CD:** GitHub Actions (for automated linting via Ruff, testing, and deployments).
*   **Monitoring:** Sentry (Error tracking) and PostHog (Product analytics and session recording).

---

### Architectural Flow (Production Journey)
1. User drops a PDF into the **Next.js** dashboard.
2. The file is streamed directly to **Cloudflare R2/S3** via a pre-signed URL (bypassing the backend to save memory).
3. The client hits the **FastAPI** endpoint with the file key. FastAPI creates a database record via **Prisma/SQLModel**.
4. FastAPI triggers a **Temporal** workflow and immediately returns `202 Accepted`.
5. The Temporal worker executes the steps durably: 
   - Downloads PDF.
   - Extracts text via `unstructured`.
   - Runs **Pandas 2.0 (PyArrow)** and **NumPy** for clustering and TF-IDF similarity.
   - Saves results to PostgreSQL.
6. The **Next.js** client (using TanStack Query) polls the status endpoint and seamlessly animates the **Tremor/ECharts** dashboard into view upon completion.
