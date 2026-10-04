/**
 * Diagnostic and error feedback system for Agent Brief.
 * Designed specifically for LLM Agents to auto-correct syntax errors.
 */

export class BriefSyntaxError extends Error {
  /**
   * @param {Object} options
   * @param {string} options.component - Name of component (e.g. 'flow', 'sequence')
   * @param {number} options.line - Source line number (1-based)
   * @param {string} options.message - Error explanation
   * @param {string} options.sourceSnippet - The problematic line or context
   * @param {string} options.example - Valid usage example for LLM self-correction
   */
  constructor({ component, line, message, sourceSnippet = '', example = '' }) {
    super(`[${component}] Line ${line}: ${message}`);
    this.name = 'BriefSyntaxError';
    this.component = component;
    this.line = line;
    this.sourceSnippet = sourceSnippet;
    this.example = example;
  }

  formatOutput() {
    let out = `\x1b[31m✗ Parse Error in <${this.component}> at line ${this.line}:\x1b[0m\n`;
    out += `  Message: ${this.message}\n`;
    if (this.sourceSnippet) {
      out += `  Offending Line:\n    \x1b[33m${this.sourceSnippet}\x1b[0m\n`;
    }
    if (this.example) {
      out += `\n  \x1b[32m✔ Correct Syntax Example for <${this.component}>:\x1b[0m\n`;
      const lines = this.example.trim().split('\n').map(l => `    ${l}`).join('\n');
      out += `${lines}\n`;
    }
    return out;
  }
}

export const COMPONENT_EXAMPLES = {
  flow: `\`\`\`flow LR
[Client] -> [API Gateway]: Send Request
[API Gateway] -> {Auth Check}: Validate Token
{Auth Check} -> [Service A]: Authorized
{Auth Check} --> [Error 401]: Denied
*Highlighted Target* -> [Database]
\`\`\``,

  sequence: `\`\`\`sequence num
participants: User, Client, Server, DB
User -> Client: Click Login
Client -> Server: POST /login (auth payload)
Server -> DB: Query Credentials
DB --> Server: Return User Record
note Server: Verify password hash & generate JWT
Server --> Client: 200 OK (access_token)
Client --> User: Redirect to Dashboard
\`\`\``,

  kv: `\`\`\`kv cols=2
Latency SLA: < 50ms (p99)
Throughput: 120,000 req/sec
Failover Mode: Automatic Multi-AZ
Cache Eviction: LRU with TTL jitter
\`\`\``,

  callout: `\`\`\`callout warn Security Note
Tokens must be transmitted exclusively via HTTPS headers and stored in secure HttpOnly cookies.
\`\`\``,

  timeline: `\`\`\`timeline
- Phase 1 [Q1 2026]: Architecture specification & proof-of-concept
- Phase 2 [Q2 2026]: Core compiler & AST transformation pipeline
- Phase 3 [Q3 2026]: Multi-agent collaborative visualization integration
\`\`\``,

  tree: `\`\`\`tree
src/
├── parser/
│   ├── frontmatter.js
│   └── panel.js
├── render/
│   ├── svg.js
│   └── html.js
└── index.js
\`\`\``,

  compare: `\`\`\`compare
Dimension | Option A (Self-Hosted) | Option B (Managed SaaS)
Deployment Speed | Days | Instant setup
Maintenance Burden | High (Requires DevOps) | Zero (Automated upgrades)
Data Ownership | Full internal control | Shared responsibility model
\`\`\``
};
