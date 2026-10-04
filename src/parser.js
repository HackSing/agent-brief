/**
 * Markdown DSL Parser for Agent Brief.
 * Splits document into metadata, global overview, and structured grid panels.
 */

export class BriefParser {
  /**
   * Parse a raw Markdown brief into an AST structure
   * @param {string} raw
   * @returns {{meta: Object, overview: string, panels: Array<Object>}}
   */
  static parse(raw) {
    const lines = raw.split(/\r?\n/);
    let frontmatterStr = '';
    let bodyStartIndex = 0;

    // 1. Extract YAML frontmatter
    if (lines[0]?.trim() === '---') {
      let fmEndIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          fmEndIndex = i;
          break;
        }
      }

      if (fmEndIndex !== -1) {
        frontmatterStr = lines.slice(1, fmEndIndex).join('\n');
        bodyStartIndex = fmEndIndex + 1;
      }
    }

    const meta = this.parseFrontmatter(frontmatterStr);

    // 2. Parse overview and ## panels with accurate line mapping
    let overviewLines = [];
    const panels = [];
    let currentPanel = null;

    for (let i = bodyStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1; // 1-based index

      // Check for panel header: ## Title {attrs}
      const headerMatch = line.match(/^##\s+([^\{]+?)(?:\{([^\}]+)\})?\s*$/);
      if (headerMatch) {
        if (currentPanel) {
          panels.push(currentPanel);
        }

        const rawTitle = headerMatch[1].trim();
        const rawAttrs = headerMatch[2] || '';
        const attrs = this.parseAttributes(rawAttrs);

        currentPanel = {
          title: rawTitle,
          span: Number(attrs.span) || 1,
          rows: Number(attrs.rows) || 1,
          badge: attrs.badge || attrs.meta || '',
          id: attrs.id || `panel-${panels.length + 1}`,
          startLine: lineNum,
          lines: []
        };
      } else {
        if (currentPanel) {
          currentPanel.lines.push({ text: line, lineNum });
        } else {
          overviewLines.push({ text: line, lineNum });
        }
      }
    }

    if (currentPanel) {
      panels.push(currentPanel);
    }

    return {
      meta,
      overview: overviewLines.map(l => l.text).join('\n').trim(),
      panels
    };
  }

  /**
   * Simple zero-dependency key-value frontmatter parser
   * @param {string} str
   * @returns {Object}
   */
  static parseFrontmatter(str) {
    const meta = {
      title: 'Technical Brief',
      subtitle: '',
      layout: 'canvas',
      theme: 'slate',
      cols: 3,
      source: '',
      badge: ''
    };

    if (!str.trim()) return meta;

    const lines = str.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();

        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }

        if (key === 'cols') {
          meta.cols = Number(val) || 3;
        } else {
          meta[key] = val;
        }
      }
    }

    return meta;
  }

  /**
   * Parse panel attribute strings like `span=2 rows=1 badge="核心"`
   * @param {string} attrStr
   * @returns {Object}
   */
  static parseAttributes(attrStr) {
    const attrs = {};
    if (!attrStr) return attrs;

    const regex = /([a-zA-Z0-9_-]+)(?:=("[^"]*"|'[^']*'|[^\s]+))?/g;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
      const key = match[1];
      let val = match[2] ?? true;
      if (typeof val === 'string') {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
      }
      attrs[key] = val;
    }

    return attrs;
  }
}
