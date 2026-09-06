'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  QrCode,
  CheckSquare,
  Square,
  Search,
  Filter,
} from 'lucide-react';

interface BatchQrPrintModalProps {
  assets: any[];
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
}

export function BatchQrPrintModal({
  assets,
  isOpen,
  onClose,
  companyName: propCompanyName,
}: BatchQrPrintModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [displayCompanyName, setDisplayCompanyName] = useState<string>(propCompanyName || 'CÔNG TY');
  const [search, setSearch] = useState('');

  // Generate QR codes for all assets on mount
  useEffect(() => {
    if (isOpen && assets.length > 0) {
      // default select all
      setSelectedAssetIds(assets.map((a) => a.id));

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

          const newMap: Record<string, string> = {};
          Promise.all(
            assets.map((a) => {
              const scanUrl = `${baseUrl}/scan/${encodeURIComponent(a.assetTag)}`;
              return QRCode.toDataURL(scanUrl, {
                width: 180,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
              }).then((url) => {
                newMap[a.id] = url;
              });
            })
          ).then(() => {
            setQrMap(newMap);
          });
        })
        .catch(() => {
          const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          const newMap: Record<string, string> = {};
          Promise.all(
            assets.map((a) => {
              const scanUrl = `${appUrl}/scan/${encodeURIComponent(a.assetTag)}`;
              return QRCode.toDataURL(scanUrl, {
                width: 180,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
              }).then((url) => {
                newMap[a.id] = url;
              });
            })
          ).then(() => {
            setQrMap(newMap);
          });
        });
    }
  }, [isOpen, assets, propCompanyName]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((i) => i !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handlePrintBatch = () => {
    const selectedAssets = assets.filter((a) => selectedAssetIds.includes(a.id));
    if (selectedAssets.length === 0) {
      alert('Vui lòng chọn ít nhất 1 tài sản để in');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Vui lòng cho phép popup để in tem nhãn');
      return;
    }

    const labelsHtml = selectedAssets
      .map((asset) => {
        const qrUrl = qrMap[asset.id] || '';
        return `
          <div class="label-card">
            <div class="header">${displayCompanyName}</div>
            <div class="content">
              <img src="${qrUrl}" class="qr-img" />
              <div class="info">
                <div class="tag-code">${asset.assetTag}</div>
                <div class="asset-name">${asset.name}</div>
                <div>SN: <strong>${asset.serialNumber || '—'}</strong></div>
              </div>
            </div>
            <div class="footer">Quét mã QR để kiểm tra & cập nhật thông tin</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Danh Sách Tem Nhãn Tài Sản (${selectedAssets.length} Tem)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6mm;
              box-sizing: border-box;
            }
            .label-card {
              border: 1.5px solid #000;
              border-radius: 4px;
              padding: 4px 6px;
              height: 38mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .header {
              font-size: 7.5pt;
              font-weight: bold;
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
              text-transform: uppercase;
            }
            .content {
              display: flex;
              align-items: center;
              gap: 6px;
              margin: 2px 0;
            }
            .qr-img {
              width: 22mm;
              height: 22mm;
              flex-shrink: 0;
            }
            .info {
              flex: 1;
              font-size: 6.8pt;
              line-height: 1.2;
              overflow: hidden;
            }
            .tag-code {
              font-size: 9pt;
              font-weight: 900;
              font-family: monospace;
            }
            .asset-name {
              font-weight: bold;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .footer {
              font-size: 5.5pt;
              text-align: center;
              border-top: 0.5px solid #aaa;
              padding-top: 1px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${labelsHtml}
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

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(search.toLowerCase()) ||
      (a.category?.name && a.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <span>In Tem Nhãn QR Hàng Loạt (Khổ A4 / Decal)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chọn danh sách các thiết bị cần in tem barcode/QR để dán quản lý đồng loạt
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Select All */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tài sản cần in tem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedAssetIds(assets.map((a) => a.id))}
              className="text-blue-600 font-semibold hover:underline text-[11px]"
            >
              Chọn tất cả ({assets.length})
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSelectedAssetIds([])}
              className="text-slate-500 hover:underline text-[11px]"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Assets List */}
        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1 bg-slate-50/50">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);
            const qr = qrMap[asset.id];
            return (
              <div
                key={asset.id}
                onClick={() => toggleSelect(asset.id)}
                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center space-x-3 text-xs">
                  <div className="text-blue-600">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                  {qr && <img src={qr} alt="QR" className="w-7 h-7 shrink-0 border rounded p-0.5 bg-white" />}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded text-[10px]">
                        {asset.assetTag}
                      </span>
                      <span className="font-bold text-slate-900">{asset.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {asset.category?.name} • SN: {asset.serialNumber || '—'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500">
                  {asset.assignments?.[0]?.user?.fullName || 'Trong kho'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs">
            <span className="text-slate-500">Đã chọn để in: </span>
            <strong className="text-blue-700 font-bold">{selectedAssetIds.length}</strong> / {assets.length} tem
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
            >{isEn ? 'Cancel' : 'Hủy'}</button>
            <button
              type="button"
              disabled={selectedAssetIds.length === 0}
              onClick={handlePrintBatch}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In Hàng Loạt ({selectedAssetIds.length} Tem)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchQrPrintModal;
