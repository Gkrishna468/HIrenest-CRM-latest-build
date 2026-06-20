import React from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, Mail, Building2, UserCircle } from 'lucide-react';

export type SourceType = 'crm' | 'os' | 'mailos' | 'vendor' | 'manual' | 'resume';

interface SourceBadgeProps {
  source: SourceType;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  switch (source) {
    case 'crm':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-200", className)}>
          <Building2 className="w-3 h-3" />
          CRM
        </span>
      );
    case 'os':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700", className)}>
          <Briefcase className="w-3 h-3" />
          OS
        </span>
      );
    case 'manual':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700", className)}>
          <UserCircle className="w-3 h-3" />
          MANUAL
        </span>
      );
    case 'mailos':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-purple-100 text-purple-700", className)}>
          <Mail className="w-3 h-3" />
          MAIL
        </span>
      );
    case 'vendor':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700", className)}>
          <UserCircle className="w-3 h-3" />
          VENDOR
        </span>
      );
    case 'resume':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700", className)}>
          <Briefcase className="w-3 h-3" />
          RESUME
        </span>
      );
    default:
      return null;
  }
}
