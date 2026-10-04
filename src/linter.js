/**
 * Technical Writing & STE-inspired Quality Checker for Agent Briefs.
 * Ensures generated explanations are crisp, active, unambiguous, and concise.
 */

const CHINESE_BOILERPLATE = [
  { pattern: /对.{1,10}进行(优化|处理|重构|升级|分析|操作)/g, desc: '虚动词冗余（如“对X进行优化”可简化为“优化X”）' },
  { pattern: /深入浅出|众所周知|毋庸置疑|显而易见|不可否认/g, desc: '主观陈词套话，建议直接陈述技术事实' },
  { pattern: /在.{1,8}的基础上/g, desc: '冗长过渡表达，可精简' },
  { pattern: /有待于进一步/g, desc: '模糊表述，建议明确具体行动或指标' }
];

const ENGLISH_PASSIVE = /\b(is|are|was|were|been|being)\s+([a-z]+ed|[a-z]+en)\b/gi;

export class BriefLinter {
  /**
   * Lint markdown content for technical clarity
   * @param {string} source
   * @returns {Array<{line: number, type: 'warning'|'style', message: string}>}
   */
  static lint(source) {
    const lines = source.split('\n');
    const issues = [];

    lines.forEach((rawLine, index) => {
      const lineNum = index + 1;
      const line = rawLine.trim();

      // Skip code blocks, headers, frontmatter, and horizontal rules
      if (!line || line.startsWith('```') || line.startsWith('#') || line.startsWith('---') || line.startsWith('|')) {
        return;
      }

      // 1. Chinese length check (> 50 chars without punctuation pause)
      const segments = line.split(/[，。！？；;,.!?]/);
      for (const seg of segments) {
        const trimmed = seg.trim();
        // Check long continuous Chinese clauses
        const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
        if (chineseChars > 45) {
          issues.push({
            line: lineNum,
            type: 'style',
            message: `中文单句过长（${chineseChars} 字），建议拆分为短句以提高可读性`
          });
          break;
        }

        // Check English word length (> 25 words in a sentence)
        const englishWords = trimmed.match(/[a-zA-Z]+/g) || [];
        if (englishWords.length > 25) {
          issues.push({
            line: lineNum,
            type: 'style',
            message: `English sentence too long (${englishWords.length} words). Consider breaking it down.`
          });
          break;
        }
      }

      // 2. Chinese boilerplate checks
      for (const rule of CHINESE_BOILERPLATE) {
        if (rule.pattern.test(line)) {
          issues.push({
            line: lineNum,
            type: 'warning',
            message: `${rule.desc}`
          });
        }
      }

      // 3. Consecutive '的' particle check
      const deMatches = line.match(/的/g);
      if (deMatches && deMatches.length >= 4 && line.length < 50) {
        issues.push({
          line: lineNum,
          type: 'style',
          message: `单行内包含 ${deMatches.length} 个“的”字，可能存在多重定语修饰，建议简化句式结构`
        });
      }

      // 4. English passive voice heuristic
      const passiveMatches = line.match(ENGLISH_PASSIVE);
      if (passiveMatches) {
        issues.push({
          line: lineNum,
          type: 'style',
          message: `Possible passive voice detected ("${passiveMatches[0]}"). Prefer active voice for clarity.`
        });
      }
    });

    return issues;
  }
}
