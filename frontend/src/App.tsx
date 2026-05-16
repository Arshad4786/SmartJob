import React, { useState, useEffect, useRef } from 'react';
import { recommendJobs, refineRecommendations, healthCheck } from './services/api';
import './App.css';

interface CandidateInfo {
  name: string | null;
  skills: string[];
  experience_years: number | null;
  preferred_roles: string[];
  education: string | null;
}

interface JobMatch {
  id: number;
  title: string;
  company: string;
  similarity_score: number;
  explanation: string;
}

interface RecommendationResponse {
  candidate: CandidateInfo;
  ranked_jobs: JobMatch[];
  clarifying_question: string;
}

interface RefineResponse {
  ranked_jobs: JobMatch[];
  reasoning: string;
}

interface HealthStatus {
  status: string;
  message: string;
}

// ── Nav links ──────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features',     href: '#features' },
  { label: 'Match Now',    href: '#match' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const Badge = ({ text, color = 'blue' }: { text: string; color?: 'blue' | 'purple' | 'green' | 'gray' }) => {
  const colors = {
    blue:   'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    gray:   'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[color]} mr-2 mb-2 inline-block`}>
      {text}
    </span>
  );
};

const ScoreRing = ({ pct }: { pct: number }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct > 80 ? '#10b981' : pct > 60 ? '#f59e0b' : '#94a3b8';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
      />
      <text x="36" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
function App() {
  const [resumeText, setResumeText]         = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [isUploading, setIsUploading]       = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [error, setError]                   = useState('');
  const [healthStatus, setHealthStatus]     = useState<HealthStatus | null>(null);
  const [refining, setRefining]             = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [scrolled, setScrolled]             = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const matchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const checkHealth = async () => {
    try {
      const result = await healthCheck();
      setHealthStatus(result);
    } catch {
      setHealthStatus({ status: 'error', message: 'API is not reachable' });
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('https://llm-project-ten-henna.vercel.app/extract-text', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) setResumeText(data.text);
      else setError(data.detail || 'Failed to extract text from PDF');
    } catch {
      setError('Network error while uploading file. Is the backend running?');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRecommend = async () => {
    if (!resumeText.trim()) { setError('Please enter your resume text or upload a PDF'); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await recommendJobs(resumeText);
      setRecommendations(result);
      setTimeout(() => matchRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while processing your resume');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!recommendations?.clarifying_question) { setError('No clarifying question available'); return; }
    setRefining(true);
    try {
      const result = await refineRecommendations(resumeText, recommendations.clarifying_question, candidateAnswer);
      setRecommendations(prev => prev ? { ...prev, ranked_jobs: result.ranked_jobs } : null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while refining recommendations');
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800 font-sans selection:bg-indigo-100">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <a href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-[15px]">
              Smart<span className="text-indigo-600">Job</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA + Status */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className={`relative flex h-2 w-2`}>
                {healthStatus?.status === 'healthy' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus?.status === 'healthy' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </span>
              <span className="text-slate-500">{healthStatus?.status === 'healthy' ? 'API Online' : 'Connecting…'}</span>
            </div>
            <a href="#match"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              Try Free →
            </a>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1 shadow-lg">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                {l.label}
              </a>
            ))}
            <a href="#match" onClick={() => setMobileOpen(false)}
              className="block mt-2 text-center bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
              Try Free →
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-100/60 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl" />
          <div className="absolute top-40 left-0 w-60 h-60 bg-sky-100/40 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-white border border-indigo-100 rounded-full px-4 py-1.5 mb-8 shadow-sm text-xs font-semibold text-indigo-600">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span>AI-Powered Semantic Matching</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.08]">
            Find jobs that{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500">actually fit</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 200 6" preserveAspectRatio="none">
                <path d="M0,5 Q50,0 100,5 Q150,10 200,5" stroke="url(#ul)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <defs><linearGradient id="ul" x1="0" x2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs>
              </svg>
            </span>
            {' '}your profile
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Upload your resume and our AI agent extracts your semantic embeddings to surface the highest-signal roles — ranked by fit, not keywords.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#match"
              className="group inline-flex items-center space-x-2 bg-indigo-600 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-indigo-700 transition-all hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 text-sm">
              <span>Start Matching</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 font-semibold px-7 py-3.5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
              </svg>
              <span>View Source</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ),
                title: 'Upload Resume',
                desc: 'Drag in your PDF or paste raw text. Our parser extracts structured data — skills, tenure, education — in seconds.',
              },
              {
                step: '02',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'AI Analysis',
                desc: 'Semantic embeddings map your profile to a high-dimensional vector space and find the closest job openings by cosine similarity.',
              },
              {
                step: '03',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
                title: 'Ranked Matches',
                desc: 'Get a curated shortlist with match scores and plain-English explanations. Refine with a quick Q&A to sharpen results.',
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative p-8 rounded-2xl bg-[#F7F9FC] border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all group">
                <div className="absolute top-6 right-6 text-5xl font-black text-slate-100 group-hover:text-indigo-50 transition-colors select-none">{step}</div>
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-5 shadow-md shadow-indigo-200">
                  {icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Everything you need</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { color: 'from-indigo-500 to-violet-500', label: 'Semantic Matching', desc: 'Vector-space embeddings understand meaning, not just keywords.' },
              { color: 'from-sky-500 to-cyan-400',     label: 'PDF Extraction',    desc: 'Native PDF parsing — just drag and drop your existing resume.' },
              { color: 'from-emerald-500 to-teal-400', label: 'Match Scores',      desc: 'Every role ranked with a transparent similarity percentage.' },
              { color: 'from-amber-500 to-orange-400', label: 'AI Q&A Refine',     desc: 'One clarifying question tightens results to your real goal.' },
              { color: 'from-pink-500 to-rose-400',    label: 'Skill Detection',   desc: 'Automatically surfaces and categorises your technical stack.' },
              { color: 'from-violet-500 to-purple-500',label: 'Fit Explanations',  desc: 'Plain-English "why it fits" for every matched role.' },
            ].map(({ color, label, desc }) => (
              <div key={label} className="p-6 rounded-2xl bg-white border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${color} mb-4 group-hover:scale-125 transition-transform`} />
                <h4 className="font-bold text-slate-800 mb-1.5 text-sm">{label}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MATCH TOOL ─────────────────────────────────────────────────────── */}
      <section id="match" ref={matchRef} className="py-16 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-3">Ready to match?</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Analyse my resume</h2>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

            {/* Status bar */}
            <div className="flex items-center justify-between px-8 py-4 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 text-xs font-semibold text-slate-600">
                <span className="relative flex h-2.5 w-2.5">
                  {healthStatus?.status === 'healthy' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${healthStatus?.status === 'healthy' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </span>
                <span>{healthStatus?.status === 'healthy' ? 'Systems Operational' : 'Connecting…'}</span>
              </div>
              {recommendations && (
                <button onClick={() => { setRecommendations(null); setCandidateAnswer(''); }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                  ← New Search
                </button>
              )}
            </div>

            {/* Input */}
            {!recommendations && (
              <div className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-10">

                  {/* Upload zone */}
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-1">Upload Resume</h3>
                    <p className="text-sm text-slate-400 mb-5">Drag & drop a PDF or click to browse.</p>
                    <div className="relative flex-1 group rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 hover:bg-indigo-50/40 hover:border-indigo-300 transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer overflow-hidden min-h-[180px]">
                      <input type="file" accept=".pdf" onChange={handleFileUpload}
                        disabled={isUploading || isLoading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`transition-transform duration-300 ${isUploading ? 'scale-110' : 'group-hover:-translate-y-1'}`}>
                        {isUploading ? (
                          <svg className="w-12 h-12 mb-3 text-indigo-500 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <div className="w-12 h-12 mb-3 bg-white rounded-full shadow flex items-center justify-center mx-auto text-indigo-500 group-hover:text-indigo-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{isUploading ? 'Extracting…' : 'Drag & drop or browse'}</p>
                      <p className="text-xs text-slate-400 mt-1">PDF only</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="md:hidden flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-400 px-4 py-1 bg-slate-100 rounded-full">OR</span>
                  </div>

                  {/* Paste */}
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-1">Paste Text</h3>
                    <p className="text-sm text-slate-400 mb-5">Copy–paste your resume content directly.</p>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder={"John Doe\nSoftware Engineer\n\nSkills: Python, React, AWS…"}
                      className="flex-1 w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none font-mono text-sm leading-relaxed text-slate-700 transition-all placeholder:text-slate-300 min-h-[180px]"
                      rows={8}
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-8 flex items-center p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 animate-fade-in">
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="mt-10 max-w-sm mx-auto">
                  <button onClick={handleRecommend}
                    disabled={isLoading || isUploading || !resumeText.trim()}
                    className="w-full relative group overflow-hidden bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-center space-x-2 text-sm">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          <span>Analysing Profile…</span>
                        </>
                      ) : (
                        <>
                          <span>Generate Match Report</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {recommendations && (
              <div className="p-8 md:p-12 animate-fade-in-up">

                {/* Candidate card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-7 mb-10 relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full" />
                  <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-violet-500/10 rounded-full" />
                  <p className="text-xs font-bold tracking-widest uppercase text-indigo-300 mb-4">Candidate Profile</p>
                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div>
                      <p className="text-2xl font-black mb-1">{recommendations.candidate.name || 'Anonymous User'}</p>
                      <p className="text-indigo-300 text-sm font-semibold mb-5">
                        {recommendations.candidate.experience_years !== null
                          ? `${recommendations.candidate.experience_years} Yrs Experience`
                          : 'Entry Level'}
                        {recommendations.candidate.education && <span className="mx-2 opacity-40">•</span>}
                        {recommendations.candidate.education}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 mb-2">Target Roles</p>
                      <div className="flex flex-wrap">
                        {recommendations.candidate.preferred_roles.length > 0
                          ? recommendations.candidate.preferred_roles.map((r, i) => (
                              <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 mr-2 mb-2">{r}</span>
                            ))
                          : <span className="text-slate-500 text-xs">Open to roles</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-2">Detected Skills</p>
                      <div className="flex flex-wrap">
                        {recommendations.candidate.skills.length > 0
                          ? recommendations.candidate.skills.map((s, i) => (
                              <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 text-slate-200 mr-2 mb-2">{s}</span>
                            ))
                          : <span className="text-slate-500 text-xs">No skills parsed</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Q&A */}
                {recommendations.clarifying_question && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-7 mb-10">
                    <div className="flex items-start space-x-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">AI Recruiter</p>
                        <p className="text-slate-800 font-semibold leading-snug">"{recommendations.clarifying_question}"</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={candidateAnswer}
                        onChange={(e) => setCandidateAnswer(e.target.value)}
                        placeholder="Type your answer to refine matches…"
                        className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && !refining && candidateAnswer.trim() && handleRefine()}
                      />
                      <button onClick={handleRefine}
                        disabled={refining || !candidateAnswer.trim()}
                        className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap">
                        {refining ? 'Refining…' : 'Update →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Job list */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Top Matches</h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{recommendations.ranked_jobs.length} roles</span>
                </div>

                <div className="space-y-4">
                  {recommendations.ranked_jobs.length > 0 ? recommendations.ranked_jobs.map((job, index) => {
                    const pct = Math.round(job.similarity_score * 100);
                    return (
                      <div key={job.id} className="group bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center gap-5">

                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{job.title}</h4>
                              <p className="text-sm text-slate-500 font-medium">{job.company}</p>
                            </div>
                          </div>

                          <div className="pl-10 md:pl-0 flex-1">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              <span className="font-semibold text-slate-700">Why it fits: </span>
                              {job.explanation}
                            </p>
                          </div>

                          <div className="pl-10 md:pl-0 flex-shrink-0 flex items-center space-x-3">
                            <ScoreRing pct={pct} />
                            <div className="text-xs text-slate-400 font-semibold hidden lg:block">Match<br/>Score</div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-500 text-sm font-medium">No strict matches found. Try adjusting your resume text.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">

          {/* Top grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-14 border-b border-slate-800">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-extrabold text-white tracking-tight text-[15px]">Smart<span className="text-indigo-400">Job</span></span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 max-w-[200px]">
                AI-powered semantic job matching. Built for the Cantilever AI Engineering Intern Assignment.
              </p>
              <div className="flex items-center space-x-3 mt-5">
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-[#0A66C2] flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="mailto:contact@smartjob.ai"
                  aria-label="Email"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Product</p>
              <ul className="space-y-3 text-sm">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#features"     className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#match"        className="hover:text-white transition-colors">Try Now</a></li>
                <li>
                  <a href="https://fastapi.tiangolo.com/" target="_blank" rel="noopener noreferrer"
                    className="hover:text-white transition-colors">API Docs ↗</a>
                </li>
              </ul>
            </div>

            {/* Tech */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Tech Stack</p>
              <ul className="space-y-3 text-sm">
                <li><a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">React 19 ↗</a></li>
                <li><a href="https://fastapi.tiangolo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">FastAPI ↗</a></li>
                <li><a href="https://huggingface.co/sentence-transformers" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Sentence Transformers ↗</a></li>
                <li><a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Tailwind CSS ↗</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Resources</p>
              <ul className="space-y-3 text-sm">
                <li><a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Source Code ↗</a></li>
                <li><a href="https://cantilever.co/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cantilever ↗</a></li>
                <li><a href="https://arxiv.org/abs/1301.3666" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Research: Word2Vec ↗</a></li>
                <li><a href="mailto:contact@smartjob.ai" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 gap-4">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} SmartJob. Built for the{' '}
              <a href="https://cantilever.co/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">Cantilever</a>{' '}
              AI Engineering Intern Assignment.
            </p>
            <div className="flex items-center space-x-5 text-xs">
              <a href="https://www.privacypolicygenerator.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
              <a href="https://www.termsfeed.com/terms-of-service/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms</a>
              <span className="flex items-center space-x-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span>{healthStatus?.status === 'healthy' ? 'All systems normal' : 'API offline'}</span>
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;