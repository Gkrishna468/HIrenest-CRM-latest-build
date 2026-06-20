/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  FileText,
  Zap,
  Settings,
  LogOut,
  History,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Handshake,
  BrainCircuit,
  Mail,
  Database,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

const navGroups = [
  {
    title: "Intelligence",
    items: [
       { icon: LayoutDashboard, label: 'Command Center', path: '/' },
       { icon: BrainCircuit, label: 'AI Agents', path: '/agents' },
       { icon: Database, label: 'Knowledge Vault', path: '/knowledge-vault' },
    ]
  },
  {
    title: "MailOS",
    items: [
       { icon: Mail, label: 'Inbox', path: '/mail' },
    ]
  },
  {
    title: "Execution",
    items: [
       { icon: Briefcase, label: 'Requirements', path: '/requirements' },
       { icon: Users, label: 'Candidates', path: '/candidates' },
       { icon: FileText, label: 'Submissions', path: '/submissions' },
       { icon: MessageSquare, label: 'Interviews', path: '/interviews' },
       { icon: ShieldCheck, label: 'Offers', path: '/offers' },
       { icon: LayoutDashboard, label: 'Placements', path: '/placements' },
    ]
  },
  {
    title: "Vendor Network",
    items: [
       { icon: Handshake, label: 'Vendors', path: '/vendors' },
    ]
  },
  {
    title: "CRM",
    items: [
       { icon: Building2, label: 'Clients', path: '/accounts' },
       { icon: Users, label: 'Contacts', path: '/contacts' },
    ]
  },
  {
    title: "Intelligence & Ops",
    adminOnly: true,
    items: [
       { icon: Zap, label: 'Financials', path: '/revenue' },
       { icon: TrendingUp, label: 'Analytics', path: '/ai-accuracy' },
       { icon: ShieldCheck, label: 'Governance', path: '/migration' },
       { icon: Settings, label: 'Settings', path: '/settings' },
    ]
  }
];

export function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          HireNestOS
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {navGroups.map((group, index) => {
          if (group.adminOnly && user?.role !== "admin") return null;

          return (
            <div key={index}>
              {group.title && (
                <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : "hover:bg-slate-800 hover:text-white text-slate-300",
                      )
                    }
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4",
                        "group-hover:scale-110 transition-transform",
                      )}
                    />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
            {user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.name}
            </p>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase truncate">
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>

        <div className="px-3 pt-2">
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border",
              isSupabaseConfigured()
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20",
            )}
          >
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isSupabaseConfigured() ? "bg-green-400" : "bg-red-400",
              )}
            />
            {isSupabaseConfigured() ? "Cloud Sync Active" : "Offline Mode"}
          </div>
        </div>
      </div>
    </aside>
  );
}
