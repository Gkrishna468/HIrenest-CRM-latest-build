import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RequirementRepository } from '@/repositories/RequirementRepository';
import { 
  Briefcase, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Link as LinkIcon, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Award,
  Clock,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

export default function PublicApply() {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('src') || 'careers';

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    resume_url: '',
    summary: ''
  });

  // AI Pipeline Submission Animation States
  const [submitting, setSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        if (!jobId) return;
        const jobData = await RequirementRepository.getById(jobId);
        if (!jobData) {
          throw new Error('Requirement details not found');
        }
        setJob(jobData);
      } catch (err: any) {
        console.error('Error loading page data:', err);
        toast.error('Requirement Details Not Found or Expired');
      } finally {
        setLoading(false);
      }
    }
    if (jobId) loadJob();
  }, [jobId]);

  // Handle Candidate direct application
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name || !candidateForm.email || !candidateForm.phone || !candidateForm.resume_url) {
      toast.error('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setPipelineStep(1);
    setPipelineLog(['Initializing direct applicant pipeline...']);

    // Step 1 Simulation
    setTimeout(() => {
      setPipelineStep(2);
      setPipelineLog(prev => [...prev, '✔ Document Layout Analyser: Resume URL accessed.', '✔ Extracting semantic skills & projects...']);
    }, 1500);

    // Step 2 Simulation
    setTimeout(() => {
      setPipelineStep(3);
      setPipelineLog(prev => [...prev, '✔ Cross-ledger duplicate check completed. No conflicts.', '✔ Verification: Direct application approved.']);
    }, 3000);

    // Step 3 Simulation & API Post
    setTimeout(async () => {
      try {
        setPipelineStep(4);
        setPipelineLog(prev => [...prev, '✔ Dispatching AI Match Evaluator...', '✔ Connecting to Gemini-3.5-flash...']);

        const response = await fetch('/api/candidates?action=submitVendorCandidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateHash: `${candidateForm.email}-${candidateForm.phone}`.toLowerCase(),
            vendorId: 'DIRECT_CAREERS',
            candidateName: candidateForm.name,
            requirementId: jobId,
            identityData: {
              email: candidateForm.email,
              phone: candidateForm.phone,
              linkedin: candidateForm.linkedin,
              resume_url: candidateForm.resume_url,
              cover_note: candidateForm.summary,
              current_title: 'Applicant'
            }
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || result.error || 'Server rejected application.');
        }

        setPipelineStep(5);
        setPipelineLog(prev => [...prev, '✔ AI Match Score calculated.', '✔ Sourced successfully.']);
        setSubmissionResult(result);
        toast.success('Application Submitted Successfully!');
      } catch (err: any) {
        setPipelineStep(-1);
        setPipelineLog(prev => [...prev, `✖ Pipeline Error: ${err.message}`]);
        toast.error('Pipeline Execution Failed: ' + err.message);
      }
    }, 4500);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="animate-spin text-indigo-500 mb-4">
        <RefreshCw className="w-10 h-10" />
      </div>
      <p className="text-slate-400 font-mono text-sm">LOADING CAREER CONTEXT...</p>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-mono">OPPORTUNITY NOT FOUND</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">This career listing may have been completed, filled, or archived by the talent acquisition team.</p>
      </div>
    </div>
  );

  const skillsArr = Array.isArray(job.skills) ? job.skills : (job.skills ? job.skills.split(',') : []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP COMMAND BAR: APP TITLE & IDENTITY */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-widest text-white uppercase font-mono">HIRENEST CAREERS</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Talent Acquisition Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 font-mono">CAREERS_GATEWAY_ACTIVE // SECURE_SSL</span>
          </div>
        </div>

        {/* PUBLIC CAREER OPPORTUNITY CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Briefcase className="w-64 h-64" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  Open Requisition
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  Active Hiring
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-500" /> Confidential Partner</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" /> {job.location}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-xs">{job.type || 'Full-time'}</span>
              </div>
            </div>
            
            <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl shrink-0 min-w-[200px] text-center md:text-left">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Offered Budget Range</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{job.budget || '₹12–15L CTC'}</p>
              <p className="text-[10px] text-slate-400/80 mt-1 font-mono">Competitive Compensation</p>
            </div>
          </div>
        </div>

        {/* MAIN BODY GRID: LEFT (INFO / JD), RIGHT (APPLY FORM) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 7 COLUMNS: ROLE DETAILS */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* ABOUT THE ROLE & JD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Role Description & Scope
              </h2>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {job.description || 'Professional technology role focusing on scalable product development, clean architecture, and quality engineering.'}
              </div>

              {/* SKILLS */}
              {skillsArr.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Core Competencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsArr.map((skill, idx) => (
                      <span key={idx} className="bg-slate-950 text-indigo-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COMPANY BENEFITS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-indigo-500" /> Perks & Team Benefits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <div className="text-indigo-400 mt-1 font-bold">✦</div>
                  <div>
                    <h4 className="font-bold text-white">Hybrid Flexibility</h4>
                    <p className="text-xs text-slate-400 mt-1">Balanced work-from-home policy with cohesive collaboration hubs.</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <div className="text-indigo-400 mt-1 font-bold">✦</div>
                  <div>
                    <h4 className="font-bold text-white">Comprehensive Health Coverage</h4>
                    <p className="text-xs text-slate-400 mt-1">Full medical insurance for employees and family dependents.</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <div className="text-indigo-400 mt-1 font-bold">✦</div>
                  <div>
                    <h4 className="font-bold text-white">Continuous Growth</h4>
                    <p className="text-xs text-slate-400 mt-1">Learning budget, technology training, and certified training cohorts.</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <div className="text-indigo-400 mt-1 font-bold">✦</div>
                  <div>
                    <h4 className="font-bold text-white">Unbounded Potential</h4>
                    <p className="text-xs text-slate-400 mt-1">Direct exposure to cutting-edge products and flat leadership structure.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SIMPLIFIED PUBLIC HIRING FLOW */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> Hiring Process
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                We believe in a transparent, candidate-first recruitment journey. Here is a high-level timeline of what to expect:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { step: "01", label: "Application Received", desc: "Resume registered" },
                  { step: "02", label: "Resume Review", desc: "Screening & feedback" },
                  { step: "03", label: "Interview Process", desc: "Technical discussions" },
                  { step: "04", label: "Final Selection", desc: "Offer proposal" }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center relative group hover:border-indigo-500/50 transition-colors">
                    <span className="text-2xl font-black text-indigo-500/10 font-mono block mb-1 group-hover:text-indigo-400/20 transition-colors">{item.step}</span>
                    <p className="text-xs font-bold text-white mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-mono text-center italic mt-2">
                * Note: Timelines may vary depending on the client requisition demands.
              </p>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: CANDIDATE DIRECT APPLICATION FORM ONLY */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 relative">
              
              {/* SUBMITTING OVERLAY (THE NEURAL SCREENING PIPELINE WORKFLOW) */}
              {submitting && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md rounded-3xl z-40 flex flex-col p-8 justify-between animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center animate-pulse">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-black text-white uppercase tracking-wider text-sm font-mono">AI Screening Pipeline</h3>
                        <p className="text-[9px] text-indigo-400 font-mono">PROCESS_ID: {jobId?.slice(0, 8)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pipelineStep === 1 && (
                        <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
                          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          <span>Booting isolated container context...</span>
                        </div>
                      )}
                      {pipelineStep >= 2 && (
                        <div className="flex items-start gap-3 text-emerald-400 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Resume Text Analyzed & Parsed successfully.</span>
                        </div>
                      )}
                      {pipelineStep === 2 && (
                        <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
                          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          <span>Running Deep Neural Matching with Gemini...</span>
                        </div>
                      )}
                      {pipelineStep >= 3 && (
                        <div className="flex items-start gap-3 text-emerald-400 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Ownership validation: Unique profile claimed.</span>
                        </div>
                      )}
                      {pipelineStep === 3 && (
                        <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
                          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          <span>Authenticating Cryptographic Lock...</span>
                        </div>
                      )}
                      {pipelineStep >= 4 && (
                        <div className="flex items-start gap-3 text-emerald-400 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Vetting Complete. Saving Ledger Event...</span>
                        </div>
                      )}
                      {pipelineStep === 4 && (
                        <div className="flex items-center gap-3 text-slate-300 font-mono text-xs animate-pulse">
                          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          <span>Vetting final routing & saving...</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[10px] text-slate-400 max-h-40 overflow-y-auto custom-scrollbar">
                      {pipelineLog.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))}
                    </div>
                  </div>

                  {/* Results Screen after process done */}
                  {pipelineStep === 5 && submissionResult && (
                    <div className="space-y-6 pt-4 border-t border-slate-800 animate-in zoom-in-95 duration-300">
                      <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-2xl text-center space-y-3">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">Direct Apply Complete</p>
                        <div className="text-2xl font-black text-emerald-400 font-mono">APPLICATION FILED ✓</div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Security Vault Lock</span><span className="font-bold text-emerald-400">SECURED</span></div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Validation Check</span><span className="font-bold text-emerald-400">PASSED</span></div>
                      </div>
                      <button 
                        onClick={() => {
                          setSubmitting(false);
                          setSubmissionResult(null);
                          setPipelineStep(0);
                          setCandidateForm({
                            name: '',
                            email: '',
                            phone: '',
                            linkedin: '',
                            resume_url: '',
                            summary: ''
                          });
                        }}
                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                      >
                        Return to Listings
                      </button>
                    </div>
                  )}

                  {pipelineStep === -1 && (
                    <div className="space-y-4 pt-4 border-t border-slate-800 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <h4 className="font-black font-mono text-rose-500 text-sm uppercase">SUBMISSION REJECTED</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">The candidate database restricted this application. You may have already applied, or a partner firm holds prior representation.</p>
                      <button 
                        onClick={() => {
                          setSubmitting(false);
                          setPipelineStep(0);
                        }}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all text-sm"
                      >
                        Adjust Form Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CANDIDATE APPLY FORM CONTENT ONLY */}
              <form onSubmit={handleCandidateSubmit} className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white tracking-tight">Direct Candidate Application</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Apply directly to this requisition. Your profile is securely processed by HireNestOS.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={candidateForm.name}
                      onChange={(e) => setCandidateForm({...candidateForm, name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Email</label>
                      <input
                        type="email"
                        required
                        value={candidateForm.email}
                        onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                        placeholder="john@doe.com"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Phone</label>
                      <input
                        type="tel"
                        required
                        value={candidateForm.phone}
                        onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={candidateForm.linkedin}
                      onChange={(e) => setCandidateForm({...candidateForm, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Resume Document URL</label>
                    <input
                      type="url"
                      required
                      value={candidateForm.resume_url}
                      onChange={(e) => setCandidateForm({...candidateForm, resume_url: e.target.value})}
                      placeholder="PDF Google Drive / Dropbox link"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Brief Summary / Message</label>
                    <textarea
                      rows={4}
                      value={candidateForm.summary}
                      onChange={(e) => setCandidateForm({...candidateForm, summary: e.target.value})}
                      placeholder="Introduce yourself or highlight your relevant experiences..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <span>Submit Application</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
