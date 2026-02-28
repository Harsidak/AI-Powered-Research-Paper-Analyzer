from fastapi import APIRouter
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK

# Initialize the CopilotKit SDK backend service
# In a full deployment, pass providers/actions here based on RAG.
copilotkit_sdk = CopilotKitSDK()

copilotkit_router = APIRouter(prefix="/v1/chat", tags=["copilot"])

# Ensure we use the latest binding method for FastAPI
add_fastapi_endpoint(
    copilotkit_router,
    copilotkit_sdk,
    "/",
)
