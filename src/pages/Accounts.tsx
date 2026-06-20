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
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  ChevronRight,
  ShieldCheck,
  XCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { safeArray, safeString } from '@/utils/safe';
import { SourceBadge } from '@/components/SourceBadge';

export default function Clients() {
  const { clients, loading, addClient, jobs, candidates } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setForm] = useState({
    company: '',
    website: '',
    industry: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: ''
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);

  const filteredClients = safeArray(clients).filter(c => 
    safeString(c.company).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof addClient === 'function') {
        await addClient(formData);
        toast.success('Client added successfully');
        setIsModalOpen(false);
        setForm({ company: '', website: '', industry: '', contactPerson: '', email: '', phone: '', location: '' });
      }
    } catch (err) {
      toast.error('Failed to add client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Client Portfolio</h1>
          <p className="text-slate-500 mt-1">Manage corporate entities, hiring requirements, and account health.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          Onboard Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              Recent
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2].map(i => <div key={i} className="bg-white h-24 rounded-2xl border border-slate-100 animate-pulse" />)
            ) : filteredClients?.length > 0 ? (
              filteredClients.map(client => (
                <div key={client.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 
                            onClick={() => setSelectedClient(client)}
                            className="font-bold text-slate-900 text-lg cursor-pointer hover:text-indigo-600 transition-colors"
                          >
                            {client.company}
                          </h4>
                          <SourceBadge source={client.source || 'crm'} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          {client.website && (
                            <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                              <Globe className="w-3.5 h-3.5" />
                              <span>{client.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <span className="text-slate-300">|</span>
                          <span className="font-mono text-xs font-bold uppercase tracking-wider">{client.clientCode || 'NO CODE'}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase tracking-wider">ORG: {client.companyId || 'ROOT_TENANT'}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
                Onboard your first client to start allocating jobs.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Quick Onboard
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Company Name"
                required
                value={formData.company}
                onChange={e => setForm({...formData, company: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all"
              />
              <input
                type="text"
                placeholder="Website (optional)"
                value={formData.website}
                onChange={e => setForm({...formData, website: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all"
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Add Client
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Onboard Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Onboard New Client</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                  <input
                    required
                    type="text"
                    value={formData.company}
                    onChange={(e) => setForm({...formData, company: e.target.value})}
                    placeholder="e.g. Cloud Assure"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website URL</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setForm({...formData, website: e.target.value})}
                    placeholder="e.g. cloudassure.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setForm({...formData, industry: e.target.value})}
                    placeholder="e.g. Information Technology"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setForm({...formData, location: e.target.value})}
                    placeholder="e.g. Bangalore, India"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Primary Contact Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setForm({...formData, email: e.target.value})}
                    placeholder="contact@company.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setForm({...formData, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-600/20"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client 360 Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="p-6 md:p-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedClient.company}</h2>
                  <p className="text-slate-500 font-medium text-sm mt-0.5">Account Code: {selectedClient.clientCode || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Account Velocity</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Requirements', val: safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).length, color: 'text-slate-600' },
                    { label: 'Submissions', val: safeArray(candidates).filter(c => safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).map(j => j.id).includes(c.jobId)).length, color: 'text-blue-600' },
                    { label: 'Interviews', val: safeArray(candidates).filter(c => safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).map(j => j.id).includes(c.jobId) && c.stage === 'interview').length, color: 'text-indigo-600' },
                    { label: 'Offers', val: safeArray(candidates).filter(c => safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).map(j => j.id).includes(c.jobId) && c.stage === 'offer').length, color: 'text-teal-600' },
                    { label: 'Placements', val: safeArray(candidates).filter(c => safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).map(j => j.id).includes(c.jobId) && (c.stage === 'placed' || c.stage === 'joined')).length, color: 'text-emerald-600' },
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
                  {/* Requirements List */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                         <Building2 className="w-4 h-4 text-indigo-600" /> Active Requirements
                      </h3>
                      <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).length === 0 ? (
                           <div className="p-8 text-center text-slate-500 font-medium text-sm">
                             No active requirements for this account.
                           </div>
                        ) : safeArray(jobs).filter(j => j.clientId === selectedClient.id || j.clientName === selectedClient.company).slice(0, 5).map((job: any, idx) => (
                           <div key={idx} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                             <div>
                               <p className="font-bold text-slate-900">{job.title}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <SourceBadge source={job.source || 'os'} className="scale-90 origin-left" />
                                 <span className="text-xs text-slate-500">{job.location || 'Remote'}</span>
                               </div>
                             </div>
                             <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                               {job.status.toUpperCase()}
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
                      <CheckCircle className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Commercials & Revenue
                      </h3>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revenue Generated</p>
                        <p className="text-xl font-black text-white">₹0</p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Collections Due</p>
                        <p className="text-2xl font-black text-amber-400">₹0</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Intelligence</h3>
                    <div className="space-y-3 shrink-0">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedClient.email || 'No email registered'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedClient.phone || 'No phone registered'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedClient.location || 'Global Location'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
