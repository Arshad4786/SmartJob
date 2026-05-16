import os
from dotenv import load_dotenv # 1. Import the library
load_dotenv() # 2. Load the variables from the .env file immediately!
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import PyPDF2
import io
from agent import LLMAgent
from models import RecommendationRequest, RecommendationResponse, RefineRequest, RefineResponse

app = FastAPI(
    title="Smart Job Match Agent",
    description="AI Engineering Intern Hiring Assignment - Job Recommendation API",
    version="1.0.0"
)

# --- CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (good for local development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- ABSOLUTE PATH FIX FOR VERCEL ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "job_dataset.json")

# Initialize the agent with the absolute path
agent = LLMAgent(job_dataset_path=DATASET_PATH)

@app.post("/extract-text")
async def extract_text_from_pdf(file: UploadFile = File(...)):
    """
    Helper endpoint: Accepts a PDF file, extracts the text, and returns it.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        contents = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
        
        extracted_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
                
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from this PDF. It might be an image-based PDF.")
            
        return {"text": extracted_text.strip()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading PDF: {str(e)}")

@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_jobs(request: RecommendationRequest):
    """
    Accept a resume text and return ranked job recommendations.
    """
    if not request.resume_text or request.resume_text.strip() == "":
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")

    try:
        response = agent.recommend(request.resume_text)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recommendation: {str(e)}")

@app.post("/refine", response_model=RefineResponse)
async def refine_recommendations(request: RefineRequest):
    """
    Accept resume text, a clarifying question, and candidate's answer to refine recommendations.
    """
    if not request.resume_text or request.resume_text.strip() == "":
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    if not request.clarifying_question or request.clarifying_question.strip() == "":
        raise HTTPException(status_code=400, detail="Clarifying question cannot be empty")
    if not request.candidate_answer or request.candidate_answer.strip() == "":
        raise HTTPException(status_code=400, detail="Candidate answer cannot be empty")

    try:
        updated_resume = f"{request.resume_text}\n\nAdditional Information:\nQ: {request.clarifying_question}\nA: {request.candidate_answer}"
        response = agent.recommend(updated_resume)

        reasoning = "The ranking was updated based on the additional information provided in your answer to the clarifying question."

        return RefineResponse(
            ranked_jobs=response.ranked_jobs,
            reasoning=reasoning
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing refinement: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Smart Job Match Agent is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)