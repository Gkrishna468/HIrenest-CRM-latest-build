import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Building2, Mail, Phone, MapPin, MoreVertical } from 'lucide-react';
import { SourceBadge } from '@/components/SourceBadge';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  source: 'crm' | 'os';
}

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const fetchedContacts: Contact[] = snap.docs.map(d => {
          const data = d.data();
          let name = data.name || data.email?.split('@')[0] || 'Unknown';
          return {
            id: d.id,
            name,
            title: data.role || 'User',
            company: data.companyName || data.organizationId || 'N/A',
            email: data.email || '',
            phone: data.phone || '',
            location: 'Remote',
            source: 'os'
          };
        });
        setContacts(fetchedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(c => 
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
        {loading ? (
           <div className="flex justify-center items-center h-32">
             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
           </div>
        ) : filteredContacts.length > 0 ? (
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
