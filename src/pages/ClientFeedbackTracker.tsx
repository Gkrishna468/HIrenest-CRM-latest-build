import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Building2, Users, Send, RefreshCw, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Mock data representing the Vendor Intelligence view described in Phase 7 Vision
const clientTrackerData = [
  {
    id: 'c1',
    name: 'TCS',
    profilesShared: 120,
    shortlisted: 15,
    rejected: 40,
    pendingFeedback: 65,
    averageDelayDays: 8,
    status: 'critical'
  },
  {
    id: 'c2',
    name: 'Infosys',
    profilesShared: 85,
    shortlisted: 22,
    rejected: 15,
    pendingFeedback: 48,
    averageDelayDays: 6,
    status: 'warning'
  },
  {
    id: 'c3',
    name: 'Accenture',
    profilesShared: 45,
    shortlisted: 12,
    rejected: 20,
    pendingFeedback: 13,
    averageDelayDays: 2,
    status: 'healthy'
  }
];

const vendorTrackerData = [
  {
    id: 'v1',
    name: 'TechStaff Providers',
    profilesSharedToOS: 150,
    profilesSubmittedToClient: 80,
    internalRejected: 70,
    clientSelected: 10,
    clientPending: 30,
    conversionRate: 12.5,
    qualityTrend: 'stable'
  },
  {
    id: 'v2',
    name: 'NextGen Resource',
    profilesSharedToOS: 7,
    profilesSubmittedToClient: 4,
    internalRejected: 3,
    clientSelected: 1,
    clientPending: 3,
    conversionRate: 25.0,
    qualityTrend: 'declining'
  },
  {
    id: 'v3',
    name: 'Elite Cyber Talent',
    profilesSharedToOS: 60,
    profilesSubmittedToClient: 40,
    internalRejected: 20,
    clientSelected: 15,
    clientPending: 10,
    conversionRate: 37.5,
    qualityTrend: 'improving'
  }
];

const redeploymentData = [
  {
    id: 'r1',
    candidateName: 'Mahesh Kumar',
    skills: ['JMeter', 'Performance Testing', 'APM'],
    daysWaiting: 7,
    originalClient: 'MapOut',
    matchScore: 94,
    alternateOpportunities: 3,
    expectedRevenue: '₹6 Lakhs'
  },
  {
    id: 'r2',
    candidateName: 'Madhavi L',
    skills: ['Dynatrace', 'Performance Engineering', 'Java'],
    daysWaiting: 6,
    originalClient: 'TCS',
    matchScore: 88,
    alternateOpportunities: 2,
    expectedRevenue: '₹7.5 Lakhs'
  },
  {
    id: 'r3',
    candidateName: 'Derangula UdayKiran',
    skills: ['LoadRunner', 'Splunk', 'API Testing'],
    daysWaiting: 9,
    originalClient: 'Infosys',
    matchScore: 91,
    alternateOpportunities: 4,
    expectedRevenue: '₹4.5 Lakhs'
  }
];

