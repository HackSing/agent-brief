/**
 * Agent Brief - High-density visual brief compiler for AI agents.
 * Clean-room architecture.
 */

import { BriefParser } from './parser.js';
import { BriefLinter } from './linter.js';
import { PanelRenderer } from './render.js';
import { renderTemplate } from './templates/index.js';
import { BriefSyntaxError } from './diagnostic.js';

export { BriefParser, BriefLinter, BriefSyntaxError };

/**
 * Compile Markdown brief into a standalone, zero-dependency HTML page.
 * @param {string} source - Markdown input string
 * @param {Object} options - Compiler options
 * @param {boolean} [options.strict=false] - Whether lint warnings should be treated as errors
 * @param {string} [options.overrideTheme] - Theme override
 * @returns {{html: string, meta: Object, warnings: Array<Object>}}
 */
export function compileBrief(source, options = {}) {
  // 1. Run technical writing quality checks
  const warnings = BriefLinter.lint(source);
  if (options.strict && warnings.length > 0) {
    const first = warnings[0];
    throw new BriefSyntaxError({
      component: 'linter',
      line: first.line,
      message: `[Strict Mode] Lint rule violation: ${first.message}`,
      sourceSnippet: ''
    });
  }

  // 2. Parse Markdown DSL into AST
  const parsed = BriefParser.parse(source);
  const meta = { ...parsed.meta };
  if (options.overrideTheme) {
    meta.theme = options.overrideTheme;
  }

  // 3. Render Overview Section
  const overviewHtml = PanelRenderer.renderOverview(parsed.overview);

  // 4. Render All Panels
  const panelsHtml = parsed.panels.map(panel => PanelRenderer.renderPanel(panel));

  // 5. Wrap into standalone HTML document
  const html = renderTemplate(meta.layout, {
    meta,
    overviewHtml,
    panelsHtml,
    rawSource: source
  });

  return {
    html,
    meta,
    warnings
  };
}
