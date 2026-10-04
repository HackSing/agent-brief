/**
 * Comparison Matrix Component for Agent Brief.
 */

import { BriefSyntaxError } from '../diagnostic.js';

export function renderCompare(body, meta = '', startLine = 1) {
  const lines = body.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return '';

  const rows = [];
  lines.forEach((line, idx) => {
    // Skip markdown separator lines like |---|---|
    if (/^\s*\|?[\s-:]+\|[\s-:]+\|?/.test(line)) return;

    let parts = line.split('|').map(s => s.trim());
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();

    if (parts.length < 2) {
      throw new BriefSyntaxError({
        component: 'compare',
        line: startLine + idx,
        message: 'Expected at least 2 columns separated by "|"',
        sourceSnippet: line,
        example: `Dimension | Solution A | Solution B\nLatency | < 10ms | > 50ms`
      });
    }

    rows.push(parts);
  });

  if (rows.length === 0) return '';

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const headerHtml = `
    <thead>
      <tr>
        ${headers.map((h, i) => `<th class="${i === 0 ? 'th-dim' : 'th-opt'}">${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
  `;

  const bodyHtml = `
    <tbody>
      ${dataRows.map(row => `
        <tr>
          ${row.map((cell, i) => {
            let cls = i === 0 ? 'td-dim' : 'td-opt';
            let formatted = escapeHtml(cell);

            // Auto-detect status hints
            if (/^(ok|yes|true|pass|支持|推荐|✓)/i.test(cell)) {
              formatted = `<span class="badge badge-success">${formatted}</span>`;
            } else if (/^(no|false|fail|不支持|✗)/i.test(cell)) {
              formatted = `<span class="badge badge-danger">${formatted}</span>`;
            } else if (/^(warn|caution|注意|部分|!)/i.test(cell)) {
              formatted = `<span class="badge badge-warning">${formatted}</span>`;
            }

            return `<td class="${cls}">${formatted}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;

  return `<div class="brief-compare-wrapper"><table class="brief-compare-table">${headerHtml}${bodyHtml}</table></div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
