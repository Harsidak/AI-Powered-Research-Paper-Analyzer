import logging
import networkx as nx
import lancedb
import os

logger = logging.getLogger(__name__)

LANCEDB_DIR = os.getenv("LANCEDB_DIR", "/app/data/lancedb")

class GraphMemoryManager:
    """
    Manages the deterministic Dual-Engine Relational Analytics.
    Wraps NetworkX for Graph traversals (Contradiction Engine / Citation Roots)
    and LanceDB for fast semantic vector recall.
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        
        # Ensure correct LanceDB data directory exists locally
        os.makedirs(LANCEDB_DIR, exist_ok=True)
        try:
            self.vector_db = lancedb.connect(LANCEDB_DIR)
            logger.info("Successfully connected to LanceDB Memory Store.")
        except Exception as e:
            logger.error(f"Failed to connect to error-free LanceDB instance: {e}")
            self.vector_db = None

    def add_triplet(self, subject: str, predicate: str, object_target: str, context: dict = None):
        """
        Adds a mathematical edge [Predicate] between two nodes [Subject -> Object].
        """
        if context is None:
            context = {}
            
        self.graph.add_edge(subject, object_target, relation=predicate, **context)
        logger.debug(f"Added Edge: ({subject}) -[{predicate}]-> ({object_target})")

    def get_contradictions(self, target_concept: str):
        """
        Traverses the Knowledge Graph specifically hunting for opposing CLAIMS edges.
        """
        # Phase 4 Implementation detail: networkx subgraph analysis
        logger.info(f"Querying graph for contradictions regarding {target_concept}")
        return []

    def get_graph_summary(self) -> dict:
        """
        Returns a summary of the current graph state: node/edge counts and sample edges.
        Useful for verification and later for RAG context injection.
        """
        node_count = self.graph.number_of_nodes()
        edge_count = self.graph.number_of_edges()

        # Grab a sample of edges for inspection
        sample_edges = []
        for u, v, data in list(self.graph.edges(data=True))[:10]:
            sample_edges.append({
                "subject": u,
                "predicate": data.get("relation", "UNKNOWN"),
                "object": v,
            })

        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "sample_edges": sample_edges,
        }

    def get_full_graph(self) -> dict:
        """
        Serializes the full NetworkX graph into a frontend-friendly JSON structure
        for the Knowledge Graph Visualization.
        Returns nodes with degree-based sizing and edges with relation labels.
        """
        # Build node list with metadata for visualization
        nodes = []
        for node in self.graph.nodes():
            # Compute visual properties based on graph structure
            in_deg = self.graph.in_degree(node)
            out_deg = self.graph.out_degree(node)
            total_deg = in_deg + out_deg

            # Determine node group by analyzing edge predicates
            predicates = set()
            for _, _, data in self.graph.in_edges(node, data=True):
                predicates.add(data.get("relation", ""))
            for _, _, data in self.graph.out_edges(node, data=True):
                predicates.add(data.get("relation", ""))

            # Assign color group based on relationship types
            if any(p in predicates for p in ["AUTHORED_BY", "AFFILIATED_WITH"]):
                group = "author"
            elif any(p in predicates for p in ["USES_MODEL", "OPTIMIZED_WITH"]):
                group = "model"
            elif any(p in predicates for p in ["EVALUATES_ON"]):
                group = "dataset"
            elif any(p in predicates for p in ["MEASURES_WITH"]):
                group = "metric"
            elif any(p in predicates for p in ["HAS_LIMITATION"]):
                group = "limitation"
            elif any(p in predicates for p in ["CONTRADICTS"]):
                group = "contradiction"
            elif any(p in predicates for p in ["PUBLISHED_IN"]):
                group = "metadata"
            elif total_deg >= 3:
                group = "hub"  # Central concept
            else:
                group = "concept"

            nodes.append({
                "id": node,
                "label": node[:40] + ("…" if len(node) > 40 else ""),
                "fullLabel": node,
                "group": group,
                "degree": total_deg,
                "inDegree": in_deg,
                "outDegree": out_deg,
            })

        # Build edge list
        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "relation": data.get("relation", "RELATED_TO"),
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges),
            }
        }

# Singleton instance to be used by the Celery worker and the API
memory_manager = GraphMemoryManager()
