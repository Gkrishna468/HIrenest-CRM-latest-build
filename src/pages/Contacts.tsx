import React from 'react';
import { Users, Plus, Search } from 'lucide-react';

export default function Contacts() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>Contacts</h1>
          <p className="text-slate-600 mt-1">Manage Hiring Managers, HR, and other stakeholders.</p>
        </div>
        <button className="flex items-center gap-2 skeuo-btn-primary px-4 py-2.5">
          <Plus className="w-5 h-5 drop-shadow-sm" />
          Add Contact
        </button>
      </div>

      <div className="skeuo-card p-12 text-center">
        <Users className="w-12 h-12 text-slate-400 mx-auto mb-4 drop-shadow-sm" style={{filter: 'drop-shadow(0 1px 1px white)'}} />
        <h3 className="text-lg font-bold text-slate-800" style={{textShadow: '0 1px 0 white'}}>No contacts found</h3>
        <p className="text-slate-500 mt-2 font-medium">Start adding contacts to build your network.</p>
      </div>
    </div>
  );
}
