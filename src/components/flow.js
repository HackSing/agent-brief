/**
 * Flowchart / Architecture DAG Component for Agent Brief.
 * Uses @dagrejs/dagre to compute precise layout and outputs clean, responsive SVG.
 */

import dagre from '@dagrejs/dagre';
import { BriefSyntaxError } from '../diagnostic.js';

export function renderFlow(body, meta = '', startLine = 1) {
  const rankdir = (meta.trim().match(/\b(LR|RL|TD|TB)\b/i) || ['LR'])[0].toUpperCase();
  const dir = rankdir === 'TD' ? 'TB' : rankdir;

  const lines = body.split('\n');
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: dir,
    nodesep: 35,
    ranksep: 45,
    marginx: 20,
    marginy: 20
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeMap = new Map(); // id -> { id, label, shape, highlight }
  const edgeList = []; // { from, to, label, dashed, bi }

  function parseNodeToken(token) {
    let raw = token.trim();
    let highlight = false;

    if (raw.startsWith('*') && raw.endsWith('*') && raw.length > 2) {
      highlight = true;
      raw = raw.slice(1, -1).trim();
    }

    let shape = 'rect';
    let label = raw;

    if (raw.startsWith('[') && raw.endsWith(']')) {
      shape = 'rect';
      label = raw.slice(1, -1).trim();
    } else if (raw.startsWith('(') && raw.endsWith(')')) {
      shape = 'pill';
      label = raw.slice(1, -1).trim();
    } else if (raw.startsWith('{') && raw.endsWith('}')) {
      shape = 'diamond';
      label = raw.slice(1, -1).trim();
    }

    const id = label;
    if (!nodeMap.has(id)) {
      // Estimate width and height based on character length
      let charLen = 0;
      for (const ch of label) {
        charLen += ch.charCodeAt(0) > 255 ? 2 : 1;
      }

      const w = Math.max(shape === 'diamond' ? 120 : 96, charLen * 8.5 + (shape === 'diamond' ? 40 : 28));
      const h = shape === 'diamond' ? 54 : 38;

      nodeMap.set(id, { id, label, shape, highlight, width: w, height: h });
      g.setNode(id, { label, width: w, height: h });
    }

    return id;
  }

  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;

    // Pattern: NodeA -> NodeB: label or NodeA --> NodeB
    const match = raw.match(/^([^\-\<\>]+?)\s*(\-\->|\->|<\->)\s*([^:]+?)(?:\s*:\s*(.*))?$/);
    if (match) {
      const fromId = parseNodeToken(match[1]);
      const arrow = match[2].trim();
      const toId = parseNodeToken(match[3]);
      const label = match[4] ? match[4].trim() : '';

      const isDashed = arrow === '-->';
      const isBi = arrow === '<->';

      edgeList.push({
        from: fromId,
        to: toId,
        label,
        dashed: isDashed,
        bi: isBi
      });

      g.setEdge(fromId, toId, { label });
      return;
    }

    // Node only declaration (e.g. *Main Service*)
    if (raw.startsWith('[') || raw.startsWith('(') || raw.startsWith('{') || raw.startsWith('*')) {
      parseNodeToken(raw);
      return;
    }

    throw new BriefSyntaxError({
      component: 'flow',
      line: startLine + idx,
      message: `Invalid flow syntax. Expected 'A -> B: label' or 'A --> B'`,
      sourceSnippet: line,
      example: `\`\`\`flow LR\n[Client] -> [Gateway]: HTTPS Request\n[Gateway] -> {Auth Check}: Validate\n{Auth Check} -> [Service]: Authorized\n\`\`\``
    });
  });

  if (nodeMap.size === 0) return '';

  dagre.layout(g);

  const graphInfo = g.graph();
  const totalWidth = Math.ceil(graphInfo.width || 600) + 40;
  const totalHeight = Math.ceil(graphInfo.height || 400) + 40;

  // Build SVG
  let svg = `<svg class="brief-flow-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">\n`;

  // Defs: Arrow markers
  svg += `
  <defs>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
    </marker>
    <marker id="flow-arrow-rev" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 10 1 L 0 5 L 10 9 z" fill="currentColor" />
    </marker>
  </defs>
  `;

  // Draw Edges
  edgeList.forEach(edge => {
    const dagreEdge = g.edge(edge.from, edge.to);
    if (!dagreEdge || !dagreEdge.points || dagreEdge.points.length === 0) return;

    const pts = dagreEdge.points;
    let pathData = `M ${pts[0].x + 20} ${pts[0].y + 20}`;
    for (let i = 1; i < pts.length; i++) {
      pathData += ` L ${pts[i].x + 20} ${pts[i].y + 20}`;
    }

    svg += `
    <g class="flow-edge">
      <path d="${pathData}"
            class="flow-edge-path"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            ${edge.dashed ? 'stroke-dasharray="5,4"' : ''}
            marker-end="url(#flow-arrow)"
            ${edge.bi ? 'marker-start="url(#flow-arrow-rev)"' : ''} />
    `;

    // Edge Label
    if (edge.label) {
      const midPoint = pts[Math.floor(pts.length / 2)];
      const lx = midPoint.x + 20;
      const ly = midPoint.y + 14;
      const labelW = edge.label.length * 8 + 14;

      svg += `
      <g class="flow-edge-label" transform="translate(${lx}, ${ly})">
        <rect x="${-labelW / 2}" y="-11" width="${labelW}" height="18" rx="4" class="flow-label-bg" />
        <text x="0" y="2" text-anchor="middle" class="flow-label-text">${escapeHtml(edge.label)}</text>
      </g>
      `;
    }

    svg += `</g>\n`;
  });

  // Draw Nodes
  nodeMap.forEach(node => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return;

    const nx = dagreNode.x + 20;
    const ny = dagreNode.y + 20;
    const w = node.width;
    const h = node.height;
    const isHighlight = node.highlight;

    let shapeSvg = '';
    if (node.shape === 'pill') {
      shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" class="flow-node-shape ${isHighlight ? 'flow-highlight' : ''}" />`;
    } else if (node.shape === 'diamond') {
      const p1 = `0,${-h / 2}`;
      const p2 = `${w / 2},0`;
      const p3 = `0,${h / 2}`;
      const p4 = `${-w / 2},0`;
      shapeSvg = `<polygon points="${p1} ${p2} ${p3} ${p4}" class="flow-node-shape flow-diamond ${isHighlight ? 'flow-highlight' : ''}" />`;
    } else {
      shapeSvg = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" class="flow-node-shape ${isHighlight ? 'flow-highlight' : ''}" />`;
    }

    svg += `
    <g class="flow-node" transform="translate(${nx}, ${ny})">
      ${shapeSvg}
      <text x="0" y="4" text-anchor="middle" class="flow-node-text ${isHighlight ? 'flow-highlight-text' : ''}">${escapeHtml(node.label)}</text>
    </g>
    `;
  });

  svg += `</svg>`;
  return `<div class="brief-flow-container">${svg}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
