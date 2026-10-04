/**
 * Template Dispatcher for Agent Brief.
 */

import { renderSheetTemplate } from './sheet.js';
import { renderDocTemplate } from './doc.js';

export function renderTemplate(layout = 'canvas', data) {
  if (layout === 'doc' || layout === 'document') {
    return renderDocTemplate(data);
  }
  return renderSheetTemplate(data);
}
