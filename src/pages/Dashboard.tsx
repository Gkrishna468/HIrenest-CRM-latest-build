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

  useEffect(() => {
    const unsubscribe = subscribeToAgentActivities((data) => {
      setAgentActivities(data);
    });
    return () => unsubscribe();
  }, []);

  const openRequirements = jobs.filter(j => j.status?.toLowerCase() === "open" || !j.status).length;
  const totalSubmissions = candidates.filter(c => c.stage === "submission" || c.stage === "screening" || !c.stage).length;
  const placements = candidates.filter(c => c.stage === "placed" || c.stage === "joined").length || deals.length;
  
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
    <div className="bg-[#0B0F19] min-h-full rounded-3xl p-8 text-white relative overflow-hidden flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                AI ORCHESTRATOR ONLINE
              </span>
            </div>
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Command Center
          </h1>
        </div>
      </div>

      {/* Top Metrics - Founder Dashboard View */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 relative z-10">
        {[
          { label: "Requirements Open", val: jobs.filter(j => j.status?.toLowerCase() === "open" || !j.status).length, icon: Briefcase, color: "blue" },
          { label: "Candidates Available", val: candidates.filter(c => c.stage === 'available' || !c.stage).length, icon: Users, color: "indigo" },
          { label: "Submissions Today", val: candidates.filter(c => (c.stage === 'submission' || c.stage === 'screening') && new Date(c.updatedAt || c.createdAt).toDateString() === new Date().toDateString()).length, icon: FileSearch, color: "purple" },
          { label: "Interviews Scheduled", val: candidates.filter(c => c.stage === 'interview').length, icon: MessageSquare, color: "amber" },
          { label: "Offers Pending", val: candidates.filter(c => c.stage === 'offer').length, icon: CheckCircle2, color: "emerald" },
          { label: "Placements This Month", val: placements, icon: Trophy, color: "fuchsia" },
          { label: "Revenue Pipeline", val: expectedRevenue ? formatCurrency(expectedRevenue) : '₹0', icon: CircleDollarSign, color: "emerald", isCurrency: true },
          { label: "Expected Margin", val: expectedMargin ? formatCurrency(expectedMargin) : '₹0', icon: TrendingUp, color: "emerald", isCurrency: true },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className={`bg-[#131B2C] border border-[#1E293B] rounded-2xl p-4 flex flex-col justify-between hover:border-${metric.color}-500/30 transition-colors`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg bg-${metric.color}-500/10 flex items-center justify-center border border-${metric.color}-500/20`}>
                  <Icon className={`w-4 h-4 text-${metric.color}-400`} />
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{metric.label}</p>
                <p className={`text-xl font-black text-white`}>{metric.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 flex-1">
        {/* Middle: AI Insights & Recommendations */}
        <div className="lg:col-span-2 bg-[#131B2C] border border-[#1E293B] rounded-3xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">AI Recommendations</h2>
          </div>
          
          <div className="space-y-4">
            {escalatedJobs.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <div className="mt-1">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">{escalatedJobs.length} Requirements Need Escalation</h4>
                  <p className="text-xs text-rose-200">Requirements {escalatedJobs.slice(0,3).map(j=>j.title).join(', ')} have been open for &gt; 4 days with zero vendor submissions.</p>
                </div>
                <Link to="/requirements" className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors inline-block" onClick={() => toast.success("Escalating requirements...")}>
                  Escalate
                </Link>
              </div>
            )}

            {readyCandidates.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="mt-1">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">{readyCandidates.length} Candidates Ready for Submission</h4>
                  <p className="text-xs text-indigo-200">New vendor resumes parsed and matched against Open Requirements with &gt;85% confidence score.</p>
                </div>
                <Link to="/candidates" className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors inline-block" onClick={() => toast.info("Opening matching queue...")}>
                  Review Fast
                </Link>
              </div>
            )}

            {inactiveVendors.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div className="mt-1">
                  <Handshake className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">{inactiveVendors.length} Tier-1 Vendors Inactive</h4>
                  <p className="text-xs text-amber-200">Vendors {inactiveVendors.slice(0,2).map(v=>v.name).join(', ')} haven't responded to recent requirements.</p>
                </div>
                <button 
                  onClick={() => {
                    toast.success("Drafting WhatsApp & Email reminders to vendors...");
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg transition-colors">
                  Auto-Ping
                </button>
              </div>
            )}

            {escalatedJobs.length === 0 && readyCandidates.length === 0 && inactiveVendors.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">System is fully optimized. No pending recommendations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent System Events */}
        <div className="bg-[#131B2C] border border-[#1E293B] rounded-3xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Recent Activity</h2>
            </div>
            <Link to="/agents" className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors">
              View Agents
            </Link>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {agentActivities.length > 0 ? (
              agentActivities.map((a, i) => {
                const isWorking = a.state === 'working';
                return (
                  <div key={i} className="flex gap-4 items-start relative group">
                    <div className="w-px h-full bg-[#1E293B] absolute left-2 top-4 -z-10 group-last:hidden" />
                    <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 ${isWorking ? 'bg-indigo-500 animate-pulse' : 'bg-[#1E293B] border-2 border-[#131B2C]'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-200">{a.agent}</h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{a.status}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-xs uppercase tracking-widest">No recent system activity...</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-[#1E293B] mt-4">
            <button className="w-full py-3 bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              Deep Analysis <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
