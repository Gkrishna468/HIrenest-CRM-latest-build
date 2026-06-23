import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Search,
  Clock,
  Bot,
  Zap,
  Send,
  Building2,
  Users,
  Handshake,
  ArrowRight,
  RefreshCw,
  Plus,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { processInteraction, BrainInsight } from "@/services/brainService";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

type EntityType = "actionable" | "Requirement" | "Vendor Submission" | "Interview" | "Spam" | "Noise" | "all";

export default function CommunicationCenter() {
  const { user, apiFetch } = useAuth();
  const { jobs, candidates, deals, addJob, addCandidate } = useData();
  const [activeTab, setActiveTab] = useState<EntityType>("actionable");
  const [selectedComm, setSelectedComm] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<BrainInsight | null>(null);

  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [draftBody, setDraftBody] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Copilot State
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState(false);

  const generateCopilotDraft = async (action: string) => {
    if (!selectedComm) return;
    setIsGeneratingCopilot(true);
    setDraftBody("Generating...");
    try {
      const response = await apiFetch("/api/ai?action=copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            email: selectedComm.content,
            subject: selectedComm.subject,
            sender: selectedComm.sender,
            insight: insight,
          },
          emailId: selectedComm.id,
          action: action,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Network error");
      if (!data.draft) throw new Error("Empty draft returned");
      setDraftBody(data.draft);
      toast.success("Draft generated");
    } catch (e: any) {
      toast.error("AI unavailable. Generated professional fallback response.");
      
      // Rule Engine Fallback -> Template Engine
      let fallbackText = `Hi ${selectedComm.sender || 'Team'},\n\nThank you for reaching out regarding ${selectedComm.subject || 'this matter'}.\n\n`;
      
      const a = action.toLowerCase();
      if (a.includes('acknowledgement')) {
         fallbackText += "We have successfully received your requirement and our sourcing network has been activated. We will provide suitable profiles shortly.";
      } else if (a.includes('broadcast')) {
         fallbackText += "We have an urgent requirement matching your bench profiles. Please reply with updated resumes of available consultants soon.";
      } else if (a.includes('submission')) {
         fallbackText += "Please find the attached candidate profiles for your review. We have verified their availability and core competencies.";
      } else if (a.includes('follow-up')) {
         fallbackText += "Just following up on my previous communication. Could you please provide an update when available?";
      } else {
         fallbackText += "We are reviewing your request and will get back to you with the next steps soon. Please let us know if you need anything else.";
      }
      
      fallbackText += "\n\nBest regards,\nHireNest Sourcing Team";
      
      setDraftBody(fallbackText);
    } finally {
      setIsGeneratingCopilot(false);
    }
  };

  // Stats for KPI Strip
  const todayEmails = emails.length;
  const submissionsCount = candidates.filter(
    (c) => c.stage === "submission",
  ).length;
  const interviewsCount = candidates.filter(
    (c) => c.stage === "interview",
  ).length;
  const pipelineValue = deals.reduce(
    (sum, d) => sum + (Number(d.revenue_amount) || 0),
    0,
  );
  
  const vendorCostForPipeline = deals.reduce((sum, d) => sum + (Number((d as any).vendor_cost) || 0), 0);
  const marginValue = vendorCostForPipeline > 0 ? (pipelineValue - vendorCostForPipeline) : null;

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const userQuery = user?.id
        ? `&userId=${encodeURIComponent(user.id)}`
        : "";
      const response = await apiFetch(`/api/gmail?action=list${userQuery}`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      const data = await response.json();

      const formattedMails = (data.emails || []).map((e: any) => {
        const estDate = e.receivedAt ? new Date(e.receivedAt) : new Date();
        const formattedTime = isNaN(estDate.getTime()) 
          ? (e.receivedAt || "Recently")
          : estDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            });

        return {
          id: e.id,
          type: "email",
          sender: e.from?.replace(/<.*>/, "").trim() || e.from,
          senderEmail: e.from,
          content: e.snippet || "",
          fullBody: e.body || "",
          subject: e.subject || "No Subject",
          timestamp: formattedTime,
          entityType: e.entityType || "Requirement",
          entityName: e.senderType || "Vendor",
          isAiAnalyzed: !!e.aiSummary || e.isAiAnalyzed || false,
          threadId: e.threadId,
          aiSummary: e.aiSummary || "",
          senderType: e.senderType || "Unknown",
          confidence: e.confidence || 0.94,
          source: e.source || "Gemini Flash"
        };
      });

      setEmails(formattedMails);
      if (formattedMails.length > 0 && !selectedComm) {
        setSelectedComm(formattedMails[0]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load emails");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.id) {
      toast.error("User ID not found");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await apiFetch(
        `/api/gmail?action=sync&userId=${encodeURIComponent(user.id)}`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404 && data.error === 'No connection found for this user') {
           throw new Error('Gmail is not connected. Please go to Settings to connect your account.');
        }
        throw new Error(data.error || "Failed to sync");
      }

      toast.success(data.message || "Inbox synced successfully");
      await fetchEmails();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error syncing inbox");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [user]);

  const runIntelligence = async (comm: any) => {
    setIsAnalyzing(true);
    setInsight(null);
    setDraftBody("");
    try {
      const source = comm.type === "whatsapp" ? "whatsapp" : "email";
      const res = await processInteraction(
        comm.fullBody || comm.content,
        { source, from: comm.sender, entityType: comm.entityType },
        comm.id,
      );

      if (comm.id) {
        setEmails((prev) =>
          prev.map((c) =>
            c.id === comm.id
              ? { ...c, isAiAnalyzed: true, entityType: res.profile?.intent }
              : c,
          ),
        );
      }

      setInsight(res);
      setDraftBody(res.pitch || "");
      toast.success(`AI Classified as: ${res.profile?.intent}`, {
        style: { background: "#10b981", color: "white" },
      });
    } catch (err) {
      console.error(err);
      toast.error("AI unavailable. Generated professional fallback response.");
      let fallbackText = `Hi ${comm.sender || 'Team'},\n\nThank you for reaching out regarding ${comm.subject || 'this matter'}.\n\n`;
      fallbackText += "We are reviewing your request and will get back to you with the next steps soon. Please let us know if you need anything else.\n\n";
      fallbackText += "Best regards,\nHireNest Sourcing Team";
      
      setDraftBody(fallbackText);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendDraft = async () => {
    if (!draftBody.trim()) {
      toast.error("Draft is empty");
      return;
    }
    if (!selectedComm) return;

    setIsSending(true);
    try {
      // Implement Reply-All Intelligence check
      const isReplyAll = !!selectedComm.cc;
      
      const response = await apiFetch("/api/gmail?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          to: selectedComm.senderEmail,
          cc: isReplyAll ? selectedComm.cc : undefined,
          subject: `Re: ${selectedComm.subject?.replace(/^(Re:\s*)+/i, "") || "Your inquiry"}`,
          body: draftBody,
          threadId: selectedComm.threadId,
          messageId: selectedComm.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send");
      toast.success(isReplyAll ? "Reply-All email sent successfully" : "Email sent successfully");
      setDraftBody("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (selectedComm) {
      runIntelligence(selectedComm);
    }
  }, [selectedComm]);

  const saveRequirement = async () => {
    if (!insight?.extractedRequirement) return;
    try {
      await addJob({
        title: insight.extractedRequirement.title,
        clientName: insight.extractedRequirement.client,
        location: insight.extractedRequirement.location,
        type: insight.extractedRequirement.employmentType,
        salary: insight.extractedRequirement.budget,
        source: "mailos",
      } as any);
      toast.success("Requirement Created");
    } catch (e) {
      toast.error("Failed to create Requirement");
    }
  };

  const saveSubmission = async () => {
    if (!insight?.extractedSubmission) return;
    try {
      await addCandidate({
        name: insight.extractedSubmission.candidateName,
        source: insight.extractedSubmission.vendorName || "mailos",
        stage: "submission",
        location: insight.extractedSubmission.noticePeriod || "",
        email: selectedComm?.senderEmail || "unknown@example.com",
      } as any);
      toast.success("Submission Created");
    } catch (e) {
      toast.error("Failed to create Submission");
    }
  };

  const scheduleInterview = async () => {
    if (!insight?.extractedInterview) return;
    try {
      // Currently no dedicated interview API in Supabase client context, just log it visually
      toast.success("Interview Created (Phase 6 DB Check pending)");
    } catch (e) {
      toast.error("Failed to schedule Interview");
    }
  };

  const filteredComms = emails;

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-4 shrink-0">
        <div className="skeuo-card p-4 flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Emails Today
          </span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 drop-shadow-sm">
            {todayEmails}
          </span>
        </div>
        <div className="skeuo-card bg-indigo-50/20 p-4 border-indigo-200 flex flex-col justify-center">
          <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">
            Requirements
          </span>
          <span className="text-2xl font-extrabold text-indigo-900 mt-1 drop-shadow-sm">
            {jobs.length}
          </span>
        </div>
        <div className="skeuo-card bg-emerald-50/20 p-4 border-emerald-200 flex flex-col justify-center">
          <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
            Submissions
          </span>
          <span className="text-2xl font-extrabold text-emerald-900 mt-1 drop-shadow-sm">
            {submissionsCount}
          </span>
        </div>
        <div className="skeuo-card bg-purple-50/20 p-4 border-purple-200 flex flex-col justify-center">
          <span className="text-purple-600 text-xs font-bold uppercase tracking-widest">
            Interviews
          </span>
          <span className="text-2xl font-extrabold text-purple-900 mt-1 drop-shadow-sm">
            {interviewsCount}
          </span>
        </div>
        <div className="skeuo-card p-4 flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Pipeline Value
          </span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 drop-shadow-sm">
            ₹
            {pipelineValue > 100000
              ? (pipelineValue / 100000).toFixed(1) + "L"
              : pipelineValue.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Expected Margin
          </span>
          <span className="text-2xl font-black text-white mt-1">
            {marginValue !== null ? (
              <>
                ₹
                {marginValue > 100000
                  ? (marginValue / 100000).toFixed(1) + "L"
                  : marginValue.toLocaleString()}
              </>
            ) : "N/A"}
          </span>
        </div>
      </div>

      <div className="flex-1 skeuo-card rounded-[2rem] overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between skeuo-bg shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>
              MailOS
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Requirement Intake Engine
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 skeuo-btn text-sm disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-4 h-4 drop-shadow-sm", isSyncing && "animate-spin")}
              />
              {isSyncing ? "Syncing..." : "Sync Inbox"}
            </button>
            <div className="w-[2px] h-8 bg-slate-300 shadow-[1px_0_0_white]"></div>
            <div className="flex gap-2 skeuo-bg p-1.5 rounded-[1.25rem] border border-slate-300 shadow-inner">
              {[
                { id: "actionable", label: "Inbox" },
                { id: "Requirement", label: "Reqs", icon: Building2 },
                { id: "Vendor Submission", label: "Vendors", icon: Handshake },
                { id: "Interview", label: "Interviews", icon: Users },
                { id: "Noise", label: "Noise Folder" },
                { id: "all", label: "All Mail" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === tab.id
                      ? "skeuo-btn-primary"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Thread List */}
          <div className="w-[25%] min-w-[280px] border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex items-center justify-center text-slate-400 text-sm font-medium">
                  Loading emails...
                </div>
              ) : filteredComms.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <Mail className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">
                    No emails found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Sync Inbox" to fetch new emails from Gmail.
                  </p>
                </div>
              ) : (
                filteredComms.map((comm) => (
                  <button
                    key={comm.id}
                    onClick={() => setSelectedComm(comm)}
                    className={cn(
                      "w-full p-5 text-left border-b border-slate-100 transition-all hover:bg-slate-50 group",
                      selectedComm?.id === comm.id
                        ? "bg-white shadow-sm ring-1 ring-slate-200"
                        : "",
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 max-w-[250px]">
                        <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span
                          className="text-xs font-black uppercase tracking-widest text-slate-400 truncate"
                          title={comm.sender}
                        >
                          {comm.sender}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">
                        {comm.timestamp}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 leading-tight line-clamp-1">
                      {comm.subject}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {comm.content}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation View */}
          {selectedComm ? (
            <>
              <div className="w-[45%] flex flex-col bg-white border-r border-slate-100 shrink-0">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                      {selectedComm.sender[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-black text-slate-900 truncate">
                        {selectedComm.subject}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                          {selectedComm.sender}
                        </p>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {selectedComm.entityType || "Requirement"} ({selectedComm.senderType || "Unknown"})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* AI Classification Summary */}
                    {selectedComm.aiSummary && (
                      <div className="bg-indigo-50/40 p-6 rounded-3xl border border-indigo-150 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                          <Bot className="w-12 h-12 text-indigo-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Gemini AI Engine Ingestion</span>
                          <span className="text-[9px] text-indigo-500 font-bold">({Math.round((selectedComm.confidence || 0.94) * 100)}% Confidence via {selectedComm.source || "Gemini Flash"})</span>
                        </div>
                        <p className="text-xs text-indigo-950 font-bold mb-1 leading-relaxed">
                          Classified Topic: <span className="text-indigo-600 uppercase">{selectedComm.entityType || "Requirement"}</span> ({selectedComm.senderType || "Unknown"})
                        </p>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {selectedComm.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* The inbound message */}
                    <div className="bg-white p-6 rounded-3xl rounded-tl-sm border border-slate-200 shadow-sm">
                      <p className="text-[15px] font-medium text-slate-800 leading-[1.7] whitespace-pre-wrap max-w-full">
                        {selectedComm.fullBody || selectedComm.content}
                      </p>
                      <div className="mt-6 flex items-center gap-2 text-slate-400 pt-4 border-t border-slate-100">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {selectedComm.timestamp} via {selectedComm.type}
                        </span>
                      </div>
                    </div>

                    {/* AI Draft Response Placeholder */}
                    <div className="bg-white p-6 rounded-3xl rounded-tr-sm border border-indigo-100 shadow-sm ml-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Bot className="w-16 h-16 text-indigo-600" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">
                          Suggested Draft
                        </span>
                      </div>
                      <textarea
                        className="w-full min-h-[120px] p-4 bg-indigo-50/50 border-none rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-indigo-500/20 resize-y mb-4 text-slate-800 leading-relaxed"
                        readOnly={isAnalyzing || isSending}
                        value={draftBody || ""}
                        onChange={(e) => setDraftBody(e.target.value)}
                        placeholder="Assistant drafting response..."
                      />
                      <div className="flex justify-between items-center relative z-10">
                        <button className="text-[10px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">
                          Refine Draft
                        </button>
                        <button
                          onClick={handleSendDraft}
                          disabled={isSending}
                          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {isSending ? "Sending..." : "Send Draft"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Context & Assistant Sidebar */}
              <div className="w-[30%] bg-white p-6 overflow-y-auto shrink-0 flex flex-col space-y-6 min-w-[300px]">
                {/* MailOS Copilot Section */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <Bot className="w-4 h-4" /> Business Actions
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    {insight?.profile?.intent === "Requirement" && (
                      <>
                        <button
                          onClick={() =>
                            generateCopilotDraft(
                              "Generate Client Acknowledgement",
                            )
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          ✉️ Generate Client Acknowledgement
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Generate Vendor Broadcast")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          📢 Generate Vendor Broadcast
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Find Matching Candidates")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          🔍 Find Matching Candidates
                        </button>
                      </>
                    )}

                    {insight?.profile?.intent === "Vendor Submission" && (
                      <>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Review Candidate")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          👀 Review Candidate
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Generate Submission Email")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          📤 Generate Submission Email
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Schedule Screening")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          📅 Schedule Screening
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Reject Candidate")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          ❌ Reject Candidate
                        </button>
                      </>
                    )}

                    {insight?.profile?.intent === "Interview" && (
                      <>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Send Confirmation")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          ✅ Send Confirmation
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft(
                              "Generate Candidate Instructions",
                            )
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          📝 Generate Candidate Instructions
                        </button>
                      </>
                    )}

                    {insight?.profile?.intent === "Offer" && (
                      <>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Generate Candidate Follow-up")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          🤝 Generate Candidate Follow-up
                        </button>
                      </>
                    )}

                    {(!insight?.profile?.intent ||
                      ![
                        "Requirement",
                        "Vendor Submission",
                        "Interview",
                        "Offer",
                      ].includes(insight.profile.intent)) && (
                      <>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Client Engagement")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          ☕ Client Engagement
                        </button>
                        <button
                          onClick={() =>
                            generateCopilotDraft("Collection Reminder")
                          }
                          disabled={isGeneratingCopilot}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          💰 Collection Reminder
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Analysis
                  </h3>
                  {isAnalyzing ? (
                    <div className="space-y-4">
                      <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                      <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                    </div>
                  ) : insight ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between mb-3 text-[10px] font-black uppercase">
                          <span className="text-slate-400">
                            Detected Intent
                          </span>
                          <span className="text-indigo-600">
                            {insight.profile.intent}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-slate-400">Urgency</span>
                          <span
                            className={
                              insight.profile.urgency === "high"
                                ? "text-red-500"
                                : "text-emerald-500"
                            }
                          >
                            {insight.profile.urgency}
                          </span>
                        </div>
                      </div>

                      {/* Action Engine rendering based on Intent */}
                      {insight.profile.intent === "Requirement" &&
                        insight.extractedRequirement && (
                          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl mt-4">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
                              <span className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" />{" "}
                                New Requirement
                              </span>
                            </div>
                            <div className="space-y-3 mb-5">
                              {insight.extractedRequirement.client && (
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                                    Client
                                  </p>
                                  <p className="text-sm font-black text-indigo-950">
                                    {insight.extractedRequirement.client}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                                  Role
                                </p>
                                <p className="text-sm font-bold text-indigo-900">
                                  {insight.extractedRequirement.title}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                                    Location
                                  </p>
                                  <p className="text-xs font-semibold text-indigo-900">
                                    {insight.extractedRequirement.location ||
                                      "Remote"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                                    Budget
                                  </p>
                                  <p className="text-xs font-semibold text-indigo-900">
                                    {insight.extractedRequirement.budget ||
                                      "TBD"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <button
                                onClick={saveRequirement}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/20"
                              >
                                <Plus className="w-4 h-4" /> Create Requirement
                              </button>
                              <button className="w-full flex items-center justify-center gap-2 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border border-indigo-100">
                                Match Bench Resources
                              </button>
                            </div>
                          </div>
                        )}

                      {insight.profile.intent === "Vendor Submission" &&
                        insight.extractedSubmission && (
                          <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl mt-4">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                              <span className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />{" "}
                                Vendor Submission
                              </span>
                            </div>
                            <div className="space-y-3 mb-5">
                              <div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">
                                  Candidate
                                </p>
                                <p className="text-sm font-black text-emerald-950">
                                  {insight.extractedSubmission.candidateName}
                                </p>
                              </div>
                              {insight.extractedSubmission.vendorName && (
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">
                                    Vendor
                                  </p>
                                  <p className="text-xs font-bold text-emerald-900">
                                    {insight.extractedSubmission.vendorName}
                                  </p>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {insight.extractedSubmission.skills?.map(
                                  (s: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold"
                                    >
                                      {s}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                            <button
                              onClick={saveSubmission}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20"
                            >
                              <Plus className="w-4 h-4" /> Create Submission
                            </button>
                          </div>
                        )}

                      {insight.profile.intent === "Interview" &&
                        insight.extractedInterview && (
                          <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl mt-4">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
                              <span className="text-xs font-black text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-600" />{" "}
                                Interview Schedule
                              </span>
                            </div>
                            <div className="space-y-3 mb-5">
                              <div>
                                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-0.5">
                                  Client
                                </p>
                                <p className="text-sm font-black text-purple-950">
                                  {insight.extractedInterview.client}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-0.5">
                                  Date & Time
                                </p>
                                <p className="text-xs font-bold text-purple-900">
                                  {insight.extractedInterview.date}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-0.5">
                                  Candidate
                                </p>
                                <div className="flex flex-col gap-1 mt-1">
                                  <span className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>{" "}
                                    {insight.extractedInterview.candidateName}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={scheduleInterview}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-purple-600/20"
                            >
                              <Plus className="w-4 h-4" /> Create Interview
                            </button>
                          </div>
                        )}

                      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black uppercase text-slate-300">
                            Strategy
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-slate-300 pt-2 border-slate-800">
                          {insight.followUp.reason}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs text-center py-8">
                      Select a message for AI insights.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-slate-100 mb-6">
                <MessageSquare className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900">MailOS</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs text-center">
                Select an email thread to view context and generate AI
                responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
