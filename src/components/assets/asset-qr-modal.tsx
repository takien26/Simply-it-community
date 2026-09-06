'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  QrCode,
  Laptop,
  User,
  Building,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface AssetQrModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
}

export function AssetQrModal({
  asset,
  isOpen,
  onClose,
  companyName: propCompanyName,
}: AssetQrModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [displayCompanyName, setDisplayCompanyName] = useState<string>(propCompanyName || 'CÔNG TY');
  const printRef = useRef<HTMLDivElement>(null);

  const [scanUrl, setScanUrl] = useState<string>('');

  useEffect(() => {
    if (asset && isOpen) {
      // Fetch system configured base server URL and Company Name
      fetch('/api/settings')
        .then((r) => r.json())
        .then((res) => {
          let baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          if (res.success && Array.isArray(res.data)) {
            const serverSetting = res.data.find((s: any) => s.key === 'app.server_url');
            const compSetting = res.data.find((s: any) => s.key === 'app.company_name');
            const appSetting = res.data.find((s: any) => s.key === 'app.name');

            if (serverSetting?.value) {
              baseUrl = serverSetting.value.trim().replace(/\/+$/, '');
            }

            if (compSetting?.value) {
              const comp = compSetting.value.trim().toUpperCase();
              const app = (appSetting?.value || 'IT ASSET').trim().toUpperCase();
              setDisplayCompanyName(comp.includes('IT') ? comp : `${comp} - ${app}`);
            } else if (propCompanyName) {
              setDisplayCompanyName(propCompanyName.toUpperCase());
            }
          }

          const targetUrl = `${baseUrl}/scan/${encodeURIComponent(asset.assetTag)}`;
          setScanUrl(targetUrl);

          QRCode.toDataURL(
            targetUrl,
            {
              width: 320,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
              errorCorrectionLevel: 'H',
            },
            (err, url) => {
              if (!err && url) {
                setQrDataUrl(url);
              }
            }
          );
        })
        .catch(() => {
          const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          const targetUrl = `${appUrl}/scan/${encodeURIComponent(asset.assetTag)}`;
          setScanUrl(targetUrl);
          QRCode.toDataURL(targetUrl, { width: 320, margin: 1 }, (err, url) => {
            if (!err && url) setQrDataUrl(url);
          });
        });
    }
  }, [asset, isOpen, propCompanyName]);

  if (!isOpen || !asset) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để in tem nhãn');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Tem Tài Sản - ${asset.assetTag}</title>
          <style>
            @page {
              size: 70mm 45mm;
              margin: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 6px;
              background: #fff;
              color: #000;
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
            }
            .label-card {
              border: 1.5px solid #000;
              border-radius: 6px;
              padding: 6px 8px;
              width: 65mm;
              height: 40mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .content {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 4px 0;
            }
            .qr-img {
              width: 24mm;
              height: 24mm;
            }
            .info {
              flex: 1;
              font-size: 7.5pt;
              line-height: 1.25;
            }
            .tag-code {
              font-size: 10pt;
              font-weight: 900;
              font-family: monospace;
            }
            .asset-name {
              font-weight: bold;
              margin-top: 2px;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .footer {
              font-size: 6.5pt;
              text-align: center;
              border-top: 0.5px solid #ccc;
              padding-top: 2px;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">${displayCompanyName}</div>
            <div class="content">
              <img src="${qrDataUrl}" class="qr-img" />
              <div class="info">
                <div class="tag-code">${asset.assetTag}</div>
                <div class="asset-name">${asset.name}</div>
                <div>Serial: <strong>${asset.serialNumber || '—'}</strong></div>
              </div>
            </div>
            <div class="footer">Quét mã QR để xem cấu hình, hợp đồng & lịch sử bảo trì</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_Tem_${asset.assetTag}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyTag = () => {
    navigator.clipboard.writeText(asset.assetTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span>Tem Nhãn Quản Lý & QR Code</span>
            </h3>
            <p className="text-xs text-slate-500">Mã QR định danh tự động để quét nhanh và in tem dán thiết bị</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE STICKER LABEL CARD PREVIEW */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Xem trước tem dán thiết bị (Nhãn in tiêu chuẩn)
          </p>

          <div
            ref={printRef}
            className="w-full max-w-sm bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-sm space-y-3"
          >
            {/* Sticker Header */}
            <div className="text-center pb-2 border-b border-slate-900 font-extrabold text-xs text-slate-900 uppercase tracking-wide">
              {displayCompanyName}
            </div>

            {/* Sticker Body */}
            <div className="flex items-center space-x-4">
              {/* QR Image */}
              <div className="bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 object-contain" />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">
                    Đang tạo QR...
                  </div>
                )}
              </div>

              {/* Asset Info Details */}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="font-mono text-base font-extrabold text-blue-700 tracking-tight">
                  {asset.assetTag}
                </div>
                <div className="font-bold text-slate-900 line-clamp-2">{asset.name}</div>
                <div className="text-slate-600 font-mono text-[11px]">
                  SN: <span className="font-semibold text-slate-900">{asset.serialNumber || '—'}</span>
                </div>
              </div>
            </div>

            {/* Sticker Footer */}
            <div className="text-center pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-medium">
              Quét QR để xem cấu hình, hợp đồng & lịch sử bảo trì
            </div>
          </div>
        </div>

        {/* Quick Info & Copy Actions */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500">Mã thiết bị: </span>
            <strong className="font-mono text-blue-900">{asset.assetTag}</strong>
            {scanUrl && (
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                Link: {scanUrl}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            {scanUrl && (
              <a
                href={scanUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 flex items-center space-x-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3 text-blue-600" />
                <span>Mở link</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyTag}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center space-x-1 transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Chép mã'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
          >{isEn ? 'Close' : 'Đóng'}</button>

          <button
            type="button"
            onClick={handleDownloadImage}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Tải Ảnh QR (.PNG)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>In Tem Dán Thiết Bị</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssetQrModal;
