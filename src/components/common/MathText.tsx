'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { normalizeSvgGeometry } from '@/lib/exam-sections';

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Safely removes explicit option prefixes like "A. ", "B. ", "(A) "
 * without stripping numbers or mathematical variables (e.g. "15", "D = R")
 */
export function cleanOptionText(text: string): string {
  if (!text) return '';
  return (
    text
      .replace(/(?:^\([A-Da-d]\)|^[\[\{][A-Da-d][\]\}]|^[A-Da-d][\.\:\)\-–—])\s*/i, '')
      .trim() || text
  );
}

/**
 * Intelligently reformats squished single-line code (especially Python)
 * into clean, indented multi-line code with proper line breaks.
 */
function beautifyCode(rawCode: string, lang: string): string {
  let code = rawCode.trim();
  if (!code) return '';

  // If code already contains newlines, preserve them
  if (code.includes('\n')) {
    return code.replace(/\r\n/g, '\n');
  }

  const isPython = !lang || lang.toLowerCase().includes('py');

  if (isPython) {
    // Split semicolons if present
    code = code.replace(/;\s*/g, '\n');

    // Break before control flow statements
    code = code.replace(/\s+(elif\b|else\s*:|finally\s*:|except\b)/g, '\n$1');
    code = code.replace(/([0-9a-zA-Z_"'\]\)])\s+(if\b|for\b|while\b|def\b|class\b|return\b)/g, '$1\n$2');
    // Break assignments like "a = 7 b = 12" -> "a = 7\nb = 12"
    code = code.replace(/([0-9a-zA-Z_"'\]\)])\s+([a-zA-Z_]\w*\s*=[^=])/g, '$1\n$2');
    // Break after colons if followed immediately by statement on same line
    code = code.replace(/:\s*(?!\n)([a-zA-Z_])/g, ':\n$1');

    const lines = code.split('\n');
    let indent = 0;
    const formatted = lines.map((line) => {
      const s = line.trim();
      if (!s) return '';
      if (/^(elif\b|else:|except\b|finally:)/.test(s)) {
        const cur = '    '.repeat(Math.max(0, indent - 1)) + s;
        if (s.endsWith(':')) indent = Math.max(1, indent);
        return cur;
      }
      const cur = '    '.repeat(indent) + s;
      if (s.endsWith(':')) indent++;
      return cur;
    });

    return formatted.join('\n');
  }

  return code;
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely renders cell content, compiling embedded LaTeX math ($...$) via KaTeX.
 */
function renderCellContent(cellText: string): string {
  if (!cellText) return '';
  let text = cellText.trim();
  if (!text.includes('$')) {
    // If text contains LaTeX commands, arrows, infinity, or common math symbols/variables
    if (
      /\\[a-zA-Z]+|[+\-]\s*\\infty|\\nearrow|\\searrow|\^|_/.test(text) ||
      /^(x|y|f\(x\)|f'\(x\)|f''\(x\)|y'|y''|0|\+|-)$/.test(text)
    ) {
      text = `$${text}$`;
    } else {
      return escapeHtml(text);
    }
  }
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^\$\\])+\$)/g;
  const parts = text.split(mathRegex);
  return parts
    .map((part) => {
      if (!part) return '';
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        try {
          return katex.renderToString(part.slice(2, -2).trim(), { displayMode: true, throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        try {
          return katex.renderToString(part.slice(1, -1).trim(), { displayMode: false, throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      }
      return escapeHtml(part);
    })
    .join('');
}

/**
 * MathText renders mixed text with:
 * 1. Markdown code blocks (```python ... ```) rendered as syntax-highlighted IDE boxes
 * 2. Inline code (`...`)
 * 3. LaTeX math notation ($...$ inline or $$...$$ block) using KaTeX
 * 4. Regular line breaks and text
 */
export default function MathText({ content, className = '', inline = false }: MathTextProps) {
  // If content contains code blocks (```) or SVG diagrams, force block rendering
  const hasBlock = content?.includes('```') || /<svg\b/i.test(content || '');
  const isActuallyInline = inline && !hasBlock;

  const renderedHtml = useMemo(() => {
    if (!content) return '';

    let preprocessed = content;

    // Step 0.0: Extract and tokenise Vector SVG diagrams (<svg ...>...</svg>) FIRST
    // to protect all SVG attributes, viewBox coordinates, and xmlns URLs from text/math manipulation
    const svgBlocks: string[] = [];
    const svgRegex = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
    preprocessed = preprocessed.replace(svgRegex, (match) => {
      const token = `__SVG_BLOCK_${svgBlocks.length}__`;
      svgBlocks.push(match);
      return token;
    });

    // Step 0.1: Normalize naked sqrt functions and auto-wrap math expressions
    preprocessed = preprocessed.replace(/(^|[^\\])\bsqrt\s*\{/g, '$1\\sqrt{');
    preprocessed = preprocessed.replace(/(^|[^\\])\bsqrt\s*\(([^)]+)\)/g, '$1\\sqrt{$2}');

    // If string has no $, check if it contains mathematical notations needing KaTeX compilation
    if (!preprocessed.includes('$')) {
      const hasLatexCommand = /\\[a-zA-Z]+/.test(preprocessed);
      const hasMathSymbol = /[\^_\/]/.test(preprocessed) && /[0-9a-zA-Z]/.test(preprocessed);
      const hasComparison = /\b[a-zA-Z0-9]\s*(?:>=|<=|>|<|=|\\ge|\\le)\s*[-+]?[0-9a-zA-Z]/.test(preprocessed);

      if (hasLatexCommand || hasMathSymbol || hasComparison) {
        if (inline || (preprocessed.length < 150 && !preprocessed.includes('\n'))) {
          let mathExpr = preprocessed.trim();
          mathExpr = mathExpr.replace(/>=/g, '\\ge ').replace(/<=/g, '\\le ');
          preprocessed = `$${mathExpr}$`;
        } else {
          // In mixed prose, wrap individual naked LaTeX constructs
          preprocessed = preprocessed.replace(/(\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^{}]*\})*)/g, '$$$1$$');
        }
      }
    }

    // Step 1: Extract and tokenise code blocks ```lang\ncode```
    const codeBlocks: { lang: string; code: string }[] = [];
    const codeBlockRegex = /```(?:([a-zA-Z0-9_+\-]*)\s*\n?)?([\s\S]*?)```/g;

    preprocessed = preprocessed.replace(codeBlockRegex, (_, langMatch, codeMatch) => {
      const lang = (langMatch || 'python').trim();
      const rawCode = (codeMatch || '').trim();
      const formattedCode = beautifyCode(rawCode, lang);
      const token = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({ lang: lang || 'python', code: formattedCode });
      return token;
    });

    // Step 1.5: Extract and tokenise Markdown tables (supporting both piped and unpiped tables)
    const tableBlocks: string[] = [];
    const tableRegex = /(?:^[ \t]*\|?[^\n|]+\|[^\n]+\r?\n)(?:^[ \t]*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?[ \t]*(?:\r?\n|$))(?:^[ \t]*\|?[^\n|]+\|[^\n]+(?:\r?\n|$))*/gm;

    preprocessed = preprocessed.replace(tableRegex, (tableBlock) => {
      const lines = tableBlock.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return tableBlock;

      const parseRow = (line: string) => {
        const trimmed = line.replace(/^\||\|$/g, '');
        return trimmed.split('|').map((cell) => cell.trim());
      };

      const headerCells = parseRow(lines[0]);
      const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(lines[1]);
      const dataLines = isSeparator ? lines.slice(2) : lines.slice(1);

      let rowsHtml = `<thead class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"><tr>` +
        headerCells.map((c) => `<th class="border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-center font-bold text-xs select-text">${renderCellContent(c)}</th>`).join('') +
        `</tr></thead><tbody>`;

      dataLines.forEach((line, rIdx) => {
        const cells = parseRow(line);
        const bg = rIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40';
        rowsHtml += `<tr class="${bg}">` +
          cells.map((c) => `<td class="border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-center text-slate-700 dark:text-slate-300 select-text">${renderCellContent(c)}</td>`).join('') +
          `</tr>`;
      });
      rowsHtml += `</tbody>`;

      // Detect if this is a mathematical variation table (bảng biến thiên / bảng xét dấu)
      const isVariationTable = headerCells.some((c) => /\$?x\$?/i.test(c)) &&
        (lines.some((l) => /y'|f'\(x\)/i.test(l)) || lines.some((l) => /\\infty|\\nearrow|\\searrow/i.test(l)));

      const tableBoxHtml = isVariationTable
        ? `
<div class="my-3 flex justify-center overflow-x-auto print:my-2 not-italic">
  <table class="border-collapse border border-slate-400 dark:border-slate-600 text-xs font-serif text-center bg-white dark:bg-slate-900 shadow-sm print:shadow-none print:border-black">${rowsHtml}</table>
</div>
`.trim()
        : `
<div class="my-2.5 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm print:shadow-none print:border-black print:my-1.5 not-italic">
  <table class="w-full border-collapse text-xs not-italic text-center">${rowsHtml}</table>
</div>
`.trim();

      const token = `__TABLE_BLOCK_${tableBlocks.length}__`;
      tableBlocks.push(tableBoxHtml);
      return token;
    });

    // Step 2: Extract LaTeX math: $$...$$ or $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^\$\\])+\$)/g;
    const parts = preprocessed.split(mathRegex);

    let html = parts
      .map((part) => {
        if (!part) return '';

        // Block Math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const rawFormula = part.slice(2, -2).trim();
          try {
            return katex.renderToString(rawFormula, {
              displayMode: true,
              throwOnError: false,
              output: 'htmlAndMathml',
            });
          } catch {
            return `<span class="katex-error">${escapeHtml(part)}</span>`;
          }
        }

        // Inline Math: $...$
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          let rawFormula = part.slice(1, -1).trim();
          // Normalize naked sqrt and comparison operators
          rawFormula = rawFormula.replace(/(^|[^\\])\bsqrt\s*\{/g, '$1\\sqrt{');
          rawFormula = rawFormula.replace(/(^|[^\\])\bsqrt\s*\(([^)]+)\)/g, '$1\\sqrt{$2}');
          rawFormula = rawFormula.replace(/>=/g, '\\ge ').replace(/<=/g, '\\le ');

          // Guard against currency amounts like "$15 and $20"
          const hasMathIndicators = /[\\^_{}=+\-*\/<>()]/.test(rawFormula) || /^[a-zA-Z0-9.,]+$/.test(rawFormula);
          if (!hasMathIndicators && /\s{2,}|[a-zA-Z]+\s+[a-zA-Z]+/.test(rawFormula)) {
            return escapeHtml(part);
          }
          try {
            return katex.renderToString(rawFormula, {
              displayMode: false,
              throwOnError: false,
              output: 'htmlAndMathml',
            });
          } catch {
            return `<span class="katex-error">${escapeHtml(part)}</span>`;
          }
        }

        // Plain text: escape HTML
        let text = escapeHtml(part);

        // Inline code: `...`
        text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-xs border border-slate-200/80 dark:border-slate-700/80">$1</code>');

        // Newlines to <br /> if not inline
        return isActuallyInline ? text : text.replace(/\n/g, '<br />');
      })
      .join('');

    // Clean up excessive <br /> tags surrounding block tokens so layout doesn't have huge blank vertical gaps
    html = html.replace(/(?:<br\s*\/?>\s*)+(__CODE_BLOCK_\d+__|__SVG_BLOCK_\d+__|__TABLE_BLOCK_\d+__)/gi, '$1');
    html = html.replace(/(__CODE_BLOCK_\d+__|__SVG_BLOCK_\d+__|__TABLE_BLOCK_\d+__)(?:\s*<br\s*\/?>)+/gi, '$1');

    // Step 3: Replace code block tokens with 2-column line numbered IDE cards
    codeBlocks.forEach((cb, idx) => {
      const token = `__CODE_BLOCK_${idx}__`;
      const displayLang = cb.lang.toUpperCase() || 'CODE';
      const lines = cb.code.split('\n');

      const lineNumbersHtml = lines
        .map((_, i) => `<div class="leading-relaxed select-none">${i + 1}</div>`)
        .join('');

      const codeLinesHtml = lines
        .map((line) => `<div class="leading-relaxed whitespace-pre">${escapeHtml(line) || '&nbsp;'}</div>`)
        .join('');

      const codeBoxHtml = `
<div class="my-2 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-sm print:bg-white print:border-black print:border print:rounded-none print:shadow-none print:my-1.5 text-left not-italic">
  <div class="flex items-center justify-between px-3 py-1 bg-slate-800/90 border-b border-slate-700/60 text-[10px] font-mono text-slate-300 print:hidden select-none">
    <div class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-rose-500/80 inline-block"></span>
      <span class="w-2 h-2 rounded-full bg-amber-500/80 inline-block"></span>
      <span class="w-2 h-2 rounded-full bg-emerald-500/80 inline-block"></span>
      <span class="ml-1.5 font-bold uppercase tracking-wider text-slate-200 font-sans">${displayLang}</span>
    </div>
    <span class="text-[10px] text-slate-400 font-sans">chương trình</span>
  </div>
  <div class="flex p-2.5 print:p-2 text-xs font-mono bg-transparent overflow-x-auto">
    <div class="pr-2.5 mr-2.5 border-r border-slate-700/80 print:border-r print:border-black text-right text-slate-500 print:text-black font-semibold select-none min-w-[24px]">
      ${lineNumbersHtml}
    </div>
    <div class="flex-1 text-emerald-300 dark:text-emerald-400 print:text-black select-text font-normal">
      ${codeLinesHtml}
    </div>
  </div>
</div>
`.trim();

      html = html.replace(token, () => codeBoxHtml);
    });

    // Step 4: Replace SVG tokens with responsive & print-friendly geometry diagrams
    svgBlocks.forEach((rawSvg, idx) => {
      const token = `__SVG_BLOCK_${idx}__`;
      // Sanitize SVG against XSS and fix malformed geometry lines (<line points="..."> -> x1,y1,x2,y2)
      let cleanSvg = normalizeSvgGeometry(
        rawSvg
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
          .replace(/javascript\s*:/gi, '')
      );

      // Constrain size so it doesn't blow up across the page
      if (!cleanSvg.includes('class=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg class="exam-geo-svg w-full max-h-52 mx-auto object-contain print:max-h-44"');
      } else {
        cleanSvg = cleanSvg.replace(/class="([^"]*)"/, 'class="$1 w-full max-h-52 mx-auto object-contain print:max-h-44"');
      }

      const svgBoxHtml = `
<div class="my-2 max-w-xs sm:max-w-sm mx-auto flex justify-center items-center overflow-hidden print:my-1 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 print:bg-white print:border-none print:p-0">
  ${cleanSvg}
</div>
`.trim();

      html = html.replace(token, () => svgBoxHtml);
    });

    // Step 5: Replace Table tokens
    tableBlocks.forEach((tb, idx) => {
      const token = `__TABLE_BLOCK_${idx}__`;
      html = html.replace(token, () => tb);
    });

    return html;
  }, [content, isActuallyInline]);

  if (isActuallyInline) {
    return (
      <span
        className={`math-rendered-inline ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <div
      className={`math-rendered-block ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
