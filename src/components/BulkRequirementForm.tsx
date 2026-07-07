import React from 'react';
import { FileText, RefreshCw, UploadCloud, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BulkRequirementFormProps {
  bulkSummaryReport: any;
  setBulkSummaryReport: React.Dispatch<React.SetStateAction<any>>;
  bulkFiles: File[];
  setBulkFiles: React.Dispatch<React.SetStateAction<File[]>>;
  bulkResults: any[];
  setBulkResults: React.Dispatch<React.SetStateAction<any[]>>;
  bulkUploading: boolean;
  handleBulkUploadSubmit: () => Promise<void>;
}

export const BulkRequirementForm: React.FC<BulkRequirementFormProps> = ({
  bulkSummaryReport,
  setBulkSummaryReport,
  bulkFiles,
  setBulkFiles,
  bulkResults,
  setBulkResults,
  bulkUploading,
  handleBulkUploadSubmit
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
      {bulkSummaryReport ? (
        <div className="space-y-5 animate-in zoom-in-95 duration-300">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white tracking-tight">Batch Sourcing Audit Ledger</h3>
            <p className="text-xs text-slate-400">Cryptographic file integrity and candidate representation locks evaluated successfully.</p>
          </div>

          {/* Summary Metrics Row */}
          <div className="grid grid-cols-4 gap-2 font-mono text-[10px]">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-slate-500 block uppercase mb-1">Total Loaded</span>
              <span className="text-base font-bold text-slate-300">{bulkSummaryReport.total}</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
              <span className="text-emerald-500 block uppercase mb-1">Sourced</span>
              <span className="text-base font-bold text-emerald-400">{bulkSummaryReport.success}</span>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center">
              <span className="text-amber-500 block uppercase mb-1">Duplicate</span>
              <span className="text-base font-bold text-amber-400">{bulkSummaryReport.duplicate}</span>
            </div>
            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">
              <span className="text-rose-500 block uppercase mb-1">Conflict</span>
              <span className="text-base font-bold text-rose-400">{bulkSummaryReport.conflict}</span>
            </div>
          </div>

          {/* Detailed Audit File List */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1 font-mono">
            {bulkSummaryReport.items.map((item: any, idx: number) => {
              const statusColor = item.status === "SUCCESS" 
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400" 
                : item.status === "DUPLICATE" 
                ? "border-amber-500/30 bg-amber-950/20 text-amber-400" 
                : item.status === "CONFLICT"
                ? "border-rose-500/30 bg-rose-950/20 text-rose-400"
                : "border-slate-800 bg-slate-950/40 text-slate-400";
                
              return (
                <div key={idx} className={`p-3 rounded-xl border ${statusColor} text-[11px] space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold truncate">
                      <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{item.fileName}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-900 border border-current">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-slate-500 uppercase mr-1">Candidate:</span> {item.candidateName}
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span><span className="text-slate-500 uppercase">SHA256:</span> {item.sha256}</span>
                    {item.score && <span className="font-bold text-amber-400">Match: {item.score}%</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1 mt-1 leading-relaxed italic font-sans">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Report Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                const reportData = JSON.stringify(bulkSummaryReport, null, 2);
                const blob = new Blob([reportData], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `HireNestOS_Sourcing_Report_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success("Audit Report ledger downloaded!");
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Download Report</span>
            </button>
            
            <button
              onClick={() => {
                setBulkFiles([]);
                setBulkResults([]);
                setBulkSummaryReport(null);
              }}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>New Batch</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-tight">Bulk Candidate Upload</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit multiple candidate resumes at once. Our AI pipeline parses, evaluates, and registers each profile onto the company ledger.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono ml-1">Bulk Sourcing Queue</label>
              <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 text-center bg-slate-950 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  multiple
                  accept=".zip,.pdf,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArr = Array.from(e.target.files);
                      setBulkFiles(prev => [...prev, ...filesArr]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-500 mx-auto group-hover:text-amber-400 transition-colors" />
                  <p className="text-xs text-slate-300 font-bold">Drag and drop files here, or click to browse</p>
                  <p className="text-[10px] text-slate-500 font-mono">Supports multiple PDFs, DOCX, or ZIP files</p>
                </div>
              </div>
            </div>

            {bulkFiles.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Queue ({bulkFiles.length} files)</span>
                  <button
                    onClick={() => {
                      setBulkFiles([]);
                      setBulkResults([]);
                    }}
                    className="text-[10px] text-rose-500 hover:underline font-mono cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {bulkFiles.map((file, idx) => {
                    const result = bulkResults[idx];
                    return (
                      <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-slate-300 truncate text-[11px]">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {result ? (
                            <span className={`text-[10px] uppercase font-bold font-mono ${result.color}`}>
                              {result.status} {result.score !== null ? `(${result.score}%)` : ''}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setBulkFiles(prev => prev.filter((_, i) => i !== idx));
                                setBulkResults(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleBulkUploadSubmit}
              disabled={bulkFiles.length === 0 || bulkUploading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-4 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
            >
              {bulkUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing & Registering...</span>
                </>
              ) : (
                <>
                  <span>Start Parsing & Uploading</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
