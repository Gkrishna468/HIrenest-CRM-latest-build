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
  Edit2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { safeArray, safeString, safeDate } from "@/utils/safe";
import { broadcastJob } from "@/services/marketplaceService";
import { SourceBadge } from "@/components/SourceBadge";

export default function Jobs() {
  const { jobs, loading, approveJobWithBudget, addJob, updateJob, candidates, deals, clients } =
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

  const [detailTab, setDetailTab] = useState<'pipeline' | 'audit'>('pipeline');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<any>({
    title: "",
    clientName: "",
    clientId: "",
    location: "",
    type: "Full-time",
    openings: 1,
    description: "",
    skills: "",
    experienceMin: 3,
    experienceMax: 5,
    salaryMin: 700000,
    salaryMax: 900000,
    salaryType: "Annual CTC",
    noticePeriod: "Immediate",
    shiftTiming: "General",
    interviewMode: "Online",
    interviewRounds: 2,
    joiningTimeline: "15 Days",
    education: "Any Graduate",
    certifications: "",
    visaAuthorization: "Not Required",
    replacementPeriod: "90 Days",
    priority: "Medium",
    publishToVendorPortal: true,
    publishToClientPortal: true,
    publishToWhatsApp: true,
    publishToLinkedIn: true,
    publishToInternalRecruiters: true,
    publishToEmailCampaign: true,
  });

  // Pricing Engine Interactive States for Edit Mode
  const [editRequirementType, setEditRequirementType] = useState("FTE");
  const [editWorkMode, setEditWorkMode] = useState("Remote");
  const [editBudgetUnit, setEditBudgetUnit] = useState("LPA");
  const [editBillingType, setEditBillingType] = useState("Direct Payroll");

  // FTE inputs (edit)
  const [editFteBudgetLpa, setEditFteBudgetLpa] = useState("12");
  const [editFtePlacementPercent, setEditFtePlacementPercent] = useState("10");

  // C2H inputs (edit)
  const [editC2hSalaryLpa, setEditC2hSalaryLpa] = useState("10");
  const [editC2hDurationMonths, setEditC2hDurationMonths] = useState("12");
  const [editC2hMonthlyMarginPercent, setEditC2hMonthlyMarginPercent] = useState("15");

  // C2C inputs (edit)
  const [editC2cClientBillingLpm, setEditC2cClientBillingLpm] = useState("170000");
  const [editC2cVendorCostLpm, setEditC2cVendorCostLpm] = useState("150000");

  const [newJob, setNewJob] = useState({
    title: "",
    clientName: "",
    clientId: "",
    location: "",
    type: "Full-time",
    openings: 1,
    description: "",
    skills: "",
    experienceMin: 3,
    experienceMax: 5,
    salaryMin: 700000,
    salaryMax: 900000,
    salaryType: "Annual CTC" as any,
    noticePeriod: "Immediate",
    shiftTiming: "General",
    interviewMode: "Online",
    interviewRounds: 2,
    joiningTimeline: "15 Days",
    education: "Any Graduate",
    certifications: "",
    visaAuthorization: "Not Required",
    replacementPeriod: "90 Days",
    priority: "Medium" as any,
    publishToVendorPortal: true,
    publishToClientPortal: true,
    publishToWhatsApp: true,
    publishToLinkedIn: true,
    publishToInternalRecruiters: true,
    publishToEmailCampaign: true,
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

  const formatSalaryRange = (job: any) => {
    if (job.salaryMin !== undefined && job.salaryMax !== undefined && job.salaryMin !== null) {
      const minVal = typeof job.salaryMin === 'number' ? job.salaryMin : parseInt(job.salaryMin);
      const maxVal = typeof job.salaryMax === 'number' ? job.salaryMax : parseInt(job.salaryMax);
      const type = job.salaryType || 'Annual CTC';
      
      if (type === 'Annual CTC') {
        const minLpa = minVal >= 100000 ? (minVal / 100000).toFixed(0) : minVal;
        const maxLpa = maxVal >= 100000 ? (maxVal / 100000).toFixed(0) : maxVal;
        return `₹${minLpa} LPA – ₹${maxLpa} LPA`;
      } else if (type === 'Monthly CTC') {
        const minLpm = minVal >= 100000 ? (minVal / 100000).toFixed(1) : (minVal >= 1000 ? (minVal / 1000).toFixed(0) + 'k' : minVal);
        const maxLpm = maxVal >= 100000 ? (maxVal / 100000).toFixed(1) : (maxVal >= 1000 ? (maxVal / 1000).toFixed(0) + 'k' : maxVal);
        const formattedMin = minVal >= 100000 ? `${(minVal / 100000).toFixed(1)} LPM` : `₹${minVal}`;
        const formattedMax = maxVal >= 100000 ? `${(maxVal / 100000).toFixed(1)} LPM` : `₹${maxVal}`;
        return `₹${formattedMin} – ₹${formattedMax}`;
      } else {
        return `₹${minVal.toLocaleString()} – ₹${maxVal.toLocaleString()} (${type})`;
      }
    }
    return job.budget || 'Pending Approval';
  };

  const formatExperienceRange = (job: any) => {
    if (job.experienceMin !== undefined && job.experienceMax !== undefined && job.experienceMin !== null) {
      return `${job.experienceMin} – ${job.experienceMax} Years`;
    }
    return job.experienceRequired || '3-5 Years';
  };

  const generateJobTemplate = (job: any, isVendor: boolean = false, sourceChannel: string = 'wa') => {
    const sList = Array.isArray(job.skills) ? job.skills : (job.skills ? job.skills.split(',') : []);
    const fSkills = sList.map((s: any) => `• ${s.trim()}`).join('\n');
    
    // Format experience
    let expStr = formatExperienceRange(job);
  
    // Format salary/budget
    let salaryStr = formatSalaryRange(job);
  
    const applyUrl = `${window.location.origin}/#/apply/${job.id}?src=${sourceChannel}`;
    const vendorUrl = `${window.location.origin}/#/vendor-submit/${job.id}`;
  
    return `🚀 Immediate Hiring | ${job.title}
  
📍 Location: ${job.location || 'Remote'}
  
💼 Employment: ${job.type || 'Contract to Hire (C2H)'}
  
💰 Salary: ${salaryStr}
  
👨💻 Experience: ${expStr}
  
🧰 Skills:
${fSkills || '• Core developer competencies'}
  
👥 Openings: ${job.openings || 1}
  
📄 Payroll:
✔ Candidate can be on Vendor Payroll
✔ Candidate can be on HireNest Workforce Payroll
  
🔗 Apply:
${applyUrl}
  
🤝 Vendors:
${vendorUrl}
  
Powered by HireNestOS AI`;
  };

  // Pricing Engine Interactive States calculations for EDIT Mode
  const getEditFteCalculations = () => {
    const budget = parseFloat(editFteBudgetLpa) || 0;
    const percent = parseFloat(editFtePlacementPercent) || 0;
    const placementFee = budget * (percent / 100);
    const vendorShare = placementFee * 0.3;
    const expectedRevenue = placementFee - vendorShare;
    const gst = expectedRevenue * 0.18;
    const totalExpectedRevenue = expectedRevenue + gst;
    return {
      placementFee: placementFee.toFixed(2),
      vendorShare: vendorShare.toFixed(2),
      expectedRevenue: expectedRevenue.toFixed(2),
      gst: gst.toFixed(2),
      totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
    };
  };

  const getEditC2hCalculations = () => {
    const salary = parseFloat(editC2hSalaryLpa) || 0;
    const duration = parseInt(editC2hDurationMonths) || 12;
    const marginPercent = parseFloat(editC2hMonthlyMarginPercent) || 0;
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

  const getEditC2cCalculations = () => {
    const clientBilling = parseFloat(editC2cClientBillingLpm) || 0;
    const vendorCost = parseFloat(editC2cVendorCostLpm) || 0;
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

      // Format custom budget string from salary range if ranges are filled
      if (newJob.salaryMin && newJob.salaryMax) {
        computedBudget = formatSalaryRange(newJob);
      }

      const initialStatus = "draft"; // Starts as Draft according to Governance Rules
      const initialApprovalStatus = "draft";

      const experienceStr = `${newJob.experienceMin} – ${newJob.experienceMax} Years`;

      const initialChangeLog = [
        {
          timestamp: new Date().toISOString(),
          actor: user?.email || "System",
          action: "Requisition Created",
          details: `Requirement created as a draft requisition. Version 1 initialized.`,
        }
      ];

      await addJob({
        ...newJob,
        skills: newJob.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        budget: computedBudget,
        status: initialStatus as any,
        approvalStatus: initialApprovalStatus,
        experienceRequired: experienceStr,
        pricing_data: calculatedMetadata, // Save metadata for BDM/Finance reviews
        versions: [],
        changeLog: initialChangeLog,
        publishTo: {
          vendorPortal: newJob.publishToVendorPortal,
          clientPortal: newJob.publishToClientPortal,
          whatsApp: newJob.publishToWhatsApp,
          linkedIn: newJob.publishToLinkedIn,
          internalRecruiters: newJob.publishToInternalRecruiters,
          emailCampaign: newJob.publishToEmailCampaign,
        }
      } as any);

      toast.success("Requirement requisition saved as DRAFT. Submit for approval next.");
      setIsModalOpen(false);
      
      // Reset State
      setNewJob({
        title: "",
        clientName: "",
        clientId: "",
        location: "",
        type: "Full-time",
        openings: 1,
        description: "",
        skills: "",
        experienceMin: 3,
        experienceMax: 5,
        salaryMin: 700000,
        salaryMax: 900000,
        salaryType: "Annual CTC",
        noticePeriod: "Immediate",
        shiftTiming: "General",
        interviewMode: "Online",
        interviewRounds: 2,
        joiningTimeline: "15 Days",
        education: "Any Graduate",
        certifications: "",
        visaAuthorization: "Not Required",
        replacementPeriod: "90 Days",
        priority: "Medium",
        publishToVendorPortal: true,
        publishToClientPortal: true,
        publishToWhatsApp: true,
        publishToLinkedIn: true,
        publishToInternalRecruiters: true,
        publishToEmailCampaign: true,
      });
    } catch (err) {
      toast.error("Failed to create requirement");
    }
  };

  const handleEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let computedBudget = "";
      let calculatedMetadata: any = {};

      if (editRequirementType === "FTE") {
        const calcs = getEditFteCalculations();
        computedBudget = `₹${editFteBudgetLpa}L CTC (FTE)`;
        calculatedMetadata = {
          requirementType: editRequirementType,
          workMode: editWorkMode,
          budgetUnit: editBudgetUnit,
          billingType: editBillingType,
          fteBudgetLpa: editFteBudgetLpa,
          ftePlacementPercent: editFtePlacementPercent,
          ...calcs
        };
      } else if (editRequirementType === "C2H") {
        const calcs = getEditC2hCalculations();
        computedBudget = `₹${editC2hSalaryLpa}L CTC (C2H)`;
        calculatedMetadata = {
          requirementType: editRequirementType,
          workMode: editWorkMode,
          budgetUnit: editBudgetUnit,
          billingType: editBillingType,
          c2hSalaryLpa: editC2hSalaryLpa,
          c2hDurationMonths,
          c2hMonthlyMarginPercent,
          ...calcs
        };
      } else {
        const calcs = getEditC2cCalculations();
        computedBudget = `₹${parseFloat(editC2cClientBillingLpm).toLocaleString()} LPM (C2C)`;
        calculatedMetadata = {
          requirementType: editRequirementType,
          workMode: editWorkMode,
          budgetUnit: editBudgetUnit,
          billingType: editBillingType,
          c2cClientBillingLpm: editC2cClientBillingLpm,
          c2cVendorCostLpm: editC2cVendorCostLpm,
          ...calcs
        };
      }

      // Format custom budget string from salary range if ranges are filled
      if (editJob.salaryMin && editJob.salaryMax) {
        computedBudget = formatSalaryRange(editJob);
      }

      // Check for changes compared to selectedJob
      const parseSkills = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
      const newSkills = parseSkills(editJob.skills);
      const oldSkills = Array.isArray(selectedJob.skills) ? selectedJob.skills : [];
      
      const isCriticalFieldChanged = 
        editJob.title !== selectedJob.title ||
        editJob.location !== selectedJob.location ||
        JSON.stringify(newSkills.sort()) !== JSON.stringify([...oldSkills].sort()) ||
        editJob.clientName !== selectedJob.clientName ||
        editJob.experienceMin !== selectedJob.experienceMin ||
        editJob.experienceMax !== selectedJob.experienceMax ||
        editJob.salaryMin !== selectedJob.salaryMin ||
        editJob.salaryMax !== selectedJob.salaryMax ||
        editJob.salaryType !== selectedJob.salaryType ||
        computedBudget !== selectedJob.budget;

      const isApproved = selectedJob.approvalStatus === "approved";
      const isAdminUser = user?.role === "admin";

      let payload: any = {
        title: editJob.title,
        clientName: editJob.clientName,
        location: editJob.location,
        type: editJob.type,
        openings: editJob.openings,
        description: editJob.description,
        skills: newSkills,
        experienceMin: editJob.experienceMin,
        experienceMax: editJob.experienceMax,
        experienceRequired: `${editJob.experienceMin} – ${editJob.experienceMax} Years`,
        salaryMin: editJob.salaryMin,
        salaryMax: editJob.salaryMax,
        salaryType: editJob.salaryType,
        workMode: editWorkMode as any,
        noticePeriod: editJob.noticePeriod,
        shiftTiming: editJob.shiftTiming,
        interviewMode: editJob.interviewMode,
        interviewRounds: editJob.interviewRounds,
        joiningTimeline: editJob.joiningTimeline,
        education: editJob.education,
        certifications: editJob.certifications,
        visaAuthorization: editJob.visaAuthorization,
        replacementPeriod: editJob.replacementPeriod,
        priority: editJob.priority,
        publishTo: {
          vendorPortal: editJob.publishToVendorPortal,
          clientPortal: editJob.publishToClientPortal,
          whatsApp: editJob.publishToWhatsApp,
          linkedIn: editJob.publishToLinkedIn,
          internalRecruiters: editJob.publishToInternalRecruiters,
          emailCampaign: editJob.publishToEmailCampaign,
        },
        pricing_data: calculatedMetadata,
        budget: computedBudget,
      };

      if (isApproved && !isAdminUser && isCriticalFieldChanged) {
        // Trigger Pending Update Approval
        const changesDesc: string[] = [];
        if (editJob.title !== selectedJob.title) changesDesc.push(`Title: "${selectedJob.title}" ➔ "${editJob.title}"`);
        if (editJob.location !== selectedJob.location) changesDesc.push(`Location: "${selectedJob.location}" ➔ "${editJob.location}"`);
        if (JSON.stringify(newSkills.sort()) !== JSON.stringify([...oldSkills].sort())) changesDesc.push(`Skills: [${oldSkills.join(', ')}] ➔ [${newSkills.join(', ')}]`);
        if (editJob.clientName !== selectedJob.clientName) changesDesc.push(`Client: "${selectedJob.clientName}" ➔ "${editJob.clientName}"`);
        if (editJob.experienceMin !== selectedJob.experienceMin || editJob.experienceMax !== selectedJob.experienceMax) {
          changesDesc.push(`Experience: ${selectedJob.experienceMin}-${selectedJob.experienceMax} ➔ ${editJob.experienceMin}-${editJob.experienceMax} Years`);
        }
        if (editJob.salaryMin !== selectedJob.salaryMin || editJob.salaryMax !== selectedJob.salaryMax || editJob.salaryType !== selectedJob.salaryType) {
          changesDesc.push(`Salary: ${selectedJob.salaryMin}-${editJob.salaryMax} (${editJob.salaryType})`);
        }

        const newChangeLog = [
          ...(selectedJob.changeLog || []),
          {
            timestamp: new Date().toISOString(),
            actor: user?.email || "Recruiter",
            action: "Pending Edit Request",
            details: `Recruiter requested critical edits: ${changesDesc.join("; ")}. Pending Admin Approval.`,
          }
        ];

        await updateJob(selectedJob.id, {
          approvalStatus: "pending_update",
          pendingUpdates: payload,
          changeLog: newChangeLog,
        });

        toast.success("Critical edits submitted to Administrator for review.");
      } else {
        // Apply immediately (Admin or Draft mode)
        const oldVersionNum = selectedJob.versions?.length || 0;
        const newVersionNum = oldVersionNum + 1;
        
        // Push current approved values into versions list
        const updatedHistory = [
          ...(selectedJob.versions || []),
          {
            version: newVersionNum,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.email || "System",
            title: selectedJob.title,
            description: selectedJob.description,
            location: selectedJob.location,
            skills: selectedJob.skills,
            experienceMin: selectedJob.experienceMin,
            experienceMax: selectedJob.experienceMax,
            salaryMin: selectedJob.salaryMin,
            salaryMax: selectedJob.salaryMax,
            salaryType: selectedJob.salaryType,
            budget: selectedJob.budget,
            priority: selectedJob.priority,
          }
        ];

        const changeDetails: string[] = [];
        if (editJob.title !== selectedJob.title) changeDetails.push(`Title: "${selectedJob.title}" ➔ "${editJob.title}"`);
        if (editJob.location !== selectedJob.location) changeDetails.push(`Location: "${selectedJob.location}" ➔ "${editJob.location}"`);
        
        const newChangeLog = [
          ...(selectedJob.changeLog || []),
          {
            timestamp: new Date().toISOString(),
            actor: user?.email || "System",
            action: isApproved ? "Direct Edit Approved" : "Draft Saved",
            details: changeDetails.length > 0 ? `Updated fields: ${changeDetails.join("; ")}` : "Requirement metadata updated.",
          }
        ];

        payload.versions = updatedHistory;
        payload.changeLog = newChangeLog;

        await updateJob(selectedJob.id, payload);
        toast.success("Requirement updated successfully!");
      }

      setIsEditModalOpen(false);
      setIsViewDetailOpen(false); // Close details so we reload fresh values next time
    } catch (err) {
      toast.error("Failed to update requirement.");
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

      {/* Admin Pending Edits Approval Section */}
      {user?.role === "admin" && safeArray(jobs).some(j => j.approvalStatus === "pending_update") && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 mb-6 space-y-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Pending Requisition Updates ({safeArray(jobs).filter(j => j.approvalStatus === "pending_update").length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeArray(jobs).filter(j => j.approvalStatus === "pending_update").map((job: any) => (
              <div key={job.id} className="bg-white border border-amber-100 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/50 px-2.5 py-0.5 rounded-full uppercase">
                      Update Approval Required
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">
                      {job.clientName || "Direct Client"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{job.title}</h3>
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-32 overflow-y-auto">
                    <div className="font-semibold text-slate-700 mb-1">Proposed Modifications:</div>
                    {job.pendingUpdates ? (
                      <div className="space-y-1 font-mono">
                        {job.pendingUpdates.title !== job.title && <div>Title: <span className="line-through text-rose-500">{job.title}</span> ➔ <span className="text-emerald-600 font-medium">{job.pendingUpdates.title}</span></div>}
                        {job.pendingUpdates.location !== job.location && <div>Location: <span className="line-through text-rose-500">{job.location}</span> ➔ <span className="text-emerald-600 font-medium">{job.pendingUpdates.location}</span></div>}
                        {(job.pendingUpdates.experienceMin !== job.experienceMin || job.pendingUpdates.experienceMax !== job.experienceMax) && <div>Experience: <span className="line-through text-rose-500">{formatExperienceRange(job)}</span> ➔ <span className="text-emerald-600 font-medium">{formatExperienceRange(job.pendingUpdates)}</span></div>}
                        {(job.pendingUpdates.salaryMin !== job.salaryMin || job.pendingUpdates.salaryMax !== job.salaryMax || job.pendingUpdates.salaryType !== job.salaryType) && <div>Salary: <span className="line-through text-rose-500">{formatSalaryRange(job)}</span> ➔ <span className="text-emerald-600 font-medium">{formatSalaryRange(job.pendingUpdates)}</span></div>}
                        {job.pendingUpdates.description !== job.description && <div>Description modified.</div>}
                      </div>
                    ) : (
                      <span>Critical updates requested by Recruiter.</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={async () => {
                      try {
                        const approvedPayload = {
                          ...job.pendingUpdates,
                          approvalStatus: "approved",
                          pendingUpdates: null,
                          changeLog: [
                            ...(job.changeLog || []),
                            {
                              timestamp: new Date().toISOString(),
                              actor: user?.email || "Admin",
                              action: "Update Request Approved",
                              details: `Admin approved critical changes. Requisition updated to version ${((job.versions?.length || 0) + 1)}.`,
                            }
                          ]
                        };
                        await updateJob(job.id, approvedPayload);
                        toast.success("Requirement updates approved and published successfully!");
                      } catch (err) {
                        toast.error("Failed to approve update.");
                      }
                    }}
                    className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Approve Changes
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await updateJob(job.id, {
                          approvalStatus: "approved", // revert to original approved status
                          pendingUpdates: null,
                          changeLog: [
                            ...(job.changeLog || []),
                            {
                              timestamp: new Date().toISOString(),
                              actor: user?.email || "Admin",
                              action: "Update Request Rejected",
                              details: "Admin rejected the critical updates.",
                            }
                          ]
                        });
                        toast.success("Recruiter updates rejected. Kept original requirement.");
                      } catch (err) {
                        toast.error("Failed to reject update.");
                      }
                    }}
                    className="flex-1 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Reject Changes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      {job.clientName || (job.clientId ? clients.find(c => c.id === job.clientId)?.name : null) || "Direct Hire"}
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
                      Experience Range
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      <span className="text-sm font-bold text-slate-900">
                        {formatExperienceRange(job)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Budget / Salary
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatSalaryRange(job)}
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

              {/* EXPERIENCE RANGE FIELDS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <BriefcaseIcon className="w-4 h-4 text-indigo-500" />
                  Experience Range (Years)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Minimum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newJob.experienceMin}
                      onChange={(e) => setNewJob({ ...newJob, experienceMin: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Maximum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newJob.experienceMax}
                      onChange={(e) => setNewJob({ ...newJob, experienceMax: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-500 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>👨💻 Job Card Experience Representation:</span>
                  <span className="text-indigo-600">{formatExperienceRange(newJob)}</span>
                </div>
              </div>

              {/* SALARY RANGE FIELDS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Salary Range & Commercial Budget Model
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Minimum Salary (Absolute Value)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newJob.salaryMin}
                      onChange={(e) => setNewJob({ ...newJob, salaryMin: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 700000"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Maximum Salary (Absolute Value)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newJob.salaryMax}
                      onChange={(e) => setNewJob({ ...newJob, salaryMax: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 900000"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Salary Structure Type
                    </label>
                    <select
                      value={newJob.salaryType}
                      onChange={(e) => setNewJob({ ...newJob, salaryType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium"
                    >
                      <option>Annual CTC</option>
                      <option>Monthly CTC</option>
                      <option>Hourly</option>
                      <option>Daily</option>
                      <option>Fixed</option>
                      <option>Negotiable</option>
                    </select>
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-500 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>💰 Shared Template Salary Representation:</span>
                  <span className="text-emerald-600 font-extrabold">{formatSalaryRange(newJob)}</span>
                </div>
              </div>

              {/* NICE TO HAVE FIELDS SECTION */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-4">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-amber-500" />
                  Additional Requisition Metrics & SLA Settings
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notice Period</label>
                    <input
                      type="text"
                      value={newJob.noticePeriod}
                      onChange={(e) => setNewJob({ ...newJob, noticePeriod: e.target.value })}
                      placeholder="e.g. Immediate, 15 Days"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shift Timing</label>
                    <input
                      type="text"
                      value={newJob.shiftTiming}
                      onChange={(e) => setNewJob({ ...newJob, shiftTiming: e.target.value })}
                      placeholder="e.g. General, Night"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interview Mode</label>
                    <input
                      type="text"
                      value={newJob.interviewMode}
                      onChange={(e) => setNewJob({ ...newJob, interviewMode: e.target.value })}
                      placeholder="e.g. Online, In-Person"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interview Rounds</label>
                    <input
                      type="number"
                      value={newJob.interviewRounds}
                      onChange={(e) => setNewJob({ ...newJob, interviewRounds: parseInt(e.target.value) || 2 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Timeline</label>
                    <input
                      type="text"
                      value={newJob.joiningTimeline}
                      onChange={(e) => setNewJob({ ...newJob, joiningTimeline: e.target.value })}
                      placeholder="e.g. 15 Days, Immediate"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Education</label>
                    <input
                      type="text"
                      value={newJob.education}
                      onChange={(e) => setNewJob({ ...newJob, education: e.target.value })}
                      placeholder="e.g. B.Tech, Graduate"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Certifications</label>
                    <input
                      type="text"
                      value={newJob.certifications}
                      onChange={(e) => setNewJob({ ...newJob, certifications: e.target.value })}
                      placeholder="e.g. AWS, PMP"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Auth / Visa</label>
                    <input
                      type="text"
                      value={newJob.visaAuthorization}
                      onChange={(e) => setNewJob({ ...newJob, visaAuthorization: e.target.value })}
                      placeholder="e.g. Not Required, Citizen"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Replacement Period</label>
                    <input
                      type="text"
                      value={newJob.replacementPeriod}
                      onChange={(e) => setNewJob({ ...newJob, replacementPeriod: e.target.value })}
                      placeholder="e.g. 90 Days"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority Rating</label>
                    <select
                      value={newJob.priority}
                      onChange={(e) => setNewJob({ ...newJob, priority: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none font-bold"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* REQUISITION PUBLISH SETTINGS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-teal-500" />
                  Publish & Distribution Settings
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "publishToVendorPortal", label: "Vendor Portal" },
                    { key: "publishToClientPortal", label: "Client Portal" },
                    { key: "publishToWhatsApp", label: "WhatsApp Broadcast" },
                    { key: "publishToLinkedIn", label: "LinkedIn Share Link" },
                    { key: "publishToInternalRecruiters", label: "Internal Sourcing" },
                    { key: "publishToEmailCampaign", label: "Outreach Campaign" },
                  ].map((chan) => (
                    <label key={chan.key} className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={(newJob as any)[chan.key]}
                        onChange={(e) => setNewJob({ ...newJob, [chan.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/25"
                      />
                      <span className="text-xs font-bold text-slate-600">{chan.label}</span>
                    </label>
                  ))}
                </div>
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

      {/* Edit Job Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Edit Job Requisition</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Updates to critical fields of approved jobs will trigger Admin review.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleEditJob}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={editJob.title}
                  onChange={(e) =>
                    setEditJob({ ...editJob, title: e.target.value })
                  }
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
                  value={editJob.clientName}
                  onChange={(e) =>
                    setEditJob({ ...editJob, clientName: e.target.value })
                  }
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
                  value={editJob.location}
                  onChange={(e) =>
                    setEditJob({ ...editJob, location: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Requirement Type (Commercial Route)
                </label>
                <select
                  value={editRequirementType}
                  onChange={(e) => setEditRequirementType(e.target.value)}
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
                  value={editWorkMode}
                  onChange={(e) => setEditWorkMode(e.target.value)}
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
                  value={editBudgetUnit}
                  onChange={(e) => setEditBudgetUnit(e.target.value)}
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
                  value={editBillingType}
                  onChange={(e) => setEditBillingType(e.target.value)}
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
                  value={editJob.openings}
                  onChange={(e) =>
                    setEditJob({ ...editJob, openings: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* DYNAMIC PRICING ENGINE CALCULATOR FOR EDIT MODE */}
              <div className="md:col-span-2 p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">
                    Interactive Pricing & Margin Engine ({editRequirementType})
                  </h3>
                </div>

                {editRequirementType === "FTE" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        FTE Budget (LPA)
                      </label>
                      <input
                        type="number"
                        value={editFteBudgetLpa}
                        onChange={(e) => setEditFteBudgetLpa(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Placement Fee Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={editFtePlacementPercent}
                        onChange={(e) => setEditFtePlacementPercent(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Placement Fee</span>
                        <span className="text-sm font-black text-white">₹{getEditFteCalculations().placementFee}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Vendor Share (30%)</span>
                        <span className="text-sm font-black text-slate-300">₹{getEditFteCalculations().vendorShare}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Expected Revenue</span>
                        <span className="text-sm font-black text-emerald-400">₹{getEditFteCalculations().expectedRevenue}L</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST (18%)</span>
                        <span className="text-sm font-black text-slate-300">₹{getEditFteCalculations().gst}L</span>
                      </div>
                    </div>
                  </div>
                )}

                {editRequirementType === "C2H" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Salary Equivalent (LPA)
                      </label>
                      <input
                        type="number"
                        value={editC2hSalaryLpa}
                        onChange={(e) => setEditC2hSalaryLpa(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Duration (Months)
                      </label>
                      <select
                        value={editC2hDurationMonths}
                        onChange={(e) => setEditC2hDurationMonths(e.target.value)}
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
                        value={editC2hMonthlyMarginPercent}
                        onChange={(e) => setEditC2hMonthlyMarginPercent(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Payment</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getEditC2hCalculations().vendorMonthlyPayment).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Margin</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getEditC2hCalculations().monthlyMargin).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Annual Margin</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getEditC2hCalculations().annualRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Projected Revenue</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getEditC2hCalculations().projectedRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST on Margin</span>
                        <span className="text-xs font-black text-slate-300">₹{parseFloat(getEditC2hCalculations().gst).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {editRequirementType === "C2C" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Client Billing (LPM)
                      </label>
                      <input
                        type="number"
                        value={editC2cClientBillingLpm}
                        onChange={(e) => setEditC2cClientBillingLpm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Expected Vendor Cost (LPM)
                      </label>
                      <input
                        type="number"
                        value={editC2cVendorCostLpm}
                        onChange={(e) => setEditC2cVendorCostLpm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 text-center">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Margin</span>
                        <span className="text-xs font-black text-emerald-400">₹{parseFloat(getEditC2cCalculations().margin).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Margin %</span>
                        <span className="text-xs font-black text-emerald-300">{getEditC2cCalculations().marginPercent}%</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Monthly Revenue</span>
                        <span className="text-xs font-black text-white">₹{parseFloat(getEditC2cCalculations().monthlyRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Annual Revenue</span>
                        <span className="text-xs font-black text-emerald-400 font-bold">₹{parseFloat(getEditC2cCalculations().annualRevenue).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">GST (18%)</span>
                        <span className="text-xs font-black text-slate-300">₹{parseFloat(getEditC2cCalculations().gst).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* EXPERIENCE RANGE FIELDS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <BriefcaseIcon className="w-4 h-4 text-indigo-500" />
                  Experience Range (Years)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Minimum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editJob.experienceMin}
                      onChange={(e) => setEditJob({ ...editJob, experienceMin: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Maximum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editJob.experienceMax}
                      onChange={(e) => setEditJob({ ...editJob, experienceMax: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SALARY RANGE FIELDS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Salary Range & Budget Sourcing Info
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Minimum Salary (Absolute Value)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editJob.salaryMin}
                      onChange={(e) => setEditJob({ ...editJob, salaryMin: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Maximum Salary (Absolute Value)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editJob.salaryMax}
                      onChange={(e) => setEditJob({ ...editJob, salaryMax: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Salary Structure Type
                    </label>
                    <select
                      value={editJob.salaryType}
                      onChange={(e) => setEditJob({ ...editJob, salaryType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium"
                    >
                      <option>Annual CTC</option>
                      <option>Monthly CTC</option>
                      <option>Hourly</option>
                      <option>Daily</option>
                      <option>Fixed</option>
                      <option>Negotiable</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NICE TO HAVE FIELDS SECTION */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-4">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-amber-500" />
                  Additional Requisition Metrics & SLA Settings
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notice Period</label>
                    <input
                      type="text"
                      value={editJob.noticePeriod}
                      onChange={(e) => setEditJob({ ...editJob, noticePeriod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shift Timing</label>
                    <input
                      type="text"
                      value={editJob.shiftTiming}
                      onChange={(e) => setEditJob({ ...editJob, shiftTiming: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interview Mode</label>
                    <input
                      type="text"
                      value={editJob.interviewMode}
                      onChange={(e) => setEditJob({ ...editJob, interviewMode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interview Rounds</label>
                    <input
                      type="number"
                      value={editJob.interviewRounds}
                      onChange={(e) => setEditJob({ ...editJob, interviewRounds: parseInt(e.target.value) || 2 })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Timeline</label>
                    <input
                      type="text"
                      value={editJob.joiningTimeline}
                      onChange={(e) => setEditJob({ ...editJob, joiningTimeline: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Education</label>
                    <input
                      type="text"
                      value={editJob.education}
                      onChange={(e) => setEditJob({ ...editJob, education: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Certifications</label>
                    <input
                      type="text"
                      value={editJob.certifications}
                      onChange={(e) => setEditJob({ ...editJob, certifications: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Auth / Visa</label>
                    <input
                      type="text"
                      value={editJob.visaAuthorization}
                      onChange={(e) => setEditJob({ ...editJob, visaAuthorization: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Replacement Period</label>
                    <input
                      type="text"
                      value={editJob.replacementPeriod}
                      onChange={(e) => setEditJob({ ...editJob, replacementPeriod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority Rating</label>
                    <select
                      value={editJob.priority}
                      onChange={(e) => setEditJob({ ...editJob, priority: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none font-bold"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* REQUISITION PUBLISH SETTINGS */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl md:col-span-2 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-teal-500" />
                  Publish & Distribution Settings
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "publishToVendorPortal", label: "Vendor Portal" },
                    { key: "publishToClientPortal", label: "Client Portal" },
                    { key: "publishToWhatsApp", label: "WhatsApp Broadcast" },
                    { key: "publishToLinkedIn", label: "LinkedIn Share Link" },
                    { key: "publishToInternalRecruiters", label: "Internal Sourcing" },
                    { key: "publishToEmailCampaign", label: "Outreach Campaign" },
                  ].map((chan) => (
                    <label key={chan.key} className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={(editJob as any)[chan.key]}
                        onChange={(e) => setEditJob({ ...editJob, [chan.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/25"
                      />
                      <span className="text-xs font-bold text-slate-600">{chan.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={editJob.skills}
                  onChange={(e) =>
                    setEditJob({ ...editJob, skills: e.target.value })
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
                  value={editJob.description}
                  onChange={(e) =>
                    setEditJob({ ...editJob, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Request Requisition Update
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
                    <span className="text-sm font-bold text-slate-800">{selectedJob.clientName || (selectedJob.clientId ? clients.find(c => c.id === selectedJob.clientId)?.name : null)}</span>
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
                  Requisition: {broadcastTargetJob.title} ({broadcastTargetJob.clientName || (broadcastTargetJob.clientId ? clients.find(c => c.id === broadcastTargetJob.clientId)?.name : null)})
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
                      {window.location.origin}/#/vendor-submit/{broadcastTargetJob.id}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/#/vendor-submit/${broadcastTargetJob.id}`);
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
                        const text = encodeURIComponent(`🚀 *Immediate Hiring | ${broadcastTargetJob.title}*

📍 *Location:* ${broadcastTargetJob.location || 'Remote'}
💼 *Employment:* ${broadcastTargetJob.type || 'Full-time'}
💰 *Salary:* ${broadcastTargetJob.budget || '₹12–15 LPA'}
👥 *Openings:* ${broadcastTargetJob.openings || 1}
⚡ *Experience Required:* ${broadcastTargetJob.experienceRequired || '3-5 Years'}

🛠️ *Skills Required:*
${fSkills || '• Core developer competencies'}

🎯 *Workforce Option:*
Candidates can be on your payroll or HireNest Workforce payroll.

📄 *Full Job Description & Apply:*
${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=wa

📤 *Vendors Submit Candidate:*
${window.location.origin}/#/vendor-submit/${broadcastTargetJob.id}

🤖 *Powered by HireNestOS AI*`);
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
                        const text = `🚀 *Immediate Hiring | ${broadcastTargetJob.title}*

📍 *Location:* ${broadcastTargetJob.location || 'Remote'}
💼 *Employment:* ${broadcastTargetJob.type || 'Full-time'}
💰 *Salary:* ${broadcastTargetJob.budget || '₹12–15 LPA'}
👥 *Openings:* ${broadcastTargetJob.openings || 1}
⚡ *Experience Required:* ${broadcastTargetJob.experienceRequired || '3-5 Years'}

🛠️ *Skills Required:*
${fSkills || '• Core developer competencies'}

🎯 *Workforce Option:*
Candidates can be on your payroll or HireNest Workforce payroll.

📄 *Full Job Description & Apply:*
${window.location.origin}/#/apply/${broadcastTargetJob.id}?src=li

📤 *Vendors Submit Candidate:*
${window.location.origin}/#/vendor-submit/${broadcastTargetJob.id}

🤖 *Powered by HireNestOS AI*`;
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
                      <Building2 className="w-4 h-4" /> {selectedJob.clientName || (selectedJob.clientId ? clients.find(c => c.id === selectedJob.clientId)?.name : null)}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditJob({
                      title: selectedJob.title || "",
                      clientName: selectedJob.clientName || "",
                      location: selectedJob.location || "",
                      type: selectedJob.type || "Full-time",
                      openings: selectedJob.openings || 1,
                      description: selectedJob.description || "",
                      skills: Array.isArray(selectedJob.skills) ? selectedJob.skills.join(", ") : (selectedJob.skills || ""),
                      experienceMin: selectedJob.experienceMin || 3,
                      experienceMax: selectedJob.experienceMax || 5,
                      salaryMin: selectedJob.salaryMin || 700000,
                      salaryMax: selectedJob.salaryMax || 900000,
                      salaryType: selectedJob.salaryType || "Annual CTC",
                      noticePeriod: selectedJob.noticePeriod || "Immediate",
                      shiftTiming: selectedJob.shiftTiming || "General",
                      interviewMode: selectedJob.interviewMode || "Online",
                      interviewRounds: selectedJob.interviewRounds || 2,
                      joiningTimeline: selectedJob.joiningTimeline || "15 Days",
                      education: selectedJob.education || "Any Graduate",
                      certifications: selectedJob.certifications || "",
                      visaAuthorization: selectedJob.visaAuthorization || "Not Required",
                      replacementPeriod: selectedJob.replacementPeriod || "90 Days",
                      priority: selectedJob.priority || "Medium",
                      publishToVendorPortal: selectedJob.publishTo?.vendorPortal ?? true,
                      publishToClientPortal: selectedJob.publishTo?.clientPortal ?? true,
                      publishToWhatsApp: selectedJob.publishTo?.whatsApp ?? true,
                      publishToLinkedIn: selectedJob.publishTo?.linkedIn ?? true,
                      publishToInternalRecruiters: selectedJob.publishTo?.internalRecruiters ?? true,
                      publishToEmailCampaign: selectedJob.publishTo?.emailCampaign ?? true,
                    });
                    
                    // Populate pricing state too
                    const pd = selectedJob.pricing_data || {};
                    setEditRequirementType(pd.requirementType || "FTE");
                    setEditWorkMode(pd.workMode || "Remote");
                    setEditBudgetUnit(pd.budgetUnit || "LPA");
                    setEditBillingType(pd.billingType || "Direct Payroll");
                    
                    if (pd.requirementType === "FTE") {
                      setEditFteBudgetLpa(pd.fteBudgetLpa || "12");
                      setEditFtePlacementPercent(pd.ftePlacementPercent || "10");
                    } else if (pd.requirementType === "C2H") {
                      setEditC2hSalaryLpa(pd.c2hSalaryLpa || "10");
                      setEditC2hDurationMonths(pd.c2hDurationMonths || "12");
                      setEditC2hMonthlyMarginPercent(pd.c2hMonthlyMarginPercent || "15");
                    } else if (pd.requirementType === "C2C") {
                      setEditC2cClientBillingLpm(pd.c2cClientBillingLpm || "170000");
                      setEditC2cVendorCostLpm(pd.c2cVendorCostLpm || "150000");
                    }
                    
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Requirement
                </button>
                <button
                  onClick={() => setIsViewDetailOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
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
                        const text = `🚀 *Immediate Hiring | ${selectedJob.title}*

📍 *Location:* ${selectedJob.location || 'Remote'}
💼 *Employment:* ${selectedJob.type || 'Full-time'}
💰 *Salary:* ${selectedJob.budget || '₹12–15 LPA'}
👥 *Openings:* 5
⚡ *Experience Required:* ${selectedJob.experienceRequired || '3-5 Years'}

🛠️ *Skills Required:*
${fSkills || '• Core developer competencies'}

🎯 *Workforce Option:*
Candidates can be on your payroll or HireNest Workforce payroll.

📄 *Full Job Description & Apply:*
${window.location.origin}/#/apply/${selectedJob.id}?src=li

📤 *Vendors Submit Candidate:*
${window.location.origin}/#/vendor-submit/${selectedJob.id}

🤖 *Powered by HireNestOS AI*`;
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
                        const text = `🚀 *Immediate Hiring | ${selectedJob.title}*

📍 *Location:* ${selectedJob.location || 'Remote'}
💼 *Employment:* ${selectedJob.type || 'Full-time'}
💰 *Salary:* ${selectedJob.budget || '₹12–15 LPA'}
👥 *Openings:* 5
⚡ *Experience Required:* ${selectedJob.experienceRequired || '3-5 Years'}

🛠️ *Skills Required:*
${fSkills || '• Core developer competencies'}

🎯 *Workforce Option:*
Candidates can be on your payroll or HireNest Workforce payroll.

📄 *Full Job Description & Apply:*
${window.location.origin}/#/apply/${selectedJob.id}?src=wa

📤 *Vendors Submit Candidate:*
${window.location.origin}/#/vendor-submit/${selectedJob.id}

🤖 *Powered by HireNestOS AI*`;
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

              {/* TAB BAR FOR DETAILS */}
              <div className="flex border-b border-slate-200 mb-6 shrink-0 gap-6">
                <button
                  onClick={() => setDetailTab('pipeline')}
                  className={cn(
                    "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1",
                    detailTab === 'pipeline'
                      ? "border-indigo-600 text-indigo-600 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Users className="w-4 h-4" /> Pipeline & JD Details
                </button>
                <button
                  onClick={() => setDetailTab('audit')}
                  className={cn(
                    "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1",
                    detailTab === 'audit'
                      ? "border-indigo-600 text-indigo-600 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <History className="w-4 h-4" /> Versions & Change Log
                  {selectedJob.versions && selectedJob.versions.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      v{selectedJob.versions.length + 1}
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {detailTab === 'pipeline' ? (
                    <>
                      {/* Active Pipeline Board / Candidates */}
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-600" /> Active Candidates
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

                      {/* Nice-to-Have parameters and details grid */}
                      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          Sourcing Parameters & Requisition Metrics
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Experience Range</span>
                            <span className="text-xs font-bold text-slate-800">{formatExperienceRange(selectedJob)}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Salary Budget</span>
                            <span className="text-xs font-bold text-slate-800">{formatSalaryRange(selectedJob)}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Work Mode</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.pricing_data?.workMode || selectedJob.workMode || "Remote"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Notice Period</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.noticePeriod || "Immediate"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Shift Timing</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.shiftTiming || "General"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interview Mode</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.interviewMode || "Online"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interview Rounds</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.interviewRounds || 2} Rounds</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Joining Timeline</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.joiningTimeline || "15 Days"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Education</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.education || "Any Graduate"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Certifications</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.certifications || "None Specified"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Visa/Work Auth</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.visaAuthorization || "Not Required"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Replacement Period</span>
                            <span className="text-xs font-bold text-slate-800">{selectedJob.replacementPeriod || "90 Days"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Priority</span>
                            <span className="text-xs font-bold text-indigo-600">{selectedJob.priority || "Medium"}</span>
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
                    </>
                  ) : (
                    <div className="space-y-6">
                      {/* Change Log Timeline */}
                      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <History className="w-4 h-4 text-indigo-600" /> Requisition Change Log & Audit Ledger
                        </h3>
                        {(!selectedJob.changeLog || selectedJob.changeLog.length === 0) ? (
                          <p className="text-xs text-slate-500">No modifications logged yet. Version 1 is active.</p>
                        ) : (
                          <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-6">
                            {selectedJob.changeLog.map((log: any, idx: number) => (
                              <div key={idx} className="relative">
                                <span className="absolute -left-[21px] top-1.5 bg-indigo-600 text-white p-0.5 rounded-full border-4 border-white">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </span>
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{log.action || "Update Applied"}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-500 mt-0.5">By: <span className="text-slate-700 font-bold">{log.actor || "Unknown"}</span></p>
                                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 font-medium">{log.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* Historical Versions Comparison */}
                      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <History className="w-4 h-4 text-amber-600" /> Previous Versions Archival
                        </h3>
                        {(!selectedJob.versions || selectedJob.versions.length === 0) ? (
                          <p className="text-xs text-slate-500">This requirement is in its initial state (v1) and has no historical revisions.</p>
                        ) : (
                          <div className="space-y-4">
                            {selectedJob.versions.map((ver: any, idx: number) => (
                              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md">Version #{ver.version}</span>
                                  <span className="text-[10px] font-mono text-slate-400">Archived at {new Date(ver.updatedAt).toLocaleString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Title</span>
                                    <span className="font-bold text-slate-700">{ver.title}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Budget Status</span>
                                    <span className="font-bold text-slate-700">{ver.budget || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Experience Required</span>
                                    <span className="font-bold text-slate-700">{ver.experienceMin || 0} – {ver.experienceMax || 0} Years</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Salary Details</span>
                                    <span className="font-bold text-slate-700">₹{ver.salaryMin?.toLocaleString()} – ₹{ver.salaryMax?.toLocaleString()} ({ver.salaryType})</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  )}
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
${window.location.origin}/#/vendor-submit/${selectedJob.id}`);
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
${window.location.origin}/#/vendor-submit/${selectedJob.id}`;
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
