/**
 * Local dev server: static site on :3000 with portal routes proxied to Next.js on :3001.
 */
import http from 'node:http';
import net from 'node:net';
import handler from 'serve-handler';

const SITE_PORT = Number(process.env.SITE_PORT || 3000);
const PORTAL_PORT = Number(process.env.PORTAL_PORT || 3001);
const ROOT = new URL('..', import.meta.url).pathname;

const PORTAL_PATH =
  /^\/(?:login|setup|auth\/|dashboard|orders|messages|documents|support|company|settings|notifications|rfq|team|admin(?:\/|$)|api\/|_next\/|__nextjs_font\/|favicon(?:-\d+x\d+)?\.(?:ico|png)|apple-touch-icon\.png)/;

function isPortalRequest(url) {
  return PORTAL_PATH.test(url.split('?')[0]);
}

function proxyToPortal(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${PORTAL_PORT}` };
  delete headers.connection;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: PORTAL_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!DOCTYPE html><html lang="tr"><body style="font-family:system-ui;background:#111;color:#eee;padding:2rem">' +
          '<h1>Müşteri portalı yanıt vermiyor</h1>' +
          '<p>Portal sunucusu (<code>localhost:' +
          PORTAL_PORT +
          '</code>) çalışmıyor olabilir. Kök dizinde <code>npm run dev</code> ile hem site hem portalı başlatın.</p>' +
          '</body></html>'
      );
    }
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!DOCTYPE html><html lang="tr"><body style="font-family:system-ui;background:#111;color:#eee;padding:2rem">' +
          '<h1>Portal sunucusuna bağlanılamadı</h1>' +
          '<p><code>npm run dev</code> komutunun çalıştığından emin olun (portal :' +
          PORTAL_PORT +
          ').</p>' +
          '</body></html>'
      );
    }
  });

  req.pipe(proxyReq);
}

function proxyWebSocket(req, socket, head) {
  const proxySocket = net.connect(PORTAL_PORT, '127.0.0.1', () => {
    const headerLines = Object.entries({
      ...req.headers,
      host: `127.0.0.1:${PORTAL_PORT}`,
    })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);

    proxySocket.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n`);
    if (head.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  const destroy = () => {
    proxySocket.destroy();
    socket.destroy();
  };

  proxySocket.on('error', destroy);
  socket.on('error', destroy);
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (isPortalRequest(url)) {
    proxyToPortal(req, res);
    return;
  }

  handler(req, res, {
    public: ROOT,
    cleanUrls: true,
    trailingSlash: false,
  });
});

server.on('upgrade', (req, socket, head) => {
  if (isPortalRequest(req.url || '')) {
    proxyWebSocket(req, socket, head);
    return;
  }
  socket.destroy();
});

server.listen(SITE_PORT, () => {
  console.log(`Site  → http://localhost:${SITE_PORT}`);
  console.log(`Portal proxy → http://localhost:${SITE_PORT}/login (→ :${PORTAL_PORT})`);
});
