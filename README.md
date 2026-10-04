# Agent Brief (agent-brief)

> **High-density visual HTML explainer compiler & Agent Skill for AI coding assistants.**  
> Turn ~800 tokens of Markdown DSL into responsive, zero-dependency one-page HTML briefs in 50ms.

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node.js: >=20">
  <img src="https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Cursor%20%C2%B7%20Codex%20%C2%B7%20OpenCode-black" alt="Compatible Agents">
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87%E6%96%87%E6%A1%A3-blue" alt="Chinese Documentation"></a>
</p>

---

## 💡 Why Agent Brief?

When asking LLM Agents complex technical questions (such as distributed transactions, protocol handshakes, architecture migrations, or technology tradeoffs), users are often greeted by either:
1. **A wall of text**: Exhausting to read and hard to extract structural relationships.
2. **Directly asking the agent to write HTML**: Consumes 6,000–10,000 output tokens. The agent spends most of its generation budget generating repetitive CSS, wrapper `div`s, and calculating error-prone SVG coordinates (often resulting in floating arrows or broken layouts).

### The Solution: Deterministic Code Offloading
`agent-brief` delegates repetitive layout and styling to a deterministic compiler:
- The model outputs only a **concise ~800-token Markdown draft**.
- The local CLI (`brief`) compiles it in **~50 ms** into a **zero-dependency, responsive, single-file HTML document**.
- Built-in **Self-Correction protocol**: Syntax errors output the exact line number and a drop-in template, allowing the agent to self-heal in the next turn.

---

## ⚡ Quick Start

### 1. Run with npx / Node.js
```bash
# Clone the repository
git clone https://github.com/HackSing/agent-brief.git
cd agent-brief
npm install

# Render an example brief
node bin/brief.js render examples/oauth2.md -o dist/oauth2.html
```

### 2. Install as an Agent Skill
Copy the `skills/agent-brief` folder into your agent's skills directory:
- **Claude Code**: `~/.claude/skills/agent-brief`
- **Cursor**: `~/.cursor/skills/agent-brief`
- **Codex**: `~/.codex/skills/agent-brief`
- **OpenCode**: `~/.config/opencode/skill/agent-brief`

The bundled executable `skills/agent-brief/scripts/brief.mjs` is completely standalone and requires no `node_modules` installation.

---

## 📊 Feature Highlights

- **📐 Layout Engine**:
  - `canvas`: Multi-panel responsive CSS Grid with automatic card stretching and custom `span`/`rows`.
  - `doc`: Single-column readable reader view.
- **🎨 Visual Component Suite**:
  - `flow`: Flowcharts with directed acyclic graph (DAG) layout, supporting rectangular, capsule, and diamond decision nodes.
  - `sequence`: Actor lifelines, notes, numbered messages, and bidirectional arrows.
  - `kv`: High-density key-value and KPI grid cards.
  - `callout`: `info`, `tip`, `warn`, and `danger` alert cards.
  - `timeline`: Milestone roadmap and progression tracks.
  - `compare`: Feature and tradeoff comparison matrices.
  - `tree`: Hierarchical file and module trees.
  - **Enhanced Tables**: Markdown table cells starting with `ok`, `no`, `warn`, or `info` are automatically converted into colorful status pills.
- **🛡️ Writing Quality Linter**: Inspired by technical clarity guidelines (STE), flags passive voice, sentence bloat, and empty boilerplate.
- **🌓 Interactive Client Runtime**: Zero CDN dependencies. Built-in light/dark mode switcher, theme picker (`slate`, `nord`, `paper`), print stylesheet, and raw Markdown drawer.

---

## 📝 Markdown DSL Syntax

```markdown
---
title: OAuth 2.0 PKCE Flow
subtitle: Protocol interaction & security considerations
layout: canvas
theme: slate
cols: 3
source: RFC 7636
badge: Security
---
High-level overview description of the architecture.

## 1. Handshake Sequence {span=2 rows=1 badge="Core"}
\`\`\`sequence num
participants: User, Client, AuthServer
User -> Client: Click Login
Client -> AuthServer: /authorize?code_challenge=S256
AuthServer --> Client: Auth Code
Client -> AuthServer: /token (with code_verifier)
note AuthServer: Verify PKCE hash
AuthServer --> Client: Access Token
\`\`\`

## 2. Security Parameters {span=1 rows=1}
\`\`\`kv cols=1
Token TTL: 7200s
Algorithm: RS256
Code Window: 60s
\`\`\`

## 3. Technology Tradeoffs {span=2 rows=1}
\`\`\`compare
Flow | PKCE Extension | Implicit Grant (Deprecated)
Security | ok High (RFC 7636) | no Insecure
Tokens | Encrypted Header | URL Fragment (Exposed)
\`\`\`

## 4. Best Practices {span=1 rows=1}
\`\`\`callout warn Storage Policy
Never store sensitive tokens in LocalStorage. Prefer memory or secure HttpOnly cookies.
\`\`\`
```

---

## 🛠️ CLI Commands

```bash
# Render from file
brief render draft.md -o output.html

# Render from stdin (Pipes & Heredocs)
cat draft.md | brief render -

# Check technical writing quality
brief check draft.md --strict
```

---

## 📄 License

MIT License © 2026 HackSing
