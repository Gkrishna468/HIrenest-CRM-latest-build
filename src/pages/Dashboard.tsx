/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Users,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Zap,
  Handshake,
} from "lucide-react";

export default function Dashboard() {
  const { jobs, candidates, deals, vendors } = useData();
  const { user } = useAuth();

  // Real calculations from Firestore / useData
  const openRequirements = jobs.filter(
    (j) => j.status?.toLowerCase() === "open" || !j.status,
  ).length;
  const closedRequirements = jobs.filter(
    (j) => j.status?.toLowerCase() === "closed",
  ).length;

  const totalSubmissions = candidates.filter(
    (c) => c.stage === "submission" || c.stage === "screening" || !c.stage,
  ).length;
  const interviewsScheduled = candidates.filter(
    (c) => c.stage === "interview",
  ).length;
  const offersReleased = candidates.filter((c) => c.stage === "offer").length;
  const placements =
    candidates.filter((c) => c.stage === "placed" || c.stage === "joined")
      .length || deals.length;

  const activeVendors = vendors?.length || 0;
  const benchResources =
    vendors?.reduce(
      (sum, v) => sum + (parseInt(v.benchSize?.toString() || "0", 10) || 0),
      0,
    ) || 0;

  // Placeholder real calculations (0 if missing)
  const expectedRevenue = deals.reduce(
    (sum, d) => sum + (Number(d.revenue_amount) || 0),
    0,
  );
  const collectionsDue = 0;
  const vendorPayables = 0;
  const expectedMargin = expectedRevenue; // Placeholders until real DB logic
  const actualMargin = 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case "admin":
        return {
          title: `Command Center`,
          sub: "Real-time visibility into operational execution and financials.",
        };
      default:
        return {
          title: `Command Center`,
          sub: "Real-time staffing and operational visibility.",
        };
    }
  };

  const welcome = getWelcomeMessage();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {welcome.title}
          </h1>
          <p className="text-slate-500 font-medium mt-1">{welcome.sub}</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              {user?.role} MODE
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Requirements */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-lg">Requirements</h3>
            </div>
            <p className="text-sm text-slate-500">
              Pipeline volume from CRM and OS
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Open
              </p>
              <p className="text-3xl font-black text-slate-900">
                {openRequirements}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Closed
              </p>
              <p className="text-3xl font-black text-slate-900">
                {closedRequirements}
              </p>
            </div>
          </div>
        </div>

        {/* Execution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-lg">Execution</h3>
            </div>
            <p className="text-sm text-slate-500">
              Candidate flow through delivery
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Subs
              </p>
              <p className="text-2xl font-black text-slate-900">
                {totalSubmissions}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Intvws
              </p>
              <p className="text-2xl font-black text-slate-900">
                {interviewsScheduled}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Offers
              </p>
              <p className="text-2xl font-black text-slate-900">
                {offersReleased}
              </p>
            </div>
          </div>
        </div>

        {/* Placements */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl border border-emerald-600 shadow-md flex flex-col gap-6 text-white overflow-hidden relative group">
          <div className="absolute right-0 top-0 opacity-10 w-48 h-48 translate-x-12 -translate-y-12">
            <CheckCircle2 className="w-full h-full text-white" />
          </div>
          <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-100" />
              <h3 className="font-bold text-white text-lg">Placements</h3>
            </div>
            <p className="text-sm text-emerald-100">
              Closed deals and joined candidates
            </p>
          </div>
          <div className="flex items-end justify-between relative z-10 mt-auto">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-1">
                Total
              </p>
              <p className="text-5xl font-black leading-none">{placements}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Intelligence */}
        <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl relative overflow-hidden text-white">
          <div className="absolute right-0 bottom-0 opacity-5 w-48 h-48 translate-x-12 translate-y-12">
            <Handshake className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <h2 className="text-indigo-400 font-black uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
              <Users className="w-4 h-4" /> Vendor Intelligence
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Active Vendors
                </p>
                <p className="text-3xl font-black text-white">
                  {activeVendors}
                </p>
              </div>
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Bench Resources
                </p>
                <p className="text-3xl font-black text-purple-400">
                  {benchResources}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financials (Admin Only) */}
        {user?.role === "admin" ? (
          <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-xl relative overflow-hidden text-white">
            <div className="absolute right-0 bottom-0 opacity-5 w-48 h-48 translate-x-12 translate-y-12">
              <CircleDollarSign className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <h2 className="text-emerald-400 font-black uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Commercials
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Expected Margin
                  </p>
                  <p className="text-3xl font-black text-emerald-400">
                    {expectedMargin === 0
                      ? "₹0"
                      : formatCurrency(expectedMargin)}
                  </p>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Vendor Payables
                  </p>
                  <p className="text-3xl font-black text-rose-400">
                    {vendorPayables === 0
                      ? "₹0"
                      : formatCurrency(vendorPayables)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-[2rem] p-8 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
            <CircleDollarSign className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Commercials Restricted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
