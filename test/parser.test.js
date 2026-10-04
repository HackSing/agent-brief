import test from 'node:test';
import assert from 'node:assert/strict';
import { BriefParser } from '../src/parser.js';

test('BriefParser parses frontmatter and panel layout', () => {
  const md = `---
title: System Architecture
subtitle: Core Overview
cols: 3
theme: slate
badge: V2.0
---
This is global overview text.

## API Gateway {span=2 rows=1 badge="Entry"}
Inside gateway panel.

## Auth Service {span=1}
Inside auth panel.
`;

  const parsed = BriefParser.parse(md);

  assert.equal(parsed.meta.title, 'System Architecture');
  assert.equal(parsed.meta.subtitle, 'Core Overview');
  assert.equal(parsed.meta.cols, 3);
  assert.equal(parsed.meta.theme, 'slate');
  assert.equal(parsed.meta.badge, 'V2.0');
  assert.equal(parsed.overview, 'This is global overview text.');

  assert.equal(parsed.panels.length, 2);
  assert.equal(parsed.panels[0].title, 'API Gateway');
  assert.equal(parsed.panels[0].span, 2);
  assert.equal(parsed.panels[0].badge, 'Entry');

  assert.equal(parsed.panels[1].title, 'Auth Service');
  assert.equal(parsed.panels[1].span, 1);
});
