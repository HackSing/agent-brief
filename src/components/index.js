/**
 * Visual Component Registry for Agent Brief.
 */

import { renderCallout } from './callout.js';
import { renderKv } from './kv.js';
import { renderTimeline } from './timeline.js';
import { renderTree } from './tree.js';
import { renderCompare } from './compare.js';
import { renderSequence } from './sequence.js';
import { renderFlow } from './flow.js';

export const COMPONENT_REGISTRY = {
  callout: renderCallout,
  kv: renderKv,
  timeline: renderTimeline,
  tree: renderTree,
  compare: renderCompare,
  sequence: renderSequence,
  flow: renderFlow
};

/**
 * Check if a code fence language is a registered visual component
 * @param {string} name
 * @returns {boolean}
 */
export function isComponent(name) {
  if (!name) return false;
  const key = name.toLowerCase().split(/\s+/)[0];
  return Boolean(COMPONENT_REGISTRY[key]);
}

/**
 * Render a visual component by name
 * @param {string} name
 * @param {string} body
 * @param {string} meta
 * @param {number} startLine
 * @returns {string}
 */
export function renderComponent(name, body, meta, startLine = 1) {
  const key = name.toLowerCase().split(/\s+/)[0];
  const renderer = COMPONENT_REGISTRY[key];
  if (!renderer) {
    return `<pre><code class="language-${name}">${escapeHtml(body)}</code></pre>`;
  }

  // Pass remaining metadata after component name
  const extraMeta = meta ? `${name.slice(key.length).trim()} ${meta}`.trim() : name.slice(key.length).trim();
  return renderer(body, extraMeta, startLine);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
