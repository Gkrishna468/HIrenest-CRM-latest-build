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
  Trophy,
  CheckCircle2,
  Layers
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    title: "Intelligence",
    items: [
       { icon: LayoutDashboard, label: 'Command Center', path: '/' },
       { icon: Layers, label: 'Workspaces', path: '/workspaces' },
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
       { icon: CheckCircle2, label: 'Offers', path: '/offers' },
       { icon: Trophy, label: 'Placements', path: '/placements' },
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
       { icon: TrendingUp, label: 'AI Operations', path: '/ai-accuracy' },
       { icon: ShieldCheck, label: 'Governance', path: '/migration' },
       { icon: Settings, label: 'Settings', path: '/settings' },
    ]
  }
];

export function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 bg-slate-200/50 text-slate-700 flex flex-col h-screen sticky top-0 border-r border-slate-300 shadow-[1px_0_0_white]">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.2)]">
          <Zap className="text-white w-5 h-5 fill-current drop-shadow-md" />
        </div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight" style={{textShadow: '0 1px 1px white'}}>
          HireNestOS
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {navGroups.map((group, index) => {
          if (group.adminOnly && user?.role !== "admin") return null;

          return (
            <div key={index}>
              {group.title && (
                <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-2" style={{textShadow: '0 1px 0 rgba(255,255,255,0.8)'}}>
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
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group font-bold font-sans",
                        isActive
                          ? "skeuo-btn-primary text-white"
                          : "hover:bg-slate-300/50 hover:text-slate-900 text-slate-600 border border-transparent shadow-[inset_0_1px_0_transparent]",
                      )
                    }
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4",
                        "group-hover:scale-110 transition-transform drop-shadow-sm",
                      )}
                    />
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-300 space-y-4 shadow-[0_-1px_0_white]">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 font-black text-xs uppercase shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_1px_white] border border-slate-300">
            {user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800 truncate" style={{textShadow: '0 1px 0 white'}}>
              {user?.name}
            </p>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase truncate">
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-300/50 hover:text-slate-900 transition-colors group"
        >
          <LogOut className="w-5 h-5 drop-shadow-sm" />
          <span className="font-bold text-sm" style={{textShadow: '0 1px 0 white'}}>Sign Out</span>
        </button>

        <div className="px-3 pt-2">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_1px_white] bg-green-50/50 text-green-700 border-green-300"
            style={{textShadow: '0 1px 0 rgba(255,255,255,0.7)'}}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse shadow-inner border bg-green-500 border-green-600"
            />
            Firebase SSOT Active
          </div>
        </div>
      </div>
    </aside>
  );
}