export default function ClientFeedbackTracker() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'clients' | 'vendors' | 'followup' | 'redeployment'>('clients');

  if (user?.role !== 'admin' && user?.role !== 'founder') {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p>This view is restricted to executive roles.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Tracker</h1>
          <p className="text-slate-500 mt-1">Vendor Submission, Client Feedback & Redeployment Analytics</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'clients' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Client Feedback
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'vendors' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Vendor Conversion
          </button>
          <button
            onClick={() => setActiveTab('redeployment')}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'redeployment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Idle Recovery
          </button>
          <button
            onClick={() => setActiveTab('followup')}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'followup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Follow-up Queue
          </button>
        </div>
      </div>

      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientTrackerData.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${client.status === 'critical' ? 'bg-red-50 text-red-600' : client.status === 'warning' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{client.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg Delay</span>
                  <div className={`text-lg font-black ${client.averageDelayDays > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                    {client.averageDelayDays} Days
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Profiles Shared</span>
                  <span className="font-bold text-slate-900">{client.profilesShared}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-4 flex overflow-hidden">
                  <div className="bg-emerald-500 h-2" style={{ width: `${(client.shortlisted / client.profilesShared) * 100}%` }}></div>
                  <div className="bg-amber-400 h-2" style={{ width: `${(client.pendingFeedback / client.profilesShared) * 100}%` }}></div>
                  <div className="bg-rose-500 h-2" style={{ width: `${(client.rejected / client.profilesShared) * 100}%` }}></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100/50">
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1 line-clamp-1"><CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500"/>Shortlist</div>
                    <div className="font-bold text-slate-900">{client.shortlisted}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1 line-clamp-1"><Clock className="w-3 h-3 inline mr-1 text-amber-500"/>Pending</div>
                    <div className="font-bold text-slate-900">{client.pendingFeedback}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1 line-clamp-1"><XCircle className="w-3 h-3 inline mr-1 text-rose-500"/>Rejected</div>
                    <div className="font-bold text-slate-900">{client.rejected}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
               <tr>
                 <th className="px-6 py-4">Vendor Partner</th>
                 <th className="px-6 py-4 text-center">Received (OS)</th>
                 <th className="px-6 py-4 text-center">Sub. to Client</th>
                 <th className="px-6 py-4 text-center">Int. Rejected</th>
                 <th className="px-6 py-4 text-center border-l">Pending (Client)</th>
                 <th className="px-6 py-4 text-center">Client Selected</th>
                 <th className="px-6 py-4 text-right">Ext. Conversion</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {vendorTrackerData.map(v => (
                 <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                         <Users className="w-4 h-4" />
                       </div>
                       <span className="font-bold text-slate-900">{v.name}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-center font-medium text-slate-700">{v.profilesSharedToOS}</td>
                   <td className="px-6 py-4 text-center font-medium text-indigo-600">{v.profilesSubmittedToClient}</td>
                   <td className="px-6 py-4 text-center font-medium text-rose-500">{v.internalRejected}</td>
                   <td className="px-6 py-4 text-center text-amber-600 font-medium border-l">{v.clientPending}</td>
                   <td className="px-6 py-4 text-center text-emerald-600 font-medium">{v.clientSelected}</td>
                   <td className="px-6 py-4 text-right">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${v.conversionRate > 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                       {v.conversionRate}%
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {activeTab === 'redeployment' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
           <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
             <div>
               <h2 className="text-lg font-bold text-slate-900">Idle Candidate Recovery</h2>
               <p className="text-sm text-slate-500">Candidates waiting {'>'} 5 days with high alternate match scores.</p>
             </div>
             <div className="text-right">
               <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">Expected Revenue Potential</span>
               <span className="text-2xl font-black text-slate-900">₹18 Lakhs</span>
             </div>
           </div>
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
               <tr>
                 <th className="px-6 py-4">Candidate</th>
                 <th className="px-6 py-4">Key Skills</th>
                 <th className="px-6 py-4 text-center">Delayed At</th>
                 <th className="px-6 py-4 text-center">Idle Days</th>
                 <th className="px-6 py-4 text-center">Alt. Match Score</th>
                 <th className="px-6 py-4 text-center">Alt. Requirements</th>
                 <th className="px-6 py-4 text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {redeploymentData.map(r => (
                 <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                         <Briefcase className="w-4 h-4" />
                       </div>
                       <span className="font-bold text-slate-900">{r.candidateName}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                       {r.skills.map(s => <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">{s}</span>)}
                     </div>
                   </td>
                   <td className="px-6 py-4 text-center font-medium text-slate-700">{r.originalClient}</td>
                   <td className="px-6 py-4 text-center font-black text-red-500">{r.daysWaiting} Days</td>
                   <td className="px-6 py-4 text-center text-emerald-600 font-bold">{r.matchScore}%</td>
                   <td className="px-6 py-4 text-center font-bold text-indigo-600">{r.alternateOpportunities}</td>
                   <td className="px-6 py-4 text-right">
                      <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                        Redeploy
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {activeTab === 'followup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto mt-12">
           <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <Send className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">Follow-Up Engine</h3>
           <p className="text-slate-500 mb-6 text-sm leading-relaxed">
             Deterministic alerting and email drafting for pending feedback exceeding 3 days. 
             This workflow will automatically queue tasks for the Founder's approval before dispatching emails via Gmail integration.
           </p>
           <button className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-not-allowed opacity-75">
             Connect Google Workspace (Phase 7)
           </button>
        </div>
      )}
    </div>
  );
}
