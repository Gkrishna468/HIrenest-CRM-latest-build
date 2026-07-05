/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  Star, 
  Calendar, 
  Linkedin, 
  Award, 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  PhoneCall, 
  XCircle, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { SourceBadge } from '@/components/SourceBadge';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  source: 'crm' | 'os';
  rating?: number; // 1-5
  lastMeeting?: string;
  birthday?: string;
  linkedin?: string;
  callsCount?: number;
  emailsCount?: number;
  whatsappCount?: number;
  requirementsGiven?: number;
  placementsCount?: number;
  personalNotes?: string;
  aiSummary?: string;
}

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    location: 'Bangalore'
  });

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        let snap = await getDocs(collection(db, 'contacts'));
        let fetchedContacts: Contact[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Unknown',
            title: data.title || 'HR Head',
            company: data.company || 'ABC Technologies',
            email: data.email || '',
            phone: data.phone || '+91 98860 12345',
            location: data.location || 'Bangalore',
            source: (data.source || 'crm') as 'crm' | 'os',
            rating: data.rating || 4,
            lastMeeting: data.lastMeeting || '4 days ago',
            birthday: data.birthday || 'September 14',
            linkedin: data.linkedin || '',
            callsCount: data.callsCount || 0,
            emailsCount: data.emailsCount || 0,
            whatsappCount: data.whatsappCount || 0,
            requirementsGiven: data.requirementsGiven || 0,
            placementsCount: data.placementsCount || 0,
            personalNotes: data.personalNotes || 'Focuses on team alignment SLA loops.',
            aiSummary: data.aiSummary || 'A crucial technology recruitment stakeholder.'
          };
        });

        if (fetchedContacts.length === 0) {
          // Dynamic Firebase Seeding
          const demoContacts: Omit<Contact, 'id'>[] = [
            {
              name: 'John Smith',
              title: 'Delivery Manager',
              company: 'ABC Technologies',
              email: 'john.smith@abctech.com',
              phone: '+91 99000 88221',
              location: 'Hyderabad, India',
              source: 'crm',
              rating: 5,
              lastMeeting: '2 days ago',
              birthday: 'October 24',
              linkedin: 'https://linkedin.com/in/johnsmith-delivery',
              callsCount: 18,
              emailsCount: 42,
              whatsappCount: 8,
              requirementsGiven: 15,
              placementsCount: 6,
              personalNotes: 'Always looks for candidates with strong architectural and communication skills. Dislikes generic submissions.',
              aiSummary: 'Main key contact in ABC Technologies. Drives 70% of tech requisitions. Maintain regular weekly touchpoints.'
            },
            {
              name: 'Priyanka Sen',
              title: 'Talent Acquisition Head',
              company: 'Infosys',
              email: 'priyanka.s@infosys.com',
              phone: '+91 98801 77334',
              location: 'Pune, India',
              source: 'crm',
              rating: 4,
              lastMeeting: 'Yesterday',
              birthday: 'January 12',
              linkedin: 'https://linkedin.com/in/priyankasen-ta',
              callsCount: 12,
              emailsCount: 31,
              whatsappCount: 15,
              requirementsGiven: 19,
              placementsCount: 8,
              personalNotes: 'Prefers batch resume submissions with custom screening scores attached.',
              aiSummary: 'Strategic HR partner. Coordinates core vendor billing frameworks.'
            },
            {
              name: 'Rahul Nair',
              title: 'Engineering Director',
              company: 'Cloud Assure',
              email: 'rahul.nair@cloudassure.com',
              phone: '+91 99805 11002',
              location: 'Bangalore, India',
              source: 'crm',
              rating: 4,
              lastMeeting: 'Last week',
              birthday: 'December 05',
              linkedin: 'https://linkedin.com/in/rahulnair-cloud',
              callsCount: 6,
              emailsCount: 14,
              whatsappCount: 2,
              requirementsGiven: 4,
              placementsCount: 1,
              personalNotes: 'Requires deep backend experience (Golang, Kubernetes). Prioritizes quality over speed.',
              aiSummary: 'Direct hiring manager. Prefers receiving short profiles via WhatsApp first.'
            }
          ];

          for (const item of demoContacts) {
            await addDoc(collection(db, 'contacts'), item);
          }

          // Refetch to populate correctly with Firestore-assigned IDs
          snap = await getDocs(collection(db, 'contacts'));
          fetchedContacts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
        }

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

  const handleUpdateRating = async (contactId: string, newRating: number) => {
    try {
      await updateDoc(doc(db, 'contacts', contactId), { rating: newRating });
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, rating: newRating } : c));
      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact(prev => prev ? { ...prev, rating: newRating } : null);
      }
      toast.success('Relationship strength updated in Firestore!');
    } catch (err) {
      console.error('Failed to update rating:', err);
      toast.error('Failed to save rating changes in database.');
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactForm.name || !newContactForm.company || !newContactForm.email) {
      toast.error('Complete information required');
      return;
    }

    try {
      const payload = {
        name: newContactForm.name,
        title: newContactForm.title || 'Hiring Manager',
        company: newContactForm.company,
        email: newContactForm.email,
        phone: newContactForm.phone || '+91 90000 11111',
        location: newContactForm.location,
        source: 'crm' as const,
        rating: 3,
        lastMeeting: 'Today',
        birthday: 'Unknown',
        linkedin: '',
        callsCount: 1,
        emailsCount: 1,
        whatsappCount: 0,
        requirementsGiven: 0,
        placementsCount: 0,
        personalNotes: 'Newly added stakeholder.',
        aiSummary: 'Awaiting interaction logs.'
      };

      const docRef = await addDoc(collection(db, 'contacts'), payload);
      const added: Contact = { id: docRef.id, ...payload };

      setContacts(prev => [added, ...prev]);
      setIsModalOpen(false);
      setNewContactForm({ name: '', title: '', company: '', email: '', phone: '', location: 'Bangalore' });
      toast.success('Contact registered in CRM and stored in Firestore.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to register contact in database.');
    }
  };

  const generateOutreach = (contact: Contact, type: 'followup' | 'birthday' | 'reconnect') => {
    let text = '';
    const firstName = contact.name.split(' ')[0];
    
    if (type === 'followup') {
      text = `Subject: Sourcing Pipeline Follow-up - ${contact.company}\n\nHi ${firstName},\n\nI hope your week is off to a great start.\n\nFollowing up on our alignment conversation a couple of days ago regarding your open requirements. Our sourcing tracking currently holds some highly aligned tech profiles that scored excellently under our Trust framework validation.\n\nLet me know if you would have 5 minutes tomorrow afternoon to run a quick review.\n\nBest regards,\nGopal`;
    } else if (type === 'birthday') {
      text = `Subject: Happy Birthday, ${firstName}! 🎉\n\nHi ${firstName},\n\nWishing you a fantastic birthday today! Hope you have an awesome celebration and a great year ahead.\n\nWarm regards,\nGopal & the HireNest OS Team`;
    } else {
      text = `Subject: Reconnecting - Sourcing updates - ${contact.company}\n\nHi ${firstName},\n\nIt has been a while since we last spoke. I noticed you've recently scaled some engineering requisitions.\n\nWe have updated our local talent pool with high-match candidates ready for fast deployment. Let me know if you are open to a brief alignment call.\n\nBest,\nGopal`;
    }

    setGeneratedTemplate(text);
    toast.success('AI outreach script generated!');
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(generatedTemplate);
    setCopiedText(true);
    toast.success('Template copied to clipboard.');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>Relationship Contacts</h1>
          <p className="text-slate-600 mt-1">Manage corporate stakeholders, track communication depth, and draft instant outreach.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 skeuo-btn-primary px-4 py-2.5"
        >
          <Plus className="w-5 h-5 drop-shadow-sm" />
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Contact List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="skeuo-card p-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 skeuo-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeuo-card h-28 animate-pulse" />)
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map(contact => {
                const isSelected = selectedContact?.id === contact.id;
                return (
                  <div 
                    key={contact.id} 
                    onClick={() => {
                      setSelectedContact(contact);
                      setGeneratedTemplate('');
                    }}
                    className={cn(
                      "skeuo-card p-5 cursor-pointer transition-all hover:translate-x-1 duration-200 border",
                      isSelected 
                        ? "border-indigo-500 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500/20" 
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full skeuo-bg flex items-center justify-center text-indigo-600 shadow-inner border border-slate-300 font-black text-xs uppercase">
                          {contact.name.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{contact.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{contact.title}</p>
                        </div>
                      </div>
                      <SourceBadge source={contact.source} />
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.company}</span>
                      </div>
                    </div>

                    {/* Interactive ratings row */}
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 mt-3">
                      <div className="flex text-yellow-400 scale-90 origin-left">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateRating(contact.id, star);
                            }}
                            className={cn(
                              "w-3.5 h-3.5 cursor-pointer",
                              star <= (contact.rating || 0) ? "fill-current" : "opacity-25"
                            )}
                          />
                        ))}
                      </div>
                      
                      <span className="text-[10px] text-slate-400 font-mono">
                        Last seen: {contact.lastMeeting || 'Never'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 border-dashed text-slate-400">
                No matching contacts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Contact 360 Workspace */}
        <div className="lg:col-span-2">
          {selectedContact ? (
            <div className="bg-white rounded-[2rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
              
              {/* Profile Card Header */}
              <div className="p-6 md:p-8 bg-slate-950 border-b border-slate-800 text-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md uppercase">
                      {selectedContact.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight">{selectedContact.name}</h2>
                        <span className="text-[9px] font-mono uppercase bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold px-2 py-0.5 rounded">
                          {selectedContact.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{selectedContact.company}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedContact.linkedin && (
                      <a 
                        href={selectedContact.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-900 border border-slate-800 hover:text-indigo-400 text-slate-400 rounded-xl transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => setSelectedContact(null)}
                      className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 max-h-[70vh]">
                <div className="space-y-6">
                  
                  {/* Stats and Velocity Board */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
                    {[
                      { label: "Phone Calls", count: selectedContact.callsCount || 0, icon: PhoneCall, color: "text-blue-600" },
                      { label: "Emails Out", count: selectedContact.emailsCount || 0, icon: Mail, color: "text-indigo-600" },
                      { label: "WhatsApp Logs", count: selectedContact.whatsappCount || 0, icon: MessageSquare, color: "text-emerald-600" },
                      { label: "Placements", count: selectedContact.placementsCount || 0, icon: Award, color: "text-amber-600" }
                    ].map((m, idx) => {
                      const Icon = m.icon;
                      return (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-center items-center">
                          <Icon className={cn("w-4 h-4 mb-2", m.color)} />
                          <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">{m.label}</span>
                          <span className="text-xl font-black text-slate-900 mt-1">{m.count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Birthday & Meta track */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="text-slate-400 block uppercase tracking-widest text-[9px] font-bold">Birthday Milestone</span>
                        <span className="font-bold text-slate-800">{selectedContact.birthday || 'Not listed'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-slate-400 block uppercase tracking-widest text-[9px] font-bold">Location Jurisdiction</span>
                        <span className="font-bold text-slate-800">{selectedContact.location || 'Remote'}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Summarizer and Personal Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                      <h4 className="font-black text-slate-400 uppercase tracking-widest text-[9px] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Personal Notes
                      </h4>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {selectedContact.personalNotes || 'No custom client notes recorded.'}
                      </p>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl space-y-2">
                      <h4 className="font-black text-indigo-700 uppercase tracking-widest text-[9px] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Relationship AI Summary
                      </h4>
                      <p className="text-indigo-950 leading-relaxed font-semibold italic">
                        {selectedContact.aiSummary || 'Awaiting deeper transaction events to construct AI context.'}
                      </p>
                    </div>
                  </div>

                  {/* AI Follow-up Draft Generator */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-900">AI Instant Outreach Script</h3>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => generateOutreach(selectedContact, 'followup')}
                        className="px-3.5 py-2 bg-slate-950 text-white font-mono uppercase text-[10px] font-bold rounded-lg hover:bg-slate-800"
                      >
                        Sourcing Follow-up
                      </button>
                      <button 
                        onClick={() => generateOutreach(selectedContact, 'birthday')}
                        className="px-3.5 py-2 bg-slate-950 text-white font-mono uppercase text-[10px] font-bold rounded-lg hover:bg-slate-800"
                      >
                        Birthday Greeting
                      </button>
                      <button 
                        onClick={() => generateOutreach(selectedContact, 'reconnect')}
                        className="px-3.5 py-2 bg-slate-950 text-white font-mono uppercase text-[10px] font-bold rounded-lg hover:bg-slate-800"
                      >
                        Reconnect Ping
                      </button>
                    </div>

                    {generatedTemplate && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                          <button 
                            onClick={copyTemplate}
                            className="absolute top-3.5 right-3.5 p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100"
                          >
                            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <pre className="text-xs font-sans text-slate-700 whitespace-pre-wrap pr-10">
                            {generatedTemplate}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-20 text-center rounded-[2rem] border border-slate-200 border-dashed text-slate-400 flex flex-col items-center justify-center h-full min-h-[50vh]">
              <Users className="w-16 h-16 text-slate-300 mb-4 stroke-[1.5]" />
              <h3 className="font-bold text-slate-700 text-lg mb-1" style={{textShadow: '0 1px 0 white'}}>No Contact Selected</h3>
              <p className="text-sm max-w-sm">Select any stakeholder contact from the list to launch the Contact 360 Workspace.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Register CRM Contact</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateContact} className="p-6 space-y-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={newContactForm.name}
                  onChange={e => setNewContactForm({...newContactForm, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Title *</label>
                  <input
                    required
                    type="text"
                    value={newContactForm.title}
                    onChange={e => setNewContactForm({...newContactForm, title: e.target.value})}
                    placeholder="e.g. Delivery Manager"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company *</label>
                  <input
                    required
                    type="text"
                    value={newContactForm.company}
                    onChange={e => setNewContactForm({...newContactForm, company: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={newContactForm.email}
                  onChange={e => setNewContactForm({...newContactForm, email: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newContactForm.phone}
                    onChange={e => setNewContactForm({...newContactForm, phone: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Location</label>
                  <input
                    type="text"
                    value={newContactForm.location}
                    onChange={e => setNewContactForm({...newContactForm, location: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold font-mono uppercase text-[10px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold font-mono uppercase text-[10px] shadow-md"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
