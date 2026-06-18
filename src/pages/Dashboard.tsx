/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Briefcase, 
  Users, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock,
  CircleDollarSign,
  Zap,
  ShieldCheck,
  BarChart3,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { jobs, clients, vendors, deals } = useData();
  const { user } = useAuth();
  
  const totalRevenue = deals.reduce((sum, d) => sum + (Number(d.revenue_amount) || 0), 0);
  const closedDeals = deals.filter(d => d.status === 'placed')?.length;
  // Stubbing additional stat values. For a real dashboard, these would derive from the data sets.
  const activeFollowUps = 5;
  const submissionsDue = 12;
  const overdueTasks = 1;
  const newComms = 3;

  // Founder/CEO Business Health Score calculation
  const healthScore = useMemo(() => {
    const revenueHealth = deals.filter(d => d.stage === 'closed_won')?.length > 0 ? 100 : 85;
    const vendorActivity = vendors?.length > 0 ? 95 : 70;
    const reqVelocity = jobs.filter(j => j.status === 'open')?.length > 0 ? 90 : 80;
    return Math.round((revenueHealth + vendorActivity + reqVelocity) / 3);
  }, [deals, vendors, jobs]);

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'admin': return { title: `Command Center`, sub: 'Executive overview, pipeline visibility, and ecosystem health.' };
      case 'client_manager': return { title: `Account Manager Workspace`, sub: 'Managing your active accounts and fulfilling requirements.' };
      case 'vendor_manager': return { title: `Vendor Workspace`, sub: 'Tracking vendor engagement, submissions, and SLA compliance.' };
      default: return { title: `Welcome to HireNest CRM`, sub: 'Enterprise Relationship Management' };
    }
  };

  const welcome = getWelcomeMessage();

  const stats = [
    { label: 'Active Accounts', value: clients?.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Open Requirements', value: jobs?.length, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Active Vendors', value: vendors?.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Revenue Forecast', value: `$${totalRevenue.toLocaleString()}`, icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Follow-ups Due Today', value: activeFollowUps, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{welcome.title}</h1>
          <p className="text-slate-500 font-medium mt-1">{welcome.sub}</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{user?.role} MODE</span>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl border border-indigo-900 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-indigo-200 font-semibold uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Founder Executive View
              </h2>
              <h3 className="text-4xl text-white font-black tracking-tight mb-2">Business Health Score</h3>
              <p className="text-indigo-200 mt-2 max-w-lg text-sm leading-relaxed">
                 Aggregate index derived from Revenue Velocity, Vendor Engagement, and Requirement Pipeline Flow.
              </p>
            </div>
            <div className="flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl w-32 h-32 md:w-36 md:h-36 border-4 border-indigo-500/30 shrink-0">
              <span className="text-5xl font-black text-white">{healthScore}</span>
              <span className="text-indigo-300 text-sm font-bold ml-1 mb-4">/100</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={stat.bg + " p-3 rounded-xl transition-transform group-hover:scale-110"}>
                <stat.icon className={stat.color + " w-6 h-6"} />
              </div>
              <ArrowUpRight className="text-slate-300 group-hover:text-slate-900 transition-colors" />
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900">Recent CRM Events</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live Feed
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <div className="divide-y divide-slate-50">
              {/* Dummy Events for CRM Timeline */}
              <div className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-medium">Auto-generated follow-up: Vendor Supply Review</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 font-mono uppercase">system_event</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400 italic">Just now</span>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-medium">Revenue state shifted: Interview Scheduled for Azure Dev</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 font-mono uppercase">system_event</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400 italic">5 min ago</span>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-medium">New Account created: Scope Softtech</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 font-mono uppercase">user_action</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400 italic">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Revenue Potential</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Current active pipeline stands at <strong>${totalRevenue.toLocaleString()}</strong> across {jobs?.length} requirements. Priority fulfillment focus required on 3 stale accounts. 
              </p>
              <button 
                onClick={() => window.location.href = '/revenue'}
                className="w-full bg-white text-slate-900 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                Open Deal Room
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0">
              <ShieldCheck className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Pipeline Velocity</h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-5">
              {[
                { label: 'Submission Conversion', value: 34, color: 'bg-emerald-500' },
                { label: 'Interview to Offer', value: 68, color: 'bg-blue-500' },
                { label: 'Offer to Placement', value: 92, color: 'bg-indigo-500' },
              ].map(stat => (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span>{stat.label}</span>
                    <span className="text-slate-900">{stat.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={stat.color + " h-full rounded-full transition-all duration-1000"} style={{ width: `${stat.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => window.location.href = '/reports'}
              className="w-full mt-6 py-3 text-[10px] font-black text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-3 h-3" />
              View Full Analytics
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Account', path: '/accounts', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { label: 'New Requirement', path: '/requirements', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                { label: 'Follow-ups', path: '/follow-ups', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
                { label: 'Engage Vendors', path: '/vendors', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
              ].map(link => (
                <button 
                  key={link.label} 
                  onClick={() => window.location.href = link.path}
                  className={link.color + " p-3 text-sm font-semibold rounded-xl text-center transition-colors"}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stub for Bot icon since it might not be in sidebar list but likely in lucide
const Bot = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="10" x="3" y="11" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" x2="8" y1="16" y2="16" /><line x1="16" x2="16" y1="16" y2="16" /></svg>
);
