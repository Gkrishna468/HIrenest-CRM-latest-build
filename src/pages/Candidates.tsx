import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import {
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  Building2,
  UserCircle,
  Briefcase,
} from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { cn } from "@/lib/utils";
import { safeArray } from "@/utils/safe";
import Candidate360 from "@/components/Candidate360";

export default function Candidates() {
  const { candidates, jobs, vendors, clients } = useData();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("submissions")) setFilterStage("submission");
    else if (path.includes("interviews")) setFilterStage("interview");
    else if (path.includes("offers")) setFilterStage("offer");
    else if (path.includes("placements")) setFilterStage("placed");
    else setFilterStage("all");
  }, [location.pathname]);

  const filteredCandidates = safeArray(candidates).filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Custom filter matching since "placed" can also mean "joined"
    let matchesStage = false;
    if (filterStage === "all") matchesStage = true;
    else if (filterStage === "placed")
      matchesStage = c.stage === "placed" || c.stage === "joined";
    else matchesStage = c.stage === filterStage;

    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "screening":
        return "bg-slate-100 text-slate-700";
      case "submission":
        return "bg-blue-100 text-blue-700";
      case "interview":
        return "bg-indigo-100 text-indigo-700";
      case "offer":
        return "bg-emerald-100 text-emerald-700";
      case "placed":
        return "bg-emerald-500 text-white";
      case "joined":
        return "bg-emerald-600 text-white";
      case "rejected":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Candidates
          </h1>
          <p className="text-slate-500 mt-1">
            Unified view of all talent across CRM, Vendors, and MailOS.
          </p>
        </div>
      </div>

      <div className="skeuo-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors drop-shadow-sm" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="skeuo-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="skeuo-input px-4 py-2"
        >
          <option value="all">All Stages</option>
          <option value="screening">Screening</option>
          <option value="submission">Submission</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="placed">Placed / Joined</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="skeuo-btn flex items-center gap-2 px-4 py-2 font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500 drop-shadow-sm" />
          Filters
        </button>
      </div>

      <div className="skeuo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4">Candidate & Source</th>
                <th className="p-4">Contact</th>
                <th className="p-4">AI Score</th>
                <th className="p-4">Requirement</th>
                <th className="p-4 text-right">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.map((cand) => {
                const associatedJob = jobs.find((j) => j.id === cand.jobId);
                const qualityScore = cand.parsingQuality?.score;
                return (
                  <tr
                    key={cand.id}
                    className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                    onClick={() => setSelectedCandidateId(cand.id)}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {cand.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <SourceBadge
                            source={cand.source || "os"}
                            className="scale-90 origin-left"
                          />
                          <span className="text-xs text-slate-500">
                            {cand.vendorName || (cand.vendorId ? vendors.find(v => v.id === cand.vendorId)?.name : null) || "Direct Applicant"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm text-slate-500">
                        {cand.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> {cand.email}
                          </div>
                        )}
                        {cand.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> {cand.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {qualityScore !== undefined ? (
                         <div className="flex items-center gap-1.5">
                            <div className={cn(
                               "px-2 py-0.5 rounded text-[10px] font-bold border",
                               qualityScore > 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                               qualityScore > 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                               "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                               Parse Q: {qualityScore}
                            </div>
                         </div>
                      ) : (
                         <span className="text-xs italic text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      {associatedJob ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                            {associatedJob.title}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {associatedJob.clientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          General Pool
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          getStageColor(cand.stage),
                        )}
                      >
                        {cand.stage}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedCandidateId && (
        <Candidate360
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
}
