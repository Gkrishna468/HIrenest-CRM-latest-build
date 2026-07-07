import React from 'react';
import { Lock, Cpu, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface SingleProfileFormProps {
  vendorForm: any;
  setVendorForm: React.Dispatch<React.SetStateAction<any>>;
  handleVendorSubmit: (e: React.FormEvent) => Promise<void>;
  submitting: boolean;
  pipelineStep: number;
  pipelineLog: string[];
  submissionResult: any;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setSubmissionResult: React.Dispatch<React.SetStateAction<any>>;
  setPipelineStep: React.Dispatch<React.SetStateAction<number>>;
  authenticatedVendor: any;
}

export const SingleProfileForm: React.FC<SingleProfileFormProps> = ({
  vendorForm,
  setVendorForm,
  handleVendorSubmit,
  submitting,
  pipelineStep,
  pipelineLog,
  submissionResult,
  setSubmitting,
  setSubmissionResult,
  setPipelineStep,
  authenticatedVendor
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative">
      {/* SUBMITTING OVERLAY */}
      {submitting && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md rounded-3xl z-40 flex flex-col p-8 justify-between animate-in fade-in duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center animate-pulse">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-white uppercase tracking-wider text-sm font-mono">Vendor Sourcing Pipeline</h3>
                <p className="text-[9px] text-amber-400 font-mono font-bold">LEDGER_SYNC: {authenticatedVendor?.name?.toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs text-slate-300">
              {pipelineStep === 1 && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Connecting to Sourcing Fabric...</span>
                </div>
              )}
              {pipelineStep >= 2 && (
                <div className="flex items-start gap-3 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Resume Text Analyzed & Parsed successfully.</span>
                </div>
              )}
              {pipelineStep === 2 && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Matching candidate skills against requirement metadata...</span>
                </div>
              )}
              {pipelineStep >= 3 && (
                <div className="flex items-start gap-3 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Law 4: Profile ownership lock verified. No conflicts.</span>
                </div>
              )}
              {pipelineStep === 3 && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Hashing credentials and locking representation...</span>
                </div>
              )}
              {pipelineStep >= 4 && (
                <div className="flex items-start gap-3 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Saving event to immutable Company Ledger.</span>
                </div>
              )}
              {pipelineStep === 4 && (
                <div className="flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Finalizing ledger serialization...</span>
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[10px] text-slate-400 max-h-40 overflow-y-auto custom-scrollbar">
              {pipelineLog.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>
          </div>

          {/* Results Screen */}
          {pipelineStep === 5 && submissionResult && (
            <div className="space-y-6 pt-4 border-t border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/25 p-5 rounded-2xl text-center space-y-3">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono">Submission Accepted</p>
                <div className="text-4xl font-black text-white font-mono">{submissionResult.aiMatchScore}% <span className="text-xs text-slate-400 block font-normal mt-1 font-sans">AI Match Confidence</span></div>
              </div>
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500">Assigned Account Manager</span><span className="font-bold text-amber-400">{submissionResult.assignedBdm}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-800"><span className="text-slate-500 font-mono">Sourcing Ownership</span><span className="font-bold text-emerald-400">GRANTED ✓</span></div>
              </div>
              <button 
                onClick={() => {
                  setSubmitting(false);
                  setSubmissionResult(null);
                  setPipelineStep(0);
                  setVendorForm({
                    candidateName: '',
                    email: '',
                    phone: '',
                    linkedin: '',
                    resume_url: '',
                    current_company: '',
                    current_title: '',
                    current_ctc: '',
                    expected_ctc: '',
                    notice_period: '',
                    location: '',
                    payroll: 'Vendor Payroll',
                    availability: 'Immediate',
                    cover_note: ''
                  });
                }}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                Submit Another Profile
              </button>
            </div>
          )}

          {pipelineStep === -1 && (
            <div className="space-y-4 pt-4 border-t border-slate-800 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-6 h-6" />
              </div>
              <h4 className="font-black font-mono text-rose-500 text-sm uppercase">REPRESENTATION LOCKED</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">This candidate is already represented or locked under prior registry claims. Representation cannot be overwritten.</p>
              <button 
                onClick={() => {
                  setSubmitting(false);
                  setPipelineStep(0);
                }}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all text-sm cursor-pointer"
              >
                Adjust Candidate Details
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleVendorSubmit} className="space-y-5 animate-in fade-in duration-300">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white tracking-tight">Submit Candidate Profile</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Enter your candidate's technical profile. Ownership locks will establish immediately upon validation.</p>
        </div>

        <div className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Full Name</label>
            <input
              type="text"
              required
              value={vendorForm.candidateName}
              onChange={(e) => setVendorForm({...vendorForm, candidateName: e.target.value})}
              placeholder="Candidate Name"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Email</label>
              <input
                type="email"
                required
                value={vendorForm.email}
                onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                placeholder="candidate@email.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Candidate Phone</label>
              <input
                type="tel"
                required
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                placeholder="+91 98..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Company</label>
              <input
                type="text"
                value={vendorForm.current_company}
                onChange={(e) => setVendorForm({...vendorForm, current_company: e.target.value})}
                placeholder="e.g. Infosys, TCS"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Title</label>
              <input
                type="text"
                value={vendorForm.current_title}
                onChange={(e) => setVendorForm({...vendorForm, current_title: e.target.value})}
                placeholder="e.g. Frontend Associate"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current CTC</label>
              <input
                type="text"
                value={vendorForm.current_ctc}
                onChange={(e) => setVendorForm({...vendorForm, current_ctc: e.target.value})}
                placeholder="e.g. 8 LPA"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Expected CTC</label>
              <input
                type="text"
                value={vendorForm.expected_ctc}
                onChange={(e) => setVendorForm({...vendorForm, expected_ctc: e.target.value})}
                placeholder="e.g. 11 LPA"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Notice Period</label>
              <input
                type="text"
                value={vendorForm.notice_period}
                onChange={(e) => setVendorForm({...vendorForm, notice_period: e.target.value})}
                placeholder="e.g. 15 Days, Immediate"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Current Location</label>
              <input
                type="text"
                value={vendorForm.location}
                onChange={(e) => setVendorForm({...vendorForm, location: e.target.value})}
                placeholder="e.g. Pune, Chennai"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">LinkedIn Profile</label>
            <input
              type="url"
              value={vendorForm.linkedin}
              onChange={(e) => setVendorForm({...vendorForm, linkedin: e.target.value})}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Resume Document Link</label>
            <input
              type="url"
              required
              value={vendorForm.resume_url}
              onChange={(e) => setVendorForm({...vendorForm, resume_url: e.target.value})}
              placeholder="PDF Google Drive URL"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Payroll Status</label>
              <select
                value={vendorForm.payroll}
                onChange={(e) => setVendorForm({...vendorForm, payroll: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
              >
                <option>Vendor Payroll</option>
                <option>Direct Hire</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Availability</label>
              <select
                value={vendorForm.availability}
                onChange={(e) => setVendorForm({...vendorForm, availability: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white font-medium transition-all"
              >
                <option>Immediate</option>
                <option>1 Week</option>
                <option>15 Days</option>
                <option>30 Days</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Covering Notes</label>
            <textarea
              rows={3}
              value={vendorForm.cover_note}
              onChange={(e) => setVendorForm({...vendorForm, cover_note: e.target.value})}
              placeholder="Details about client screenings or highlights..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none rounded-xl text-xs text-white placeholder-slate-600 font-medium transition-all resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
        >
          <span>Submit Candidate representation</span>
          <Lock className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
