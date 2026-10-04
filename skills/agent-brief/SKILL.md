---
name: agent-brief
description: Compile concise Markdown briefs into zero-dependency, responsive visual HTML explainer pages using diagrams (flow, sequence), KV specs, callouts, and comparison cards.
---

# Agent Brief Skill

Use this skill when answering complex technical architecture, protocols, tradeoffs, or system designs where an interactive, high-density visual page is significantly easier to understand than a lengthy wall of text.

Instead of writing verbose HTML, CSS, and SVG coordinates directly (which consumes thousands of tokens and often suffers from alignment issues), write an 800-token Markdown draft and run the bundled compiler.

## When to Use
- **Architecture & System Design**: Explaining service topologies, data flows, API gateways.
- **Protocols & Lifecycles**: TCP handshakes, OAuth 2.0 flows, consensus algorithms.
- **Technology Tradeoffs**: Redis vs Memcached, gRPC vs GraphQL, PostgreSQL vs MySQL.
- **Post-Mortems / RCA**: Timeline of incidents, root causes, mitigation action items.

---

## Output Workflow

1. Write your draft directly to the CLI via stdin heredoc:

```bash
node <skill_dir>/scripts/brief.mjs render - << 'EOF'
---
title: Topic Title
subtitle: Brief summary of the core insight
layout: canvas
theme: slate
cols: 3
source: RFC or Spec Reference
badge: Category
---
High-level overview paragraph explaining the fundamental concept.

## 1. Interaction Flow {span=2 rows=1 badge="Core"}
```sequence num
participants: Client, Gateway, Server
Client -> Gateway: GET /api/v1/resource
Gateway -> Server: Forward with JWT
note Server: Verify signature
Server --> Client: 200 OK (JSON payload)
```

## 2. Key Metrics {span=1 rows=1}
```kv cols=1
Latency (P99): < 20ms
Throughput: 50,000 req/s
Reliability SLO: 99.99%
```

## 3. Architecture Topology {span=2 rows=1}
```flow LR
[Client] -> [Load Balancer]: HTTPS
[Load Balancer] -> [App Cluster]: Round Robin
[App Cluster] -> *Primary DB*: Write
[App Cluster] --> [Read Replica]: Read
```

## 4. Key Notes {span=1 rows=1}
```callout tip Optimization Tip
Enable HTTP/2 keep-alive to reuse existing TCP connections.
```
EOF
```

2. The CLI compiles the page in ~50ms and prints:
   `✔ Page successfully generated: ~/.agent-brief/pages/<name>.html`
3. Reply to the user with a concise summary and provide the absolute path to the generated HTML file.

---

## DSL Reference

### Frontmatter
```yaml
---
title: "Document Title"
subtitle: "One sentence overview"
layout: canvas          # canvas (grid) | doc (single column)
theme: slate            # slate | nord | paper
cols: 3                 # Desktop grid columns (default: 3)
source: "Reference"     # Optional spec or source attribution
badge: "Tag"            # Optional category pill
---
```

### Grid Panels
`## Panel Title {span=2 rows=1 badge="Label" id="custom-id"}`
- `span`: Grid column span (1 to 3)
- `rows`: Grid row span (1 to 2)
- `badge`: Accent pill on top right of panel card

### Visual Components (Code Fences)

#### 1. `sequence [num]`
```sequence num
participants: User, App, DB
User -> App: Submit Form
App -> DB: INSERT Record
DB --> App: Confirmation
note App: Invalidate Cache
App --> User: Success Page
```

#### 2. `flow [LR|TD]`
```flow LR
[Input] -> {Valid?}: Check schema
{Valid?} -> *Processor*: Process
{Valid?} --> [Error 400]: Reject
*Processor* -> [Storage]
```
Shapes: `[Rect]`, `(Pill)`, `{Diamond}`, `*Highlighted*`.
Arrows: `->` (solid), `-->` (dashed), `<->` (bidirectional).

#### 3. `kv [cols=1|2|3]`
```kv cols=2
Port: 8080
Max Concurrency: 10,000
TLS Version [Mandatory]: 1.3
Timeout: 5000ms
```

#### 4. `callout [info|tip|warn|danger] [Title]`
```callout warn Security Notice
Do not store plain-text secrets in source control.
```

#### 5. `timeline`
```timeline
- Phase 1 [Jan 2026]: Initial architecture RFC
- Phase 2 [Mar 2026]: Core clustering implementation
- Phase 3 [May 2026]: Production canary rollout
```

#### 6. `compare`
```compare
Metric | Option A | Option B
Throughput | ok High | warn Moderate
Complexity | Low | High
```

#### 7. `tree`
```tree
src/
├── core/
│   └── engine.js
└── index.js
```

#### 8. Enhanced Tables
In standard Markdown tables, cells starting with `ok`, `no`, `warn`, or `info` automatically render as colored status badges.

---

## Error Recovery Protocol
If the CLI exits with an error:
1. It prints the exact offending line number and source snippet.
2. It prints the correct component template.
3. Fix the syntax based on the template and re-run. Do not attempt more than 2 retries.
