'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Wrench,
  Archive,
  HelpCircle,
  ShieldCheck,
  Laptop,
  Server,
  Smartphone,
  Tag,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
} from 'lucide-react';

interface StatusIconProps {
  status: string;
  className?: string;
  size?: number;
}

export const StatusIcon = React.memo(function StatusIcon({
  status,
  className = 'w-4 h-4',
  size = 16,
}: StatusIconProps) {
  const norm = (status || '').toUpperCase();

  switch (norm) {
    case 'AVAILABLE':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'RESOLVED':
    case 'CLOSED':
    case 'PAID':
      return <CheckCircle2 size={size} className={className || 'text-emerald-500'} />;

    case 'IN_USE':
    case 'ASSIGNED':
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'EXPIRING':
      return <Clock size={size} className={className || 'text-blue-500'} />;

    case 'MAINTENANCE':
    case 'UNDER_REPAIR':
      return <Wrench size={size} className={className || 'text-amber-500'} />;

    case 'EXPIRED':
    case 'OVERDUE':
    case 'FAILED':
    case 'LOST':
    case 'BROKEN':
      return <AlertTriangle size={size} className={className || 'text-rose-500'} />;

    case 'RETIRED':
    case 'CANCELLED':
    case 'SUSPENDED':
      return <Archive size={size} className={className || 'text-slate-400'} />;

    case 'URGENT':
    case 'CRITICAL':
      return <XCircle size={size} className={className || 'text-red-600'} />;

    default:
      return <HelpCircle size={size} className={className || 'text-slate-400'} />;
  }
});

export const EntityIcon = React.memo(function EntityIcon({
  type,
  className = 'w-4 h-4',
  size = 16,
}: {
  type: string;
  className?: string;
  size?: number;
}) {
  const norm = (type || '').toUpperCase();

  switch (norm) {
    case 'LAPTOP':
    case 'COMPUTER':
    case 'PC':
      return <Laptop size={size} className={className} />;
    case 'SERVER':
      return <Server size={size} className={className} />;
    case 'MOBILE':
    case 'PHONE':
      return <Smartphone size={size} className={className} />;
    case 'LICENSE':
      return <ShieldCheck size={size} className={className} />;
    case 'CONTRACT':
    case 'INVOICE':
      return <FileText size={size} className={className} />;
    case 'FINANCE':
      return <DollarSign size={size} className={className} />;
    case 'USER':
      return <UserCheck size={size} className={className} />;
    case 'COMPANY':
      return <Building2 size={size} className={className} />;
    default:
      return <Tag size={size} className={className} />;
  }
});
