import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BrainCircuit, Database, FileText, LayoutDashboard, Settings, Bot, Search, ArrowRight, Zap, Target } from "lucide-react";

const mockAgents = [
  { id: 1, name: "AI Founder Agent", role: "Orchestrator", status: "Active", primaryTask: "Review all requirements & revenue", icon: LayoutDashboard },
  { id: 2, name: "Requirement Intelligence", role: "Parser", status: "Active", primaryTask: "Extract skills, calculate market difficulty", icon: FileText },
  { id: 3, name: "Vendor Success Agent", role: "Engagement", status: "Active", primaryTask: "Float requirements, track responses", icon: Target },
  { id: 4, name: "Recruiter Copilot", role: "Sourcing", status: "Active", primaryTask: "Resume screening, candidate ranking", icon: BrainCircuit },
  { id: 5, name: "Revenue Intelligence", role: "Forecasting", status: "Waiting", primaryTask: "Predict monthly revenue, risk analysis", icon: Zap },
  { id: 6, name: "Knowledge Vault Agent", role: "Storage", status: "Active", primaryTask: "RAG index for requirements and resumes", icon: Database },
];

export default function Agents() {
  const { user } = useAuth();
  
  return (
    <div className="bg-slate-900 min-h-full rounded-3xl p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      
      <div className="flex justify-between items-end mb-10 relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            Agent Console
          </h1>
          <p className="text-slate-400 font-medium mt-2 max-w-xl">
            Multi-Agent Orchestration layer. Monitor and interact with specialized AI models driving the HireNest Core.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {mockAgents.map((agent) => (
          <div key={agent.id} className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 group-hover:bg-indigo-500/20 transition-colors">
                <agent.icon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agent.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {agent.status}
                </span>
              </div>
            </div>
            
            <h3 className="font-bold text-lg text-white mb-1">{agent.name}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">{agent.role}</p>
            
            <div className="text-sm text-slate-400 mb-6">
              {agent.primaryTask}
            </div>
            
            <button className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors">
              Configure Agent <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
