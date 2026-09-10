import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';

rmSync('deploy', { recursive: true, force: true });
mkdirSync('deploy/functions', { recursive: true });
mkdirSync('deploy/public', { recursive: true });

await build({
  entryPoints: {
    api: 'netlify/functions/api.ts',
    'market-sync-cron': 'netlify/functions/market-sync-cron.ts',
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'deploy/functions',
  packages: 'bundle',
  logLevel: 'info',
});

const toml = `[build]
  functions = "functions"
  publish = "public"

[functions.api]
  maxDuration = 26

[functions.market-sync-cron]
  schedule = "0 6,18 * * *"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api"
  status = 200
`;

writeFileSync('deploy/netlify.toml', toml);
writeFileSync('deploy/public/index.html', '<!doctype html><meta charset="utf-8"><title>TawangTani API</title><h1>TawangTani API</h1>');
console.log('deploy/ siap (functions, public, netlify.toml)');