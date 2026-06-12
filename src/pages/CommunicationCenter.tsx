import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  PhoneCall, 
  Video, 
  Search, 
  Filter, 
  Clock, 
  Bot,
  Zap,
  CheckCircle2,
  Send,
  Building2,
  Users,
  Handshake,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processInteraction, BrainInsight } from '@/services/brainService';

type EntityType = 'client' | 'vendor' | 'candidate';

const mockCommunications = [
  {
    id: 1,
    type: 'whatsapp',
    entityType: 'vendor',
    entityName: 'Cloud Assure',
    sender: 'Vikram (Partner)',
    content: 'We have 3 solid Azure developers ready for the new opening. Should I send profiles?',
    timestamp: '10 mins ago',
    status: 'unreplied',
    isAiAnalyzed: true
  },
  {
    id: 2,
    type: 'email',
    entityType: 'client',
    entityName: 'Scope Softtech',
    sender: 'VP Engineering',
    content: 'Looking to hire a Senior AI Engineer urgently. Budget is flexible for the right candidate. Priority is Node.js and LLM integrations.',
    timestamp: '1 hour ago',
    status: 'unreplied',
    isAiAnalyzed: true
  },
  {
    id: 3,
    type: 'email',
    entityType: 'candidate',
    entityName: 'Alex Rodriguez',
    sender: 'Alex',
    content: 'Thanks for the interview today. I wanted to follow up on next steps.',
    timestamp: '2 hours ago',
    status: 'replied',
    isAiAnalyzed: false
  }
];

export default function CommunicationCenter() {
  const [activeTab, setActiveTab] = useState<EntityType | 'all'>('all');
  const [selectedComm, setSelectedComm] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<BrainInsight | null>(null);

  const runIntelligence = async (comm: any) => {
    setIsAnalyzing(true);
    setInsight(null);
    try {
      const source = comm.type === 'whatsapp' ? 'whatsapp' : 'email';
      const res = await processInteraction(comm.content, { source, from: comm.sender, entityType: comm.entityType });
      setInsight(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedComm) {
      runIntelligence(selectedComm);
    }
  }, [selectedComm]);

  const filteredComms = mockCommunications.filter(c => activeTab === 'all' || c.entityType === activeTab);

  return (
    <div className="h-[calc(100vh-4rem)] bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Communication Center</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Unified Relationship Layer (Email, WhatsApp, Calls)</p>
        </div>
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'client', label: 'Clients', icon: Building2 },
            { id: 'vendor', label: 'Vendors', icon: Handshake },
            { id: 'candidate', label: 'Candidates', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className="w-96 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredComms.map(comm => (
              <button
                key={comm.id}
                onClick={() => setSelectedComm(comm)}
                className={cn(
                  "w-full p-5 text-left border-b border-slate-100 transition-all hover:bg-slate-50 group",
                  selectedComm?.id === comm.id ? "bg-white shadow-sm ring-1 ring-slate-200" : ""
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {comm.type === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Mail className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{comm.entityName}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{comm.timestamp}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1 leading-tight">{comm.sender}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{comm.content}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation View */}
        {selectedComm ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col bg-white">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                     {selectedComm.sender[0]}
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-slate-900">{selectedComm.sender}</h2>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedComm.entityName} • {selectedComm.type}</p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                     Log Meeting
                   </button>
                   <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                     Reply
                   </button>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* The inbound message */}
                    <div className="bg-white p-6 rounded-3xl rounded-tl-sm border border-slate-200 shadow-sm">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedComm.content}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{selectedComm.timestamp} via {selectedComm.type}</span>
                      </div>
                    </div>

                    {/* AI Draft Response Placeholder */}
                    <div className="bg-white p-6 rounded-3xl rounded-tr-sm border border-indigo-100 shadow-sm ml-12 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Bot className="w-16 h-16 text-indigo-600" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Suggested Draft</span>
                      </div>
                      <textarea 
                        className="w-full min-h-[100px] p-4 bg-indigo-50/50 border-none rounded-2xl text-sm font-medium focus:ring-0 resize-none mb-4 text-slate-700"
                        readOnly={isAnalyzing}
                        value={insight?.pitch || 'Neural engine drafting response...'}
                      />
                      <div className="flex justify-between items-center relative z-10">
                        <button className="text-[10px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">
                          Refine Pitch
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                          <Send className="w-4 h-4" />
                          Send Draft
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Context & Neural Insights Sidebar */}
            <div className="w-80 border-l border-slate-100 bg-white p-6 overflow-y-auto shrink-0 flex flex-col space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Neural Insights</h3>
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                    <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                  </div>
                ) : insight ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between mb-3 text-[10px] font-black uppercase">
                         <span className="text-slate-400">Detected Intent</span>
                         <span className="text-indigo-600">{insight.profile.intent}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase">
                         <span className="text-slate-400">Urgency</span>
                         <span className={insight.profile.urgency === 'high' ? 'text-red-500' : 'text-emerald-500'}>{insight.profile.urgency}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
                      <div className="flex items-center gap-2 mb-3">
                         <Clock className="w-4 h-4 text-emerald-400" />
                         <span className="text-[10px] font-black uppercase text-slate-300">Follow-up Strategy</span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        {insight.followUp.reason}
                      </p>
                      <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Schedule in {insight.followUp.timeline}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs text-center py-8">Select a message for AI insights.</div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                  CRM Context
                  <ArrowRight className="w-4 h-4" />
                </h3>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                   <p className="text-xs font-bold text-slate-900 mb-1">{selectedComm.entityName}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-4">{selectedComm.entityType} Profile</p>
                   {selectedComm.entityType === 'vendor' && (
                     <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Active Candidates</span>
                          <span className="font-bold text-slate-900">12</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Placement Rate</span>
                          <span className="font-bold text-emerald-600">45%</span>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-slate-100 mb-6">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Communication Center</h3>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs text-center">
              Select a conversation to view context and generate AI responses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
