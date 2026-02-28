"""
CopilotKit backend endpoint.

Registers a 'default' agent that:
  1. Implements copilotkit.Agent (dict_repr, execute, get_state) so the SDK's
     /info route and execute_agent route work correctly.
  2. Runs a Gemini Flash LangGraph graph via LangGraphAGUIAgent streaming so
     responses are streamed back to the frontend.
"""
import os
import json
import uuid
from typing import Optional, List, TypedDict, Annotated, Sequence, Any, AsyncGenerator
from operator import add

from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from copilotkit import CopilotKitRemoteEndpoint
from copilotkit.agent import Agent, AgentDict
from copilotkit.types import Message, MetaEvent
from copilotkit.action import ActionDict

# ── LangGraph state ─────────────────────────────────────────────────────────

class ResearchState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add]


# ── Gemini LLM (lazy loaded) ─────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are MathBot, a deterministic GraphRAG AI research assistant. "
    "Help users analyse academic papers: identify research gaps, methodology contradictions, "
    "citation patterns, and statistical issues. Be precise, concise, and academic."
)

def _get_llm():
    from langchain_google_genai import ChatGoogleGenerativeAI
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        streaming=True,
    )

async def _chat_node(state: ResearchState):
    llm = _get_llm()
    messages = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
    response = await llm.ainvoke(messages)
    return {"messages": [response]}

def _build_graph():
    builder = StateGraph(ResearchState)
    builder.add_node("chat", _chat_node)
    builder.set_entry_point("chat")
    builder.add_edge("chat", END)
    return builder.compile(checkpointer=MemorySaver())

_graph = _build_graph()


# ── CopilotKit-compatible agent ──────────────────────────────────────────────

def _convert_messages(raw_messages: List[Any]) -> List[BaseMessage]:
    """Convert the CopilotKit message list format to LangChain messages."""
    result = []
    for msg in raw_messages:
        role = msg.get("role", "user") if isinstance(msg, dict) else getattr(msg, "role", "user")
        content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
        if role == "user":
            result.append(HumanMessage(content=content))
        elif role == "assistant":
            result.append(AIMessage(content=content))
    return result


class GeminiResearchAgent(Agent):
    """
    Wraps the LangGraph Gemini graph with the copilotkit.Agent interface so that
    `CopilotKitRemoteEndpoint` can:
      - List it via dict_repr() in /info
      - Execute it via execute() which returns a streaming generator
      - Query its state via get_state()
    """
    def __init__(self):
        super().__init__(
            name="default",
            description=(
                "MathBot – a GraphRAG research assistant that analyses academic papers, "
                "identifies research gaps, methodology issues, and citation contradictions."
            ),
        )

    async def _stream_response(
        self,
        messages: List[Any],
        thread_id: str,
    ) -> AsyncGenerator[str, None]:
        """Stream SSE-compatible events from the LangGraph graph."""
        lc_messages = _convert_messages(messages)
        config = {"configurable": {"thread_id": thread_id}}
        
        async for event in _graph.astream_events(
            {"messages": lc_messages},
            config=config,
            version="v2",
        ):
            event_type = event.get("event", "")
            if event_type == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                if chunk and chunk.content:
                    yield json.dumps({"delta": chunk.content}) + "\n"

    def execute(
        self,
        *,
        state: dict,
        config: Optional[dict] = None,
        messages: List[Message],
        thread_id: str,
        actions: Optional[List[ActionDict]] = None,
        meta_events: Optional[List[MetaEvent]] = None,
        node_name: Optional[str] = None,
        **kwargs,
    ):
        """Return an async generator that streams the agent response."""
        tid = thread_id or str(uuid.uuid4())
        return self._stream_response(messages=messages, thread_id=tid)

    async def get_state(self, *, thread_id: str):
        """Return the current conversation state for the given thread."""
        config = {"configurable": {"thread_id": thread_id}}
        try:
            state = await _graph.aget_state(config)
            messages = state.values.get("messages", []) if state.values else []
            return {
                "threadId": thread_id,
                "threadExists": bool(messages),
                "state": {"messages": [m.content for m in messages]},
                "messages": [],
            }
        except Exception:
            return {
                "threadId": thread_id,
                "threadExists": False,
                "state": {},
                "messages": [],
            }


# ── Gemini Action (for direct fetch from MathBotChat.tsx) ────────────────────

from copilotkit import Action as CopilotAction

async def _chat_with_gemini_handler(message: str) -> str:
    """Directly calls Gemini Flash and returns the response as a string."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage, SystemMessage as SM
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
        )
        response = await llm.ainvoke([
            SM(content=SYSTEM_PROMPT),
            HumanMessage(content=message),
        ])
        return response.content
    except Exception as e:
        return f"MathBot encountered an error: {e}"

_chat_action = CopilotAction(
    name="chat_with_gemini",
    description="Send a message to the Gemini Flash research assistant.",
    parameters=[
        {"name": "message", "type": "string", "description": "The user message to send."}
    ],
    handler=_chat_with_gemini_handler,
)


# ── SDK endpoint ─────────────────────────────────────────────────────────────

copilotkit_sdk = CopilotKitRemoteEndpoint(
    agents=[GeminiResearchAgent()],
    actions=[_chat_action],
)
