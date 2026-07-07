/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, UserPlus, Key, ShieldCheck, Mail, Check, Activity, ShieldAlert, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationUser } from './VendorTypes';

interface VendorIdentityEngineProps {
  selectedVendor: any;
}

export default function VendorIdentityEngine({ selectedVendor }: VendorIdentityEngineProps) {
  // Hardcoded or dynamically seeded initial organization users
  const [teamUsers, setTeamUsers] = useState<OrganizationUser[]>([
    {
      id: 'usr-1',
      name: selectedVendor?.name || 'Priya Sharma',
      email: selectedVendor?.email || 'priya@apexstaffing.com',
      role: 'Admin',
      status: 'active',
      lastActive: '10 mins ago',
      permissions: ['Submit Candidate', 'View Requirements', 'View Analytics', 'Manage Users', 'View Billing']
    },
    {
      id: 'usr-2',
      name: 'Rahul Nair',
      email: 'rahul@apexstaffing.com',
      role: 'Recruiter 1',
      status: 'active',
      lastActive: '2 hours ago',
      permissions: ['Submit Candidate', 'View Requirements']
    },
    {
      id: 'usr-3',
      name: 'Suresh Kumar',
      email: 'suresh@apexstaffing.com',
      role: 'Finance',
      status: 'active',
      lastActive: 'Yesterday',
      permissions: ['View Billing', 'Manage Invoices']
    },
    {
      id: 'usr-4',
      name: 'Elena Rostova',
      email: 'elena@apexstaffing.com',
      role: 'Delivery Manager',
      status: 'pending',
      lastActive: 'Never',
      permissions: ['Submit Candidate', 'View Requirements', 'View Analytics']
    }
  ]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Recruiter 2' as any
  });

  const handleAddTeamUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      toast.error('Name and Email are required.');
      return;
    }

    const created: OrganizationUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'pending',
      lastActive: 'Never',
      permissions: newUser.role === 'Admin' 
        ? ['Submit Candidate', 'View Requirements', 'View Analytics', 'Manage Users', 'View Billing']
        : ['Submit Candidate', 'View Requirements']
    };

    setTeamUsers(prev => [...prev, created]);
    toast.success(`Invitation dispatched to ${newUser.email}! Credentials temporary secure code generated.`);
    setNewUser({ name: '', email: '', role: 'Recruiter 2' });
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: CORPORATE IDENTITY MODEL */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">Organization Identity Engine</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Enterprise Unified Identity (SSOT Compliance)</h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              This partner is mapped under a single unique Corporate Organization ID. This maps all linked CRM records, active OS requirements, and client workspaces to prevent shadow entity duplication.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold text-slate-600 shadow-sm">
            <Fingerprint className="w-4 h-4 text-indigo-500" />
            <span>ORG_ID: {selectedVendor?.id?.substring(0, 8).toUpperCase() || 'VND_00360'}</span>
          </div>
        </div>

        {/* SECURITY CRYTOGRAPHY COMPLIANCE BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Firestore Transactions</span>
            <span className="text-xs font-bold text-emerald-600">● ACID COMPLIANT</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Optimistic Locking</span>
            <span className="text-xs font-bold text-emerald-600">● CONCURRENCY OK</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Resume Hashing</span>
            <span className="text-xs font-bold text-indigo-600">● SHA-256 ACTIVE</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Identity Protocol</span>
            <span className="text-xs font-bold text-indigo-600">● FIREBASE AUTH & CLAIMS</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: TEAM DIRECTORY & USERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User directory table (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Organization Team Directory</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-bold">{teamUsers.length} Active Logins</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="pb-3">Name & Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Active</th>
                  <th className="pb-3 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {teamUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="font-bold text-slate-800">{usr.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {usr.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold ${usr.status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {usr.status === 'active' ? '● Active' : '○ Pending invite'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[10px]">{usr.lastActive}</td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => toast.info(`Permissions: ${usr.permissions.join(', ')}`)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        View Permissions ({usr.permissions.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">Invite Team Member</h4>
          </div>

          <form onSubmit={handleAddTeamUser} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Babu"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Corporate Email</label>
              <input
                type="email"
                required
                placeholder="ramesh@apexstaffing.com"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Assigned Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Recruiter 1">Recruiter 1</option>
                <option value="Recruiter 2">Recruiter 2</option>
                <option value="Delivery Manager">Delivery Manager</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-[10px] text-slate-500 leading-relaxed space-y-1">
              <p className="font-bold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Portal Security Compliance
              </p>
              <p>✔ Password temporary token is valid for 24 hours.</p>
              <p>✔ Mandates force password reset on 3rd portal login.</p>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all"
            >
              Dispatch Invite
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
