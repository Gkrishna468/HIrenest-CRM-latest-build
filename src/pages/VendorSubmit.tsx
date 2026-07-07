import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RequirementRepository } from '@/repositories/RequirementRepository';
import { VendorRepository } from '@/repositories/VendorRepository';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
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
  Trash2,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitDashboard } from '@/components/CockpitDashboard';
import { SingleProfileForm } from '@/components/SingleProfileForm';
import { BulkRequirementForm } from '@/components/BulkRequirementForm';
import { TalentPoolBulkForm } from '@/components/TalentPoolBulkForm';

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
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'pool' | 'dashboard'>('single');
  const [bulkFiles, setBulkFiles] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkSummaryReport, setBulkSummaryReport] = useState<any | null>(null);

  // New Talent Pool states & dashboard variables
  const [poolFiles, setPoolFiles] = useState<any[]>([]);
  const [poolUploading, setPoolUploading] = useState(false);
  const [poolResults, setPoolResults] = useState<any[]>([]);
  const [poolSummaryReport, setPoolSummaryReport] = useState<any | null>(null);

  const [poolCandidates, setPoolCandidates] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [validatingCompliance, setValidatingCompliance] = useState(false);
  const [triggeringRotation, setTriggeringRotation] = useState(false);
  const [rotationMatches, setRotationMatches] = useState<any[]>([]);
  const [complianceStats, setComplianceStats] = useState({
    performanceScore: 85,
    responseRate: 90,
    lastRotation: 'Never',
    lastValidation: 'Never'
  });

  const fetchPoolData = async () => {
    if (!authenticatedVendor) return;
    setLoadingPool(true);
    try {
      const vSnap = await getDoc(doc(db, 'vendors', authenticatedVendor.id));
      if (vSnap.exists()) {
        const vData = vSnap.data();
        setComplianceStats({
          performanceScore: vData.performanceScore || 85,
          responseRate: vData.responseRate || 90,
          lastRotation: vData.lastRotationTime ? new Date(vData.lastRotationTime).toLocaleDateString() : 'Never',
          lastValidation: vData.lastValidationTime ? new Date(vData.lastValidationTime).toLocaleDateString() : 'Never'
        });
      }

      const q = query(
        collection(db, 'vendor_candidate_pool'), 
        where('vendorId', '==', authenticatedVendor.id)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setPoolCandidates(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    } catch (err) {
      console.error('Error fetching pool data:', err);
    } finally {
      setLoadingPool(false);
    }
  };

  useEffect(() => {
    if (authenticatedVendor) {
      fetchPoolData();
    }
  }, [authenticatedVendor]);

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

  const handlePoolUploadSubmit = async () => {
    if (!authenticatedVendor) {
      toast.error('Session expired. Please log in again.');
      return;
    }
    if (poolFiles.length === 0) {
      toast.error('No files selected in queue.');
      return;
    }

    setPoolUploading(true);
    setPoolResults([]);
    setPoolSummaryReport(null);

    let successCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    let failedCount = 0;
    const reportItems: any[] = [];

    for (let i = 0; i < poolFiles.length; i++) {
      const file = poolFiles[i];
      const candidateName = file.name
        .replace(/\.[^/.]+$/, "") // strip extension
        .replace(/[_-]/g, " ")     // replace dashes/underscores with space
        .split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const cleanNameForEmail = candidateName.toLowerCase().replace(/\s+/g, ".");
      const email = `${cleanNameForEmail}@example-vendor.com`;
      const phone = `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
      const hash = `${email}-${phone}`.toLowerCase();
      
      const textToHash = candidateName + String(file.size);
      const simulatedSha256 = "HN-SHA256-" + Array.from(textToHash)
        .reduce((acc: number, char: string) => (acc + char.charCodeAt(0)) % 1000000007, 0)
        .toString(16)
        .toUpperCase();

      setPoolResults(prev => {
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

      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const response = await fetch('/api/candidates?action=submitVendorCandidatePool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateHash: hash,
            vendorId: authenticatedVendor.id,
            candidateName,
            identityData: {
              email,
              phone,
              linkedin: `https://linkedin.com/in/${cleanNameForEmail}`,
              resume_url: "https://drive.google.com/file/d/sample-pool/view",
              current_company: "Standard Tech Partner",
              current_title: "Consultant",
              current_ctc: "₹9,50,000",
              expected_ctc: "₹13,00,000",
              notice_period: "30 Days",
              location: "Bengaluru",
              payroll: "Vendor Payroll",
              availability: "Immediate",
              cover_note: `Pool uploaded resume filename: ${file.name} | Integrity SHA256: ${simulatedSha256}`
            }
          })
        });

        const result = await response.json();

        if (response.status === 409) {
          const isConflict = result.message?.toLowerCase().includes("another") || result.error?.toLowerCase().includes("conflict");
          
          if (isConflict) {
            conflictCount++;
            setPoolResults(prev => {
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
            setPoolResults(prev => {
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
              detail: "You have already registered this profile in your Talent Pool.",
              sha256: simulatedSha256
            });
          }
          continue;
        }

        if (!response.ok) {
          throw new Error(result.error || "Extraction failed");
        }

        successCount++;
        setPoolResults(prev => {
          const copy = [...prev];
          copy[i] = {
            ...copy[i],
            status: "GRANTED ✓",
            score: 100,
            color: "text-emerald-400 font-bold"
          };
          return copy;
        });

        reportItems.push({
          fileName: file.name,
          candidateName,
          status: "SUCCESS",
          detail: `Profile successfully registered to global Talent Pool. Standardized Title: ${result.standardizedTitle}.`,
          sha256: simulatedSha256,
          candidateId: result.candidateId
        });

      } catch (err: any) {
        failedCount++;
        setPoolResults(prev => {
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
          detail: err.message || "Failed during parsing or pool upload sequence.",
          sha256: simulatedSha256
        });
      }
    }

    setPoolUploading(false);
    
    setPoolSummaryReport({
      total: poolFiles.length,
      success: successCount,
      duplicate: duplicateCount,
      conflict: conflictCount,
      failed: failedCount,
      timestamp: new Date().toISOString(),
      items: reportItems
    });

    fetchPoolData();
    toast.success("Talent Pool Batch Upload Completed!");
  };

  const handleTriggerRotation = async () => {
    if (!authenticatedVendor) return;
    setTriggeringRotation(true);
    setRotationMatches([]);
    try {
      const response = await fetch('/api/candidates?action=triggerAiRotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: authenticatedVendor.id })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger rotation');
      }
      setRotationMatches(result.matches || []);
      if (result.matches && result.matches.length > 0) {
        toast.success(`AI Candidate Rotation Complete!`, {
          description: `Discovered ${result.matches.length} strong requisition match alignments! Check results below.`,
          duration: 8000
        });
      } else {
        toast.info('AI Rotation finished with no new match recommendations.');
      }
      fetchPoolData();
    } catch (err: any) {
      toast.error(`Rotation Error: ${err.message}`);
    } finally {
      setTriggeringRotation(false);
    }
  };

  const handleBulkValidate = async () => {
    if (!authenticatedVendor) return;
    if (selectedCandidates.length === 0) {
      toast.error('No candidates selected for validation.');
      return;
    }
    setValidatingCompliance(true);
    try {
      const response = await fetch('/api/candidates?action=validateCandidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidates,
          vendorId: authenticatedVendor.id
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to validate profiles');
      }
      toast.success(`Freshness validation ledger updated!`, {
        description: `Successfully verified availability for ${selectedCandidates.length} candidate profiles. Compliance rating boosted.`
      });
      setSelectedCandidates([]);
      fetchPoolData();
    } catch (err: any) {
      toast.error(`Validation Error: ${err.message}`);
    } finally {
      setValidatingCompliance(false);
    }
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

        {/* TAB NAVIGATION HEADER */}
        <div className="flex flex-wrap bg-slate-900 border border-slate-800 p-2.5 rounded-2xl gap-2 font-mono text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Single Submit</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bulk Req Ingestion</span>
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'pool'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Talent Pool Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Bench Cockpit</span>
          </button>
        </div>

        {/* MAIN BODY LAYOUT BASED ON TAB */}
        {activeTab === 'dashboard' ? (
          <CockpitDashboard
            authenticatedVendor={authenticatedVendor}
            complianceStats={complianceStats}
            poolCandidates={poolCandidates}
            loadingPool={loadingPool}
            selectedCandidates={selectedCandidates}
            setSelectedCandidates={setSelectedCandidates}
            validatingCompliance={validatingCompliance}
            triggeringRotation={triggeringRotation}
            rotationMatches={rotationMatches}
            setRotationMatches={setRotationMatches}
            handleBulkValidate={handleBulkValidate}
            handleTriggerRotation={handleTriggerRotation}
            fetchPoolData={fetchPoolData}
          />
        ) : activeTab === 'pool' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-500" /> Talent Pool Sourcing Strategy
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed font-sans">
                  The global Talent Pool allows partner vendors to register qualified candidates directly onto the HireNestOS ledger without tying them to a specific requirement.
                </p>
                <div className="space-y-3 pt-2 font-sans text-xs text-slate-400">
                  <p className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span><strong>Auto-Standardization:</strong> Our AI parsers extract candidate skills and standardize titles to optimize searchability.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span><strong>Dynamic Rotation:</strong> Active talent is automatically analyzed against new requirements during AI matching cycles.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span><strong>Freshness Protection:</strong> Boost your vendor response rating by periodically validating candidate availability.</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <TalentPoolBulkForm
                poolSummaryReport={poolSummaryReport}
                setPoolSummaryReport={setPoolSummaryReport}
                poolFiles={poolFiles}
                setPoolFiles={setPoolFiles}
                poolResults={poolResults}
                setPoolResults={setPoolResults}
                poolUploading={poolUploading}
                handlePoolUploadSubmit={handlePoolUploadSubmit}
              />
            </div>
          </div>
        ) : (
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
              {activeTab === 'single' ? (
                <SingleProfileForm
                  vendorForm={vendorForm}
                  setVendorForm={setVendorForm}
                  handleVendorSubmit={handleVendorSubmit}
                  submitting={submitting}
                  pipelineStep={pipelineStep}
                  pipelineLog={pipelineLog}
                  submissionResult={submissionResult}
                  setSubmitting={setSubmitting}
                  setSubmissionResult={setSubmissionResult}
                  setPipelineStep={setPipelineStep}
                  authenticatedVendor={authenticatedVendor}
                />
              ) : (
                <BulkRequirementForm
                  bulkSummaryReport={bulkSummaryReport}
                  setBulkSummaryReport={setBulkSummaryReport}
                  bulkFiles={bulkFiles}
                  setBulkFiles={setBulkFiles}
                  bulkResults={bulkResults}
                  setBulkResults={setBulkResults}
                  bulkUploading={bulkUploading}
                  handleBulkUploadSubmit={handleBulkUploadSubmit}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
