const http = require('http');

const routes = [
  { prefix: '/api', targetPort: 8000 },
  { prefix: '/health', targetPort: 8000 },
  { prefix: '/caregiver', targetPort: 5174 },
  { prefix: '/admin', targetPort: 5175 },
  { prefix: '/', targetPort: 5173 },
];

const server = http.createServer((req, res) => {
  const route = routes.find(r => req.url.startsWith(r.prefix));
  if (!route) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Rewrite /caregiver to / for the target if needed? 
  // No, if base is /caregiver/, Vite expects requests to start with /caregiver/
  const options = {
    hostname: '127.0.0.1',
    port: route.targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${route.targetPort}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.on('error', () => {});
  res.on('error', () => {});

  req.pipe(proxyReq, { end: true });
});

// Support Websockets (Vite HMR)
server.on('upgrade', (req, socket, head) => {
  const route = routes.find(r => req.url.startsWith(r.prefix));
  if (!route) return socket.destroy();

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: route.targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${route.targetPort}` }
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.keys(proxyRes.headers).map(k => `${k}: ${proxyRes.headers[k]}`).join('\r\n') +
      '\r\n\r\n'
    );
    socket.on('error', () => {});
    proxySocket.on('error', () => {});
    proxySocket.pipe(socket).pipe(proxySocket);
  });

  socket.on('error', () => {});

  proxyReq.on('error', (err) => {
    socket.end();
  });

  proxyReq.end();
});

server.listen(3000, () => {
  console.log('Reverse proxy running on http://localhost:3000');
  console.log('Routes:');
  console.log('  /api       -> Backend (8000)');
  console.log('  /caregiver -> Caregiver PWA (5174)');
  console.log('  /admin     -> Admin Portal (5175)');
  console.log('  /          -> Family PWA (5173)');
});

