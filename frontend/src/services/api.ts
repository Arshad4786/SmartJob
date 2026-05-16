import axios from 'axios';

// Create an axios instance with base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export functions for API endpoints
export const recommendJobs = async (resumeText: string) => {
  const response = await api.post('/recommend', { resume_text: resumeText });
  return response.data;
};

export const refineRecommendations = async (
  resumeText: string,
  clarifyingQuestion: string,
  candidateAnswer: string
) => {
  const response = await api.post('/refine', {
    resume_text: resumeText,
    clarifying_question: clarifyingQuestion,
    candidate_answer: candidateAnswer,
  });
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};