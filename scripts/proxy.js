const http = require('http');
const net = require('net');

const routes = [
  { prefix: '/api', targetPort: 8000, name: 'FastAPI Backend' },
  { prefix: '/health', targetPort: 8000, name: 'Backend Health Check' },
  { prefix: '/docs', targetPort: 8000, name: 'FastAPI Swagger UI' },
  { prefix: '/redoc', targetPort: 8000, name: 'FastAPI ReDoc' },
  { prefix: '/openapi.json', targetPort: 8000, name: 'FastAPI OpenAPI Schema' },
  { prefix: '/caregiver', targetPort: 5174, name: 'Caregiver PWA' },
  { prefix: '/admin', targetPort: 5175, name: 'Admin Portal' },
  { prefix: '/', targetPort: 5173, name: 'Family PWA' },
];

function checkPort(port, timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

const server = http.createServer(async (req, res) => {
  // Built-in debug status endpoint
  if (req.url === '/proxy-status' || req.url === '/__proxy_status') {
    const checks = {};
    const ports = [8000, 5173, 5174, 5175];
    for (const port of ports) {
      checks[port] = await checkPort(port);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          status: 'ok',
          proxyPort: 3000,
          services: [
            { name: 'FastAPI Backend', port: 8000, alive: checks[8000], routes: ['/api', '/health', '/docs', '/redoc', '/openapi.json'] },
            { name: 'Family PWA', port: 5173, alive: checks[5173], routes: ['/'] },
            { name: 'Caregiver PWA', port: 5174, alive: checks[5174], routes: ['/caregiver'] },
            { name: 'Admin Portal', port: 5175, alive: checks[5175], routes: ['/admin'] },
          ],
        },
        null,
        2
      )
    );
    return;
  }

  const route = routes.find((r) => req.url.startsWith(r.prefix));
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: No proxy route configured for ${req.url}`);
    return;
  }

  const options = {
    hostname: '127.0.0.1',
    port: route.targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${route.targetPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy 502] Failed to reach ${route.name} (127.0.0.1:${route.targetPort}) for ${req.method} ${req.url}: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            error: 'Bad Gateway',
            message: `Could not connect to ${route.name} on port ${route.targetPort}.`,
            hint: `Make sure the service on port ${route.targetPort} is running. Run 'npm run health' or visit '/proxy-status' to check services.`,
            code: err.code,
            targetPort: route.targetPort,
            path: req.url,
          },
          null,
          2
        )
      );
    }
  });

  req.on('error', () => {});
  res.on('error', () => {});

  req.pipe(proxyReq, { end: true });
});

// Support WebSockets (Vite HMR)
server.on('upgrade', (req, socket, head) => {
  const route = routes.find((r) => req.url.startsWith(r.prefix));
  if (!route) return socket.destroy();

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: route.targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${route.targetPort}` },
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.keys(proxyRes.headers)
          .map((k) => `${k}: ${proxyRes.headers[k]}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    socket.on('error', () => {});
    proxySocket.on('error', () => {});
    proxySocket.pipe(socket).pipe(proxySocket);
  });

  socket.on('error', () => {});

  proxyReq.on('error', (err) => {
    console.error(`[Proxy HMR Error] WebSocket upgrade failed for ${route.name} on port ${route.targetPort}: ${err.message}`);
    socket.end();
  });

  proxyReq.end();
});

server.listen(3000, () => {
  console.log('===================================================');
  console.log(' CareConnect Reverse Proxy running on :3000');
  console.log('===================================================');
  console.log(' Routing Table:');
  console.log('  /api, /docs, /health -> Backend (:8000)');
  console.log('  /caregiver           -> Caregiver PWA (:5174)');
  console.log('  /admin               -> Admin Portal (:5175)');
  console.log('  /                    -> Family PWA (:5173)');
  console.log('  /proxy-status        -> Live Service Status Check');
  console.log('===================================================');
});
