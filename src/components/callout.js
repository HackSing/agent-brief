/**
 * Callout Component for Agent Brief.
 * Renders prominent informational, warning, tip, or danger notes.
 */

const ICONS = {
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  tip: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"></path></svg>`,
  warn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  danger: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
};

export function renderCallout(body, meta = '') {
  // meta format: [type] [optional title]
  // e.g. "warn 两次握手不够", "tip 性能建议", "info"
  const tokens = meta.trim().split(/\s+/);
  let type = 'info';
  let title = '';

  if (tokens.length > 0 && ['info', 'tip', 'warn', 'danger', 'warning'].includes(tokens[0].toLowerCase())) {
    type = tokens[0].toLowerCase();
    if (type === 'warning') type = 'warn';
    title = tokens.slice(1).join(' ');
  } else {
    title = meta.trim();
  }

  const iconSvg = ICONS[type] || ICONS.info;
  const displayTitle = title ? `<div class="callout-title">${title}</div>` : '';

  return `
<div class="brief-callout callout-${type}">
  <div class="callout-header">
    <span class="callout-icon">${iconSvg}</span>
    ${displayTitle}
  </div>
  <div class="callout-content">
    ${body.trim()}
  </div>
</div>`.trim();
}
