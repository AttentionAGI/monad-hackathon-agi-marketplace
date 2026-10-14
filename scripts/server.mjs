import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

export function createPreviewServer(root = defaultRoot) {
  root = resolve(root);
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      return response.end('Method not allowed');
    }
    let path;
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      path = resolve(root, '.' + pathname);
      if (path !== root && !path.startsWith(root + sep)) {
        response.writeHead(403);
        return response.end('Forbidden');
      }
      const info = await stat(path);
      if (info.isDirectory()) path = resolve(path, 'index.html');
      if (!(await stat(path)).isFile()) throw new Error('Not a file');
    } catch {
      response.writeHead(404);
      return response.end('Not found');
    }
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(path).on('error', () => response.destroy()).pipe(response);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || '127.0.0.1';
  const server = createPreviewServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`AttentionAGI is ready at http://${host}:${port}`));
}
