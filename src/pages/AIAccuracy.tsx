import React, { useEffect, useState } from 'react';
import { ShieldCheck, BrainCircuit, Activity, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';

export default function AIAccuracy() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await fetch('/api/ai/audit');
        if (response.ok) {
           const data = await response.json();
           setAudits(data);
        }
      } catch (err) {
        console.error("Error fetching audits", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const getAccuracy = (intent: string) => {
    const filtered = audits.filter(a => a.classification === intent);
    if (!filtered.length) return "N/A";
    const sum = filtered.reduce((acc, curr) => acc + (curr.confidence || 0), 0);
    return Math.round((sum / filtered.length) * 100) + '%';
  };

  const getCount = (intent: string) => audits.filter(a => a.classification === intent).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Accuracy & Governance</h1>
          <p className="text-slate-500 mt-1">Measure the performance and confidence of the Unified Intelligence Brain.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Requirements', intent: 'Requirement', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Submissions', intent: 'Vendor Submission', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Interviews', intent: 'Interview', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Offers', intent: 'Offer', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
               <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", stat.bg, stat.color)}>
                 <BrainCircuit className="w-4 h-4" />
               </div>
            </div>
            <div className="flex items-baseline gap-2">
               <p className={cn("text-4xl font-black", stat.color)}>{getAccuracy(stat.intent)}</p>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-2">{getCount(stat.intent)} actions processed</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
             <Activity className="w-4 h-4 text-slate-400" /> Recent Classifications
           </h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {loading ? (
             <div className="p-8 text-center text-slate-400 font-medium">Loading audit logs...</div>
          ) : audits.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-medium">No classifications processed yet.</div>
          ) : (
            audits.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-900">{item.classification}</span>
                  <span className="text-xs text-slate-500 font-mono">{item.emailId}</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex flex-col items-end">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                     <span className={cn(
                       "text-sm font-black",
                       item.confidence > 0.85 ? "text-emerald-500" : item.confidence > 0.6 ? "text-yellow-500" : "text-rose-500"
                     )}>
                       {Math.round((item.confidence || 0) * 100)}%
                     </span>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                     {item.validated ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
