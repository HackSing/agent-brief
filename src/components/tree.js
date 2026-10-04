/**
 * Tree & Directory Hierarchy Component for Agent Brief.
 */

export function renderTree(body, meta = '', startLine = 1) {
  const lines = body.split('\n');
  const items = [];

  for (const raw of lines) {
    if (!raw.trim()) continue;

    // Detect indentation or ASCII connectors
    let text = raw;
    let isDir = text.trim().endsWith('/');
    let icon = isDir
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

    items.push(`
      <div class="tree-line">
        <span class="tree-icon">${icon}</span>
        <span class="tree-label">${escapeHtml(text)}</span>
      </div>
    `);
  }

  return `<div class="brief-tree">${items.join('')}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
