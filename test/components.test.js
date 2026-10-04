import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFlow } from '../src/components/flow.js';
import { renderSequence } from '../src/components/sequence.js';
import { renderKv } from '../src/components/kv.js';
import { renderCallout } from '../src/components/callout.js';
import { renderTimeline } from '../src/components/timeline.js';
import { renderCompare } from '../src/components/compare.js';
import { renderTree } from '../src/components/tree.js';

test('renderFlow generates SVG with nodes and edges', () => {
  const code = `
[Client] -> [Gateway]: HTTPS
[Gateway] -> {Auth}: Check
{Auth} -> [Core Service]: Pass
  `;
  const html = renderFlow(code, 'LR', 1);
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('Client'));
  assert.ok(html.includes('Gateway'));
  assert.ok(html.includes('Core Service'));
});

test('renderSequence generates sequence diagram SVG', () => {
  const code = `
participants: Alice, Bob
Alice -> Bob: Ping
Bob --> Alice: Pong
note Bob: Self test
  `;
  const html = renderSequence(code, 'num', 1);
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('Alice'));
  assert.ok(html.includes('Bob'));
  assert.ok(html.includes('Ping'));
  assert.ok(html.includes('Pong'));
});

test('renderKv renders key-value cards', () => {
  const code = `
Latency [P99]: 15ms
Throughput: 80k rps
  `;
  const html = renderKv(code, 'cols=2', 1);
  assert.ok(html.includes('Latency'));
  assert.ok(html.includes('P99'));
  assert.ok(html.includes('80k rps'));
});

test('renderCallout renders styled callout box', () => {
  const html = renderCallout('Token expires in 1 hour.', 'warn 安全提示');
  assert.ok(html.includes('callout-warn'));
  assert.ok(html.includes('安全提示'));
  assert.ok(html.includes('Token expires in 1 hour.'));
});

test('renderTimeline renders step progress', () => {
  const code = `
- Step 1 [Init]: Setup config
- Step 2 [Run]: Execute migration
  `;
  const html = renderTimeline(code, '', 1);
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('Init'));
  assert.ok(html.includes('Execute migration'));
});

test('renderCompare renders comparison table with badges', () => {
  const code = `
Feature | Solution A | Solution B
Cluster Mode | ok Yes | no No
  `;
  const html = renderCompare(code, '', 1);
  assert.ok(html.includes('Solution A'));
  assert.ok(html.includes('badge-success'));
  assert.ok(html.includes('badge-danger'));
});

test('renderTree renders directory tree structure', () => {
  const code = `
src/
├── index.js
└── utils.js
  `;
  const html = renderTree(code, '', 1);
  assert.ok(html.includes('src/'));
  assert.ok(html.includes('index.js'));
});
