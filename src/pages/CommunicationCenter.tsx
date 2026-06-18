import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Search, 
  Clock, 
  Bot,
  Zap,
  Send,
  Building2,
  Users,
  Handshake,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processInteraction, BrainInsight } from '@/services/brainService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type EntityType = 'client' | 'vendor' | 'candidate';

export default function CommunicationCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<EntityType | 'all'>('all');
  const [selectedComm, setSelectedComm] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<BrainInsight | null>(null);
  
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const emailQuery = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const response = await fetch(`/api/gmail/list${emailQuery}`);
      if (!response.ok) throw new Error('Failed to fetch emails');
      const data = await response.json();
      
      const formattedMails = (data.emails || []).map((e: any) => ({
        id: e.id,
        type: 'email',
        // Attempt to extract sender name from "Name <email@domain>" format
        sender: e.from?.replace(/<.*>/, '').trim() || e.from,
        content: e.snippet || '',
        fullBody: e.body || '',
        subject: e.subject || 'No Subject',
        timestamp: new Date(e.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        entityType: 'vendor', // Mock entity type for now until AI extracts it
        entityName: 'Vendor',
        isAiAnalyzed: false
      }));

      setEmails(formattedMails);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/gmail/sync?email=${encodeURIComponent(user.email)}`, {
        method: 'POST' // POST since sync modifies state
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }
      
      toast.success(data.message || 'Inbox synced successfully');
      await fetchEmails();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error syncing inbox');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [user]);

  const runIntelligence = async (comm: any) => {
    setIsAnalyzing(true);
    setInsight(null);
    try {
      const source = comm.type === 'whatsapp' ? 'whatsapp' : 'email';
      const res = await processInteraction(comm.fullBody || comm.content, { source, from: comm.sender, entityType: comm.entityType }, comm.id);
      
      // Update local state if the API marked it as analyzed
      if (comm.id) {
         setEmails(prev => prev.map(c => c.id === comm.id ? {...c, isAiAnalyzed: true, entityType: res.profile?.intent } : c));
      }
      
      setInsight(res);
      toast.success(`AI Classified as: ${res.profile?.intent}`, { style: { background: '#10b981', color: 'white' }});
    } catch (err) {
      console.error(err);
      toast.error('AI Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedComm) {
      runIntelligence(selectedComm);
    }
  }, [selectedComm]);

  const filteredComms = emails.filter(c => activeTab === 'all' || c.entityType === activeTab);

  return (
    <div className="h-[calc(100vh-4rem)] bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mail Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Unified Relationship Layer (Email & Intelligence)</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Inbox"}
          </button>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {[
              { id: 'all', label: 'All Mail' },
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
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className="w-[450px] border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search emails..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center text-slate-400 text-sm font-medium">
                Loading emails...
              </div>
            ) : filteredComms.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Mail className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">No emails found</p>
                <p className="text-xs text-slate-400 mt-1">Click "Sync Inbox" to fetch new emails from Gmail.</p>
              </div>
            ) : (
              filteredComms.map(comm => (
                <button
                  key={comm.id}
                  onClick={() => setSelectedComm(comm)}
                  className={cn(
                    "w-full p-5 text-left border-b border-slate-100 transition-all hover:bg-slate-50 group",
                    selectedComm?.id === comm.id ? "bg-white shadow-sm ring-1 ring-slate-200" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 max-w-[250px]">
                      <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400 truncate" title={comm.sender}>
                        {comm.sender}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">{comm.timestamp}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1 leading-tight line-clamp-1">{comm.subject}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{comm.content}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation View */}
        {selectedComm ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col bg-white">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                     {selectedComm.sender[0]?.toUpperCase()}
                   </div>
                   <div className="min-w-0">
                     <h2 className="text-lg font-black text-slate-900 truncate">{selectedComm.subject}</h2>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate">{selectedComm.sender}</p>
                   </div>
                 </div>
                 <div className="flex gap-2 shrink-0">
                   <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                     Log Meeting
                   </button>
                   <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                     Reply
                   </button>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* The inbound message */}
                    <div className="bg-white p-6 rounded-3xl rounded-tl-sm border border-slate-200 shadow-sm">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedComm.fullBody || selectedComm.content}
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
                          Refine Draft
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
                         <span className="text-[10px] font-black uppercase text-slate-300">Strategy</span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        {insight.followUp.reason}
                      </p>
                      <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Schedule in {insight.followUp.timeline}
                      </button>
                    </div>

                    {insight.extractedRequirement && (
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mt-4">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1">
                             <Zap className="w-3 h-3" /> Extracted Requirement
                           </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-indigo-100 pb-1">
                            <span className="text-indigo-400 font-bold uppercase text-[9px]">Title</span>
                            <span className="font-black text-indigo-900 truncate pl-2">{insight.extractedRequirement.title}</span>
                          </div>
                          <div className="flex justify-between border-b border-indigo-100 pb-1">
                            <span className="text-indigo-400 font-bold uppercase text-[9px]">Location</span>
                            <span className="font-bold text-indigo-900 truncate pl-2">{insight.extractedRequirement.location}</span>
                          </div>
                          <div className="flex justify-between border-b border-indigo-100 pb-1">
                            <span className="text-indigo-400 font-bold uppercase text-[9px]">Experience</span>
                            <span className="font-bold text-indigo-900 truncate pl-2">{insight.extractedRequirement.experience}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-indigo-400 font-bold uppercase text-[9px]">Emp Type</span>
                            <span className="font-bold text-indigo-900 truncate pl-2">{insight.extractedRequirement.employmentType}</span>
                          </div>
                        </div>
                        <button className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                          Create CRM Requirement
                        </button>
                      </div>
                    )}
                    
                    {insight.extractedSubmission && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mt-4">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                             <Users className="w-3 h-3" /> Extracted Submission
                           </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-emerald-100 pb-1">
                            <span className="text-emerald-500 font-bold uppercase text-[9px]">Name</span>
                            <span className="font-black text-emerald-900 truncate pl-2">{insight.extractedSubmission.candidateName}</span>
                          </div>
                          <div className="flex justify-between border-b border-emerald-100 pb-1">
                            <span className="text-emerald-500 font-bold uppercase text-[9px]">Experience</span>
                            <span className="font-bold text-emerald-900 truncate pl-2">{insight.extractedSubmission.experience}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {insight.extractedSubmission.skills?.map((s: string, i: number) => (
                             <span key={i} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-bold">{s}</span>
                          ))}
                        </div>
                        <button className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                          Save Submission
                        </button>
                      </div>
                    )}
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
                   <p className="text-xs font-bold text-slate-900 mb-1">{selectedComm.sender}</p>
                   {selectedComm.entityType === 'vendor' && (
                     <div className="space-y-2 text-xs mt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Active Candidates</span>
                          <span className="font-bold text-slate-900">0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Placement Rate</span>
                          <span className="font-bold text-emerald-600">Pending</span>
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
            <h3 className="text-xl font-black text-slate-900">Mail Dashboard</h3>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs text-center">
              Select an email thread to view context and generate AI responses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
