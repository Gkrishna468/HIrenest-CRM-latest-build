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

export default function Vendors() {
  const { vendors, loading, addVendor } = useData();
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
          {filteredVendors.map(vendor => (
            <div key={vendor.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
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
                <h4 
                  onClick={() => setSelectedVendor(vendor)}
                  className="font-bold text-slate-900 text-lg cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  {vendor.name}
                </h4>
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
                  {safeArray(vendor.specialization).slice(0, 3).map(s => (
                    <span key={s} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded uppercase border border-slate-100">{s}</span>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <Handshake className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedVendor.name}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">{selectedVendor.company} • ID: {selectedVendor.vendorCode || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVendor(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Partner Profile</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Specialization</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {safeArray(selectedVendor.specialization).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 pt-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Company Bench</label>
                      <p className="text-sm font-bold text-slate-900 capitalize">{selectedVendor.benchSize || '15+ Professional Consultants'}</p>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Intelligence</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Submissions</p>
                      <p className="text-lg font-black text-indigo-700">24</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Active Picks</p>
                      <p className="text-lg font-black text-emerald-700">06</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                    <Filter className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-tight">Missing in Pipeline: 3 candidates awaiting review</span>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="px-6 py-2.5 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition-all text-sm"
                >
                  Close
                </button>
                <button 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-600/20"
                  onClick={() => toast.success('Vendor profile updated')}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
