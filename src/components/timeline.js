/**
 * Timeline Component for Agent Brief.
 * Renders chronological roadmap, execution phases, or lifecycle progression.
 */

import { BriefSyntaxError } from '../diagnostic.js';

export function renderTimeline(body, meta = '', startLine = 1) {
  const lines = body.split('\n');
  const events = [];

  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;

    // Pattern: - Title [Tag/Time]: Description or 1. Title: Description
    const match = raw.match(/^(?:[-*]|\d+\.)\s+([^\[:]+?)(?:\s*\[([^\]]+)\])?\s*:\s*(.*)$/);
    if (!match) {
      // Fallback: simple item
      const simpleMatch = raw.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
      if (simpleMatch) {
        events.push({
          title: simpleMatch[1].trim(),
          tag: '',
          desc: ''
        });
        return;
      }

      throw new BriefSyntaxError({
        component: 'timeline',
        line: startLine + idx,
        message: `Invalid timeline item format. Expected '- Title [Tag]: Description'`,
        sourceSnippet: line,
        example: `- Phase 1 [Q1 2026]: Architecture design\n- Phase 2 [Q2 2026]: Core compiler development`
      });
    }

    events.push({
      title: match[1].trim(),
      tag: match[2] ? match[2].trim() : '',
      desc: match[3] ? match[3].trim() : ''
    });
  });

  const itemsHtml = events.map((ev, i) => `
    <div class="timeline-item">
      <div class="timeline-marker">
        <span class="timeline-dot"></span>
        ${i < events.length - 1 ? '<span class="timeline-line"></span>' : ''}
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <strong class="timeline-title">${escapeHtml(ev.title)}</strong>
          ${ev.tag ? `<span class="timeline-tag">${escapeHtml(ev.tag)}</span>` : ''}
        </div>
        ${ev.desc ? `<div class="timeline-desc">${escapeHtml(ev.desc)}</div>` : ''}
      </div>
    </div>
  `).join('');

  return `<div class="brief-timeline">${itemsHtml}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
