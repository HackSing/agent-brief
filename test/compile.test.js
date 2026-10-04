import test from 'node:test';
import assert from 'node:assert/strict';
import { compileBrief } from '../src/index.js';
import { BriefSyntaxError } from '../src/diagnostic.js';

test('compileBrief produces valid single-file HTML', () => {
  const md = `---
title: OAuth 2.0 Flow
cols: 2
theme: slate
---
OAuth 2.0 authorization framework overview.

## Authorization Code Flow {span=2}
\`\`\`sequence num
participants: User, Client, AuthServer
User -> Client: Click Login
Client -> AuthServer: Request Auth
AuthServer --> Client: Auth Code
\`\`\`

## Key Metrics {span=1}
\`\`\`kv cols=1
Token TTL: 3600s
Algorithm: RS256
\`\`\`

## Security Notes {span=1}
\`\`\`callout warn PKCE Required
Always use PKCE for public clients to prevent code interception attacks.
\`\`\`
`;

  const { html, meta, warnings } = compileBrief(md);

  assert.equal(meta.title, 'OAuth 2.0 Flow');
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('OAuth 2.0 Flow'));
  assert.ok(html.includes('brief-sequence-svg'));
  assert.ok(html.includes('Token TTL'));
  assert.ok(html.includes('PKCE Required'));
  assert.ok(html.includes('Markdown 原始稿件'));
  assert.equal(typeof warnings, 'object');
});

test('BriefSyntaxError formats with example for LLM self-correction', () => {
  const err = new BriefSyntaxError({
    component: 'flow',
    line: 12,
    message: 'Syntax error in edge',
    sourceSnippet: 'A ->',
    example: '[Client] -> [Server]: Request'
  });

  const formatted = err.formatOutput();
  assert.ok(formatted.includes('line 12'));
  assert.ok(formatted.includes('A ->'));
  assert.ok(formatted.includes('[Client] -> [Server]: Request'));
});
