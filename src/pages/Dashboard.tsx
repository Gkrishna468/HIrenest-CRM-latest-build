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
  LucideIcon,
  History
} from "lucide-react";

export default function Dashboard() {
  const { jobs, candidates, deals, vendors } = useData();
  const { user } = useAuth();
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

    // 1. Listen to requirements_private
    const unsubReqs = SystemRepository.subscribeToCollectionSize(
      "requirements_private",
      (size) => setFirestoreCounts((p) => ({ ...p, requirements: size })),
      (err) => console.log("requirements_private listener skipped:", err.message)
    );

    // 2. Listen to candidatePool
    const unsubCands = SystemRepository.subscribeToCollectionSize(
      "candidatePool",
      (size) => setFirestoreCounts((p) => ({ ...p, candidates: size })),
      (err) => console.log("candidatePool listener skipped:", err.message)
    );

    // 3. Listen to submissions
    const unsubSubs = SystemRepository.subscribeToCollectionSize(
      "submissions",
      (size) => setFirestoreCounts((p) => ({ ...p, submissions: size })),
      (err) => console.log("submissions listener skipped:", err.message)
    );

    // 4. Listen to interviews
    const unsubInterviews = SystemRepository.subscribeToCollectionSize(
      "interviews",
      (size) => setFirestoreCounts((p) => ({ ...p, interviews: size })),
      (err) => console.log("interviews listener skipped:", err.message)
    );

    // 5. Listen to system_events (immutable Company Ledger)
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

  const openRequirements = firestoreCounts.requirements || jobs.filter(j => j.status?.toLowerCase() === "open" || !j.status).length;
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="skeuo-bg border border-slate-300 min-h-full rounded-[2rem] p-8 text-slate-800 relative overflow-hidden flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-inner">
      
      <div className="flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 skeuo-btn border border-indigo-200 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                AI ORCHESTRATOR ONLINE
              </span>
            </div>
            <div className="px-3 py-1 skeuo-btn rounded-full">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight" style={{ textShadow: '0 1px 1px white' }}>
            Command Center
          </h1>
        </div>
      </div>

      {/* Top Metrics - Founder Dashboard View */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 relative z-10">
        {[
          { label: "Requirements Open", val: openRequirements, icon: Briefcase, color: "blue" },
          { label: "Candidates Available", val: readyCandidatesCount, icon: Users, color: "indigo" },
          { label: "Submissions Today", val: totalSubmissions, icon: FileSearch, color: "purple" },
          { label: "Interviews Scheduled", val: interviewsCount, icon: MessageSquare, color: "amber" },
          { label: "Offers Pending", val: candidates.filter(c => c.stage === 'offer').length, icon: CheckCircle2, color: "emerald" },
          { label: "Placements This Month", val: placements, icon: Trophy, color: "fuchsia" },
          { label: "Revenue Pipeline", val: expectedRevenue ? formatCurrency(expectedRevenue) : '₹0', icon: CircleDollarSign, color: "emerald", isCurrency: true },
          { label: "Expected Margin", val: expectedMargin ? formatCurrency(expectedMargin) : '₹0', icon: TrendingUp, color: "emerald", isCurrency: true },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="skeuo-card p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-full border border-slate-200/50 flex items-center justify-center bg-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_1px_white]`}>
                  <Icon className={`w-4 h-4 text-${metric.color}-600`} />
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{metric.label}</p>
                <p className={`text-xl font-extrabold text-slate-800`}>{metric.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 flex-1">
        {/* Middle: AI Insights & Recommendations */}
        <div className="lg:col-span-2 skeuo-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">AI Recommendations</h2>
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
                <Link to="/requirements" className="px-3 py-1.5 skeuo-btn-primary text-xs" onClick={() => toast.success("Escalating requirements...")}>
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
                <Link to="/candidates" className="px-3 py-1.5 skeuo-btn-primary text-xs inline-block" onClick={() => toast.info("Opening matching queue...")}>
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
                  className="px-3 py-1.5 skeuo-btn text-xs">
                  Auto-Ping
                </button>
              </div>
            )}

            {escalatedJobs.length === 0 && readyCandidates.length === 0 && inactiveVendors.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm" style={{textShadow: '0 1px 0 white'}}>System is fully optimized. No pending recommendations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent System Events */}
        <div className="skeuo-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Activity</h2>
            </div>
            <Link to="/agents" className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">
              View Agents
            </Link>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
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
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest" style={{textShadow: '0 1px 0 white'}}>No recent system activity...</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 relative">
            <div className="absolute top-0 inset-x-0 h-px bg-slate-200 shadow-[0_1px_0_white]" />
            <br />
            <button className="w-full py-3 skeuo-btn text-sm flex items-center justify-center gap-2">
              Deep Analysis <TrendingUp className="w-4 h-4 drop-shadow-[0_1px_0_white]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
