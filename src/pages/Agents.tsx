import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BrainCircuit, Database, FileText, Target, Activity, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";
import { AgentRepository } from "@/repositories/AgentRepository";

export default function Agents() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  useEffect(() => {
    const unsubTasks = AgentRepository.subscribeToTasks(
      (t) => setTasks(t),
      (err) => console.log("Tasks listener error:", err)
    );

    const unsubExecs = AgentRepository.subscribeToExecutions(
      (e) => setExecutions(e.slice(0, 50)),
      (err) => console.log("Executions listener error:", err)
    );

    return () => {
      unsubTasks();
      unsubExecs();
    };
  }, []);

  const viewExecutionLogs = async (execution: any) => {
    setSelectedExecution(execution);
    setLoadingLogs(true);
    setSelectedLogs([]);
    try {
      const logs = await AgentRepository.getExecutionLogs(execution.taskId);
      setSelectedLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const agents = [
    { 
      id: "req_agent", 
      name: "Requirement Extraction Agent", 
      role: "Extraction", 
      icon: FileText,
      logs: executions.filter(a => a.agentId === "requirement_agent")
    },
    { 
      id: "vendor_agent", 
      name: "Vendor Broadcast Agent", 
      role: "Distribution", 
      icon: Target,
      logs: executions.filter(a => a.agentId === "vendor_broadcast_agent")
    },
    { 
      id: "matching_agent", 
      name: "Matching Agent", 
      role: "Processing", 
      icon: Database,
      logs: executions.filter(a => a.agentId === "matching_agent")
    },
    { 
      id: "interview_agent", 
      name: "Interview Agent", 
      role: "Scheduling", 
      icon: BrainCircuit,
      logs: executions.filter(a => a.agentId === "interview_agent")
    }
  ];

  return (
    <div className="skeuo-bg border border-slate-300 min-h-full rounded-[2rem] p-8 text-slate-800 relative overflow-hidden flex flex-col h-[calc(100vh-4rem)] shadow-inner">
      <div className="flex justify-between items-end mb-8 relative z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3" style={{textShadow: '0 1px 1px white'}}>
            <Activity className="w-8 h-8 text-indigo-600 drop-shadow-sm" />
            AI Operations Console
          </h1>
          <p className="text-slate-600 font-medium mt-2 max-w-xl">
            Live monitoring of HireNest multi-agent execution layer.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
          {agents.map((agent) => {
            const lastRun = agent.logs.length > 0 ? new Date(agent.logs[0].startedAt) : null;
            const recordsProcessed = agent.logs.length;
            const isRunning = agent.logs.some(l => l.status === "running");
            const successRate = recordsProcessed > 0 ? 
              Math.min(100, Math.round((agent.logs.filter(l => l.status === "completed").length / recordsProcessed) * 100)) : 100;
              
            return (
              <div key={agent.id} className="skeuo-card p-6 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_1px_white]">
                      <agent.icon className="w-6 h-6 text-indigo-600 drop-shadow-sm" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800" style={{textShadow: '0 1px 0 white'}}>{agent.name}</h3>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border shadow-inner flex items-center gap-2 ${isRunning ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' : 'bg-emerald-50/50 border-emerald-200 text-emerald-700'}`}>
                    <div className={`w-2 h-2 rounded-full shadow-sm border ${isRunning ? 'bg-indigo-500 border-indigo-600 animate-pulse' : 'bg-emerald-500 border-emerald-600'}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{isRunning ? 'Running' : 'Online'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-300 shadow-inner">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1" style={{textShadow: '0 1px 0 white'}}>Executions</p>
                    <p className="text-xl font-extrabold text-slate-800">{recordsProcessed}</p>
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-300 shadow-inner">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1" style={{textShadow: '0 1px 0 white'}}>Success</p>
                    <p className="text-xl font-extrabold text-slate-800 flex items-center gap-1">
                      {successRate}% <CheckCircle2 className="w-4 h-4 text-emerald-600 drop-shadow-sm" />
                    </p>
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-300 shadow-inner">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1" style={{textShadow: '0 1px 0 white'}}>Last Run</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {lastRun && !isNaN(lastRun.getTime()) ? lastRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Idle'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col min-h-0 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 shrink-0">Execution Log</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {agent.logs.length > 0 ? agent.logs.slice(0, 20).map((log, i) => {
                      const logTime = new Date(log.startedAt);
                      const timeStr = !isNaN(logTime.getTime()) ? logTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : "Recent";
                      return (
                      <div 
                        key={log.id || i} 
                        className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg p-2 -mx-2"
                        onClick={() => viewExecutionLogs(log)}
                      >
                        <div className="w-16 shrink-0 text-[10px] font-mono font-bold text-slate-400 pt-1">
                          {timeStr}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-700 font-bold break-words">{log.taskName || log.status}</p>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {log.status}
                            </span>
                          </div>
                          {(log.result || log.error) && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              {log.error ? log.error : (log.result?.message || JSON.stringify(log.result))}
                            </p>
                          )}
                        </div>
                      </div>
                    )}) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400 text-xs font-mono font-bold">No execution logs found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Execution Details: <span className="text-indigo-600">{selectedExecution.taskName}</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Task ID: {selectedExecution.taskId}</p>
              </div>
              <button 
                onClick={() => setSelectedExecution(null)}
                className="w-8 h-8 flex justify-center items-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div className="space-y-4">
                {loadingLogs ? (
                  <div className="flex justify-center p-8">
                    <Activity className="w-6 h-6 text-indigo-400 animate-spin" />
                  </div>
                ) : selectedLogs.length > 0 ? (
                  selectedLogs.map((log) => {
                    const time = new Date(log.timestamp);
                    const timeStr = !isNaN(time.getTime()) ? time.toLocaleTimeString() : 'Unknown';
                    const isError = log.level === 'error';
                    return (
                      <div key={log.id} className="flex gap-3">
                        <div className="w-px h-full bg-slate-200 absolute left-[21px] -z-10 mt-6 hidden sm:block" />
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isError ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-indigo-500'}`}>
                          {isError ? <AlertTriangle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        <div className={`flex-1 p-3 rounded-lg border shadow-sm ${isError ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{log.level}</span>
                            <span className="text-[10px] font-mono text-slate-500">{timeStr}</span>
                          </div>
                          <p className={`text-sm ${isError ? 'text-red-700 font-medium' : 'text-slate-600'}`}>{log.message}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 text-sm font-medium">No detailed logs found for this execution.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

