/**
 * CareConnect Unified Health & Debug Status Checker
 * Usage: node scripts/health_check.js
 */
const http = require('http');

const SERVICES = [
  { name: 'FastAPI Backend', host: '127.0.0.1', port: 8000, path: '/health', expectedStatus: 200 },
  { name: 'Family PWA', host: '127.0.0.1', port: 5173, path: '/', expectedStatus: 200 },
  { name: 'Caregiver PWA', host: '127.0.0.1', port: 5174, path: '/caregiver/', expectedStatus: 200 },
  { name: 'Admin Portal', host: '127.0.0.1', port: 5175, path: '/admin/', expectedStatus: 200 },
  { name: 'Reverse Proxy', host: '127.0.0.1', port: 3000, path: '/proxy-status', expectedStatus: 200 },
];

function probeService(service) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: service.host,
        port: service.port,
        path: service.path,
        method: 'GET',
        timeout: 2000,
      },
      (res) => {
        const duration = Date.now() - startTime;
        resolve({
          name: service.name,
          port: service.port,
          url: `http://${service.host}:${service.port}${service.path}`,
          status: res.statusCode === service.expectedStatus ? 'ONLINE' : `HTTP ${res.statusCode}`,
          duration: `${duration}ms`,
          ok: res.statusCode === service.expectedStatus,
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        port: service.port,
        url: `http://${service.host}:${service.port}${service.path}`,
        status: 'TIMEOUT',
        duration: '> 2000ms',
        ok: false,
      });
    });

    req.on('error', (err) => {
      resolve({
        name: service.name,
        port: service.port,
        url: `http://${service.host}:${service.port}${service.path}`,
        status: 'DOWN (' + err.code + ')',
        duration: '-',
        ok: false,
      });
    });

    req.end();
  });
}

async function run() {
  console.log('\n===============================================================');
  console.log('            CareConnect Service Health & Diagnostics           ');
  console.log('===============================================================');

  const results = await Promise.all(SERVICES.map(probeService));
  
  console.table(
    results.map((r) => ({
      Service: r.name,
      Port: r.port,
      Status: r.ok ? `[OK] ${r.status}` : `[FAILED] ${r.status}`,
      ResponseTime: r.duration,
      URL: r.url,
    }))
  );

  const allOk = results.every((r) => r.ok);
  if (allOk) {
    console.log('All CareConnect services are healthy and responding!\n');
  } else {
    const downCount = results.filter((r) => !r.ok).length;
    console.log(`[!] ${downCount} service(s) are offline or unreachable.`);
    console.log('Hint: Run "npm run dev:all" or ".\\scripts\\run_project.ps1" to launch all services.\n');
  }
}

run();
