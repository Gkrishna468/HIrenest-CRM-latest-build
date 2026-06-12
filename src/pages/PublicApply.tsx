/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Send, 
  CheckCircle2, 
  FileText,
  User,
  Mail,
  Phone,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { safeString } from '@/utils/safe';

export default function PublicApply() {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('src') || 'external';
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    summary: '',
    resume_url: ''
  });

  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (error) throw error;
        setJob(data);
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Create candidate record marked as external
      const { data: cand, error: candErr } = await supabase
        .from('candidates')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          linkedin_url: formData.linkedin,
          summary: formData.summary,
          resume_url: formData.resume_url,
          source: source,
          stage: 'screening',
          status: 'external'
        })
        .select()
        .single();
      
      if (candErr) throw candErr;

      // 2. Link to job if exists
      if (jobId && cand) {
        await supabase.from('job_submissions').insert({
          job_id: jobId,
          candidate_id: cand.id,
          status: 'pending'
        });
      }

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err: any) {
      toast.error('Failed to submit application: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 bg-indigo-200 rounded-full mb-4" />
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>
    </div>
  );

  if (!job && !loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Job Not Found</h1>
        <p className="text-slate-500 mt-2">This job listing may have expired or been removed.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Application Received!</h1>
        <p className="text-slate-500 mt-4 leading-relaxed">
          Thank you for applying for the <span className="font-bold text-indigo-600">{job.title}</span> position at <span className="font-bold text-slate-700">{job.client_name || 'HireNest Partner'}</span>. 
          Our AI Recruitment Agents will review your profile shortly.
        </p>
        <div className="mt-10 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Powered by HireNest Enterprise</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Job Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Job Opportunity</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h1>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 className="w-5 h-5 text-slate-400" />
                <span className="font-medium">{job.client_name || 'Direct Hire'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>{job.location}</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Role Description</h3>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                {job.description || 'Professional role with modern requirements.'}
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 p-8 rounded-3xl text-white shadow-xl shadow-indigo-900/20">
            <h3 className="font-bold mb-2">Hiring Process</h3>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Our autonomous agents use deep neural matching to evaluate fit. If shortlisted, you will hear from our recruiters within 48 hours.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-3">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Submit Application</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5" /> LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Resume Link (G-Drive/Dropbox)
                </label>
                <input
                  type="url"
                  required
                  value={formData.resume_url}
                  onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
                  placeholder="Paste direct link to your PDF resume"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Professional Summary / Covering Note</label>
                <textarea
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => setFormData({...formData, summary: e.target.value})}
                  placeholder="Tell us why you're a great fit for this role..."
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Processing Submission...' : 'Submit Application'}
                <Send className="w-5 h-5" />
              </button>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                By clicking Submit, you agree to our Terms of Service and Privacy Policy regarding candidate data processing.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
