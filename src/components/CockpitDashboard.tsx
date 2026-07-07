import React from 'react';
import { 
  Award, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  FileText,
  Building2,
  Lock
} from 'lucide-react';

interface CockpitDashboardProps {
  authenticatedVendor: any;
  complianceStats: {
    performanceScore: number;
    responseRate: number;
    lastRotation: string;
    lastValidation: string;
  };
  poolCandidates: any[];
  loadingPool: boolean;
  selectedCandidates: string[];
  setSelectedCandidates: React.Dispatch<React.SetStateAction<string[]>>;
  validatingCompliance: boolean;
  triggeringRotation: boolean;
  rotationMatches: any[];
  setRotationMatches: React.Dispatch<React.SetStateAction<any[]>>;
  handleBulkValidate: () => Promise<void>;
  handleTriggerRotation: () => Promise<void>;
  fetchPoolData: () => Promise<void>;
}

export const CockpitDashboard: React.FC<CockpitDashboardProps> = ({
  authenticatedVendor,
  complianceStats,
  poolCandidates,
  loadingPool,
  selectedCandidates,
  setSelectedCandidates,
  validatingCompliance,
  triggeringRotation,
  rotationMatches,
  setRotationMatches,
  handleBulkValidate,
  handleTriggerRotation,
  fetchPoolData
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* COMPLIANCE OVERVIEW METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Award className="w-24 h-24 text-amber-500" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Performance Score</p>
            <p className="text-4xl font-black text-white font-mono">{complianceStats.performanceScore}/100</p>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all" 
                style={{ width: `${complianceStats.performanceScore}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-500 font-mono">✓ High Tier Sourcing Status</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Clock className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Response Rate SLA</p>
            <p className="text-4xl font-black text-white font-mono">{complianceStats.responseRate}%</p>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all" 
                style={{ width: `${complianceStats.responseRate}%` }}
              />
            </div>
            <p className="text-[10px] text-indigo-400 font-mono">✓ Exceeds SLA minimums (80%)</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Last Rotation Run</p>
            <p className="text-2xl font-black text-slate-300 font-mono mt-2">{complianceStats.lastRotation}</p>
            <p className="text-[10px] text-slate-500 text-xs">Auto-routes inactive profiles to new jobs.</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Last Freshness Check</p>
            <p className="text-2xl font-black text-slate-300 font-mono mt-2">{complianceStats.lastValidation}</p>
            <p className="text-[10px] text-slate-500 text-xs">Maintains real-time candidate availability.</p>
          </div>
        </div>
      </div>

      {/* ACTION TRIGGERS BAR */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xl">
        <div>
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-500" /> Compliance Automation Core
          </h3>
          <p className="text-xs text-slate-400">Validate candidate availability or run AI matchmaking rotations to auto-assign active bench members.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={handleBulkValidate}
            disabled={selectedCandidates.length === 0 || validatingCompliance}
            className="flex-1 md:flex-initial px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {validatingCompliance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Validate Freshness ({selectedCandidates.length})</span>
          </button>

          <button
            onClick={handleTriggerRotation}
            disabled={triggeringRotation}
            className="flex-1 md:flex-initial px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {triggeringRotation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            <span>Trigger AI Rotation</span>
          </button>
        </div>
      </div>

      {/* AI ROTATION MATCHES DISPLAY PANEL */}
      {rotationMatches.length > 0 && (
        <div className="bg-slate-900/80 border border-amber-500/30 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-500 animate-pulse" /> AI Sourcing Match Recommendations
            </h4>
            <button 
              onClick={() => setRotationMatches([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono hover:underline"
            >
              Clear Results
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rotationMatches.map((match, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-3 hover:border-amber-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-white text-xs">{match.candidateName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{match.currentTitle}</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                    {match.matchScore}% Match
                  </span>
                </div>
                <div className="border-t border-slate-800/80 pt-2 text-[10px] text-slate-300 space-y-1 font-sans">
                  <p><span className="text-slate-500 font-mono">Target Role:</span> <span className="font-bold">{match.requirementTitle}</span></p>
                  <p><span className="text-slate-500 font-mono">Client:</span> {match.clientName}</p>
                  <p className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-submission pending Founder approval
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CURRENT TALENT POOL TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Active Sourcing Talent Pool ({poolCandidates.length} profiles)</h3>
            <p className="text-xs text-slate-400">All registered bench candidates, available for automated rotation alignments.</p>
          </div>
          <button 
            onClick={fetchPoolData}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Reload Talent Pool"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingPool ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
            Syncing Talent Pool Ledger...
          </div>
        ) : poolCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">Your Talent Pool is currently empty.</p>
            <p className="text-xs text-slate-500">Upload candidates using the "Talent Pool Bulk Upload" tab to register them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedCandidates.length === poolCandidates.length && poolCandidates.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandidates(poolCandidates.map(c => c.id));
                        } else {
                          setSelectedCandidates([]);
                        }
                      }}
                      className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 bg-slate-950 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Standardized Title</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Freshness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {poolCandidates.map((cand) => {
                  const isSelected = selectedCandidates.includes(cand.id);
                  return (
                    <tr key={cand.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates(prev => [...prev, cand.id]);
                            } else {
                              setSelectedCandidates(prev => prev.filter(id => id !== cand.id));
                            }
                          }}
                          className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 bg-slate-950 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-white font-bold block">{cand.candidateName}</span>
                        <span className="text-[10px] text-slate-500 block">{cand.email || 'No email registered'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {cand.standardizedTitle || 'Consultant'}
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px] truncate">
                        <div className="flex gap-1 overflow-hidden truncate">
                          {Array.isArray(cand.skills) 
                            ? cand.skills.slice(0, 3).map((s: string, idx: number) => (
                                <span key={idx} className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-amber-400">
                                  {s}
                                </span>
                              ))
                            : (cand.skills ? cand.skills.split(',').slice(0, 3).map((s: string, idx: number) => (
                                <span key={idx} className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-amber-400">
                                  {s.trim()}
                                </span>
                              )) : <span className="text-slate-600">None</span>)
                          }
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {cand.availability || 'Immediate'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black ${
                          cand.freshnessStatus === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {cand.freshnessStatus === 'active' ? 'VERIFIED ACTIVE' : 'STALE CHECK REQUIRED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
