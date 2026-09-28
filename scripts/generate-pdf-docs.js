// scripts/generate-pdf-docs.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const DOCS_DIR = path.resolve(__dirname, '..', 'docs');
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function markdownToHtml(md, title) {
  // Simple & clean markdown converter
  let html = md;

  // Escape HTML characters in code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const safeCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<pre><code class="language-${lang}">${safeCode}</code></pre>`);
    return placeholder;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const safeCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<code>${safeCode}</code>`;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Markdown Tables
  html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (tableText) => {
    const lines = tableText.trim().split(/\r?\n/).filter(l => l.trim().startsWith('|'));
    if (lines.length < 2) return tableText;

    const parseRow = (line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

    const headers = parseRow(lines[0]);
    // check if second line is separator
    const isSep = lines[1].split('|').slice(1, -1).every(c => /^:?-+:?$/.test(c.trim()));
    const bodyStartIndex = isSep ? 2 : 1;

    let res = '<table class="table-styled"><thead><tr>';
    for (const h of headers) {
      res += `<th>${h}</th>`;
    }
    res += '</tr></thead><tbody>';

    for (let i = bodyStartIndex; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      res += '<tr>';
      for (const c of cells) {
        res += `<td>${c}</td>`;
      }
      res += '</tr>';
    }
    res += '</tbody></table>';
    return res;
  });

  // Unordered lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, (match) => `<ul>${match}</ul>`);
  // Clean up nested <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Badges / Images (remove external image badges for clean PDF print)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '');

  // Paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('__CODE_BLOCK_')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  // Restore code blocks
  codeBlocks.forEach((cb, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, cb);
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    h1 {
      font-size: 20pt;
      color: #1e3a8a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 14px;
    }
    h2 {
      font-size: 14pt;
      color: #1e40af;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      color: #0f172a;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }
    blockquote {
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 8px 14px;
      margin: 12px 0;
      font-size: 10pt;
      color: #334155;
      border-radius: 0 6px 6px 0;
    }
    code {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 9.5pt;
      background: #f1f5f9;
      color: #b91c1c;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      font-family: "Consolas", "Courier New", monospace;
      font-size: 9pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }
    table.table-styled {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    table.table-styled th {
      background-color: #f8fafc;
      color: #1e293b;
      font-weight: 700;
      text-align: left;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
    }
    table.table-styled td {
      border: 1px solid #e2e8f0;
      padding: 7px 10px;
      vertical-align: top;
    }
    table.table-styled tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    ul {
      margin-top: 6px;
      margin-bottom: 12px;
      padding-left: 22px;
    }
    li {
      margin-bottom: 4px;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  ${html}
  <div class="footer">
    <span>Simply IT Community Edition (CE) — Open-Source IT Management</span>
    <span>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</span>
  </div>
</body>
</html>`;
}

const FILES_TO_CONVERT = [
  {
    src: path.resolve(__dirname, '..', 'HUONG_DAN_TRIEN_KHAI_PRODUCTION.md'),
    dest: path.resolve(DOCS_DIR, 'HUONG_DAN_TRIEN_KHAI_PRODUCTION.pdf'),
    title: 'Cẩm Nang Triển Khai Máy Chủ Production - Simply IT CE',
  },
  {
    src: path.resolve(__dirname, '..', 'HUONG_DAN_QUAN_TRI_VAN_HANH.md'),
    dest: path.resolve(DOCS_DIR, 'HUONG_DAN_QUAN_TRI_VAN_HANH.pdf'),
    title: 'Sổ Tay Quản Trị & Vận Hành IT - Simply IT CE',
  },
  {
    src: path.resolve(__dirname, '..', 'README.md'),
    dest: path.resolve(DOCS_DIR, 'GIOI_THIEU_HE_THONG_SIMPLY_IT.pdf'),
    title: 'Giới Thiệu Hệ Thống Simply IT Community Edition',
  },
];

console.log('📄 Bắt đầu chuyển đổi tài liệu Markdown sang PDF chuyên nghiệp...\n');

FILES_TO_CONVERT.forEach((item) => {
  if (!fs.existsSync(item.src)) {
    console.warn(`⚠️ Không tìm thấy file: ${item.src}`);
    return;
  }

  const mdContent = fs.readFileSync(item.src, 'utf-8');
  const htmlContent = markdownToHtml(mdContent, item.title);

  const tempHtmlPath = path.resolve(DOCS_DIR, `temp_${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    const cmd = `"${EDGE_PATH}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${item.dest}" "${tempHtmlPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ Đã xuất thành công PDF: ${path.basename(item.dest)} (${Math.round(fs.statSync(item.dest).size / 1024)} KB)`);
  } catch (err) {
    console.error(`❌ Lỗi khi xuất PDF cho ${item.src}:`, err.message);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
});

console.log('\n🎉 Hoàn tất xuất toàn bộ tài liệu PDF tại thư mục: docs/');
