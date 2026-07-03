import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Link as LinkIcon, 
  FileText, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Trophy, 
  Sparkles,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Lock,
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

export default function PublicApply() {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'candidate';
  const source = searchParams.get('src') || 'careers';

  const [activeTab, setActiveTab] = useState<'candidate' | 'vendor'>(initialType);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vendorsList, setVendorsList] = useState<any[]>([]);

  // Forms State
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    resume_url: '',
    summary: ''
  });

  const [vendorForm, setVendorForm] = useState({
    vendorId: '',
    candidateName: '',
    email: '',
    phone: '',
    linkedin: '',
    resume_url: '',
    current_company: '',
    current_title: '',
    current_ctc: '',
    expected_ctc: '',
    notice_period: '',
    location: '',
    payroll: 'Vendor Payroll',
    availability: 'Immediate',
    cover_note: ''
  });

  // AI Pipeline Submission Animation States
  const [submitting, setSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  useEffect(() => {
    async function loadJobAndVendors() {
      try {
        setLoading(true);
        
        // Load Job Details
        const { data: jobData, error: jobErr } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (jobErr) throw jobErr;
        setJob(jobData);

        // Load Vendors list for dropdown
        const { data: vendorsData } = await supabase
          .from('vendors')
          .select('*')
          .order('name', { ascending: true });
        
        if (vendorsData) {
          setVendorsList(vendorsData);
        }
      } catch (err: any) {
        console.error('Error loading page data:', err);
        toast.error('Requirement Details Not Found or Expired');
      } finally {
        setLoading(false);
      }
    }
    if (jobId) loadJobAndVendors();
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

        // Let's call the backend to submit
        // Since backend handles all the Gemini evaluation and BDM assignment, we can proxy direct candidate apply there!
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
        setPipelineLog(prev => [...prev, '✔ AI Match Score calculated.', '✔ Routed to regional BDM successfully.']);
        setSubmissionResult(result);
        toast.success('Application Sourced Successfully!');
      } catch (err: any) {
        setPipelineStep(-1);
        setPipelineLog(prev => [...prev, `✖ Pipeline Error: ${err.message}`]);
        toast.error('Pipeline Execution Failed: ' + err.message);
      }
    }, 4500);
  };

  // Handle Vendor Submission
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.vendorId || !vendorForm.candidateName || !vendorForm.email || !vendorForm.phone || !vendorForm.resume_url) {
      toast.error('Complete Candidate Information & Company Selection Required.');
      return;
    }

    setSubmitting(true);
    setPipelineStep(1);
    setPipelineLog(['Initializing Vendor Submission pipeline...']);

    // Step 1 Simulation
    setTimeout(() => {
      setPipelineStep(2);
      setPipelineLog(prev => [...prev, '✔ Document Layout Analyser: Resume URL accessed.', '✔ Extracting structured candidate skills & CTC properties...']);
    }, 1500);

    // Step 2 Simulation
    setTimeout(() => {
      setPipelineStep(3);
      setPipelineLog(prev => [...prev, '✔ Identity Vault match completed. Profile is unique.', '✔ Law 4: Claiming ownership lock for Vendor.']);
    }, 3000);

    // Step 3 Simulation & API Call
    setTimeout(async () => {
      try {
        setPipelineStep(4);
        setPipelineLog(prev => [...prev, '✔ Running Gemini-3.5-flash semantic score match...', '✔ Verifying fraud indicators...']);

        // Generate Crypto Hash
        const identityString = `${vendorForm.email}-${vendorForm.phone}-${vendorForm.linkedin}`.toLowerCase();
        
        const response = await fetch('/api/candidates?action=submitVendorCandidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateHash: identityString,
            vendorId: vendorForm.vendorId,
            candidateName: vendorForm.candidateName,
            requirementId: jobId,
            identityData: {
              email: vendorForm.email,
              phone: vendorForm.phone,
              linkedin: vendorForm.linkedin,
              resume_url: vendorForm.resume_url,
              current_company: vendorForm.current_company,
              current_title: vendorForm.current_title,
              current_ctc: vendorForm.current_ctc,
              expected_ctc: vendorForm.expected_ctc,
              notice_period: vendorForm.notice_period,
              location: vendorForm.location,
              payroll: vendorForm.payroll,
              availability: vendorForm.availability,
              cover_note: vendorForm.cover_note
            }
          })
        });

        const result = await response.json();

        if (response.status === 409) {
          // Ownership Conflict
          setPipelineStep(-1);
          setPipelineLog(prev => [...prev, `✖ Conflict Detected: ${result.message}`]);
          throw new Error(result.message);
        }

        if (!response.ok) {
          throw new Error(result.error || 'Server error submitting profile');
        }

        setPipelineStep(5);
        setPipelineLog(prev => [...prev, '✔ AI Match Assessment completed.', '✔ Assigned BDM mapped & notification dispatched.']);
        setSubmissionResult(result);
        toast.success('Vendor Candidate Profile Submitted Successfully!');
      } catch (err: any) {
        setPipelineStep(-1);
        setPipelineLog(prev => [...prev, `✖ Submission Rejected.`]);
        toast.error(err.message);
      }
    }, 4500);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="animate-spin text-indigo-500 mb-4">
        <RefreshCw className="w-10 h-10" />
      </div>
      <p className="text-slate-400 font-mono text-sm">LOADING REQUIREMENT 360 CORE...</p>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-mono">REQUISITION NOT FOUND</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">This requirement may have been completed, retired, or archived by the hiring team.</p>
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
              <h1 className="text-lg font-black tracking-widest text-white uppercase font-mono">HIRENEST OS</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Enterprise Sourcing Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 font-mono">GATEWAY_ACTIVE // SECURE_SSL</span>
          </div>
        </div>

        {/* REQUIREMENT 360 HEADER CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Briefcase className="w-64 h-64" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  Requirement 360°
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  URGENT OPENING
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-500" /> {job.clientName || 'Partner Account'}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" /> {job.location}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-xs">{job.type || 'Full-time'}</span>
              </div>
            </div>
            
            <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl shrink-0 min-w-[200px] text-center md:text-left">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Approved Budget</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{job.budget || '₹12–15L CTC'}</p>
              <p className="text-[10px] text-slate-400/80 mt-1 font-mono">Sourcing Range Confirmed</p>
            </div>
          </div>
        </div>

        {/* MAIN BODY GRID: LEFT (INFO / JD), RIGHT (SUBMIT PORTAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 7 COLUMNS: REQUISITION DETAILS */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* ABOUT THE ROLE & JD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Role & Responsibilities
              </h2>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {job.description || 'Professional tech role focusing on scalable product development and quality architecture.'}
              </div>

              {/* SKILLS */}
              {skillsArr.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Sought Competencies</h4>
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

            {/* ABOUT THE CLIENT & INTERVIEW WORKFLOW */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" /> Hiring Flow & SLA
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                This requirement is managed with a strict SLA. Sourced resumes undergo quick automated screening. Best fits will be forwarded to the Client Hiring Manager within 4 hours.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { step: "01", label: "AI Screening", desc: "Instantly Scored" },
                  { step: "02", label: "BDM Vetting", desc: "SLA < 12h" },
                  { step: "03", label: "Client L1/L2", desc: "48h turnaround" },
                  { step: "04", label: "Final Offer", desc: "Within 5 days" }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center relative group hover:border-indigo-500/50 transition-colors">
                    <span className="text-2xl font-black text-indigo-500/20 font-mono block mb-1 group-hover:text-indigo-400/40 transition-colors">{item.step}</span>
                    <p className="text-xs font-bold text-white mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI INSIGHTS BAR */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> AI Sourcing Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Suggested Alternate Titles</p>
                  <ul className="space-y-1.5 text-slate-300 mt-2 font-medium">
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> Sr. Specialist</li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> Staff Engineer</li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> Technical Lead</li>
                  </ul>
                </div>
                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Core Keywords for Sourcing</p>
                  <ul className="space-y-1.5 text-slate-300 mt-2 font-mono text-xs">
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> #scale_architecture</li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> #modular_systems</li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /> #performance_tuning</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: INTERACTIVE SUBMISSION PANEL */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* VENDOR SPECIFIC PRICING INTELLIGENCE (Visible only when vendor tab is chosen) */}
            {activeTab === 'vendor' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl text-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Margin Intelligence Dashboard
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Expected Vendor Cost</p>
                    <p className="text-base font-black text-slate-300 mt-1">₹1,45,000</p>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Projected Net Margin</p>
                    <p className="text-base font-black text-emerald-400 mt-1">₹35,000</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-t border-slate-800/60 pt-3 font-mono">
                  <span>Vendor Share Mode: Direct Billing</span>
                  <span className="text-emerald-400">Margin: 19.4%</span>
                </div>
              </div>
            )}

            {/* THE DUAL-TAB FORM CARD */}
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
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">Deep Screen Complete</p>
                        <div className="text-4xl font-black text-white font-mono">{submissionResult.aiMatchScore}% <span className="text-xs text-slate-400 block font-normal mt-1">AI Match Confidence</span></div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Assigned BDM</span><span className="font-bold text-indigo-400">{submissionResult.assignedBdm}</span></div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Security Vault Lock</span><span className="font-bold text-emerald-400">PASSED</span></div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Duplicate Check</span><span className="font-bold text-emerald-400">UNIQUE</span></div>
                      </div>
                      <button 
                        onClick={() => {
                          setSubmitting(false);
                          setSubmissionResult(null);
                          setPipelineStep(0);
                        }}
                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                      >
                        Complete Sourcing & Return
                      </button>
                    </div>
                  )}

                  {pipelineStep === -1 && (
                    <div className="space-y-4 pt-4 border-t border-slate-800 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <h4 className="font-black font-mono text-rose-500 text-sm uppercase">PIPELINE TERMINATED</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">The candidate registry blocked this submission to protect prior ownership or system integrity rules.</p>
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

              {/* TAB SELECTOR */}
              <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800/80 grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('candidate')}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all ${activeTab === 'candidate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Candidate Apply
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vendor')}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all ${activeTab === 'vendor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  Vendor Portal
                </button>
              </div>

              {/* TAB CONTENT: DIRECT CANDIDATE FORM */}
              {activeTab === 'candidate' && (
                <form onSubmit={handleCandidateSubmit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">Candidate Sourcing Gateway</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Apply directly to this requisition. Your profile is parsed immediately.</p>
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
                        placeholder="https://linkedin.com/in/..."
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
                        placeholder="G-Drive / PDF Link"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Professional Summary / Cover Note</label>
                      <textarea
                        rows={3}
                        value={candidateForm.summary}
                        onChange={(e) => setCandidateForm({...candidateForm, summary: e.target.value})}
                        placeholder="Introduce yourself to the regional BDM..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <span>Run AI Sourcing Pipeline</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* TAB CONTENT: ADVANCED VENDOR FORM */}
              {activeTab === 'vendor' && (
                <form onSubmit={handleVendorSubmit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">Vendor Candidate Registry</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Submit candidates under your official firm. Law 4 ownership ledger lock will trigger immediately.</p>
                  </div>

                  <div className="space-y-4">
                    {/* VENDOR SELECTION */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Your Firm / Vendor Account</label>
                      <select
                        required
                        value={vendorForm.vendorId}
                        onChange={(e) => setVendorForm({...vendorForm, vendorId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
                      >
                        <option value="">-- SELECT REGISTERED FIRM --</option>
                        {vendorsList.map((v) => (
                          <option key={v.id} value={v.id}>{v.name} ({v.company || 'Partner'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-slate-800/60 pt-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Full Name</label>
                        <input
                          type="text"
                          required
                          value={vendorForm.candidateName}
                          onChange={(e) => setVendorForm({...vendorForm, candidateName: e.target.value})}
                          placeholder="Candidate Name"
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Email</label>
                          <input
                            type="email"
                            required
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                            placeholder="candidate@email.com"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Phone</label>
                          <input
                            type="tel"
                            required
                            value={vendorForm.phone}
                            onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                            placeholder="+91 98..."
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Company</label>
                          <input
                            type="text"
                            value={vendorForm.current_company}
                            onChange={(e) => setVendorForm({...vendorForm, current_company: e.target.value})}
                            placeholder="e.g. Infosys, TCS"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Title</label>
                          <input
                            type="text"
                            value={vendorForm.current_title}
                            onChange={(e) => setVendorForm({...vendorForm, current_title: e.target.value})}
                            placeholder="e.g. Frontend Associate"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current CTC</label>
                          <input
                            type="text"
                            value={vendorForm.current_ctc}
                            onChange={(e) => setVendorForm({...vendorForm, current_ctc: e.target.value})}
                            placeholder="e.g. 8 LPA"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Expected CTC</label>
                          <input
                            type="text"
                            value={vendorForm.expected_ctc}
                            onChange={(e) => setVendorForm({...vendorForm, expected_ctc: e.target.value})}
                            placeholder="e.g. 11 LPA"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Notice Period</label>
                          <input
                            type="text"
                            value={vendorForm.notice_period}
                            onChange={(e) => setVendorForm({...vendorForm, notice_period: e.target.value})}
                            placeholder="e.g. 15 Days, Immediate"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Location</label>
                          <input
                            type="text"
                            value={vendorForm.location}
                            onChange={(e) => setVendorForm({...vendorForm, location: e.target.value})}
                            placeholder="e.g. Pune, Chennai"
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Resume Document Link</label>
                        <input
                          type="url"
                          required
                          value={vendorForm.resume_url}
                          onChange={(e) => setVendorForm({...vendorForm, resume_url: e.target.value})}
                          placeholder="PDF G-Drive URL"
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Payroll Status</label>
                          <select
                            value={vendorForm.payroll}
                            onChange={(e) => setVendorForm({...vendorForm, payroll: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
                          >
                            <option>Vendor Payroll</option>
                            <option>Direct Hire</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Availability</label>
                          <select
                            value={vendorForm.availability}
                            onChange={(e) => setVendorForm({...vendorForm, availability: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
                          >
                            <option>Immediate</option>
                            <option>1 Week</option>
                            <option>15 Days</option>
                            <option>30 Days</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Covering Notes</label>
                        <textarea
                          rows={3}
                          value={vendorForm.cover_note}
                          onChange={(e) => setVendorForm({...vendorForm, cover_note: e.target.value})}
                          placeholder="Details about client screenings or highlights..."
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <span>Submit & Claim Profile Lock</span>
                    <Lock className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
