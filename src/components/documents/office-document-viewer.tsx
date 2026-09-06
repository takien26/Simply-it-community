'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Table as TableIcon,
  Presentation,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

interface OfficeDocumentViewerProps {
  url: string;
  fileName: string;
  className?: string;
}

export function OfficeDocumentViewer({ url, fileName, className = '' }: OfficeDocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState(false);

  // Word State
  const [docParagraphs, setDocParagraphs] = useState<string[]>([]);
  const [docTables, setDocTables] = useState<string[][][]>([]);

  // Excel State
  const [sheets, setSheets] = useState<{ name: string; rows: any[][] }[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [tableSearch, setTableSearch] = useState('');

  // PPTX State
  const [slides, setSlides] = useState<{ slideNumber: number; title: string; texts: string[] }[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const lowerName = fileName.toLowerCase();
  const isWord = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
  const isExcel =
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv');
  const isPpt = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt');

  useEffect(() => {
    loadFileContent();
  }, [url, fileName]);

  const loadFileContent = async () => {
    setLoading(true);
    setParseError(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Không thể tải tệp');
      const buffer = await res.arrayBuffer();

      if (isExcel) {
        await parseExcel(buffer);
      } else if (lowerName.endsWith('.docx')) {
        await parseDocx(buffer);
      } else if (lowerName.endsWith('.pptx')) {
        await parsePptx(buffer);
      } else {
        throw new Error('Unsupported format');
      }
    } catch {
      setParseError(true);
    } finally {
      setLoading(false);
    }
  };

  /* ── EXCEL ── */
  const parseExcel = async (buffer: ArrayBuffer) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const parsed: { name: string; rows: any[][] }[] = [];
    wb.eachSheet((sheet) => {
      const rows: any[][] = [];
      sheet.eachRow((row) => {
        const vals = Array.isArray(row.values)
          ? row.values.slice(1).map((v: any) => {
              if (v === null || v === undefined) return '';
              if (typeof v === 'object' && 'result' in v) return v.result ?? '';
              if (typeof v === 'object' && 'text' in v) return v.text ?? '';
              return String(v);
            })
          : [];
        rows.push(vals);
      });
      parsed.push({ name: sheet.name, rows });
    });
    setSheets(parsed);
    setActiveSheetIdx(0);
  };

  /* ── WORD DOCX ── */
  const parseDocx = async (buffer: ArrayBuffer) => {
    const JSZipCtor: any = (JSZip as any).default || JSZip;
    const zip = new JSZipCtor();
    const loaded = await zip.loadAsync(buffer);
    const docFile = loaded.file('word/document.xml');
    if (!docFile) throw new Error('No document.xml');
    const xml: string = await docFile.async('string');

    // Tables
    const tables: string[][][] = [];
    const tblMatches = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
    tblMatches.forEach((tblXml) => {
      const rows: string[][] = [];
      (tblXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || []).forEach((trXml) => {
        const cells: string[] = [];
        (trXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || []).forEach((tcXml) => {
          const texts = (tcXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []).map((t) =>
            t.replace(/<[^>]+>/g, '')
          );
          cells.push(texts.join(' ').trim());
        });
        if (cells.some((c) => c)) rows.push(cells);
      });
      if (rows.length) tables.push(rows);
    });
    setDocTables(tables);

    // Remove table XML to avoid duplicate text then extract paragraphs
    const xmlNoTbl = xml.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, '');
    const paragraphs: string[] = [];
    (xmlNoTbl.match(/<w:p[\s\S]*?<\/w:p>/g) || []).forEach((pXml) => {
      const texts = (pXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []).map((t) =>
        t.replace(/<[^>]+>/g, '')
      );
      const line = texts.join(' ').trim();
      if (line) paragraphs.push(line);
    });
    setDocParagraphs(paragraphs);
  };

  /* ── PPTX ── */
  const parsePptx = async (buffer: ArrayBuffer) => {
    const JSZipCtor: any = (JSZip as any).default || JSZip;
    const zip = new JSZipCtor();
    const loaded = await zip.loadAsync(buffer);
    const slideFiles = Object.keys(loaded.files)
      .filter((k) => k.startsWith('ppt/slides/slide') && k.endsWith('.xml'))
      .sort((a, b) => {
        const n = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
        return n(a) - n(b);
      });

    const parsed: { slideNumber: number; title: string; texts: string[] }[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const sf = loaded.file(slideFiles[i]);
      if (sf) {
        const xml: string = await sf.async('string');
        const texts = (xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .filter((t) => t.trim());
        parsed.push({ slideNumber: i + 1, title: texts[0] || `Slide ${i + 1}`, texts: texts.slice(1) });
      }
    }
    setSlides(parsed);
    setActiveSlideIdx(0);
  };

  /* ─────────────────────────── RENDER ─────────────────────────── */

  return (
    <div className={`flex flex-col h-full bg-white text-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {isWord && <FileText className="w-4 h-4 text-blue-400 shrink-0" />}
          {isExcel && <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />}
          {isPpt && <Presentation className="w-4 h-4 text-orange-400 shrink-0" />}
          {!isWord && !isExcel && !isPpt && <FileText className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="text-xs font-semibold text-white truncate">{fileName}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {parseError && (
            <button
              type="button"
              onClick={loadFileContent}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-500/30"
            >
              <RefreshCw className="w-3 h-3" />
              Thử lại
            </button>
          )}
          <a
            href={url}
            download={fileName}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-semibold border border-white/10 transition-colors"
            title="Tải về máy tính"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải về</span>
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        {/* ── LOADING ── */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Đang tải tài liệu...</p>
          </div>
        )}

        {/* ── PARSE ERROR / UNSUPPORTED ── */}
        {!loading && parseError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
              <AlertCircle className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Không thể xem trực tiếp</p>
              <p className="text-xs text-slate-400 mt-1">
                Định dạng <strong>.{lowerName.split('.').pop()}</strong> chưa hỗ trợ xem trực tiếp.
              </p>
            </div>
            <a
              href={url}
              download={fileName}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Download className="w-4 h-4" />
              Tải về để mở trên máy tính
            </a>
          </div>
        )}

        {/* ── EXCEL ── */}
        {!loading && !parseError && isExcel && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Sheet Tabs + Search */}
            <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto">
                {sheets.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setActiveSheetIdx(i); setTableSearch(''); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                      activeSheetIdx === i
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <TableIcon className="w-3 h-3" />
                    {s.name}
                    <span className={`text-[10px] font-normal ${activeSheetIdx === i ? 'text-emerald-100' : 'text-slate-400'}`}>
                      ({s.rows.length})
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Lọc dữ liệu..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-40"
                />
              </div>
            </div>

            {/* Table Data */}
            <div className="flex-1 overflow-auto">
              {sheets[activeSheetIdx]?.rows.length ? (
                <table className="min-w-full text-xs border-collapse">
                  <tbody>
                    {sheets[activeSheetIdx].rows
                      .filter((r) =>
                        tableSearch
                          ? r.some((c) => String(c).toLowerCase().includes(tableSearch.toLowerCase()))
                          : true
                      )
                      .map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx === 0 ? 'bg-slate-900 text-white sticky top-0' : rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80 hover:bg-blue-50/60'}
                        >
                          <td className="px-2.5 py-1.5 border-r border-b border-slate-200 text-[10px] text-slate-400 font-mono text-center w-8 select-none">
                            {rIdx + 1}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3 py-1.5 border-r border-b border-slate-200 whitespace-nowrap ${
                                rIdx === 0 ? 'font-bold text-white text-[11px]' : 'text-slate-800'
                              }`}
                            >
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center p-8 text-slate-400 text-xs">Bảng tính không có dữ liệu.</div>
              )}
            </div>
          </div>
        )}

        {/* ── WORD DOCX ── */}
        {!loading && !parseError && isWord && (
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center bg-slate-200">
            <div className="bg-white text-slate-900 max-w-3xl w-full min-h-full shadow-xl rounded-xl p-8 sm:p-12 space-y-5 border border-slate-300">
              {/* Header */}
              <div className="pb-4 border-b-2 border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">{fileName}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tài liệu Microsoft Word</p>
                </div>
                <FileText className="w-6 h-6 text-blue-600 shrink-0" />
              </div>

              {/* Tables */}
              {docTables.map((tbl, tIdx) => (
                <div key={tIdx} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-800 text-white px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-blue-300" />
                    Bảng biểu #{tIdx + 1}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs divide-y divide-slate-200">
                      <tbody className="divide-y divide-slate-100">
                        {tbl.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 border-r border-slate-200 text-slate-800 whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Paragraphs */}
              <div className="space-y-2">
                {docParagraphs.map((p, idx) => (
                  <p key={idx} className="text-xs text-slate-800 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PPTX ── */}
        {!loading && !parseError && isPpt && (
          <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Nav */}
            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white">
                <Presentation className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold">
                  Slide {activeSlideIdx + 1} / {slides.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activeSlideIdx <= 0}
                  onClick={() => setActiveSlideIdx((p) => Math.max(0, p - 1))}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={activeSlideIdx >= slides.length - 1}
                  onClick={() => setActiveSlideIdx((p) => Math.min(slides.length - 1, p + 1))}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide Canvas */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
              {slides[activeSlideIdx] ? (
                <div className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-10 shadow-2xl flex flex-col gap-5 aspect-video justify-center">
                  <h3 className="text-lg font-black text-white border-b border-white/10 pb-3">
                    {slides[activeSlideIdx].title}
                  </h3>
                  <div className="space-y-2 text-xs text-slate-300">
                    {slides[activeSlideIdx].texts.map((t, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5 shrink-0">▸</span>
                        {t}
                      </p>
                    ))}
                  </div>
                  <p className="text-right text-[10px] text-slate-600 font-mono">#{slides[activeSlideIdx].slideNumber}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Không có slide</p>
              )}
            </div>

            {/* Slide Strip */}
            {slides.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/60 border-t border-slate-800 overflow-x-auto shrink-0">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideIdx(i)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeSlideIdx === i
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {s.slideNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
