import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAgentActivities, AgentActivity } from "@/lib/api/agentActivities";
import { BrainCircuit, Database, FileText, Target, Activity, CheckCircle2 } from "lucide-react";

export default function Agents() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<AgentActivity[]>([]);

  useEffect(() => {
    return subscribeToAgentActivities((data) => {
      setActivities(data);
    }, 100);
  }, []);

  const agents = [
    { 
      id: "req_agent", 
      name: "Requirement Extraction Agent", 
      role: "Extraction", 
      icon: FileText,
      logs: activities.filter(a => a.agent.includes("Requirement"))
    },
    { 
      id: "vendor_agent", 
      name: "Vendor Broadcast Agent", 
      role: "Distribution", 
      icon: Target,
      logs: activities.filter(a => a.agent.includes("Vendor"))
    },
    { 
      id: "submission_agent", 
      name: "Submission Agent", 
      role: "Processing", 
      icon: Database,
      logs: activities.filter(a => a.agent.includes("Submission"))
    },
    { 
      id: "interview_agent", 
      name: "Interview Agent", 
      role: "Scheduling", 
      icon: BrainCircuit,
      logs: activities.filter(a => a.agent.includes("Interview"))
    }
  ];

  return (
    <div className="bg-[#0B0F19] min-h-full rounded-3xl p-8 text-white relative overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="flex justify-between items-end mb-8 relative z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-400" />
            AI Operations Console
          </h1>
          <p className="text-slate-400 font-medium mt-2 max-w-xl">
            Live monitoring of HireNest multi-agent execution layer.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
          {agents.map((agent) => {
            const lastRun = agent.logs.length > 0 ? new Date(agent.logs[0].timestamp) : null;
            const recordsProcessed = agent.logs.length;
            const isRunning = agent.logs.some(l => l.state === "working");
            const successRate = recordsProcessed > 0 ? 
              Math.min(100, Math.round((agent.logs.filter(l => l.state === "completed").length / recordsProcessed) * 100)) : 100;
              
            return (
              <div key={agent.id} className="bg-[#131B2C] border border-[#1E293B] p-6 rounded-3xl flex flex-col h-[500px] hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#0B0F19] rounded-2xl flex items-center justify-center border border-[#1E293B]">
                      <agent.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-white">{agent.name}</h3>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${isRunning ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{isRunning ? 'Running' : 'Online'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
                  <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Records</p>
                    <p className="text-xl font-black text-slate-200">{recordsProcessed}</p>
                  </div>
                  <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Success</p>
                    <p className="text-xl font-black text-slate-200 flex items-center gap-1">
                      {successRate}% <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </p>
                  </div>
                  <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Last Run</p>
                    <p className="text-sm font-bold text-slate-300 mt-1">
                      {lastRun ? lastRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Idle'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-4 flex flex-col min-h-0">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 shrink-0">Execution Log</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {agent.logs.length > 0 ? agent.logs.slice(0, 20).map((log, i) => (
                      <div key={log.id || i} className="flex gap-3 text-sm border-b border-[#1E293B] pb-3 last:border-0 last:pb-0">
                        <div className="w-16 shrink-0 text-[10px] font-mono text-slate-500 pt-1">
                          {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-slate-300 font-medium break-words">{log.status}</p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <pre className="text-[10px] text-slate-500 font-mono bg-[#131B2C] p-2 rounded-lg border border-[#1E293B] overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-600 text-xs font-mono">No execution logs found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

