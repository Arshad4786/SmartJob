# Smart Job Match Agent

An AI-powered job recommendation system that uses semantic embeddings and LLM-based reasoning to match candidates with relevant job openings.

## Features

- **Semantic Similarity Ranking**: Uses sentence embeddings to rank jobs by relevance to a candidate's resume
- **Agentic LLM Layer**: Two-step agent that parses resumes and generates match explanations using tool calls
- **Clarifying Question Generation**: Dynamically generates smart follow-up questions to improve match quality
- **REST API**: Production-style FastAPI endpoints for recommendations and refinements
- **Explainable AI**: Provides natural-language explanations for each job match

## Architecture

The system consists of four main components:

1. **Embedding Module**: Computes semantic similarity between resumes and job descriptions
2. **LLM Agent**: 
   - Resume Parser Tool: Extracts structured information from resume text
   - Match Reasoning Tool: Generates explanations for job matches
3. **Question Generator**: Produces smart clarifying questions based on candidate-job analysis
4. **FastAPI Server**: Exposes `/recommend` and `/refine` endpoints

## Setup Instructions

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-job-match-agent
   ```

2. **Create a virtual environment (optional but recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend application**
   ```bash
   python main.py
   ```

5. **Test the API**
   The API will be available at `http://localhost:8001`
   
   Example request:
   ```bash
   curl -X POST "http://localhost:8001/recommend" \
     -H "Content-Type: application/json" \
     -d '{
       "resume_text": "Experienced ML Engineer with 3 years in Python, PyTorch, and AWS. Built recommendation systems and deployed models using Docker and Kubernetes."
     }'
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Run the frontend development server**
   ```bash
   npm start
   ```
   
   The frontend will be available at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```
   
   This creates an optimized build in the `build` directory ready for deployment.

## Deployment

### Vercel Deployment

The frontend is configured for easy deployment to Vercel:

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy from the frontend directory:
   ```bash
   cd frontend
   vercel
   ```

3. Follow the prompts to complete the deployment.

The backend can be deployed to any service that supports Python/FastAPI (e.g., Render, Railway, AWS, etc.).

## File Structure

- `main.py`: FastAPI application with `/recommend` and `/refine` endpoints
- `agent.py`: LLM agent implementing the two-step tool calling process
- `embedding.py`: Semantic similarity computation using sentence transformers
- `models.py`: Pydantic models for request/response validation
- `job_dataset.json`: Dataset of 50 job postings (provided)
- `requirements.txt`: Python dependencies
- `frontend/`: React TypeScript frontend application
  - `src/App.tsx`: Main application component with resume input and results display
  - `src/services/api.ts`: API service layer for communicating with backend
  - `tailwind.config.js`: Tailwind CSS configuration for styling
  - `vercel.json`: Vercel deployment configuration

## File Structure

- `main.py`: FastAPI application with `/recommend` and `/refine` endpoints
- `agent.py`: LLM agent implementing the two-step tool calling process
- `embedding.py`: Semantic similarity computation using sentence transformers
- `models.py`: Pydantic models for request/response validation
- `job_dataset.json`: Dataset of 50 job postings (provided)
- `requirements.txt`: Python dependencies

## API Endpoints

### POST /recommend
Submit a resume text to get job recommendations.

**Request:**
```json
{
  "resume_text": "string"
}
```

**Response:**
```json
{
  "candidate": {
    "name": "string",
    "skills": ["string"],
    "experience_years": number
  },
  "ranked_jobs": [
    {
      "id": number,
      "title": "string",
      "company": "string",
      "similarity_score": number,
      "explanation": "string"
    }
  ],
  "clarifying_question": "string"
}
```

### POST /refine
Refine recommendations based on answer to a clarifying question.

**Request:**
```json
{
  "resume_text": "string",
  "clarifying_question": "string", 
  "candidate_answer": "string"
}
```

**Response:**
```json
{
  "ranked_jobs": [...],
  "reasoning": "string"
}
```

## Design Choices

### Embedding Model
Selected `all-MiniLM-L6-v2` from sentence-transformers for its balance of speed and performance. Alternatives considered:
- `all-mpnet-base-v2`: Higher accuracy but slower
- OpenAI `text-embedding-3-small`: Requires API key and has costs
- `paraphrase-MiniLM-L6-v2`: Similar performance but less general purpose

Trade-offs: Chose open-source model to avoid API dependencies and costs while maintaining good performance.

### Agentic Architecture
Split into two tool calls to:
1. Isolate concerns (parsing vs reasoning)
2. Enable independent tool development and testing
3. Follow best practices for LLM tool use (single responsibility per tool)
4. Allow for better error handling and debugging

Failure modes:
- If resume parsing fails, may produce incomplete candidate info
- If explanation generation fails, returns generic explanations
- Network issues with LLM API would require fallback mechanisms

## Honest Weaknesses

1. **Noisy Resumes**: Heavily formatted or poorly structured resumes may confuse the parser
2. **Scale Limitations**: Current implementation loads all embeddings into memory; would need optimization for 10K+ concurrent requests
3. **Limited NLP**: Uses simple keyword matching for resume parsing rather than full NER
4. **Static Explanations**: Current explanations are rule-based; real LLM calls would produce more nuanced reasoning
5. **Cold Start**: Model loading adds latency to first request

## Next Steps

With two more days, I would implement actual LLM tool calls using a provider like OpenAI or Anthropic to replace the mock implementations. This would significantly improve the quality of resume parsing and match explanations, making the agent truly agentic rather than simulating the behavior.

## License

MIT