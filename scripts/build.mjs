/**
 * Build script: Bundles CLI and dependencies into a single standalone executable.
 */

import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

async function build() {
  console.log('Building standalone Agent Brief bundles...');

  // Ensure directories exist
  fs.mkdirSync('dist', { recursive: true });
  fs.mkdirSync('skills/agent-brief/scripts', { recursive: true });

  const buildOptions = {
    entryPoints: ['bin/brief.js'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    minify: false,
    sourcemap: false
  };

  // 1. Build dist/brief.mjs
  await esbuild.build({
    ...buildOptions,
    outfile: 'dist/brief.mjs'
  });

  // 2. Build skill script bundle: skills/agent-brief/scripts/brief.mjs
  await esbuild.build({
    ...buildOptions,
    outfile: 'skills/agent-brief/scripts/brief.mjs'
  });

  fs.chmodSync('dist/brief.mjs', 0o755);
  fs.chmodSync('skills/agent-brief/scripts/brief.mjs', 0o755);

  console.log('✔ Build completed: dist/brief.mjs and skills/agent-brief/scripts/brief.mjs created.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
