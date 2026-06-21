/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Handshake, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  Star,
  Award,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { safeArray, safeString } from '@/utils/safe';
import { cn } from '@/lib/utils';
import { SourceBadge } from "@/components/SourceBadge";

export default function Vendors() {
  const { vendors, loading, addVendor, candidates, deals } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setForm] = useState({
    name: '',
    company: '',
    type: 'vendor' as 'vendor' | 'recruiter',
    isRecruiter: false,
    recruiterCompany: ''
  });
  
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    resumeUrl: '',
    jobTitle: ''
  });

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name || !candidateForm.email || !candidateForm.phone || !candidateForm.linkedin) {
      toast.error('Complete Candidate Information Required');
      return;
    }
    
    // Generate Ownership Identity Hash
    const identityString = `${candidateForm.email}-${candidateForm.phone}-${candidateForm.linkedin}`.toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(identityString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const identityHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    try {
      const response = await fetch('/api/candidates?action=submitVendorCandidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateHash: identityHash,
          vendorId: selectedVendor.id,
          candidateName: candidateForm.name,
          identityData: {
            email: candidateForm.email,
            phone: candidateForm.phone,
            linkedin: candidateForm.linkedin,
            resume_url: candidateForm.resumeUrl,
            current_title: candidateForm.jobTitle
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit candidate');
      }

      toast.success('Candidate Identity Vault Check Passed. Profile Submitted & Protected.');
      setIsSubmitModalOpen(false);
      setCandidateForm({ name: '', email: '', phone: '', linkedin: '', resumeUrl: '', jobTitle: ''});
      
      // Optionally run refreshAll() from context if available
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit candidate');
    }
  };

  const filteredVendors = safeArray(vendors).filter(v => 
    safeString(v.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    safeString(v.company).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof addVendor === 'function') {
        const payload = {
          ...formData,
          type: (formData.isRecruiter ? 'recruiter' : 'vendor') as any
        };
        await addVendor(payload);
        toast.success('Vendor registered');
        setIsModalOpen(false);
        setForm({ name: '', company: '', type: 'vendor', isRecruiter: false, recruiterCompany: '' });
      }
    } catch (err) {
      toast.error('Failed to register vendor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vendors and Recruiters</h1>
          <p className="text-slate-500 mt-1">Manage your professional delivery network and partner benchmarks.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Partner
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search partners or agencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="bg-white h-40 rounded-2xl border border-slate-100" />)}
        </div>
      ) : filteredVendors?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor, index) => (
            <div key={vendor.id || ("vendor-" + index)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Handshake className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border",
                    vendor.type === 'recruiter' ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-blue-100 text-blue-700 border-blue-200"
                  )}>
                    {vendor.type}
                  </span>
                  <div className="flex text-yellow-400 scale-75 origin-right">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 opacity-30" />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h4 
                    onClick={() => setSelectedVendor(vendor)}
                    className="font-bold text-slate-900 text-lg cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {vendor.name}
                  </h4>
                  <SourceBadge source={vendor.source || 'crm'} />
                </div>
                <p className="text-sm text-slate-500 font-medium">{vendor.company}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">ORG: {vendor.companyId || 'ROOT_TENANT'}</span>
                  </div>
                  {vendor.vendorCode && (
                    <span className="text-[10px] font-mono text-indigo-500 font-black tracking-widest">{vendor.vendorCode}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                  {safeArray(vendor.specialization).slice(0, 3).map((s, i) => (
                    <span key={s + "-" + i} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded uppercase border border-slate-100">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-20 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
          No delivery partners registered in this organization.
        </div>
      )}
      {/* Vendor Detail/Edit Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            <div className="p-6 md:p-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Handshake className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedVendor.name}</h2>
                  <p className="text-slate-500 font-medium text-sm mt-0.5">{selectedVendor.company} • ID: {selectedVendor.vendorCode || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVendor(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vendor Scorecard & Funnel</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[
                    { label: 'Broadcasts Rcvd', val: selectedVendor.broadcastsReceived || '0', color: 'text-slate-600' },
                    { label: 'Responses', val: selectedVendor.responses || '0', color: 'text-slate-600' },
                    { label: 'Profiles Shared', val: selectedVendor.profilesShared || '0', color: 'text-blue-600' },
                    { label: 'Submissions Acc', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length, color: 'text-indigo-600' },
                    { label: 'Interviews', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id && c.stage === 'interview').length, color: 'text-purple-600' },
                    { label: 'Offers', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id && c.stage === 'offer').length, color: 'text-amber-600' },
                    { label: 'Placements', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id && (c.stage === 'placed' || c.stage === 'joined')).length, color: 'text-emerald-600' },
                    { label: 'Response Rate', val: selectedVendor.responseRate || '0%', color: 'text-slate-600' },
                    { label: 'Interview Ratio', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length > 0 ? `${Math.round((safeArray(candidates).filter(c => c.vendorId === selectedVendor.id && c.stage === 'interview').length / safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length) * 100)}%` : '0%', color: 'text-indigo-600' },
                    { label: 'Join Ratio', val: safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length > 0 ? `${Math.round((safeArray(candidates).filter(c => c.vendorId === selectedVendor.id && (c.stage === 'placed' || c.stage === 'joined')).length / safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length) * 100)}%` : '0%', color: 'text-emerald-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                      <p className={cn("text-2xl font-black", stat.color)}>{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Candidates List */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                         <Activity className="w-4 h-4 text-indigo-600" /> Active Submissions
                      </h3>
                      <button 
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Submit Candidate
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).length === 0 ? (
                           <div className="p-8 text-center text-slate-500 font-medium text-sm">
                             No active candidates from this vendor.
                           </div>
                        ) : safeArray(candidates).filter(c => c.vendorId === selectedVendor.id).slice(0, 5).map((cand: any, idx) => (
                           <div key={idx} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                             <div>
                               <p className="font-bold text-slate-900">{cand.name}</p>
                               <p className="text-xs text-slate-500 mt-1">{cand.email || 'No email'}</p>
                             </div>
                             <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                               {cand.stage.toUpperCase()}
                             </span>
                           </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  {/* Financials block */}
                  <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <CheckCircle2 className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Commercials (Admin)
                      </h3>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revenue Generated</p>
                        <p className="text-xl font-black text-white">₹0</p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Outstanding Payables</p>
                        <p className="text-2xl font-black text-rose-400">₹0</p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Collection Status</p>
                        <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mt-1">Up to date</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Submit Modal */}
      {isSubmitModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]">
            {/* Left Side: Trust & Protection Policy */}
            <div className="bg-slate-900 p-8 w-full md:w-5/12 text-white shrink-0 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-xl font-black mb-4 tracking-tight">Candidate Ownership Protection</h2>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Your trust is important to us. Every candidate submitted through HireNestOS is protected by our Vendor Ownership Framework and Mutual NDA policies.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Why we need complete details:</h4>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> 
                      Create a unique candidate identity
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      Prevent duplicate submissions
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      Improve AI profile matching
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      Maximize placement success
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  We do not use vendor-submitted candidates for unauthorized submissions, redistribution, or ownership transfers. Our success is directly tied to your success.
                </p>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 w-full md:w-7/12 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Submit Profile</h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">To: {selectedVendor.name}</p>
                </div>
                <button 
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors shrink-0"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCandidateSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Candidate Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={e => setCandidateForm({...candidateForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={candidateForm.email}
                      onChange={e => setCandidateForm({...candidateForm, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={candidateForm.phone}
                      onChange={e => setCandidateForm({...candidateForm, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">LinkedIn URL *</label>
                  <input
                    type="url"
                    required
                    value={candidateForm.linkedin}
                    onChange={e => setCandidateForm({...candidateForm, linkedin: e.target.value})}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resume link</label>
                  <input
                    type="url"
                    value={candidateForm.resumeUrl}
                    onChange={e => setCandidateForm({...candidateForm, resumeUrl: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg shadow-indigo-600/20 font-sans"
                  >
                    Submit Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
