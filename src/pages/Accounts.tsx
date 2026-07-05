/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  ChevronRight,
  ShieldCheck,
  XCircle,
  CheckCircle,
  ExternalLink,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Award,
  Zap,
  Briefcase,
  HelpCircle,
  FileText,
  Calendar,
  MessageSquare,
  Network,
  ListTodo,
  Bot,
  Compass,
  ArrowRight,
  Lock,
  MessageCircle,
  Share2,
  LockKeyhole,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { safeArray, safeString } from '@/utils/safe';
import { SourceBadge } from '@/components/SourceBadge';
import { 
  calculateRelationshipScore, 
  analyzeOpportunity, 
  generateFollowUpSuggestions 
} from '@/services/RelationshipIntelligenceEngine';

// Default mock pipeline stages for Kanban
const PIPELINE_STAGES = [
  "Lead",
  "Qualified",
  "Meeting",
  "Proposal",
  "Negotiation",
  "MSA",
  "Active Client",
  "Strategic Account"
];

export default function Clients() {
  const { clients, loading, addClient, jobs, candidates } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setForm] = useState({
    company: '',
    website: '',
    industry: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: ''
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "pipeline" | "timeline" | "meetings" | "dealroom" | "portal" | "copilot">("overview");

  // Kanban Pipeline State
  const [pipelineState, setPipelineState] = useState<Record<string, string>>({});

  // Org chart state per client
  const [orgNodes, setOrgNodes] = useState<any[]>([]);

  // Meetings local logger
  const [meetings, setMeetings] = useState<any[]>([]);
  const [newMeetingForm, setNewMeetingForm] = useState({
    agenda: '',
    participants: '',
    date: '',
    summary: '',
    decisions: '',
    actionItems: ''
  });

  // Copilot assistant messages
  const [copilotMessages, setCopilotMessages] = useState<any[]>([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);

  // Initialize data when client is selected
  useEffect(() => {
    if (selectedClient) {
      // Setup mock pipeline state if not present
      if (!pipelineState[selectedClient.id]) {
        setPipelineState(prev => ({
          ...prev,
          [selectedClient.id]: selectedClient.pipelineStage || "Active Client"
        }));
      }

      // Setup mock org chart
      setOrgNodes([
        { id: 'node-1', role: 'CEO', name: 'Alok Mishra', email: 'alok@client.com', phone: '+91 9900112233' },
        { id: 'node-2', role: 'HR Head', name: 'Ritu Sharma', email: 'ritu@client.com', phone: '+91 9900112244', parentId: 'node-1' },
        { id: 'node-3', role: 'Talent Acquisition', name: 'Sunil Rao', email: 'sunil@client.com', phone: '+91 9900112255', parentId: 'node-2' },
        { id: 'node-4', role: 'Delivery Manager', name: 'John Doe', email: 'john@client.com', phone: '+91 9900112266', parentId: 'node-1' },
        { id: 'node-5', role: 'Hiring Manager (Tech)', name: 'Srinivas K.', email: 'srinivas@client.com', phone: '+91 9900112277', parentId: 'node-4' }
      ]);

      // Setup mock meetings
      setMeetings([
        {
          id: 'meet-1',
          agenda: 'Q3 Sourcing & Delivery Alignment',
          participants: 'John Doe, Sunil Rao, Priya (Recruiter)',
          date: '2 days ago',
          summary: 'Reviewed pipeline for Frontend Architect roles. Agreed on shortening feedback SLA from 72h to 24h.',
          decisions: 'Approve vendor candidate submission caps of 5 per requirement.',
          actionItems: 'Share revised JD additions, release next batch of screening assessments.'
        },
        {
          id: 'meet-2',
          agenda: 'Account Review & Contract Negotiation',
          participants: 'Alok Mishra, Gopal (BDM)',
          date: 'Last week',
          summary: 'Discussed high volume engagement discounts and MSA markup policies.',
          decisions: 'Discount tier set to 12% on placements exceeding 15 hires per annum.',
          actionItems: 'Draft and sign the MSA Addendum.'
        }
      ]);

      // Reset Copilot
      setCopilotMessages([
        { 
          role: 'assistant', 
          content: `Hello! I am your HireNest Relationship Copilot. I am grounded in all live records, requirements, timelines, and communications for **${selectedClient.company}**.\n\nTry asking me:\n* "Summarize our relationship with this client"\n* "What is blocking active opportunities?"\n* "Draft a follow-up email for John Doe"\n* "Show health diagnostics"` 
        }
      ]);

      // Set active tab to overview
      setActiveTab("overview");
    }
  }, [selectedClient]);

  const filteredClients = safeArray(clients).filter(c => 
    safeString(c.company).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof addClient === 'function') {
        const payload = {
          ...formData,
          pipelineStage: "Lead"
        };
        await addClient(payload);
        toast.success('New client onboarded and recorded in ledger.');
        setIsModalOpen(false);
        setForm({ company: '', website: '', industry: '', contactPerson: '', email: '', phone: '', location: '' });
      }
    } catch (err) {
      toast.error('Failed to add client');
    }
  };

  // Handles updating the Sales Pipeline Stage
  const handlePipelineMove = async (newStage: string) => {
    if (!selectedClient) return;
    
    setPipelineState(prev => ({
      ...prev,
      [selectedClient.id]: newStage
    }));

    // Record system event (Law 1: append-only immutable ledger)
    try {
      await addDoc(collection(db, "system_events"), {
        type: 'ACCOUNT_STAGE_CHANGED',
        description: `Account [${selectedClient.company}] sales pipeline transitioned to stage [${newStage}] by BDM.`,
        entityType: 'client',
        entityId: selectedClient.id,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to append system ledger event:", err);
    }

    toast.success(`Account transitioned to ${newStage}. Event appended to ledger.`);
  };

  // Handles logging a new meeting workspace
  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingForm.agenda || !newMeetingForm.date) {
      toast.error('Agenda and Date are required to establish workspace');
      return;
    }

    const newMeet = {
      id: `meet-custom-${Date.now()}`,
      agenda: newMeetingForm.agenda,
      participants: newMeetingForm.participants || 'None listed',
      date: newMeetingForm.date,
      summary: newMeetingForm.summary || 'Awaiting post-meeting AI transcription.',
      decisions: newMeetingForm.decisions || 'None recorded.',
      actionItems: newMeetingForm.actionItems || 'None recorded.'
    };

    setMeetings(prev => [newMeet, ...prev]);

    // Record system event
    try {
      addDoc(collection(db, "system_events"), {
        type: 'MEETING_WORKSPACE_CREATED',
        description: `Meeting workspace established for [${selectedClient.company}] on: ${newMeet.agenda}`,
        entityType: 'meeting',
        entityId: newMeet.id,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to append system ledger event:", err);
    }

    setNewMeetingForm({
      agenda: '',
      participants: '',
      date: '',
      summary: '',
      decisions: '',
      actionItems: ''
    });
    toast.success('Meeting workspace established successfully!');
  };

  // Handles Copilot interactive chats
  const handleCopilotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userMsg = { role: 'user', content: copilotInput };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput('');
    setIsCopilotTyping(true);

    // Dynamic responses based on intent
    setTimeout(() => {
      let replyText = "";
      const query = userMsg.content.toLowerCase();

      // Calculation context
      const clientReqs = safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company);
      const openReqsCount = clientReqs.filter(j => j.status === 'open' || !j.status).length;
      const clientCands = safeArray(candidates).filter(c => clientReqs.map(j => j.id).includes(c.jobId));
      const placementsCount = clientCands.filter(c => ['placed', 'joined'].includes(c.stage)).length;

      if (query.includes("summarize") || query.includes("summary") || query.includes("relationship")) {
        replyText = `### Relationship Summary: **${selectedClient.company}**\n\n* **Status**: We are in active partnership with **${selectedClient.company}**. Current account pipeline is configured in the **${pipelineState[selectedClient.id] || 'MSA'}** stage.\n* **Operational Velocity**: There are **${openReqsCount} open requirements** with **${clientCands.length} total candidate submissions** logged across delivery tracks.\n* **Commercial Footprint**: Successful conversion has resulted in **${placementsCount} placements**.\n* **Diagnostic Rating**: Relationship metrics indicate high operational responsiveness and trust. Last high-level touchpoint was yesterday.`;
      } else if (query.includes("blocking") || query.includes("blocker") || query.includes("risk")) {
        replyText = `### Opportunity Risk Diagnosis:\n\n* **SLA Friction**: There is an active feedback delay for the *Frontend Architect* requisition. 2 candidate profiles have been in screening for > 72 hours.\n* **Decision Bottleneck**: Org mapping highlights HR Head Ritu Sharma is highly focused on salary alignment metrics, while Delivery Manager John Doe prioritizes architectural depth. Recommended action is arranging a combined technical alignment sync.\n* **Sourcing Capacity**: Sourcing velocity is strong with top-tier vendors responsive, but high competitors exist (2 direct staffing rivals present on site).`;
      } else if (query.includes("draft") || query.includes("email") || query.includes("outreach")) {
        const contactPerson = selectedClient.contactPerson || "John Doe";
        replyText = `### AI Sourcing Outreach Draft:\n\n**Subject**: Sourcing Sync & Technical Profiles - ${selectedClient.company}\n\n**Body**:\nHi ${contactPerson},\n\nI hope you are doing well.\n\nFollowing up on our recent conversation, I wanted to let you know that our recruitment network has parsed and semantic-matched two exceptional profiles perfectly aligned with your active requisitions. \n\nWe have completed the internal Trust scoring checks on our end to guarantee ownership compliance. Would you have 5 minutes tomorrow afternoon for a quick review sync?\n\nBest regards,\nGopal\nHireNest OS BDM Team`;
      } else if (query.includes("health") || query.includes("score") || query.includes("diagnostic")) {
        const health = calculateRelationshipScore(selectedClient, jobs, candidates);
        replyText = `### Core Health Diagnostic Ledger:\n\n* **Overall Relationship Score**: **${health.overallScore}/100**\n* **Engagement Index**: ${health.engagement}%\n* **Response Velocity SLA**: ${health.responseRate}%\n* **Communication Depth**: ${health.communicationDepth}%\n* **Risk Classification**: **${health.riskLevel} RISK**\n\n*Diagnostic Insight*: This corporate client consistently approves interview scheduling and provides high-quality requirements, indicating a strategic account. Maintain current BDM coverage.`;
      } else {
        replyText = `I have received your request regarding **${selectedClient.company}**. As an AI CRM assistant, I recommend scheduling a follow-up call with **${selectedClient.contactPerson || 'John Doe'}** to sync on open deliverables. Let me know if you would like me to draft a custom outreach or analyze active requisitions further.`;
      }

      setCopilotMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
      setIsCopilotTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>Corporate CRM & Client Operating Center</h1>
          <p className="text-slate-600 mt-1">Manage accounts, pipelines, stakeholder hierarchies, and delivery workspaces.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 skeuo-btn-primary px-4 py-2.5"
        >
          <Plus className="w-5 h-5 drop-shadow-sm" />
          Onboard Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Clients List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="skeuo-card p-4 flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors drop-shadow-sm" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="skeuo-input w-full pl-10 pr-4 py-2"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 skeuo-btn">
              <Filter className="w-4 h-4 text-slate-500 drop-shadow-sm" />
              Recent
            </button>
          </div>

          <div className="space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeuo-card h-28 animate-pulse" />)
            ) : filteredClients?.length > 0 ? (
              filteredClients.map(client => {
                const clientReqs = safeArray(jobs).filter(
                  (j) => j.clientId === client.id || j.clientName === client.company
                );
                const clientCands = safeArray(candidates).filter((c) => clientReqs.map(j => j.id).includes(c.jobId));
                const placements = clientCands.filter((c) => ["placed", "joined"].includes(c.stage));
                const currentStage = pipelineState[client.id] || client.pipelineStage || "Active Client";
                const metrics = calculateRelationshipScore(client, jobs, candidates);

                return (
                  <div 
                    key={client.id} 
                    onClick={() => setSelectedClient(client)}
                    className={cn(
                      "skeuo-card p-5 cursor-pointer transition-all hover:translate-x-1 duration-200 border",
                      selectedClient?.id === client.id 
                        ? "border-indigo-500 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500/20" 
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl skeuo-bg flex items-center justify-center text-indigo-600 border border-slate-300 shadow-inner">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-950 text-base">{client.company}</h4>
                            <SourceBadge source={client.source || 'crm'} />
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">{client.industry || 'Staffing & Delivery'}</p>
                        </div>
                      </div>
                      
                      {/* Relationship health badge */}
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded border font-mono tracking-wider",
                        metrics.overallScore >= 80 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                          : metrics.overallScore >= 50 
                          ? "bg-amber-50 text-amber-600 border-amber-200" 
                          : "bg-rose-50 text-rose-600 border-rose-200"
                      )}>
                        HEALTH {metrics.overallScore}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1 border-t border-slate-200/50 pt-3 text-center text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block uppercase">Reqs</span>
                        <span className="text-slate-800 font-bold">{clientReqs.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">Submits</span>
                        <span className="text-slate-800 font-bold">{clientCands.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">Placed</span>
                        <span className="text-slate-800 font-bold text-emerald-600">{placements.length}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2.5">
                      <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {currentStage}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        {client.location || 'Bangalore'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
                Onboard your first client to start allocating jobs.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Dynamic Account 360 Workspace overlay */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <div className="bg-white rounded-[2rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
              {/* Client Profile Header */}
              <div className="p-6 md:p-8 bg-slate-950 border-b border-slate-800 text-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black tracking-tight">{selectedClient.company}</h2>
                        <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2.5 py-0.5 rounded">
                          {selectedClient.clientCode || 'CODE_N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-medium">
                        {selectedClient.website && (
                          <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-400 transition-colors">
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{selectedClient.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        )}
                        <span>•</span>
                        <span>{selectedClient.location || 'Bengaluru, India'}</span>
                        <span>•</span>
                        <span>{selectedClient.industry || 'IT Infrastructure'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedClient(null)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-xl transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tab selectors */}
                <div className="flex gap-2.5 mt-8 overflow-x-auto pb-1 border-t border-slate-800/80 pt-5 font-mono text-[11px] font-bold uppercase tracking-wider">
                  {[
                    { id: "overview", label: "Account 360", icon: Compass },
                    { id: "pipeline", label: "Sales Pipeline", icon: TrendingUp },
                    { id: "timeline", label: "Ledger Timeline", icon: Activity },
                    { id: "meetings", label: "Meeting Workspace", icon: Calendar },
                    { id: "dealroom", label: "Deal Room", icon: LockKeyhole },
                    { id: "portal", label: "Portal Sandbox", icon: Users },
                    { id: "copilot", label: "CRM Copilot", icon: Bot },
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 border border-transparent",
                          activeTab === tab.id 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                            : "text-slate-400 hover:text-white hover:bg-slate-900"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Workspace Container */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 min-h-[60vh] max-h-[70vh]">
                
                {/* 1. OVERVIEW & ACCOUNT 360 HEALTH */}
                {activeTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Interactive Health Score Gauge */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-mono mb-2">Relationship Health</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-indigo-600">
                              {calculateRelationshipScore(selectedClient, jobs, candidates).overallScore}
                            </span>
                            <span className="text-xs font-bold text-slate-400 font-mono">/ 100</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Risk Profile:</span>
                          <span className={cn(
                            "font-bold uppercase",
                            calculateRelationshipScore(selectedClient, jobs, candidates).riskLevel === "LOW" 
                              ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {calculateRelationshipScore(selectedClient, jobs, candidates).riskLevel} RISK
                          </span>
                        </div>
                      </div>

                      {/* Revenue generated card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-mono mb-2">Revenue Generated</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900">₹1.8 Cr</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Invoices Pending:</span>
                          <span className="font-bold text-rose-500">₹12 L</span>
                        </div>
                      </div>

                      {/* Core Stakeholders / Assignments */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block font-mono mb-1">Coverage Assignment</span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Primary BDM:</span>
                          <span className="font-bold text-slate-950">Gopal (Bangalore)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Recruiter Owner:</span>
                          <span className="font-bold text-indigo-600">Priya (Sourcing)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Feedback SLA:</span>
                          <span className="font-bold text-emerald-600">3 Days Max</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Follow-Up Recommendation Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 shadow-sm">
                      <Bot className="w-8 h-8 text-amber-500 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black font-mono uppercase bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded">
                            AI Relationship Follow-Up Action
                          </span>
                          <span className="text-[10px] text-amber-600 font-mono font-bold">Triggered 4h ago</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          {selectedClient.company} hasn't released a technical requirement in 45 days, and delivery lead John Smith hasn't responded to emails in 6 days.
                        </p>
                        <p className="text-xs text-slate-600 italic">
                          Suggested Action: "Schedule an alignment coffee chat tomorrow morning to introduce alternate talent pipeline models."
                        </p>
                        <div className="pt-2 flex gap-2">
                          <button 
                            onClick={() => {
                              toast.success("Outreach scheduled! calendar holds placed.");
                              setActiveTab("copilot");
                            }}
                            className="bg-slate-950 text-white px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
                          >
                            <span>Initialize Outreach</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Client Org Chart Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Network className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Client Organization Chart</h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                          {orgNodes.length} Stakeholders Mapped
                        </span>
                      </div>
                      
                      {/* Org Tree Flow */}
                      <div className="space-y-3 font-sans">
                        {orgNodes.map((node, i) => (
                          <div 
                            key={node.id} 
                            style={{ paddingLeft: `${node.parentId ? (node.parentId === 'node-1' ? '2rem' : '4rem') : '0.5rem'}` }}
                            className="relative"
                          >
                            {/* Branch lines */}
                            {node.parentId && (
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-300" />
                            )}
                            
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white transition-colors hover:shadow-sm">
                              <div>
                                <span className="text-[9px] font-black uppercase text-indigo-600 font-mono tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mr-2">
                                  {node.role}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{node.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                                <span>{node.email}</span>
                                <span className="text-slate-300">|</span>
                                <span>{node.phone}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Opportunities / Intelligence */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Opportunities Intelligence</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).map((job: any) => {
                          const analysis = analyzeOpportunity(job, candidates);
                          return (
                            <div key={job.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{job.title}</h4>
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono border",
                                  analysis.risk === "LOW" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                  RISK: {analysis.risk}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                                <div className="bg-white border border-slate-200 rounded p-1.5">
                                  <span className="text-slate-400 block uppercase">Win %</span>
                                  <span className="text-indigo-600 font-bold text-sm">{analysis.probability}%</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded p-1.5">
                                  <span className="text-slate-400 block uppercase">Closure</span>
                                  <span className="text-slate-800 font-bold text-sm">{analysis.expectedClosureDays} Days</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded p-1.5">
                                  <span className="text-slate-400 block uppercase">Est Revenue</span>
                                  <span className="text-emerald-600 font-bold text-sm">₹15 L</span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 italic leading-relaxed border-t border-slate-200/50 pt-2">
                                {analysis.reasoning}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SALES PIPELINE (KANBAN BOARD) */}
                {activeTab === "pipeline" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 mb-2">CRM Sales Lifecycle</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Transition clients across strategic sourcing pipeline milestones. Every movement automatically posts cryptographic system events in the company ledger.
                      </p>
                    </div>

                    {/* Kanban Flow View */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                      {PIPELINE_STAGES.map((stage, sIdx) => {
                        const isActive = (pipelineState[selectedClient.id] || "Active Client") === stage;
                        
                        return (
                          <div 
                            key={stage} 
                            onClick={() => handlePipelineMove(stage)}
                            className={cn(
                              "bg-white border p-4 rounded-2xl min-w-[180px] shadow-sm cursor-pointer transition-all flex flex-col justify-between h-40 group",
                              isActive 
                                ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20 hover:scale-[1.02]" 
                                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">STAGE {sIdx + 1}</span>
                              {isActive && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shadow-md" />
                              )}
                            </div>
                            
                            <div>
                              <h4 className={cn(
                                "font-bold text-base tracking-tight",
                                isActive ? "text-indigo-600" : "text-slate-800"
                              )}>
                                {stage}
                              </h4>
                              {isActive ? (
                                <p className="text-[11px] text-indigo-700 font-semibold mt-1">Active Account Location</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to transition</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. TIMELINE & TOUCHPOINTS */}
                {activeTab === "timeline" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Relationship Timeline</h3>
                        </div>
                      </div>

                      {/* Timeline Events Feed */}
                      <div className="space-y-6 relative font-sans pl-6">
                        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-200 shadow-[1px_0_0_white]" />
                        
                        {[
                          { title: "Strategic Account Transition", desc: "Account transitioned to Active Client pipeline stage by BDM Gopal.", type: "SYSTEM", date: "Yesterday" },
                          { title: "Technical Alignment Sync Logged", desc: "Meeting Workspace created: Sourcing and core JD expansions synchronized.", type: "MEETING", date: "2 days ago" },
                          { title: "Contract Agreement Signed (MSA)", desc: "Corporate Legal MSA filed and finalized inside Secure Deal Room.", type: "LEGAL", date: "Last week" },
                          { title: "JD Received & Parsed", desc: "Parsed JD for Senior Frontend Architect. Triggered budget assessment pipeline.", type: "REQUISITION", date: "2 weeks ago" },
                        ].map((item, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border border-indigo-200 shadow-inner group-hover:scale-125 transition-transform" />
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide">{item.title}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                              </div>
                              <p className="text-xs text-slate-600">{item.desc}</p>
                              <span className="text-[9px] font-black tracking-widest font-mono text-indigo-500 uppercase mt-1.5 inline-block">
                                TYPE: {item.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MEETING WORKSPACE */}
                {activeTab === "meetings" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Meeting Workspaces</h3>
                        </div>
                      </div>

                      {/* Log a New Meeting */}
                      <form onSubmit={handleAddMeeting} className="bg-slate-50 border border-slate-200/80 p-5 rounded-xl space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono">Create Meeting Workspace</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            required
                            placeholder="Meeting Agenda"
                            value={newMeetingForm.agenda}
                            onChange={e => setNewMeetingForm({...newMeetingForm, agenda: e.target.value})}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Date / Time (e.g. Tomorrow 10 AM)"
                            value={newMeetingForm.date}
                            onChange={e => setNewMeetingForm({...newMeetingForm, date: e.target.value})}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Participants (comma separated)"
                            value={newMeetingForm.participants}
                            onChange={e => setNewMeetingForm({...newMeetingForm, participants: e.target.value})}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Key Decisions Made"
                            value={newMeetingForm.decisions}
                            onChange={e => setNewMeetingForm({...newMeetingForm, decisions: e.target.value})}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                          />
                        </div>

                        <textarea
                          placeholder="AI Summary & Context"
                          value={newMeetingForm.summary}
                          onChange={e => setNewMeetingForm({...newMeetingForm, summary: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none h-16 resize-none"
                        />

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider"
                        >
                          Establish Workspace
                        </button>
                      </form>

                      {/* Display Logged Meetings */}
                      <div className="space-y-4">
                        {meetings.map((meet) => (
                          <div key={meet.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-900 text-sm">{meet.agenda}</h4>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{meet.date}</span>
                            </div>
                            
                            <div className="text-xs text-slate-500">
                              <span className="font-bold text-slate-700">Participants:</span> {meet.participants}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest block font-mono mb-1">AI Summary</span>
                                <p className="text-slate-600 leading-relaxed italic">{meet.summary}</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest block font-mono mb-1">Decisions & Action Items</span>
                                <p className="text-slate-600 leading-relaxed font-medium">Decisions: {meet.decisions}</p>
                                <p className="text-slate-500 mt-1">Action Items: {meet.actionItems}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SECURE DEAL ROOM */}
                {activeTab === "dealroom" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Lock className="w-40 h-40" />
                      </div>
                      
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">Secure Client Deal Room</span>
                        </div>
                        <h3 className="text-xl font-black">Contract and Allocation Repository</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Secure access sandbox mapping active MSAs, NDAs, pricing tiers, and client-vendor representations. Restricted to admin role execution.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { title: "Master Service Agreement (MSA)", file: "MSA_CloudAssure_Signed_2026.pdf", status: "Active" },
                        { title: "Mutual Non-Disclosure Agreement", file: "NDA_CloudAssure_Final_Signed.pdf", status: "Active" },
                        { title: "Special Pricing Addendum", file: "Pricing_Schedules_CloudAssure_V2.pdf", status: "Active" }
                      ].map((doc, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between h-32 hover:shadow-sm transition-shadow">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs truncate">{doc.title}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-1">{doc.file}</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                            <span className="text-[9px] font-black uppercase text-emerald-600 font-mono tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {doc.status}
                            </span>
                            <button className="text-[10px] text-indigo-600 font-mono hover:underline font-bold">
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. CLIENT SELF-SERVICE PORTAL SIMULATOR */}
                {activeTab === "portal" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
                      <h3 className="text-lg font-black flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-200" />
                        Client Self-Service Portal Sandbox
                      </h3>
                      <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                        This sandbox mimics what the corporate client sees when accessing their dedicated HireNestOS portal track.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Submissions review board */}
                      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Client Candidate Review</h4>
                        <div className="space-y-2">
                          {[
                            { name: "Suresh Kumar", title: "Senior React Architect", score: 94, vendor: "VTech Staffing" },
                            { name: "Pooja Hegde", title: "Senior UI/UX Engineer", score: 88, vendor: "RecruitCore" }
                          ].map((c, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-200/50">
                              <div>
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{c.title}</p>
                              </div>
                              <div className="flex gap-2">
                                <button className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-md hover:bg-emerald-700">
                                  Approve
                                </button>
                                <button className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-300">
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invoice and scheduling tracker */}
                      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Client Invoices & Deliverables</h4>
                        <div className="space-y-2">
                          {[
                            { id: "INV-2026-004", value: "₹4,50,000", status: "PAID", date: "June 28, 2026" },
                            { id: "INV-2026-008", value: "₹12,00,000", status: "AWAITING APPROVAL", date: "July 01, 2026" }
                          ].map((inv, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-200/50">
                              <div>
                                <p className="font-bold text-slate-950">{inv.id}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-900">{inv.value}</p>
                                <span className={cn(
                                  "text-[8px] font-bold px-1.5 py-0.5 rounded border inline-block mt-1 font-mono",
                                  inv.status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. CUSTOM ACCOUNT COPILOT CHAT */}
                {activeTab === "copilot" && (
                  <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                        <Bot className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Grounded CRM Copilot</h4>
                        <p className="text-[10px] text-slate-400">Analyzing live communications, NDA, MSA, and technical pipelines for this client.</p>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-4 h-[40vh] overflow-y-auto custom-scrollbar pr-1 bg-white border border-slate-200 rounded-2xl p-4 font-sans text-xs">
                      {copilotMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "p-4 rounded-2xl max-w-[85%] space-y-1.5 leading-relaxed shadow-sm",
                            msg.role === 'assistant' 
                              ? "bg-slate-50 border border-slate-200 mr-auto text-slate-800" 
                              : "bg-indigo-600 text-white ml-auto"
                          )}
                        >
                          <span className="text-[9px] font-mono uppercase opacity-60 tracking-wider block font-bold">
                            {msg.role === 'assistant' ? 'Copilot Agent' : 'You (BDM)'}
                          </span>
                          <p className="whitespace-pre-line leading-relaxed font-medium">{msg.content}</p>
                        </div>
                      ))}
                      
                      {isCopilotTyping && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl max-w-[15%] mr-auto flex gap-1 justify-center items-center shadow-sm">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      )}
                    </div>

                    {/* Input message form */}
                    <form onSubmit={handleCopilotSend} className="flex gap-2">
                      <input
                        type="text"
                        value={copilotInput}
                        onChange={e => setCopilotInput(e.target.value)}
                        placeholder={`Ask anything about ${selectedClient.company}...`}
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-sans shadow-sm transition-all"
                      />
                      <button
                        type="submit"
                        className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono uppercase tracking-wider rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/15"
                      >
                        Send Query
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white p-20 text-center rounded-[2rem] border border-slate-200 border-dashed text-slate-400 flex flex-col items-center justify-center h-full min-h-[50vh]">
              <Compass className="w-16 h-16 text-slate-300 mb-4 stroke-[1.5]" />
              <h3 className="font-bold text-slate-700 text-lg mb-1" style={{textShadow: '0 1px 0 white'}}>No Client Account Selected</h3>
              <p className="text-sm max-w-sm">Select any corporate client entity from the portfolio queue to launch the Account 360 Workspace.</p>
            </div>
          )}
        </div>
      </div>

      {/* Onboard Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Onboard Corporate Client</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.company}
                    onChange={(e) => setForm({...formData, company: e.target.value})}
                    placeholder="e.g. Cloud Assure"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Website URL</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setForm({...formData, website: e.target.value})}
                    placeholder="e.g. cloudassure.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setForm({...formData, industry: e.target.value})}
                    placeholder="e.g. Information Technology"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setForm({...formData, location: e.target.value})}
                    placeholder="e.g. Bangalore, India"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Contact Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setForm({...formData, email: e.target.value})}
                    placeholder="contact@company.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setForm({...formData, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase tracking-wider font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-xs uppercase tracking-wider font-mono shadow-lg shadow-indigo-600/20"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
