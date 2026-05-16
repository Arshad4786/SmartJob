import cohere
import numpy as np
import json
import os

# Global variables to prevent reloading the client and matrix on every API call
_cohere_client = None
_job_embeddings = None
_jobs_list = None

def load_jobs(job_file_path: str) -> list:
    """Load job dataset from JSON file."""
    with open(job_file_path, 'r') as f:
        jobs = json.load(f)
    return jobs

def _initialize():
    """Initialize the Cohere client and precompute the job dataset embeddings."""
    global _cohere_client, _job_embeddings, _jobs_list
    
    if _cohere_client is None:
        api_key = os.environ.get("COHERE_API_KEY")
        if not api_key:
            raise ValueError("COHERE_API_KEY environment variable is not set.")
            
        _cohere_client = cohere.Client(api_key)
        
        # Absolute path for Vercel
        base_dir = os.path.dirname(os.path.abspath(__file__))
        job_file_path = os.path.join(base_dir, "job_dataset.json")
        _jobs_list = load_jobs(job_file_path)
        
        # Create rich text representations of the jobs for better semantic matching
        job_texts = [
            f"Title: {job['title']}. Company: {job['company']}. Domain: {job['domain']}. "
            f"Description: {job['description']} Required Skills: {', '.join(job['skills'])}."
            for job in _jobs_list
        ]
        
        # Batch embed the entire job database
        response = _cohere_client.embed(
            texts=job_texts,
            model='embed-english-v3.0',
            input_type='search_document'
        )
        _job_embeddings = np.array(response.embeddings)

def get_embedding(text: str) -> np.ndarray:
    """Get the semantic embedding vector for the incoming resume."""
    _initialize()
    response = _cohere_client.embed(
        texts=[text],
        model='embed-english-v3.0',
        input_type='search_query'
    )
    return np.array(response.embeddings[0])

def compute_similarity(vec1: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """Compute mathematical cosine similarity between the resume vector and job vectors."""
    dot_product = np.dot(matrix, vec1)
    norm_vec1 = np.linalg.norm(vec1)
    norm_matrix = np.linalg.norm(matrix, axis=1)
    
    # Handle division by zero safely
    if norm_vec1 == 0:
        return np.zeros(matrix.shape[0])
        
    return dot_product / (norm_vec1 * norm_matrix)

def rank_jobs(resume_text: str, jobs: list, top_n: int = 5) -> list:
    """Return the top N jobs ranked by semantic similarity, scaled for UI presentation."""
    _initialize()
    
    # 1. Embed the resume
    resume_embedding = get_embedding(resume_text)
    
    # 2. Compute raw Cosine Similarity
    similarities = compute_similarity(resume_embedding, _job_embeddings)
    
    # 3. Sort and slice the top N results
    top_indices = np.argsort(similarities)[::-1][:top_n]
    
    results = []
    for idx in top_indices:
        job_id = _jobs_list[idx]['id']
        raw_score = float(similarities[idx])
        
        # --- UI SCALING ---
        # Raw Cohere embeddings usually range from 0.2 to 0.5 for related distinct documents.
        # We apply a square root and a small multiplier to map this to a 60%-95% UI range
        # without changing the actual mathematical ranking order.
        ui_score = min((raw_score ** 0.5) * 1.15, 0.98) 
        
        results.append((job_id, ui_score))
        
    return results