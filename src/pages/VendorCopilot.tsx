/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Send, Clock, Play, RotateCw, CheckCircle, ToggleLeft, ToggleRight, ShieldAlert, BadgeInfo } from 'lucide-react';
import { toast } from 'sonner';

interface VendorCopilotProps {
  selectedVendor: any;
  activeVendorCandidates: any[];
  openRequirementList: any[];
  onRotateCandidate: (candidate: any, targetJob: any, score: number) => Promise<void>;
}

export default function VendorCopilot({
  selectedVendor,
  activeVendorCandidates,
  openRequirementList,
  onRotateCandidate,
}: VendorCopilotProps) {
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotChat, setCopilotChat] = useState<Array<{ sender: 'user' | 'gemini'; text: string; timestamp: string }>>([
    {
      sender: 'gemini',
      text: `Hello! I am the **HireNest OS Unified Vendor Copilot**. I have full visibility into **${selectedVendor?.company}**'s candidate pool, SLA response logs, outstanding placements, and current requirements.\n\nYou can ask me complex queries or click any of the suggestions below to generate a report instantly!`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);
  const [isSchedulerActive, setIsSchedulerActive] = useState(true);

  // Suggestions list
  const suggestions = [
    { label: "Which Java candidates are idle?", query: "Find all idle Java candidates and analyze rotation eligibility." },
    { label: "Show duplicate risks", query: "Analyze the candidate pool for duplicate locks or compliance risks." },
    { label: "Fastest responding recruiters?", query: "Analyze team members and identify who responds fastest to client requirements." },
    { label: "Generate weekly report", query: "Generate a detailed weekly summary report of submissions, interview conversions, and SLA compliance." }
  ];

  // Continuous Candidate Rotation Calculation
  const getRotationDetails = (cand: any) => {
    // Determine skill overlap
    const skills = cand.skills || [];
    const isJava = skills.some((s: string) => s.toLowerCase().includes('java') || s.toLowerCase().includes('react'));
    const baseScore = isJava ? 85 : 72;
    
    // Add variations for realism
    const availabilityMultiplier = cand.noticePeriod?.toLowerCase().includes('immediate') ? 10 : 5;
    const rejectionsDeduction = cand.hasConflict ? -5 : 0;
    const finalScore = Math.min(100, Math.max(50, baseScore + availabilityMultiplier + rejectionsDeduction));
    
    return {
      score: finalScore,
      idleDays: Math.floor(4 + Math.random() * 8),
      skillsFreshness: "High",
      noticePeriod: cand.noticePeriod || "15 Days",
      alternativeJob: openRequirementList[Math.floor(Math.random() * openRequirementList.length)] || { title: "Senior Fullstack Engineer", client: "Accenture" }
    };
  };

  const handleCopilotSend = async (queryText: string) => {
    if (!queryText.trim()) return;
    
    const userMsg = { sender: 'user' as const, text: queryText, timestamp: new Date().toLocaleTimeString() };
    setCopilotChat(prev => [...prev, userMsg]);
    setCopilotQuery('');
    setIsCopilotTyping(true);

    setTimeout(() => {
      let responseText = "";
      const queryLower = queryText.toLowerCase();

      if (queryLower.includes('java')) {
        const javas = activeVendorCandidates.filter(c => 
          (c.skills && c.skills.some((s: string) => s.toLowerCase().includes('java'))) || 
          (c.currentTitle && c.currentTitle.toLowerCase().includes('java'))
        );
        if (javas.length > 0) {
          responseText = `### Idle Java Candidates Analysis
I scanned **${selectedVendor.company}**'s talent vault and found **${javas.length} Java candidates** currently eligible for rotation:

${javas.map((j, i) => {
  const rot = getRotationDetails(j);
  return `${i+1}. **${j.name}** (${j.currentTitle || 'Java Developer'})\n   - **Rotation Score**: \`${rot.score}%\` (Strongly Recommended)\n   - **Notice Period**: \`${rot.noticePeriod}\`\n   - **Alternative Target**: *${rot.alternativeJob.title}* at *${rot.alternativeJob.client}*\n   - **Idle Status**: Idle in screening for ${rot.idleDays} days with no active block.`;
}).join('\n\n')}

**Recommendation**: Submit these candidates to their respective target broadcasts instantly to optimize idle asset monetization.`;
        } else {
          responseText = `### Java Candidates Analysis
I scanned **${selectedVendor.company}**'s talent inventory and did not find any candidates matching "Java" in their active bench. Would you like me to draft a client C2C requirements broadcast to solicit Java profiles from our tier-1 staffing network?`;
        }
      } else if (queryLower.includes('duplicate') || queryLower.includes('risk')) {
        responseText = `### Enterprise Duplicate & Compliance Scan
Checking security hashes in **Candidate Identity Vault** for **${selectedVendor.company}**...

* **Optimistic Database Locking**: \`ACTIVE\`
* **Resume SHA256 Verification**: \`ACTIVE (100% Verified)\`
* **Network Claim Overlap Risk**: **0.8% (Extremely Low)**

#### Detected Conflicts:
No active poaching locks or dual-submissions found in this pool. One candidate (**Amit Kumar**) has an expired previous submission with Accenture, but the lock timer (15 days) has elapsed, making the candidate eligible for active redeployment.`;
      } else if (queryLower.includes('recruiter') || queryLower.includes('fast')) {
        responseText = `### SLA Delivery & Speed metrics
Here is the performance ledger for **${selectedVendor.company}**'s assigned recruiting officers:

1. **Priya Sharma (Delivery Lead)**:
   - Average response speed: \`1.8 Hours\` (SLA target is 24 Hours)
   - Profile submission rate: \`92%\`
   - Interview conversion ratio: \`48%\`
2. **Rahul Nair (Associate Recruiter)**:
   - Average response speed: \`4.5 Hours\`
   - Profile submission rate: \`85%\`
   - Interview conversion ratio: \`33%\`

**AI Scorecard Conclusion**: This vendor operates with exemplary response metrics. Average communication delay is **86% faster** than the general agency network bench.`;
      } else {
        responseText = `### Weekly Delivery & Operations Summary
**Partner Score**: \`880/1000\` (Tier 1 Preferred)
**Operational Ledger Summary for ${selectedVendor.company}**:

* **Total Profiles Uploaded**: \`${activeVendorCandidates.length} Active Records\`
* **Total Broadcast Responses**: \`14 Recieved / 12 Actioned\`
* **Active Status Funnel**:
  - Screening: \`${activeVendorCandidates.filter(c=>c.stage==='screening'||c.stage==='review').length}\`
  - Interviews: \`${activeVendorCandidates.filter(c=>c.stage==='interview').length}\`
  - Offers Release: \`${activeVendorCandidates.filter(c=>c.stage==='offer').length}\`
  - Active Placements: \`${activeVendorCandidates.filter(c=>c.stage==='placed'||c.stage==='joined').length}\`

**Automated Rotation Strategy**: Nightly scanner identified **2 candidates** idle for > 4 days with high alternative fitment scores. I suggest scheduling the automated daily pipeline rotation notification.`;
      }

      setCopilotChat(prev => [...prev, {
        sender: 'gemini',
        text: responseText,
        timestamp: new Date().toLocaleTimeString()
      }]);
      setIsCopilotTyping(false);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: ASK GEMINI COPILOT (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col h-[650px] bg-slate-950 text-white rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <div>
              <h4 className="text-sm font-black tracking-tight">AI Vendor Copilot (gemini-2.5-flash)</h4>
              <p className="text-[10px] text-slate-400 font-mono">Context-aware • Active on {selectedVendor?.company}</p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
            SECURE LEDGER VIEW
          </span>
        </div>

        {/* Chat window */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 font-sans text-xs custom-scrollbar">
          {copilotChat.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 space-y-2 whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}>
                {/* Simple rich formatting parser for simulation */}
                <div className="space-y-1">
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('### ')) {
                      return <h5 key={idx} className="text-white font-extrabold text-sm mt-2">{line.replace('### ', '')}</h5>;
                    }
                    if (line.startsWith('* ')) {
                      return <li key={idx} className="ml-2 list-disc">{line.replace('* ', '')}</li>;
                    }
                    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                      return <p key={idx} className="pl-2 font-medium">{line}</p>;
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
                <p className="text-[9px] text-right text-slate-500 font-mono mt-1">{msg.timestamp}</p>
              </div>
            </div>
          ))}

          {isCopilotTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl p-4 flex items-center gap-2 font-mono">
                <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Gemini is scanning talent metrics...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions Tray */}
        <div className="px-5 py-3 border-t border-slate-900 bg-slate-950 shrink-0 flex gap-2 overflow-x-auto custom-scrollbar">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleCopilotSend(s.query)}
              disabled={isCopilotTyping}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-indigo-300 hover:text-white shrink-0 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-2">
          <input
            type="text"
            value={copilotQuery}
            onChange={e => setCopilotQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCopilotSend(copilotQuery)}
            placeholder="Ask anything about this vendor's talent, duplicate risks, or compliance..."
            disabled={isCopilotTyping}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleCopilotSend(copilotQuery)}
            disabled={isCopilotTyping || !copilotQuery.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: CONTINUOUS ROTATION ENGINE & NIGHTLY SCHEDULER (5 COLS) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* WIDGET 1: AUTOMATED NIGHTLY SCHEDULER */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">AI Rotation Scheduler</h4>
            </div>
            <button 
              onClick={() => {
                setIsSchedulerActive(!isSchedulerActive);
                toast.success(`Nightly Agent Engine is now ${!isSchedulerActive ? 'ENABLED' : 'DISABLED'}`);
              }}
              className="focus:outline-none"
            >
              {isSchedulerActive ? (
                <ToggleRight className="w-10 h-10 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300" />
              )}
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] font-medium text-slate-600 space-y-2">
            <p className="flex justify-between">
              <span>Engine Status:</span>
              <span className={`font-bold ${isSchedulerActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isSchedulerActive ? '● ACTIVE & RUNNING' : '○ DEACTIVATED'}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Execution Frequency:</span>
              <span className="font-bold text-slate-800">Every night 11:45 PM</span>
            </p>
            <p className="flex justify-between">
              <span>Scope Constraints:</span>
              <span className="font-bold text-slate-800">Idle &gt; 4 Days + Overlap &gt; 85%</span>
            </p>
            <p className="flex justify-between">
              <span>Last Nightly Run:</span>
              <span className="font-mono text-slate-400 font-bold">Yesterday 11:45 PM (2 Relocated)</span>
            </p>
          </div>

          <div className="flex gap-2">
            <span className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0">
              <BadgeInfo className="w-4 h-4" />
            </span>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              When triggered, the background agent sweeps all inactive assets, matches them using Gemini evaluations against open requirements, alerts recruiters, and schedules ready-to-pitch outreach draft cards.
            </p>
          </div>
        </div>

        {/* WIDGET 2: CONTINUOUS CANDIDATE ROTATION LIST */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-[2rem] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-400 animate-bounce" />
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-300">Continuous Rotation Scorer</h4>
            </div>
            <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
              AUTO-MATCH
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            These candidates have been idle in screening for 4+ days. Our rotation engine has pre-scored alternative target positions across active broadcasts:
          </p>

          <div className="space-y-3">
            {activeVendorCandidates.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No candidates loaded in vendor inventory.</p>
            ) : activeVendorCandidates.slice(0, 3).map((cand, idx) => {
              const rot = getRotationDetails(cand);
              return (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/10 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-white text-xs">{cand.name}</h5>
                      <p className="text-[10px] text-slate-400">{cand.currentTitle || cand.current_title || 'Software Engineer'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-amber-400">{rot.score}%</span>
                      <p className="text-[8px] font-mono uppercase text-slate-400">Rotation score</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 text-[10px] text-slate-300 grid grid-cols-2 gap-y-1 gap-x-2 font-mono">
                    <p>Notice: <b className="text-white">{rot.noticePeriod}</b></p>
                    <p>Idle Days: <b className="text-white">{rot.idleDays} Days</b></p>
                    <p className="col-span-2 truncate">Target: <b className="text-indigo-300">{rot.alternativeJob.title} ({rot.alternativeJob.client})</b></p>
                  </div>

                  <button
                    onClick={async () => {
                      await onRotateCandidate(cand, rot.alternativeJob, rot.score);
                    }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 active:translate-y-0.5 text-white font-bold rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Approve Rotation & Submit
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
