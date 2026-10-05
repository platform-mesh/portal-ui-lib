import type { PortalSetup, StaticMount } from '../portals/portal-setup.ts';
import { findPortalSetup } from '../portals/portal-setups.ts';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const backendPathPrefixes = ['/rest/', '/api/', '/callback'];

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveMountedFile(
  mount: StaticMount,
  pathname: string,
): string | undefined {
  const mountPrefix = mount.urlPath.endsWith('/')
    ? mount.urlPath
    : `${mount.urlPath}/`;
  if (!pathname.startsWith(mountPrefix)) {
    return undefined;
  }

  const mountDirectory = resolve(repositoryRoot, mount.directory);
  const candidate = resolve(
    join(mountDirectory, pathname.slice(mountPrefix.length)),
  );
  const isInsideMount = candidate.startsWith(mountDirectory + sep);

  return isInsideMount && isFile(candidate) ? candidate : undefined;
}

function sendFile(response: ServerResponse, path: string) {
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(path).pipe(response);
}

function sendText(response: ServerResponse, status: number, text: string) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
}

function startPortalServer(setup: PortalSetup) {
  const rootMount = setup.staticMounts.find((mount) => mount.urlPath === '/');
  if (!rootMount) {
    throw new Error(`Portal setup "${setup.name}" has no "/" static mount`);
  }
  const indexHtml = resolve(repositoryRoot, rootMount.directory, 'index.html');

  createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const decodedPathname = decodeURIComponent(pathname);

    if (
      backendPathPrefixes.some((prefix) => decodedPathname.startsWith(prefix))
    ) {
      sendText(
        response,
        501,
        `${decodedPathname} is a backend call. The integration portal has no backend; mock it in the test.`,
      );
      return;
    }

    const file = setup.staticMounts
      .map((mount) => resolveMountedFile(mount, decodedPathname))
      .find(Boolean);

    if (file) {
      sendFile(response, file);
      return;
    }

    if (extname(decodedPathname)) {
      sendText(response, 404, `${decodedPathname} not found`);
      return;
    }

    sendFile(response, indexHtml);
  }).listen(setup.port, () => {
    console.log(
      `Portal setup "${setup.name}" served on http://localhost:${setup.port}`,
    );
  });
}

const setupName = process.argv[2];
if (!setupName) {
  throw new Error('Usage: node integration/server/serve-portal.ts <setup>');
}

startPortalServer(findPortalSetup(setupName));
