const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const next = require('next');
const selfsigned = require('selfsigned');

process.on('uncaughtException', (err) => {
  console.error('🔥 [Server Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [Server Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
};

function serveUploadsDirect(req, res) {
  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/uploads/')) {
    const relativePath = decodeURIComponent(urlPath.replace('/uploads/', ''));
    const safePath = path.join(__dirname, 'public', 'uploads', relativePath.replace(/^(\.\.(\/|\\))+/, ''));
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      fs.createReadStream(safePath).pipe(res);
      return true;
    }
  }
  return false;
}

async function initServer() {
  const certDir = path.join(__dirname, '.certificates');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const keyPath = path.join(certDir, 'localhost.key');
  const certPath = path.join(certDir, 'localhost.crt');

  let pems;
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    pems = {
      private: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
    };
  } else {
    console.log('🔐 Generating self-signed SSL certificate for HTTPS mobile camera...');
    const attrs = [{ name: 'commonName', value: '192.168.144.198' }];
    const pemsGen = await selfsigned.generate(attrs, {
      algorithm: 'sha256',
      days: 365,
      keySize: 2048,
      extensions: [
        {
          name: 'basicConstraints',
          cA: true,
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
            { type: 7, ip: '192.168.144.198' },
            { type: 7, ip: '192.168.1.12' },
          ],
        },
      ],
    });

    fs.writeFileSync(keyPath, pemsGen.private, 'utf8');
    fs.writeFileSync(certPath, pemsGen.cert, 'utf8');
    pems = pemsGen;
    console.log('✅ SSL certificate generated at:', certDir);
  }

  const httpsOptions = {
    key: pems.private,
    cert: pems.cert,
  };

  await app.prepare();

  function setupNoCache(req, res) {
    const isHtml = req.headers.accept && req.headers.accept.includes('text/html');
    const isApi = req.url && req.url.startsWith('/api/');
    const isRsc = req.headers['rsc'] || (req.headers.accept && req.headers.accept.includes('text/x-component'));

    if (isHtml || isApi || isRsc) {
      const origSetHeader = res.setHeader.bind(res);
      res.setHeader = function (name, value) {
        if (name.toLowerCase() === 'cache-control') {
          return origSetHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }
        return origSetHeader(name, value);
      };
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }

  const HTTP_PORT = parseInt(process.env.PORT || '3001', 10);
  const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3444', 10);

  // 1. HTTP Server
  const httpServer = http.createServer((req, res) => {
    if (serveUploadsDirect(req, res)) return;
    setupNoCache(req, res);
    handle(req, res);
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 Simply IT [Community Edition] HTTP Server running on:`);
    console.log(`   - Local:   http://localhost:${HTTP_PORT}`);
  });

  // 2. HTTPS Server
  const httpsServer = https.createServer(httpsOptions, (req, res) => {
    if (serveUploadsDirect(req, res)) return;
    setupNoCache(req, res);
    handle(req, res);
  });

  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 Simply IT [Community Edition] HTTPS Server running on:`);
    console.log(`   - Local:   https://localhost:${HTTPS_PORT}`);
  });

  // 3. Automated Daily Alert Job (Runs in background, scans once per day)
  let lastDailyAlertDate = '';
  function triggerDailyAlertScan() {
    const today = new Date().toISOString().split('T')[0];
    if (lastDailyAlertDate === today) return;
    try {
      const req = http.request(`http://127.0.0.1:${HTTP_PORT}/api/cron/alert-scanner?run=true`, (res) => {
        if (res.statusCode === 200) {
          lastDailyAlertDate = today;
          console.log(`🔔 [Alert Engine] Daily alert scan completed successfully for ${today}`);
        }
      });
      req.on('error', () => {});
      req.end();
    } catch (e) {}
  }

  // Initial check 45s after startup, then check every hour
  setTimeout(triggerDailyAlertScan, 45000);
  setInterval(triggerDailyAlertScan, 60 * 60 * 1000);

  // 4. Automated Inbound Email-to-Ticket Poller (Runs in background every 2 minutes)
  function triggerEmailInboundPolling() {
    try {
      const req = http.request(`http://127.0.0.1:${HTTP_PORT}/api/cron/email-inbound?run=true`, (res) => {
        // Background polling silent response
      });
      req.on('error', () => {});
      req.end();
    } catch (e) {}
  }

  // Initial check 30s after startup, then check every 2 minutes
  setTimeout(triggerEmailInboundPolling, 30000);
  setInterval(triggerEmailInboundPolling, 2 * 60 * 1000);

  // 5. Automated Ticket Auto-Close Engine (👑 Enterprise - Runs every 6 hours)
  function triggerTicketAutoClose() {
    try {
      const req = http.request(`http://127.0.0.1:${HTTP_PORT}/api/cron/ticket-auto-close?run=true`, (res) => {
        if (res.statusCode === 200) {
          console.log(`⏱️ [Auto-Close Engine] Ticket auto-close check executed successfully.`);
        }
      });
      req.on('error', () => {});
      req.end();
    } catch (e) {}
  }

  // Initial check 60s after startup, then check every 6 hours
  setTimeout(triggerTicketAutoClose, 60000);
  setInterval(triggerTicketAutoClose, 6 * 60 * 60 * 1000);
}

initServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
