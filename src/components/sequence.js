/**
 * Sequence Diagram Component for Agent Brief.
 * Renders pure, zero-dependency, responsive SVG sequence charts.
 */

import { BriefSyntaxError } from '../diagnostic.js';

export function renderSequence(body, meta = '', startLine = 1) {
  const autoNumber = /\bnum\b/i.test(meta);
  const lines = body.split('\n');

  let participants = [];
  const events = [];

  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;

    // 1. Participant definition
    if (raw.toLowerCase().startsWith('participants:')) {
      const parts = raw.slice(13).split(',').map(p => p.trim()).filter(Boolean);
      participants.push(...parts);
      return;
    }

    // 2. Note syntax: note Actor: text or note Actor1, Actor2: text
    const noteMatch = raw.match(/^note\s+([^:]+):\s*(.*)$/i);
    if (noteMatch) {
      const actors = noteMatch[1].split(',').map(a => a.trim());
      events.push({
        type: 'note',
        actors,
        text: noteMatch[2].trim(),
        line: startLine + idx
      });
      actors.forEach(a => {
        if (!participants.includes(a)) participants.push(a);
      });
      return;
    }

    // 3. Message syntax: From -> To: Text, From --> To: Text, From <-> To: Text
    const msgMatch = raw.match(/^([^\-\<\>]+?)\s*(\-\->|\->|<\->)\s*([^:]+?):\s*(.*)$/);
    if (msgMatch) {
      const from = msgMatch[1].trim();
      const arrowType = msgMatch[2].trim();
      const to = msgMatch[3].trim();
      const text = msgMatch[4].trim();

      if (!participants.includes(from)) participants.push(from);
      if (!participants.includes(to)) participants.push(to);

      events.push({
        type: 'message',
        from,
        to,
        arrowType,
        text,
        line: startLine + idx
      });
      return;
    }

    throw new BriefSyntaxError({
      component: 'sequence',
      line: startLine + idx,
      message: `Unrecognized sequence diagram syntax.`,
      sourceSnippet: line,
      example: `participants: Client, Server\nClient -> Server: Request payload\nnote Server: Processing\nServer --> Client: Response`
    });
  });

  if (participants.length === 0) {
    return '';
  }

  // De-duplicate participants while maintaining order
  participants = [...new Set(participants)];

  // --- SVG Layout Calculation ---
  const padX = 40;
  const colWidth = Math.max(160, Math.min(260, Math.floor(720 / Math.max(1, participants.length))));
  const totalWidth = padX * 2 + (participants.length - 1) * colWidth;

  const headerH = 38;
  const stepH = 46;
  const totalHeight = 60 + headerH + events.length * stepH + headerH + 30;

  // Actor X coordinates
  const actorX = {};
  participants.forEach((p, i) => {
    actorX[p] = padX + i * colWidth;
  });

  // SVG Elements
  let svg = `<svg class="brief-sequence-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">\n`;

  // Defs: Arrow markers
  svg += `
  <defs>
    <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
    </marker>
    <marker id="seq-arrow-rev" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 10 1 L 0 5 L 10 9 z" fill="currentColor" />
    </marker>
  </defs>
  `;

  // Draw Lifelines
  participants.forEach(p => {
    const x = actorX[p];
    svg += `<line class="seq-lifeline" x1="${x}" y1="${40 + headerH}" x2="${x}" y2="${totalHeight - 40 - headerH}" stroke="currentColor" stroke-dasharray="4,4" stroke-opacity="0.3" stroke-width="1.5" />\n`;
  });

  // Draw Top & Bottom Participant Badges
  const drawParticipantBoxes = (topY) => {
    participants.forEach(p => {
      const x = actorX[p];
      const boxW = Math.min(130, colWidth - 20);
      const boxH = 32;
      svg += `
      <g class="seq-actor" transform="translate(${x - boxW / 2}, ${topY})">
        <rect width="${boxW}" height="${boxH}" rx="6" class="seq-actor-box" />
        <text x="${boxW / 2}" y="${boxH / 2 + 5}" text-anchor="middle" class="seq-actor-text">${escapeHtml(p)}</text>
      </g>
      `;
    });
  };

  drawParticipantBoxes(20);
  drawParticipantBoxes(totalHeight - 20 - headerH);

  // Draw Events
  let currentY = 50 + headerH;
  let msgIndex = 1;

  events.forEach(ev => {
    currentY += stepH;

    if (ev.type === 'note') {
      const xs = ev.actors.map(a => actorX[a] || padX);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const noteW = Math.max(120, maxX - minX + 80);
      const noteH = 26;
      const noteX = (minX + maxX) / 2 - noteW / 2;

      svg += `
      <g class="seq-note" transform="translate(${noteX}, ${currentY - 14})">
        <rect width="${noteW}" height="${noteH}" rx="4" class="seq-note-box" />
        <text x="${noteW / 2}" y="17" text-anchor="middle" class="seq-note-text">${escapeHtml(ev.text)}</text>
      </g>
      `;
    } else if (ev.type === 'message') {
      const x1 = actorX[ev.from];
      const x2 = actorX[ev.to];
      const isDashed = ev.arrowType === '-->';
      const isBi = ev.arrowType === '<->';

      const labelPrefix = autoNumber ? `${msgIndex}. ` : '';
      msgIndex++;

      // Text label position
      const midX = (x1 + x2) / 2;
      const textY = currentY - 8;

      svg += `
      <g class="seq-msg">
        <text x="${midX}" y="${textY}" text-anchor="middle" class="seq-msg-text">${escapeHtml(labelPrefix + ev.text)}</text>
        <line x1="${x1}" y1="${currentY}" x2="${x2}" y2="${currentY}"
              class="seq-msg-line"
              stroke="currentColor"
              stroke-width="1.8"
              ${isDashed ? 'stroke-dasharray="5,4"' : ''}
              marker-end="url(#seq-arrow)"
              ${isBi ? 'marker-start="url(#seq-arrow-rev)"' : ''} />
      </g>
      `;
    }
  });

  svg += `</svg>`;

  return `<div class="brief-sequence-container">${svg}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
