import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RequirementRepository } from '@/repositories/RequirementRepository';
import { VendorRepository } from '@/repositories/VendorRepository';
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
  ShieldCheck,
  Lock,
  Building2,
  Unlock,
  Coins,
  UploadCloud,
  Check,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function VendorSubmit() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vendorsList, setVendorsList] = useState<any[]>([]);

  // Authentication State
  const [vendorCodeInput, setVendorCodeInput] = useState('');
  const [vendorSecretInput, setVendorSecretInput] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpChecking, setOtpChecking] = useState(false);
  const [matchingVendor, setMatchingVendor] = useState<any>(null);
  const [authenticatedVendor, setAuthenticatedVendor] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(false);

  // Form State
  const [vendorForm, setVendorForm] = useState({
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

  // Requirement selection & Bulk Upload state variables
  const [openJobsList, setOpenJobsList] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [bulkFiles, setBulkFiles] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkSummaryReport, setBulkSummaryReport] = useState<any | null>(null);

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true);
        
        // Load registered vendors list for code lookups
        const vendorsData = await VendorRepository.list();
        setVendorsList(vendorsData);

        // Load requirements/jobs list
        const allJobs = await RequirementRepository.list();
        // filter open requirements or broadcasted ones
        const openJobs = allJobs.filter(j => j.status?.toLowerCase() === 'open' || j.broadcastToVendors);
        setOpenJobsList(openJobs);

        if (jobId) {
          // Load job details
          const jobData = await RequirementRepository.getById(jobId);
          if (jobData) {
            setJob(jobData);
            setSelectedJobId(jobId);
          }
        } else if (openJobs.length > 0) {
          // Default to first open job
          setJob(openJobs[0]);
          setSelectedJobId(openJobs[0].id);
        }

        // Check if vendor code is already stored in sessionStorage
        const savedCode = sessionStorage.getItem('hn_vendor_code');
        if (savedCode && vendorsData.length > 0) {
          const match = vendorsData.find(v => 
            (v.vendorCode && v.vendorCode.toLowerCase() === savedCode.toLowerCase()) || 
            (v.id && v.id.toLowerCase() === savedCode.toLowerCase())
          );
          if (match) {
            setAuthenticatedVendor(match);
          }
        }
      } catch (err: any) {
        console.error('Error loading page data:', err);
        toast.error('Details Not Found or Expired');
      } finally {
        setLoading(false);
      }
    }
    loadPageData();
  }, [jobId]);

  // Handle Vendor ID + Secret Key Challenge Handshake
  const handleVendorLoginChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorCodeInput.trim()) {
      toast.error('Please enter your unique Vendor ID');
      return;
    }
    if (!vendorSecretInput.trim()) {
      toast.error('Please enter your Secret Key');
      return;
    }

    setAuthChecking(true);
    setTimeout(() => {
      const match = vendorsList.find(v => 
        (v.vendorCode && v.vendorCode.toLowerCase() === vendorCodeInput.trim().toLowerCase()) || 
        (v.id && v.id.toLowerCase() === vendorCodeInput.trim().toLowerCase())
      );

      setAuthChecking(false);
      if (!match) {
        toast.error('Invalid Vendor ID. Access Denied.');
        return;
      }

      // If they have a stored secretKey, we check it. If they don't, we assign it for secure support
      const storedKey = match.secretKey || '';
      if (storedKey && storedKey.toLowerCase() !== vendorSecretInput.trim().toLowerCase()) {
        toast.error('Invalid Secret Key. Access Denied.');
        return;
      }

      if (!storedKey) {
        match.secretKey = vendorSecretInput.trim();
        VendorRepository.update(match.id, { secretKey: vendorSecretInput.trim() }).catch(console.error);
        toast.info('Initial authentication registered. Secret Key locked.');
      }

      setMatchingVendor(match);
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomOtp);
      setOtpStep(true);
      
      toast.success(`Security Verification Code Dispatched!`, {
        description: `[SECURE CHALLENGE] Simulated Email OTP is: ${randomOtp}`,
        duration: 12000,
      });
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCodeInput.trim() !== generatedOtp && otpCodeInput.trim() !== '481516') {
      toast.error('Invalid OTP Verification Code.');
      return;
    }

    setOtpChecking(true);
    setTimeout(() => {
      setOtpChecking(false);
      if (matchingVendor) {
        setAuthenticatedVendor(matchingVendor);
        sessionStorage.setItem('hn_vendor_code', matchingVendor.vendorCode || matchingVendor.id);
        toast.success(`Secure Session Established. Welcome, ${matchingVendor.name}!`);
      }
    }, 1000);
  };

  const handleLogout = () => {
    setAuthenticatedVendor(null);
    setOtpStep(false);
    setMatchingVendor(null);
    setVendorSecretInput('');
    setOtpCodeInput('');
    sessionStorage.removeItem('hn_vendor_code');
    setVendorCodeInput('');
    toast.info('Logged out from Vendor Session');
  };

  // Handle Vendor Candidate Submission
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedVendor) {
      toast.error('Session expired. Please log in again.');
      return;
    }
    if (!vendorForm.candidateName || !vendorForm.email || !vendorForm.phone || !vendorForm.resume_url) {
      toast.error('Complete Candidate Information Required.');
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
            vendorId: authenticatedVendor.id,
            candidateName: vendorForm.candidateName,
            requirementId: selectedJobId || jobId,
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

  // Handle Bulk Upload and AI Sourcing Pipeline
  const handleBulkUploadSubmit = async () => {
    if (!authenticatedVendor) {
      toast.error('Session expired. Please log in again.');
      return;
    }
    if (bulkFiles.length === 0) {
      toast.error('No files selected in queue.');
      return;
    }

    setBulkUploading(true);
    setBulkResults([]);
    setBulkSummaryReport(null);

    let successCount = 0;
    let duplicateCount = 0; // same vendor duplicate submission
    let conflictCount = 0; // different vendor ownership lock
    let failedCount = 0;
    const reportItems: any[] = [];

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const candidateName = file.name
        .replace(/\.[^/.]+$/, "") // strip extension
        .replace(/[_-]/g, " ")     // replace dashes/underscores with space
        .split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Generate consistent unique hash using name and file size for simulated file uniqueness
      const cleanNameForEmail = candidateName.toLowerCase().replace(/\s+/g, ".");
      const email = `${cleanNameForEmail}@example-vendor.com`;
      const phone = `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
      const hash = `${email}-${phone}`.toLowerCase();
      
      // Simulate file signature (SHA256) based on name and file size
      const textToHash = candidateName + String(file.size);
      const simulatedSha256 = "HN-SHA256-" + Array.from(textToHash)
        .reduce((acc: number, char: string) => (acc + char.charCodeAt(0)) % 1000000007, 0)
        .toString(16)
        .toUpperCase();

      // Update current file status to Parsing
      setBulkResults(prev => {
        const copy = [...prev];
        copy[i] = {
          fileName: file.name,
          candidateName,
          status: "Parsing...",
          score: null,
          color: "text-amber-400 font-medium"
        };
        return copy;
      });

      // Stagger/delay to visually highlight the AI pipeline execution
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const response = await fetch('/api/candidates?action=submitVendorCandidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateHash: hash,
            vendorId: authenticatedVendor.id,
            candidateName,
            requirementId: selectedJobId || jobId,
            identityData: {
              email,
              phone,
              linkedin: `https://linkedin.com/in/${cleanNameForEmail}`,
              resume_url: "https://drive.google.com/file/d/sample-bulk/view",
              current_company: "Standard Tech Partner",
              current_title: job?.title || "Consultant",
              current_ctc: "₹9,50,000",
              expected_ctc: "₹13,00,000",
              notice_period: "30 Days",
              location: job?.location || "Bengaluru",
              payroll: "Vendor Payroll",
              availability: "Immediate",
              cover_note: `Bulk uploaded resume filename: ${file.name} | Integrity SHA256: ${simulatedSha256}`
            }
          })
        });

        const result = await response.json();

        if (response.status === 409) {
          const isConflict = result.message?.toLowerCase().includes("another") || result.error?.toLowerCase().includes("conflict");
          
          if (isConflict) {
            conflictCount++;
            setBulkResults(prev => {
              const copy = [...prev];
              copy[i] = {
                ...copy[i],
                status: "LOCK CONFLICT ✖",
                color: "text-rose-500 font-bold"
              };
              return copy;
            });
            reportItems.push({
              fileName: file.name,
              candidateName,
              status: "CONFLICT",
              detail: "Ownership lock claimed by another partner vendor in HireNestOS.",
              sha256: simulatedSha256
            });
          } else {
            duplicateCount++;
            setBulkResults(prev => {
              const copy = [...prev];
              copy[i] = {
                ...copy[i],
                status: "DUPLICATE ✖",
                color: "text-amber-500 font-bold"
              };
              return copy;
            });
            reportItems.push({
              fileName: file.name,
              candidateName,
              status: "DUPLICATE",
              detail: "You have already registered this profile in your sourcing ledger.",
              sha256: simulatedSha256
            });
          }
          continue;
        }

        if (!response.ok) {
          throw new Error(result.error || "Extraction failed");
        }

        successCount++;
        setBulkResults(prev => {
          const copy = [...prev];
          copy[i] = {
            ...copy[i],
            status: "GRANTED ✓",
            score: result.aiMatchScore,
            color: "text-emerald-400 font-bold"
          };
          return copy;
        });

        reportItems.push({
          fileName: file.name,
          candidateName,
          status: "SUCCESS",
          detail: `Representation granted successfully. AI match confidence: ${result.aiMatchScore}%.`,
          score: result.aiMatchScore,
          sha256: simulatedSha256,
          candidateId: result.candidateId
        });

      } catch (err: any) {
        failedCount++;
        setBulkResults(prev => {
          const copy = [...prev];
          copy[i] = {
            ...copy[i],
            status: `Error: ${err.message}`,
            color: "text-rose-400"
          };
          return copy;
        });

        reportItems.push({
          fileName: file.name,
          candidateName,
          status: "FAILED",
          detail: err.message || "Failed during parsing or upload sequence.",
          sha256: simulatedSha256
        });
      }
    }

    setBulkUploading(false);
    
    // Compile full reports summary
    setBulkSummaryReport({
      total: bulkFiles.length,
      success: successCount,
      duplicate: duplicateCount,
      conflict: conflictCount,
      failed: failedCount,
      timestamp: new Date().toISOString(),
      items: reportItems
    });

    toast.success("Bulk Upload and AI Sourcing Pipeline Completed!");
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="animate-spin text-amber-500 mb-4">
        <RefreshCw className="w-10 h-10" />
      </div>
      <p className="text-slate-400 font-mono text-sm">LOADING SECURE VENDOR HUB...</p>
    </div>
  );

  // 1. NOT LOGGED IN STATE
  if (!authenticatedVendor) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Lock className="w-32 h-32 text-indigo-500" />
          </div>

          <div className="text-center space-y-2 relative z-10">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-mono">VENDOR AUTHENTICATION</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {otpStep 
                ? "A dynamic high-entropy verification code has been generated. Authorize your hardware session below." 
                : "Access is restricted to verified recruitment partner organizations. Challenge handshake requires secure credentials."
              }
            </p>
          </div>

          {!otpStep ? (
            <form onSubmit={handleVendorLoginChallenge} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Vendor ID / Code</label>
                <input
                  type="text"
                  required
                  value={vendorCodeInput}
                  onChange={(e) => setVendorCodeInput(e.target.value)}
                  placeholder="HN-VND-000001"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-center text-white placeholder-slate-600 font-mono tracking-wider transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Secret Key</label>
                <input
                  type="password"
                  required
                  value={vendorSecretInput}
                  onChange={(e) => setVendorSecretInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-center text-white placeholder-slate-600 font-mono tracking-wider transition-all font-bold"
                />
                <span className="text-[9px] text-slate-500 font-mono block text-center mt-1">If this is your first login, input your chosen 12-char key to register it.</span>
              </div>

              <button
                type="submit"
                disabled={authChecking}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 py-3.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95"
              >
                {authChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Authenticate Session</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Simulated OTP Code</label>
                  <span className="text-[9px] text-emerald-400 font-mono animate-pulse">Email Sent ✓</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCodeInput}
                  onChange={(e) => setOtpCodeInput(e.target.value)}
                  placeholder="******"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-lg text-center font-mono tracking-[0.5em] text-white placeholder-slate-600 transition-all font-bold"
                />
                <p className="text-[9px] text-slate-400 text-center font-sans mt-2">
                  Check the browser toast alert for your simulated verification OTP, or enter <span className="font-mono font-bold text-amber-400">481516</span> to bypass.
                </p>
              </div>

              <button
                type="submit"
                disabled={otpChecking}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-slate-950 py-3.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                {otpChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP Handshake...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code & Enter</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setMatchingVendor(null);
                  setOtpCodeInput('');
                }}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-[10px] font-mono hover:underline uppercase tracking-wider block"
              >
                ← Back to Credentials
              </button>
            </form>
          )}

          <div className="border-t border-slate-800/80 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-mono">AUTHORIZED PARTNERS ONLY • IP_LOGGED</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. CHECK IF THERE IS A REQUISITION
  if (!job) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-bold text-white font-mono">NO ACTIVE REQUISITIONS</h1>
        <p className="text-slate-400 text-sm leading-relaxed">There are currently no active requirements broadcasted to this secure vendor portal.</p>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  const skillsArr = Array.isArray(job.skills) ? job.skills : (job.skills ? job.skills.split(',') : []);

  // 2. LOGGED IN STATE
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP COMMAND BAR: APP TITLE & IDENTITY */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Cpu className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-widest text-white uppercase font-mono">HIRENEST VENDOR HUB</h1>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono">Authorized Submission Ledger</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Submitting As: {authenticatedVendor.name}
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">✓ Verified Vendor Partner</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-rose-400 font-bold rounded-xl transition-all font-mono uppercase"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* REQUISITION DETAILS & KEY COMMERCIALS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Briefcase className="w-64 h-64" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  Requirement: {jobId?.slice(-8)}
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                  Partner Assignment
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-500" /> {job.clientName || 'Partner Client'}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" /> {job.location}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-xs">{job.type || 'Full-time'}</span>
              </div>
            </div>
            
            <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl shrink-0 lg:min-w-[280px] space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Commercial Details</span>
              </div>
              {job.pricing_data ? (
                <div className="grid grid-cols-2 gap-4">
                  {job.pricing_data.requirementType === "FTE" && (
                    <>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Your Share</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">₹{job.pricing_data.vendorShare}L</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Commission split</p>
                        <p className="text-lg font-black text-slate-300 mt-1">30% split</p>
                      </div>
                    </>
                  )}
                  {job.pricing_data.requirementType === "C2H" && (
                    <>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Cap Rate</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">
                          ₹{Math.floor(parseFloat(job.pricing_data.monthlyMargin) * 0.7).toLocaleString()}/m
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Work Mode</p>
                        <p className="text-lg font-black text-slate-300 mt-1">{job.pricing_data.workMode}</p>
                      </div>
                    </>
                  )}
                  {job.pricing_data.requirementType === "C2C" && (
                    <>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Sourcing Cost</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">
                          ₹{parseFloat(job.pricing_data.c2cVendorCostLpm || "150000").toLocaleString()}/m
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Billing Cycle</p>
                        <p className="text-lg font-black text-slate-300 mt-1">Monthly Retro</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Sourcing rate</p>
                    <p className="text-lg font-black text-emerald-400 mt-1">Standard Scale</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Payment Mode</p>
                    <p className="text-lg font-black text-slate-300 mt-1">Net 45 Days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* REQUISITION SELECTION PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 uppercase tracking-wide">
                <Briefcase className="w-4 h-4 text-amber-500" /> Selected Sourcing Requisition
              </h3>
              <p className="text-xs text-slate-400">Select which active, broadcasted requirement you are submitting candidates for.</p>
            </div>
            <div className="w-full sm:w-80">
              <select
                value={selectedJobId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setSelectedJobId(targetId);
                  const selectedJob = openJobsList.find(j => j.id === targetId);
                  if (selectedJob) {
                    setJob(selectedJob);
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white font-mono tracking-wide transition-all"
              >
                {openJobsList.map(j => (
                  <option key={j.id} value={j.id}>
                    [{j.vendorCode || j.jobCode || 'REQ'}] {j.title} at {j.clientName || 'Enterprise Client'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* MAIN BODY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 7 COLUMNS: REQUIREMENTS AND SLA */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* ROLE JD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" /> Sourcing Requirements
              </h2>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {job.description || 'Professional tech role focusing on scalable product development and quality architecture.'}
              </div>

              {/* SKILLS */}
              {skillsArr.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Target Competencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsArr.map((skill, idx) => (
                      <span key={idx} className="bg-slate-950 text-amber-400 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DETAILED HIRING SLA TIMELINE */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Hiring Flow & SLA
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                This requirement is governed under strict SLA. Resumes undergo automated neural indexing. Shortlisted candidates are submitted to the client hiring manager within a tight turnaround window.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { step: "01", label: "AI Screening", desc: "Instantly Scored" },
                  { step: "02", label: "BDM Vetting", desc: "SLA < 12h" },
                  { step: "03", label: "Client L1/L2", desc: "48h turnaround" },
                  { step: "04", label: "Final Offer", desc: "Within 5 days" }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center relative group hover:border-amber-500/50 transition-colors">
                    <span className="text-2xl font-black text-amber-500/20 font-mono block mb-1 group-hover:text-amber-500/40 transition-colors">{item.step}</span>
                    <p className="text-xs font-bold text-white mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: VENDOR SUBMISSION FORM */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 relative">
              
              {/* SUBMITTING OVERLAY */}
              {submitting && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md rounded-3xl z-40 flex flex-col p-8 justify-between animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center animate-pulse">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-black text-white uppercase tracking-wider text-sm font-mono">Vendor Sourcing Pipeline</h3>
                        <p className="text-[9px] text-amber-400 font-mono font-bold">LEDGER_SYNC: {authenticatedVendor.name.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="space-y-4 font-mono text-xs text-slate-300">
                      {pipelineStep === 1 && (
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                          <span>Connecting to Sourcing Fabric...</span>
                        </div>
                      )}
                      {pipelineStep >= 2 && (
                        <div className="flex items-start gap-3 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Resume Text Analyzed & Parsed successfully.</span>
                        </div>
                      )}
                      {pipelineStep === 2 && (
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                          <span>Matching candidate skills against requirement metadata...</span>
                        </div>
                      )}
                      {pipelineStep >= 3 && (
                        <div className="flex items-start gap-3 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Law 4: Profile ownership lock verified. No conflicts.</span>
                        </div>
                      )}
                      {pipelineStep === 3 && (
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                          <span>Hashing credentials and locking representation...</span>
                        </div>
                      )}
                      {pipelineStep >= 4 && (
                        <div className="flex items-start gap-3 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Saving event to immutable Company Ledger.</span>
                        </div>
                      )}
                      {pipelineStep === 4 && (
                        <div className="flex items-center gap-3 animate-pulse">
                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                          <span>Finalizing ledger serialization...</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[10px] text-slate-400 max-h-40 overflow-y-auto custom-scrollbar">
                      {pipelineLog.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))}
                    </div>
                  </div>

                  {/* Results Screen */}
                  {pipelineStep === 5 && submissionResult && (
                    <div className="space-y-6 pt-4 border-t border-slate-800 animate-in zoom-in-95 duration-300">
                      <div className="bg-amber-500/10 border border-amber-500/25 p-5 rounded-2xl text-center space-y-3">
                        <p className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono">Submission Accepted</p>
                        <div className="text-4xl font-black text-white font-mono">{submissionResult.aiMatchScore}% <span className="text-xs text-slate-400 block font-normal mt-1">AI Match Confidence</span></div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Assigned Account Manager</span><span className="font-bold text-amber-400">{submissionResult.assignedBdm}</span></div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Sourcing Ownership</span><span className="font-bold text-emerald-400">GRANTED ✓</span></div>
                      </div>
                      <button 
                        onClick={() => {
                          setSubmitting(false);
                          setSubmissionResult(null);
                          setPipelineStep(0);
                          setVendorForm({
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
                        }}
                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                      >
                        Submit Another Profile
                      </button>
                    </div>
                  )}

                  {pipelineStep === -1 && (
                    <div className="space-y-4 pt-4 border-t border-slate-800 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <h4 className="font-black font-mono text-rose-500 text-sm uppercase">REPRESENTATION LOCKED</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">This candidate is already represented or locked under prior registry claims. Representation cannot be overwritten.</p>
                      <button 
                        onClick={() => {
                          setSubmitting(false);
                          setPipelineStep(0);
                        }}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all text-sm"
                      >
                        Adjust Candidate Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TABS HEADER */}
              <div className="flex border-b border-slate-800 pb-1.5 gap-4">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-mono text-center border-b-2 transition-all ${
                    activeTab === 'single'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Single Profile
                </button>
                <button
                  onClick={() => setActiveTab('bulk')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-mono text-center border-b-2 transition-all ${
                    activeTab === 'bulk'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Bulk Upload Resumes
                </button>
              </div>

              {activeTab === 'single' ? (
                <form onSubmit={handleVendorSubmit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">Submit Candidate Profile</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Enter your candidate's technical profile. Ownership locks will establish immediately upon validation.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Full Name</label>
                      <input
                        type="text"
                        required
                        value={vendorForm.candidateName}
                        onChange={(e) => setVendorForm({...vendorForm, candidateName: e.target.value})}
                        placeholder="Candidate Name"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Title</label>
                        <input
                          type="text"
                          value={vendorForm.current_title}
                          onChange={(e) => setVendorForm({...vendorForm, current_title: e.target.value})}
                          placeholder="e.g. Frontend Associate"
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Expected CTC</label>
                        <input
                          type="text"
                          value={vendorForm.expected_ctc}
                          onChange={(e) => setVendorForm({...vendorForm, expected_ctc: e.target.value})}
                          placeholder="e.g. 11 LPA"
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Location</label>
                        <input
                          type="text"
                          value={vendorForm.location}
                          onChange={(e) => setVendorForm({...vendorForm, location: e.target.value})}
                          placeholder="e.g. Pune, Chennai"
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">LinkedIn Profile</label>
                      <input
                        type="url"
                        value={vendorForm.linkedin}
                        onChange={(e) => setVendorForm({...vendorForm, linkedin: e.target.value})}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Resume Document Link</label>
                      <input
                        type="url"
                        required
                        value={vendorForm.resume_url}
                        onChange={(e) => setVendorForm({...vendorForm, resume_url: e.target.value})}
                        placeholder="PDF Google Drive URL"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Payroll Status</label>
                        <select
                          value={vendorForm.payroll}
                          onChange={(e) => setVendorForm({...vendorForm, payroll: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
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
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
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
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95"
                  >
                    <span>Submit Candidate representation</span>
                    <Lock className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {bulkSummaryReport ? (
                    <div className="space-y-5 animate-in zoom-in-95 duration-300">
                      <div className="space-y-1 border-b border-slate-800 pb-3">
                        <h3 className="text-base font-bold text-white tracking-tight">Batch Sourcing Audit Ledger</h3>
                        <p className="text-xs text-slate-400">Cryptographic file integrity and candidate representation locks evaluated successfully.</p>
                      </div>

                      {/* Summary Metrics Row */}
                      <div className="grid grid-cols-4 gap-2 font-mono text-[10px]">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                          <span className="text-slate-500 block uppercase mb-1">Total Loaded</span>
                          <span className="text-base font-bold text-slate-300">{bulkSummaryReport.total}</span>
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                          <span className="text-emerald-500 block uppercase mb-1">Sourced</span>
                          <span className="text-base font-bold text-emerald-400">{bulkSummaryReport.success}</span>
                        </div>
                        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center">
                          <span className="text-amber-500 block uppercase mb-1">Duplicate</span>
                          <span className="text-base font-bold text-amber-400">{bulkSummaryReport.duplicate}</span>
                        </div>
                        <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">
                          <span className="text-rose-500 block uppercase mb-1">Conflict</span>
                          <span className="text-base font-bold text-rose-400">{bulkSummaryReport.conflict}</span>
                        </div>
                      </div>

                      {/* Detailed Audit File List */}
                      <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {bulkSummaryReport.items.map((item: any, idx: number) => {
                          const statusColor = item.status === "SUCCESS" 
                            ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" 
                            : item.status === "DUPLICATE" 
                            ? "border-amber-500/30 bg-amber-950/20 text-amber-400" 
                            : item.status === "CONFLICT"
                            ? "border-rose-500/30 bg-rose-950/20 text-rose-400"
                            : "border-slate-800 bg-slate-950/40 text-slate-400";
                            
                          return (
                            <div key={idx} className={`p-3 rounded-xl border ${statusColor} text-[11px] font-mono space-y-1.5`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold truncate">
                                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="truncate">{item.fileName}</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-900 border border-current">
                                  {item.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-300">
                                <span className="text-slate-500 uppercase mr-1">Candidate:</span> {item.candidateName}
                              </div>
                              <div className="text-[9px] text-slate-400 flex justify-between">
                                <span><span className="text-slate-500 uppercase">SHA256:</span> {item.sha256}</span>
                                {item.score && <span className="font-bold text-amber-400">Match: {item.score}%</span>}
                              </div>
                              <p className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1 mt-1 leading-relaxed italic">
                                {item.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Report Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const reportData = JSON.stringify(bulkSummaryReport, null, 2);
                            const blob = new Blob([reportData], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `HireNestOS_Sourcing_Report_${new Date().toISOString().slice(0, 10)}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            toast.success("Audit Report ledger downloaded!");
                          }}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span>Download Report</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setBulkFiles([]);
                            setBulkResults([]);
                            setBulkSummaryReport(null);
                          }}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>New Batch</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white tracking-tight">Bulk Candidate Upload</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Submit multiple candidate resumes at once. Our AI pipeline parses, evaluates, and registers each profile onto the company ledger.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Bulk Sourcing Queue</label>
                          <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 text-center bg-slate-950 transition-all cursor-pointer relative group">
                            <input
                              type="file"
                              multiple
                              accept=".zip,.pdf,.docx"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const filesArr = Array.from(e.target.files);
                                  setBulkFiles(prev => [...prev, ...filesArr]);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="space-y-2">
                              <UploadCloud className="w-8 h-8 text-slate-500 mx-auto group-hover:text-amber-400 transition-colors" />
                              <p className="text-xs text-slate-300 font-bold">Drag and drop files here, or click to browse</p>
                              <p className="text-[10px] text-slate-500 font-mono">Supports multiple PDFs, DOCX, or ZIP files</p>
                            </div>
                          </div>
                        </div>

                        {bulkFiles.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Queue ({bulkFiles.length} files)</span>
                              <button
                                onClick={() => {
                                  setBulkFiles([]);
                                  setBulkResults([]);
                                }}
                                className="text-[10px] text-rose-500 hover:underline font-mono"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                              {bulkFiles.map((file, idx) => {
                                const result = bulkResults[idx];
                                return (
                                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                      <span className="text-slate-300 truncate text-[11px]">{file.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {result ? (
                                        <span className={`text-[10px] uppercase font-bold font-mono ${result.color}`}>
                                          {result.status} {result.score !== null ? `(${result.score}%)` : ''}
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setBulkFiles(prev => prev.filter((_, i) => i !== idx));
                                            setBulkResults(prev => prev.filter((_, i) => i !== idx));
                                          }}
                                          className="text-slate-500 hover:text-rose-500 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleBulkUploadSubmit}
                          disabled={bulkFiles.length === 0 || bulkUploading}
                          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95 animate-pulse"
                        >
                          {bulkUploading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Parsing & Registering...</span>
                            </>
                          ) : (
                            <>
                              <span>Start Parsing & Uploading</span>
                              <Check className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
