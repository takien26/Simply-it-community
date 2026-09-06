'use client';

import React from 'react';
import { useQuickViewStore, QuickViewEntityType } from '@/lib/quick-view-store';

interface QuickLinkProps {
  type: QuickViewEntityType;
  id?: string | null;
  label?: React.ReactNode;
  subLabel?: string | null;
  avatarUrl?: string | null;
  icon?: string | React.ReactNode | null;
  className?: string;
  badge?: boolean;
  showIcon?: boolean;
  multiline?: boolean;
  maxLines?: number;
  onClickCustom?: (e: React.MouseEvent) => void;
}

const TYPE_ICONS: Record<QuickViewEntityType, string> = {
  user: '👤',
  asset: '💻',
  license: '🔑',
  service: '☁️',
  ticket: '🎫',
  vendor: '🏢',
};

export const QuickLink: React.FC<QuickLinkProps> = ({
  type,
  id,
  label,
  subLabel,
  avatarUrl,
  icon,
  className = '',
  badge = false,
  showIcon = true,
  multiline = false,
  maxLines,
  onClickCustom,
}) => {
  const { openQuickView } = useQuickViewStore();

  if (!id) {
    return <span className="text-slate-400 italic font-normal">{label || '—'}</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClickCustom) {
      onClickCustom(e);
    } else {
      openQuickView(type, id);
    }
  };

  const defaultIcon = icon || TYPE_ICONS[type] || '🔍';

  const isMultiline = multiline || (maxLines !== undefined && maxLines > 1) || className.includes('line-clamp') || className.includes('break-words');
  
  const lineClampClass = maxLines === 2 
    ? 'line-clamp-2' 
    : maxLines === 3 
    ? 'line-clamp-3' 
    : className.includes('line-clamp-3') 
    ? 'line-clamp-3' 
    : className.includes('line-clamp-2') 
    ? 'line-clamp-2' 
    : isMultiline 
    ? 'line-clamp-3' 
    : '';

  const titleText = typeof label === 'string' ? label : typeof id === 'string' ? id : `Bấm để xem nhanh chi tiết ${type}`;

  if (badge) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={titleText}
        className={`inline-flex ${isMultiline ? 'items-start' : 'items-center'} gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:shadow-sm hover:scale-105 active:scale-95 ${
          type === 'user'
            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            : type === 'asset'
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            : type === 'license'
            ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            : type === 'service'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : type === 'vendor'
            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100'
            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
        } ${className}`}
      >
        {showIcon && <span className={isMultiline ? 'mt-0.5 shrink-0' : 'shrink-0'}>{defaultIcon}</span>}
        <span className={isMultiline ? `${lineClampClass} break-words whitespace-normal text-left` : 'truncate'}>{label || id}</span>
      </button>
    );
  }

  return (
    <span
      onClick={handleClick}
      title={titleText}
      className={`${
        isMultiline ? 'inline-block max-w-full text-left' : 'inline-flex items-center gap-1.5'
      } group cursor-pointer text-slate-900 font-semibold hover:text-blue-600 transition-colors ${className}`}
    >
      <span className={`inline-flex ${isMultiline ? 'items-start gap-1 w-full' : 'items-center gap-1.5'} min-w-0`}>
        {showIcon && (
          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-[10px] shrink-0 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors overflow-hidden mt-0.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              defaultIcon
            )}
          </span>
        )}
        <span
          className={`min-w-0 ${
            isMultiline
              ? `${lineClampClass} break-words whitespace-normal leading-snug font-bold group-hover:underline underline-offset-2 decoration-blue-500`
              : 'truncate font-bold group-hover:underline underline-offset-2 decoration-blue-500'
          }`}
        >
          {label || id}
        </span>
      </span>
      {subLabel && (
        <span className={`text-[10px] text-slate-400 font-normal ${isMultiline ? 'block mt-0.5' : 'truncate'} group-hover:text-slate-500`}>
          ({subLabel})
        </span>
      )}
    </span>
  );
};
