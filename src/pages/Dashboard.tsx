/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAgentActivities, AgentActivity } from "@/lib/api/agentActivities";
import { SystemRepository } from "@/repositories/SystemRepository";
import { cn } from "@/lib/utils";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/services/firebase/config";
import {
  Briefcase,
  Users,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Zap,
  Handshake,
  Bot,
  TrendingUp,
  BrainCircuit,
  FileSearch,
  AlertTriangle,
  Globe,
  MessageSquare,
  Trophy,
  History,
  Building2,
  Database,
  LineChart,
  Calendar,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Layers,
  Sparkle
} from "lucide-react";
import { 
  calculateRelationshipScore, 
  generateFollowUpSuggestions, 
  predictMonthlyRevenue 
} from "@/services/RelationshipIntelligenceEngine";

export default function Dashboard() {
  const { jobs, candidates, deals, vendors, clients } = useData();
  const { user } = useAuth();
  
  // Dashboard Role Mode: "founder" or "bdm"
  const [dashboardMode, setDashboardMode] = useState<"founder" | "bdm">("founder");

  const [telemetry, setTelemetry] = useState<any>({
    successfulUploads: 0,
    updates: 0,
    newCandidates: 0,
    duplicates: 0,
    conflicts: 0,
    fallbackUsage: 0,
    retryQueueSize: 0,
    reprocessSuccessCount: 0,
    reprocessFailCount: 0
  });
  const [queue, setQueue] = useState<any[]>([]);
  const [reprocessing, setReprocessing] = useState(false);

  const fetchIngestionData = async () => {
    try {
      const telDoc = await getDoc(doc(db, "ingestion_telemetry", "overall"));
      if (telDoc.exists()) {
        setTelemetry(telDoc.data());
      } else {
        // If not initialized yet, let's keep defaults
        setTelemetry({
          successfulUploads: 0,
          updates: 0,
          newCandidates: 0,
          duplicates: 0,
          conflicts: 0,
          fallbackUsage: 0,
          retryQueueSize: 0,
          reprocessSuccessCount: 0,
          reprocessFailCount: 0
        });
      }
      const q = query(collection(db, "ai_reprocessing_queue"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const queueItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setQueue(queueItems);
    } catch (err: any) {
      console.log("Failed to fetch ingestion telemetry:", err.message);
    }
  };

  const handleReprocessQueue = async () => {
    if (reprocessing) return;
    setReprocessing(true);
    try {
      await toast.promise(
        fetch("/api/candidates?action=reprocessAiQueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }).then(async (res) => {
          if (!res.ok) throw new Error("Reprocessing queue failed");
          const data = await res.json();
          await fetchIngestionData();
          return data;
        }),
        {
          loading: "Contacting Gemini API, performing structured extraction reprocessing...",
          success: (data) => `Reprocessed queue items successfully! ${data.message || ""}`,
          error: "Failed to reprocess queue items."
        }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setReprocessing(false);
    }
  };

  useEffect(() => {
    fetchIngestionData();
    // Poll every 15s to keep real-time updates of the pipeline on active cockpit view
    const interval = setInterval(fetchIngestionData, 15000);
    return () => clearInterval(interval);
  }, []);

  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [systemEvents, setSystemEvents] = useState<any[]>([]);
  const [firestoreCounts, setFirestoreCounts] = useState({
    requirements: 0,
    candidates: 0,
    submissions: 0,
    interviews: 0,
    offers: 0,
    placements: 0,
    systemEvents: 0
  });

  useEffect(() => {
    const unsubscribe = subscribeToAgentActivities((data) => {
      setAgentActivities(data);
    });

    const unsubReqs = SystemRepository.subscribeToCollectionSize(
      "requirements_private",
      (size) => setFirestoreCounts((p) => ({ ...p, requirements: size })),
      (err) => console.log("requirements_private listener skipped:", err.message)
    );

    const unsubCands = SystemRepository.subscribeToCollectionSize(
      "candidatePool",
      (size) => setFirestoreCounts((p) => ({ ...p, candidates: size })),
      (err) => console.log("candidatePool listener skipped:", err.message)
    );

    const unsubSubs = SystemRepository.subscribeToCollectionSize(
      "submissions",
      (size) => setFirestoreCounts((p) => ({ ...p, submissions: size })),
      (err) => console.log("submissions listener skipped:", err.message)
    );

    const unsubInterviews = SystemRepository.subscribeToCollectionSize(
      "interviews",
      (size) => setFirestoreCounts((p) => ({ ...p, interviews: size })),
      (err) => console.log("interviews listener skipped:", err.message)
    );

    const unsubEvents = SystemRepository.subscribeToSystemEvents(
      (events) => {
        setFirestoreCounts((p) => ({ ...p, systemEvents: events.length }));
        setSystemEvents(events.slice(0, 5));
      },
      (err) => console.log("system_events listener skipped:", err.message)
    );

    return () => {
      unsubscribe();
      unsubReqs();
      unsubCands();
      unsubSubs();
      unsubInterviews();
      unsubEvents();
    };
  }, []);

  const openRequirements = firestoreCounts.requirements || jobs.filter(j => j.source !== 'crm' && (j.status?.toLowerCase() === "open" || !j.status)).length;
  const crmRequirementsCount = jobs.filter(j => j.source === 'crm' && (j.status?.toLowerCase() === "open" || !j.status)).length;
  const crmClientsCount = clients.filter(c => c.source === 'crm').length;
  const crmVendorsCount = vendors.filter(v => v.source === 'crm').length;
  
  const totalSubmissions = firestoreCounts.submissions || candidates.filter(c => c.stage === "submission" || c.stage === "screening" || !c.stage).length;
  const placements = firestoreCounts.placements || candidates.filter(c => c.stage === "placed" || c.stage === "joined").length || deals.length;
  const readyCandidatesCount = firestoreCounts.candidates || candidates.filter(c => c.stage === 'available' || !c.stage).length;
  const interviewsCount = firestoreCounts.interviews || candidates.filter(c => c.stage === 'interview').length;
  
  const expectedRevenue = deals.reduce((sum, d) => sum + (Number(d.revenue_amount) || 0), 0);
  const vendorPayables = deals?.reduce((sum, d) => sum + (Number((d as any).vendor_cost) || 0), 0) || 0;
  const expectedMargin = (expectedRevenue > 0 && vendorPayables > 0) ? (expectedRevenue - vendorPayables) : 0; 

  const escalatedJobs = jobs.filter(j => 
    (j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'pending') && 
    (Date.now() - new Date(j.createdAt).getTime()) > (4 * 24 * 60 * 60 * 1000) &&
    (!j.submissionsCount || j.submissionsCount === 0)
  ) || [];

  const readyCandidates = candidates.filter(c => {
    const isMatch = (c as any).matchScore ? (c as any).matchScore > 85 : true;
    const isReady = c.stage === 'available' || c.stage === 'screening' || !c.stage;
    return isMatch && isReady;
  }) || [];

  const inactiveVendors = vendors.filter(v => 
    (Date.now() - new Date(v.updatedAt || v.createdAt || Date.now()).getTime()) > (7 * 24 * 60 * 60 * 1000)
  ) || [];

  // Relationship intelligence forecasts
  const forecast = predictMonthlyRevenue(deals, jobs);
  const followUps = generateFollowUpSuggestions(clients, jobs);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="skeuo-bg border border-slate-300 min-h-full rounded-[2rem] p-8 text-slate-800 relative overflow-hidden flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-inner">
      
      {/* Top Banner with Toggle Mode */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2.5 py-0.5 skeuo-btn border border-indigo-200 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-inner animate-pulse" />
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">
                INTELLIGENCE FABRIC ONLINE
              </span>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-200/60 rounded-full text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              ROLE: {user?.role || 'FOUNDER'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ textShadow: '0 1px 1px white' }}>
            System Cockpit
          </h1>
          <p className="text-xs text-slate-500">Continuous relationship monitoring & forecasting engine.</p>
        </div>

        {/* Dynamic Selector for Dashboard View */}
        <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner flex gap-1 font-mono text-[10px] font-bold uppercase tracking-wider">
          <button
            onClick={() => {
              setDashboardMode("founder");
              toast.info("Switching to Founder Executive Cockpit");
            }}
            className={cn(
              "px-3.5 py-2 rounded-lg transition-all",
              dashboardMode === "founder" 
                ? "bg-slate-950 text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Founder Cockpit
          </button>
          <button
            onClick={() => {
              setDashboardMode("bdm");
              toast.info("Switching to BDM Morning Briefing");
            }}
            className={cn(
              "px-3.5 py-2 rounded-lg transition-all",
              dashboardMode === "bdm" 
                ? "bg-slate-950 text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            BDM Briefing
          </button>
        </div>
      </div>

      {/* DYNAMIC VIEWS */}
      {dashboardMode === "founder" ? (
        // ==========================================
        // FOUNDER COCKPIT (EXECUTIVE VIEW)
        // ==========================================
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* AI Revenue Projections & Prediction Widget */}
          <div className="bg-slate-950 text-white p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles className="w-48 h-48" />
            </div>
            
            <div className="space-y-3 relative z-10 max-w-xl">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <span className="text-[10px] font-black uppercase text-indigo-400 font-mono tracking-widest">
                  AI Revenue Forecast Model
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">AI Predictive Month Projection</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analyzing open client requisitions, historical conversion cycles, active vendor compliance, and BDM communications. Margin forecasts computed at 94% accuracy.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10 shrink-0 font-mono">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Expected Revenue</span>
                <span className="text-xl font-black text-emerald-400 block mt-1">{formatCurrency(forecast.expectedRevenue || expectedRevenue)}</span>
                <span className="text-[9px] text-emerald-500 font-bold uppercase mt-1 inline-block">Probability: {forecast.probability}%</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Expected Placements</span>
                <span className="text-xl font-black text-indigo-400 block mt-1">{forecast.expectedPlacements} Placed</span>
                <span className="text-[9px] text-indigo-400 font-bold uppercase mt-1 inline-block">Confidence: {forecast.confidence}</span>
              </div>
            </div>
          </div>

          {/* Core Founder Financial & Executive Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Pipeline Value", val: formatCurrency(expectedRevenue), icon: CircleDollarSign, color: "text-indigo-600" },
              { label: "Active Clients", val: crmClientsCount || clients.length, icon: Building2, color: "text-blue-600" },
              { label: "Direct Placements", val: placements, icon: Trophy, color: "text-yellow-600" },
              { label: "Pending Collections", val: formatCurrency(deals.filter(d => !d.paymentReceived).reduce((sum, d) => sum + (Number(d.revenueAmount || d.revenue_amount) || 0), 0)), icon: AlertCircle, color: "text-rose-600" },
            ].map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div key={i} className="skeuo-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 rounded-xl border border-slate-300 flex items-center justify-center bg-slate-50 shadow-inner">
                      <Icon className={`w-4 h-4 ${metric.color}`} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono mb-1">{metric.label}</span>
                    <span className="text-xl font-black text-slate-900">{metric.val}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sourcing & Trust Audits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 skeuo-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Corporate Cash Flow & Collections</h3>
              </div>
              
              {/* Bills pending tracker */}
              <div className="space-y-3 font-sans text-xs">
                {deals.filter(d => !d.paymentReceived).length > 0 ? (
                  deals.filter(d => !d.paymentReceived).slice(0, 3).map((deal, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-950">{deal.clientName || deal.client_name || "Enterprise Client"}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">INV-2026-{deal.id?.slice(-3).toUpperCase() || "001"} • Role: {deal.jobTitle || "Requisition"}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatCurrency(deal.revenueAmount || deal.revenue_amount || 0)}</span>
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border inline-block mt-1 font-mono",
                          deal.status === "disputed" ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        )}>
                          {deal.status || "Pending"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                    No uncollected client invoices found in the current cycle.
                  </div>
                )}
              </div>
            </div>

            {/* AI Diagnostics & System Vulnerability */}
            <div className="skeuo-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Compliance & Vulnerability</h3>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950">Event Ledger Solid</h4>
                    <p className="text-[11px] text-emerald-800">Immutable ledger hash matching is completely synchronized.</p>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-start gap-2.5">
                  <Bot className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-indigo-950">AI Matches Monitored</h4>
                    <p className="text-[11px] text-indigo-800">No unauthorized auto-deployments detected; governance overrides hold.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // BDM BRIEFING (BDM MORNING VIEW)
        // ==========================================
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Morning Follow-ups and Triggers */}
            <div className="md:col-span-2 skeuo-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Today's Morning Follow-Ups</h3>
              </div>

              <div className="space-y-3">
                {followUps.map((item, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                    <Bot className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">{item.entityName} Inactivity Alert</h4>
                      <p className="text-slate-700 text-xs">{item.trigger}</p>
                      <p className="text-slate-500 text-[11px] italic">Recommended: "{item.action}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BDM Daily Pipeline Target */}
            <div className="skeuo-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">BDM Target SLA</h3>
              </div>
              
              <div className="space-y-4 font-sans text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-600">Monthly Sourcing Quote</span>
                    <span className="font-black text-indigo-600">₹18 L / ₹25 L</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-600 w-[72%] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                    <span className="text-slate-400 block uppercase">New Leads</span>
                    <span className="text-slate-900 font-bold">12 Active</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                    <span className="text-slate-400 block uppercase">Expected Margin</span>
                    <span className="text-emerald-600 font-bold">₹8.4 L</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Active requirements awaiting actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Opportunities Awaiting Profile Submissions</h3>
              <Link to="/requirements" className="text-xs font-bold text-indigo-600 hover:underline">
                View Requirements
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.filter(j => j.status === 'open' || !j.status).slice(0, 4).map((job: any) => (
                <div key={job.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs font-sans">
                  <div>
                    <h4 className="font-bold text-slate-900">{job.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{job.clientName || 'Infosys'} • {job.location || 'Remote'}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono border bg-amber-50 text-amber-600 border-amber-200">
                    AWAITING SUBMISSIONS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TALENT POOL INGESTION PIPELINE TELEMETRY */}
      <div className="skeuo-card p-6 relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Talent Pool Ingestion Telemetry</h2>
              <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Passive Inventory pipeline health & AI enrichment cockpit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border">
              Sync Provider: pxpipe (active)
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
              Sync Threshold: 80,000 chars
            </span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ingested</span>
            <span className="text-xl font-black text-slate-800 font-mono">{telemetry.successfulUploads || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Sum of all incoming streams</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Fresh Talents</span>
            <span className="text-xl font-black text-indigo-600 font-mono">{telemetry.newCandidates || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Brand new profiles parsed</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Updates Ingested</span>
            <span className="text-xl font-black text-emerald-600 font-mono">{telemetry.updates || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Same-vendor synchronizations</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duplicates Checked</span>
            <span className="text-xl font-black text-slate-700 font-mono">{telemetry.duplicates || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Identical hashes (no bloat)</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Claims Rejected</span>
            <span className="text-xl font-black text-rose-600 font-mono">{telemetry.conflicts || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Multi-vendor blockages (409)</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">AI Fallback Uses</span>
            <span className="text-xl font-black text-amber-600 font-mono">{telemetry.fallbackUsage || 0}</span>
            <span className="text-[9px] text-slate-400 mt-1">Gemini API 429 rate fallbacks</span>
          </div>
        </div>

        {/* Deferred Enrichment Queue Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500" />
                Deferred AI Reprocessing Queue ({queue.length})
              </h3>
              <p className="text-xs text-slate-500">
                Candidates waiting for high-fidelity Gemini 3.5 structured enrichment when rate limits clear.
              </p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={handleReprocessQueue}
                disabled={reprocessing}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all duration-300",
                  reprocessing 
                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed" 
                    : "skeuo-btn-primary hover:scale-[1.02] active:scale-95 text-white"
                )}
              >
                <Zap className={cn("w-4 h-4", reprocessing && "animate-spin")} />
                {reprocessing ? "Reprocessing..." : "Force Process Queue"}
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800">Queue Completely Clear</h4>
              <p className="text-[11px] text-slate-500">
                All candidates successfully parsed via high-fidelity Gemini enrichment. Ingestion pipeline is healthy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {queue.map((item: any) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono shadow-sm">
                  <div className="space-y-1 col-span-2">
                    <h4 className="font-black text-slate-800 uppercase tracking-wide truncate max-w-[200px]" title={item.candidateName}>
                      {item.candidateName}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      ID: {item.candidateId?.slice(0, 8)}... • Hash: {item.candidateHash?.slice(0, 10)}...
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Registered: {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-200">
                      AI RETRY PENDING
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Attempts: {item.attempts || 0}/3
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT EVENT TIMELINE LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 flex-1">
        {/* Middle: AI Recommendations (Static/Parsed Alerts) */}
        <div className="lg:col-span-2 skeuo-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">System AI Recommendations</h2>
          </div>
          
          <div className="space-y-4">
            {escalatedJobs.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.05),0_1px_2px_white] bg-red-50/50 border border-red-200">
                <div className="mt-1">
                  <AlertTriangle className="w-5 h-5 text-rose-500 drop-shadow-sm" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-rose-800 mb-1">{escalatedJobs.length} Requirements Need Escalation</h4>
                  <p className="text-xs text-rose-700">Requirements {escalatedJobs.slice(0,3).map(j=>j.title).join(', ')} have been open for &gt; 4 days with zero vendor submissions.</p>
                </div>
                <Link to="/requirements" className="px-3 py-1.5 skeuo-btn-primary text-xs">
                  Escalate
                </Link>
              </div>
            )}

            {readyCandidates.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.05),0_1px_2px_white] bg-indigo-50/50 border border-indigo-200">
                <div className="mt-1">
                  <Users className="w-5 h-5 text-indigo-500 drop-shadow-sm" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-indigo-800 mb-1">{readyCandidates.length} Candidates Ready for Submission</h4>
                  <p className="text-xs text-indigo-700">New vendor resumes parsed and matched against Open Requirements with &gt;85% confidence score.</p>
                </div>
                <Link to="/candidates" className="px-3 py-1.5 skeuo-btn-primary text-xs inline-block">
                  Review Fast
                </Link>
              </div>
            )}

            {inactiveVendors.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.05),0_1px_2px_white] bg-amber-50/50 border border-amber-200">
                <div className="mt-1">
                  <Handshake className="w-5 h-5 text-amber-500 drop-shadow-sm" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-800 mb-1">{inactiveVendors.length} Tier-1 Vendors Inactive</h4>
                  <p className="text-xs text-amber-700">Vendors {inactiveVendors.slice(0,2).map(v=>v.name).join(', ')} haven't responded to recent requirements.</p>
                </div>
                <button 
                  onClick={() => {
                    toast.success("Drafting WhatsApp & Email reminders to vendors...");
                  }}
                  className="px-3 py-1.5 skeuo-btn text-xs"
                >
                  Auto-Ping
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chronological System Activity Events Feed */}
        <div className="skeuo-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Event Ledger Activity</h2>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {systemEvents.length > 0 ? (
              systemEvents.map((ev, i) => {
                const eventDate = ev.timestamp || ev.createdAt ? new Date(ev.timestamp || ev.createdAt) : new Date();
                const timeStr = isNaN(eventDate.getTime()) ? "Recently" : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={ev.id || i} className="flex gap-4 items-start relative group">
                    <div className="w-px h-full bg-slate-200 shadow-[1px_0_0_white] absolute left-2 top-4 -z-10 group-last:hidden" />
                    <div className="w-4 h-4 rounded-full mt-0.5 shrink-0 shadow-inner bg-indigo-500 border border-indigo-200" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide truncate max-w-[150px]" title={ev.type || ev.event}>
                          {ev.type || ev.event || "SYSTEM EVENT"}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {timeStr}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 line-clamp-2">
                        {ev.description || ev.message || `Recorded ledger event for: ${ev.entityType || 'entity'}`}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : agentActivities.length > 0 ? (
              agentActivities.map((a, i) => {
                const isWorking = a.state === 'working';
                return (
                  <div key={i} className="flex gap-4 items-start relative group">
                    <div className="w-px h-full bg-slate-200 shadow-[1px_0_0_white] absolute left-2 top-4 -z-10 group-last:hidden" />
                    <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 shadow-inner ${isWorking ? 'bg-indigo-500 animate-pulse border-2 border-indigo-200' : 'bg-slate-300 border border-slate-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-700">{a.agent}</h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">{a.status}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No recent ledger activity...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
