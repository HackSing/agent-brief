import test from 'node:test';
import assert from 'node:assert/strict';
import { BriefLinter } from '../src/linter.js';

test('BriefLinter detects weak verbs and boilerplate', () => {
  const md = `
众所周知，我们对缓存系统进行优化。
`;

  const issues = BriefLinter.lint(md);
  assert.ok(issues.length >= 1);
  const msgs = issues.map(i => i.message).join(' ');
  assert.ok(msgs.includes('套话') || msgs.includes('虚动词'));
});

test('BriefLinter passes clean active text', () => {
  const md = `
Redis 缓存热点数据，降低数据库读取延迟。
连接建立后，客户端直接请求 API。
`;

  const issues = BriefLinter.lint(md);
  assert.equal(issues.length, 0);
});
