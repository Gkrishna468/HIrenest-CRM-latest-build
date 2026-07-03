/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Briefcase as BriefcaseIcon,
  BadgeCheck,
  Building2,
  Clock,
  Zap,
  ArrowRight,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  DollarSign,
  Globe,
  Copy,
  Share2,
  MessageCircle,
  Linkedin,
  Users,
  Activity,
  TrendingUp,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { safeArray, safeString, safeDate } from "@/utils/safe";
import { broadcastJob } from "@/services/marketplaceService";
import { SourceBadge } from "@/components/SourceBadge";

export default function Jobs() {
  const { jobs, loading, approveJobWithBudget, addJob, updateJob, candidates, deals } =
    useData();
  const { user, apiFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isViewDetailOpen, setIsViewDetailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [approvedBudget, setApprovedBudget] = useState("");
  
  // Custom Broadcast Links & Templates view state
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTargetJob, setBroadcastTargetJob] = useState<any>(null);

  const [newJob, setNewJob] = useState({
    title: "",
    clientName: "",
    clientId: "",
    location: "",
    type: "Full-time",
    openings: 1,
    description: "",
    skills: "",
    experienceRequired: "3-5 Years"
  });

  // Pricing Engine Interactive States
  const [requirementType, setRequirementType] = useState("FTE"); // FTE, C2H, C2C
  const [workMode, setWorkMode] = useState("Remote"); // Remote, Hybrid, Onsite
  const [budgetUnit, setBudgetUnit] = useState("LPA"); // LPA, LPM, Hourly, Daily
  const [billingType, setBillingType] = useState("Direct Payroll"); // Direct Payroll, Vendor Payroll, Client Payroll

  // FTE inputs
  const [fteBudgetLpa, setFteBudgetLpa] = useState("12");
  const [ftePlacementPercent, setFtePlacementPercent] = useState("10");

  // C2H inputs
  const [c2hSalaryLpa, setC2hSalaryLpa] = useState("10");
  const [c2hDurationMonths, setC2hDurationMonths] = useState("12");
  const [c2hMonthlyMarginPercent, setC2hMonthlyMarginPercent] = useState("15");

  // C2C inputs
  const [c2cClientBillingLpm, setC2cClientBillingLpm] = useState("170000");
  const [c2cVendorCostLpm, setC2cVendorCostLpm] = useState("150000");

  // Interactive calculations helpers
  const getFteCalculations = () => {
    const budget = parseFloat(fteBudgetLpa) || 0;
    const percent = parseFloat(ftePlacementPercent) || 0;
    const placementFee = budget * (percent / 100);
    const vendorShare = placementFee * 0.3; // 30% standard vendor share
    const expectedRevenue = placementFee - vendorShare;
    const gst = expectedRevenue * 0.18; // 18% GST
    const totalExpectedRevenue = expectedRevenue + gst;
    return {
      placementFee: placementFee.toFixed(2),
      vendorShare: vendorShare.toFixed(2),
      expectedRevenue: expectedRevenue.toFixed(2),
      gst: gst.toFixed(2),
      totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
    };
  };

  const getC2hCalculations = () => {
    const salary = parseFloat(c2hSalaryLpa) || 0;
    const duration = parseInt(c2hDurationMonths) || 12;
    const marginPercent = parseFloat(c2hMonthlyMarginPercent) || 0;
    const monthlySalary = salary / 12;
    const vendorMonthlyPayment = monthlySalary * (1 - marginPercent / 100);
    const monthlyMargin = monthlySalary * (marginPercent / 100);
    const annualRevenue = monthlyMargin * 12;
    const projectedRevenue = monthlyMargin * duration;
    const gst = projectedRevenue * 0.18;
    return {
      vendorMonthlyPayment: vendorMonthlyPayment.toFixed(2),
      monthlyMargin: monthlyMargin.toFixed(2),
      annualRevenue: annualRevenue.toFixed(2),
      projectedRevenue: projectedRevenue.toFixed(2),
      gst: gst.toFixed(2),
    };
  };

  const getC2cCalculations = () => {
    const clientBilling = parseFloat(c2cClientBillingLpm) || 0;
    const vendorCost = parseFloat(c2cVendorCostLpm) || 0;
    const margin = clientBilling - vendorCost;
    const marginPercent = clientBilling > 0 ? (margin / clientBilling) * 100 : 0;
    const monthlyRevenue = margin;
    const annualRevenue = margin * 12;
    const gst = margin * 0.18;
    return {
      margin: margin.toFixed(2),
      marginPercent: marginPercent.toFixed(1),
      gst: gst.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      annualRevenue: annualRevenue.toFixed(2),
    };
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let computedBudget = "";
      let calculatedMetadata: any = {};

      if (requirementType === "FTE") {
        const calcs = getFteCalculations();
        computedBudget = `₹${fteBudgetLpa}L CTC (FTE)`;
        calculatedMetadata = {
          requirementType,
          workMode,
          budgetUnit,
          billingType,
          fteBudgetLpa,
          ftePlacementPercent,
          ...calcs
        };
      } else if (requirementType === "C2H") {
        const calcs = getC2hCalculations();
        computedBudget = `₹${c2hSalaryLpa}L CTC (C2H)`;
        calculatedMetadata = {
          requirementType,
          workMode,
          budgetUnit,
          billingType,
          c2hSalaryLpa,
          c2hDurationMonths,
          c2hMonthlyMarginPercent,
          ...calcs
        };
      } else {
        const calcs = getC2cCalculations();
        computedBudget = `₹${parseFloat(c2cClientBillingLpm).toLocaleString()} LPM (C2C)`;
        calculatedMetadata = {
          requirementType,
          workMode,
          budgetUnit,
          billingType,
          c2cClientBillingLpm,
          c2cVendorCostLpm,
          ...calcs
        };
      }

      const initialStatus = "draft"; // Starts as Draft according to Governance Rules
      const initialApprovalStatus = "draft";

      await addJob({
        ...newJob,
        skills: newJob.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        budget: computedBudget,
        status: initialStatus as any,
        approvalStatus: initialApprovalStatus,
        experienceRequired: newJob.experienceRequired || "3-5 Years",
        pricing_data: calculatedMetadata, // Save metadata for BDM/Finance reviews
      } as any);

      toast.success("Requirement requisition saved as DRAFT. Submit for approval next.");
      setIsModalOpen(false);
      setNewJob({
        title: "",
        clientName: "",
        clientId: "",
        location: "",
        type: "Full-time",
        openings: 1,
        description: "",
        skills: "",
        experienceRequired: "3-5 Years"
      });
    } catch (err) {
      toast.error("Failed to create requirement");
    }
  };

  const filteredJobs = safeArray(jobs).filter(
    (job) =>
      safeString(job.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(job.clientName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleApprove = async () => {
    if (!selectedJob || !approvedBudget) {
      toast.error("Please enter a budget");
      return;
    }

    try {
      if (typeof approveJobWithBudget === "function") {
        await approveJobWithBudget(selectedJob.id, approvedBudget);
        toast.success(`Job approved with budget: ${approvedBudget}`);
        setIsApproveOpen(false);
        setSelectedJob(null);
        setApprovedBudget("");
      }
    } catch (err) {
      toast.error("Approval failed");
    }
  };

  const getStatusColor = (status: string, approvalStatus?: string) => {
    if (approvalStatus === "draft" || status === "draft") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }
    if (approvalStatus === "pending" || status === "pending") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    if (status === "open") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (status === "filled") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (status === "closed") {
      return "bg-rose-100 text-rose-700 border-rose-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Requirements
          </h1>
          <p className="text-slate-500 mt-1">
            Manage active vacancies, client approvals, and hiring progress.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 skeuo-btn-primary px-4 py-2.5"
        >
          <Plus className="w-5 h-5 drop-shadow-sm" />
          Create Requirement
        </button>
      </div>

      <div className="skeuo-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors drop-shadow-sm" />
          <input
            type="text"
            placeholder="Search by role or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="skeuo-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 skeuo-btn">
          <Filter className="w-4 h-4 text-slate-500 drop-shadow-sm" />
          Filters
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white h-48 rounded-2xl border border-slate-100 shadow-sm"
            />
          ))}
        </div>
      ) : filteredJobs?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="skeuo-card hover:-translate-y-1 group overflow-hidden flex flex-col transition-transform"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                       "px-2.5 py-1 text-xs font-bold rounded-full border",
                       getStatusColor(job.status, job.approvalStatus),
                    )}
                  >
                    {job.approvalStatus === "draft" ? "DRAFT" : (job.approvalStatus === "pending" ? "PENDING REVIEW" : job.status.toUpperCase())}
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2">
                      {job.title}
                      {job.approvalStatus === "approved" && (
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                      )}
                    </h3>
                    <SourceBadge source={job.source || "os"} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium text-slate-700">
                      {job.clientName || "Direct Hire"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {safeArray(job.skills)
                    .slice(0, 3)
                    .map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider"
                      >
                        {skill}
                      </span>
                    ))}
                  {safeArray(job.skills)?.length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 text-slate-400 text-[10px] font-bold rounded">
                      +{safeArray(job.skills)?.length - 3} MORE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Openings
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      <span className="text-sm font-bold text-slate-900">
                        {job.openings} Positions
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Budget
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {job.budget || "Pending Approval"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-50"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {
                      safeArray(candidates).filter((c) => c.jobId === job.id)
                        .length
                    }{" "}
                    Pipeline
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setIsViewDetailOpen(true);
                    }}
                    className="flex text-xs items-center gap-1.5 px-3 py-1.5 hover:bg-white rounded-lg text-slate-600 font-bold hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    360 View
                  </button>
                  {(!job.approvalStatus || job.approvalStatus === "draft") ? (
                    <button
                      onClick={async () => {
                        try {
                          await updateJob(job.id, { approvalStatus: "pending", status: "pending" as any });
                          toast.success("Submitted to BDM Review & Finance Approval!");
                        } catch (err) {
                          toast.error("Failed to submit review request");
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Submit Review
                    </button>
                  ) : job.approvalStatus === "pending" ? (
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setApprovedBudget(job.budget || "");
                        setIsApproveOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setBroadcastTargetJob(job);
                        setIsBroadcastOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" /> Broadcast
                    </button>
                  )}
                  <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-20 text-center rounded-2xl border border-slate-200 border-dashed">
          <BriefcaseIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Jobs Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1">
            Start the recruitment flow by creating your first job requisition or
            client position.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            Create Job
          </button>
        </div>
      )}

      {/* Create Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Post New Job Requisition</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Fill in the details to start sourcing candidates.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleCreateJob}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) =>
                    setNewJob({ ...newJob, title: e.target.value })
                  }
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Client / Company
                </label>
                <input
                  type="text"
                  required
                  value={newJob.clientName}
                  onChange={(e) =>
                    setNewJob({ ...newJob, clientName: e.target.value })
                  }
                  placeholder="e.g. TechCorp Solutions"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={newJob.location}
                  onChange={(e) =>
                    setNewJob({ ...newJob, location: e.target.value })
                  }
                  placeholder="e.g. Remote, Mumbai, Bangalore"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Requirement Type (Commercial Route)
                </label>
                <select
                  value={requirementType}
                  onChange={(e) => setRequirementType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                >
                  <option value="FTE">Full-Time Employee (FTE)</option>
                  <option value="C2H">Contract-to-Hire (C2H)</option>
                  <option value="C2C">Contract-to-Contract (C2C)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Work Mode
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>Onsite</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Budget Unit
                </label>
                <select
                  value={budgetUnit}
                  onChange={(e) => setBudgetUnit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                >
                  <option>LPA</option>
                  <option>LPM</option>
                  <option>Hourly</option>
                  <option>Daily</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Billing Type
                </label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                >
                  <option>Direct Payroll</option>
                  <option>Vendor Payroll</option>
                  <option>Client Payroll</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Openings Count
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newJob.openings}
                  onChange={(e) =>
                    setNewJob({ ...newJob, openings: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* DYNAMIC PRICING ENGINE CALCULATOR INTERACTIVE PANEL */}
              <div className="md:col-span-2 p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">
                    Interactive Pricing & Margin Engine ({requirementType})
                  </h3>
                </div>

                {requirementType === "FTE" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        FTE Budget (LPA)
                      </label>
                      <input
                        type="number"
                        value={fteBudgetLpa}
                        onChange={(e) => setFteBudgetLpa(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Placement Fee Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={ftePlacementPercent}
                        onChange={(e) => setFtePlacementPercent(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Placement Fee</span>
                        <span className="text-sm font-black text-white">₹{getFteCalculations().placementFee}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Vendor Share (30%)</span>
                        <span className="text-sm font-black text-slate-300">₹{getFteCalculations().vendorShare}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Expected Revenue</span>
                        <span className="text-sm font-black text-emerald-400">₹{getFteCalculations().expectedRevenue}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST (18%)</span>
                        <span className="text-sm font-black text-slate-300">₹{getFteCalculations().gst}L</span>
                      </div>
                    </div>
                  </div>
                )}

                {requirementType === "C2H" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Salary Equivalent (LPA)
                      </label>
                      <input
                        type="number"
                        value={c2hSalaryLpa}
                        onChange={(e) => setC2hSalaryLpa(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Duration (Months)
                      </label>
                      <select
                        value={c2hDurationMonths}
                        onChange={(e) => setC2hDurationMonths(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      >
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="18">18 Months</option>
                        <option value="24">24 Months</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Monthly Margin (%)
                      </label>
                      <input
                        type="number"
                        value={c2hMonthlyMarginPercent}
                        onChange={(e) => setC2hMonthlyMarginPercent(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Payment</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getC2hCalculations().vendorMonthlyPayment).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Margin</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getC2hCalculations().monthlyMargin).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Annual Margin</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getC2hCalculations().annualRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Projected Revenue</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getC2hCalculations().projectedRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST on Margin</span>
                        <span className="text-xs font-black text-slate-300">₹{parseFloat(getC2hCalculations().gst).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {requirementType === "C2C" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Client Billing (LPM)
                      </label>
                      <input
                        type="number"
                        value={c2cClientBillingLpm}
                        onChange={(e) => setC2cClientBillingLpm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Expected Vendor Cost (LPM)
                      </label>
                      <input
                        type="number"
                        value={c2cVendorCostLpm}
                        onChange={(e) => setC2cVendorCostLpm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Margin</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getC2cCalculations().margin).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Margin %</span>
                        <span className="text-xs font-black text-emerald-300">{getC2cCalculations().marginPercent}%</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Revenue</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getC2cCalculations().monthlyRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Annual Revenue</span>
                        <span className="text-xs font-black text-emerald-400 font-bold">₹{parseFloat(getC2cCalculations().annualRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST (18%)</span>
                        <span className="text-xs font-black text-slate-300">₹{parseFloat(getC2cCalculations().gst).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={newJob.skills}
                  onChange={(e) =>
                    setNewJob({ ...newJob, skills: e.target.value })
                  }
                  placeholder="React, TypeScript, Node.js, AWS"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Job Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob({ ...newJob, description: e.target.value })
                  }
                  placeholder="Paste details about the role, responsibilities, and requirements..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Save Draft Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {isApproveOpen && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Approve Job Requisition</h2>
                <p className="text-slate-400 text-xs mt-1">
                  BDM Commercial Audit & Security Verification
                </p>
              </div>
              <button
                onClick={() => setIsApproveOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-4">
                <DollarSign className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-amber-950 mb-1">
                    Enterprise Margin Intelligence Audit
                  </h4>
                  <p className="text-amber-800/80 text-xs leading-relaxed">
                    Verify Client Budget, Margins, and estimated GST before official authorization. Approved requisitions transition to <b>OPEN</b>.
                  </p>
                </div>
              </div>

              {/* Real-time Commercial Overview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Saved Requisition Commercials
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Job Title</span>
                    <span className="text-sm font-bold text-slate-800">{selectedJob.title}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Client Name</span>
                    <span className="text-sm font-bold text-slate-800">{selectedJob.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Commercial Route</span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedJob.pricing_data?.requirementType || "FTE (Standard)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Initial Budget State</span>
                    <span className="text-sm font-bold text-indigo-600">{selectedJob.budget}</span>
                  </div>
                </div>

                {/* Pricing details if available */}
                {selectedJob.pricing_data && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Work Mode & Billing:</span>
                      <span className="font-bold text-slate-700">
                        {selectedJob.pricing_data.workMode} | {selectedJob.pricing_data.billingType}
                      </span>
                    </div>
                    {selectedJob.pricing_data.requirementType === "FTE" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Placement Fee ({selectedJob.pricing_data.ftePlacementPercent}%):</span>
                          <span className="font-bold text-slate-800">₹{selectedJob.pricing_data.placementFee}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Vendor Share & Service Split:</span>
                          <span className="font-bold text-slate-700">₹{selectedJob.pricing_data.vendorShare}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-bold">Net Project Revenue:</span>
                          <span className="font-black text-emerald-600">₹{selectedJob.pricing_data.expectedRevenue}L</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>GST (18% code enforced):</span>
                          <span>₹{selectedJob.pricing_data.gst}L</span>
                        </div>
                      </>
                    )}
                    {selectedJob.pricing_data.requirementType === "C2H" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Monthly Margin ({selectedJob.pricing_data.c2hMonthlyMarginPercent}%):</span>
                          <span className="font-bold text-slate-800">₹{parseFloat(selectedJob.pricing_data.monthlyMargin).toLocaleString()}/m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Duration Period:</span>
                          <span className="font-bold text-slate-700">{selectedJob.pricing_data.c2hDurationMonths} Months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-bold">Projected Net Revenue:</span>
                          <span className="font-black text-emerald-600">₹{parseFloat(selectedJob.pricing_data.projectedRevenue).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>GST (18% code enforced):</span>
                          <span>₹{parseFloat(selectedJob.pricing_data.gst).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {selectedJob.pricing_data.requirementType === "C2C" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Client Billing Rate:</span>
                          <span className="font-bold text-slate-800">₹{parseFloat(selectedJob.pricing_data.c2cClientBillingLpm).toLocaleString()}/m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Vendor Cost Base:</span>
                          <span className="font-bold text-slate-700">₹{parseFloat(selectedJob.pricing_data.c2cVendorCostLpm).toLocaleString()}/m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 font-bold">Expected Margin ({selectedJob.pricing_data.marginPercent}%):</span>
                          <span className="font-black text-emerald-600">₹{parseFloat(selectedJob.pricing_data.margin).toLocaleString()}/m</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>GST (18% code enforced):</span>
                          <span>₹{parseFloat(selectedJob.pricing_data.gst).toLocaleString()}/m</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Budget / Salary Statement for Sourcing
                  </label>
                  <input
                    type="text"
                    value={approvedBudget}
                    onChange={(e) => setApprovedBudget(e.target.value)}
                    placeholder="e.g. 12-15L CTC"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsApproveOpen(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Update job both on Supabase and Firebase
                      await updateJob(selectedJob.id, {
                        approvalStatus: "approved",
                        status: "open" as any,
                        budget: approvedBudget,
                      });
                      toast.success(`Requirement authorized & set to active with budget: ${approvedBudget}`);
                      setIsApproveOpen(false);
                      setSelectedJob(null);
                      setApprovedBudget("");
                    } catch (err) {
                      toast.error("Authorization failed");
                    }
                  }}
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-600/20 text-sm flex items-center justify-center gap-2"
                >
                  Confirm Authorization
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Intelligence & Sourcing Center Modal */}
      {isBroadcastOpen && broadcastTargetJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  One-Click Broadcast & Sourcing Center
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Requisition: {broadcastTargetJob.title} ({broadcastTargetJob.clientName})
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBroadcastOpen(false);
                  setBroadcastTargetJob(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Broadcast Engine Ecosystem Indicators */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800">Careers Page</span>
                  <span className="text-xs font-bold text-emerald-600 mt-0.5">● ONLINE & INDEXED</span>
                </div>
                <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-sky-800">WhatsApp Dispatch</span>
                  <span className="text-xs font-bold text-sky-600 mt-0.5">● BROADCAST READY</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-800">Vendor Submission</span>
                  <span className="text-xs font-bold text-indigo-600 mt-0.5">● SECURED GATEWAY</span>
                </div>
              </div>

              {/* Share links */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Source-Tracked Sourcing Links
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                      Public Candidate Application Link
                    </span>
                    <p className="text-xs text-slate-600 break-all font-mono">
                      {window.location.origin}/#/apply/{broadcastTargetJob.id}?src=direct
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=direct`);
                        toast.success("Candidate Apply Link copied!");
                      }}
                      className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Candidate Link
                    </button>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                      Secure Vendor Submission Link
                    </span>
                    <p className="text-xs text-slate-600 break-all font-mono">
                      {window.location.origin}/#/apply/{broadcastTargetJob.id}?type=vendor
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/#/apply/${broadcastTargetJob.id}?type=vendor`);
                        toast.success("Vendor Submission Link copied!");
                      }}
                      className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Vendor Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Broadcast Integrations */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Interactive Network Broadcast Channels
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp Hub */}
                  <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-widest">WhatsApp Broadcast Hub</h4>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Launches pre-formatted broadcast layout containing tracked application URLs and pricing routes.
                    </p>
                    <button
                      onClick={() => {
                        const sList = Array.isArray(broadcastTargetJob.skills) ? broadcastTargetJob.skills : (broadcastTargetJob.skills ? broadcastTargetJob.skills.split(',') : []);
                        const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                        const text = encodeURIComponent(`🚀 Immediate Hiring | ${broadcastTargetJob.title}
📍 Location: ${broadcastTargetJob.location || 'Remote'}
💼 Employment: ${broadcastTargetJob.type || 'Full-time'}
💰 Salary: ${broadcastTargetJob.budget || '₹12–15 LPA'}
👥 Openings: ${broadcastTargetJob.openings || 1}

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${broadcastTargetJob.experienceRequired || '3-5 Years'}

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description & Apply:
${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=wa

📤 Vendors Submit Candidate:
${window.location.origin}/#/apply/${broadcastTargetJob.id}?type=vendor`);
                        window.open(`https://wa.me/?text=${text}`, "_blank");
                        toast.success("WhatsApp template prepared & dispatched!");
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/15"
                    >
                      <MessageCircle className="w-4 h-4" /> Launch WhatsApp
                    </button>
                  </div>

                  {/* LinkedIn Hub */}
                  <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-5 h-5 text-blue-600" />
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-widest">LinkedIn Social Sharing</h4>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Copies a beautiful social engagement layout and triggers LinkedIn's official content dialog.
                    </p>
                    <button
                      onClick={() => {
                        const sList = Array.isArray(broadcastTargetJob.skills) ? broadcastTargetJob.skills : (broadcastTargetJob.skills ? broadcastTargetJob.skills.split(',') : []);
                        const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                        const text = `🚀 Immediate Hiring | ${broadcastTargetJob.title}
📍 Location: ${broadcastTargetJob.location || 'Remote'}
💼 Employment: ${broadcastTargetJob.type || 'Full-time'}
💰 Salary: ${broadcastTargetJob.budget || '₹12–15 LPA'}
👥 Openings: ${broadcastTargetJob.openings || 1}

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${broadcastTargetJob.experienceRequired || '3-5 Years'}

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description & Apply:
${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=li

📤 Vendors Submit Candidate:
${window.location.origin}/#/apply/${broadcastTargetJob.id}?type=vendor

Powered by HireNestOS AI`;
                        navigator.clipboard.writeText(text);
                        const url = encodeURIComponent(`${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=li`);
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
                        toast.success("LinkedIn template copied to clipboard & sharing dialog launched!");
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/15"
                    >
                      <Linkedin className="w-4 h-4" /> Launch LinkedIn
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setIsBroadcastOpen(false);
                  setBroadcastTargetJob(null);
                }}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
              >
                Close Sourcing Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Job 360 Detail Modal */}
      {isViewDetailOpen && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="p-6 md:p-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BriefcaseIcon className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedJob.title}
                    </h2>
                    <SourceBadge source={selectedJob.source || "os"} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> {selectedJob.clientName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {selectedJob.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                      {selectedJob.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewDetailOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* ECOSYSTEM METRICS */}
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Requirement 360 Dashboard
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: "Broadcasts Sent", val: selectedJob.broadcastsSent || '0', color: "text-slate-600" },
                    { label: "Vendor Responses", val: selectedJob.vendorResponses || '0', color: "text-slate-600" },
                    { label: "Profiles Rcvd", val: safeArray(candidates).filter((c) => c.jobId === selectedJob.id).length, color: "text-blue-600" },
                    { label: "Submissions", val: safeArray(candidates).filter((c) => c.jobId === selectedJob.id && (c.stage === 'submission' || c.stage === 'screening')).length, color: "text-indigo-600" },
                    { label: "Interviews", val: safeArray(candidates).filter((c) => c.jobId === selectedJob.id && c.stage === "interview").length, color: "text-purple-600" },
                    { label: "Offers", val: safeArray(candidates).filter((c) => c.jobId === selectedJob.id && c.stage === "offer").length, color: "text-amber-600" },
                    { label: "Placements", val: safeArray(candidates).filter((c) => c.jobId === selectedJob.id && (c.stage === "placed" || c.stage === "joined")).length, color: "text-emerald-600" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {stat.label}
                      </p>
                      <p className={cn("text-2xl font-black", stat.color)}>
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* WHATSAPP VENDOR HUB */}
              <div className="mb-8 bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-emerald-900 tracking-tight">WhatsApp Vendor Hub</h3>
                      <p className="text-emerald-700/80 text-sm font-medium">Broadcast to HireNest Vendor Network instantly.</p>
                    </div>
                  </div>
                  <div className="flex mt-8 gap-4 border-t border-emerald-200/50 pt-6">
                    <button 
                      onClick={async () => {
                        try {
                          await apiFetch('/api/agents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'vendor_broadcast', requirementId: selectedJob.id })
                          });
                          toast.success('Broadcast agent dispatched!');
                        } catch (err) {
                          toast.error('Failed to trigger broadcast.');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-emerald-100" /> Trigger AI Broadcast Agent
                    </button>
                    <button 
                      onClick={() => {
                        const sList = Array.isArray(selectedJob.skills) ? selectedJob.skills : (selectedJob.skills ? selectedJob.skills.split(',') : []);
                        const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                        const text = `🚀 Immediate Hiring | ${selectedJob.title}
📍 Location: ${selectedJob.location || 'Remote'}
💼 Employment: ${selectedJob.type || 'Full-time'}
💰 Salary: ${selectedJob.budget || '₹12–15 LPA'}
👥 Openings: 5

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${selectedJob.experienceRequired || '3-5 Years'}

Responsibilities:
• Design modular interfaces and maintain clean technical standards
• Collaborate closely with client business coordinators

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description:
${window.location.origin}/#/apply/${selectedJob.id}?src=li

📤 Vendors:
Submit your candidate here:
${window.location.origin}/#/apply/${selectedJob.id}?type=vendor

Powered by HireNestOS AI`;
                        navigator.clipboard.writeText(text);
                        toast.success('Generated LinkedIn formatted post copied to clipboard!');
                      }}
                      className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-2.5 px-5 rounded-xl border border-emerald-200 flex items-center gap-2 transition-colors"
                    >
                      <Globe className="w-4 h-4" /> Generate LinkedIn Post
                    </button>
                    <button 
                      onClick={() => {
                        const sList = Array.isArray(selectedJob.skills) ? selectedJob.skills : (selectedJob.skills ? selectedJob.skills.split(',') : []);
                        const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                        const text = `🚀 Immediate Hiring | ${selectedJob.title}
📍 Location: ${selectedJob.location || 'Remote'}
💼 Employment: ${selectedJob.type || 'Full-time'}
💰 Salary: ${selectedJob.budget || '₹12–15 LPA'}
👥 Openings: 5

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${selectedJob.experienceRequired || '3-5 Years'}

Responsibilities:
• Design modular interfaces and maintain clean technical standards
• Collaborate closely with client business coordinators

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description:
${window.location.origin}/#/apply/${selectedJob.id}?src=wa

📤 Vendors:
Submit your candidate here:
${window.location.origin}/#/apply/${selectedJob.id}?type=vendor

Powered by HireNestOS AI`;
                        navigator.clipboard.writeText(text);
                        toast.success('Formatted vendor broadcast text copied!');
                      }}
                      className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-2.5 px-5 rounded-xl border border-emerald-200 flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Copy Text Form
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-auto flex flex-col items-center bg-white p-6 rounded-2xl border border-emerald-100 shadow-lg relative overflow-hidden group hover:border-emerald-300 transition-colors">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="w-36 h-36 bg-white border-2 border-dashed border-emerald-300 rounded-xl flex items-center justify-center mb-4 relative z-10 transition-transform group-hover:scale-105">
                    <div className="absolute inset-2 bg-slate-50 flex items-center justify-center rounded-lg">
                      <MessageSquare className="w-10 h-10 text-emerald-200" />
                    </div>
                  </div>
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-widest text-center">Network Invite Link</p>
                  <p className="text-[10px] text-emerald-600/70 text-center mt-1">Vendor Scanning Allowed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Active Pipeline Board / Candidates */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" /> Active
                        Candidates
                      </h3>
                      <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                        View All
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {safeArray(candidates)
                          .filter((c) => c.jobId === selectedJob.id)
                          .slice(0, 5).length === 0 ? (
                          <div className="p-8 text-center text-slate-500 font-medium text-sm">
                            No candidates sourced yet.
                          </div>
                        ) : (
                          safeArray(candidates)
                            .filter((c) => c.jobId === selectedJob.id)
                            .slice(0, 5)
                            .map((cand: any, idx) => (
                              <div
                                key={idx}
                                className="p-4 hover:bg-slate-50 flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {cand.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <SourceBadge
                                      source={cand.source || "os"}
                                      className="scale-90 origin-left"
                                    />
                                    <span className="text-xs text-slate-500">
                                      {cand.vendorName || "Direct"}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                  {cand.stage.toUpperCase()}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Requirements / JD */}
                  <section>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                      Requirement Details
                    </h3>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedJob.description || "No description provided."}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  {/* Commercials - ONLY FOR ADMIN */}
                  {user?.role === "admin" ? (
                    <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <DollarSign className="w-32 h-32" />
                      </div>
                      <div className="relative z-10 space-y-4">
                        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> Margin Intelligence
                        </h3>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Client Budget
                          </p>
                          <p className="text-lg font-black">
                            {selectedJob.budget || "₹180,000"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Expected Vendor Cost
                          </p>
                          <p className="text-lg font-black text-slate-300">
                            ₹145,000
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                              Margin
                            </p>
                            <p className="text-2xl font-black text-emerald-500">
                              ₹35,000
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                              Margin %
                            </p>
                            <p className="text-2xl font-black text-emerald-400">
                              19.4%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 text-center">
                      <LockIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Commercials Restricted
                      </p>
                    </div>
                  )}

                  {/* Sharing Tools / Vendor Broadcast Engine */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Vendor Broadcast Engine
                    </h3>
                    <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600 mb-2 border border-slate-200 max-h-48 overflow-y-auto">
                      🚀 Immediate Hiring | {selectedJob.title}
                      <br />
                      📍 Location: {selectedJob.location}
                      <br />
                      💼 Employment: {selectedJob.type}
                      <br />
                      💰 Salary: {selectedJob.budget || '₹12–15 LPA'}
                      <br />
                      Experience: {selectedJob.experienceRequired || '3-5 Years'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const sList = Array.isArray(selectedJob.skills) ? selectedJob.skills : (selectedJob.skills ? selectedJob.skills.split(',') : []);
                          const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                          const text = encodeURIComponent(`🚀 Immediate Hiring | ${selectedJob.title}
📍 Location: ${selectedJob.location || 'Remote'}
💼 Employment: ${selectedJob.type || 'Full-time'}
💰 Salary: ${selectedJob.budget || '₹12–15 LPA'}
👥 Openings: 5

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${selectedJob.experienceRequired || '3-5 Years'}

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description:
${window.location.origin}/#/apply/${selectedJob.id}?src=wa

📤 Vendors:
Submit your candidate here:
${window.location.origin}/#/apply/${selectedJob.id}?type=vendor`);
                          window.open(`https://wa.me/?text=${text}`, "_blank");
                        }}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm flex justify-center items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button
                        onClick={() => {
                          const url = encodeURIComponent(
                            `${window.location.origin}/#/apply/${selectedJob.id}?src=li`,
                          );
                          window.open(
                            `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
                            "_blank",
                          );
                        }}
                        className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-bold text-sm flex justify-center items-center gap-2"
                      >
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const sList = Array.isArray(selectedJob.skills) ? selectedJob.skills : (selectedJob.skills ? selectedJob.skills.split(',') : []);
                        const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
                        const text = `🚀 Immediate Hiring | ${selectedJob.title}
📍 Location: ${selectedJob.location || 'Remote'}
💼 Employment: ${selectedJob.type || 'Full-time'}
💰 Salary: ${selectedJob.budget || '₹12–15 LPA'}
👥 Openings: 5

Skills Required:
${fSkills || '• Core developer competencies'}

Experience:
${selectedJob.experienceRequired || '3-5 Years'}

🎯 Candidates can be on your payroll or HireNest Workforce payroll.

📄 Full Job Description:
${window.location.origin}/#/apply/${selectedJob.id}?src=copy

📤 Vendors:
Submit your candidate here:
${window.location.origin}/#/apply/${selectedJob.id}?type=vendor`;
                        navigator.clipboard.writeText(text);
                        toast.success("Complete formatted post copied to clipboard!");
                      }}
                      className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-bold text-sm flex justify-center items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" /> Copy Complete Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
