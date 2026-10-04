/**
 * Document Reader Template for Agent Brief.
 */

import { generateStyles } from '../themes/styles.js';

export function renderDocTemplate({ meta, overviewHtml, panelsHtml, rawSource }) {
  const title = meta.title || 'Technical Document';
  const subtitle = meta.subtitle || '';
  const theme = meta.theme || 'slate';
  const badge = meta.badge || '';
  const source = meta.source || '';

  const styles = generateStyles(theme);

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${escapeHtml(theme)}" data-mode="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    ${styles}
    .brief-container {
      max-width: 860px !important;
    }
    .brief-grid {
      display: flex !important;
      flex-direction: column !important;
      gap: 20px !important;
    }
  </style>
</head>
<body>
  <div class="brief-container">
    <header class="brief-header">
      <div class="brief-meta">
        <div class="brief-title-row">
          <h1 class="brief-title">${escapeHtml(title)}</h1>
          ${badge ? `<span class="brief-badge">${escapeHtml(badge)}</span>` : ''}
          ${source ? `<span class="brief-badge">${escapeHtml(source)}</span>` : ''}
        </div>
        ${subtitle ? `<div class="brief-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="brief-controls">
        <select class="theme-select" id="themeSelect">
          <option value="slate" ${theme === 'slate' ? 'selected' : ''}>Slate</option>
          <option value="nord" ${theme === 'nord' ? 'selected' : ''}>Nord</option>
          <option value="paper" ${theme === 'paper' ? 'selected' : ''}>Paper</option>
        </select>
        <button class="btn-ctrl" id="modeToggle">
          <span id="modeIcon">☀️</span>
        </button>
        <button class="btn-ctrl" onclick="window.print()">打印</button>
      </div>
    </header>

    ${overviewHtml}

    <main class="brief-grid">
      ${panelsHtml.join('\n')}
    </main>
  </div>

  <script>
    (function() {
      const htmlEl = document.documentElement;
      const modeBtn = document.getElementById('modeToggle');
      const modeIcon = document.getElementById('modeIcon');
      const themeSelect = document.getElementById('themeSelect');

      let mode = localStorage.getItem('agent_brief_mode') || 'dark';
      let currentTheme = localStorage.getItem('agent_brief_theme') || htmlEl.getAttribute('data-theme') || 'slate';

      function updateMode(newMode) {
        mode = newMode;
        htmlEl.setAttribute('data-mode', mode);
        modeIcon.textContent = mode === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('agent_brief_mode', mode);
      }

      function updateTheme(newTheme) {
        currentTheme = newTheme;
        htmlEl.setAttribute('data-theme', currentTheme);
        localStorage.setItem('agent_brief_theme', currentTheme);
      }

      updateMode(mode);
      updateTheme(currentTheme);
      if (themeSelect) themeSelect.value = currentTheme;

      modeBtn.addEventListener('click', () => {
        updateMode(mode === 'dark' ? 'light' : 'dark');
      });

      if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
          updateTheme(e.target.value);
        });
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
