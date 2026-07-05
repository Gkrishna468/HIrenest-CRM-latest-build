/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Mail,
  Briefcase,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavBar() {
  const items = [
    { icon: LayoutDashboard, label: "Cockpit", path: "/" },
    { icon: Layers, label: "Rooms", path: "/workspaces" },
    { icon: Mail, label: "MailOS", path: "/mail" },
    { icon: Briefcase, label: "Execution", path: "/requirements" },
    { icon: Handshake, label: "Vendors", path: "/vendors" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50 flex items-center justify-around px-2 pb-safe">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-slate-500 font-sans gap-1",
              isActive 
                ? "text-indigo-600 font-black scale-105" 
                : "hover:text-slate-900"
            )
          }
        >
          {({ isActive }) => {
            const Icon = item.icon;
            return (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive ? "bg-indigo-50 shadow-inner border border-indigo-100" : ""
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
