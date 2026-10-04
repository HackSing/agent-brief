/**
 * Key-Value & Metrics Card Component for Agent Brief.
 * Presents high-density configuration, technical specs, or KPI items.
 */

import { BriefSyntaxError } from '../diagnostic.js';

export function renderKv(body, meta = '', startLine = 1) {
  const lines = body.split('\n');
  const items = [];

  // Parse options: cols=2
  let cols = 2;
  const colMatch = meta.match(/cols=(\d+)/i);
  if (colMatch) {
    cols = parseInt(colMatch[1], 10);
  }

  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;

    let key = '';
    let val = '';
    let badge = '';

    // Check for badge syntax: Key [Badge]: Value
    const badgeMatch = raw.match(/^([^\[:]+)\s*\[([^\]]+)\]\s*:\s*(.*)$/);
    if (badgeMatch) {
      key = badgeMatch[1].trim();
      badge = badgeMatch[2].trim();
      val = badgeMatch[3].trim();
    } else {
      const colonIdx = raw.indexOf(':');
      if (colonIdx !== -1) {
        key = raw.slice(0, colonIdx).trim();
        val = raw.slice(colonIdx + 1).trim();
      } else {
        const pipeParts = raw.split('|');
        if (pipeParts.length >= 2) {
          key = pipeParts[0].trim();
          val = pipeParts[1].trim();
          if (pipeParts[2]) badge = pipeParts[2].trim();
        } else {
          throw new BriefSyntaxError({
            component: 'kv',
            line: startLine + idx,
            message: `Invalid KV pair. Expected 'Key: Value' or 'Key [Badge]: Value'`,
            sourceSnippet: line,
            example: `Latency SLA [Critical]: < 50ms\nThroughput: 120,000 req/sec`
          });
        }
      }
    }

    items.push({ key, val, badge });
  });

  const cardsHtml = items.map(item => `
    <div class="kv-item">
      <div class="kv-header">
        <span class="kv-key">${escapeHtml(item.key)}</span>
        ${item.badge ? `<span class="kv-badge">${escapeHtml(item.badge)}</span>` : ''}
      </div>
      <div class="kv-value">${escapeHtml(item.val)}</div>
    </div>
  `).join('');

  return `<div class="brief-kv-grid kv-cols-${cols}">${cardsHtml}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
