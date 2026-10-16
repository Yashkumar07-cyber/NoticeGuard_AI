from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

FieldStatus = Literal["stated", "not_stated", "uncertain", "conflicting"]

class NoticeField(BaseModel):
    value: Optional[str] = Field(None, description="The extracted fact or null if absent")
    status: FieldStatus = Field(..., description="stated, not_stated, uncertain, or conflicting")
    evidence: Optional[str] = Field(None, description="Exact phrase copied from the notice")
    region: Optional[str] = Field(None, description="Approximate region or section heading in the notice")
    options: Optional[List[Dict[str, Any]]] = Field(None, description="List of competing options if conflicting")
    confirmed_by_user: Optional[bool] = Field(False, description="Whether marked as confirmed by user")
    edited_by_user: Optional[bool] = Field(False, description="Whether value was edited by user")
    chosen_option: Optional[str] = Field(None, description="The selected option if resolved from conflict")

class DocumentItem(BaseModel):
    value: str = Field(..., description="Name of required document")
    status: FieldStatus = Field("stated", description="Status of document requirement")
    evidence: Optional[str] = Field(None, description="Source quote")
    region: Optional[str] = Field(None, description="Section in notice")

class ActionItem(BaseModel):
    step: int = Field(..., description="1-indexed sequence number")
    task: str = Field(..., description="Actionable step to take")
    source_evidence: Optional[str] = Field(None, description="Source phrase in notice")
    done: Optional[bool] = Field(False, description="Tick status in UI")

class ConflictItem(BaseModel):
    field: str
    option_a: Dict[str, str]
    option_b: Dict[str, str]

class NoticeAnalysisResult(BaseModel):
    purpose: NoticeField
    eligibility: NoticeField
    deadline: NoticeField
    required_documents: List[DocumentItem]
    contact: NoticeField
    fee: NoticeField
    actions: List[ActionItem]
    summary: str
    uncertainties: List[str] = Field(default_factory=list)
    conflicts: List[ConflictItem] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    language_detected: Literal["en", "hi", "mixed"] = "en"
    raw_notice_text: Optional[str] = Field(None, description="Original notice text if provided")

class TranslateRequest(BaseModel):
    notice_json: Dict[str, Any]
    target: Literal["en", "hi"]

class AskRequest(BaseModel):
    notice_json: Dict[str, Any]
    question: str
    lang: Optional[str] = "en"

class AskResponse(BaseModel):
    answer: str
    evidence: Optional[str] = None
    answerable: bool

class AnalyzeTextRequest(BaseModel):
    text: str

class HealthResponse(BaseModel):
    status: str
    mock_mode: bool
    provider: Optional[str] = None
    model: Optional[str] = None
