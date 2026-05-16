from pydantic import BaseModel
from typing import List, Optional

class CandidateInfo(BaseModel):
    name: Optional[str] = None
    skills: List[str] = []
    experience_years: Optional[float] = None
    preferred_roles: List[str] = []
    education: Optional[str] = None

class JobMatch(BaseModel):
    id: int
    title: str
    company: str
    similarity_score: float
    explanation: str

class RecommendationRequest(BaseModel):
    resume_text: str

class RecommendationResponse(BaseModel):
    candidate: CandidateInfo
    ranked_jobs: List[JobMatch]
    clarifying_question: str

class RefineRequest(BaseModel):
    resume_text: str
    clarifying_question: str
    candidate_answer: str

class RefineResponse(BaseModel):
    ranked_jobs: List[JobMatch]
    reasoning: str