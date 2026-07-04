import React, { useState } from 'react';
import { Users, Plus, Search, Building2, Mail, Phone, MapPin, MoreVertical } from 'lucide-react';
import { SourceBadge } from '@/components/SourceBadge';

const MOCK_CONTACTS = [
  { id: 1, name: 'Jane Doe', title: 'Director of Engineering', company: 'Legacy Tech Corp', email: 'jane.doe@legacytech.com', phone: '+91 9876543210', location: 'Remote', source: 'crm' },
  { id: 2, name: 'John Smith', title: 'VP of Talent', company: 'Fintech Solutions', email: 'john.smith@fintechsols.in', phone: '+91 9876543211', location: 'Bangalore', source: 'crm' },
  { id: 3, name: 'Alice Johnson', title: 'HR Manager', company: 'Global SaaS Inc', email: 'alice.j@globalsaas.io', phone: '+91 9123456781', location: 'Mumbai', source: 'crm' },
  { id: 4, name: 'Bob Williams', title: 'CTO', company: 'Cloud Native LLC', email: 'bob.w@cloudnative.dev', phone: '+91 9123456782', location: 'Pune', source: 'crm' },
  { id: 5, name: 'Charlie Brown', title: 'Lead Designer', company: 'Creative Agency', email: 'charlie.b@creativeagency.co', phone: '+91 9123456783', location: 'Delhi', source: 'crm' },
  { id: 6, name: 'Diana Prince', title: 'Head of Recruitment', company: 'Global Tech Staffing', email: 'diana.p@globaltech.com', phone: '+91 9123456789', location: 'Pune', source: 'crm' },
  { id: 7, name: 'Evan Davis', title: 'Vendor Manager', company: 'Cloud Experts Recruitment', email: 'evan.d@cloudexperts.io', phone: '+91 9123456780', location: 'Hyderabad', source: 'crm' },
  { id: 8, name: 'Fiona Garcia', title: 'Talent Acquisition Specialist', company: 'Cloud Native LLC', email: 'fiona.g@cloudnative.dev', phone: '+91 9123456784', location: 'Pune', source: 'crm' },
];

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = MOCK_CONTACTS.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>Contacts</h1>
          <p className="text-slate-600 mt-1">Manage Hiring Managers, HR, and other stakeholders.</p>
        </div>
        <button className="flex items-center gap-2 skeuo-btn-primary px-4 py-2.5">
          <Plus className="w-5 h-5 drop-shadow-sm" />
          Add Contact
        </button>
      </div>

      <div className="mb-6 flex-shrink-0">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts by name, company, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-8">
        {filteredContacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="skeuo-card p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full skeuo-bg flex items-center justify-center text-indigo-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_1px_white] border border-slate-300 font-bold text-lg uppercase">
                    {contact.name.substring(0, 2)}
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-lg cursor-pointer hover:text-indigo-600 transition-colors">
                      {contact.name}
                    </h4>
                    <SourceBadge source={contact.source as any} />
                  </div>
                  <p className="text-sm font-semibold text-indigo-600 mb-3">{contact.title}</p>
                  
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{contact.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 truncate">{contact.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{contact.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="skeuo-card p-12 text-center h-full flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4 drop-shadow-sm" style={{filter: 'drop-shadow(0 1px 1px white)'}} />
            <h3 className="text-lg font-bold text-slate-800" style={{textShadow: '0 1px 0 white'}}>No contacts found</h3>
            <p className="text-slate-500 mt-2 font-medium">Start adding contacts to build your network.</p>
          </div>
        )}
      </div>
    </div>
  );
}
