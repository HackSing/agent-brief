#!/usr/bin/env node

// bin/brief.js
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// src/parser.js
var BriefParser = class {
  /**
   * Parse a raw Markdown brief into an AST structure
   * @param {string} raw
   * @returns {{meta: Object, overview: string, panels: Array<Object>}}
   */
  static parse(raw) {
    const lines = raw.split(/\r?\n/);
    let frontmatterStr = "";
    let bodyStartIndex = 0;
    if (lines[0]?.trim() === "---") {
      let fmEndIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") {
          fmEndIndex = i;
          break;
        }
      }
      if (fmEndIndex !== -1) {
        frontmatterStr = lines.slice(1, fmEndIndex).join("\n");
        bodyStartIndex = fmEndIndex + 1;
      }
    }
    const meta = this.parseFrontmatter(frontmatterStr);
    let overviewLines = [];
    const panels = [];
    let currentPanel = null;
    for (let i = bodyStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const headerMatch = line.match(/^##\s+([^\{]+?)(?:\{([^\}]+)\})?\s*$/);
      if (headerMatch) {
        if (currentPanel) {
          panels.push(currentPanel);
        }
        const rawTitle = headerMatch[1].trim();
        const rawAttrs = headerMatch[2] || "";
        const attrs = this.parseAttributes(rawAttrs);
        currentPanel = {
          title: rawTitle,
          span: Number(attrs.span) || 1,
          rows: Number(attrs.rows) || 1,
          badge: attrs.badge || attrs.meta || "",
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
      overview: overviewLines.map((l3) => l3.text).join("\n").trim(),
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
      title: "Technical Brief",
      subtitle: "",
      layout: "canvas",
      theme: "slate",
      cols: 3,
      source: "",
      badge: ""
    };
    if (!str.trim()) return meta;
    const lines = str.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf(":");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        if (key === "cols") {
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
      if (typeof val === "string") {
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
      }
      attrs[key] = val;
    }
    return attrs;
  }
};

// src/linter.js
var CHINESE_BOILERPLATE = [
  { pattern: /对.{1,10}进行(优化|处理|重构|升级|分析|操作)/g, desc: "\u865A\u52A8\u8BCD\u5197\u4F59\uFF08\u5982\u201C\u5BF9X\u8FDB\u884C\u4F18\u5316\u201D\u53EF\u7B80\u5316\u4E3A\u201C\u4F18\u5316X\u201D\uFF09" },
  { pattern: /深入浅出|众所周知|毋庸置疑|显而易见|不可否认/g, desc: "\u4E3B\u89C2\u9648\u8BCD\u5957\u8BDD\uFF0C\u5EFA\u8BAE\u76F4\u63A5\u9648\u8FF0\u6280\u672F\u4E8B\u5B9E" },
  { pattern: /在.{1,8}的基础上/g, desc: "\u5197\u957F\u8FC7\u6E21\u8868\u8FBE\uFF0C\u53EF\u7CBE\u7B80" },
  { pattern: /有待于进一步/g, desc: "\u6A21\u7CCA\u8868\u8FF0\uFF0C\u5EFA\u8BAE\u660E\u786E\u5177\u4F53\u884C\u52A8\u6216\u6307\u6807" }
];
var ENGLISH_PASSIVE = /\b(is|are|was|were|been|being)\s+([a-z]+ed|[a-z]+en)\b/gi;
var BriefLinter = class {
  /**
   * Lint markdown content for technical clarity
   * @param {string} source
   * @returns {Array<{line: number, type: 'warning'|'style', message: string}>}
   */
  static lint(source) {
    const lines = source.split("\n");
    const issues = [];
    lines.forEach((rawLine, index) => {
      const lineNum = index + 1;
      const line = rawLine.trim();
      if (!line || line.startsWith("```") || line.startsWith("#") || line.startsWith("---") || line.startsWith("|")) {
        return;
      }
      const segments = line.split(/[，。！？；;,.!?]/);
      for (const seg of segments) {
        const trimmed = seg.trim();
        const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
        if (chineseChars > 45) {
          issues.push({
            line: lineNum,
            type: "style",
            message: `\u4E2D\u6587\u5355\u53E5\u8FC7\u957F\uFF08${chineseChars} \u5B57\uFF09\uFF0C\u5EFA\u8BAE\u62C6\u5206\u4E3A\u77ED\u53E5\u4EE5\u63D0\u9AD8\u53EF\u8BFB\u6027`
          });
          break;
        }
        const englishWords = trimmed.match(/[a-zA-Z]+/g) || [];
        if (englishWords.length > 25) {
          issues.push({
            line: lineNum,
            type: "style",
            message: `English sentence too long (${englishWords.length} words). Consider breaking it down.`
          });
          break;
        }
      }
      for (const rule of CHINESE_BOILERPLATE) {
        if (rule.pattern.test(line)) {
          issues.push({
            line: lineNum,
            type: "warning",
            message: `${rule.desc}`
          });
        }
      }
      const deMatches = line.match(/的/g);
      if (deMatches && deMatches.length >= 4 && line.length < 50) {
        issues.push({
          line: lineNum,
          type: "style",
          message: `\u5355\u884C\u5185\u5305\u542B ${deMatches.length} \u4E2A\u201C\u7684\u201D\u5B57\uFF0C\u53EF\u80FD\u5B58\u5728\u591A\u91CD\u5B9A\u8BED\u4FEE\u9970\uFF0C\u5EFA\u8BAE\u7B80\u5316\u53E5\u5F0F\u7ED3\u6784`
        });
      }
      const passiveMatches = line.match(ENGLISH_PASSIVE);
      if (passiveMatches) {
        issues.push({
          line: lineNum,
          type: "style",
          message: `Possible passive voice detected ("${passiveMatches[0]}"). Prefer active voice for clarity.`
        });
      }
    });
    return issues;
  }
};

// node_modules/marked/lib/marked.esm.js
function I() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var y = I();
function W(l3) {
  y = l3;
}
var A = { exec: () => null };
function C(l3) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), s = e[n];
    return s || (s = l3(n), e[n] = s), s;
  };
}
function h(l3, e = "") {
  let t = typeof l3 == "string" ? l3 : l3.source, n = { replace: (s, r) => {
    let o = typeof r == "string" ? r : r.source;
    return o = o.replace(x.caret, "$1"), t = t.replace(s, o), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var _e = ((l3 = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + l3);
  } catch {
    return false;
  }
})();
var x = { codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, endingSpaceTabChar: /[ \t]$/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, leadingSpaceTab: /^[ \t]+/, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/g, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l3) => new RegExp(`^( {0,3}${l3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: C((l3) => new RegExp(`^ {0,${l3}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)), fencesBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:\`\`\`|~~~)`)), headingBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}#`)), htmlBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}(?:</?(?:${N})(?: +|$|/?>)|<(?:script|pre|style|textarea|!--))`, "i")), blockquoteBeginRegex: C((l3) => new RegExp(`^ {0,${l3}}>`)) };
var $e = /^(?:[ \t]*(?:\n|$))+/;
var Le = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var ze = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var G = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Ae = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var J = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var ce = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var he = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Ee = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var V = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var Me = /^[^\n]+/;
var Y = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var Ie = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Y).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Ce = h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, J).getRegex();
var N = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var ee = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var Be = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", ee).replace("tag", N).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var de = (l3) => h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l3).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
var De = de(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var qe = de(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var ve = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", qe).getRegex();
var te = { blockquote: ve, code: Le, def: Ie, fences: ze, heading: Ae, hr: G, html: Be, lheading: he, list: Ce, newline: $e, paragraph: De, table: A, text: Me };
var le = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
var Ze = { ...te, lheading: Ee, table: le, paragraph: h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", le).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex() };
var He = { ...te, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", ee).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: A, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(V).replace("hr", G).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", he).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Ge = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ne = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var ke = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
var Qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var $ = /[\p{P}\p{S}]/u;
var B = /[\s\p{P}\p{S}]/u;
var Q = /[^\s\p{P}\p{S}]/u;
var je = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, B).getRegex();
var Fe = /[\p{Pi}\p{Ps}"']/u;
var ge = /(?!~)[\p{P}\p{S}]/u;
var Ue = /(?!~)[\s\p{P}\p{S}]/u;
var Ke = /(?:[^\s\p{P}\p{S}]|~)/u;
var We = h(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", _e ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var fe = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var Xe = h(fe, "u").replace(/punct/g, $).getRegex();
var Je = h(fe, "u").replace(/punct/g, ge).getRegex();
var Ve = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var Ye = h(Ve, "u").replace(/openQuote/g, Fe).replace(/punct/g, $).getRegex();
var me = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var et = h(me, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var tt = h(me, "gu").replace(/notPunctSpace/g, Ke).replace(/punctSpace/g, Ue).replace(/punct/g, ge).getRegex();
var nt = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var rt = h(nt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var st = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var it = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var ot = h(it, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var at = h(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, $).getRegex();
var lt = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var ut = h(lt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var pt = h(/\\(punct)/, "gu").replace(/punct/g, $).getRegex();
var ct = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var ht = h(ee).replace("(?:-->|$)", "-->").getRegex();
var dt = h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ht).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var xe = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
var U = h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", xe).getRegex();
var kt = h(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", U).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var gt = h(/^!?\[(label)\]\[(ref)\]/).replace("label", U).replace("ref", Y).getRegex();
var ft = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", Y).getRegex();
var ue = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
var mt = h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", xe).getRegex();
var xt = h("reflink|nolink(?!\\()", "g").replace("reflink", h(/^!?\[(label)\]\[(ref)\]/).replace("label", mt).replace("ref", ue).getRegex()).replace("nolink", h(/^!?\[(ref)\](?:\[\])?/).replace("ref", ue).getRegex()).getRegex();
var pe = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var bt = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
var Rt = h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, bt).getRegex();
var ne = { _backpedal: A, anyPunctuation: pt, autolink: ct, blockSkip: We, br: ke, code: Ne, del: A, delLDelim: A, delRDelim: A, emStrongLDelim: Xe, emStrongRDelimAst: et, emStrongRDelimUnd: st, escape: Ge, link: kt, nolink: ft, punctuation: je, reflink: gt, reflinkSearch: xt, tag: dt, text: Qe, url: A };
var Tt = { ...ne, emStrongLDelim: Ye, emStrongRDelimAst: rt, emStrongRDelimUnd: ot, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", U).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", U).getRegex() };
var X = { ...ne, emStrongRDelimAst: tt, emStrongLDelim: Je, delLDelim: at, delRDelim: ut, url: h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", Rt).replace("protocol", pe).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", pe).replace(/emailProtocol/g, /(?:mailto|xmpp):/).getRegex() };
var Ot = { ...X, br: h(ke).replace("{2,}", "*").getRegex(), text: h(X.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var j = { normal: te, gfm: Ze, pedantic: He };
var D = { normal: ne, gfm: X, breaks: Ot, pedantic: Tt };
var wt = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var be = (l3) => wt[l3];
function O(l3, e) {
  if (e) {
    if (x.escapeTest.test(l3)) return l3.replace(x.escapeReplace, be);
  } else if (x.escapeTestNoEncode.test(l3)) return l3.replace(x.escapeReplaceNoEncode, be);
  return l3;
}
function Re(l3) {
  return l3.replace(x.numericCharacterReference, (e, t, n) => {
    let s = t === void 0 ? Number.parseInt(n, 16) : Number.parseInt(t, 10);
    return s === 0 || s > 1114111 || s >= 55296 && s <= 57343 ? "\uFFFD" : String.fromCodePoint(s);
  });
}
function re(l3) {
  try {
    l3 = encodeURI(l3).replace(x.percentDecode, "%");
  } catch {
    return null;
  }
  return l3;
}
function se(l3, e) {
  let t = l3.replace(x.findPipe, (r, o, i) => {
    let u = false, a = o;
    for (; --a >= 0 && i[a] === "\\"; ) u = !u;
    return u ? "|" : " |";
  }), n = t.split(x.splitPipe), s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; s < n.length; s++) n[s] = n[s].trim().replace(x.slashPipe, "|");
  return n;
}
function L(l3, e, t) {
  let n = l3.length;
  if (n === 0) return "";
  let s = 0;
  for (; s < n; ) {
    let r = l3.charAt(n - s - 1);
    if (r === e && !t) s++;
    else if (r !== e && t) s++;
    else break;
  }
  return l3.slice(0, n - s);
}
function ie(l3) {
  let e = l3.split(`
`), t = e.length - 1;
  for (; t >= 0 && x.blankLine.test(e[t]); ) t--;
  return e.length - t <= 2 ? l3 : e.slice(0, t + 1).join(`
`);
}
function q(l3) {
  return l3.trim().toLowerCase().toUpperCase().toLowerCase();
}
function Te(l3, e) {
  if (l3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < l3.length; n++) if (l3[n] === "\\") n++;
  else if (l3[n] === e[0]) t++;
  else if (l3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function oe(l3, e = 0) {
  let t = e, n = "";
  for (let s of l3) if (s === "	") {
    let r = 4 - t % 4;
    n += " ".repeat(r), t += r;
  } else n += s, t++;
  return n;
}
function Oe(l3, e, t, n, s) {
  let r = e.href, o = e.title || null, i = l3[1].replace(s.other.outputLinkReplace, "$1"), u = l3[0].charAt(0) === "!";
  n.state.inLink = true;
  let a = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.linkEmitted = false;
  let c = n.inlineTokens(i), d = n.state.linkEmitted;
  if (n.state.linkEmitted = a, n.state.inLink = false, !u) {
    if (d) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: u ? "image" : "link", raw: t, href: r, title: o, text: i, tokens: c };
}
function yt(l3, e, t) {
  let n = l3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let s = n[1];
  return e.split(`
`).map((r) => {
    let o = r.match(t.other.beginningSpace);
    if (o === null) return r;
    let [i] = o;
    return r.slice(Math.min(i.length, s.length));
  }).join(`
`);
}
function we(l3, e, t, n) {
  if (!e.includes("<")) return false;
  for (let s = 0; s < e.length; s++) {
    if (e[s] === "\\") {
      s++;
      continue;
    }
    if (e[s] === "`") {
      let i = n.inline.code.exec(e.slice(s));
      if (i) {
        s += i[0].length - 1;
        continue;
      }
    }
    if (e[s] !== "<") continue;
    let r = l3.slice(t + s), o = n.inline.tag.exec(r) || n.inline.autolink.exec(r);
    if (o) {
      if (o[0].length > e.length - s) return true;
      s += o[0].length - 1;
    }
  }
  return false;
}
var P = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : ie(t[0]), s = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: s };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], s = yt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = L(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceTabChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: L(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: L(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = L(t[0], `
`).split(`
`), s = "", r = "", o = [];
      for (; n.length > 0; ) {
        let i = false, u = [], a;
        for (a = 0; a < n.length; a++) if (this.rules.other.blockquoteStart.test(n[a])) u.push(n[a]), i = true;
        else if (!i) u.push(n[a]);
        else break;
        n = n.slice(a);
        let p = u.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${p}` : p, r = r ? `${r}
${c}` : c;
        let d = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, o, true), this.lexer.state.top = d, n.length === 0) break;
        let m = o.at(-1);
        if (m?.type === "code") break;
        if (m?.type === "blockquote") {
          let b = m, g = n.join(`
`), w = b.raw + `
` + g.replace(this.rules.other.blockquoteSetextReplace2, ""), f = this.blockquote(w);
          o[o.length - 1] = f;
          let M2 = w.substring(f.raw.length).replace(/^\n/, ""), v = M2 ? M2.split(`
`).length : 0, Z2 = v ? n.slice(0, -v) : n;
          Z2.length > 0 && (s = `${s}
${Z2.join(`
`)}`), r = r.substring(0, r.length - b.text.length) + f.text;
          break;
        } else if (m?.type === "list") {
          let b = m, g = b.raw + `
` + n.join(`
`), w = this.list(g);
          o[o.length - 1] = w, s = s.substring(0, s.length - m.raw.length) + w.raw, r = r.substring(0, r.length - b.raw.length) + w.raw, n = g.substring(o.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: o, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let o = this.rules.other.listItemRegex(n), i = false;
      for (; e; ) {
        let a = false, p = "", c = "";
        if (!(t = o.exec(e)) || this.rules.block.hr.test(e)) break;
        p = t[0], e = e.substring(p.length);
        let d = t[2].split(`
`, 1)[0], m = t[1].length, b = this.options.pedantic ? oe(d, m) : d.replace(this.rules.other.leadingSpaceTab, (M2) => oe(M2, m)), g = e.split(`
`, 1)[0], w = !b.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = b.trimStart()) : w ? f = m + 1 : (f = b.search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = b.slice(f), f += m), w && this.rules.other.blankLine.test(g) && (p += g + `
`, e = e.substring(g.length + 1), a = true), !a) {
          let M2 = this.rules.other.nextBulletRegex(f), v = this.rules.other.hrRegex(f), Z2 = this.rules.other.fencesBeginRegex(f), ae2 = this.rules.other.headingBeginRegex(f), ye2 = this.rules.other.htmlBeginRegex(f), Pe2 = this.rules.other.blockquoteBeginRegex(f);
          for (; e; ) {
            let K2 = e.split(`
`, 1)[0], H2;
            if (g = K2, this.options.pedantic ? (g = g.replace(this.rules.other.listReplaceNesting, "  "), H2 = g) : H2 = g.replace(this.rules.other.leadingSpaceTab, (Se2) => Se2.replace(this.rules.other.tabCharGlobal, "    ")), Z2.test(g) || ae2.test(g) || ye2.test(g) || Pe2.test(g) || M2.test(g) || v.test(g)) break;
            if (H2.search(this.rules.other.nonSpaceChar) >= f || !g.trim()) c += `
` + H2.slice(f);
            else {
              if (w || b.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Z2.test(b) || ae2.test(b) || v.test(b)) break;
              c += `
` + g;
            }
            w = !g.trim(), p += K2 + `
`, e = e.substring(K2.length + 1), b = H2.slice(f);
          }
        }
        r.loose || (i ? r.loose = true : this.rules.other.doubleBlankLine.test(p) && (i = true)), r.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), r.raw += p;
      }
      let u = r.items.at(-1);
      if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else return;
      r.raw = r.raw.trimEnd();
      for (let a of r.items) if (this.lexer.state.top = false, a.tokens = this.lexer.blockTokens(a.text, []), !r.loose) {
        let p = a.tokens.filter((d) => d.type === "space"), c = p.length > 0 && p.some((d) => this.rules.other.anyLine.test(d.raw));
        r.loose = c;
      }
      for (let a of r.items) {
        let p = a.tokens[0];
        if (a.task && (p?.type === "text" || p?.type === "paragraph")) {
          a.text = a.text.replace(this.rules.other.listReplaceTask, ""), p.raw = p.raw.replace(this.rules.other.listReplaceTask, ""), p.text = p.text.replace(this.rules.other.listReplaceTask, "");
          for (let d = this.lexer.inlineQueue.length - 1; d >= 0; d--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[d].src)) {
            this.lexer.inlineQueue[d].src = this.lexer.inlineQueue[d].src.replace(this.rules.other.listReplaceTask, "");
            break;
          }
          let c = this.rules.other.listTaskCheckbox.exec(a.raw);
          if (c) {
            let d = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
            a.checked = d.checked, r.loose ? a.tokens[0] && ["paragraph", "text"].includes(a.tokens[0].type) && "tokens" in a.tokens[0] && a.tokens[0].tokens ? (a.tokens[0].raw = d.raw + a.tokens[0].raw, a.tokens[0].text = d.raw + a.tokens[0].text, a.tokens[0].tokens.unshift(d)) : a.tokens.unshift({ type: "paragraph", raw: d.raw, text: d.raw, tokens: [d] }) : a.tokens.unshift(d);
          }
        } else a.task && (a.task = false);
      }
      if (r.loose) for (let a of r.items) {
        a.loose = true;
        for (let p of a.tokens) p.type === "text" && (p.type = "paragraph");
      }
      return r;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = ie(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = q(t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: L(t[0], `
`), href: s, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = se(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: L(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let i of s) this.rules.other.tableAlignRight.test(i) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(i) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(i) ? o.align.push("left") : o.align.push(null);
      for (let i = 0; i < n.length; i++) o.header.push({ text: n[i], tokens: this.lexer.inline(n[i]), header: true, align: o.align[i] });
      for (let i of r) o.rows.push(se(i, o.header.length).map((u, a) => ({ text: u, tokens: this.lexer.inline(u), header: false, align: o.align[a] })));
      return o;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: L(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && we(e, t[1], n, this.rules)) return;
      let s = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(s)) {
        if (!this.rules.other.endAngleBracket.test(s)) return;
        let i = L(s.slice(0, -1), "\\");
        if ((s.length - i.length) % 2 === 0) return;
      } else {
        let i = Te(t[2], "()");
        if (i === -2) return;
        if (i > -1) {
          let a = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
          t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, a).trim(), t[3] = "";
        }
      }
      let r = t[2], o = "";
      if (this.options.pedantic) {
        let i = this.rules.other.pedanticHrefTitle.exec(r);
        i && (r = i[1], o = i[3]);
      } else o = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(s) ? r = r.slice(1) : r = r.slice(1, -1)), Oe(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: o && o.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let s = n[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && we(e, n[1], s, this.rules)) return;
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), o = t[q(r)];
      if (!o) {
        let i = n[0].charAt(0);
        return { type: "text", raw: i, text: i };
      }
      return Oe(n, o, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(e);
    if (!s || !s[1] && !s[2] && !s[3] && !s[4] || s[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(s[1] || s[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...s[0]].length - 1, i, u, a = o, p = 0, c = s[0][0], d = n === c, m = c === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (m.lastIndex = 0, t = t.slice(-1 * e.length + o); (s = m.exec(t)) !== null; ) {
        if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i) continue;
        if (u = [...i].length, s[3] || s[4]) {
          a += u;
          continue;
        } else if (s[5] || s[6]) {
          if (o % 3 && !((o + u) % 3)) {
            p += u;
            continue;
          }
          if (d) break;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a + p);
        let b = [...s[0]][0].length, g = e.slice(0, o + s.index + b + u);
        if (Math.min(o, u) % 2) {
          let f = g.slice(1, -1);
          return { type: "em", raw: g, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let w = g.slice(2, -2);
        return { type: "strong", raw: g, text: w, tokens: this.lexer.inlineTokens(w) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let s = this.rules.inline.delLDelim.exec(e);
    if (!s) return;
    if (!(s[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...s[0]].length - 1, i, u, a = o, p = this.rules.inline.delRDelim;
      for (p.lastIndex = 0, t = t.slice(-1 * e.length + o); (s = p.exec(t)) !== null; ) {
        if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i || (u = [...i].length, u !== o)) continue;
        if (s[3] || s[4]) {
          a += u;
          continue;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a);
        let c = [...s[0]][0].length, d = e.slice(0, o + s.index + c + u), m = d.slice(o, -o);
        return { type: "del", raw: d, text: m, tokens: this.lexer.inlineTokens(m) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, s;
      return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, s;
      if (t[2] === "@") n = t[0], s = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: n ? t[0] : Re(t[0]), escaped: n };
    }
  }
};
var R = class l {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || y, this.options.tokenizer = this.options.tokenizer || new P(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
    let t = { other: x, block: j.normal, inline: D.normal };
    this.options.pedantic ? (t.block = j.pedantic, t.inline = D.pedantic) : this.options.gfm && (t.block = j.gfm, this.options.breaks ? t.inline = D.breaks : t.inline = D.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: j, inline: D };
  }
  static lex(e, t) {
    return new l(t).lex(e);
  }
  static lexInline(e, t) {
    return new l(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(x.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(x.tabCharGlobal, "    ").replace(x.spaceLine, ""));
    let s = 1 / 0;
    for (; e; ) {
      if (e.length < s) s = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((i) => (r = i.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        r.raw.length === 1 && i !== void 0 ? i.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.at(-1).src = i.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.raw, this.inlineQueue.at(-1).src = i.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let o = e;
      if (this.options.extensions?.startBlock) {
        let i = 1 / 0, u = e.slice(1), a;
        this.options.extensions.startBlock.forEach((p) => {
          a = p.call({ lexer: this }, u), typeof a == "number" && a >= 0 && (i = Math.min(i, a));
        }), i < 1 / 0 && i >= 0 && (o = e.substring(0, i + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(o))) {
        let i = t.at(-1);
        n && i?.type === "paragraph" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r), n = o.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("[")) return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let s = n[0], r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, q(s.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(s.slice(1, r - 1)))) return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let i = this.tokenizer.rules.inline.reflinkSearch, u = (a) => {
        let p = a.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, q(a.slice(p + 1, -1)))) return a;
        if (p > 1 && a.charAt(0) !== "!") {
          let c = a.slice(1, p - 1);
          if (this.linkInText(c)) return "[" + c.replace(i, u) + "][" + "a".repeat(a.length - p - 2) + "]";
        }
        return "[" + "a".repeat(a.length - 2) + "]";
      };
      n = n.replace(i, u);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuation, (i) => "+".repeat(i.length)), n = n.replace(this.tokenizer.rules.inline.blockSkip, (i, u, a) => {
      let p = a ? a.length : 0;
      return i.slice(0, p) + "[" + "a".repeat(i.length - p - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, r = "", o = 1 / 0;
    for (; e; ) {
      if (e.length < o) o = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      s || (r = ""), s = false;
      let i;
      if (this.options.extensions?.inline?.some((a) => (i = a.call({ lexer: this }, e, t)) ? (e = e.substring(i.raw.length), t.push(i), true) : false)) continue;
      if (i = this.tokenizer.escape(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.tag(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.link(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(i.raw.length);
        let a = t.at(-1);
        i.type === "text" && a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
        continue;
      }
      if (i = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.codespan(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.br(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.del(e, n, r)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.autolink(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (!this.state.inLink && (i = this.tokenizer.url(e))) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      let u = e;
      if (this.options.extensions?.startInline) {
        let a = 1 / 0, p = e.slice(1), c;
        this.options.extensions.startInline.forEach((d) => {
          c = d.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
        }), a < 1 / 0 && a >= 0 && (u = e.substring(0, a + 1));
      }
      if (i = this.tokenizer.inlineText(u)) {
        e = e.substring(i.raw.length), i.raw.slice(-1) !== "_" && (r = i.raw.slice(-1)), s = true;
        let a = t.at(-1);
        a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent) console.error(t);
    else throw new Error(t);
  }
};
var S = class {
  options;
  parser;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let s = (t || "").match(x.notSpaceStart)?.[0], r = e ? e.replace(x.endingNewline, "") + `
` : "";
    return s ? '<pre><code class="language-' + O(s) + '">' + (n ? r : O(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : O(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, s = "";
    for (let i = 0; i < e.items.length; i++) {
      let u = e.items[i];
      s += this.listitem(u);
    }
    let r = t ? "ol" : "ul", o = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + o + `>
` + s + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let s = "";
    for (let r = 0; r < e.rows.length; r++) {
      let o = e.rows[r];
      n = "";
      for (let i = 0; i < o.length; i++) n += this.tablecell(o[i]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${O(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, text: n, tokens: s, autolink: r }) {
    let o = r ? O(n, true) : this.parser.parseInline(s), i = re(e);
    if (i === null) return o;
    e = O(i, r);
    let u = '<a href="' + e + '"';
    return t && (u += ' title="' + O(t) + '"'), u += ">" + o + "</a>", u;
  }
  image({ href: e, title: t, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = re(e);
    if (r === null) return O(n);
    e = r;
    let o = `<img src="${O(e)}" alt="${O(n)}"`;
    return t && (o += ` title="${O(t)}"`), o += ">", o;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : O(e.text);
  }
};
var z = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var T = class l2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || y, this.options.renderer = this.options.renderer || new S(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new z();
  }
  static parse(e, t) {
    return new l2(t).parse(e);
  }
  static parseInline(e, t) {
    return new l2(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let s = e[n];
      if (this.options.extensions?.renderers?.[s.type]) {
        let o = s, i = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (i !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(o.type)) {
          t += i || "";
          continue;
        }
      }
      let r = s;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let s = 0; s < e.length; s++) {
      let r = e[s];
      if (this.options.extensions?.renderers?.[r.type]) {
        let i = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (i !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += i || "";
          continue;
        }
      }
      let o = r;
      switch (o.type) {
        case "escape": {
          n += t.text(o);
          break;
        }
        case "html": {
          n += t.html(o);
          break;
        }
        case "link": {
          n += t.link(o);
          break;
        }
        case "image": {
          n += t.image(o);
          break;
        }
        case "checkbox": {
          n += t.checkbox(o);
          break;
        }
        case "strong": {
          n += t.strong(o);
          break;
        }
        case "em": {
          n += t.em(o);
          break;
        }
        case "codespan": {
          n += t.codespan(o);
          break;
        }
        case "br": {
          n += t.br(o);
          break;
        }
        case "del": {
          n += t.del(o);
          break;
        }
        case "text": {
          n += t.text(o);
          break;
        }
        default: {
          let i = 'Token with "' + o.type + '" type was not found.';
          if (this.options.silent) return console.error(i), "";
          throw new Error(i);
        }
      }
    }
    return n;
  }
};
var _ = class {
  options;
  block;
  constructor(e) {
    this.options = e || y;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? R.lex : R.lexInline;
  }
  provideParser(e = this.block) {
    return e ? T.parse : T.parseInline;
  }
};
var F = class {
  defaults = I();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = T;
  Renderer = S;
  TextRenderer = z;
  Lexer = R;
  Tokenizer = P;
  Hooks = _;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let s of e) switch (n = n.concat(t.call(this, s)), s.type) {
      case "table": {
        let r = s;
        for (let o of r.header) n = n.concat(this.walkTokens(o.tokens, t));
        for (let o of r.rows) for (let i of o) n = n.concat(this.walkTokens(i.tokens, t));
        break;
      }
      case "list": {
        let r = s;
        n = n.concat(this.walkTokens(r.items, t));
        break;
      }
      default: {
        let r = s;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
          let i = r[o].flat(1 / 0);
          n = n.concat(this.walkTokens(i, t));
        }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let o = t.renderers[r.name];
          o ? t.renderers[r.name] = function(...i) {
            let u = r.renderer.apply(this, i);
            return u === false && (u = o.apply(this, i)), u;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let o = t[r.level];
          o ? o.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), s.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new S(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o)) continue;
          let i = o, u = n.renderer[i], a = r[i];
          r[i] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new P(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o)) continue;
          let i = o, u = n.tokenizer[i], a = r[i];
          r[i] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new _();
        for (let o in n.hooks) {
          if (!(o in r)) throw new Error(`hook '${o}' does not exist`);
          if (["options", "block"].includes(o)) continue;
          let i = o, u = n.hooks[i], a = r[i];
          _.passThroughHooks.has(o) ? r[i] = (p) => {
            if (this.defaults.async && _.passThroughHooksRespectAsync.has(o)) return (async () => {
              let d = await u.call(r, p);
              return a.call(r, d);
            })();
            let c = u.call(r, p);
            return a.call(r, c);
          } : r[i] = (...p) => {
            if (this.defaults.async) return (async () => {
              let d = await u.apply(r, p);
              return d === false && (d = await a.apply(r, p)), d;
            })();
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        s.walkTokens = function(i) {
          let u = [];
          return u.push(o.call(this, i)), r && (u = u.concat(r.call(this, i))), u;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return R.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return T.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, s) => {
      let r = { ...s }, o = { ...this.defaults, ...r }, i = this.onError(!!o.silent, !!o.async);
      if (this.defaults.async === true && r.async === false) return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return i(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return i(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (o.hooks && (o.hooks.options = o, o.hooks.block = e), o.async) return (async () => {
        let u = o.hooks ? await o.hooks.preprocess(n) : n, p = await (o.hooks ? await o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(u, o), c = o.hooks ? await o.hooks.processAllTokens(p) : p;
        o.walkTokens && await Promise.all(this.walkTokens(c, o.walkTokens));
        let m = await (o.hooks ? await o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(c, o);
        return o.hooks ? await o.hooks.postprocess(m) : m;
      })().catch(i);
      try {
        o.hooks && (n = o.hooks.preprocess(n));
        let a = (o.hooks ? o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(n, o);
        o.hooks && (a = o.hooks.processAllTokens(a)), o.walkTokens && this.walkTokens(a, o.walkTokens);
        let c = (o.hooks ? o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(a, o);
        return o.hooks && (c = o.hooks.postprocess(c)), c;
      } catch (u) {
        return i(u);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let s = "<p>An error occurred:</p><pre>" + O(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(s) : s;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var E = new F();
function k(l3, e) {
  return E.parse(l3, e);
}
k.options = k.setOptions = function(l3) {
  return E.setOptions(l3), k.defaults = E.defaults, W(k.defaults), k;
};
k.getDefaults = I;
k.defaults = y;
function Pt(...l3) {
  return E.use(...l3), k.defaults = E.defaults, W(k.defaults), k;
}
k.use = Pt;
k.walkTokens = function(l3, e) {
  return E.walkTokens(l3, e);
};
k.parseInline = E.parseInline;
k.Parser = T;
k.parser = T.parse;
k.Renderer = S;
k.TextRenderer = z;
k.Lexer = R;
k.lexer = R.lex;
k.Tokenizer = P;
k.Hooks = _;
k.parse = k;
var gn = k.options;
var fn = k.setOptions;
var mn = k.walkTokens;
var xn = k.parseInline;
var Rn = T.parse;
var Tn = R.lex;

// src/components/callout.js
var ICONS = {
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  tip: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"></path></svg>`,
  warn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  danger: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
};
function renderCallout(body, meta = "") {
  const tokens = meta.trim().split(/\s+/);
  let type = "info";
  let title = "";
  if (tokens.length > 0 && ["info", "tip", "warn", "danger", "warning"].includes(tokens[0].toLowerCase())) {
    type = tokens[0].toLowerCase();
    if (type === "warning") type = "warn";
    title = tokens.slice(1).join(" ");
  } else {
    title = meta.trim();
  }
  const iconSvg = ICONS[type] || ICONS.info;
  const displayTitle = title ? `<div class="callout-title">${title}</div>` : "";
  return `
<div class="brief-callout callout-${type}">
  <div class="callout-header">
    <span class="callout-icon">${iconSvg}</span>
    ${displayTitle}
  </div>
  <div class="callout-content">
    ${body.trim()}
  </div>
</div>`.trim();
}

// src/diagnostic.js
var BriefSyntaxError = class extends Error {
  /**
   * @param {Object} options
   * @param {string} options.component - Name of component (e.g. 'flow', 'sequence')
   * @param {number} options.line - Source line number (1-based)
   * @param {string} options.message - Error explanation
   * @param {string} options.sourceSnippet - The problematic line or context
   * @param {string} options.example - Valid usage example for LLM self-correction
   */
  constructor({ component, line, message, sourceSnippet = "", example = "" }) {
    super(`[${component}] Line ${line}: ${message}`);
    this.name = "BriefSyntaxError";
    this.component = component;
    this.line = line;
    this.sourceSnippet = sourceSnippet;
    this.example = example;
  }
  formatOutput() {
    let out = `\x1B[31m\u2717 Parse Error in <${this.component}> at line ${this.line}:\x1B[0m
`;
    out += `  Message: ${this.message}
`;
    if (this.sourceSnippet) {
      out += `  Offending Line:
    \x1B[33m${this.sourceSnippet}\x1B[0m
`;
    }
    if (this.example) {
      out += `
  \x1B[32m\u2714 Correct Syntax Example for <${this.component}>:\x1B[0m
`;
      const lines = this.example.trim().split("\n").map((l3) => `    ${l3}`).join("\n");
      out += `${lines}
`;
    }
    return out;
  }
};

// src/components/kv.js
function renderKv(body, meta = "", startLine = 1) {
  const lines = body.split("\n");
  const items = [];
  let cols = 2;
  const colMatch = meta.match(/cols=(\d+)/i);
  if (colMatch) {
    cols = parseInt(colMatch[1], 10);
  }
  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;
    let key = "";
    let val = "";
    let badge = "";
    const badgeMatch = raw.match(/^([^\[:]+)\s*\[([^\]]+)\]\s*:\s*(.*)$/);
    if (badgeMatch) {
      key = badgeMatch[1].trim();
      badge = badgeMatch[2].trim();
      val = badgeMatch[3].trim();
    } else {
      const colonIdx = raw.indexOf(":");
      if (colonIdx !== -1) {
        key = raw.slice(0, colonIdx).trim();
        val = raw.slice(colonIdx + 1).trim();
      } else {
        const pipeParts = raw.split("|");
        if (pipeParts.length >= 2) {
          key = pipeParts[0].trim();
          val = pipeParts[1].trim();
          if (pipeParts[2]) badge = pipeParts[2].trim();
        } else {
          throw new BriefSyntaxError({
            component: "kv",
            line: startLine + idx,
            message: `Invalid KV pair. Expected 'Key: Value' or 'Key [Badge]: Value'`,
            sourceSnippet: line,
            example: `Latency SLA [Critical]: < 50ms
Throughput: 120,000 req/sec`
          });
        }
      }
    }
    items.push({ key, val, badge });
  });
  const cardsHtml = items.map((item) => `
    <div class="kv-item">
      <div class="kv-header">
        <span class="kv-key">${escapeHtml(item.key)}</span>
        ${item.badge ? `<span class="kv-badge">${escapeHtml(item.badge)}</span>` : ""}
      </div>
      <div class="kv-value">${escapeHtml(item.val)}</div>
    </div>
  `).join("");
  return `<div class="brief-kv-grid kv-cols-${cols}">${cardsHtml}</div>`;
}
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/components/timeline.js
function renderTimeline(body, meta = "", startLine = 1) {
  const lines = body.split("\n");
  const events = [];
  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;
    const match = raw.match(/^(?:[-*]|\d+\.)\s+([^\[:]+?)(?:\s*\[([^\]]+)\])?\s*:\s*(.*)$/);
    if (!match) {
      const simpleMatch = raw.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
      if (simpleMatch) {
        events.push({
          title: simpleMatch[1].trim(),
          tag: "",
          desc: ""
        });
        return;
      }
      throw new BriefSyntaxError({
        component: "timeline",
        line: startLine + idx,
        message: `Invalid timeline item format. Expected '- Title [Tag]: Description'`,
        sourceSnippet: line,
        example: `- Phase 1 [Q1 2026]: Architecture design
- Phase 2 [Q2 2026]: Core compiler development`
      });
    }
    events.push({
      title: match[1].trim(),
      tag: match[2] ? match[2].trim() : "",
      desc: match[3] ? match[3].trim() : ""
    });
  });
  const itemsHtml = events.map((ev, i) => `
    <div class="timeline-item">
      <div class="timeline-marker">
        <span class="timeline-dot"></span>
        ${i < events.length - 1 ? '<span class="timeline-line"></span>' : ""}
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <strong class="timeline-title">${escapeHtml2(ev.title)}</strong>
          ${ev.tag ? `<span class="timeline-tag">${escapeHtml2(ev.tag)}</span>` : ""}
        </div>
        ${ev.desc ? `<div class="timeline-desc">${escapeHtml2(ev.desc)}</div>` : ""}
      </div>
    </div>
  `).join("");
  return `<div class="brief-timeline">${itemsHtml}</div>`;
}
function escapeHtml2(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/components/tree.js
function renderTree(body, meta = "", startLine = 1) {
  const lines = body.split("\n");
  const items = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    let text = raw;
    let isDir = text.trim().endsWith("/");
    let icon = isDir ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    items.push(`
      <div class="tree-line">
        <span class="tree-icon">${icon}</span>
        <span class="tree-label">${escapeHtml3(text)}</span>
      </div>
    `);
  }
  return `<div class="brief-tree">${items.join("")}</div>`;
}
function escapeHtml3(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/components/compare.js
function renderCompare(body, meta = "", startLine = 1) {
  const lines = body.trim().split("\n").filter((l3) => l3.trim().length > 0);
  if (lines.length === 0) return "";
  const rows = [];
  lines.forEach((line, idx) => {
    if (/^\s*\|?[\s-:]+\|[\s-:]+\|?/.test(line)) return;
    let parts = line.split("|").map((s) => s.trim());
    if (parts[0] === "") parts.shift();
    if (parts[parts.length - 1] === "") parts.pop();
    if (parts.length < 2) {
      throw new BriefSyntaxError({
        component: "compare",
        line: startLine + idx,
        message: 'Expected at least 2 columns separated by "|"',
        sourceSnippet: line,
        example: `Dimension | Solution A | Solution B
Latency | < 10ms | > 50ms`
      });
    }
    rows.push(parts);
  });
  if (rows.length === 0) return "";
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const headerHtml = `
    <thead>
      <tr>
        ${headers.map((h2, i) => `<th class="${i === 0 ? "th-dim" : "th-opt"}">${escapeHtml4(h2)}</th>`).join("")}
      </tr>
    </thead>
  `;
  const bodyHtml = `
    <tbody>
      ${dataRows.map((row) => `
        <tr>
          ${row.map((cell, i) => {
    let cls = i === 0 ? "td-dim" : "td-opt";
    let formatted = escapeHtml4(cell);
    if (/^(ok|yes|true|pass|支持|推荐|✓)/i.test(cell)) {
      formatted = `<span class="badge badge-success">${formatted}</span>`;
    } else if (/^(no|false|fail|不支持|✗)/i.test(cell)) {
      formatted = `<span class="badge badge-danger">${formatted}</span>`;
    } else if (/^(warn|caution|注意|部分|!)/i.test(cell)) {
      formatted = `<span class="badge badge-warning">${formatted}</span>`;
    }
    return `<td class="${cls}">${formatted}</td>`;
  }).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
  return `<div class="brief-compare-wrapper"><table class="brief-compare-table">${headerHtml}${bodyHtml}</table></div>`;
}
function escapeHtml4(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/components/sequence.js
function renderSequence(body, meta = "", startLine = 1) {
  const autoNumber = /\bnum\b/i.test(meta);
  const lines = body.split("\n");
  let participants = [];
  const events = [];
  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;
    if (raw.toLowerCase().startsWith("participants:")) {
      const parts = raw.slice(13).split(",").map((p) => p.trim()).filter(Boolean);
      participants.push(...parts);
      return;
    }
    const noteMatch = raw.match(/^note\s+([^:]+):\s*(.*)$/i);
    if (noteMatch) {
      const actors = noteMatch[1].split(",").map((a) => a.trim());
      events.push({
        type: "note",
        actors,
        text: noteMatch[2].trim(),
        line: startLine + idx
      });
      actors.forEach((a) => {
        if (!participants.includes(a)) participants.push(a);
      });
      return;
    }
    const msgMatch = raw.match(/^([^\-\<\>]+?)\s*(\-\->|\->|<\->)\s*([^:]+?):\s*(.*)$/);
    if (msgMatch) {
      const from = msgMatch[1].trim();
      const arrowType = msgMatch[2].trim();
      const to = msgMatch[3].trim();
      const text = msgMatch[4].trim();
      if (!participants.includes(from)) participants.push(from);
      if (!participants.includes(to)) participants.push(to);
      events.push({
        type: "message",
        from,
        to,
        arrowType,
        text,
        line: startLine + idx
      });
      return;
    }
    throw new BriefSyntaxError({
      component: "sequence",
      line: startLine + idx,
      message: `Unrecognized sequence diagram syntax.`,
      sourceSnippet: line,
      example: `participants: Client, Server
Client -> Server: Request payload
note Server: Processing
Server --> Client: Response`
    });
  });
  if (participants.length === 0) {
    return "";
  }
  participants = [...new Set(participants)];
  const padX = 40;
  const colWidth = Math.max(160, Math.min(260, Math.floor(720 / Math.max(1, participants.length))));
  const totalWidth = padX * 2 + (participants.length - 1) * colWidth;
  const headerH = 38;
  const stepH = 46;
  const totalHeight = 60 + headerH + events.length * stepH + headerH + 30;
  const actorX = {};
  participants.forEach((p, i) => {
    actorX[p] = padX + i * colWidth;
  });
  let svg = `<svg class="brief-sequence-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
`;
  svg += `
  <defs>
    <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
    </marker>
    <marker id="seq-arrow-rev" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 10 1 L 0 5 L 10 9 z" fill="currentColor" />
    </marker>
  </defs>
  `;
  participants.forEach((p) => {
    const x2 = actorX[p];
    svg += `<line class="seq-lifeline" x1="${x2}" y1="${40 + headerH}" x2="${x2}" y2="${totalHeight - 40 - headerH}" stroke="currentColor" stroke-dasharray="4,4" stroke-opacity="0.3" stroke-width="1.5" />
`;
  });
  const drawParticipantBoxes = (topY) => {
    participants.forEach((p) => {
      const x2 = actorX[p];
      const boxW = Math.min(130, colWidth - 20);
      const boxH = 32;
      svg += `
      <g class="seq-actor" transform="translate(${x2 - boxW / 2}, ${topY})">
        <rect width="${boxW}" height="${boxH}" rx="6" class="seq-actor-box" />
        <text x="${boxW / 2}" y="${boxH / 2 + 5}" text-anchor="middle" class="seq-actor-text">${escapeHtml5(p)}</text>
      </g>
      `;
    });
  };
  drawParticipantBoxes(20);
  drawParticipantBoxes(totalHeight - 20 - headerH);
  let currentY = 50 + headerH;
  let msgIndex = 1;
  events.forEach((ev) => {
    currentY += stepH;
    if (ev.type === "note") {
      const xs = ev.actors.map((a) => actorX[a] || padX);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const noteW = Math.max(120, maxX - minX + 80);
      const noteH = 26;
      const noteX = (minX + maxX) / 2 - noteW / 2;
      svg += `
      <g class="seq-note" transform="translate(${noteX}, ${currentY - 14})">
        <rect width="${noteW}" height="${noteH}" rx="4" class="seq-note-box" />
        <text x="${noteW / 2}" y="17" text-anchor="middle" class="seq-note-text">${escapeHtml5(ev.text)}</text>
      </g>
      `;
    } else if (ev.type === "message") {
      const x1 = actorX[ev.from];
      const x2 = actorX[ev.to];
      const isDashed = ev.arrowType === "-->";
      const isBi = ev.arrowType === "<->";
      const labelPrefix = autoNumber ? `${msgIndex}. ` : "";
      msgIndex++;
      const midX = (x1 + x2) / 2;
      const textY = currentY - 8;
      svg += `
      <g class="seq-msg">
        <text x="${midX}" y="${textY}" text-anchor="middle" class="seq-msg-text">${escapeHtml5(labelPrefix + ev.text)}</text>
        <line x1="${x1}" y1="${currentY}" x2="${x2}" y2="${currentY}"
              class="seq-msg-line"
              stroke="currentColor"
              stroke-width="1.8"
              ${isDashed ? 'stroke-dasharray="5,4"' : ""}
              marker-end="url(#seq-arrow)"
              ${isBi ? 'marker-start="url(#seq-arrow-rev)"' : ""} />
      </g>
      `;
    }
  });
  svg += `</svg>`;
  return `<div class="brief-sequence-container">${svg}</div>`;
}
function escapeHtml5(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// node_modules/@dagrejs/dagre/dist/dagre.esm.js
var Te2 = Object.defineProperty;
var In = (e, n, t) => n in e ? Te2(e, n, { enumerable: true, configurable: true, writable: true, value: t }) : e[n] = t;
var Sn = (e, n) => {
  for (var t in n) Te2(e, t, { get: n[t], enumerable: true });
};
var je2 = (e, n, t) => In(e, typeof n != "symbol" ? n + "" : n, t);
var ie2 = {};
Sn(ie2, { Graph: () => T2, alg: () => H });
var Mn = Object.defineProperty;
var Se = (e, n) => {
  for (var t in n) Mn(e, t, { get: n[t], enumerable: true });
};
var Q2 = class {
  constructor(e) {
    this._isDirected = true, this._isMultigraph = false, this._isCompound = false, this._nodes = {}, this._in = {}, this._preds = {}, this._out = {}, this._sucs = {}, this._edgeObjs = {}, this._edgeLabels = {}, this._nodeCount = 0, this._edgeCount = 0, this._defaultNodeLabelFn = () => {
    }, this._defaultEdgeLabelFn = () => {
    }, e && (this._isDirected = "directed" in e ? e.directed : true, this._isMultigraph = "multigraph" in e ? e.multigraph : false, this._isCompound = "compound" in e ? e.compound : false), this._isCompound && (this._parent = {}, this._children = {}, this._children["\0"] = {});
  }
  isDirected() {
    return this._isDirected;
  }
  isMultigraph() {
    return this._isMultigraph;
  }
  isCompound() {
    return this._isCompound;
  }
  setGraph(e) {
    return this._label = e, this;
  }
  graph() {
    return this._label;
  }
  setDefaultNodeLabel(e) {
    return typeof e != "function" ? this._defaultNodeLabelFn = () => e : this._defaultNodeLabelFn = e, this;
  }
  nodeCount() {
    return this._nodeCount;
  }
  nodes() {
    return Object.keys(this._nodes);
  }
  sources() {
    return this.nodes().filter((e) => Object.keys(this._in[e]).length === 0);
  }
  sinks() {
    return this.nodes().filter((e) => Object.keys(this._out[e]).length === 0);
  }
  setNodes(e, n) {
    return e.forEach((t) => {
      n !== void 0 ? this.setNode(t, n) : this.setNode(t);
    }), this;
  }
  setNode(e, n) {
    return e in this._nodes ? (arguments.length > 1 && (this._nodes[e] = n), this) : (this._nodes[e] = arguments.length > 1 ? n : this._defaultNodeLabelFn(e), this._isCompound && (this._parent[e] = "\0", this._children[e] = {}, this._children["\0"][e] = true), this._in[e] = {}, this._preds[e] = {}, this._out[e] = {}, this._sucs[e] = {}, ++this._nodeCount, this);
  }
  node(e) {
    return this._nodes[e];
  }
  hasNode(e) {
    return e in this._nodes;
  }
  removeNode(e) {
    if (e in this._nodes) {
      let n = (t) => this.removeEdge(this._edgeObjs[t]);
      delete this._nodes[e], this._isCompound && (this._removeFromParentsChildList(e), delete this._parent[e], this.children(e).forEach((t) => {
        this.setParent(t);
      }), delete this._children[e]), Object.keys(this._in[e]).forEach(n), delete this._in[e], delete this._preds[e], Object.keys(this._out[e]).forEach(n), delete this._out[e], delete this._sucs[e], --this._nodeCount;
    }
    return this;
  }
  setParent(e, n) {
    if (!this._isCompound) throw new Error("Cannot set parent in a non-compound graph");
    if (n === void 0) n = "\0";
    else {
      n += "";
      for (let t = n; t !== void 0; t = this.parent(t)) if (t === e) throw new Error("Setting " + n + " as parent of " + e + " would create a cycle");
      this.setNode(n);
    }
    return this.setNode(e), this._removeFromParentsChildList(e), this._parent[e] = n, this._children[n][e] = true, this;
  }
  parent(e) {
    if (this._isCompound) {
      let n = this._parent[e];
      if (n !== "\0") return n;
    }
  }
  children(e = "\0") {
    if (this._isCompound) {
      let n = this._children[e];
      if (n) return Object.keys(n);
    } else {
      if (e === "\0") return this.nodes();
      if (this.hasNode(e)) return [];
    }
    return [];
  }
  predecessors(e) {
    let n = this._preds[e];
    if (n) return Object.keys(n);
  }
  successors(e) {
    let n = this._sucs[e];
    if (n) return Object.keys(n);
  }
  neighbors(e) {
    let n = this.predecessors(e);
    if (n) {
      let t = new Set(n), r = this.successors(e);
      if (r) for (let o of r) t.add(o);
      return Array.from(t.values());
    }
  }
  isLeaf(e) {
    var n;
    let t;
    return this.isDirected() ? t = this.successors(e) : t = this.neighbors(e), ((n = t == null ? void 0 : t.length) != null ? n : 0) === 0;
  }
  filterNodes(e) {
    let n = new this.constructor({ directed: this._isDirected, multigraph: this._isMultigraph, compound: this._isCompound });
    n.setGraph(this.graph()), Object.entries(this._nodes).forEach(([o, i]) => {
      e(o) && n.setNode(o, i);
    }), Object.values(this._edgeObjs).forEach((o) => {
      n.hasNode(o.v) && n.hasNode(o.w) && n.setEdge(o, this.edge(o));
    });
    let t = {}, r = (o) => {
      let i = this.parent(o);
      return !i || n.hasNode(i) ? (t[o] = i, i) : i in t ? t[i] : r(i);
    };
    return this._isCompound && n.nodes().forEach((o) => n.setParent(o, r(o))), n;
  }
  setDefaultEdgeLabel(e) {
    return typeof e != "function" ? this._defaultEdgeLabelFn = () => e : this._defaultEdgeLabelFn = e, this;
  }
  edgeCount() {
    return this._edgeCount;
  }
  edges() {
    return Object.values(this._edgeObjs);
  }
  setPath(e, n) {
    return e.reduce((t, r) => (n !== void 0 ? this.setEdge(t, r, n) : this.setEdge(t, r), r)), this;
  }
  setEdge(e, n, t, r) {
    let o, i, s, a, l3 = false;
    typeof e == "object" && e !== null && "v" in e ? (o = e.v, i = e.w, s = e.name, arguments.length === 2 && (a = n, l3 = true)) : (o = e, i = n, s = r, arguments.length > 2 && (a = t, l3 = true)), o = "" + o, i = "" + i, s !== void 0 && (s = "" + s);
    let u = z2(this._isDirected, o, i, s);
    if (u in this._edgeLabels) return l3 && (this._edgeLabels[u] = a), this;
    if (s !== void 0 && !this._isMultigraph) throw new Error("Cannot set a named edge when isMultigraph = false");
    this.setNode(o), this.setNode(i), this._edgeLabels[u] = l3 ? a : this._defaultEdgeLabelFn(o, i, s);
    let d = Pn(this._isDirected, o, i, s);
    return o = d.v, i = d.w, Object.freeze(d), this._edgeObjs[u] = d, Re2(this._preds[i], o), Re2(this._sucs[o], i), this._in[i][u] = d, this._out[o][u] = d, this._edgeCount++, this;
  }
  edge(e, n, t) {
    let r = arguments.length === 1 ? oe2(this._isDirected, e) : z2(this._isDirected, e, n, t);
    return this._edgeLabels[r];
  }
  edgeAsObj(e, n, t) {
    let r = arguments.length === 1 ? this.edge(e) : this.edge(e, n, t);
    return typeof r != "object" || r === null ? { label: r } : r;
  }
  hasEdge(e, n, t) {
    return (arguments.length === 1 ? oe2(this._isDirected, e) : z2(this._isDirected, e, n, t)) in this._edgeLabels;
  }
  removeEdge(e, n, t) {
    let r = arguments.length === 1 ? oe2(this._isDirected, e) : z2(this._isDirected, e, n, t), o = this._edgeObjs[r];
    if (o) {
      let i = o.v, s = o.w;
      delete this._edgeLabels[r], delete this._edgeObjs[r], Ie2(this._preds[s], i), Ie2(this._sucs[i], s), delete this._in[s][r], delete this._out[i][r], this._edgeCount--;
    }
    return this;
  }
  inEdges(e, n) {
    return this.isDirected() ? this.filterEdges(this._in[e], e, n) : this.nodeEdges(e, n);
  }
  outEdges(e, n) {
    return this.isDirected() ? this.filterEdges(this._out[e], e, n) : this.nodeEdges(e, n);
  }
  nodeEdges(e, n) {
    if (e in this._nodes) return this.filterEdges({ ...this._in[e], ...this._out[e] }, e, n);
  }
  _removeFromParentsChildList(e) {
    delete this._children[this._parent[e]][e];
  }
  filterEdges(e, n, t) {
    if (!e) return;
    let r = Object.values(e);
    return t ? r.filter((o) => o.v === n && o.w === t || o.v === t && o.w === n) : r;
  }
};
function Re2(e, n) {
  e[n] ? e[n]++ : e[n] = 1;
}
function Ie2(e, n) {
  e[n] !== void 0 && !--e[n] && delete e[n];
}
function z2(e, n, t, r) {
  let o = "" + n, i = "" + t;
  if (!e && o > i) {
    let s = o;
    o = i, i = s;
  }
  return o + "" + i + "" + (r === void 0 ? "\0" : r);
}
function Pn(e, n, t, r) {
  let o = "" + n, i = "" + t;
  if (!e && o > i) {
    let a = o;
    o = i, i = a;
  }
  let s = { v: o, w: i };
  return r && (s.name = r), s;
}
function oe2(e, n) {
  return z2(e, n.v, n.w, n.name);
}
var Fn = {};
Se(Fn, { read: () => Yn, write: () => An });
function An(e) {
  let n = { options: { directed: e.isDirected(), multigraph: e.isMultigraph(), compound: e.isCompound() }, nodes: Vn(e), edges: Dn(e) }, t = e.graph();
  return t !== void 0 && (n.value = structuredClone(t)), n;
}
function Vn(e) {
  return e.nodes().map((n) => {
    let t = e.node(n), r = e.parent(n), o = { v: n };
    return t !== void 0 && (o.value = t), r !== void 0 && (o.parent = r), o;
  });
}
function Dn(e) {
  return e.edges().map((n) => {
    let t = e.edge(n), r = { v: n.v, w: n.w };
    return n.name !== void 0 && (r.name = n.name), t !== void 0 && (r.value = t), r;
  });
}
function Yn(e) {
  let n = new Q2(e.options);
  return e.value !== void 0 && n.setGraph(e.value), e.nodes.forEach((t) => {
    n.setNode(t.v, t.value), t.parent && n.setParent(t.v, t.parent);
  }), e.edges.forEach((t) => {
    n.setEdge({ v: t.v, w: t.w, name: t.name }, t.value);
  }), n;
}
var H = {};
Se(H, { CycleException: () => K, bellmanFord: () => Me2, components: () => Xn, dijkstra: () => J2, dijkstraAll: () => qn, findCycles: () => $n, floydWarshall: () => Jn, isAcyclic: () => Qn, postorder: () => et2, preorder: () => nt2, prim: () => tt2, shortestPaths: () => rt2, tarjan: () => Fe2, topsort: () => Ae2 });
var Wn = () => 1;
function Me2(e, n, t, r) {
  return Bn(e, String(n), t || Wn, r || function(o) {
    var i;
    return (i = e.outEdges(o)) != null ? i : [];
  });
}
function Bn(e, n, t, r) {
  let o = {}, i, s = 0, a = e.nodes(), l3 = function(c) {
    let f = o[c.v], h2 = o[c.w];
    if (!f || !h2) return;
    let p = t(c);
    f.distance + p < h2.distance && (o[c.w] = { distance: f.distance + p, predecessor: c.v }, i = true);
  }, u = function() {
    a.forEach(function(c) {
      r(c).forEach(function(f) {
        let h2 = f.v === c ? f.v : f.w, p = h2 === f.v ? f.w : f.v;
        l3({ v: h2, w: p });
      });
    });
  };
  a.forEach(function(c) {
    let f = c === n ? 0 : Number.POSITIVE_INFINITY;
    o[c] = { distance: f, predecessor: "" };
  });
  let d = a.length;
  for (let c = 1; c < d && (i = false, s++, u(), !!i); c++) ;
  if (s === d - 1 && (i = false, u(), i)) throw new Error("The graph contains a negative weight cycle");
  return o;
}
function Xn(e) {
  let n = {}, t = [], r;
  function o(i) {
    var s, a;
    i in n || (n[i] = true, r.push(i), (s = e.successors(i)) == null || s.forEach(o), (a = e.predecessors(i)) == null || a.forEach(o));
  }
  return e.nodes().forEach(function(i) {
    r = [], o(i), r.length && t.push(r);
  }), t;
}
var Pe = class {
  constructor() {
    this._arr = [], this._keyIndices = {};
  }
  size() {
    return this._arr.length;
  }
  keys() {
    return this._arr.map((e) => e.key);
  }
  has(e) {
    return e in this._keyIndices;
  }
  priority(e) {
    let n = this._keyIndices[e];
    if (n !== void 0) return this._arr[n].priority;
  }
  min() {
    if (this.size() === 0) throw new Error("Queue underflow");
    return this._arr[0].key;
  }
  add(e, n) {
    let t = this._keyIndices, r = String(e);
    if (!(r in t)) {
      let o = this._arr, i = o.length;
      return t[r] = i, o.push({ key: r, priority: n }), this._decrease(i), true;
    }
    return false;
  }
  removeMin() {
    if (this.size() === 0) throw new Error("Queue underflow");
    this._swap(0, this._arr.length - 1);
    let e = this._arr.pop();
    return delete this._keyIndices[e.key], this._heapify(0), e.key;
  }
  decrease(e, n) {
    let t = this._keyIndices[e];
    if (t === void 0) throw new Error(`Key not found: ${e}`);
    let r = this._arr[t].priority;
    if (n > r) throw new Error(`New priority is greater than current priority. Key: ${e} Old: ${r} New: ${n}`);
    this._arr[t].priority = n, this._decrease(t);
  }
  _heapify(e) {
    let n = this._arr, t = 2 * e, r = t + 1, o = e;
    t < n.length && (o = n[t].priority < n[o].priority ? t : o, r < n.length && (o = n[r].priority < n[o].priority ? r : o), o !== e && (this._swap(e, o), this._heapify(o)));
  }
  _decrease(e) {
    let n = this._arr, t = n[e].priority, r;
    for (; e !== 0 && (r = e >> 1, !(n[r].priority < t)); ) this._swap(e, r), e = r;
  }
  _swap(e, n) {
    let t = this._arr, r = this._keyIndices, o = t[e], i = t[n];
    t[e] = i, t[n] = o, r[i.key] = e, r[o.key] = n;
  }
};
var zn = () => 1;
function J2(e, n, t, r) {
  let o = function(i) {
    var s;
    return (s = e.outEdges(i)) != null ? s : [];
  };
  return Hn(e, String(n), t || zn, r || o);
}
function Hn(e, n, t, r) {
  let o = {}, i = new Pe(), s, a, l3 = function(u) {
    let d = u.v !== s ? u.v : u.w, c = o[d];
    if (!c) return;
    let f = t(u), h2 = a.distance + f;
    if (f < 0) throw new Error("dijkstra does not allow negative edge weights. Bad edge: " + u + " Weight: " + f);
    h2 < c.distance && (c.distance = h2, c.predecessor = s, i.decrease(d, h2));
  };
  for (e.nodes().forEach(function(u) {
    let d = u === n ? 0 : Number.POSITIVE_INFINITY;
    o[u] = { distance: d, predecessor: "" }, i.add(u, d);
  }); i.size() > 0; ) {
    s = i.removeMin();
    let u = o[s];
    if (!u || u.distance === Number.POSITIVE_INFINITY) break;
    a = u, r(s).forEach(l3);
  }
  return o;
}
function qn(e, n, t) {
  return e.nodes().reduce(function(r, o) {
    return r[o] = J2(e, o, n, t), r;
  }, {});
}
function Fe2(e) {
  let n = 0, t = [], r = {}, o = [];
  function i(s) {
    var a;
    let l3 = r[s] = { onStack: true, lowlink: n, index: n++ };
    if (t.push(s), (a = e.successors(s)) == null || a.forEach(function(u) {
      if (u in r) {
        let d = r[u];
        d != null && d.onStack && (l3.lowlink = Math.min(l3.lowlink, d.index));
      } else {
        i(u);
        let d = r[u];
        d && (l3.lowlink = Math.min(l3.lowlink, d.lowlink));
      }
    }), l3.lowlink === l3.index) {
      let u = [], d;
      do {
        d = t.pop();
        let c = r[d];
        c && (c.onStack = false), u.push(d);
      } while (s !== d);
      o.push(u);
    }
  }
  return e.nodes().forEach(function(s) {
    s in r || i(s);
  }), o;
}
function $n(e) {
  return Fe2(e).filter(function(n) {
    var t;
    let r = n[0];
    return r ? n.length > 1 || n.length === 1 && ((t = e.outEdges(r, r)) != null ? t : []).length > 0 : false;
  });
}
var Un = () => 1;
function Jn(e, n, t) {
  return Kn(e, n || Un, t || function(r) {
    var o;
    return (o = e.outEdges(r)) != null ? o : [];
  });
}
function Kn(e, n, t) {
  let r = {}, o = e.nodes();
  return o.forEach(function(i) {
    let s = {};
    r[i] = s, s[i] = { distance: 0, predecessor: "" }, o.forEach(function(a) {
      i !== a && (s[a] = { distance: Number.POSITIVE_INFINITY, predecessor: "" });
    }), t(i).forEach(function(a) {
      let l3 = a.v === i ? a.w : a.v, u = n(a);
      s[l3] = { distance: u, predecessor: i };
    });
  }), o.forEach(function(i) {
    let s = r[i];
    s && o.forEach(function(a) {
      let l3 = r[a];
      l3 && o.forEach(function(u) {
        let d = l3[i], c = s[u], f = l3[u];
        if (d && c && f) {
          let h2 = d.distance + c.distance;
          h2 < f.distance && (f.distance = h2, f.predecessor = c.predecessor);
        }
      });
    });
  }), r;
}
var K = class extends Error {
  constructor(e) {
    super(e), this.name = "CycleException";
  }
};
function Ae2(e) {
  let n = {}, t = {}, r = [];
  function o(i) {
    var s;
    if (i in t) throw new K();
    i in n || (t[i] = true, n[i] = true, (s = e.predecessors(i)) == null || s.forEach(o), delete t[i], r.push(i));
  }
  if (e.sinks().forEach(o), Object.keys(n).length !== e.nodeCount()) throw new K();
  return r;
}
function Qn(e) {
  try {
    Ae2(e);
  } catch (n) {
    if (n instanceof K) return false;
    throw n;
  }
  return true;
}
function Zn(e, n, t, r, o) {
  Array.isArray(n) || (n = [n]);
  let i = ((a) => {
    var l3;
    return (l3 = e.isDirected() ? e.successors(a) : e.neighbors(a)) != null ? l3 : [];
  }), s = {};
  return n.forEach(function(a) {
    if (!e.hasNode(a)) throw new Error("Graph does not have node: " + a);
    o = Ve2(e, a, t === "post", s, i, r, o);
  }), o;
}
function Ve2(e, n, t, r, o, i, s) {
  return n in r || (r[n] = true, t || (s = i(s, n)), o(n).forEach(function(a) {
    s = Ve2(e, a, t, r, o, i, s);
  }), t && (s = i(s, n))), s;
}
function De2(e, n, t) {
  return Zn(e, n, t, function(r, o) {
    return r.push(o), r;
  }, []);
}
function et2(e, n) {
  return De2(e, n, "post");
}
function nt2(e, n) {
  return De2(e, n, "pre");
}
function tt2(e, n) {
  var t;
  let r = new Q2(), o = {}, i = new Pe(), s;
  function a(d) {
    let c = d.v === s ? d.w : d.v, f = i.priority(c);
    if (f !== void 0) {
      let h2 = n(d);
      h2 < f && (o[c] = s, i.decrease(c, h2));
    }
  }
  if (e.nodeCount() === 0) return r;
  e.nodes().forEach(function(d) {
    i.add(d, Number.POSITIVE_INFINITY), r.setNode(d);
  });
  let l3 = e.nodes()[0];
  l3 !== void 0 && i.decrease(l3, 0);
  let u = false;
  for (; i.size() > 0; ) {
    if (s = i.removeMin(), s in o) r.setEdge(s, o[s]);
    else {
      if (u) throw new Error("Input graph is not connected: " + e);
      u = true;
    }
    (t = e.nodeEdges(s)) == null || t.forEach(a);
  }
  return r;
}
function rt2(e, n, t, r) {
  return ot2(e, n, t, r != null ? r : ((o) => {
    var i;
    return (i = e.outEdges(o)) != null ? i : [];
  }));
}
function ot2(e, n, t, r) {
  if (t === void 0) return J2(e, n, t, r);
  let o = false, i = e.nodes();
  for (let s = 0; s < i.length; s++) {
    let a = i[s];
    if (a === void 0) continue;
    let l3 = r(a);
    for (let u = 0; u < l3.length; u++) {
      let d = l3[u];
      if (!d) continue;
      let c = d.v === a ? d.v : d.w, f = c === d.v ? d.w : d.v;
      t({ v: c, w: f }) < 0 && (o = true);
    }
    if (o) return Me2(e, n, t, r);
  }
  return J2(e, n, t, r);
}
var T2 = Q2;
function M(e, n, t, r) {
  let o = r;
  for (; e.hasNode(o); ) o = $2(r);
  return t.dummy = n, e.setNode(o, t), o;
}
function Ye2(e) {
  let n = new T2().setGraph(e.graph());
  return e.nodes().forEach((t) => n.setNode(t, e.node(t))), e.edges().forEach((t) => {
    let r = n.edge(t.v, t.w) || { weight: 0, minlen: 1 }, o = e.edge(t);
    n.setEdge(t.v, t.w, { weight: r.weight + o.weight, minlen: Math.max(r.minlen, o.minlen) });
  }), n;
}
function Z(e) {
  let n = new T2({ multigraph: e.isMultigraph() }).setGraph(e.graph());
  return e.nodes().forEach((t) => {
    e.children(t).length || n.setNode(t, e.node(t));
  }), e.edges().forEach((t) => {
    n.setEdge(t, e.edge(t));
  }), n;
}
function se2(e, n) {
  let t = e.x, r = e.y, o = n.x - t, i = n.y - r, s = e.width / 2, a = e.height / 2;
  if (!o && !i) throw new Error("Not possible to find intersection inside of the rectangle");
  let l3, u;
  return Math.abs(i) * s > Math.abs(o) * a ? (i < 0 && (a = -a), l3 = a * o / i, u = a) : (o < 0 && (s = -s), l3 = s, u = s * i / o), { x: t + l3, y: r + u };
}
function P2(e) {
  let n = A2(de2(e) + 1).map(() => []);
  return e.nodes().forEach((t) => {
    let r = e.node(t), o = r.rank;
    o !== void 0 && (n[o] || (n[o] = []), n[o][r.order] = t);
  }), n;
}
function We2(e) {
  let n = e.nodes().map((r) => {
    let o = e.node(r).rank;
    return o === void 0 ? Number.MAX_VALUE : o;
  }), t = R2(Math.min, n);
  e.nodes().forEach((r) => {
    let o = e.node(r);
    Object.hasOwn(o, "rank") && (o.rank -= t);
  });
}
function Be2(e) {
  let n = e.nodes().map((s) => e.node(s).rank).filter((s) => s !== void 0), t = R2(Math.min, n), r = [];
  e.nodes().forEach((s) => {
    let a = e.node(s).rank - t;
    r[a] || (r[a] = []), r[a].push(s);
  });
  let o = 0, i = e.graph().nodeRankFactor;
  Array.from(r).forEach((s, a) => {
    s === void 0 && a % i !== 0 ? --o : s !== void 0 && o && s.forEach((l3) => e.node(l3).rank += o);
  });
}
function ae(e, n, t, r) {
  let o = { width: 0, height: 0 };
  return arguments.length >= 4 && (o.rank = t, o.order = r), M(e, "border", o, n);
}
function it2(e, n = Xe2) {
  let t = [];
  for (let r = 0; r < e.length; r += n) {
    let o = e.slice(r, r + n);
    t.push(o);
  }
  return t;
}
var Xe2 = 65535;
function R2(e, n) {
  if (n.length > Xe2) {
    let t = it2(n);
    return e(...t.map((r) => e(...r)));
  } else return e(...n);
}
function de2(e) {
  let t = e.nodes().map((r) => {
    let o = e.node(r).rank;
    return o === void 0 ? Number.MIN_VALUE : o;
  });
  return R2(Math.max, t);
}
function ze2(e, n) {
  let t = { lhs: [], rhs: [] };
  return e.forEach((r) => {
    n(r) ? t.lhs.push(r) : t.rhs.push(r);
  }), t;
}
function le2(e, n) {
  let t = Date.now();
  try {
    return n();
  } finally {
    console.log(e + " time: " + (Date.now() - t) + "ms");
  }
}
function q2(e, n) {
  return n();
}
var st2 = 0;
function $2(e) {
  let n = ++st2;
  return e + ("" + n);
}
function A2(e, n, t = 1) {
  n == null && (n = e, e = 0);
  let r = (i) => i < n;
  t < 0 && (r = (i) => n < i);
  let o = [];
  for (let i = e; r(i); i += t) o.push(i);
  return o;
}
function B2(e, n) {
  let t = {};
  for (let r of n) e[r] !== void 0 && (t[r] = e[r]);
  return t;
}
function X2(e, n) {
  let t;
  return typeof n == "string" ? t = (r) => r[n] : t = n, Object.entries(e).reduce((r, [o, i]) => (r[o] = t(i, o), r), {});
}
function He2(e, n) {
  return e.reduce((t, r, o) => (t[r] = n[o], t), {});
}
var D2 = "\0";
function ee2(e, n, t) {
  var u, d, c, f, h2, p;
  if (!(e && n && t && n.dummy === "edge" && t.dummy === "edge" && n.edgeObj && t.edgeObj && e[n.edgeObj.v] && e[t.edgeObj.v] && e[n.edgeObj.w] && e[t.edgeObj.w])) return 0;
  let r = true;
  n.edgeObj.w === t.edgeObj.w && (r = false);
  let o = r ? (d = (u = e[n.edgeObj.v]) == null ? void 0 : u.rank) != null ? d : NaN + 1 : (f = (c = e[n.edgeObj.w]) == null ? void 0 : c.rank) != null ? f : NaN - 1, i = Object.entries(e).find((E2) => {
    var y2, L2;
    return ((y2 = E2[1].edgeObj) == null ? void 0 : y2.v) === n.edgeObj.v && ((L2 = E2[1].edgeObj) == null ? void 0 : L2.w) === n.edgeObj.w && E2[1].rank === o;
  }), s = Object.entries(e).find((E2) => {
    var y2, L2;
    return ((y2 = E2[1].edgeObj) == null ? void 0 : y2.v) === t.edgeObj.v && ((L2 = E2[1].edgeObj) == null ? void 0 : L2.w) === t.edgeObj.w && E2[1].rank === o;
  });
  if (!i || !s) return 0;
  let a = (h2 = i[1].order) != null ? h2 : NaN, l3 = (p = s[1].order) != null ? p : NaN;
  return isNaN(a - l3) ? 0 : a - l3;
}
var ue2 = "3.1.1";
var ce2 = class {
  constructor() {
    je2(this, "_sentinel");
    let n = {};
    n._next = n._prev = n, this._sentinel = n;
  }
  dequeue() {
    let n = this._sentinel, t = n._prev;
    if (t !== n) return qe2(t), t;
  }
  enqueue(n) {
    let t = this._sentinel;
    n._prev && n._next && qe2(n), n._next = t._next, t._next._prev = n, t._next = n, n._prev = t;
  }
  toString() {
    let n = [], t = this._sentinel, r = t._prev;
    for (; r !== t; ) n.push(JSON.stringify(r, at2)), r = r._prev;
    return "[" + n.join(", ") + "]";
  }
};
function qe2(e) {
  e._prev._next = e._next, e._next._prev = e._prev, delete e._next, delete e._prev;
}
function at2(e, n) {
  if (e !== "_next" && e !== "_prev") return n;
}
var $e2 = ce2;
var dt2 = () => 1;
function be2(e, n) {
  if (e.nodeCount() <= 1) return [];
  let t = ut2(e, n || dt2);
  return lt2(t.graph, t.buckets, t.zeroIdx).flatMap((o) => e.outEdges(o.v, o.w) || []);
}
function lt2(e, n, t) {
  var a;
  let r = [], o = n[n.length - 1], i = n[0], s;
  for (; e.nodeCount(); ) {
    for (; s = i.dequeue(); ) fe2(e, n, t, s);
    for (; s = o.dequeue(); ) fe2(e, n, t, s);
    if (e.nodeCount()) {
      for (let l3 = n.length - 2; l3 > 0; --l3) if (s = (a = n[l3]) == null ? void 0 : a.dequeue(), s) {
        r = r.concat(fe2(e, n, t, s, true) || []);
        break;
      }
    }
  }
  return r;
}
function fe2(e, n, t, r, o) {
  let i = [], s = o ? i : void 0;
  return (e.inEdges(r.v) || []).forEach((a) => {
    let l3 = e.edge(a), u = e.node(a.v);
    o && i.push({ v: a.v, w: a.w }), u.out -= l3, he2(n, t, u);
  }), (e.outEdges(r.v) || []).forEach((a) => {
    let l3 = e.edge(a), u = a.w, d = e.node(u);
    d.in -= l3, he2(n, t, d);
  }), e.removeNode(r.v), s;
}
function ut2(e, n) {
  let t = new T2(), r = 0, o = 0;
  e.nodes().forEach((a) => {
    t.setNode(a, { v: a, in: 0, out: 0 });
  }), e.edges().forEach((a) => {
    let l3 = t.edge(a.v, a.w) || 0, u = n(a), d = l3 + u;
    t.setEdge(a.v, a.w, d);
    let c = t.node(a.v), f = t.node(a.w);
    o = Math.max(o, c.out += u), r = Math.max(r, f.in += u);
  });
  let i = ct2(o + r + 3).map(() => new $e2()), s = r + 1;
  return t.nodes().forEach((a) => {
    he2(i, s, t.node(a));
  }), { graph: t, buckets: i, zeroIdx: s };
}
function he2(e, n, t) {
  var r, o, i;
  t.out ? t.in ? (i = e[t.out - t.in + n]) == null || i.enqueue(t) : (o = e[e.length - 1]) == null || o.enqueue(t) : (r = e[0]) == null || r.enqueue(t);
}
function ct2(e) {
  let n = [];
  for (let t = 0; t < e; t++) n.push(t);
  return n;
}
function Ue2(e, n) {
  (e.graph().acyclicer === "greedy" ? be2(e, r(e)) : ft2(e, n != null ? n : null)).forEach((o) => {
    let i = e.edge(o);
    e.removeEdge(o), i.forwardName = o.name, i.reversed = true, e.setEdge(o.w, o.v, i, $2("rev"));
  });
  function r(o) {
    return (i) => o.edge(i).weight;
  }
}
function ft2(e, n) {
  let t = [], r = {}, o = {};
  function i(l3) {
    Object.hasOwn(o, l3) || (o[l3] = true, r[l3] = true, e.outEdges(l3).forEach((u) => {
      Object.hasOwn(r, u.w) ? t.push(u) : i(u.w);
    }), delete r[l3]);
  }
  function s(l3) {
    var u;
    Object.hasOwn(o, l3) || (o[l3] = true, r[l3] = true, (u = e.outEdges(l3)) == null || u.forEach((d) => {
      var c, f;
      Object.hasOwn(r, d.w) || ((c = n.node(l3)) == null ? void 0 : c.rank) > ((f = n.node(d.w)) == null ? void 0 : f.rank) && ht2(e, d.w, d) ? t.push(d) : s(d.w);
    }), delete r[l3]);
  }
  let a = i;
  return n && typeof n.node == "function" && (a = s), e.sources().forEach(a), e.nodes().forEach(a), t;
}
function Je2(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (t.reversed) {
      e.removeEdge(n);
      let r = t.forwardName;
      delete t.reversed, delete t.forwardName, e.setEdge(n.w, n.v, t, r);
    }
  });
}
function ht2(e, n, t) {
  let r = /* @__PURE__ */ new Set();
  function o(i) {
    var s;
    if (e.sources().includes(i)) return true;
    r.add(i);
    for (let a of (s = e.inEdges(i)) != null ? s : []) if (!(a.v === t.v && a.w === t.w) && !r.has(a.v) && o(a.v)) return true;
    return false;
  }
  return o(n);
}
function Ke2(e) {
  e.graph().dummyChains = [], e.edges().forEach((n) => gt2(e, n));
}
function gt2(e, n) {
  let t = n.v, r = e.node(t).rank, o = n.w, i = e.node(o).rank, s = n.name, a = e.edge(n), l3 = a.labelRank;
  if (i === r + 1) return;
  e.removeEdge(n);
  let u, d, c;
  for (c = 0, ++r; r < i; ++c, ++r) a.points = [], d = { width: 0, height: 0, edgeLabel: a, edgeObj: n, rank: r }, u = M(e, "edge", d, "_d"), r === l3 && (d.width = a.width, d.height = a.height, d.dummy = "edge-label", d.labelpos = a.labelpos), e.setEdge(t, u, { weight: a.weight }, s), c === 0 && e.graph().dummyChains.push(u), t = u;
  e.setEdge(t, o, { weight: a.weight }, s);
}
function Qe2(e) {
  e.graph().dummyChains.forEach((n) => {
    let t = e.node(n), r = t.edgeLabel, o;
    for (e.setEdge(t.edgeObj, r); t.dummy; ) o = e.successors(n)[0], e.removeNode(n), r.points.push({ x: t.x, y: t.y }), t.dummy === "edge-label" && (r.x = t.x, r.y = t.y, r.width = t.width, r.height = t.height), n = o, t = e.node(n);
  });
}
function U2(e) {
  let n = {};
  function t(r) {
    let o = e.node(r);
    if (Object.hasOwn(n, r)) return o.rank;
    n[r] = true;
    let i = e.outEdges(r), s = i ? i.map((l3) => l3 == null ? Number.POSITIVE_INFINITY : t(l3.w) - e.edge(l3).minlen) : [], a = R2(Math.min, s);
    return a === Number.POSITIVE_INFINITY && (a = 0), o.rank = a;
  }
  e.sources().forEach(t);
}
function V2(e, n) {
  return e.node(n.w).rank - e.node(n.v).rank - e.edge(n).minlen;
}
var ne2 = mt2;
function mt2(e) {
  let n = new T2({ directed: false }), t = e.nodes();
  if (t.length === 0) throw new Error("Graph must have at least one node");
  let r = t[0], o = e.nodeCount();
  n.setNode(r, {});
  let i, s;
  for (; Et(n, e) < o && (i = Lt(n, e), !!i); ) s = n.hasNode(i.v) ? V2(e, i) : -V2(e, i), yt2(n, e, s);
  return n;
}
function Et(e, n) {
  function t(r) {
    let o = n.nodeEdges(r);
    o && o.forEach((i) => {
      let s = i.v, a = r === s ? i.w : s;
      !e.hasNode(a) && !V2(n, i) && (e.setNode(a, {}), e.setEdge(r, a, {}), t(a));
    });
  }
  return e.nodes().forEach(t), e.nodeCount();
}
function Lt(e, n) {
  return n.edges().reduce((r, o) => {
    let i = Number.POSITIVE_INFINITY;
    return e.hasNode(o.v) !== e.hasNode(o.w) && (i = V2(n, o)), i < r[0] ? [i, o] : r;
  }, [Number.POSITIVE_INFINITY, null])[1];
}
function yt2(e, n, t) {
  e.nodes().forEach((r) => n.node(r).rank += t);
}
var { preorder: wt2, postorder: Nt } = H;
var en = Y2;
Y2.initLowLimValues = pe2;
Y2.initCutValues = ge2;
Y2.calcCutValue = nn;
Y2.leaveEdge = rn;
Y2.enterEdge = on;
Y2.exchangeEdges = sn;
function Y2(e) {
  e = Ye2(e), U2(e);
  let n = ne2(e);
  pe2(n), ge2(n, e);
  let t, r;
  for (; t = rn(n); ) r = on(n, e, t), sn(n, e, t, r);
}
function ge2(e, n) {
  let t = Nt(e, e.nodes());
  t = t.slice(0, t.length - 1), t.forEach((r) => Gt(e, n, r));
}
function Gt(e, n, t) {
  let o = e.node(t).parent, i = e.edge(t, o);
  i.cutvalue = nn(e, n, t);
}
function nn(e, n, t) {
  let o = e.node(t).parent, i = true, s = n.edge(t, o), a = 0;
  s || (i = false, s = n.edge(o, t)), a = s.weight;
  let l3 = n.nodeEdges(t);
  return l3 && l3.forEach((u) => {
    let d = u.v === t, c = d ? u.w : u.v;
    if (c !== o) {
      let f = d === i, h2 = n.edge(u).weight;
      if (a += f ? h2 : -h2, kt2(e, t, c)) {
        let E2 = e.edge(t, c).cutvalue;
        a += f ? -E2 : E2;
      }
    }
  }), a;
}
function pe2(e, n) {
  arguments.length < 2 && (n = e.nodes()[0]), tn(e, {}, 1, n);
}
function tn(e, n, t, r, o) {
  let i = t, s = e.node(r);
  n[r] = true;
  let a = e.neighbors(r);
  return a && a.forEach((l3) => {
    Object.hasOwn(n, l3) || (t = tn(e, n, t, l3, r));
  }), s.low = i, s.lim = t++, o ? s.parent = o : delete s.parent, t;
}
function rn(e) {
  return e.edges().find((n) => e.edge(n).cutvalue < 0);
}
function on(e, n, t) {
  let r = t.v, o = t.w;
  n.hasEdge(r, o) || (r = t.w, o = t.v);
  let i = e.node(r), s = e.node(o), a = i, l3 = false;
  return i.lim > s.lim && (a = s, l3 = true), n.edges().filter((d) => l3 === Ze2(e, e.node(d.v), a) && l3 !== Ze2(e, e.node(d.w), a)).reduce((d, c) => V2(n, c) < V2(n, d) ? c : d);
}
function sn(e, n, t, r) {
  let o = t.v, i = t.w;
  e.removeEdge(o, i), e.setEdge(r.v, r.w, {}), pe2(e), ge2(e, n), vt(e, n);
}
function vt(e, n) {
  let t = e.nodes().find((o) => !e.node(o).parent);
  if (!t) return;
  let r = wt2(e, [t]);
  r = r.slice(1), r.forEach((o) => {
    let s = e.node(o).parent, a = n.edge(o, s), l3 = false;
    a || (a = n.edge(s, o), l3 = true), n.node(o).rank = n.node(s).rank + (l3 ? a.minlen : -a.minlen);
  });
}
function kt2(e, n, t) {
  return e.hasEdge(n, t);
}
function Ze2(e, n, t) {
  return t.low <= n.lim && n.lim <= t.lim;
}
var dn = xt2;
function xt2(e) {
  let n = e.graph().ranker;
  if (typeof n == "function") return n(e);
  switch (n) {
    case "network-simplex":
      an(e);
      break;
    case "tight-tree":
      Ot2(e);
      break;
    case "longest-path":
      _t(e);
      break;
    case "none":
      break;
    default:
      an(e);
  }
}
var _t = U2;
function Ot2(e) {
  U2(e), ne2(e);
}
function an(e) {
  en(e);
}
var ln = Ct;
function Ct(e) {
  let n = jt(e), t = e.graph();
  if (!Array.isArray(t.dummyChains)) return;
  t.dummyChains.forEach((o) => {
    let i = e.node(o), s = i.edgeObj, a = Tt2(e, n, s.v, s.w), l3 = a.path, u = a.lca, d = 0, c = l3[d], f = true;
    for (; o !== s.w; ) {
      if (i = e.node(o), f) {
        for (; (c = l3[d]) !== u && e.node(c).maxRank < i.rank; ) d++;
        c === u && (f = false);
      }
      if (!f) {
        for (; d < l3.length - 1 && e.node(l3[d + 1]).minRank <= i.rank; ) d++;
        c = l3[d];
      }
      c !== void 0 && e.setParent(o, c), o = e.successors(o)[0];
    }
  });
}
function Tt2(e, n, t, r) {
  let o = [], i = [], s = Math.min(n[t].low, n[r].low), a = Math.max(n[t].lim, n[r].lim), l3;
  l3 = t;
  do
    l3 = e.parent(l3), o.push(l3);
  while (l3 && (n[l3].low > s || a > n[l3].lim));
  let u = l3, d = r;
  for (; (d = e.parent(d)) !== u; ) i.push(d);
  return { path: o.concat(i.reverse()), lca: u };
}
function jt(e) {
  let n = {}, t = 0;
  function r(o) {
    let i = t;
    e.children(o).forEach(r), n[o] = { low: i, lim: t++ };
  }
  return e.children(D2).forEach(r), n;
}
function un(e) {
  let n = M(e, "root", {}, "_root"), t = Rt2(e), r = Object.values(t), o = R2(Math.max, r) - 1, i = 2 * o + 1;
  e.graph().nestingRoot = n, e.edges().forEach((a) => e.edge(a).minlen *= i);
  let s = It(e) + 1;
  e.children(D2).forEach((a) => {
    cn(e, n, i, s, o, t, a);
  }), e.graph().nodeRankFactor = i;
}
function cn(e, n, t, r, o, i, s) {
  var c;
  let a = e.children(s);
  if (!a.length) {
    s !== n && e.setEdge(n, s, { weight: 0, minlen: t });
    return;
  }
  let l3 = ae(e, "_bt"), u = ae(e, "_bb"), d = e.node(s);
  e.setParent(l3, s), d.borderTop = l3, e.setParent(u, s), d.borderBottom = u, a.forEach((f) => {
    var b;
    cn(e, n, t, r, o, i, f);
    let h2 = e.node(f), p = h2.borderTop ? h2.borderTop : f, E2 = h2.borderBottom ? h2.borderBottom : f, y2 = h2.borderTop ? r : 2 * r, L2 = p !== E2 ? 1 : o - ((b = i[s]) != null ? b : 0) + 1;
    e.setEdge(l3, p, { weight: y2, minlen: L2, nestingEdge: true }), e.setEdge(E2, u, { weight: y2, minlen: L2, nestingEdge: true });
  }), e.parent(s) || e.setEdge(n, l3, { weight: 0, minlen: o + ((c = i[s]) != null ? c : 0) });
}
function Rt2(e) {
  let n = {};
  function t(r, o) {
    let i = e.children(r);
    i && i.length && i.forEach((s) => t(s, o + 1)), n[r] = o;
  }
  return e.children(D2).forEach((r) => t(r, 1)), n;
}
function It(e) {
  return e.edges().reduce((n, t) => n + e.edge(t).weight, 0);
}
function fn2(e) {
  let n = e.graph();
  e.removeNode(n.nestingRoot), delete n.nestingRoot, e.edges().forEach((t) => {
    e.edge(t).nestingEdge && e.removeEdge(t);
  });
}
var bn = Mt;
function Mt(e) {
  function n(t) {
    let r = e.children(t), o = e.node(t);
    if (r.length && r.forEach(n), o && Object.hasOwn(o, "minRank")) {
      o.borderLeft = [], o.borderRight = [];
      for (let i = o.minRank, s = o.maxRank + 1; i < s; ++i) hn(e, "borderLeft", "_bl", t, o, i), hn(e, "borderRight", "_br", t, o, i);
    }
  }
  e.children(D2).forEach(n);
}
function hn(e, n, t, r, o, i) {
  let s = { width: 0, height: 0, rank: i, borderType: n }, a = o[n][i - 1], l3 = M(e, "border", s, t);
  o[n][i] = l3, e.setParent(l3, r), a && e.setEdge(a, l3, { weight: 1 });
}
function pn(e) {
  var t;
  let n = (t = e.graph().rankdir) == null ? void 0 : t.toLowerCase();
  (n === "lr" || n === "rl") && En(e);
}
function mn2(e) {
  var t;
  let n = (t = e.graph().rankdir) == null ? void 0 : t.toLowerCase();
  (n === "bt" || n === "rl") && Pt2(e), (n === "lr" || n === "rl") && (Ft(e), En(e));
}
function En(e) {
  e.nodes().forEach((n) => gn2(e.node(n))), e.edges().forEach((n) => gn2(e.edge(n)));
}
function gn2(e) {
  let n = e.width;
  e.width = e.height, e.height = n;
}
function Pt2(e) {
  e.nodes().forEach((n) => me2(e.node(n))), e.edges().forEach((n) => {
    var r;
    let t = e.edge(n);
    (r = t.points) == null || r.forEach(me2), Object.hasOwn(t, "y") && me2(t);
  });
}
function me2(e) {
  e.y = -e.y;
}
function Ft(e) {
  e.nodes().forEach((n) => Ee2(e.node(n))), e.edges().forEach((n) => {
    var r;
    let t = e.edge(n);
    (r = t.points) == null || r.forEach(Ee2), Object.hasOwn(t, "x") && Ee2(t);
  });
}
function Ee2(e) {
  let n = e.x;
  e.x = e.y, e.y = n;
}
function Le2(e, n = null) {
  let t = {}, r = e.nodes().filter((d) => !e.children(d).length), o = r.map((d) => e.node(d).rank), i = R2(Math.max, o), s = A2(i + 1).map(() => []);
  function a(d) {
    if (t[d]) return;
    t[d] = true;
    let c = e.node(d);
    s[c.rank].push(d);
    let f = e.successors(d);
    f && [...f].sort((p, E2) => u(p, E2)).forEach(a);
  }
  r.sort((d, c) => e.node(d).rank - e.node(c).rank).forEach(a);
  function u(d, c) {
    let f = e.node(d), h2 = e.node(c);
    return ee2(n, f, h2);
  }
  return s;
}
function ye(e, n) {
  let t = 0;
  for (let r = 1; r < n.length; ++r) t += Vt(e, n[r - 1], n[r]);
  return t;
}
function Vt(e, n, t) {
  let r = He2(t, t.map((u, d) => d)), o = n.flatMap((u) => {
    let d = e.outEdges(u);
    return d ? d.map((c) => ({ pos: r[c.w], weight: e.edge(c).weight })).sort((c, f) => c.pos - f.pos) : [];
  }), i = 1;
  for (; i < t.length; ) i <<= 1;
  let s = 2 * i - 1;
  i -= 1;
  let a = new Array(s).fill(0), l3 = 0;
  return o.forEach((u) => {
    let d = u.pos + i;
    a[d] += u.weight;
    let c = 0;
    for (; d > 0; ) d % 2 && (c += a[d + 1]), d = d - 1 >> 1, a[d] += u.weight;
    l3 += u.weight * c;
  }), l3;
}
function we2(e, n = []) {
  return n.map((t) => {
    let r = e.inEdges(t);
    if (!r || !r.length) return { v: t };
    {
      let o = r.reduce((i, s) => {
        let a = e.edge(s), l3 = e.node(s.v);
        return { sum: i.sum + a.weight * l3.order, weight: i.weight + a.weight };
      }, { sum: 0, weight: 0 });
      return { v: t, barycenter: o.sum / o.weight, weight: o.weight };
    }
  });
}
function Ne2(e, n) {
  let t = {};
  e.forEach((o, i) => {
    let s = { indegree: 0, in: [], out: [], vs: [o.v], i };
    o.barycenter !== void 0 && (s.barycenter = o.barycenter, s.weight = o.weight), t[o.v] = s;
  }), n.edges().forEach((o) => {
    let i = t[o.v], s = t[o.w];
    i !== void 0 && s !== void 0 && (s.indegree++, i.out.push(s));
  });
  let r = Object.values(t).filter((o) => !o.indegree);
  return Dt(r);
}
function Dt(e) {
  let n = [];
  function t(o) {
    return (i) => {
      i.merged || (i.barycenter === void 0 || o.barycenter === void 0 || i.barycenter >= o.barycenter) && Yt(o, i);
    };
  }
  function r(o) {
    return (i) => {
      i.in.push(o), --i.indegree === 0 && e.push(i);
    };
  }
  for (; e.length; ) {
    let o = e.pop();
    n.push(o), o.in.reverse().forEach(t(o)), o.out.forEach(r(o));
  }
  return n.filter((o) => !o.merged).map((o) => B2(o, ["vs", "i", "barycenter", "weight"]));
}
function Yt(e, n) {
  let t = 0, r = 0;
  e.weight && (t += e.barycenter * e.weight, r += e.weight), n.weight && (t += n.barycenter * n.weight, r += n.weight), e.vs = n.vs.concat(e.vs), e.barycenter = t / r, e.weight = r, e.i = Math.min(n.i, e.i), n.merged = true;
}
function Ge2(e, n, t, r, o) {
  let i = {}, s = null, a = null, l3 = o;
  typeof n == "boolean" ? (l3 = n, i = {}) : n && (i = n, s = t != null ? t : null, a = r != null ? r : null);
  let u = ze2(e, (L2) => Object.hasOwn(L2, "barycenter")), d = u.lhs, c = u.rhs.sort((L2, b) => b.i - L2.i), f = [], h2 = 0, p = 0, E2 = 0;
  d.sort(Wt(a, s, !!l3));
  for (let [L2, b] of Object.entries(i)) {
    let g = d.findIndex((m) => m.vs[0] === L2);
    d.splice(g + 1, 0, b);
  }
  E2 = Ln(f, c, E2), d.forEach((L2) => {
    E2 += L2.vs.length, f.push(L2.vs), h2 += L2.barycenter * L2.weight, p += L2.weight, E2 = Ln(f, c, E2);
  });
  let y2 = { vs: f.flat(1) };
  return p && (y2.barycenter = h2 / p, y2.weight = p), y2;
}
function Ln(e, n, t) {
  let r;
  for (; n.length && (r = n[n.length - 1]).i <= t; ) n.pop(), e.push(r.vs), t++;
  return t;
}
function Wt(e, n, t) {
  return (r, o) => {
    if (r.barycenter < o.barycenter) return -1;
    if (r.barycenter > o.barycenter) return 1;
    if (e && (typeof r.vs[0] == "string" || typeof o.vs[0] == "string")) {
      let i = e.node(r.vs[0]), s = e.node(o.vs[0]), a = ee2(n, i, s);
      if (a !== 0) return a;
    }
    return t ? o.i - r.i : r.i - o.i;
  };
}
function te2(e, n, t, r, o) {
  var L2, b, g, m, w, k2, _2, C2, j2, I2, S2;
  let i = null, s = o;
  typeof r == "boolean" ? (s = r, i = null) : r !== void 0 && (i = r);
  let a = e.children(n), l3 = e.node(n), u = l3 ? l3.borderLeft : void 0, d = l3 ? l3.borderRight : void 0, c = {};
  u && (a = a.filter((G2) => G2 !== u && G2 !== d));
  let f = we2(e, a);
  f.forEach((G2) => {
    if (e.children(G2.v).length) {
      let { result: x2 } = te2(e, G2.v, t, i, s);
      c[G2.v] = x2, Object.hasOwn(x2, "barycenter") && Xt(G2, x2);
    }
  });
  let h2 = Ne2(f, t);
  Bt(h2, c);
  let p = {}, E2 = false;
  for (let G2 = 0; G2 < h2.length; G2++) for (let x2 = G2 + 1; x2 < h2.length; x2++) if (!(!h2[G2] || !h2[x2] || !((L2 = h2[G2]) != null && L2.barycenter) || !((b = h2[x2]) != null && b.barycenter)) && ((g = h2[G2]) == null ? void 0 : g.barycenter) === h2[x2].barycenter) {
    let v = (w = (m = h2[G2]) == null ? void 0 : m.vs[0]) != null ? w : "", N2 = (_2 = (k2 = h2[x2]) == null ? void 0 : k2.vs[0]) != null ? _2 : "", O2 = e.node(v), W2 = e.node(N2);
    if (O2.dummy === "edge" && W2.dummy === "edge" && ((C2 = O2.edgeObj) == null ? void 0 : C2.v) === ((j2 = W2.edgeObj) == null ? void 0 : j2.v) && ((I2 = O2.edgeObj) == null ? void 0 : I2.w) === ((S2 = W2.edgeObj) == null ? void 0 : S2.w)) if (O2.edgeLabel.reversed) {
      p[N2] = h2[G2], h2.splice(G2, 1), G2--;
      break;
    } else p[v] = h2[x2], h2.splice(x2, 1), x2--;
    else E2 = true;
  }
  let y2 = Ge2(h2, p, i, e, s);
  if (u && d) {
    y2.vs = [u, y2.vs, d].flat(1);
    let G2 = e.predecessors(u);
    if (G2 && G2.length) {
      let x2 = e.node(G2[0]), v = e.predecessors(d), N2 = e.node(v[0]);
      Object.hasOwn(y2, "barycenter") || (y2.barycenter = 0, y2.weight = 0), y2.barycenter = (y2.barycenter * y2.weight + x2.order + N2.order) / (y2.weight + 2), y2.weight += 2;
    }
  }
  return Object.defineProperty(y2, "result", { value: y2, enumerable: false, configurable: true, writable: true }), Object.defineProperty(y2, "usedBias", { value: E2, enumerable: false, configurable: true, writable: true }), y2;
}
function Bt(e, n) {
  e.forEach((t) => {
    t.vs = t.vs.flatMap((r) => n[r] ? n[r].vs : r);
  });
}
function Xt(e, n) {
  e.barycenter !== void 0 ? (e.barycenter = (e.barycenter * e.weight + n.barycenter * n.weight) / (e.weight + n.weight), e.weight += n.weight) : (e.barycenter = n.barycenter, e.weight = n.weight);
}
function ve2(e, n, t, r) {
  r || (r = e.nodes());
  let o = zt(e), i = new T2({ compound: true }).setGraph({ root: o }).setDefaultNodeLabel((s) => e.node(s));
  return r.forEach((s) => {
    let a = e.node(s), l3 = e.parent(s);
    if (a.rank === n || a.minRank <= n && n <= a.maxRank) {
      i.setNode(s), i.setParent(s, l3 || o);
      let u = e[t](s);
      u && u.forEach((d) => {
        let c = d.v === s ? d.w : d.v, f = i.edge(c, s), h2 = f !== void 0 ? f.weight : 0;
        i.setEdge(c, s, { weight: e.edge(d).weight + h2 });
      }), Object.hasOwn(a, "minRank") && i.setNode(s, { borderLeft: a.borderLeft[n], borderRight: a.borderRight[n] });
    }
  }), i;
}
function zt(e) {
  let n;
  for (; e.hasNode(n = $2("_root")); ) ;
  return n;
}
function ke2(e, n, t) {
  let r = {}, o;
  t.forEach((i) => {
    let s = e.parent(i), a, l3;
    for (; s; ) {
      if (a = e.parent(s), a ? (l3 = r[a], r[a] = s) : (l3 = o, o = s), l3 && l3 !== s) {
        n.setEdge(l3, s);
        return;
      }
      s = a;
    }
  });
}
function re2(e, n = {}, t = null) {
  if (typeof n.customOrder == "function") {
    n.customOrder(e, re2);
    return;
  }
  let r = de2(e), o = yn(e, A2(1, r + 1), "inEdges"), i = yn(e, A2(r - 1, -1, -1), "outEdges"), s = Le2(e, t);
  if (wn(e, s), n.disableOptimalOrderHeuristic) return;
  let a = Number.POSITIVE_INFINITY, l3, u = n.constraints || [];
  for (let d = 0, c = 0; c < 4; ++d, ++c) {
    Ht(d % 2 ? o : i, d % 4 >= 2, u, t), s = P2(e);
    let f = ye(e, s);
    f < a ? (c = 0, l3 = Object.assign({}, s), a = f) : f === a && (l3 = structuredClone(s));
  }
  wn(e, l3);
}
function yn(e, n, t) {
  let r = /* @__PURE__ */ new Map(), o = (i, s) => {
    r.has(i) || r.set(i, []), r.get(i).push(s);
  };
  for (let i of e.nodes()) {
    let s = e.node(i);
    if (typeof s.rank == "number" && o(s.rank, i), typeof s.minRank == "number" && typeof s.maxRank == "number") for (let a = s.minRank; a <= s.maxRank; a++) a !== s.rank && o(a, i);
  }
  return n.map(function(i) {
    return ve2(e, i, t, r.get(i) || []);
  });
}
function Ht(e, n, t, r) {
  let o = true, i = new T2();
  e.forEach(function(s) {
    t.forEach((d) => i.setEdge(d.left, d.right));
    let a = s.graph().root, { result: l3, usedBias: u } = te2(s, a, i, r, o);
    n && u && (o = !o), l3.vs.forEach((d, c) => s.node(d).order = c), ke2(s, i, l3.vs);
  });
}
function wn(e, n) {
  Object.values(n).forEach((t) => t.forEach((r, o) => e.node(r).order = o));
}
function qt(e, n) {
  let t = {};
  function r(o, i) {
    let s = 0, a = 0, l3 = o.length, u = i[i.length - 1];
    return i.forEach((d, c) => {
      let f = Ut(e, d), h2 = f ? e.node(f).order : l3;
      (f || d === u) && (i.slice(a, c + 1).forEach((p) => {
        let E2 = e.predecessors(p);
        E2 && E2.forEach((y2) => {
          let L2 = e.node(y2), b = L2.order;
          (b < s || h2 < b) && !(L2.dummy && e.node(p).dummy) && Gn(t, y2, p);
        });
      }), a = c + 1, s = h2);
    }), i;
  }
  return n.length && n.reduce(r), t;
}
function $t(e, n) {
  let t = {};
  function r(i, s, a, l3, u) {
    A2(s, a).forEach((d) => {
      let c = i[d];
      if (c !== void 0 && e.node(c).dummy) {
        let f = e.predecessors(c);
        f && f.forEach((h2) => {
          if (h2 === void 0) return;
          let p = e.node(h2);
          p.dummy && (p.order < l3 || p.order > u) && Gn(t, h2, c);
        });
      }
    });
  }
  function o(i, s) {
    let a = -1, l3 = -1, u = 0;
    return s.forEach((d, c) => {
      if (e.node(d).dummy === "border") {
        let f = e.predecessors(d);
        if (f && f.length) {
          let h2 = f[0];
          if (h2 === void 0) return;
          l3 = e.node(h2).order, r(s, u, c, a, l3), u = c, a = l3;
        }
      }
      r(s, u, s.length, l3, i.length);
    }), s;
  }
  return n.length && n.reduce(o), t;
}
function Ut(e, n) {
  if (e.node(n).dummy) {
    let t = e.predecessors(n);
    if (t) return t.find((r) => e.node(r).dummy);
  }
}
function Gn(e, n, t) {
  if (n > t) {
    let o = n;
    n = t, t = o;
  }
  let r = e[n];
  r || (e[n] = r = {}), r[t] = true;
}
function Jt(e, n, t) {
  if (n > t) {
    let o = n;
    n = t, t = o;
  }
  let r = e[n];
  return r !== void 0 && Object.hasOwn(r, t);
}
function Kt(e, n, t, r, o) {
  let i = {}, s = {}, a = {};
  return n.forEach((l3) => {
    l3.forEach((u, d) => {
      i[u] = u, s[u] = u, a[u] = d;
    });
  }), n.forEach((l3) => {
    let u = -1, d = -1, c = false, f = l3, h2 = l3.findIndex((p) => (o == null ? void 0 : o.includes(p)) || Nn(p, e, o));
    h2 > 0 && (f = [l3[h2], ...l3.slice(0, h2), ...l3.slice(h2 + 1)], c = true), f.forEach((p) => {
      var y2;
      let E2 = r(p);
      if (E2 && E2.length) {
        o != null && o.includes(p) && (E2 = E2.filter((g) => Nn(g, e, o)));
        let L2 = E2.sort((g, m) => {
          let w = a[g], k2 = a[m];
          return (w !== void 0 ? w : 0) - (k2 !== void 0 ? k2 : 0);
        }), b = (L2.length - 1) / 2;
        for (let g = Math.floor(b), m = Math.ceil(b); g <= m; ++g) {
          let w = L2[g];
          if (w === void 0) continue;
          let k2 = a[w];
          if (k2 !== void 0 && s[p] === p && u < k2 && a[w] !== d && !Jt(t, p, w)) {
            let _2 = i[w];
            _2 !== void 0 && (s[w] = p, s[p] = i[p] = _2, u = k2, c && (u = -1, d = (y2 = a[w]) != null ? y2 : -1, c = false));
          }
        }
      }
    });
  }), { root: i, align: s };
}
function Qt(e, n, t, r, o = false) {
  let i = {}, s = Zt(e, n, t, o), a = o ? "borderLeft" : "borderRight";
  function l3(h2, p) {
    let E2 = s.nodes().slice(), y2 = {}, L2 = E2.pop();
    for (; L2; ) {
      if (y2[L2]) h2(L2);
      else {
        y2[L2] = true, E2.push(L2);
        for (let b of p(L2)) E2.push(b);
      }
      L2 = E2.pop();
    }
  }
  function u(h2) {
    let p = s.inEdges(h2);
    p ? i[h2] = p.reduce((E2, y2) => {
      var g;
      let L2 = (g = i[y2.v]) != null ? g : 0, b = s.edge(y2);
      return Math.max(E2, L2 + (b !== void 0 ? b : 0));
    }, 0) : i[h2] = 0;
  }
  function d(h2) {
    let p = s.outEdges(h2), E2 = Number.POSITIVE_INFINITY;
    p && (E2 = p.reduce((L2, b) => {
      let g = i[b.w], m = s.edge(b);
      return Math.min(L2, (g !== void 0 ? g : 0) - (m !== void 0 ? m : 0));
    }, Number.POSITIVE_INFINITY));
    let y2 = e.node(h2);
    E2 !== Number.POSITIVE_INFINITY && y2.borderType !== a && (i[h2] = Math.max(i[h2] !== void 0 ? i[h2] : 0, E2));
  }
  function c(h2) {
    return s.predecessors(h2) || [];
  }
  function f(h2) {
    return s.successors(h2) || [];
  }
  return l3(u, c), l3(d, f), Object.keys(r).forEach((h2) => {
    var E2;
    let p = t[h2];
    p !== void 0 && (i[h2] = (E2 = i[p]) != null ? E2 : 0);
  }), i;
}
function Zt(e, n, t, r) {
  let o = new T2(), i = e.graph(), s = rr(i.nodesep, i.edgesep, r);
  return n.forEach((a) => {
    let l3;
    a.forEach((u) => {
      let d = t[u];
      if (d !== void 0) {
        if (o.setNode(d), l3 !== void 0) {
          let c = t[l3];
          if (c !== void 0) {
            let f = o.edge(c, d);
            o.setEdge(c, d, Math.max(s(e, u, l3), f || 0));
          }
        }
        l3 = u;
      }
    });
  }), o;
}
function er(e, n) {
  return Object.values(n).reduce((t, r) => {
    let o = Number.NEGATIVE_INFINITY, i = Number.POSITIVE_INFINITY;
    Object.entries(r).forEach(([a, l3]) => {
      let u = or(e, a) / 2;
      o = Math.max(l3 + u, o), i = Math.min(l3 - u, i);
    });
    let s = o - i;
    return s < t[0] && (t = [s, r]), t;
  }, [Number.POSITIVE_INFINITY, null])[1];
}
function nr(e, n) {
  let t = Object.values(n), r = R2(Math.min, t), o = R2(Math.max, t);
  ["u", "d"].forEach((i) => {
    ["l", "r"].forEach((s) => {
      let a = i + s, l3 = e[a];
      if (!l3 || l3 === n) return;
      let u = Object.values(l3), d = r - R2(Math.min, u);
      s !== "l" && (d = o - R2(Math.max, u)), d && (e[a] = X2(l3, (c) => c + d));
    });
  });
}
function tr(e, n = void 0) {
  let t = e.ul;
  return t ? X2(t, (r, o) => {
    var s, a;
    if (n) {
      let l3 = n.toLowerCase(), u = e[l3];
      if (u && u[o] !== void 0) return u[o];
    }
    let i = Object.values(e).map((l3) => {
      let u = l3[o];
      return u !== void 0 ? u : 0;
    }).sort((l3, u) => l3 - u);
    return (((s = i[1]) != null ? s : 0) + ((a = i[2]) != null ? a : 0)) / 2;
  }) : {};
}
function vn(e, n) {
  let t = P2(e), r = Object.assign(qt(e, t), $t(e, t)), o = {}, i;
  ["u", "d"].forEach((a) => {
    i = a === "u" ? t : Object.values(t).reverse(), ["l", "r"].forEach((l3) => {
      l3 === "r" && (i = i.map((f) => Object.values(f).reverse()));
      let d = Kt(e, i, r, (f) => (a === "u" ? e.predecessors(f) : e.successors(f)) || [], n), c = Qt(e, i, d.root, d.align, l3 === "r");
      l3 === "r" && (c = X2(c, (f) => -f)), o[a + l3] = c;
    });
  });
  let s = er(e, o);
  return nr(o, s), tr(o, e.graph().align);
}
function rr(e, n, t) {
  return (r, o, i) => {
    let s = r.node(o), a = r.node(i), l3 = 0, u;
    if (l3 += s.width / 2, Object.hasOwn(s, "labelpos")) switch (s.labelpos.toLowerCase()) {
      case "l":
        u = -s.width / 2;
        break;
      case "r":
        u = s.width / 2;
        break;
    }
    if (u && (l3 += t ? u : -u), u = void 0, l3 += (s.dummy ? n : e) / 2, l3 += (a.dummy ? n : e) / 2, l3 += a.width / 2, Object.hasOwn(a, "labelpos")) switch (a.labelpos.toLowerCase()) {
      case "l":
        u = a.width / 2;
        break;
      case "r":
        u = -a.width / 2;
        break;
    }
    return u && (l3 += t ? u : -u), l3;
  };
}
function or(e, n) {
  return e.node(n).width;
}
function Nn(e, n, t) {
  var s;
  if (!t) return false;
  let r = (s = n.node(e)) == null ? void 0 : s.edgeObj;
  if (!r || n.node(e).edgeLabel.reversed) return false;
  let o = t.indexOf(r == null ? void 0 : r.v), i = t.indexOf(r == null ? void 0 : r.w);
  return o !== -1 && i !== -1 && o === (i + 1) % t.length || o === (i - 1) % t.length;
}
function kn(e, n) {
  e = Z(e), ir(e), Object.entries(vn(e, n)).forEach(([t, r]) => e.node(t).x = r);
}
function ir(e) {
  let n = P2(e), t = e.graph(), r = t.ranksep, o = t.rankalign, i = 0;
  n.forEach((s) => {
    let a = s.reduce((l3, u) => {
      var c;
      let d = (c = e.node(u).height) != null ? c : 0;
      return l3 > d ? l3 : d;
    }, 0);
    s.forEach((l3) => {
      let u = e.node(l3);
      o === "top" ? u.y = i + u.height / 2 : o === "bottom" ? u.y = i + a - u.height / 2 : u.y = i + a / 2;
    }), i += a + r;
  });
}
var xn2 = /* @__PURE__ */ new WeakMap();
function Oe2(e, n = {}) {
  return Rn2(e, q2, n), e;
}
function _n(e, n, t) {
  let r = n;
  for (; r !== void 0; ) {
    let o = e.parent(r);
    if (o === t) return r;
    r = o;
  }
}
function Rn2(e, n, t) {
  var L2;
  let r = e.nodes().filter((b) => e.children(b).length), o = {};
  r.forEach((b) => {
    let g = e.node(b);
    if (g && g.rankdir) {
      let m = new T2({ multigraph: true, compound: true });
      m.setGraph({ rankdir: g.rankdir });
      let w = e.children(b);
      w.forEach((v) => {
        let N2 = { ...e.node(v) };
        m.setNode(v, N2);
        let O2 = e.parent(v);
        O2 && O2 !== b && w.includes(O2) && m.setParent(v, O2);
      });
      let k2 = /* @__PURE__ */ new Set();
      e.edges().forEach((v) => {
        let N2 = _n(e, v.v, b), O2 = _n(e, v.w, b);
        if (N2 && O2 && N2 !== O2) {
          let W2 = `${N2}\0${O2}`;
          k2.has(W2) || (k2.add(W2), m.setEdge(N2, O2, { ...e.edge(v) }));
        }
      }), Rn2(m, n, t);
      let _2 = jn(m);
      On(_2, n, t, null), Cn(m, _2);
      let C2 = 1 / 0, j2 = 1 / 0, I2 = -1 / 0, S2 = -1 / 0;
      m.nodes().forEach((v) => {
        if (v === b) return;
        let N2 = m.node(v);
        N2 && typeof N2.x == "number" && typeof N2.y == "number" && typeof N2.width == "number" && typeof N2.height == "number" && (C2 = Math.min(C2, N2.x - N2.width / 2), I2 = Math.max(I2, N2.x + N2.width / 2), j2 = Math.min(j2, N2.y - N2.height / 2), S2 = Math.max(S2, N2.y + N2.height / 2));
      }), (!isFinite(C2) || !isFinite(j2) || !isFinite(I2) || !isFinite(S2)) && (C2 = j2 = 0, I2 = S2 = 0);
      let G2 = I2 - C2, x2 = S2 - j2;
      o[b] = { minX: C2, minY: j2, maxX: I2, maxY: S2, width: G2, height: x2, offsetX: C2, offsetY: j2 }, g._dagreClusterSubgraph = m;
    }
  });
  let i = [], s = (b) => {
    let g = [], m = (e.children(b) || []).filter((w) => w !== b);
    for (; m.length > 0; ) {
      let w = m.shift();
      g.push(w), (e.children(w) || []).filter((k2) => k2 !== w).forEach((k2) => m.push(k2));
    }
    return g;
  }, a = /* @__PURE__ */ new Map();
  r.forEach((b) => {
    let g = e.node(b);
    g && g.rankdir && o[b] && a.set(b, (e.children(b) || []).filter((m) => m !== b));
  });
  let l3 = new Set([...a.values()].flat()), u = /* @__PURE__ */ new Map();
  a.forEach((b, g) => {
    l3.has(g) || u.set(g, s(g));
  });
  let d = new Set([...u.values()].flat()), c = (b) => {
    for (let [g, m] of u) if (m.includes(b)) return g;
    return b;
  }, f = [];
  e.edges().forEach((b) => {
    (d.has(b.v) || d.has(b.w)) && f.push({ edge: b, label: e.edge(b) });
  });
  let h2 = /* @__PURE__ */ new Map();
  d.forEach((b) => {
    let g = e.parent(b);
    h2.set(b, typeof g == "string" ? g : void 0);
  }), u.forEach((b, g) => {
    let m = e.node(g), w = [];
    b.forEach((C2) => {
      let j2 = e.node(C2);
      j2 && (w.push({ id: C2, node: j2, parent: h2.get(C2) }), e.removeNode(C2));
    });
    let k2 = f.filter(({ edge: C2 }) => b.includes(C2.v) || b.includes(C2.w)), _2 = o[g];
    m && (i.push({ clusterId: g, subgraph: m._dagreClusterSubgraph, bounds: _2, children: b, removedNodes: w, removedEdges: k2 }), m.width = _2.width, m.height = _2.height);
  });
  let p = /* @__PURE__ */ new Set();
  f.forEach(({ edge: b, label: g }) => {
    let m = c(b.v), w = c(b.w);
    if (m !== w && e.hasNode(m) && e.hasNode(w)) {
      let k2 = `${m}\0${w}`;
      p.has(k2) || (p.add(k2), e.setEdge(m, w, { ...g, width: 0, height: 0 }));
    }
  });
  let E2 = jn(e), y2 = On(E2, n, t, (L2 = xn2.get(e)) != null ? L2 : null);
  xn2.set(e, y2), Cn(e, E2), p.forEach((b) => {
    let g = b.indexOf("\0"), m = b.slice(0, g), w = b.slice(g + 1);
    e.hasEdge(m, w) && e.removeEdge(m, w);
  }), i.forEach(({ clusterId: b, subgraph: g, bounds: m, removedNodes: w, removedEdges: k2 }) => {
    var G2, x2;
    let _2 = e.node(b), C2 = (G2 = _2 == null ? void 0 : _2.x) != null ? G2 : 0, j2 = (x2 = _2 == null ? void 0 : _2.y) != null ? x2 : 0, I2 = (m.minX + m.maxX) / 2, S2 = (m.minY + m.maxY) / 2;
    w.forEach(({ id: v, node: N2, parent: O2 }) => {
      e.setNode(v, N2), O2 !== void 0 && e.setParent(v, O2);
    }), k2.forEach(({ edge: v, label: N2 }) => {
      e.setEdge(v, N2);
    }), g.nodes().forEach((v) => {
      if (v === b) return;
      let N2 = g.node(v), O2 = e.node(v);
      O2 && N2 && typeof N2.x == "number" && typeof N2.y == "number" && (O2.x = C2 + (N2.x - I2), O2.y = j2 + (N2.y - S2));
    }), delete _2._dagreClusterSubgraph;
  }), r.forEach((b) => {
    var w, k2;
    let g = e.node(b), m = o[b];
    if (g && g.rankdir && g._dagreClusterSubgraph && m) {
      let _2 = g._dagreClusterSubgraph, C2 = (w = g.x) != null ? w : 0, j2 = (k2 = g.y) != null ? k2 : 0, I2 = (m.minX + m.maxX) / 2, S2 = (m.minY + m.maxY) / 2;
      _2.nodes().forEach((G2) => {
        if (G2 === b) return;
        let x2 = _2.node(G2), v = e.node(G2);
        if (v && x2 && typeof x2.x == "number" && typeof x2.y == "number") {
          let N2 = x2.x - I2, O2 = x2.y - S2;
          v.x = C2 + N2, v.y = j2 + O2;
        }
      }), delete g._dagreClusterSubgraph;
    }
  });
}
function On(e, n, t, r = null) {
  var l3, u;
  let o = (t == null ? void 0 : t.useDynamic) !== false, i = o && (l3 = r == null ? void 0 : r.graph) != null ? l3 : null, s = o && (u = r == null ? void 0 : r.rawNodes) != null ? u : null;
  n("    makeSpaceForEdgeLabels", () => hr(e)), n("    removeSelfEdges", () => Nr(e)), n("    acyclic", () => Ue2(e, i)), n("    nestingGraph.run", () => un(e)), n("    rank", () => dn(Z(e))), n("    injectEdgeLabelProxies", () => br(e)), n("    removeEmptyRanks", () => Be2(e)), n("    nestingGraph.cleanup", () => fn2(e)), n("    normalizeRanks", () => We2(e)), n("    assignRankMinMax", () => gr(e)), n("    removeEdgeLabelProxies", () => pr(e)), n("    normalize.run", () => Ke2(e)), n("    parentDummyChains", () => ln(e)), n("    addBorderSegments", () => bn(e)), n("    order", () => re2(e, t, s)), n("    insertSelfEdges", () => Gr(e)), n("    adjustCoordinateSystem", () => pn(e)), n("    position", () => kn(e, t.corePath)), n("    positionSelfEdges", () => vr(e));
  let a = JSON.parse(JSON.stringify(e._nodes));
  return n("    removeBorderNodes", () => wr(e)), n("    normalize.undo", () => Qe2(e)), n("    fixupEdgeLabelCoords", () => Lr(e)), n("    undoCoordinateSystem", () => mn2(e)), n("    translateGraph", () => mr(e)), n("    assignNodeIntersects", () => Er(e)), n("    reversePoints", () => yr(e)), n("    acyclic.undo", () => Je2(e)), { graph: e, rawNodes: a };
}
function Cn(e, n) {
  e.nodes().forEach((t) => {
    let r = e.node(t), o = n.node(t);
    r && (r.x = o.x, r.y = o.y, r.order = o.order, r.rank = o.rank, n.children(t).length && (r.width = o.width, r.height = o.height));
  }), e.edges().forEach((t) => {
    let r = e.edge(t), o = n.edge(t);
    r.points = o.points, Object.hasOwn(o, "x") && (r.x = o.x, r.y = o.y);
  }), e.graph().width = n.graph().width, e.graph().height = n.graph().height;
}
var sr = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
var ar = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "TB", rankalign: "center" };
var dr = ["acyclicer", "ranker", "rankdir", "align", "rankalign"];
var lr = ["width", "height", "rank"];
var Tn2 = { width: 0, height: 0 };
var ur = ["minlen", "weight", "width", "height", "labeloffset"];
var cr = { minlen: 1, weight: 1, width: 0, height: 0, labeloffset: 10, labelpos: "r" };
var fr = ["labelpos"];
function jn(e) {
  let n = new T2({ multigraph: true, compound: true }), t = _e2(e.graph());
  return n.setGraph(Object.assign({}, ar, xe2(t, sr), B2(t, dr))), e.nodes().forEach((r) => {
    let o = _e2(e.node(r)), i = xe2(o, lr);
    Object.keys(Tn2).forEach((a) => {
      i[a] === void 0 && (i[a] = Tn2[a]);
    }), n.setNode(r, i);
    let s = e.parent(r);
    s !== void 0 && n.setParent(r, s);
  }), e.edges().forEach((r) => {
    let o = _e2(e.edge(r));
    n.setEdge(r, Object.assign({}, cr, xe2(o, ur), B2(o, fr)));
  }), n;
}
function hr(e) {
  let n = e.graph();
  n.ranksep /= 2, e.edges().forEach((t) => {
    var o;
    let r = e.edge(t);
    r.minlen *= 2, ((o = r.labelpos) != null ? o : "r").toLowerCase() !== "c" && (n.rankdir === "TB" || n.rankdir === "BT" ? r.width += r.labeloffset : r.height += r.labeloffset);
  });
}
function br(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (t.width && t.height) {
      let r = e.node(n.v), i = { rank: (e.node(n.w).rank - r.rank) / 2 + r.rank, e: n };
      M(e, "edge-proxy", i, "_ep");
    }
  });
}
function gr(e) {
  let n = 0;
  e.nodes().forEach((t) => {
    let r = e.node(t);
    r.borderTop && (r.minRank = e.node(r.borderTop).rank, r.maxRank = e.node(r.borderBottom).rank, n = Math.max(n, r.maxRank));
  }), e.graph().maxRank = n;
}
function pr(e) {
  e.nodes().forEach((n) => {
    let t = e.node(n);
    if (t.dummy === "edge-proxy") {
      let r = t;
      e.edge(r.e).labelRank = t.rank, e.removeNode(n);
    }
  });
}
function mr(e) {
  let n = Number.POSITIVE_INFINITY, t = 0, r = Number.POSITIVE_INFINITY, o = 0, i = e.graph(), s = i.marginx || 0, a = i.marginy || 0;
  function l3(u) {
    let d = u.x, c = u.y, f = u.width, h2 = u.height;
    n = Math.min(n, d - f / 2), t = Math.max(t, d + f / 2), r = Math.min(r, c - h2 / 2), o = Math.max(o, c + h2 / 2);
  }
  e.nodes().forEach((u) => l3(e.node(u))), e.edges().forEach((u) => {
    let d = e.edge(u);
    Object.hasOwn(d, "x") && l3(d);
  }), n -= s, r -= a, e.nodes().forEach((u) => {
    let d = e.node(u);
    d.x -= n, d.y -= r;
  }), e.edges().forEach((u) => {
    let d = e.edge(u);
    d.points.forEach((c) => {
      c.x -= n, c.y -= r;
    }), Object.hasOwn(d, "x") && (d.x -= n), Object.hasOwn(d, "y") && (d.y -= r);
  }), i.width = t - n + s, i.height = o - r + a;
}
function Er(e) {
  e.edges().forEach((n) => {
    if (n.v === n.w) return;
    let t = e.edge(n), r = e.node(n.v), o = e.node(n.w), i, s;
    t.points ? (i = t.points[0], s = t.points[t.points.length - 1]) : (t.points = [], i = o, s = r), t.points.unshift(se2(r, i)), t.points.push(se2(o, s));
  });
}
function Lr(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (Object.hasOwn(t, "x")) switch ((t.labelpos === "l" || t.labelpos === "r") && (t.width -= t.labeloffset), t.labelpos) {
      case "l":
        t.x -= t.width / 2 + t.labeloffset;
        break;
      case "r":
        t.x += t.width / 2 + t.labeloffset;
        break;
    }
  });
}
function yr(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    t.reversed && t.points.reverse();
  });
}
function wr(e) {
  e.nodes().forEach((n) => {
    if (e.children(n).length) {
      let t = e.node(n), r = e.node(t.borderTop), o = e.node(t.borderBottom), i = e.node(t.borderLeft[t.borderLeft.length - 1]), s = e.node(t.borderRight[t.borderRight.length - 1]);
      t.width = Math.abs(s.x - i.x), t.height = Math.abs(o.y - r.y), t.x = i.x + t.width / 2, t.y = r.y + t.height / 2;
    }
  }), e.nodes().forEach((n) => {
    e.node(n).dummy === "border" && e.removeNode(n);
  });
}
function Nr(e) {
  e.edges().forEach((n) => {
    if (n.v === n.w) {
      let t = e.node(n.v);
      t.selfEdges || (t.selfEdges = []), t.selfEdges.push({ e: n, label: e.edge(n) }), e.removeEdge(n);
    }
  });
}
function Gr(e) {
  P2(e).forEach((t) => {
    let r = 0;
    t.forEach((o, i) => {
      let s = e.node(o);
      typeof s.rank != "number" && (s.rank = 0), s.order = i + r, (s.selfEdges || []).forEach((a) => {
        M(e, "selfedge", { width: a.label.width, height: a.label.height, rank: s.rank, order: i + ++r, e: a.e, edgeLabel: a.label }, "_se"), (!Array.isArray(a.label.points) || a.label.points.length !== 7) && (a.label.points = [{ x: 0, y: -10 }, { x: 0, y: -10 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
      }), delete s.selfEdges;
    });
  });
}
function vr(e) {
  e.nodes().forEach((n) => {
    let t = e.node(n), r = (o) => typeof o == "number" && isFinite(o);
    if (t.dummy === "selfedge") {
      let o = t, i = e.node(o.e.v), s = r(i == null ? void 0 : i.x) ? i.x : 0, a = r(i == null ? void 0 : i.y) ? i.y : 0, l3 = r(i == null ? void 0 : i.width) ? i.width : 0, u = r(i == null ? void 0 : i.height) ? i.height : 0, d = r(t.x) ? t.x : s, c = r(t.y) ? t.y : a, f = l3 / 2, h2 = u / 2;
      o.edgeLabel.points = [{ x: d + f, y: c - h2 }, { x: d + f, y: c - h2 }, { x: d, y: c }, { x: d - f, y: c + h2 }, { x: d - f, y: c + h2 }, { x: d, y: c }, { x: d, y: c }], o.edgeLabel.x = d, o.edgeLabel.y = c, e.setEdge(o.e, o.edgeLabel), e.removeNode(n);
    } else t && Array.isArray(t.selfEdges) && t.selfEdges.forEach((o) => {
      if (!Array.isArray(o.label.points) || o.label.points.length !== 7) {
        let i = r(t.x) ? t.x : 0, s = r(t.y) ? t.y : 0, a = r(t.width) ? t.width : 0, l3 = r(t.height) ? t.height : 0, u = a / 2, d = l3 / 2;
        o.label.points = [{ x: i + u, y: s - d }, { x: i + u, y: s - d }, { x: i, y: s }, { x: i - u, y: s + d }, { x: i - u, y: s + d }, { x: i, y: s }, { x: i, y: s }];
      }
    });
  });
}
function xe2(e, n) {
  return X2(B2(e, n), Number);
}
function _e2(e) {
  let n = {};
  return e && Object.entries(e).forEach(([t, r]) => {
    typeof t == "string" && (t = t.toLowerCase()), n[t] = r;
  }), n;
}
function Ce2(e) {
  let n = P2(e), t = new T2({ compound: true, multigraph: true }).setGraph({});
  return e.nodes().forEach((r) => {
    t.setNode(r, { label: r }), t.setParent(r, "layer" + e.node(r).rank);
  }), e.edges().forEach((r) => t.setEdge(r.v, r.w, {}, r.name)), n.forEach((r, o) => {
    let i = "layer" + o;
    t.setNode(i, { rank: "same" }), r.reduce((s, a) => (t.setEdge(s, a, { style: "invis" }), a));
  }), t;
}
var kr = { graphlib: ie2, version: ue2, layout: Oe2, debug: Ce2, util: { time: le2, notime: q2 } };
var $o = kr;

// src/components/flow.js
function renderFlow(body, meta = "", startLine = 1) {
  const rankdir = (meta.trim().match(/\b(LR|RL|TD|TB)\b/i) || ["LR"])[0].toUpperCase();
  const dir = rankdir === "TD" ? "TB" : rankdir;
  const lines = body.split("\n");
  const g = new $o.graphlib.Graph();
  g.setGraph({
    rankdir: dir,
    nodesep: 35,
    ranksep: 45,
    marginx: 20,
    marginy: 20
  });
  g.setDefaultEdgeLabel(() => ({}));
  const nodeMap = /* @__PURE__ */ new Map();
  const edgeList = [];
  function parseNodeToken(token) {
    let raw = token.trim();
    let highlight = false;
    if (raw.startsWith("*") && raw.endsWith("*") && raw.length > 2) {
      highlight = true;
      raw = raw.slice(1, -1).trim();
    }
    let shape = "rect";
    let label = raw;
    if (raw.startsWith("[") && raw.endsWith("]")) {
      shape = "rect";
      label = raw.slice(1, -1).trim();
    } else if (raw.startsWith("(") && raw.endsWith(")")) {
      shape = "pill";
      label = raw.slice(1, -1).trim();
    } else if (raw.startsWith("{") && raw.endsWith("}")) {
      shape = "diamond";
      label = raw.slice(1, -1).trim();
    }
    const id = label;
    if (!nodeMap.has(id)) {
      let charLen = 0;
      for (const ch of label) {
        charLen += ch.charCodeAt(0) > 255 ? 2 : 1;
      }
      const w = Math.max(shape === "diamond" ? 120 : 96, charLen * 8.5 + (shape === "diamond" ? 40 : 28));
      const h2 = shape === "diamond" ? 54 : 38;
      nodeMap.set(id, { id, label, shape, highlight, width: w, height: h2 });
      g.setNode(id, { label, width: w, height: h2 });
    }
    return id;
  }
  lines.forEach((line, idx) => {
    const raw = line.trim();
    if (!raw) return;
    const match = raw.match(/^([^\-\<\>]+?)\s*(\-\->|\->|<\->)\s*([^:]+?)(?:\s*:\s*(.*))?$/);
    if (match) {
      const fromId = parseNodeToken(match[1]);
      const arrow = match[2].trim();
      const toId = parseNodeToken(match[3]);
      const label = match[4] ? match[4].trim() : "";
      const isDashed = arrow === "-->";
      const isBi = arrow === "<->";
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
    if (raw.startsWith("[") || raw.startsWith("(") || raw.startsWith("{") || raw.startsWith("*")) {
      parseNodeToken(raw);
      return;
    }
    throw new BriefSyntaxError({
      component: "flow",
      line: startLine + idx,
      message: `Invalid flow syntax. Expected 'A -> B: label' or 'A --> B'`,
      sourceSnippet: line,
      example: `\`\`\`flow LR
[Client] -> [Gateway]: HTTPS Request
[Gateway] -> {Auth Check}: Validate
{Auth Check} -> [Service]: Authorized
\`\`\``
    });
  });
  if (nodeMap.size === 0) return "";
  $o.layout(g);
  const graphInfo = g.graph();
  const totalWidth = Math.ceil(graphInfo.width || 600) + 40;
  const totalHeight = Math.ceil(graphInfo.height || 400) + 40;
  let svg = `<svg class="brief-flow-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
`;
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
  edgeList.forEach((edge) => {
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
            ${edge.dashed ? 'stroke-dasharray="5,4"' : ""}
            marker-end="url(#flow-arrow)"
            ${edge.bi ? 'marker-start="url(#flow-arrow-rev)"' : ""} />
    `;
    if (edge.label) {
      const midPoint = pts[Math.floor(pts.length / 2)];
      const lx = midPoint.x + 20;
      const ly = midPoint.y + 14;
      const labelW = edge.label.length * 8 + 14;
      svg += `
      <g class="flow-edge-label" transform="translate(${lx}, ${ly})">
        <rect x="${-labelW / 2}" y="-11" width="${labelW}" height="18" rx="4" class="flow-label-bg" />
        <text x="0" y="2" text-anchor="middle" class="flow-label-text">${escapeHtml6(edge.label)}</text>
      </g>
      `;
    }
    svg += `</g>
`;
  });
  nodeMap.forEach((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return;
    const nx = dagreNode.x + 20;
    const ny = dagreNode.y + 20;
    const w = node.width;
    const h2 = node.height;
    const isHighlight = node.highlight;
    let shapeSvg = "";
    if (node.shape === "pill") {
      shapeSvg = `<rect x="${-w / 2}" y="${-h2 / 2}" width="${w}" height="${h2}" rx="${h2 / 2}" class="flow-node-shape ${isHighlight ? "flow-highlight" : ""}" />`;
    } else if (node.shape === "diamond") {
      const p1 = `0,${-h2 / 2}`;
      const p2 = `${w / 2},0`;
      const p3 = `0,${h2 / 2}`;
      const p4 = `${-w / 2},0`;
      shapeSvg = `<polygon points="${p1} ${p2} ${p3} ${p4}" class="flow-node-shape flow-diamond ${isHighlight ? "flow-highlight" : ""}" />`;
    } else {
      shapeSvg = `<rect x="${-w / 2}" y="${-h2 / 2}" width="${w}" height="${h2}" rx="6" class="flow-node-shape ${isHighlight ? "flow-highlight" : ""}" />`;
    }
    svg += `
    <g class="flow-node" transform="translate(${nx}, ${ny})">
      ${shapeSvg}
      <text x="0" y="4" text-anchor="middle" class="flow-node-text ${isHighlight ? "flow-highlight-text" : ""}">${escapeHtml6(node.label)}</text>
    </g>
    `;
  });
  svg += `</svg>`;
  return `<div class="brief-flow-container">${svg}</div>`;
}
function escapeHtml6(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/components/index.js
var COMPONENT_REGISTRY = {
  callout: renderCallout,
  kv: renderKv,
  timeline: renderTimeline,
  tree: renderTree,
  compare: renderCompare,
  sequence: renderSequence,
  flow: renderFlow
};
function isComponent(name) {
  if (!name) return false;
  const key = name.toLowerCase().split(/\s+/)[0];
  return Boolean(COMPONENT_REGISTRY[key]);
}
function renderComponent(name, body, meta, startLine = 1) {
  const key = name.toLowerCase().split(/\s+/)[0];
  const renderer = COMPONENT_REGISTRY[key];
  if (!renderer) {
    return `<pre><code class="language-${name}">${escapeHtml7(body)}</code></pre>`;
  }
  const extraMeta = meta ? `${name.slice(key.length).trim()} ${meta}`.trim() : name.slice(key.length).trim();
  return renderer(body, extraMeta, startLine);
}
function escapeHtml7(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/render.js
var customRenderer = {
  tablecell(token) {
    const tag = token.header ? "th" : "td";
    const alignAttr = token.align ? ` align="${token.align}"` : "";
    let content = token.text;
    if (!token.header) {
      content = transformBadges(content);
    }
    return `<${tag}${alignAttr}>${content}</${tag}>`;
  }
};
var markedInstance = new F({
  renderer: customRenderer,
  gfm: true,
  breaks: true
});
function transformBadges(text) {
  const okMatch = text.match(/^(?:ok|✓|yes|pass)\b(?:\s+(.*))?/i);
  if (okMatch) {
    const label = okMatch[1] ? ` ${okMatch[1]}` : "";
    return `<span class="badge badge-success"><span class="badge-icon">\u2713</span>${label}</span>`;
  }
  const noMatch = text.match(/^(?:no|✗|fail)\b(?:\s+(.*))?/i);
  if (noMatch) {
    const label = noMatch[1] ? ` ${noMatch[1]}` : "";
    return `<span class="badge badge-danger"><span class="badge-icon">\u2717</span>${label}</span>`;
  }
  const warnMatch = text.match(/^(?:warn|⚠|caution)\b(?:\s+(.*))?/i);
  if (warnMatch) {
    const label = warnMatch[1] ? ` ${warnMatch[1]}` : "";
    return `<span class="badge badge-warning"><span class="badge-icon">\u26A0</span>${label}</span>`;
  }
  const infoMatch = text.match(/^(?:info|ℹ|tip)\b(?:\s+(.*))?/i);
  if (infoMatch) {
    const label = infoMatch[1] ? ` ${infoMatch[1]}` : "";
    return `<span class="badge badge-info"><span class="badge-icon">\u2139</span>${label}</span>`;
  }
  return text;
}
var PanelRenderer = class {
  /**
   * Render a parsed panel object into HTML
   * @param {Object} panel
   * @returns {string}
   */
  static renderPanel(panel) {
    const parts = [];
    let currentMdLines = [];
    const flushMd = () => {
      if (currentMdLines.length > 0) {
        const mdText = currentMdLines.join("\n");
        parts.push(markedInstance.parse(mdText));
        currentMdLines = [];
      }
    };
    let inFence = false;
    let fenceLang = "";
    let fenceLines = [];
    let fenceStartLine = 0;
    for (const item of panel.lines) {
      const line = item.text;
      const lineNum = item.lineNum;
      if (!inFence) {
        const fenceMatch = line.match(/^```\s*([a-zA-Z0-9_\-]+)?(.*)$/);
        if (fenceMatch) {
          flushMd();
          inFence = true;
          fenceLang = (fenceMatch[1] || "").trim();
          fenceLines = [];
          fenceStartLine = lineNum;
        } else {
          currentMdLines.push(line);
        }
      } else {
        if (line.trim().startsWith("```")) {
          inFence = false;
          const body = fenceLines.join("\n");
          if (isComponent(fenceLang)) {
            parts.push(renderComponent(fenceLang, body, "", fenceStartLine));
          } else {
            parts.push(`
              <div class="brief-code-block">
                ${fenceLang ? `<div class="code-header">${escapeHtml8(fenceLang)}</div>` : ""}
                <pre><code class="language-${escapeHtml8(fenceLang)}">${escapeHtml8(body)}</code></pre>
              </div>
            `);
          }
        } else {
          fenceLines.push(line);
        }
      }
    }
    flushMd();
    const spanStyle = panel.span > 1 ? `grid-column: span ${panel.span};` : "";
    const rowStyle = panel.rows > 1 ? `grid-row: span ${panel.rows};` : "";
    const styleAttr = spanStyle || rowStyle ? ` style="${spanStyle} ${rowStyle}"` : "";
    return `
      <section class="brief-panel" id="${escapeHtml8(panel.id)}"${styleAttr}>
        <div class="panel-header">
          <h2 class="panel-title">${escapeHtml8(panel.title)}</h2>
          ${panel.badge ? `<span class="panel-badge">${escapeHtml8(panel.badge)}</span>` : ""}
        </div>
        <div class="panel-body">
          ${parts.join("\n")}
        </div>
      </section>
    `.trim();
  }
  /**
   * Render overview / abstract section
   * @param {string} overviewMd
   * @returns {string}
   */
  static renderOverview(overviewMd) {
    if (!overviewMd.trim()) return "";
    return `
      <div class="brief-overview">
        ${markedInstance.parse(overviewMd)}
      </div>
    `.trim();
  }
};
function escapeHtml8(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/themes/styles.js
function generateStyles(defaultTheme = "slate") {
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

// src/templates/sheet.js
function renderSheetTemplate({ meta, overviewHtml, panelsHtml, rawSource }) {
  const title = meta.title || "Technical Brief";
  const subtitle = meta.subtitle || "";
  const cols = meta.cols || 3;
  const theme = meta.theme || "slate";
  const badge = meta.badge || "";
  const source = meta.source || "";
  const styles = generateStyles(theme);
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${escapeHtml9(theme)}" data-mode="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml9(title)}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="brief-container" style="--grid-cols: ${cols};">
    <header class="brief-header">
      <div class="brief-meta">
        <div class="brief-title-row">
          <h1 class="brief-title">${escapeHtml9(title)}</h1>
          ${badge ? `<span class="brief-badge">${escapeHtml9(badge)}</span>` : ""}
          ${source ? `<span class="brief-badge">${escapeHtml9(source)}</span>` : ""}
        </div>
        ${subtitle ? `<div class="brief-subtitle">${escapeHtml9(subtitle)}</div>` : ""}
      </div>
      <div class="brief-controls">
        <select class="theme-select" id="themeSelect" title="\u5207\u6362\u4E3B\u9898">
          <option value="slate" ${theme === "slate" ? "selected" : ""}>Slate</option>
          <option value="nord" ${theme === "nord" ? "selected" : ""}>Nord</option>
          <option value="paper" ${theme === "paper" ? "selected" : ""}>Paper</option>
        </select>
        <button class="btn-ctrl" id="modeToggle" title="\u5207\u6362\u6697\u9ED1/\u660E\u4EAE\u6A21\u5F0F">
          <span id="modeIcon">\u2600\uFE0F</span>
        </button>
        <button class="btn-ctrl" id="drawerToggle" title="\u67E5\u770B\u539F\u59CB Markdown \u7A3F\u4EF6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          \u7A3F\u4EF6
        </button>
        <button class="btn-ctrl" onclick="window.print()" title="\u6253\u5370\u6216\u4FDD\u5B58\u4E3A PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        </button>
      </div>
    </header>

    ${overviewHtml}

    <main class="brief-grid">
      ${panelsHtml.join("\n")}
    </main>
  </div>

  <!-- Raw Markdown Source Drawer -->
  <aside class="brief-drawer" id="sourceDrawer">
    <div class="drawer-header">
      <span class="drawer-title">Markdown \u539F\u59CB\u7A3F\u4EF6</span>
      <button class="btn-ctrl" id="closeDrawer">\u2715</button>
    </div>
    <div class="drawer-body">
      <textarea class="drawer-textarea" readonly id="sourceText">${escapeHtml9(rawSource)}</textarea>
      <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
        <button class="btn-ctrl" id="copyBtn">\u590D\u5236\u5168\u6587</button>
      </div>
    </div>
  </aside>

  <script>
    (function() {
      const htmlEl = document.documentElement;
      const modeBtn = document.getElementById('modeToggle');
      const modeIcon = document.getElementById('modeIcon');
      const themeSelect = document.getElementById('themeSelect');
      const drawer = document.getElementById('sourceDrawer');
      const drawerToggle = document.getElementById('drawerToggle');
      const closeDrawer = document.getElementById('closeDrawer');
      const copyBtn = document.getElementById('copyBtn');
      const sourceText = document.getElementById('sourceText');

      // 1. Theme and Mode Toggle
      let mode = localStorage.getItem('agent_brief_mode') || 'dark';
      let currentTheme = localStorage.getItem('agent_brief_theme') || htmlEl.getAttribute('data-theme') || 'slate';

      function updateMode(newMode) {
        mode = newMode;
        htmlEl.setAttribute('data-mode', mode);
        modeIcon.textContent = mode === 'dark' ? '\u2600\uFE0F' : '\u{1F319}';
        localStorage.setItem('agent_brief_mode', mode);
      }

      function updateTheme(newTheme) {
        currentTheme = newTheme;
        htmlEl.setAttribute('data-theme', currentTheme);
        localStorage.setItem('agent_brief_theme', currentTheme);
      }

      updateMode(mode);
      updateTheme(currentTheme);
      if (themeSelect) themeSelect.value = currentTheme;

      modeBtn.addEventListener('click', () => {
        updateMode(mode === 'dark' ? 'light' : 'dark');
      });

      if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
          updateTheme(e.target.value);
        });
      }

      // 2. Drawer Controls
      drawerToggle.addEventListener('click', () => {
        drawer.classList.add('open');
      });

      closeDrawer.addEventListener('click', () => {
        drawer.classList.remove('open');
      });

      // 3. Copy Source Action
      copyBtn.addEventListener('click', () => {
        sourceText.select();
        navigator.clipboard.writeText(sourceText.value).then(() => {
          copyBtn.textContent = '\u5DF2\u590D\u5236!';
          setTimeout(() => { copyBtn.textContent = '\u590D\u5236\u5168\u6587'; }, 1500);
        });
      });
    })();
  </script>
</body>
</html>`;
}
function escapeHtml9(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/templates/doc.js
function renderDocTemplate({ meta, overviewHtml, panelsHtml, rawSource }) {
  const title = meta.title || "Technical Document";
  const subtitle = meta.subtitle || "";
  const theme = meta.theme || "slate";
  const badge = meta.badge || "";
  const source = meta.source || "";
  const styles = generateStyles(theme);
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${escapeHtml10(theme)}" data-mode="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml10(title)}</title>
  <style>
    ${styles}
    .brief-container {
      max-width: 860px !important;
    }
    .brief-grid {
      display: flex !important;
      flex-direction: column !important;
      gap: 20px !important;
    }
  </style>
</head>
<body>
  <div class="brief-container">
    <header class="brief-header">
      <div class="brief-meta">
        <div class="brief-title-row">
          <h1 class="brief-title">${escapeHtml10(title)}</h1>
          ${badge ? `<span class="brief-badge">${escapeHtml10(badge)}</span>` : ""}
          ${source ? `<span class="brief-badge">${escapeHtml10(source)}</span>` : ""}
        </div>
        ${subtitle ? `<div class="brief-subtitle">${escapeHtml10(subtitle)}</div>` : ""}
      </div>
      <div class="brief-controls">
        <select class="theme-select" id="themeSelect">
          <option value="slate" ${theme === "slate" ? "selected" : ""}>Slate</option>
          <option value="nord" ${theme === "nord" ? "selected" : ""}>Nord</option>
          <option value="paper" ${theme === "paper" ? "selected" : ""}>Paper</option>
        </select>
        <button class="btn-ctrl" id="modeToggle">
          <span id="modeIcon">\u2600\uFE0F</span>
        </button>
        <button class="btn-ctrl" onclick="window.print()">\u6253\u5370</button>
      </div>
    </header>

    ${overviewHtml}

    <main class="brief-grid">
      ${panelsHtml.join("\n")}
    </main>
  </div>

  <script>
    (function() {
      const htmlEl = document.documentElement;
      const modeBtn = document.getElementById('modeToggle');
      const modeIcon = document.getElementById('modeIcon');
      const themeSelect = document.getElementById('themeSelect');

      let mode = localStorage.getItem('agent_brief_mode') || 'dark';
      let currentTheme = localStorage.getItem('agent_brief_theme') || htmlEl.getAttribute('data-theme') || 'slate';

      function updateMode(newMode) {
        mode = newMode;
        htmlEl.setAttribute('data-mode', mode);
        modeIcon.textContent = mode === 'dark' ? '\u2600\uFE0F' : '\u{1F319}';
        localStorage.setItem('agent_brief_mode', mode);
      }

      function updateTheme(newTheme) {
        currentTheme = newTheme;
        htmlEl.setAttribute('data-theme', currentTheme);
        localStorage.setItem('agent_brief_theme', currentTheme);
      }

      updateMode(mode);
      updateTheme(currentTheme);
      if (themeSelect) themeSelect.value = currentTheme;

      modeBtn.addEventListener('click', () => {
        updateMode(mode === 'dark' ? 'light' : 'dark');
      });

      if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
          updateTheme(e.target.value);
        });
      }
    })();
  </script>
</body>
</html>`;
}
function escapeHtml10(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/templates/index.js
function renderTemplate(layout = "canvas", data) {
  if (layout === "doc" || layout === "document") {
    return renderDocTemplate(data);
  }
  return renderSheetTemplate(data);
}

// src/index.js
function compileBrief(source, options = {}) {
  const warnings = BriefLinter.lint(source);
  if (options.strict && warnings.length > 0) {
    const first = warnings[0];
    throw new BriefSyntaxError({
      component: "linter",
      line: first.line,
      message: `[Strict Mode] Lint rule violation: ${first.message}`,
      sourceSnippet: ""
    });
  }
  const parsed = BriefParser.parse(source);
  const meta = { ...parsed.meta };
  if (options.overrideTheme) {
    meta.theme = options.overrideTheme;
  }
  const overviewHtml = PanelRenderer.renderOverview(parsed.overview);
  const panelsHtml = parsed.panels.map((panel) => PanelRenderer.renderPanel(panel));
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

// bin/brief.js
var VERSION = "1.0.0";
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  if (args.includes("-v") || args.includes("--version")) {
    console.log(`agent-brief v${VERSION}`);
    process.exit(0);
  }
  const command = args[0];
  if (command === "check") {
    await handleCheck(args.slice(1));
  } else if (command === "render") {
    await handleRender(args.slice(1));
  } else {
    if (command === "-" || fs.existsSync(command)) {
      await handleRender(args);
    } else {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
    }
  }
}
function printHelp() {
  console.log(`
\x1B[1mAgent Brief\x1B[0m v${VERSION} \u2014 High-density visual brief compiler for AI agents.

\x1B[1mUSAGE:\x1B[0m
  brief render <file.md | -> [options]
  brief check <file.md | -> [options]

\x1B[1mOPTIONS:\x1B[0m
  -o, --output <path>    Specify output HTML destination path
  --theme <name>         Theme override (slate | nord | paper)
  --strict               Treat writing/lint warnings as fatal errors
  -v, --version          Show version
  -h, --help             Show help documentation

\x1B[1mEXAMPLES:\x1B[0m
  brief render draft.md -o output.html
  cat draft.md | brief render -
  brief check draft.md --strict
`);
}
async function readInput(fileArg) {
  if (!fileArg || fileArg === "-") {
    return new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", (err) => reject(err));
    });
  }
  const resolved = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, "utf-8");
}
async function handleCheck(args) {
  const fileArg = args.find((a) => !a.startsWith("-")) || "-";
  const strict = args.includes("--strict");
  try {
    const content = await readInput(fileArg);
    const issues = BriefLinter.lint(content);
    if (issues.length === 0) {
      console.log(`\x1B[32m\u2714 Code and technical writing checks passed (0 issues).\x1B[0m`);
      return;
    }
    console.log(`\x1B[33mFound ${issues.length} writing clarity suggestion(s):\x1B[0m`);
    for (const item of issues) {
      console.log(`  Line ${item.line} [${item.type}]: ${item.message}`);
    }
    if (strict) {
      console.error(`\x1B[31m\u2717 Strict check failed.\x1B[0m`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\x1B[31mError checking file: ${err.message}\x1B[0m`);
    process.exit(1);
  }
}
async function handleRender(args) {
  let fileArg = null;
  let outputPath = null;
  let theme = null;
  let strict = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      outputPath = args[++i];
    } else if (arg === "--theme") {
      theme = args[++i];
    } else if (arg === "--strict") {
      strict = true;
    } else if (!arg.startsWith("-") && !fileArg) {
      fileArg = arg;
    }
  }
  try {
    const content = await readInput(fileArg);
    const { html, meta, warnings } = compileBrief(content, {
      strict,
      overrideTheme: theme
    });
    if (warnings.length > 0) {
      for (const w of warnings) {
        console.warn(`\x1B[33m[Warning] Line ${w.line}: ${w.message}\x1B[0m`);
      }
    }
    let target = outputPath;
    if (!target) {
      const defaultDir = path.join(os.homedir(), ".agent-brief", "pages");
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      const baseName = fileArg && fileArg !== "-" ? path.basename(fileArg, path.extname(fileArg)) : "brief";
      target = path.join(defaultDir, `${baseName}-${Date.now()}.html`);
    }
    const resolvedTarget = path.resolve(process.cwd(), target);
    fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
    fs.writeFileSync(resolvedTarget, html, "utf-8");
    console.log(`\x1B[32m\u2714 Page successfully generated:\x1B[0m ${resolvedTarget}`);
  } catch (err) {
    if (err instanceof BriefSyntaxError) {
      console.error(err.formatOutput());
    } else {
      console.error(`\x1B[31m\u2717 Failed to render: ${err.message}\x1B[0m`);
    }
    process.exit(1);
  }
}
main();
/*! Bundled license information:

@dagrejs/dagre/dist/dagre.esm.js:
  (*! For license information please see dagre.esm.js.LEGAL.txt *)
*/
