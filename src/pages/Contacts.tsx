import React from 'react';
import { Users, Plus, Search } from 'lucide-react';

export default function Contacts() {
  return (
    <div className="h-[calc(100vh-4rem)] p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contacts</h1>
          <p className="text-slate-500 mt-1">Manage Hiring Managers, HR, and other stakeholders.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900">No contacts found</h3>
        <p className="text-slate-500 mt-2">Start adding contacts to build your network.</p>
      </div>
    </div>
  );
}
