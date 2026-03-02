from pydantic import BaseModel, Field
from typing import List, Optional

class BoundingBox(BaseModel):
    x0: float = Field(description="Top left X coordinate.")
    y0: float = Field(description="Top left Y coordinate.")
    x1: float = Field(description="Bottom right X coordinate.")
    y1: float = Field(description="Bottom right Y coordinate.")
    page_number: int = Field(description="The page number where this element is located.")

class ExtractedTextNode(BaseModel):
    text: str = Field(description="The extracted raw text content.")
    bbox: Optional[BoundingBox] = Field(None, description="The physical bounding box on the PDF page.")

class ExtractedEquation(BaseModel):
    latex: str = Field(description="The formal LaTeX string representing the mathematical equation.")
    bbox: Optional[BoundingBox] = Field(None, description="The physical bounding box on the PDF page.")

class ExtractedTable(BaseModel):
    markdown: str = Field(description="The extracted table converted perfectly into Markdown format.")
    bbox: Optional[BoundingBox] = Field(None, description="The physical bounding box on the PDF page.")

class Author(BaseModel):
    name: str = Field(description="The full name of the author.")
    affiliation: Optional[str] = Field(None, description="The affiliated university or institution.")

class PaperMetadata(BaseModel):
    title: str = Field(description="The formal title of the research paper.")
    authors: List[Author] = Field(description="List of authors associated with the paper.")
    publication_year: Optional[int] = Field(None, description="The year the paper was published.")
    abstract: str = Field(description="The abstract or core summary of the paper.")
    
class Methodology(BaseModel):
    datasets: List[str] = Field(description="Specific datasets utilized in the research (e.g., MNIST, ImageNet).")
    base_models: List[str] = Field(description="Base foundational models or algorithms used (e.g., BERT, ResNet50).")
    metrics: List[str] = Field(description="Evaluation metrics utilized to judge performance (e.g., F1 Score, Accuracy%).")
    optimization: Optional[str] = Field(None, description="The primary optimization algorithm (e.g., AdamW, SGD).")

class Limitation(BaseModel):
    description: str = Field(description="The specific limitation or future work highlighted by the authors.")
    source_context: str = Field(description="The direct sentence or context framing the limitation.")
    page_number: Optional[int] = Field(None, description="The page number where this limitation was found.")

class Contradiction(BaseModel):
    claim: str = Field(description="A specific claim made by the paper.")
    opposing_claim: str = Field(description="A directly opposing finding from another source referenced or discovered.")
    confidence_score: float = Field(ge=0.0, le=1.0, description="The LLM's confidence that this is a valid contradiction.")

class ExtractedInsights(BaseModel):
    """
    Root extraction matrix to enforce LangExtract Output.
    """
    metadata: PaperMetadata = Field(description="Core paper identification metadata.")
    methodologies: List[Methodology] = Field(default_factory=list, description="The comparative methodology matrix.")
    limitations: List[Limitation] = Field(default_factory=list, description="Extracted limitations driving the Research Gap Radar.")
    contradictions: List[Contradiction] = Field(default_factory=list, description="Extracted contradictions for the Contradiction Engine.")
