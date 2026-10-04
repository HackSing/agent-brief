#!/usr/bin/env node

/**
 * CLI runner for Agent Brief.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { compileBrief, BriefSyntaxError, BriefLinter } from '../src/index.js';

const VERSION = '1.0.0';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`agent-brief v${VERSION}`);
    process.exit(0);
  }

  const command = args[0];

  if (command === 'check') {
    await handleCheck(args.slice(1));
  } else if (command === 'render') {
    await handleRender(args.slice(1));
  } else {
    // If first argument is a file or '-'
    if (command === '-' || fs.existsSync(command)) {
      await handleRender(args);
    } else {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
    }
  }
}

function printHelp() {
  console.log(`
\x1b[1mAgent Brief\x1b[0m v${VERSION} — High-density visual brief compiler for AI agents.

\x1b[1mUSAGE:\x1b[0m
  brief render <file.md | -> [options]
  brief check <file.md | -> [options]

\x1b[1mOPTIONS:\x1b[0m
  -o, --output <path>    Specify output HTML destination path
  --theme <name>         Theme override (slate | nord | paper)
  --strict               Treat writing/lint warnings as fatal errors
  -v, --version          Show version
  -h, --help             Show help documentation

\x1b[1mEXAMPLES:\x1b[0m
  brief render draft.md -o output.html
  cat draft.md | brief render -
  brief check draft.md --strict
`);
}

async function readInput(fileArg) {
  if (!fileArg || fileArg === '-') {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', err => reject(err));
    });
  }

  const resolved = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf-8');
}

async function handleCheck(args) {
  const fileArg = args.find(a => !a.startsWith('-')) || '-';
  const strict = args.includes('--strict');

  try {
    const content = await readInput(fileArg);
    const issues = BriefLinter.lint(content);

    if (issues.length === 0) {
      console.log(`\x1b[32m✔ Code and technical writing checks passed (0 issues).\x1b[0m`);
      return;
    }

    console.log(`\x1b[33mFound ${issues.length} writing clarity suggestion(s):\x1b[0m`);
    for (const item of issues) {
      console.log(`  Line ${item.line} [${item.type}]: ${item.message}`);
    }

    if (strict) {
      console.error(`\x1b[31m✗ Strict check failed.\x1b[0m`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31mError checking file: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

async function handleRender(args) {
  let fileArg = null;
  let outputPath = null;
  let theme = null;
  let strict = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      outputPath = args[++i];
    } else if (arg === '--theme') {
      theme = args[++i];
    } else if (arg === '--strict') {
      strict = true;
    } else if (!arg.startsWith('-') && !fileArg) {
      fileArg = arg;
    }
  }

  try {
    const content = await readInput(fileArg);
    const { html, meta, warnings } = compileBrief(content, {
      strict,
      overrideTheme: theme
    });

    if (warnings.length > 0) {
      for (const w of warnings) {
        console.warn(`\x1b[33m[Warning] Line ${w.line}: ${w.message}\x1b[0m`);
      }
    }

    // Determine target file
    let target = outputPath;
    if (!target) {
      const defaultDir = path.join(os.homedir(), '.agent-brief', 'pages');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      const baseName = (fileArg && fileArg !== '-')
        ? path.basename(fileArg, path.extname(fileArg))
        : 'brief';
      target = path.join(defaultDir, `${baseName}-${Date.now()}.html`);
    }

    const resolvedTarget = path.resolve(process.cwd(), target);
    fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
    fs.writeFileSync(resolvedTarget, html, 'utf-8');

    console.log(`\x1b[32m✔ Page successfully generated:\x1b[0m ${resolvedTarget}`);
  } catch (err) {
    if (err instanceof BriefSyntaxError) {
      console.error(err.formatOutput());
    } else {
      console.error(`\x1b[31m✗ Failed to render: ${err.message}\x1b[0m`);
    }
    process.exit(1);
  }
}

main();
