/**
 * Panel and Markdown Content Renderer for Agent Brief.
 */

import { Marked } from 'marked';
import { isComponent, renderComponent } from './components/index.js';

// Configure marked with custom table badge renderer
const customRenderer = {
  tablecell(token) {
    const tag = token.header ? 'th' : 'td';
    const alignAttr = token.align ? ` align="${token.align}"` : '';
    let content = token.text;

    if (!token.header) {
      content = transformBadges(content);
    }

    return `<${tag}${alignAttr}>${content}</${tag}>`;
  }
};

const markedInstance = new Marked({
  renderer: customRenderer,
  gfm: true,
  breaks: true
});

function transformBadges(text) {
  // ok | ✓ | yes | pass -> badge-success
  const okMatch = text.match(/^(?:ok|✓|yes|pass)\b(?:\s+(.*))?/i);
  if (okMatch) {
    const label = okMatch[1] ? ` ${okMatch[1]}` : '';
    return `<span class="badge badge-success"><span class="badge-icon">✓</span>${label}</span>`;
  }

  // no | ✗ | fail -> badge-danger
  const noMatch = text.match(/^(?:no|✗|fail)\b(?:\s+(.*))?/i);
  if (noMatch) {
    const label = noMatch[1] ? ` ${noMatch[1]}` : '';
    return `<span class="badge badge-danger"><span class="badge-icon">✗</span>${label}</span>`;
  }

  // warn | ⚠ | caution -> badge-warning
  const warnMatch = text.match(/^(?:warn|⚠|caution)\b(?:\s+(.*))?/i);
  if (warnMatch) {
    const label = warnMatch[1] ? ` ${warnMatch[1]}` : '';
    return `<span class="badge badge-warning"><span class="badge-icon">⚠</span>${label}</span>`;
  }

  // info | ℹ | tip -> badge-info
  const infoMatch = text.match(/^(?:info|ℹ|tip)\b(?:\s+(.*))?/i);
  if (infoMatch) {
    const label = infoMatch[1] ? ` ${infoMatch[1]}` : '';
    return `<span class="badge badge-info"><span class="badge-icon">ℹ</span>${label}</span>`;
  }

  return text;
}

export class PanelRenderer {
  /**
   * Render a parsed panel object into HTML
   * @param {Object} panel
   * @returns {string}
   */
  static renderPanel(panel) {
    const parts = [];
    let currentMdLines = [];

    const flushMd = () => {
      if (currentMdLines.length > 0) {
        const mdText = currentMdLines.join('\n');
        parts.push(markedInstance.parse(mdText));
        currentMdLines = [];
      }
    };

    let inFence = false;
    let fenceLang = '';
    let fenceLines = [];
    let fenceStartLine = 0;

    for (const item of panel.lines) {
      const line = item.text;
      const lineNum = item.lineNum;

      if (!inFence) {
        const fenceMatch = line.match(/^```\s*([a-zA-Z0-9_\-]+)?(.*)$/);
        if (fenceMatch) {
          flushMd();
          inFence = true;
          fenceLang = (fenceMatch[1] || '').trim();
          fenceLines = [];
          fenceStartLine = lineNum;
        } else {
          currentMdLines.push(line);
        }
      } else {
        if (line.trim().startsWith('```')) {
          inFence = false;
          const body = fenceLines.join('\n');

          if (isComponent(fenceLang)) {
            parts.push(renderComponent(fenceLang, body, '', fenceStartLine));
          } else {
            // Standard code block
            parts.push(`
              <div class="brief-code-block">
                ${fenceLang ? `<div class="code-header">${escapeHtml(fenceLang)}</div>` : ''}
                <pre><code class="language-${escapeHtml(fenceLang)}">${escapeHtml(body)}</code></pre>
              </div>
            `);
          }
        } else {
          fenceLines.push(line);
        }
      }
    }

    flushMd();

    const spanStyle = panel.span > 1 ? `grid-column: span ${panel.span};` : '';
    const rowStyle = panel.rows > 1 ? `grid-row: span ${panel.rows};` : '';
    const styleAttr = (spanStyle || rowStyle) ? ` style="${spanStyle} ${rowStyle}"` : '';

    return `
      <section class="brief-panel" id="${escapeHtml(panel.id)}"${styleAttr}>
        <div class="panel-header">
          <h2 class="panel-title">${escapeHtml(panel.title)}</h2>
          ${panel.badge ? `<span class="panel-badge">${escapeHtml(panel.badge)}</span>` : ''}
        </div>
        <div class="panel-body">
          ${parts.join('\n')}
        </div>
      </section>
    `.trim();
  }

  /**
   * Render overview / abstract section
   * @param {string} overviewMd
   * @returns {string}
   */
  static renderOverview(overviewMd) {
    if (!overviewMd.trim()) return '';
    return `
      <div class="brief-overview">
        ${markedInstance.parse(overviewMd)}
      </div>
    `.trim();
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
