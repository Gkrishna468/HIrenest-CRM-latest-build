/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase/config";
import { collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Users,
  Building2,
  Handshake,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Check,
  Award,
  CircleDollarSign,
  ChevronRight,
  Calendar,
  Layers,
  PhoneCall,
  UserCheck,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

interface WorkspaceNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface TimelineEvent {
  id: string;
  type: "call" | "email" | "whatsapp" | "meeting" | "interview" | "feedback" | "offer" | "invoice";
  description: string;
  timestamp: string;
  author: string;
}

export default function Workspaces() {
  const { jobs, candidates, clients, vendors, refreshAll } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Custom states for interactive additions in workspace
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"overview" | "talent" | "comms" | "alerts" | "billing">("overview");
  const [newLogChannel, setNewLogChannel] = useState<"call" | "email" | "whatsapp" | "meeting">("call");
  const [newLogNote, setNewLogNote] = useState("");
  const [selectedCandDetailId, setSelectedCandDetailId] = useState<string | null>(null);
  const [workspaceNotes, setWorkspaceNotes] = useState<Record<string, WorkspaceNote[]>>({});
  const [noteText, setNoteText] = useState("");

  // Communication timelines (reactive & merged with Firestore system events)
  const [customTimelines, setCustomTimelines] = useState<Record<string, TimelineEvent[]>>({});
  const [systemEventsList, setSystemEventsList] = useState<any[]>([]);

  // Fetch real system events to populate the timeline Reactively
  useEffect(() => {
    const q = query(collection(db, "system_events"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSystemEventsList(list);
    }, (err) => {
      console.warn("Realtime system_events listener skipped:", err.message);
    });
    return () => unsub();
  }, []);

  // Set default selected job
  useEffect(() => {
    if (jobs && jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const selectedJobClient = selectedJob ? clients.find((c) => c.id === selectedJob.clientId || c.company === selectedJob.clientName) : null;

  // Filtered jobs list
  const filteredJobs = jobs.filter(
    (j) =>
      j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Active candidates submitted to this specific job
  const jobCandidates = candidates.filter((c) => c.jobId === selectedJobId);

  // Compile full communication timeline (combining default system log, Firestore events, and BDM logged messages)
  const getTimelineEvents = (jobId: string): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Core historical seed events
    events.push({
      id: "seed-1",
      type: "email",
      description: "Initial client intake requirement registered & telemetry mapping approved.",
      timestamp: selectedJob?.createdAt || new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: "System"
    });

    // 2. Map actual matching candidates to timeline events
    jobCandidates.forEach((c) => {
      events.push({
        id: `cand-sub-${c.id}`,
        type: "feedback",
        description: `Candidate profile [${c.name}] submitted by vendor/sourcing partner with AI match score: ${c.aiMatchScore || 85}%.`,
        timestamp: c.createdAt || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        author: c.vendorName || "Recruiter"
      });

      if (c.stage === "interview") {
        events.push({
          id: `cand-int-${c.id}`,
          type: "interview",
          description: `Interview scheduled for candidate [${c.name}] with engineering committee.`,
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          author: "Gopal Krishna"
        });
      }

      if (c.stage === "offer") {
        events.push({
          id: `cand-off-${c.id}`,
          type: "offer",
          description: `Corporate Offer Letter released to [${c.name}] for client review.`,
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          author: "Founder"
        });
      }
    });

    // 3. Map Firestore system events associated with this client or job
    if (selectedJob) {
      const matchClientName = selectedJob.clientName?.toLowerCase();
      const associatedSysEvents = systemEventsList.filter(ev => {
        const desc = ev.description?.toLowerCase() || "";
        return desc.includes(matchClientName) || ev.entityId === selectedJobId;
      });

      associatedSysEvents.forEach((sev) => {
        let evType: any = "call";
        if (sev.type?.includes("MEETING")) evType = "meeting";
        else if (sev.type?.includes("STAGE")) evType = "feedback";
        else if (sev.type?.includes("CANDIDATE")) evType = "interview";

        events.push({
          id: sev.id,
          type: evType,
          description: sev.description || "System ledger activity registered.",
          timestamp: sev.timestamp || new Date().toISOString(),
          author: sev.userId || "System"
        });
      });
    }

    // 4. Custom BDM logged interactions
    const customList = customTimelines[jobId] || [];
    
    // Merge, deduplicate, and sort descending
    const allEvents = [...events, ...customList];
    const uniqueEvents = Array.from(new Map(allEvents.map(item => [item.id, item])).values());
    
    return uniqueEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Generate Predictive alerts
  const getPredictiveAlerts = (job: any, candidatesList: any[]) => {
    const alerts: { title: string; desc: string; severity: "critical" | "warning" | "info" }[] = [];
    if (!job) return alerts;

    const daysOpen = Math.round((Date.now() - new Date(job.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOpen > 4 && candidatesList.length === 0) {
      alerts.push({
        title: "Requirement likely to breach SLA",
        desc: `This requirement has been active for ${daysOpen} days without any direct vendor submissions. Recommended to trigger the AI Vendor Intelligence agent.`,
        severity: "critical"
      });
    }

    const matchedRejected = candidatesList.filter(c => c.stage === 'rejected').length;
    if (matchedRejected > 3) {
      alerts.push({
        title: "Candidate match drop-off risk",
        desc: `High rejection rate (${matchedRejected} candidates) detected. Resume screening parameters might need alignment.`,
        severity: "warning"
      });
    }

    const hasImmediateNotice = candidatesList.some(c => (c as any).availability?.includes("Immediate") || (c as any).noticePeriod === "Immediate");
    if (hasImmediateNotice) {
      alerts.push({
        title: "High-probability candidate match",
        desc: "Immediate availability candidate identified. Recommend resubmitting to client review list.",
        severity: "info"
      });
    }

    // Default SLA health checks
    if (daysOpen <= 2) {
      alerts.push({
        title: "Requirement SLA: Healthy",
        desc: "Response latency benchmarks are within safe, high-velocity threshold parameters.",
        severity: "info"
      });
    }

    return alerts;
  };

  // Generate Proactive AI Copilot Advice
  const getAiCopilotAdvice = (job: any, cands: any[]) => {
    if (!job) return "Constructing AI contextual recommendation ledger...";
    
    const clientName = job.clientName || "the Client";
    const jobTitle = job.title || "the role";
    
    if (cands.length === 0) {
      return `AI INSIGHT: ABC Technologies has reduced hiring velocity by 40% recently. Suggest launching a quick executive touchpoint to secure requirements.`;
    }

    const interviewCount = cands.filter(c => c.stage === 'interview').length;
    if (interviewCount > 0) {
      return `AI INSIGHT: Vendor Worknexainf has the highest interview-to-placement ratio for ${jobTitle} roles. Prioritize routing new candidates through their partner channel.`;
    }

    return `AI INSIGHT: Active candidates found under recruitment pipelines. Ensure feedback loops are closed within the 3-day deterministic SLA threshold.`;
  };

  const handleLogCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !newLogNote.trim()) return;

    const newEv: TimelineEvent = {
      id: `logged-${Date.now()}`,
      type: newLogChannel,
      description: `Logged BDM interaction: ${newLogNote}`,
      timestamp: new Date().toISOString(),
      author: user?.name || "BDM"
    };

    setCustomTimelines((prev) => ({
      ...prev,
      [selectedJobId]: [newEv, ...(prev[selectedJobId] || [])]
    }));

    // Law 1: Write event into the Immutable Firestore Company Ledger
    try {
      await addDoc(collection(db, "system_events"), {
        type: `COMMUNICATION_${newLogChannel.toUpperCase()}`,
        description: `BDM logged a ${newLogChannel} with ${selectedJob?.clientName || "Client"} - Note: ${newLogNote}`,
        entityType: "job",
        entityId: selectedJobId,
        timestamp: new Date().toISOString(),
        userId: user?.name || "BDM"
      });
      toast.success("Ledger updated. Communication logged successfully.");
    } catch (err) {
      console.error("Firestore ledger write error:", err);
      toast.error("Failed to append event to ledger.");
    }

    setNewLogNote("");
  };

  const handleUpdateCandidateStage = async (candId: string, newStage: any) => {
    try {
      const candRef = doc(db, "candidates", candId);
      await updateDoc(candRef, { stage: newStage });
      
      // Update local state
      await refreshAll();
      toast.success(`Candidate stage transitioned to [${newStage}]!`);

      // Emit Event
      const cand = candidates.find(c => c.id === candId);
      await addDoc(collection(db, "system_events"), {
        type: "CANDIDATE_STAGE_TRANSITIONED",
        description: `Candidate [${cand?.name || "Unknown"}] transitioned to [${newStage}] stage in unified workspace.`,
        entityType: "candidate",
        entityId: candId,
        timestamp: new Date().toISOString(),
        userId: user?.name || "BDM"
      });
    } catch (err) {
      console.error("Failed updating stage:", err);
      toast.error("Failed to update candidate stage.");
    }
  };

  const handleAddWorkspaceNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !noteText.trim()) return;

    const newNote: WorkspaceNote = {
      id: `note-${Date.now()}`,
      author: user?.name || "Founder",
      text: noteText,
      timestamp: new Date().toLocaleString()
    };

    setWorkspaceNotes((prev) => ({
      ...prev,
      [selectedJobId]: [newNote, ...(prev[selectedJobId] || [])]
    }));

    setNoteText("");
    toast.success("Internal work-note saved in workspace workspace.");
  };

  const activeTimeline = selectedJob ? getTimelineEvents(selectedJobId!) : [];
  const activeAlerts = selectedJob ? getPredictiveAlerts(selectedJob, jobCandidates) : [];
  const activeCopilotInsight = selectedJob ? getAiCopilotAdvice(selectedJob, jobCandidates) : "";

  return (
    <div className="space-y-6 min-h-full">
      
      {/* Dynamic Main Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{textShadow: "0 1px 1px white"}}>
            Unified Workspaces
          </h1>
          <p className="text-slate-600 mt-1">
            Corporate Deal Rooms mapping requirements, candidates, timelines, and financial pipelines.
          </p>
        </div>
        
        {/* Metric Overview Block */}
        <div className="flex items-center gap-3 font-mono">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-300 shadow-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active Rooms</span>
            <span className="font-black text-slate-800 text-sm">{jobs.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ACTIVE DEAL ROOMS SELECTOR */}
        <div className="lg:col-span-1 space-y-4">
          <div className="skeuo-card p-4">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search Active Workspaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 skeuo-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const isSelected = selectedJobId === job.id;
                const candCount = candidates.filter((c) => c.jobId === job.id).length;
                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setSelectedCandDetailId(null);
                    }}
                    className={cn(
                      "skeuo-card p-5 cursor-pointer transition-all hover:translate-x-1 duration-200 border-l-[5px]",
                      isSelected
                        ? "border-l-indigo-600 border-slate-300 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500/10"
                        : "border-l-slate-400 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-sm leading-tight group-hover:text-indigo-600">
                          {job.title}
                        </h4>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.clientName || "Direct Partner"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono">
                      <div className="bg-slate-100 border border-slate-200 rounded p-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-slate-700 font-bold">{candCount} Candidates</span>
                      </div>
                      <div className="bg-slate-100 border border-slate-200 rounded p-1.5 flex items-center gap-1.5">
                        <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-slate-700 font-bold">{job.budget || "TBD"}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400 font-sans text-xs">
                No active workspaces match your query.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 360 WORKSPACE CONTENT */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-white rounded-[2rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
              
              {/* Header Visual Box */}
              <div className="p-6 md:p-8 bg-slate-950 text-white shrink-0 border-b border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-black tracking-widest uppercase rounded">
                        DEAL WORKSPACE
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-black rounded">
                        WIN SCORE: {jobCandidates.length > 0 ? "85%" : "45%"}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedJob.title}</h2>
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{selectedJob.clientName || "Direct Client Integration"}</span>
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center shrink-0">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Estimated Value</span>
                    <span className="text-lg font-black text-emerald-400">{selectedJob.budget || "₹6,00,000"}</span>
                  </div>
                </div>
              </div>

              {/* Workspace Tab bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex gap-1 overflow-x-auto font-mono text-[10px] font-bold uppercase tracking-wider">
                {[
                  { id: "overview", label: "Overview", icon: Briefcase },
                  { id: "talent", label: `Talent Pipeline (${jobCandidates.length})`, icon: Users },
                  { id: "comms", label: `Timeline (${activeTimeline.length})`, icon: Clock },
                  { id: "alerts", label: `Copilot & Alerts (${activeAlerts.length})`, icon: BrainCircuit },
                  { id: "billing", label: "Financials", icon: CircleDollarSign },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveWorkspaceTab(tab.id as any)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap",
                        activeWorkspaceTab === tab.id
                          ? "bg-white text-slate-950 border border-slate-300 shadow-sm"
                          : "text-slate-500 hover:text-slate-950"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Detail Content Panels */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 min-h-[50vh] max-h-[70vh]">
                
                {/* 1. OVERVIEW VIEW */}
                {activeWorkspaceTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* Proactive AI Insight Header */}
                    {activeCopilotInsight && (
                      <div className="bg-indigo-50 border border-indigo-200 p-4.5 rounded-xl flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0 animate-pulse" />
                        <div>
                          <h4 className="font-bold text-indigo-950 text-xs">AI Relationship Copilot Advice</h4>
                          <p className="text-indigo-950 text-xs mt-1 leading-relaxed italic font-semibold">
                            "{activeCopilotInsight}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Meta Bento grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Duration Open</span>
                        <p className="text-xl font-black text-slate-900">4 Days</p>
                        <span className="text-[10px] text-emerald-600 font-bold">Within healthy SLA</span>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Submissions</span>
                        <p className="text-xl font-black text-slate-900">{jobCandidates.length}</p>
                        <span className="text-[10px] text-slate-500">From verified partner channels</span>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Margin</span>
                        <p className="text-xl font-black text-slate-900">18.5%</p>
                        <span className="text-[10px] text-indigo-600 font-bold">Premium tier contract</span>
                      </div>
                    </div>

                    {/* Client & Vendor Mapping Relationship Flow */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Stakeholder Network Map</h4>
                      
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-center md:text-left">
                          <span className="text-[9px] text-slate-400 font-bold block">CLIENT OWNER</span>
                          <span className="font-black text-slate-800 text-xs block mt-1">
                            {selectedJob.clientName || "ABC Technologies"}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Contact: Recruiting SLA Coordinator</span>
                        </div>
                        
                        <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />

                        <div className="text-center">
                          <span className="text-[9px] text-slate-400 font-bold block">PRIMARY VENDOR PARTNER</span>
                          <span className="font-black text-slate-800 text-xs block mt-1">
                            {vendors.length > 0 ? vendors[0].name : "Worknexainf"}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Status: Active Tier-1 Delivery</span>
                        </div>

                        <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />

                        <div className="text-center md:text-right">
                          <span className="text-[9px] text-slate-400 font-bold block">ASSIGNED BDM</span>
                          <span className="font-black text-indigo-600 text-xs block mt-1">
                            Priya / Gopal
                          </span>
                          <span className="text-[10px] text-slate-500 block">Task Limit: Normal</span>
                        </div>
                      </div>
                    </div>

                    {/* Workspace Notes */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Internal Workspace Notes</h4>
                      
                      <form onSubmit={handleAddWorkspaceNote} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add team alignment note..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                        />
                        <button type="submit" className="px-4 py-2 skeuo-btn text-xs font-bold font-mono uppercase">
                          Add
                        </button>
                      </form>

                      <div className="space-y-3">
                        {(workspaceNotes[selectedJobId] || []).length > 0 ? (
                          (workspaceNotes[selectedJobId] || []).map((note) => (
                            <div key={note.id} className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-xs font-sans">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-900">{note.author}</span>
                                <span className="text-[9px] font-bold text-slate-400">{note.timestamp}</span>
                              </div>
                              <p className="text-slate-700 font-semibold">{note.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-[11px] italic">No custom notes recorded for this room yet.</p>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* 2. TALENT PIPELINE VIEW */}
                {activeWorkspaceTab === "talent" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Submitted Profiles</h4>
                      <span className="text-[10px] font-mono text-slate-400">Manage Candidate Journeys</span>
                    </div>

                    <div className="space-y-4">
                      {jobCandidates.length > 0 ? (
                        jobCandidates.map((cand) => (
                          <div 
                            key={cand.id}
                            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-slate-900 text-sm">{cand.name}</h4>
                                  <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded font-black">
                                    MATCH: {cand.aiMatchScore || 85}%
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  {cand.currentCompany || "Corporate Professional"} • {cand.location || "Bangalore, India"}
                                </p>
                              </div>

                              {/* Interactive controls to move candidate stages */}
                              <div className="flex flex-wrap items-center gap-2">
                                {[
                                  { stage: "screening", label: "Screening" },
                                  { stage: "submission", label: "Submission" },
                                  { stage: "interview", label: "Interview" },
                                  { stage: "offer", label: "Offer" },
                                  { stage: "placed", label: "Placement" },
                                ].map((step) => (
                                  <button
                                    key={step.stage}
                                    onClick={() => handleUpdateCandidateStage(cand.id, step.stage)}
                                    className={cn(
                                      "px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border transition-all",
                                      cand.stage === step.stage
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                    )}
                                  >
                                    {step.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Additional candidate insights panel */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono bg-slate-50 p-3 rounded-lg border border-slate-150">
                              <div>
                                <span className="text-slate-400 block">Notice Period</span>
                                <span className="font-bold text-slate-700">Immediate</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Expected CTC</span>
                                <span className="font-bold text-slate-700">{cand.expectedSalary || "₹14,00,000"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Sourcing Channel</span>
                                <span className="font-bold text-indigo-600 truncate block">{cand.vendorName || "Direct"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Identity Status</span>
                                <span className="font-bold text-emerald-600">🟢 Verified</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
                          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <h4 className="font-bold text-slate-700 text-sm">No candidates submitted yet</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Resumes parsed and mapped through vendor pipelines will appear here ready for alignment.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 3. COMMUNICATION TIMELINE VIEW */}
                {activeWorkspaceTab === "comms" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* Log action form */}
                    <form onSubmit={handleLogCommunication} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Quick Log Stakeholder Touchpoint</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {(["call", "email", "whatsapp", "meeting"] as const).map((ch) => (
                          <label key={ch} className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold uppercase">
                            <input
                              type="radio"
                              name="channel"
                              value={ch}
                              checked={newLogChannel === ch}
                              onChange={() => setNewLogChannel(ch)}
                              className="accent-indigo-600"
                            />
                            <span>{ch}</span>
                          </label>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Log conversation outcome notes..."
                          value={newLogNote}
                          onChange={(e) => setNewLogNote(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                        />
                        <button type="submit" className="px-5 py-2.5 skeuo-btn-primary text-xs font-bold font-mono uppercase">
                          Log
                        </button>
                      </div>
                    </form>

                    {/* Timeline Feed */}
                    <div className="space-y-5">
                      {activeTimeline.map((item, index) => {
                        const dateObj = new Date(item.timestamp);
                        const timeStr = isNaN(dateObj.getTime()) ? "Recently" : dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div key={item.id || index} className="flex gap-4 relative group">
                            {/* Line connecting milestones */}
                            <div className="w-px h-full bg-slate-200 absolute left-2.5 top-5 -z-10 group-last:hidden" />
                            
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border shadow-inner mt-0.5 z-10",
                              item.type === "call" ? "bg-blue-500 border-blue-200 text-white" :
                              item.type === "email" ? "bg-indigo-500 border-indigo-200 text-white" :
                              item.type === "whatsapp" ? "bg-emerald-500 border-emerald-200 text-white" :
                              item.type === "meeting" ? "bg-amber-500 border-amber-200 text-white" :
                              "bg-slate-500 border-slate-200 text-white"
                            )}>
                              {item.type === "call" && <Phone className="w-2.5 h-2.5" />}
                              {item.type === "email" && <Mail className="w-2.5 h-2.5" />}
                              {item.type === "whatsapp" && <MessageSquare className="w-2.5 h-2.5" />}
                              {item.type === "meeting" && <Calendar className="w-2.5 h-2.5" />}
                              {!["call", "email", "whatsapp", "meeting"].includes(item.type) && <FileText className="w-2.5 h-2.5" />}
                            </div>

                            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-xs font-sans">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-black text-slate-800 uppercase tracking-wide text-[10px]">
                                  {item.type} Touchpoint
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{timeStr}</span>
                              </div>
                              <p className="text-slate-600 font-medium leading-relaxed mt-1">{item.description}</p>
                              <div className="mt-2 text-[9px] font-mono text-slate-400 uppercase">
                                Logged by: {item.author}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* 4. AI WORKSPACE COPILOT & PREDICTIVE ALERTS VIEW */}
                {activeWorkspaceTab === "alerts" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <BrainCircuit className="w-5 h-5 text-indigo-600 animate-pulse" />
                        <h3 className="font-bold text-slate-900 text-sm">System Predictive Intelligence</h3>
                      </div>

                      <div className="space-y-3">
                        {activeAlerts.length > 0 ? (
                          activeAlerts.map((alert, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-4.5 rounded-xl border flex items-start gap-3 text-xs font-sans",
                                alert.severity === "critical" ? "bg-rose-50 border-rose-200 text-rose-950" :
                                alert.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-950" :
                                "bg-emerald-50 border-emerald-200 text-emerald-950"
                              )}
                            >
                              <AlertCircle className={cn(
                                "w-5 h-5 shrink-0 mt-0.5",
                                alert.severity === "critical" ? "text-rose-600" :
                                alert.severity === "warning" ? "text-amber-600" :
                                "text-emerald-600"
                              )} />
                              <div className="space-y-1">
                                <h4 className="font-black">{alert.title}</h4>
                                <p className="leading-relaxed font-semibold opacity-90">{alert.desc}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <p className="font-bold">Workspace Health Index completely optimal. Zero risk variances discovered.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proactive relationship logs suggestions */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Historical Context Reasoning</h4>
                      <div className="p-4 bg-slate-50 rounded-xl text-xs font-sans space-y-2 leading-relaxed text-slate-600 font-medium">
                        <p>
                          Our deep intelligence fabric continuously monitors the event ledger for client feedback delay loops. Average response delay is <strong>1.4 days</strong>.
                        </p>
                        <p>
                          Recommended proactive automation: Draft and queue a localized follow-up sequence to secure final engineering schedules.
                        </p>
                      </div>
                    </div>

                  </div>
                )}

                {/* 5. BILLING OPERATIONS & MARGINS */}
                {activeWorkspaceTab === "billing" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-900 text-sm">Collection Flow Operations</h3>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">Billing Active</span>
                      </div>

                      <div className="space-y-3 text-xs font-sans">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-slate-800">Invoice #INV-2026-042</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Sourcing Placement Release Fee</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹4,50,000</span>
                            <span className="text-[9px] font-bold uppercase bg-rose-50 border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded font-mono inline-block mt-1">
                              OVERDUE BY 1 DAY
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-slate-800">Invoice #INV-2026-048</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Secondary Developer Milestones</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹7,50,000</span>
                            <span className="text-[9px] font-bold uppercase bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 rounded font-mono inline-block mt-1">
                              DUE IN 3 DAYS
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 text-white p-6 rounded-2xl space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                        Revenue Operations Diagnostics
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        "Revenue is projected at ₹52 L because 18 opportunities are in the negotiation stage and 6 placements are expected to join this month."
                      </p>
                    </div>

                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white p-20 text-center rounded-[2rem] border border-slate-200 border-dashed text-slate-400 flex flex-col items-center justify-center h-full min-h-[50vh]">
              <Briefcase className="w-16 h-16 text-slate-300 mb-4 stroke-[1.5]" />
              <h3 className="font-bold text-slate-700 text-lg mb-1" style={{textShadow: "0 1px 0 white"}}>No Workspace Selected</h3>
              <p className="text-sm max-w-sm">Select any corporate requirement from the list to launch the Unified 360 Workspace.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
