'use client';

import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  X,
  Lightbulb,
  AlertTriangle,
  Info,
  ExternalLink,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';

interface KBArticleContentProps {
  content: string;
  className?: string;
}

export function KBArticleContent({ content, className = '' }: KBArticleContentProps) {
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomImageUrl(null);
      }
    };
    if (zoomImageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImageUrl]);

  if (!content) return null;

  // Helper to format inline bold, italic, code, and links
  const renderInlineText = (text: string) => {
    // 1. Escape HTML entities
    const safeText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Inline code: `code`
    let formatted = safeText.replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-[11px] font-bold">$1</code>'
    );

    // 3. Bold: **text**
    formatted = formatted.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-black text-slate-900 dark:text-white">$1</strong>'
    );

    // 4. Italic: *text*
    formatted = formatted.replace(
      /\*(.*?)\*/g,
      '<em class="italic text-slate-700 dark:text-slate-300">$1</em>'
    );

    // 5. Links: [label](url)
    formatted = formatted.replace(
      /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5">$1 <span class="text-[10px]">↗</span></a>'
    );

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Check code block start/end ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        renderedElements.push(
          <div key={`codeblock-${i}`} className="my-3 rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
            <pre>{codeBlockContent.join('\n')}</pre>
          </div>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // Empty line
    if (!trimmed) {
      renderedElements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // 2. Images: ![alt](url) or ![alt|small](url) or ![alt|medium](url) or ![alt|400](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const rawAlt = imgMatch[1];
      const imgUrl = imgMatch[2];

      let caption = rawAlt;
      let containerClass = 'w-full';
      let customMaxWidth: string | undefined = undefined;

      if (rawAlt.includes('|')) {
        const parts = rawAlt.split('|');
        caption = parts[0].trim();
        const sizeTag = parts[1].trim().toLowerCase();

        if (sizeTag === 'small' || sizeTag === 's' || sizeTag === 'nhỏ' || sizeTag === '300') {
          containerClass = 'max-w-sm mx-auto'; // ~384px, ideal for mobile screenshots / vertical popups
        } else if (sizeTag === 'medium' || sizeTag === 'm' || sizeTag === 'vừa' || sizeTag === '600') {
          containerClass = 'max-w-2xl mx-auto'; // ~672px, ideal for medium desktop windows
        } else if (sizeTag === 'large' || sizeTag === 'full' || sizeTag === 'to' || sizeTag === '100%') {
          containerClass = 'w-full';
        } else if (/^\d+(px)?$/.test(sizeTag)) {
          const num = parseInt(sizeTag, 10);
          if (!isNaN(num) && num >= 50 && num <= 1600) {
            customMaxWidth = `${num}px`;
            containerClass = 'mx-auto';
          }
        }
      }

      renderedElements.push(
        <div
          key={`img-${i}`}
          style={customMaxWidth ? { maxWidth: customMaxWidth } : undefined}
          className={`my-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs group relative transition-all ${containerClass}`}
        >
          <div
            className="relative cursor-zoom-in overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2 sm:p-3"
            onClick={() => setZoomImageUrl(imgUrl)}
          >
            <img
              src={imgUrl}
              alt={caption || 'Ảnh minh họa thao tác'}
              className="w-full max-h-[500px] object-contain rounded-xl hover:scale-[1.01] transition-transform duration-200"
              loading="lazy"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomImageUrl(imgUrl);
              }}
              className="absolute top-4 right-4 px-2.5 py-1.5 bg-black/75 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm shadow-md transition-all cursor-pointer opacity-90 group-hover:opacity-100"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Phóng to</span>
            </button>
          </div>
          {caption && caption !== 'Ảnh minh họa' && (
            <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold italic">📸 {caption}</span>
              <span className="text-[10px] text-slate-400">Click ảnh để phóng to toàn màn hình</span>
            </div>
          )}
        </div>
      );
      continue;
    }

    // 3. Callouts: > [!TIP], > 💡, > [!WARNING], > ⚠️, > [!NOTE], > ℹ️
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '').trim();
      const isTip = quoteText.includes('[!TIP]') || quoteText.includes('💡') || quoteText.toLowerCase().includes('mẹo:');
      const isWarning = quoteText.includes('[!WARNING]') || quoteText.includes('⚠️') || quoteText.toLowerCase().includes('cảnh báo:') || quoteText.toLowerCase().includes('lưu ý quan trọng:');
      const isNote = !isTip && !isWarning;

      const cleanQuoteText = quoteText
        .replace(/\[!(TIP|WARNING|NOTE|IMPORTANT|CAUTION)\]/i, '')
        .replace(/^(💡|⚠️|ℹ️)\s*/, '')
        .trim();

      renderedElements.push(
        <div
          key={`callout-${i}`}
          className={`my-3 p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
            isTip
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : isWarning
              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {isTip && <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            {isNote && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-1 font-medium">
            {renderInlineText(cleanQuoteText)}
          </div>
        </div>
      );
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={`h3-${i}`} className="text-sm font-black text-slate-900 dark:text-white mt-5 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>{trimmed.replace(/^###\s*/, '')}</span>
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={`h2-${i}`} className="text-base font-black text-slate-900 dark:text-white mt-6 mb-3 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span>{trimmed.replace(/^##\s*/, '')}</span>
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={`h1-${i}`} className="text-lg font-black text-slate-900 dark:text-white mt-6 mb-3">
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
      continue;
    }

    // 5. Steps (e.g. "Bước 1:", "Bước 2.", "Step 1:", "1. ")
    const stepMatch = trimmed.match(/^(?:Bước|Step)\s*(\d+)[:.]\s*(.*)$/i) || trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (stepMatch) {
      const stepNum = stepMatch[1];
      const stepBody = stepMatch[2];
      renderedElements.push(
        <div
          key={`step-${i}`}
          className="my-3 p-3.5 bg-slate-50/90 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 transition-colors hover:border-blue-300 dark:hover:border-blue-700"
        >
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            {stepNum}
          </div>
          <div className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pt-0.5">
            {renderInlineText(stepBody)}
          </div>
        </div>
      );
      continue;
    }

    // 6. Bullet lists (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listContent = trimmed.replace(/^[-*]\s*/, '');
      renderedElements.push(
        <div key={`list-${i}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
          <div className="flex-1">
            {renderInlineText(listContent)}
          </div>
        </div>
      );
      continue;
    }

    // 7. Regular paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1.5 font-medium">
        {renderInlineText(trimmed)}
      </p>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {renderedElements}

      {/* LIGHTBOX FULL-SIZE ZOOM MODAL */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[95vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-3 text-white px-2">
              <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-blue-400" />
                <span>Xem ảnh chi tiết (Bấm Esc hoặc nhấp ra ngoài để đóng)</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={zoomImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở tab mới</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomImageUrl(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[85vh] w-full flex items-center justify-center p-2">
              <img
                src={zoomImageUrl}
                alt="Ảnh phóng to"
                className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
