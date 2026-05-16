import os
import json
from typing import List, Dict, Any
from groq import Groq
from models import CandidateInfo, JobMatch, RecommendationResponse
from embedding import load_jobs, rank_jobs

class LLMAgent:
    def __init__(self, job_dataset_path: str = "job_dataset.json"):
        """Initialize the agent with Groq API."""
        # Get absolute path to handle Vercel deployment
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dataset_path = os.path.join(base_dir, job_dataset_path)
        
        self.jobs = load_jobs(dataset_path)
        self.job_by_id = {job['id']: job for job in self.jobs}
        
        # Initialize Groq client
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        # Llama 3 8B is excellent and extremely fast for tool calling
        self.model = "llama-3.3-70b-versatile"

    def parse_resume(self, resume_text: str) -> CandidateInfo:
        """Step 1: Real LLM Tool Call to parse the resume into structured JSON."""
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "extract_candidate_info",
                    "description": "Extract structured information from a candidate's resume.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Full name. Null if not found."},
                            "skills": {"type": "array", "items": {"type": "string"}, "description": "Technical and professional skills."},
                            "experience_years": {"type": "number", "description": "Total years of professional experience. 0 if none."},
                            "preferred_roles": {"type": "array", "items": {"type": "string"}, "description": "Roles the candidate is targeting."},
                            "education": {"type": "string", "description": "Highest level of education. Null if not found."}
                        },
                        "required": ["name", "skills", "experience_years", "preferred_roles", "education"]
                    }
                }
            }
        ]

        messages = [
            {"role": "system", "content": "You are an expert technical recruiter. Extract structured data from the provided resume."},
            {"role": "user", "content": f"Please extract the candidate info from this resume:\n\n{resume_text}"}
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "extract_candidate_info"}},
            temperature=0.1
        )

        tool_call = response.choices[0].message.tool_calls[0]
        args = json.loads(tool_call.function.arguments)

        return CandidateInfo(
            name=args.get("name"),
            skills=args.get("skills", []),
            experience_years=args.get("experience_years", 0),
            preferred_roles=args.get("preferred_roles", []),
            education=args.get("education")
        )

    def get_top_matches(self, resume_text: str, top_n: int = 5) -> List[Dict[str, Any]]:
        """Get top N job matches using Cohere semantic embeddings."""
        ranked_indices = rank_jobs(resume_text, self.jobs, top_n=top_n)

        matches = []
        for job_id, similarity_score in ranked_indices:
            job = self.job_by_id[job_id]
            matches.append({
                "id": job["id"],
                "title": job["title"],
                "company": job["company"],
                "similarity_score": similarity_score,
                "description": job["description"],
                "skills": job["skills"],
                "domain": job["domain"]
            })
        return matches

    def generate_explanations(self, candidate: CandidateInfo, matches: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Step 2: Real LLM Tool Call to generate specific reasoning for the top matches."""
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "provide_match_reasoning",
                    "description": "Provide natural language reasoning for why each job is or isn't a fit.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "explanations": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string", "description": "The exact job ID from the provided matches."},
                                        "explanation": {"type": "string", "description": "A 2-3 sentence explanation of the match quality."}
                                    },
                                    "required": ["id", "explanation"]
                                }
                            }
                        },
                        "required": ["explanations"]
                    }
                }
            }
        ]

        candidate_dict = {
            "name": candidate.name,
            "skills": candidate.skills,
            "experience_years": candidate.experience_years
        }
        
        jobs_context = [{"id": str(m["id"]), "title": m["title"], "skills": m["skills"], "domain": m["domain"]} for m in matches]

        messages = [
            {"role": "system", "content": "You are an expert AI recruiter. Evaluate the candidate against the top 5 matched jobs. Provide a highly specific, 2-3 sentence explanation for EACH job comparing their skills and experience. IMPORTANT: You are outputting to a strict JSON parser. Do not use unescaped apostrophes or quotes in your explanations."},
            {"role": "user", "content": f"Candidate Profile:\n{json.dumps(candidate_dict)}\n\nMatched Jobs:\n{json.dumps(jobs_context)}\n\nProvide reasoning for each job ID."}
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "provide_match_reasoning"}},
            temperature=0.3
        )

        tool_call = response.choices[0].message.tool_calls[0]
        args = json.loads(tool_call.function.arguments)
        return args.get("explanations", [])

    def generate_clarifying_question(self, candidate: CandidateInfo, matches: List[Dict[str, Any]]) -> str:
        """Step 3: Prompt engineering to generate a dynamic clarifying question."""
        candidate_dict = {"skills": candidate.skills, "experience_years": candidate.experience_years}
        jobs_context = [{"title": m["title"], "domain": m["domain"]} for m in matches]

        messages = [
            {"role": "system", "content": "You are an expert AI recruiter. Generate exactly ONE smart, specific follow-up question to ask the candidate to resolve an ambiguity or gap based on their resume and their top job matches. Do not use generic questions like 'Tell me about yourself'. Output ONLY the question string."},
            {"role": "user", "content": f"Candidate Profile:\n{json.dumps(candidate_dict)}\n\nMatched Jobs:\n{json.dumps(jobs_context)}"}
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7
        )

        return response.choices[0].message.content.strip().strip('"')

    def recommend(self, resume_text: str) -> RecommendationResponse:
        """Main pipeline execution."""
        candidate = self.parse_resume(resume_text)
        matches = self.get_top_matches(resume_text, top_n=5)
        explanations = self.generate_explanations(candidate, matches)
        clarifying_question = self.generate_clarifying_question(candidate, matches)

        ranked_jobs = []
        for match in matches:
            explanation = next((e["explanation"] for e in explanations if str(e["id"]) == str(match["id"])), "Good structural match based on vector similarity.")
            ranked_jobs.append(JobMatch(
                id=match["id"],
                title=match["title"],
                company=match["company"],
                similarity_score=match["similarity_score"],
                explanation=explanation
            ))

        return RecommendationResponse(
            candidate=candidate,
            ranked_jobs=ranked_jobs,
            clarifying_question=clarifying_question
        )