import React from "react";
import { Database, Search, FileText, DatabaseZap, Clock } from "lucide-react";

export default function KnowledgeVault() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            Knowledge Vault
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Central Retrieval-Augmented Generation (RAG) index.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="Search concepts, extracted skills, requirements, or semantic candidate matches..."
            />
          </div>
          
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-400 font-medium text-sm">
              <Clock className="w-4 h-4" /> Recent RAG Index Jobs
            </div>
            
            <div className="space-y-3">
              {[
                "Parsed 14 vendor attachment resumes",
                "Indexed Requirement REQ-2026-101",
                "Processed email thread mapping for Witty Brains",
              ].map((job, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <DatabaseZap className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700">{job}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {i === 0 ? 'JUST NOW' : i * 15 + ' MINS AGO'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-indigo-900 p-6 rounded-3xl border border-indigo-800 shadow-sm flex flex-col gap-6 text-white text-center justify-center items-center">
          <Database className="w-16 h-16 text-indigo-400 opacity-50 mb-2" />
          <h3 className="text-5xl font-black">24.8k</h3>
          <p className="text-indigo-200 font-medium text-sm">Indexed Vectors</p>
          <div className="w-full h-px bg-indigo-800/50 my-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Storage Engine Online
          </p>
        </div>
      </div>
    </div>
  );
}
