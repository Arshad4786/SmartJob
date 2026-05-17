# 🎯 Smart Job Match Agent

An AI-powered, full-stack job recommendation system built for the Cantilever AI Engineering Intern assignment.

This application goes beyond basic keyword matching by utilizing true semantic vector search and agentic tool-calling to evaluate candidates the way a real human recruiter would. It parses resumes, calculates semantic similarity against a job dataset, generates specific reasoning for its matches, and dynamically refines its search through clarifying questions.

## 🚀 Live Demo

* **Frontend Application:** [https://job-three-blush.vercel.app/](https://job-three-blush.vercel.app/)
* **Backend API:** [https://llm-project-ten-henna.vercel.app](https://llm-project-ten-henna.vercel.app)

## ✨ Key Features

* **Semantic Embedding Search:** Uses Cohere to map resumes and job descriptions into a high-dimensional vector space, calculating Cosine Similarity to find the true conceptual fit.

* **Agentic Tool Calling:** Utilizes Groq's Llama 3.3 70B model with strict JSON tool-calling to parse unstructured PDF text into structured data and generate highly specific, context-aware match reasoning.

* **Dynamic Refinement:** The AI generates a unique clarifying question based on the candidate's profile and top matches. Answering this question dynamically updates the search context and re-ranks the jobs.

* **Modern UI/UX:** Built with React and Tailwind CSS, featuring smooth animations, glassmorphism design, and intuitive data visualizations like normalized Match Score progress bars.

## 🛠️ Tech Stack

### Frontend

* React (Create React App)
* Tailwind CSS
* Axios

### Backend

* Python 3
* FastAPI & Uvicorn
* PyPDF2 for resume extraction

### AI & Machine Learning

* **Cohere API** (`embed-english-v3.0`): Used to handle heavy vector embeddings via API, bypassing Vercel's 1024MB memory limits that would cause local `sentence-transformers` models to crash.

* **Groq API** (`llama-3.3-70b-versatile`): Used for lightning-fast inference and highly reliable JSON tool-calling capabilities.

---

## 💻 Local Setup & Installation

If you would like to run this project locally, follow these steps.

### Prerequisites

* Python 3.9+
* Node.js and npm
* Free API keys from [Groq](https://console.groq.com/) and [Cohere](https://dashboard.cohere.com/)

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/Arshad4786/SmartJob.git
cd SmartJob
```

---

## 2️⃣ Backend Setup

### Create and Activate Virtual Environment

#### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### macOS / Linux

```bash
python -m venv .venv
source .venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Create Environment Variables File

Create a `.env` file in the backend root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
```

### Run the Backend Server

```bash
python main.py
```

Backend will run on:

```bash
http://localhost:8001
```

---

## 3️⃣ Frontend Setup

Open a new terminal window.

### Navigate to Frontend Folder

```bash
cd frontend
```

### Install Dependencies

```bash
npm install
```

### Create Frontend Environment Variables

Create a `.env` file inside the `frontend` folder:

```env
REACT_APP_API_BASE_URL=http://localhost:8001
```

### Run the Frontend Server

```bash
npm start
```

Frontend will run on:

```bash
http://localhost:3000
```

---

## 🧠 Architecture Decisions & Trade-offs

A full write-up answering the assignment prompt constraints can be found in `WRITEUP.md`.

---

## 📄 License

This project was created for an assessment and is open-sourced under the MIT License.
