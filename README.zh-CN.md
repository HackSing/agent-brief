# Agent Brief (agent-brief)

> **专为 AI 编码助手设计的高密度可视化 HTML 简报编译器与 Agent Skill。**  
> 让模型仅需编写约 800 token 的 Markdown DSL，即可在 50ms 内极速编译出零外部依赖的单文件交互式 HTML 解释页。

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node.js: >=20">
  <img src="https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Cursor%20%C2%B7%20Codex%20%C2%B7%20OpenCode-black" alt="适配 Agent">
  <a href="README.md"><img src="https://img.shields.io/badge/docs-English-blue" alt="English Documentation"></a>
</p>

---

## 💡 为什么需要 Agent Brief？

当向编程 Agent 提问复杂的系统架构、协议握手、技术选型或排障复盘时，常见体验往往存在两难困境：
1. **纯文本回复（长篇大论）**：阅读体验枯燥，难以一眼看清模块关系、执行时序与数据流向。
2. **直接要求 Agent 手写 HTML/SVG**：模型通常需要消耗 6,000 ~ 10,000 个输出 token，大部分算力和时间浪费在重复的 CSS 样式、嵌套 `div` 和脆弱的 SVG 坐标运算上，且模型极其容易算错坐标导致箭头悬空或排版错乱。

### 解决方案：确定性工作交由本地代码处理
`agent-brief` 将排版与渲染工作从大模型剥离到本地编译器：
- 模型仅需输出一份紧凑的 **~800 token Markdown 稿件**；
- 内置 CLI（`brief`）在 **~50 毫秒** 内生成一个**零 CDN 外部依赖、自包含、支持响应式**的单文件 `.html`；
- 内置 **Agent 自愈纠错协议**：当输入语法有误时，精准指出所在源文件行号，并附上标准的语法修复范例，Agent 可在下一轮对话中一键无感修复。

---

## ⚡ 快速开始

### 1. 本地运行
```bash
git clone https://github.com/HackSing/agent-brief.git
cd agent-brief
npm install

# 渲染示例简报
node bin/brief.js render examples/oauth2.md -o dist/oauth2.html
```

### 2. 作为 Agent Skill 安装
将 `skills/agent-brief` 文件夹复制至对应的 Agent 技能目录：
- **Claude Code**: `~/.claude/skills/agent-brief`
- **Cursor**: `~/.cursor/skills/agent-brief`
- **Codex**: `~/.codex/skills/agent-brief`
- **OpenCode**: `~/.config/opencode/skill/agent-brief`

打包产物 `skills/agent-brief/scripts/brief.mjs` 经过 esbuild 单文件封装，无需执行任何 `npm install` 即可开箱即用。

---

## 📊 核心能力矩阵

- **📐 布局与排版**：
  - `canvas`：多卡片自适应 CSS Grid 网格，支持自定义跨列（`span`）与跨行（`rows`）。
  - `doc`：单栏阅读器视窗。
- **🎨 丰富可视化组件**：
  - `flow`：基于拓扑有向图（DAG）自动计算节点坐标与连线路径，支持矩形、胶囊、判断菱形与重点高亮。
  - `sequence`：时序图，支持角色生命线、说明便签、自动步长编号与双向箭头。
  - `kv`：高密度规格、指标与 SLA 参数卡片。
  - `callout`：支持 `info`、`tip`、`warn`、`danger` 等层级的预警卡片。
  - `timeline`：里程碑演进与排障时间线。
  - `compare`：技术方案与选型对比矩阵。
  - `tree`：目录层级与模块调用树。
  - **增强表格**：原生 Markdown 表格单元格中输入 `ok`、`no`、`warn` 等关键词，自动转换为醒目的状态徽章。
- **🛡️ 受控技术写作审查（Linter）**：支持句长控制、被动语态提示以及中文套话/虚动词检查。
- **🌓 现代化内嵌交互**：零外链资源。内置明暗模式切换、多套主题（`slate`、`nord`、`paper`）、打印排版优化以及源码一键复制抽屉。

---

## 🛠️ CLI 命令一览

```bash
# 从文件渲染
brief render draft.md -o output.html

# 管道流输入（支持 Agent heredoc）
cat draft.md | brief render -

# 写作规范质量检查
brief check draft.md --strict
```

---

## 📄 开源协议

本项目采用 [MIT 协议](LICENSE) 开源 © 2026 HackSing
