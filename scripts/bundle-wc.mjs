import { build } from 'esbuild';
import { readdirSync, rmSync } from 'fs';
import { basename, join, resolve } from 'path';

const dist = resolve('dist-wc/assets');
const entry = join(dist, 'main.js');
const out = join(dist, 'platform-mesh-portal-ui-wc.js');
const outName = basename(out);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  outfile: out,
  minify: true,
  sourcemap: false,
  logLevel: 'warning',
});

for (const file of readdirSync(dist)) {
  if (file !== outName) {
    rmSync(join(dist, file), { force: true });
  }
}

rmSync(resolve('dist-wc/prerendered-routes.json'), { force: true });

console.log(
  'Single-file bundle written to dist-wc/assets/platform-mesh-portal-ui-wc.js',
);
