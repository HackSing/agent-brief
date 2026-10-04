/**
 * Theme and Stylesheet Generator for Agent Brief.
 */

export const THEMES = {
  slate: {
    name: 'Slate',
    dark: {
      bg: '#0f172a',
      surface: '#1e293b',
      surfaceRaised: '#334155',
      border: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      primary: '#38bdf8',
      accent: '#818cf8',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#38bdf8'
    },
    light: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceRaised: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: '#0284c7',
      accent: '#6366f1',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0284c7'
    }
  },
  nord: {
    name: 'Nord',
    dark: {
      bg: '#2e3440',
      surface: '#3b4252',
      surfaceRaised: '#434c5e',
      border: '#4c566a',
      text: '#eceff4',
      textMuted: '#d8dee9',
      primary: '#88c0d0',
      accent: '#81a1c1',
      success: '#a3be8c',
      warning: '#ebcb8b',
      danger: '#bf616a',
      info: '#88c0d0'
    },
    light: {
      bg: '#eceff4',
      surface: '#e5e9f0',
      surfaceRaised: '#d8dee9',
      border: '#c4cddb',
      text: '#2e3440',
      textMuted: '#4c566a',
      primary: '#5e81ac',
      accent: '#81a1c1',
      success: '#4f7b3c',
      warning: '#a87508',
      danger: '#9e323b',
      info: '#5e81ac'
    }
  },
  paper: {
    name: 'Paper',
    dark: {
      bg: '#18181b',
      surface: '#27272a',
      surfaceRaised: '#3f3f46',
      border: '#3f3f46',
      text: '#f4f4f5',
      textMuted: '#a1a1aa',
      primary: '#e4e4e7',
      accent: '#d4d4d8',
      success: '#4ade80',
      warning: '#facc15',
      danger: '#f87171',
      info: '#60a5fa'
    },
    light: {
      bg: '#fafaf9',
      surface: '#ffffff',
      surfaceRaised: '#f5f5f4',
      border: '#e7e5e4',
      text: '#1c1917',
      textMuted: '#78716c',
      primary: '#292524',
      accent: '#44403c',
      success: '#16a34a',
      warning: '#ca8a04',
      danger: '#dc2626',
      info: '#2563eb'
    }
  }
};

