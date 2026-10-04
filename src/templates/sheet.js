/**
 * Canvas / Grid Sheet Template for Agent Brief.
 */

import { generateStyles } from '../themes/styles.js';

export function renderSheetTemplate({ meta, overviewHtml, panelsHtml, rawSource }) {
  const title = meta.title || 'Technical Brief';
  const subtitle = meta.subtitle || '';
  const cols = meta.cols || 3;
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
  </style>
</head>
<body>
  <div class="brief-container" style="--grid-cols: ${cols};">
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
        <select class="theme-select" id="themeSelect" title="切换主题">
          <option value="slate" ${theme === 'slate' ? 'selected' : ''}>Slate</option>
          <option value="nord" ${theme === 'nord' ? 'selected' : ''}>Nord</option>
          <option value="paper" ${theme === 'paper' ? 'selected' : ''}>Paper</option>
        </select>
        <button class="btn-ctrl" id="modeToggle" title="切换暗黑/明亮模式">
          <span id="modeIcon">☀️</span>
        </button>
        <button class="btn-ctrl" id="drawerToggle" title="查看原始 Markdown 稿件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          稿件
        </button>
        <button class="btn-ctrl" onclick="window.print()" title="打印或保存为 PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        </button>
      </div>
    </header>

    ${overviewHtml}

    <main class="brief-grid">
      ${panelsHtml.join('\n')}
    </main>
  </div>

  <!-- Raw Markdown Source Drawer -->
  <aside class="brief-drawer" id="sourceDrawer">
    <div class="drawer-header">
      <span class="drawer-title">Markdown 原始稿件</span>
      <button class="btn-ctrl" id="closeDrawer">✕</button>
    </div>
    <div class="drawer-body">
      <textarea class="drawer-textarea" readonly id="sourceText">${escapeHtml(rawSource)}</textarea>
      <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
        <button class="btn-ctrl" id="copyBtn">复制全文</button>
      </div>
    </div>
  </aside>

  <script>
    (function() {
      const htmlEl = document.documentElement;
      const modeBtn = document.getElementById('modeToggle');
      const modeIcon = document.getElementById('modeIcon');
      const themeSelect = document.getElementById('themeSelect');
      const drawer = document.getElementById('sourceDrawer');
      const drawerToggle = document.getElementById('drawerToggle');
      const closeDrawer = document.getElementById('closeDrawer');
      const copyBtn = document.getElementById('copyBtn');
      const sourceText = document.getElementById('sourceText');

      // 1. Theme and Mode Toggle
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

      // 2. Drawer Controls
      drawerToggle.addEventListener('click', () => {
        drawer.classList.add('open');
      });

      closeDrawer.addEventListener('click', () => {
        drawer.classList.remove('open');
      });

      // 3. Copy Source Action
      copyBtn.addEventListener('click', () => {
        sourceText.select();
        navigator.clipboard.writeText(sourceText.value).then(() => {
          copyBtn.textContent = '已复制!';
          setTimeout(() => { copyBtn.textContent = '复制全文'; }, 1500);
        });
      });
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