export function generateStyles(defaultTheme = 'slate') {
  return `
/* Base Reset & Variables */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);

  /* Theme Defaults (Dark Slate) */
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-raised: #334155;
  --border: #334155;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --primary: #38bdf8;
  --accent: #818cf8;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
  --info: #38bdf8;
}

[data-theme="slate"][data-mode="light"] {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-raised: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;
  --primary: #0284c7;
  --accent: #6366f1;
  --success: #059669;
  --warning: #d97706;
  --danger: #dc2626;
  --info: #0284c7;
}

[data-theme="nord"][data-mode="dark"] {
  --bg: #2e3440;
  --surface: #3b4252;
  --surface-raised: #434c5e;
  --border: #4c566a;
  --text: #eceff4;
  --text-muted: #d8dee9;
  --primary: #88c0d0;
  --accent: #81a1c1;
  --success: #a3be8c;
  --warning: #ebcb8b;
  --danger: #bf616a;
  --info: #88c0d0;
}

[data-theme="nord"][data-mode="light"] {
  --bg: #eceff4;
  --surface: #e5e9f0;
  --surface-raised: #d8dee9;
  --border: #c4cddb;
  --text: #2e3440;
  --text-muted: #4c566a;
  --primary: #5e81ac;
  --accent: #81a1c1;
  --success: #4f7b3c;
  --warning: #a87508;
  --danger: #9e323b;
  --info: #5e81ac;
}

[data-theme="paper"][data-mode="light"] {
  --bg: #fafaf9;
  --surface: #ffffff;
  --surface-raised: #f5f5f4;
  --border: #e7e5e4;
  --text: #1c1917;
  --text-muted: #78716c;
  --primary: #292524;
  --accent: #44403c;
  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #dc2626;
  --info: #2563eb;
}

[data-theme="paper"][data-mode="dark"] {
  --bg: #18181b;
  --surface: #27272a;
  --surface-raised: #3f3f46;
  --border: #3f3f46;
  --text: #f4f4f5;
  --text-muted: #a1a1aa;
  --primary: #e4e4e7;
  --accent: #d4d4d8;
  --success: #4ade80;
  --warning: #facc15;
  --danger: #f87171;
  --info: #60a5fa;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  padding: 24px;
  -webkit-font-smoothing: antialiased;
}

.brief-container {
  max-width: 1380px;
  margin: 0 auto;
}

/* Header & Controls */
.brief-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.brief-meta {
  flex: 1;
}

.brief-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.brief-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.brief-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--surface-raised);
  color: var(--primary);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.brief-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.brief-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-ctrl {
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-ctrl:hover {
  background: var(--surface-raised);
  color: var(--text);
}

.theme-select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
}

/* Overview Banner */
.brief-overview {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.brief-overview p {
  margin: 0;
}

/* Canvas Grid */
.brief-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols, 3), minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .brief-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 640px) {
  .brief-grid {
    grid-template-columns: 1fr !important;
  }
}

/* Panel Card */
.brief-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s ease;
}

.brief-panel:hover {
  border-color: var(--primary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.panel-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-raised);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.panel-body {
  font-size: 13px;
  color: var(--text);
  flex: 1;
}

.panel-body p {
  margin-bottom: 10px;
}

.panel-body ul, .panel-body ol {
  margin-left: 20px;
  margin-bottom: 10px;
}

.panel-body li {
  margin-bottom: 4px;
}

/* Markdown Tables */
.panel-body table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 12px;
}

.panel-body th, .panel-body td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}

.panel-body th {
  background: var(--surface-raised);
  font-weight: 600;
  color: var(--text-muted);
}

/* Status Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
}

.badge-success {
  background: rgba(52, 211, 153, 0.12);
  color: var(--success);
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.badge-warning {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.badge-danger {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.badge-info {
  background: rgba(56, 189, 248, 0.12);
  color: var(--info);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

/* Callouts */
.brief-callout {
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--info);
  background: var(--surface-raised);
  padding: 12px 14px;
  margin-bottom: 12px;
  font-size: 13px;
}

.callout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.callout-title {
  font-weight: 600;
  color: var(--text);
}

.callout-info { border-left-color: var(--info); }
.callout-tip { border-left-color: var(--success); }
.callout-warn { border-left-color: var(--warning); }
.callout-danger { border-left-color: var(--danger); }

/* KV Grid */
.brief-kv-grid {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.kv-cols-1 { grid-template-columns: 1fr; }
.kv-cols-2 { grid-template-columns: repeat(2, 1fr); }
.kv-cols-3 { grid-template-columns: repeat(3, 1fr); }

.kv-item {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.kv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.kv-key {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.kv-badge {
  font-size: 10px;
  background: var(--surface);
  color: var(--primary);
  padding: 0 4px;
  border-radius: 2px;
}

.kv-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  font-family: var(--font-mono);
}

/* Timeline */
.brief-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  position: relative;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
  margin-top: 4px;
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: var(--border);
  margin-top: 4px;
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.timeline-tag {
  font-size: 10px;
  background: var(--surface-raised);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.timeline-desc {
  font-size: 12px;
  color: var(--text-muted);
}

/* Tree Component */
.brief-tree {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 12px;
}

.tree-line {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.6;
}

.tree-icon {
  color: var(--text-muted);
  display: inline-flex;
}

/* Compare Table */
.brief-compare-wrapper {
  overflow-x: auto;
  margin-bottom: 12px;
}

.brief-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.brief-compare-table th, .brief-compare-table td {
  border: 1px solid var(--border);
  padding: 8px 12px;
}

.brief-compare-table th {
  background: var(--surface-raised);
}

.th-dim, .td-dim {
  font-weight: 600;
  background: var(--surface-raised);
  width: 28%;
}

/* SVG Diagrams (Flow & Sequence) */
.brief-flow-container, .brief-sequence-container {
  display: flex;
  justify-content: center;
  margin: 8px 0 12px;
  overflow-x: auto;
}

.brief-flow-svg, .brief-sequence-svg {
  max-width: 100%;
  height: auto;
}

/* Flowchart SVG Styles */
.flow-node-shape {
  fill: var(--surface-raised);
  stroke: var(--border);
  stroke-width: 1.5;
  transition: all 0.2s ease;
}

.flow-node-shape:hover {
  stroke: var(--primary);
}

.flow-highlight {
  fill: rgba(56, 189, 248, 0.15) !important;
  stroke: var(--primary) !important;
  stroke-width: 2 !important;
}

.flow-node-text {
  font-size: 12px;
  font-weight: 500;
  fill: var(--text);
  font-family: var(--font-sans);
}

.flow-highlight-text {
  fill: var(--primary);
  font-weight: 600;
}

.flow-edge-path {
  stroke: var(--text-muted);
}

.flow-label-bg {
  fill: var(--surface);
  stroke: var(--border);
  stroke-width: 1;
}

.flow-label-text {
  font-size: 10px;
  fill: var(--text-muted);
  font-family: var(--font-sans);
}

/* Sequence SVG Styles */
.seq-actor-box {
  fill: var(--surface-raised);
  stroke: var(--border);
  stroke-width: 1.5;
}

.seq-actor-text {
  font-size: 12px;
  font-weight: 600;
  fill: var(--text);
  font-family: var(--font-sans);
}

.seq-lifeline {
  stroke: var(--text-muted);
}

.seq-msg-line {
  stroke: var(--primary);
}

.seq-msg-text {
  font-size: 11px;
  fill: var(--text);
  font-family: var(--font-sans);
  font-weight: 500;
}

.seq-note-box {
  fill: var(--surface-raised);
  stroke: var(--accent);
  stroke-width: 1;
}

.seq-note-text {
  font-size: 10px;
  fill: var(--accent);
  font-family: var(--font-sans);
}

/* Code Blocks */
.brief-code-block {
  margin-bottom: 12px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.code-header {
  font-size: 11px;
  text-transform: uppercase;
  font-family: var(--font-mono);
  color: var(--text-muted);
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--border);
}

.brief-code-block pre {
  padding: 10px 12px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
}

/* Modal Drawer for Raw Markdown */
.brief-drawer {
  display: none;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 450px;
  max-width: 90vw;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  flex-direction: column;
}

.brief-drawer.open {
  display: flex;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.drawer-title {
  font-size: 14px;
  font-weight: 600;
}

.drawer-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.drawer-textarea {
  flex: 1;
  width: 100%;
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  resize: none;
}

/* Print Styles */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
  }
  .brief-controls, .brief-drawer {
    display: none !important;
  }
  .brief-panel {
    border: 1px solid #ccc !important;
    break-inside: avoid;
    box-shadow: none !important;
  }
  .flow-node-shape, .seq-actor-box {
    stroke: #333 !important;
    fill: #f5f5f5 !important;
  }
}
`;
}
